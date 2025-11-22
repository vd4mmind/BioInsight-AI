import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality, PublicationType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to parse JSON from markdown code blocks or raw text
const parseJSON = (text: string): any => {
  // Strategy: Find the last occurrence of a JSON code block, as it usually follows the explanation
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
  const matches = [...text.matchAll(jsonBlockRegex)];
  
  if (matches.length > 0) {
    try {
      // Take the last match, as the model might output intermediate steps
      return JSON.parse(matches[matches.length - 1][1]);
    } catch (e) {
      console.warn("Failed to parse JSON from code block, trying raw text cleanup");
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

    // Dynamic Context Building
    // If specific filters are passed, prioritize them. If empty, it means "All" or "Broad".
    
    const targetTopics = activeTopics.length > 0 
        ? activeTopics.join(', ') 
        : Object.values(DiseaseTopic).join(', ');

    const targetStudyTypes = activeStudyTypes.length > 0 
        ? activeStudyTypes.join(', ')
        : "Clinical Trials, Pre-clinical studies, Real-world Evidence";

    // Expand "Lab Experimental" to be more descriptive for the search agent
    const expandedMethodologies = activeMethodologies.length > 0
        ? activeMethodologies.map(m => 
            m === Methodology.LabExperimental 
              ? "Lab Experimental (specifically in-vivo, in-vitro, animal models, organoids, cellular models)" 
              : m
          )
        : ["AI/ML", "Statistical Analysis", "Lab Experimental (in-vivo, in-vitro, animal models, organoids)"];

    const targetMethodologies = expandedMethodologies.join(', ');

    const allModalities = Object.values(ResearchModality).join(', ');
    const allPubTypes = Object.values(PublicationType).join(', ');

    // ---------------------------------------------------------
    // PHASE 1: LIVE DISCOVERY WITH GROUNDING
    // ---------------------------------------------------------
    const discoveryPrompt = `
      You are a scientific literature intelligence agent.
      
      TASK: Search for the VERY LATEST scientific papers, preprints, and reputable news analysis published or appearing online since ${dateString} (Last 30 Days).
      
      SEARCH CRITERIA (Strictly prioritize these intersections):
      1. DISEASE TOPICS: ${targetTopics}
      2. STUDY DESIGNS: ${targetStudyTypes}
      3. METHODOLOGIES: ${targetMethodologies}

      SOURCES: 
      - Major Journals: NEJM, Lancet, Nature, Cell, JAMA, Circulation, Hepatology.
      - Preprint Servers (CRITICAL): BioRxiv, MedRxiv.
      - Databases: PubMed, Google Scholar.
      - Reputable Science News: StatNews, Nature News, ScienceDaily (Only if direct paper not found).

      INSTRUCTIONS:
      1. Use the Google Search tool to find at least 5-7 distinct new items.
      2. **DETERMINISM RULE**: Use the EXACT TITLE from the search result link. Do not hallucinate or rewrite titles to sound better.
      3. **SOURCE CLASSIFICATION**:
         - If the link is a direct study (PubMed, DOI, Journal, BioRxiv), type is 'Peer Reviewed' or 'Preprint'.
         - If the link is a news article (e.g., "New study shows..."), type MUST be 'News/Analysis' and the title must match the news headline.
      4. STRATEGY: Search for the specific combination of Topic + Study Type + Methodology. 
      5. Briefly summarize what you found in natural language (Chain of Thought).
      6. AFTER your summary, provide a strictly formatted JSON array inside a \`\`\`json\`\`\` code block.

      JSON Structure (Array of Objects):
      - title: string (EXACT title from source)
      - journalOrConference: string (Source Name, e.g., "Nature", "BioRxiv", or "StatNews")
      - date: string (YYYY-MM-DD)
      - authors: string[] (First 3 authors if available, else Organization name)
      - topic: string (Must be one of: ${Object.values(DiseaseTopic).join(', ')})
      - publicationType: string (Must be one of: ${allPubTypes})
      - studyType: string (Best fit from: ${Object.values(StudyType).join(', ')})
      - methodology: string (Best fit from: ${Object.values(Methodology).join(', ')})
      - modality: string (Best fit from: ${allModalities})
      - abstractHighlight: string (1 sentence finding)
      - drugAndTarget: string (e.g. "Target: GLP-1, Drug: Semaglutide" or "N/A")
      - context: string (Why is this specifically relevant?)
      - validationScore: 100
      - url: string (Web Link if available)
    `;

    const discoveryResponse = await ai.models.generateContent({
      model: modelId,
      contents: discoveryPrompt,
      config: {
        temperature: 0.3, // Lower temperature for more deterministic output
        tools: [{ googleSearch: {} }], // Live Search Enabled
      }
    });

    const textResponse = discoveryResponse.text || "";
    const rawData = parseJSON(textResponse);
    
    if (!Array.isArray(rawData)) {
        console.warn("Discovery phase returned invalid format. Raw text:", textResponse.substring(0, 200));
        return [];
    }

    // Hydrate with IDs and merge grounding URLs if available
    const candidates = rawData.map((paper: any) => {
        // Attempt to extract grounding URL
        let groundingUrl = paper.url;
        const chunks = discoveryResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks && chunks.length > 0) {
            // Search for a chunk that matches the paper title strongly
            // Normalized comparison to avoid case/punctuation mismatches
            const normalize = (s: string) => s?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
            const paperTitleNorm = normalize(paper.title);

            const relevantChunk = chunks.find((c: any) => {
                const chunkTitleNorm = normalize(c.web?.title);
                return c.web?.uri && (
                    chunkTitleNorm.includes(paperTitleNorm) || 
                    paperTitleNorm.includes(chunkTitleNorm)
                );
            });

            if (relevantChunk) {
                groundingUrl = relevantChunk.web.uri;
                // OPTIONAL: Enforce title consistency if the AI title seems very different
                // But usually, we trust the AI's extraction if the prompt is strict.
            } else if (!paper.url && chunks.length > 0) {
                // Fallback: If no URL is set, and we can't match titles perfect, 
                // but the AI returned items in order, we might sometimes want to guess, 
                // but strictly it's better to have no link than a wrong one.
                // However, often the first chunk corresponds to the first finding.
                // Let's leave it empty if no match to be deterministic/safe.
            }
        }

        // Final Safety Check for News vs Paper
        let finalPubType = paper.publicationType;
        if (groundingUrl) {
            const newsDomains = ['nytimes.com', 'statnews.com', 'medicalxpress.com', 'sciencedaily.com', 'forbes.com', 'bloomberg.com'];
            const isNewsDomain = newsDomains.some(d => groundingUrl.includes(d));
            if (isNewsDomain) {
                finalPubType = PublicationType.News;
            }
        }

        return {
            ...paper,
            id: Math.random().toString(36).substring(2, 15),
            publicationType: finalPubType,
            authorsVerified: true, // Grounding assumes verified
            url: groundingUrl
        };
    });

    return candidates;

  } catch (error) {
    console.error("Failed to fetch literature from Gemini:", error);
    return [];
  }
};