import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality, PublicationType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to parse JSON from markdown code blocks or raw text
const parseJSON = (text: string): any => {
  // Strategy: Find the last occurrence of a JSON code block
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
  const matches = [...text.matchAll(jsonBlockRegex)];
  
  if (matches.length > 0) {
    try {
      // Take the last match
      return JSON.parse(matches[matches.length - 1][1]);
    } catch (e) {
      console.warn("Failed to parse JSON from code block");
    }
  }

  // Fallback: Try to find array brackets directly
  const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
      try {
          return JSON.parse(arrayMatch[0]);
      } catch(e) {
          console.error("Failed to parse array match", e);
      }
  }

  return null;
};

export const fetchLiteratureAnalysis = async (
  existingIds: string[], 
  activeTopics: string[] = [], 
  activeStudyTypes: string[] = [],
  activeMethodologies: string[] = []
): Promise<PaperData[]> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    // Calculate date for "Last 30 Days"
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 30);
    const dateString = pastDate.toISOString().split('T')[0];

    // --- INTELLIGENCE TRACKER QUERY BUILDER ---
    
    // 2. Intelligence Tracker Prompt
    const discoveryPrompt = `
      You are **BioInsight**, a specialized Biomedical Intelligence Scout.
      
      **MISSION:**
      Perform a deep intelligence sweep of the web for the **LATEST (Last 30 Days)** scientific outputs.
      You are looking for the **INTERSECTION** of the provided Disease Topics, Study Designs, and Methodologies.
      
      **SEARCH PARAMETERS:**
      - **Timeframe:** Since ${dateString} (Strictly recent).
      - **Target Topics:** ${activeTopics.length > 0 ? activeTopics.join(', ') : "Cardiovascular, Kidney, Metabolic, Obesity, Diabetes"}
      - **Target Methods:** ${activeMethodologies.length > 0 ? activeMethodologies.join(', ') : "Any Methodology"}
      - **Target Study Types:** ${activeStudyTypes.length > 0 ? activeStudyTypes.join(', ') : "Any Study Type"}

      **PRIORITY SOURCES (The "Discovery" Mix):**
      1. **Conference Posters/Abstracts**: Scrape recent meeting outputs (e.g., ADA, EASL, AHA, ACC) for "late-breaking" science.
      2. **Preprints**: Search BioRxiv/MedRxiv for manuscripts uploaded in the last month.
      3. **High-Impact Articles**: Nature, NEJM, Lancet, Cell (published recently).
      4. **Tech/Bio Intersection**: Papers applying AI/ML or Omics to these specific diseases.

      **EXECUTION RULES:**
      - **Exact Titles Only**: Extract the verbatim title from the search result. Do not fabricate titles.
      - **URL Handling**: Leave the 'url' field empty in your JSON. The system will auto-match it.
      - **Diversify**: Try to find at least one Poster or Abstract if possible.
      - **Quantity**: Return between 5 and 10 distinct items.

      **OUTPUT FORMAT:**
      Return a **STRICT JSON array** inside a \`\`\`json\`\`\` block.
      
      JSON Schema per item:
      {
        "title": "Exact Title from source",
        "journalOrConference": "Source (e.g., 'BioRxiv', 'ADA 2024 Poster', 'Nature Medicine')",
        "date": "YYYY-MM-DD",
        "authors": ["Author 1", "Author 2", "et al."],
        "topic": "One from: ${Object.values(DiseaseTopic).join(', ')}",
        "publicationType": "One from: ${Object.values(PublicationType).join(', ')}",
        "studyType": "One from: ${Object.values(StudyType).join(', ')}",
        "methodology": "One from: ${Object.values(Methodology).join(', ')}",
        "modality": "One from: ${Object.values(ResearchModality).join(', ')}",
        "abstractHighlight": "Key quantitative finding (e.g., 'HR 0.85, p<0.001').",
        "drugAndTarget": "Drug/Target or N/A",
        "context": "Short tag why this matters (e.g., '🔥 Viral Preprint', '📊 ADA Poster')",
        "validationScore": 90,
        "url": null, 
        "affiliations": ["Institution Name"],
        "funding": "Funding source",
        "keywords": ["Tag1", "Tag2"]
      }
    `;

    const discoveryResponse = await ai.models.generateContent({
      model: modelId,
      contents: discoveryPrompt,
      config: {
        temperature: 0.3, 
        tools: [{ googleSearch: {} }], 
      }
    });

    const textResponse = discoveryResponse.text || "";
    const rawData = parseJSON(textResponse);
    
    if (!Array.isArray(rawData)) {
        console.warn("Discovery phase returned invalid format.", textResponse.substring(0, 100));
        return [];
    }

    // Hydrate with IDs and Grounding Logic
    const candidates = rawData.map((paper: any) => {
        let groundingUrl: string | undefined = undefined;
        let finalTitle = paper.title; 
        let isSearchFallback = false;

        const chunks = discoveryResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        // --- STRICT GROUNDING SYNC LOGIC ---
        // 1. Attempt to find a direct verified match in Search Chunks with SCORING
        if (chunks && chunks.length > 0) {
            const normalize = (s: string) => s?.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim() || "";
            const paperTitleNorm = normalize(paper.title);
            
            // Find best matching chunk using a scoring system to prioritize metadata
            const matchedChunk = chunks
                .map((c: any) => {
                    const chunkTitle = c.web?.title;
                    if (!chunkTitle || !c.web?.uri) return { chunk: null, score: 0 };
                    
                    const chunkTitleNorm = normalize(chunkTitle);
                    let score = 0;

                    // A. Exact or Inclusion Match (High Confidence)
                    if (chunkTitleNorm.includes(paperTitleNorm) || paperTitleNorm.includes(chunkTitleNorm)) {
                        score += 100;
                    } 
                    // B. Keyword Overlap (Medium Confidence)
                    else {
                         const paperWords = paperTitleNorm.split(/\s+/).filter(w => w.length > 3);
                         const chunkWords = chunkTitleNorm.split(/\s+/);
                         if (paperWords.length > 0) {
                             const matches = paperWords.filter(w => chunkWords.includes(w)).length;
                             const ratio = matches / paperWords.length;
                             if (ratio > 0.5) score += (ratio * 80); // Up to 80 points
                         }
                    }
                    return { chunk: c, score };
                })
                .sort((a, b) => b.score - a.score) // Sort by score descending
                .find(item => item.score > 40); // Minimum threshold

            if (matchedChunk && matchedChunk.chunk) {
                const c = matchedChunk.chunk;
                groundingUrl = c.web.uri;
                
                // Use the verified Source Title if it's substantial
                if (c.web.title && c.web.title.length > 10) {
                    finalTitle = c.web.title;
                    
                    // CLEANUP: Remove common SEO suffixes
                    const commonSuffixes = [
                        ' - PubMed', ' - NCBI', ' - BioRxiv', ' - MedRxiv', 
                        ' - Nature', ' - Science', ' - ScienceDirect', 
                        ' - Medical Xpress', ' - EurekAlert!', ' - Stat News',
                        ' | NEJM', ' | The Lancet', ' | New England Journal of Medicine',
                        ' | JAMA', ' | AHA Journals'
                    ];

                    // Remove "Title | Journal" suffixes
                    if (finalTitle.includes(' | ')) {
                        const parts = finalTitle.split(' | ');
                        if (parts.length > 1 && parts[parts.length-1].length < 30) {
                             parts.pop();
                             finalTitle = parts.join(' | ');
                        }
                    }

                    // Remove " - Source" suffixes case-insensitively
                    for (const suffix of commonSuffixes) {
                        const regex = new RegExp(suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
                        finalTitle = finalTitle.replace(regex, '');
                    }
                }
            }
        }

        // 2. FALLBACK SAFETY NET (No Broken Links)
        // If no verified URL found from chunks, construct a smart Google Search URL.
        if (!groundingUrl) {
             const queryParts = [paper.title];
             // Add first author if available (skip generic 'et al')
             if (paper.authors?.[0] && !paper.authors[0].toLowerCase().includes('et al')) {
                 queryParts.push(paper.authors[0]);
             }
             // Add journal if available
             if (paper.journalOrConference) {
                 queryParts.push(paper.journalOrConference);
             }
             
             const searchQuery = queryParts.join(' ');
             groundingUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
             isSearchFallback = true;
        }

        // Logic to detect Posters/Abstracts based on URL or Title keywords if the model missed it
        let finalPubType = paper.publicationType;
        if (groundingUrl && !isSearchFallback) {
            const lowerUrl = groundingUrl.toLowerCase();
            const lowerTitle = finalTitle.toLowerCase();
            if (lowerUrl.includes('abstract') || lowerUrl.includes('poster') || lowerUrl.includes('meeting') ||
                lowerTitle.includes('abstract') || lowerTitle.includes('poster')) {
                if (finalPubType !== PublicationType.Poster) {
                    finalPubType = PublicationType.ConferenceAbstract;
                }
            }
        }

        return {
            ...paper,
            id: `live-${Math.random().toString(36).substring(2, 9)}`,
            title: finalTitle.trim(),
            publicationType: finalPubType,
            authorsVerified: !isSearchFallback, // If we had to fallback, we can't fully verify authors
            url: groundingUrl, // Use the verified grounding URL or the fallback
            isLive: true,
            isSearchFallback: isSearchFallback
        };
    });

    return candidates;

  } catch (error) {
    console.error("Failed to fetch literature from Gemini:", error);
    return [];
  }
};