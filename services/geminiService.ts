import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality, PublicationType } from "../types";

// Initialize Gemini Client
// The API key is obtained from the environment variable as per strict guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- AGENT CONFIGURATIONS ---

interface AgentConfig {
    name: string;
    role: string;
    sources: string[];
    baseInstruction: string;
}

const AGENTS: Record<string, AgentConfig> = {
    PREPRINT: {
        name: "Preprint Hunter",
        role: "Scanner for latest unreviewed manuscripts",
        sources: ["biorxiv.org", "medrxiv.org"],
        baseInstruction: "Focus on finding the absolute latest manuscripts. Classify widely."
    },
    JOURNAL: {
        name: "Journal Scout",
        role: "Scanner for high-impact peer-reviewed publications",
        sources: [
            "nature.com", "nejm.org", "thelancet.com", "cell.com", "science.org", 
            "jamanetwork.com", "ahajournals.org", "diabetesjournals.org", 
            "bmj.com", "embo.org", "sciencedirect.com"
        ],
        baseInstruction: "Focus on major studies, clinical trials, and reviews."
    },
    BROAD: {
        name: "Broad Aggregator",
        role: "Scanner for broad coverage via aggregators",
        sources: ["pubmed.ncbi.nlm.nih.gov", "academic.oup.com", "wiley.com"],
        baseInstruction: "Focus on abstracts and broad topic coverage."
    }
};

// --- HELPER FUNCTIONS ---

// 1. Clean Title (Deterministic)
const cleanWebTitle = (title: string): string => {
    if (!title) return "";
    // Remove common SEO suffixes to leave just the academic title
    let cleaned = title.split(' | ')[0]; 
    cleaned = cleaned.split(' - ')[0];  
    
    const junkSuffixes = [
        'PubMed', 'NCBI', 'National Library of Medicine',
        'BioRxiv', 'MedRxiv', 'Nature', 'Science', 'NEJM', 'JAMA', 'The Lancet',
        'ScienceDirect', 'Wiley', 'Springer', 'Google Scholar',
        'Full Text', 'Abstract', 'View Article', 'Home Page'
    ];

    for (const junk of junkSuffixes) {
        const regex = new RegExp(`\\b${junk}\\b.*$`, 'i');
        cleaned = cleaned.replace(regex, '');
    }
    return cleaned.trim();
};

// 2. Retry Logic
async function generateContentWithRetry(modelId: string, params: any, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            return await ai.models.generateContent({
                model: modelId,
                ...params
            });
        } catch (error: any) {
            console.warn(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries) throw error; // Rethrow on last fail
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}

// 3. JSON Parser (Robust)
const parseJSON = (text: string): any[] => {
    try {
        const jsonBlockRegex = /```json\n([\s\S]*?)\n```/;
        const match = text.match(jsonBlockRegex);
        if (match) return JSON.parse(match[1]);
        
        // Fallback: Try to find the first '[' and last ']'
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            return JSON.parse(text.substring(start, end + 1));
        }
    } catch (e) {
        console.warn("JSON Parse Warning", e);
    }
    return [];
};

// --- CORE AGENT FUNCTION ---

