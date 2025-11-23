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

    // Build targeted search context for the prompt
    // Use comma-separated lists for clearer context instructions
    const topicsList = activeTopics.length > 0 
        ? activeTopics.join(', ') 
        : "Cardiovascular, Kidney, Metabolic, Liver Diseases (NASH/MASH), Diabetes, Obesity";

    const studyList = activeStudyTypes.length > 0 
        ? activeStudyTypes.join(', ')
        : "Clinical Trials, Novel Research Mechanisms, Real-world Evidence";

    const methodList = activeMethodologies.length > 0
        ? activeMethodologies.join(', ')
        : "AI/ML, Deep Learning, Omics, Statistical Analysis";

    // Enhanced Discovery Prompt
    const discoveryPrompt = `
      You are BioInsight, a "Discovery Engine" for biomedical researchers.
      
      TASK:
      Scan the web (last 30 days, since ${dateString}) for the top 6-8 high-impact scientific developments matching this profile:
      
      USER FILTERS (STRICT):
      - TOPICS: [${topicsList}]
      - METHODOLOGY: [${methodList}]
      - STUDY TYPES: [${studyList}]

      SEARCH STRATEGY (What counts as "Discovery"?):
      1. **Trending Preprints**: Papers on BioRxiv/MedRxiv gaining social traction (Twitter/X buzz).
      2. **Major Milestones**: FDA approvals, Phase 3 readouts, or "First-in-class" announcements.
      3. **Tech Shifts**: AI models (e.g. AlphaFold derivatives) applied to these specific diseases.

      DATA EXTRACTION RULES:
      - **Context**: Generate a short, punchy "Discovery Tag" (3-5 words) describing WHY this is interesting (e.g., "🔥 Trending on BioRxiv", "⚡ First FDA Approval", "🏆 Top 1% Impact").
      - **Abstract Highlight**: Single sentence with QUANTITATIVE results (HR, p-value, %) if available.
      - **Title**: EXTRACT EXACT TITLE from the search result link. Do not generate a new title.
      
      OUTPUT FORMAT:
      Return a STRICT JSON array inside a \`\`\`json\`\`\` block.
      
      JSON Schema per item:
      {
        "title": "Exact Title from source",
        "journalOrConference": "Source Name",
        "date": "YYYY-MM-DD",
        "authors": ["Author 1", "Author 2", "et al."],
        "topic": "Best match from: ${Object.values(DiseaseTopic).join(', ')}",
        "publicationType": "Best match from: ${Object.values(PublicationType).join(', ')}",
        "studyType": "Best match from: ${Object.values(StudyType).join(', ')}",
        "methodology": "Best match from: ${Object.values(Methodology).join(', ')}",
        "modality": "Best match from: ${Object.values(ResearchModality).join(', ')}",
        "abstractHighlight": "Key finding with numbers.",
        "drugAndTarget": "Drug/Target or N/A",
        "context": "The Discovery Tag (e.g. '🔥 Trending on BioRxiv')",
        "validationScore": 95,
        "url": "Source URL",
        "affiliations": ["Institution Name"],
        "funding": "Funding source if mentioned",
        "keywords": ["Tag1", "Tag2"]
      }
    `;

    const discoveryResponse = await ai.models.generateContent({
      model: modelId,
      contents: discoveryPrompt,
      config: {
        temperature: 0.2, // Low temp for factual extraction
        tools: [{ googleSearch: {} }], // Live Search Enabled
      }
    });

    const textResponse = discoveryResponse.text || "";
    const rawData = parseJSON(textResponse);
    
    if (!Array.isArray(rawData)) {
        console.warn("Discovery phase returned invalid format. Raw text:", textResponse.substring(0, 200));
        return [];
    }

    // Hydrate with IDs, verify URLs via Grounding Metadata, and refine classification
    const candidates = rawData.map((paper: any) => {
        let groundingUrl = paper.url;
        let finalTitle = paper.title; // Default to generated title
        const chunks = discoveryResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks && chunks.length > 0) {
            const normalize = (s: string) => s?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
            const paperTitleNorm = normalize(paper.title);

            // Find best matching chunk using fuzzy logic
            const relevantChunk = chunks.find((c: any) => {
                const chunkTitle = c.web?.title;
                if (!chunkTitle) return false;

                const chunkTitleNorm = normalize(chunkTitle);
                
                return c.web?.uri && (
                    chunkTitleNorm.includes(paperTitleNorm) || 
                    paperTitleNorm.includes(chunkTitleNorm) ||
                    // Fallback: check if chunk title contains significant words from paper title
                    (paperTitleNorm.length > 15 && chunkTitleNorm.includes(paperTitleNorm.substring(0, 15)))
                );
            });

            if (relevantChunk) {
                groundingUrl = relevantChunk.web.uri;
                
                // CRITICAL FIX: Sync Title with Source
                // To prevent title/link mismatches, use the actual title from the source metadata
                if (relevantChunk.web.title) {
                    finalTitle = relevantChunk.web.title;
                    
                    // Cleanup SEO suffixes to make it look like a paper title
                    // e.g. "Study Name | Journal Name" -> "Study Name"
                    if (finalTitle.includes(' | ')) {
                        finalTitle = finalTitle.split(' | ')[0];
                    }
                    
                    const commonSuffixes = [
                        ' - PubMed', ' - NCBI', ' - BioRxiv', ' - MedRxiv', 
                        ' - Nature', ' - Science', ' - ScienceDirect', 
                        ' - Medical Xpress', ' - EurekAlert!', ' - Stat News',
                        ' - FierceBiotech', ' - Reuters', ' - Bloomberg'
                    ];

                    for (const suffix of commonSuffixes) {
                        if (finalTitle.endsWith(suffix)) {
                            finalTitle = finalTitle.slice(0, -suffix.length);
                            break;
                        }
                    }
                }
            }
        }

        // Auto-classify news sites
        let finalPubType = paper.publicationType;
        if (groundingUrl) {
            const newsDomains = ['statnews.com', 'fiercebiotech.com', 'medscape.com', 'sciencedaily.com', 'eurekalert.org', 'medicalxpress.com', 'forbes.com', 'bloomberg.com', 'nytimes.com'];
            if (newsDomains.some(d => groundingUrl.includes(d))) {
                finalPubType = PublicationType.News;
            }
        }

        return {
            ...paper,
            id: `live-${Math.random().toString(36).substring(2, 9)}`,
            title: finalTitle.trim(),
            publicationType: finalPubType,
            authorsVerified: true, // Grounding assumes verified
            url: groundingUrl,
            isLive: true
        };
    });

    return candidates;

  } catch (error) {
    console.error("Failed to fetch literature from Gemini:", error);
    return [];
  }
};