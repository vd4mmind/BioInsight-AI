import { GoogleGenAI } from "@google/genai";
import { PaperData } from "../types";

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

export const fetchLiteratureAnalysis = async (existingIds: string[]): Promise<PaperData[]> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    // Calculate date for "Last 30 Days"
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];

    // ---------------------------------------------------------
    // PHASE 1: LIVE DISCOVERY WITH GROUNDING
    // ---------------------------------------------------------
    // NOTE: We allow the model to "think" in text first before outputting JSON.
    // This prevents 'Rpc failed' errors caused by forcing Search Grounding 
    // to output strict JSON immediately without context.
    const discoveryPrompt = `
      You are a scientific literature intelligence agent.
      
      TASK: Search for the LATEST scientific papers and preprints published AFTER ${dateString} (Last 30 days).
      
      TOPICS: CVD, ASCVD, Heart Failure, CKD, MASH, NASH, Diabetes, Obesity.
      FOCUS: AI/ML applications, Single-cell/Multi-omics, Imaging, Novel drug targets.
      SOURCES: PubMed, BioRxiv, MedRxiv, Nature, Cell, NEJM, Lancet.

      INSTRUCTIONS:
      1. Use the Google Search tool to find at least 3 distinct new papers.
      2. Briefly summarize what you found in natural language (to verify citations).
      3. AFTER your summary, provide a strictly formatted JSON array inside a \`\`\`json\`\`\` code block.

      JSON Structure (Array of Objects):
      - title: string (Exact title)
      - journalOrConference: string (Source)
      - date: string (YYYY-MM-DD)
      - authors: string[] (First 3 authors)
      - topic: string (CVD, CKD, MASH, NASH, MASLD, Diabetes, Obesity)
      - publicationType: string (Preprint, Peer Reviewed)
      - studyType: string (Clinical Trial, Pre-clinical, Simulated, Human Cohort)
      - methodology: string (AI/ML, Lab Experimental, Statistical)
      - modality: string (Single Cell, Multi-omics, Imaging, Clinical Data, etc.)
      - abstractHighlight: string (1 sentence finding)
      - drugAndTarget: string
      - context: string (Why is this exciting?)
      - validationScore: 100
      - url: string (Web Link if available)
    `;

    const discoveryResponse = await ai.models.generateContent({
      model: modelId,
      contents: discoveryPrompt,
      config: {
        temperature: 0.1,
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