const runAgent = async (
    agentKey: string, 
    activeTopics: string[], 
    dateString: string
): Promise<PaperData[]> => {
    const agent = AGENTS[agentKey];
    const modelId = "gemini-2.5-flash"; // Use the latest model for reasoning

    // 1. Construct Search Query (Topic + Site ONLY)
    // We intentionally DO NOT include Methodologies here to ensure we get broad hits (RSS-like).
    // We use "site:" operators to restrict to high-quality domains.
    const topicQuery = activeTopics.length > 0 
        ? `("${activeTopics.join('" OR "')}")`
        : '(CVD OR Diabetes OR Obesity OR "Chronic Kidney Disease")';
    
    const siteQuery = agent.sources.map(s => `site:${s}`).join(' OR ');
    
    // We remove strict "after:" operators to prevent search failures. 
    // Filtering happens in the verification step.
    const searchQuery = `${topicQuery} (${siteQuery})`;

    // 2. Construct Prompt (Extraction & Classification)
    const systemPrompt = `
        You are the ${agent.name}. Your goal is to find scientific literature.
        
        **INSTRUCTIONS:**
        1.  Use the 'googleSearch' tool to execute this exact query: \`${searchQuery}\`
        2.  From the search results, IDENTIFY papers/abstracts/articles.
        3.  **CRITICAL:** You must output a JSON array. For each paper found, you must map it to the schema below.
        4.  **VERIFICATION:** The 'url' field in your JSON MUST match one of the search result links exactly.
        5.  **CLASSIFICATION:** Read the title/snippet and infer the 'studyType', 'methodology', and 'topic'.
            - If it mentions "AI", "Machine Learning", "Deep Learning", set methodology to "AI/ML".
            - If it mentions "Trial", "RCT", "Randomized", set studyType to "Clinical Trial".
            - If it is from BioRxiv/MedRxiv, set publicationType to "Preprint".
        
        **JSON SCHEMA:**
        [
          {
            "url": "Exact URL from the search result",
            "date": "YYYY-MM-DD (Best guess from snippet, or today's date if 'recent')",
            "authors": ["Author 1", "et al"],
            "topic": "CVD | CKD | MASH | Diabetes | Obesity",
            "publicationType": "Preprint | Peer Reviewed | Review Article | Meta-Analysis | News/Analysis",
            "studyType": "Clinical Trial | Human Cohort | Pre-clinical | Simulated",
            "methodology": "AI/ML | Lab Experimental | Statistical",
            "modality": "Genetics | Proteomics | Imaging | Clinical Data | Other",
            "abstractHighlight": "Brief 10-word summary of the finding",
            "drugAndTarget": "Drug Name (Target) or N/A",
            "context": "Why is this relevant? (Max 10 words)"
          }
        ]
    `;

    try {
        // Execute Request
        const response = await generateContentWithRetry(modelId, {
            contents: systemPrompt,
            config: {
                temperature: 0.1, // Low temp for extraction precision
                tools: [{ googleSearch: {} }]
            }
        });

        // 3. Process Results (The "Grounding Handshake")
        const aiJson = parseJSON(response?.text || "");
        const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        if (aiJson.length === 0 || groundingChunks.length === 0) return [];

        const verifiedPapers: PaperData[] = [];
        const thirtyDaysAgo = new Date(dateString).getTime();

        // 4. Verification Loop
        for (const item of aiJson) {
            // A. Find the Grounding Chunk that matches this Item (Source of Truth)
            // We verify by URL matching primarily, falling back to Title containment
            const matchedChunk = groundingChunks.find((c: any) => 
                (c.web?.uri && item.url && c.web.uri === item.url) || 
                (c.web?.title && item.title && c.web.title.includes(item.title))
            );

            // Strict Grounding Check: If no search hit backs this up, we skip it.
            if (!matchedChunk || !matchedChunk.web?.uri || !matchedChunk.web?.title) continue;

            // B. Date Filter (Strict JS Check)
            // We check the AI extracted date
            let itemDate = new Date(item.date);
            
            // Heuristic: If AI failed to extract date, check snippet for "2024" or "2025"
            if (isNaN(itemDate.getTime())) {
                const snippet = (matchedChunk.web.title + " " + (item.abstractHighlight || ""));
                const hasRecentYear = snippet.includes("2024") || snippet.includes("2025");
                
                if (!hasRecentYear) {
                   continue; // Likely old junk
                }
                itemDate = new Date(); // Treat as new if it passed the year check
            }

            // Strict 30-day cutoff
            if (itemDate.getTime() < thirtyDaysAgo) continue;

            // C. Construct the Paper Object
            verifiedPapers.push({
                id: `live-${Math.random().toString(36).substr(2, 9)}`,
                title: cleanWebTitle(matchedChunk.web.title), // ALWAYS use the Web Title (No Hallucination)
                url: matchedChunk.web.uri, // ALWAYS use the Web URL
                journalOrConference: new URL(matchedChunk.web.uri).hostname.replace('www.', ''),
                date: itemDate.toISOString().split('T')[0],
                authors: item.authors || ["Unknown Authors"],
                // Use AI Classification for these fields:
                topic: (item.topic in DiseaseTopic) ? item.topic : DiseaseTopic.CVD, // Default fallback
                publicationType: (item.publicationType in PublicationType) ? item.publicationType : PublicationType.PeerReviewed,
                studyType: (item.studyType in StudyType) ? item.studyType : StudyType.PreClinical,
                methodology: (item.methodology in Methodology) ? item.methodology : Methodology.Statistical,
                modality: (item.modality in ResearchModality) ? item.modality : ResearchModality.Other,
                abstractHighlight: item.abstractHighlight || "No abstract available.",
                drugAndTarget: item.drugAndTarget || "N/A",
                context: item.context || "New search result",
                validationScore: 100, // It is grounded
                authorsVerified: false,
                isLive: true
            });
        }

        return verifiedPapers;

    } catch (e) {
        console.error(`Agent ${agent.name} failed:`, e);
        return [];
    }
};

// --- ORCHESTRATOR ---

export const fetchLiteratureAnalysis = async (
    activeTopics: string[]
): Promise<PaperData[]> => {
    
    // 1. Calculate Cutoff
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 30);
    const dateString = pastDate.toISOString().split('T')[0];

    console.log("Starting Multi-Agent Swarm...");

    // 2. Launch Agents in Parallel
    // We launch all agents to ensure maximum coverage (Preprints + Journals + Broad)
    try {
        const results = await Promise.all([
            runAgent("PREPRINT", activeTopics, dateString),
            runAgent("JOURNAL", activeTopics, dateString),
            runAgent("BROAD", activeTopics, dateString)
        ]);

        // 3. Flatten Results
        let allPapers = results.flat();

        // 4. Deduplicate (Strict URL & Title Fingerprint)
        const seen = new Set<string>();
        const uniquePapers: PaperData[] = [];

        for (const p of allPapers) {
            // Fingerprint: hostname + first 15 chars of title (normalized)
            // This catches the same paper from different agents
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
            const fingerprint = normalize(p.title).substring(0, 20);
            
            if (!seen.has(fingerprint)) {
                seen.add(fingerprint);
                uniquePapers.push(p);
            }
        }

        // 5. Sort by Date Descending
        return uniquePapers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (e) {
        console.error("Swarm failed:", e);
        return [];
    }
};
