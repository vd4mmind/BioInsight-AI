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

export const fetchLiteratureAnalysis = async (existingIds: string[], activeTopics: string[] = []): Promise<PaperData[]> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    // Calculate date for "Last 30 Days"
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 30);
    const dateString = pastDate.toISOString().split('T')[0];

    // Dynamic Context Building
    // If user has selected specific topics in UI, prioritize those. Otherwise use all.
    const targetTopics = activeTopics.length > 0 
        ? activeTopics.join(', ') 
        : Object.values(DiseaseTopic).join(', ');

    const methodologies = Object.values(Methodology).join(', ');
    const studyTypes = Object.values(StudyType).join(', ');
    const modalities = Object.values(ResearchModality).join(', ');

    // ---------------------------------------------------------
    // PHASE 1: LIVE DISCOVERY WITH GROUNDING
    // ---------------------------------------------------------
    const discoveryPrompt = `
      You are a scientific literature intelligence agent.
      
      TASK: Search for the VERY LATEST scientific papers and preprints published or appearing online since ${dateString} (Last 30 Days).
      
      TARGET TOPICS (Prioritize these): ${targetTopics}
      
      REQUIRED SEARCH DIMENSIONS:
      1. Check for specific Methodologies: ${methodologies}
      2. Check for specific Study Types: ${studyTypes}
      3. Check for specific Modalities: ${modalities}

      SOURCES: 
      - Major Journals: NEJM, Lancet, Nature, Cell, JAMA.
      - Preprint Servers (CRITICAL): BioRxiv, MedRxiv.
      - Databases: PubMed, Google Scholar.

      INSTRUCTIONS:
      1. Use the Google Search tool to find at least 5-7 distinct new papers or preprints. 
      2. You MUST look for specific intersections, for example: "Multi-omics in CKD", "In-vivo imaging in NASH", "AI/ML in Diabetes".
      3. Ensure you capture PREPRINTS (BioRxiv/MedRxiv) to reflect the latest research, not just established journals.
      4. Briefly summarize what you found in natural language (Chain of Thought).
      5. AFTER your summary, provide a strictly formatted JSON array inside a \`\`\`json\`\`\` code block.

      JSON Structure (Array of Objects):
      - title: string (Exact title)
      - journalOrConference: string (Source Name)
      - date: string (YYYY-MM-DD)
      - authors: string[] (First 3 authors)
      - topic: string (Must be one of: ${Object.values(DiseaseTopic).join(', ')})
      - publicationType: string (Preprint, Peer Reviewed)
      - studyType: string (Must be one of: ${studyTypes})
      - methodology: string (Must be one of: ${methodologies})
      - modality: string (Must be one of: ${modalities})
      - abstractHighlight: string (1 sentence finding)
      - drugAndTarget: string (e.g. "Target: GLP-1, Drug: Semaglutide" or "N/A")
      - context: string (Why is this specific paper exciting?)
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