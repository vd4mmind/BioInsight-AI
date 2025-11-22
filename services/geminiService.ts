import { GoogleGenAI, Type } from "@google/genai";
import { DiseaseTopic, Methodology, OmicsType, PaperData, PublicationType, StudyType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchLiteratureAnalysis = async (existingIds: string[]): Promise<PaperData[]> => {
  try {
    // We request a JSON array of papers. 
    // We simulate "live" feed by asking for "latest" or "trending" conceptual papers based on real science.
    
    const modelId = "gemini-2.5-flash"; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Generate 4 unique, realistic scientific literature entries related to these topics: CVD, CKD, MASH, NASH, MASLD, Diabetes, Obesity. 
      Focus on recent breakthroughs, AI/ML applications in biology, and clinical trial results.
      Mix of Preprints (BioRxiv/MedRxiv/Arxiv) and Peer Reviewed (Nature, Lancet, NEJM, CVPR, NeurIPS).
      Ensure the data is technically accurate to current scientific trends.
      
      CRITICAL AUTHOR VERIFICATION CHECKPOINT:
      - Perform a verification check on the authors.
      - Cross-reference author names with known scientific databases (e.g., PubMed, Google Scholar) or valid institutional affiliations (e.g., Harvard, Broad Institute, Novo Nordisk).
      - If the paper corresponds to a REAL study with REAL authors, set 'authorsVerified' to TRUE.
      - If the paper is a generated illustrative example of a trend, or uses generic/simulated names, set 'authorsVerified' to FALSE.
      - Be strict: If you are unsure if the specific author combo exists for that specific title, set it to FALSE.
      
      ADDITIONAL METADATA:
      - Provide realistic institutional affiliations for the authors.
      - Provide the primary funding source (e.g., NIH, Welcome Trust, Pharma Company, or N/A).
      - Provide 3-5 relevant keywords or tags.
      
      Do not include IDs that match this list: ${JSON.stringify(existingIds)}.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              journalOrConference: { type: Type.STRING },
              date: { type: Type.STRING, description: "YYYY-MM-DD format, recent dates within last year" },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              affiliations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "University or Company names" },
              funding: { type: Type.STRING, description: "Grant or Sponsor name" },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Scientific tags" },
              topic: { type: Type.STRING, enum: Object.values(DiseaseTopic) },
              publicationType: { type: Type.STRING, enum: Object.values(PublicationType) },
              studyType: { type: Type.STRING, enum: Object.values(StudyType) },
              methodology: { type: Type.STRING, enum: Object.values(Methodology) },
              omicsType: { type: Type.STRING, enum: Object.values(OmicsType) },
              abstractHighlight: { type: Type.STRING, description: "One line scientific takeaway" },
              drugAndTarget: { type: Type.STRING, description: "e.g. Target: GLP-1, Drug: Semaglutide" },
              context: { type: Type.STRING, description: "Why this matters clinically or scientifically" },
              validationScore: { type: Type.INTEGER, description: "Confidence score 0-100 based on source reliability and clarity" },
              authorsVerified: { type: Type.BOOLEAN, description: "True ONLY if authors are cross-referenced as real entities linked to this work. False if simulated." },
              url: { type: Type.STRING, description: "A link to the source if real, or a generic field if simulated" }
            },
            required: ["title", "journalOrConference", "date", "topic", "publicationType", "studyType", "methodology", "omicsType", "abstractHighlight", "drugAndTarget", "context", "validationScore", "authorsVerified", "affiliations", "funding", "keywords"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Add client-side IDs
    return rawData.map((paper: any) => ({
      ...paper,
      id: Math.random().toString(36).substring(2, 15)
    }));

  } catch (error) {
    console.error("Failed to fetch literature from Gemini:", error);
    return [];
  }
};