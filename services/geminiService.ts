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
    
    // --- DATE LOGIC ---
    // 1. Calculate strict 30-day cutoff
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];

    // 2. Generate Search Context Keywords (e.g., "May 2024", "June 2024")
    // This forces the Search Tool to look for recent content rather than just "relevant" content.
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[today.getMonth()];
    const prevMonth = monthNames[thirtyDaysAgo.getMonth()];
    const currentYear = today.getFullYear();
    const prevYear = thirtyDaysAgo.getFullYear();
    
    const timeContext = currentMonth === prevMonth 
        ? `${currentMonth} ${currentYear}`
        : `${prevMonth} ${prevYear} OR ${currentMonth} ${currentYear}`;

    // --- LOGIC: VERTICALS vs HORIZONTALS ---
    const isBroadSearch = activeTopics.length === 0 || activeTopics.length > 4;
    const topicInstruction = isBroadSearch 
        ? "Cardiovascular, Kidney, Metabolic, Obesity, or Diabetes"
        : activeTopics.join(', ');

    const methodInstruction = activeMethodologies.length > 0 
        ? `MUST utilize one of: ${activeMethodologies.join(', ')}` 
        : "Any Methodology";

    const studyInstruction = activeStudyTypes.length > 0 
        ? `MUST be one of: ${activeStudyTypes.join(', ')}` 
        : "Any Study Type";

    // 3. Intelligence Tracker Prompt
    const discoveryPrompt = `
      You are **BioInsight**, a specialized Biomedical Intelligence Scout.
      
      **MISSION:**
      Find the **LATEST (Last 30 Days)** scientific papers, preprints, and posters.
      
      **STRICT TIMEFRAME:**
      - **Current Date:** ${today.toISOString().split('T')[0]}
      - **Cutoff Date:** ${dateString}
      - **Search Keyword Constraint:** Use "${timeContext}" in your search queries to ensure recency.
      - **Rejection Rule:** DO NOT return any content published before ${dateString}. If a paper is from 2023 or early 2024, IGNORE IT.

      **SEARCH LOGIC:**
      1. **DISEASE VERTICALS (The 'OR' Condition):**
         Search for papers in: ${topicInstruction}.
         *Constraint:* Do not look for the intersection of all topics. Look for papers about Topic A OR papers about Topic B.
      
      2. **METHODOLOGY/DESIGN FILTERS (The 'AND' Condition):**
         Filter results to match:
         - **Methodology:** ${methodInstruction}
         - **Study Type:** ${studyInstruction}

      **PRIORITY SOURCES:**
      - BioRxiv/MedRxiv (${timeContext})
      - Major Medical Conferences (${timeContext})
      - High-Impact Journals (${timeContext})

      **OUTPUT FORMAT:**
      Return a **STRICT JSON array** inside a \`\`\`json\`\`\` block.
      
      JSON Schema per item:
      {
        "title": "Exact Title from source",
        "journalOrConference": "Source name",
        "date": "YYYY-MM-DD",
        "authors": ["Author 1", "Author 2", "et al."],
        "topic": "Most relevant topic from user list",
        "publicationType": "One from: ${Object.values(PublicationType).join(', ')}",
        "studyType": "One from: ${Object.values(StudyType).join(', ')}",
        "methodology": "One from: ${Object.values(Methodology).join(', ')}",
        "modality": "One from: ${Object.values(ResearchModality).join(', ')}",
        "abstractHighlight": "Key quantitative finding.",
        "drugAndTarget": "Drug/Target or N/A",
        "context": "Why it matters (e.g. '🔥 New Preprint')",
        "validationScore": 90,
        "url": null, 
        "affiliations": ["Institution"],
        "funding": "Funding",
        "keywords": ["Tag1", "Tag2"]
      }
    `;

    let discoveryResponse;
    
    // ATTEMPT 1: Try with Search Grounding
    try {
      discoveryResponse = await ai.models.generateContent({
        model: modelId,
        contents: discoveryPrompt,
        config: {
          temperature: 0.3, 
          tools: [{ googleSearch: {} }], 
        }
      });
    } catch (e) {
      console.warn("Search Grounding failed. Retrying without tools.", e);
      try {
        discoveryResponse = await ai.models.generateContent({
          model: modelId,
          contents: discoveryPrompt,
          config: { temperature: 0.3 }
        });
      } catch (retryError) {
        console.error("Fallback generation also failed.", retryError);
        throw retryError;
      }
    }

    const textResponse = discoveryResponse.text || "";
    const rawData = parseJSON(textResponse);
    
    if (!Array.isArray(rawData)) {
        return [];
    }

    // --- HARD FILTER: DISCARD OLD PAPERS ---
    // Even if the LLM returns an old paper, we filter it out here.
    const validTimeframeData = rawData.filter((paper: any) => {
        if (!paper.date) return false;
        const paperDate = new Date(paper.date);
        // Check if date is valid and is after the cutoff (with a 24h buffer for timezone diffs)
        const cutoffBuffer = new Date(thirtyDaysAgo);
        cutoffBuffer.setDate(cutoffBuffer.getDate() - 1); 
        
        return !isNaN(paperDate.getTime()) && paperDate >= cutoffBuffer;
    });

    // Hydrate with IDs and Grounding Logic
    const candidates = validTimeframeData.map((paper: any) => {
        let groundingUrl: string | undefined = undefined;
        let finalTitle = paper.title; 
        let isSearchFallback = false;

        // Check if we have grounding chunks
        const chunks = discoveryResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks && chunks.length > 0) {
            const normalize = (s: string) => s?.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim() || "";
            const paperTitleNorm = normalize(paper.title);
            
            const matchedChunk = chunks
                .map((c: any) => {
                    const chunkTitle = c.web?.title;
                    if (!chunkTitle || !c.web?.uri) return { chunk: null, score: 0 };
                    
                    const chunkTitleNorm = normalize(chunkTitle);
                    let score = 0;

                    if (chunkTitleNorm === paperTitleNorm) {
                        score = 100;
                    } else if (chunkTitleNorm.includes(paperTitleNorm) || paperTitleNorm.includes(chunkTitleNorm)) {
                        score = 90;
                    } else {
                         const paperWords = paperTitleNorm.split(/\s+/).filter(w => w.length > 3);
                         const chunkWords = chunkTitleNorm.split(/\s+/);
                         if (paperWords.length > 0) {
                             const matches = paperWords.filter(w => chunkWords.includes(w)).length;
                             const ratio = matches / paperWords.length;
                             if (ratio > 0.5) score = (ratio * 80);
                         }
                    }
                    return { chunk: c, score };
                })
                .sort((a, b) => b.score - a.score)
                .find(item => item.score > 45);

            if (matchedChunk && matchedChunk.chunk) {
                const c = matchedChunk.chunk;
                groundingUrl = c.web.uri;
                
                if (c.web.title && c.web.title.length > 10) {
                    finalTitle = c.web.title;
                    const commonSuffixes = [' - PubMed', ' - NCBI', ' - BioRxiv', ' - MedRxiv', ' - Nature', ' - Science', ' | NEJM', ' | The Lancet'];
                    
                    if (finalTitle.includes(' | ')) {
                        const parts = finalTitle.split(' | ');
                        if (parts.length > 1 && parts[parts.length-1].length < 30) {
                             parts.pop();
                             finalTitle = parts.join(' | ');
                        }
                    }

                    for (const suffix of commonSuffixes) {
                        const regex = new RegExp(suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
                        finalTitle = finalTitle.replace(regex, '');
                    }
                }
            }
        }

        if (!groundingUrl) {
             const queryParts = [paper.title];
             if (paper.authors?.[0] && !paper.authors[0].toLowerCase().includes('et al')) {
                 queryParts.push(paper.authors[0]);
             }
             if (paper.journalOrConference) {
                 queryParts.push(paper.journalOrConference);
             }
             
             const searchQuery = queryParts.join(' ');
             groundingUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
             isSearchFallback = true;
        }

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
            authorsVerified: !isSearchFallback, 
            url: groundingUrl, 
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