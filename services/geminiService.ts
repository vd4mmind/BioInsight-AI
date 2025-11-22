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

export const fetchLiteratureAnalysis = async (existingIds: string[], startYear: number = 2025): Promise<PaperData[]> => {
  try {
    const modelId = "gemini-2.5-flash"; 
    
    const dateString = `${startYear}-01-01`;

    // ---------------------------------------------------------
    // PHASE 1: DISCOVERY
    // Broad search to find candidates
    // ---------------------------------------------------------
    const discoveryPrompt = `
      You are a scientific literature aggregator. 
      Your task is to find 3 REAL, AUTHENTIC scientific papers or preprints published AFTER ${dateString}.
      
      Topics to search: CVD, CKD, MASH, NASH, MASLD, Diabetes, Obesity.
      Sources: PubMed, Nature, Lancet, NEJM, BioRxiv, MedRxiv, Arxiv, NeurIPS, CVPR.
      
      Strict Requirements:
      1. DATE: Must be published on or after ${dateString}.
      2. TITLE: Must be the EXACT deterministic title from the publisher. Do not hallucinate or paraphrase.
      3. DIVERSITY: Mix clinical trials, AI/ML biology, and basic science.

      Output the result strictly as a JSON array inside a code block (\`\`\`json ... \`\`\`).
      
      JSON Object Structure for each paper:
      - title: string (Exact title found on the web)
      - journalOrConference: string (e.g., "Nature Medicine", "BioRxiv")
      - date: string (YYYY-MM-DD, must be >= ${startYear})
      - authors: string[] (Initial list)
      - topic: string (One of: CVD, CKD, MASH, NASH, MASLD, Diabetes, Obesity)
      - publicationType: string (One of: "Preprint", "Peer Reviewed")
      - studyType: string (One of: "Clinical Trial", "Human Cohort (Non-RCT)", "Pre-clinical", "Simulated")
      - methodology: string (One of: "AI/ML", "Lab Experimental", "Statistical")
      - modality: string (One of: "Single Cell", "Genetics", "Proteomics", "Transcriptomics", "Metabolomics", "Lipidomics", "Multi-omics", "EHR", "Imaging", "Clinical Data", "Other")
      - abstractHighlight: string (1 sentence summary)
      - drugAndTarget: string (e.g., "Target: X, Drug: Y")
      - context: string (Clinical relevance)
      - validationScore: number (90-100 for peer reviewed, 80-90 for preprints)
      - url: string (The direct URL to the paper found in search)
    `;

    const discoveryResponse = await ai.models.generateContent({
      model: modelId,
      contents: discoveryPrompt,
      config: {
        temperature: 0, // Max determinism for titles
        tools: [{ googleSearch: {} }], // Enable Live Search
      }
    });

    const rawData = parseJSON(discoveryResponse.text || "");
    
    if (!Array.isArray(rawData)) {
        console.warn("Discovery phase returned invalid format");
        return [];
    }

    // Hydrate with IDs and set initial verification to false
    const candidates = rawData.map((paper: any) => ({
      ...paper,
      id: Math.random().toString(36).substring(2, 15),
      authorsVerified: false // Start unverified
    }));

    // ---------------------------------------------------------
    // PHASE 2: SECONDARY VERIFICATION & URL EXTRACTION
    // Targeted search for each paper to confirm authors, exact title, and get GROUNDING URL
    // ---------------------------------------------------------
    const verifiedPapers = await Promise.all(candidates.map(async (paper: PaperData) => {
        // We perform a targeted search for the specific title to verify authors
        const verificationPrompt = `
            VERIFICATION TASK:
            Target Paper: "${paper.title}"
            
            Action:
            1. Search specifically for this paper title to find the OFFICIAL SOURCE (PubMed, Nature, Arxiv, etc.).
            2. Extract the EXACT list of authors.
            3. Extract the Author Affiliations.
            4. Confirm the title is 100% accurate to the source. If slight mismatch, correct it.
            5. Find the DIRECT URL to the abstract or full text.

            Return strictly a JSON object:
            {
                "correctTitle": "The exact title found",
                "authors": ["Author 1", "Author 2", ...],
                "affiliations": ["Affiliation 1", ...],
                "verified": boolean (true if paper found and authors confirmed, false otherwise)
            }
        `;

        try {
            const verifyResponse = await ai.models.generateContent({
                model: modelId,
                contents: verificationPrompt,
                config: {
                    temperature: 0,
                    tools: [{ googleSearch: {} }]
                }
            });

            const verifiedData = parseJSON(verifyResponse.text || "");

            // CRITICAL: Extract URL from Grounding Metadata
            // The grounding chunks contain the actual URLs the model used. 
            // This is more reliable than the generated text for URLs.
            let reliableUrl = paper.url; 
            
            const chunks = verifyResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (chunks && chunks.length > 0) {
                // Look for the first chunk that has a web URI
                const webChunk = chunks.find((c: any) => c.web?.uri);
                if (webChunk) {
                    reliableUrl = webChunk.web.uri;
                }
            }

            if (verifiedData && verifiedData.verified === true) {
                // Merge verified data
                return {
                    ...paper,
                    title: verifiedData.correctTitle || paper.title, // Ensure title is deterministic
                    authors: Array.isArray(verifiedData.authors) && verifiedData.authors.length > 0 ? verifiedData.authors : paper.authors,
                    affiliations: verifiedData.affiliations || paper.affiliations,
                    url: reliableUrl, // Use the reliable grounding URL
                    authorsVerified: true
                };
            } else {
                // If verification returned false or failed structure, keep original but mark unverified
                // Still update URL if we found a better one via grounding
                return { ...paper, url: reliableUrl || paper.url, authorsVerified: false };
            }

        } catch (err) {
            console.warn(`Verification failed for paper: ${paper.title}`, err);
            // Return original state on error
            return paper;
        }
    }));

    return verifiedPapers;

  } catch (error) {
    console.error("Failed to fetch literature from Gemini:", error);
    return [];
  }
};