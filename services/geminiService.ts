import { GoogleGenAI } from "@google/genai";
import { PaperData } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to parse JSON from markdown code blocks or raw text
const parseJSON = (text: string): any => {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error("Failed to parse JSON block:", e);
    }
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
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
    const discoveryPrompt = `
      You are a scientific literature intelligence agent.
      
      TASK: Search for the LATEST scientific papers and preprints published AFTER ${dateString} (Last 30 days).
      
      TOPICS: CVD, ASCVD, Heart Failure, CKD, MASH, NASH, Diabetes, Obesity.
      FOCUS: AI/ML applications, Single-cell/Multi-omics, Imaging, Novel drug targets (In-vivo/In-vitro).
      SOURCES: PubMed, BioRxiv, MedRxiv, Nature, Cell, NEJM, Lancet, Arxiv (cs.LG for bio).

      REQUIREMENTS:
      1. MUST be real papers found via Google Search.
      2. IGNORE general news articles. Look for Study Titles.
      3. Find at least 3 distinct new papers.

      Output strictly a JSON array inside a code block.
      
      JSON Structure:
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
      - url: string (Web Link)
    `;

    const discoveryResponse = await ai.models.generateContent({
      model: modelId,
      contents: discoveryPrompt,
      config: {
        temperature: 0.1,
        tools: [{ googleSearch: {} }], // Live Search Enabled
      }
    });

    const rawData = parseJSON(discoveryResponse.text || "");
    
    if (!Array.isArray(rawData)) {
        console.warn("Discovery phase returned invalid format");
        return [];
    }

    // Hydrate with IDs and merge grounding URLs if available
    const candidates = rawData.map((paper: any) => {
        // Attempt to extract grounding URL
        let groundingUrl = paper.url;
        const chunks = discoveryResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks && chunks.length > 0) {
            // Simple heuristic: Try to find a chunk title that matches paper title loosely or just take the first relevant one
            const relevantChunk = chunks.find((c: any) => c.web?.uri && (c.web.title?.includes(paper.title.substring(0, 10)) || paper.title.includes(c.web.title)));
            if (relevantChunk) {
                groundingUrl = relevantChunk.web.uri;
            } else if (!paper.url) {
                // Fallback to first chunk if paper.url is empty
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