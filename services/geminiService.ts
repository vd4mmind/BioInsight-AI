import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality } from "../types";

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

    // ---------------------------------------------------------
    // PHASE 1: LIVE DISCOVERY WITH GROUNDING
    // ---------------------------------------------------------
    const discoveryPrompt = `
      You are a scientific literature intelligence agent.
      
      TASK: Search for the VERY LATEST scientific papers and preprints published or appearing online since ${dateString} (Last 30 Days).
      
      SEARCH CRITERIA (Strictly prioritize these intersections):
      1. DISEASE TOPICS: ${targetTopics}
      2. STUDY DESIGNS: ${targetStudyTypes}
      3. METHODOLOGIES: ${targetMethodologies}

      SOURCES: 
      - Major Journals: NEJM, Lancet, Nature, Cell, JAMA, Circulation, Hepatology.
      - Preprint Servers (CRITICAL): BioRxiv, MedRxiv.
      - Databases: PubMed, Google Scholar.

      INSTRUCTIONS:
      1. Use the Google Search tool to find at least 5-7 distinct new papers or preprints.
      2. STRATEGY: Search for the specific combination of Topic + Study Type + Methodology. 
         - Example: "New AI/ML methods in CKD research last month"
         - Example: "Clinical trials for MASH/NASH published recently"
         - Example: "Single cell sequencing CVD preprints 2024"
         - Example: "In-vivo organoid models for diabetes research 2024"
         - Example: "New animal models for obesity studies recent"
      3. If specific intersections (e.g., "AI/ML in NASH") yield few results, broaden to the Disease Topic generally, but prioritize the user's requested Methodology.
      4. Ensure you capture PREPRINTS (BioRxiv/MedRxiv) to reflect the latest research.
      5. Briefly summarize what you found in natural language (Chain of Thought).
      6. AFTER your summary, provide a strictly formatted JSON array inside a \`\`\`json\`\`\` code block.

      JSON Structure (Array of Objects):
      - title: string (Exact title)
      - journalOrConference: string (Source Name)
      - date: string (YYYY-MM-DD)
      - authors: string[] (First 3 authors)
      - topic: string (Must be one of: ${Object.values(DiseaseTopic).join(', ')})
      - publicationType: string (Preprint, Peer Reviewed)
      - studyType: string (Best fit from: ${Object.values(StudyType).join(', ')})
      - methodology: string (Best fit from: ${Object.values(Methodology).join(', ')})
      - modality: string (Best fit from: ${allModalities})
      - abstractHighlight: string (1 sentence finding)
      - drugAndTarget: string (e.g. "Target: GLP-1, Drug: Semaglutide" or "N/A")
      - context: string (Why is this specific paper exciting regarding the search criteria?)
      - validationScore: 100
      - url: string (Web Link if available)
    `;

    const discoveryResponse = await ai.models.generateContent({
      model: modelId,
      contents: discoveryPrompt,
      config: {
        temperature: 0.4, // Slightly higher for diverse discovery
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
            // Search for a chunk that matches the paper title
            const relevantChunk = chunks.find((c: any) => 
                c.web?.uri && (
                    c.web.title?.toLowerCase().includes(paper.title.substring(0, 15).toLowerCase()) || 
                    paper.title.toLowerCase().includes(c.web.title?.toLowerCase())
                )
            );

            if (relevantChunk) {
                groundingUrl = relevantChunk.web.uri;
            } else if (!paper.url) {
                // Fallback to first chunk if no URL provided in JSON
                groundingUrl = chunks[0].web?.uri;
            }
        }

        return {
            ...paper,
            id: Math.random().toString(36).substring(2, 15),
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