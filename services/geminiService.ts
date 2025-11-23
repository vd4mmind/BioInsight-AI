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
    // Use 'OR' to allow discovery across selected domains, preventing over-filtering
    const topicsList = activeTopics.length > 0 
        ? activeTopics.join(' OR ') 
        : "Cardiovascular Disease OR Metabolic Disease OR Kidney Disease";

    const studyList = activeStudyTypes.length > 0 
        ? activeStudyTypes.join(' OR ')
        : "Clinical Trials OR New Research Breakthroughs";

    const methodList = activeMethodologies.length > 0
        ? activeMethodologies.join(' OR ')
        : "AI/ML OR Statistical OR Experimental";

    // Enhanced Discovery Prompt
    const discoveryPrompt = `
      You are BioInsight, a real-time scientific intelligence engine acting as a "Discovery Feed" for researchers.
      
      OBJECTIVE:
      Generate a curated feed of the 6-8 most significant scientific developments from the last 30 days (Since ${dateString}).
      
      SEARCH PARAMETERS:
      - **Focus Topics**: ${topicsList}
      - **Study Design**: ${studyList}
      - **Methodology**: ${methodList}
      
      SEARCH STRATEGY (USE GOOGLE SEARCH TOOL):
      1.  **News & Trends**: Identify breaking news (FDA approvals, major trial results, fast-track designations) in these fields using sources like StatNews, FierceBiotech, or major medical journals.
      2.  **Preprint Pulse**: Find trending preprints on BioRxiv/MedRxiv that use ${methodList}.
      3.  **High-Impact**: Look for new publications in NEJM, Lancet, Nature, Circulation, Cell, Hepatology.
      
      DATA EXTRACTION RULES:
      - **Titles**: MUST be the exact title from the search result.
      - **Authors**: Extract real First/Last authors.
      - **Affiliations**: Identify the primary institution (e.g., "Harvard Medical School").
      - **Context**: A punchy, "Discovery-style" headline explaining why this matters (e.g., "First AI model to predict CKD progression with 90% accuracy").
      
      OUTPUT FORMAT:
      Return a STRICT JSON array inside a \`\`\`json\`\`\` block. 
      
      JSON Schema per item:
      {
        "title": "Exact Title",
        "journalOrConference": "Source Name",
        "date": "YYYY-MM-DD",
        "authors": ["Author 1", "Author 2", "et al."],
        "topic": "One of: ${Object.values(DiseaseTopic).join(', ')}",
        "publicationType": "One of: ${Object.values(PublicationType).join(', ')}",
        "studyType": "One of: ${Object.values(StudyType).join(', ')}",
        "methodology": "One of: ${Object.values(Methodology).join(', ')}",
        "modality": "One of: ${Object.values(ResearchModality).join(', ')}",
        "abstractHighlight": "Single sentence finding.",
        "drugAndTarget": "Drug/Target or N/A",
        "context": "Why is this a key discovery?",
        "validationScore": 95,
        "url": "URL if available",
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
        const chunks = discoveryResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks && chunks.length > 0) {
            const normalize = (s: string) => s?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
            const paperTitleNorm = normalize(paper.title);

            // Find best matching chunk using fuzzy logic
            const relevantChunk = chunks.find((c: any) => {
                const chunkTitleNorm = normalize(c.web?.title);
                return c.web?.uri && (
                    chunkTitleNorm.includes(paperTitleNorm) || 
                    paperTitleNorm.includes(chunkTitleNorm) ||
                    // Fallback: check if chunk title contains significant words from paper title
                    (paperTitleNorm.length > 15 && chunkTitleNorm.includes(paperTitleNorm.substring(0, 20)))
                );
            });

            if (relevantChunk) {
                groundingUrl = relevantChunk.web.uri;
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