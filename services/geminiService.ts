import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality, PublicationType, CacheEntry } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CACHE CONFIGURATION ---
const CACHE_KEY_PREFIX = 'bioinsight_cache_v2_';
// Live Feed: 15 Minutes
const CACHE_TTL_LIVE = 15 * 60 * 1000; 
// AI Feed: 24 Hours
const CACHE_TTL_AI = 24 * 60 * 60 * 1000;
// Patent Feed: 7 Days
const CACHE_TTL_PATENT = 7 * 24 * 60 * 60 * 1000;

// --- TOPIC EXPANSION MAP (UPDATED v2.2) ---
// Strategy: Removed 'intitle:' constraints to improve Patent/Abstract recall.
// Added 2024/2025 Pipeline Drugs (Retatrutide, CagriSema, etc).
const TOPIC_EXPANSION: Record<string, string> = {
    'MASH / NASH': '("MASH" OR "NASH" OR "MASLD" OR "Steatohepatitis")',
    'Obesity': '("Obesity" OR "Weight Loss" OR "BMI" OR "Semaglutide" OR "Tirzepatide" OR "Retatrutide" OR "CagriSema" OR "Orforglipron" OR "Amycretin" OR "GLP-1" OR "Amylin" OR "HFpEF" OR "Sleep Apnea")',
    'Diabetes': '("Diabetes" OR "Type 2" OR "T2D" OR "HbA1c" OR "Insulin" OR "SGLT2" OR "Finerenone" OR "Sotagliflozin")',
    'CVD': '("Cardiovascular" OR "Heart Failure" OR "Atherosclerosis" OR "Myocardial" OR "HFrEF")',
    'CKD': '("Chronic Kidney Disease" OR "CKD" OR "Renal Failure" OR "Nephropathy" OR "Glomerular")'
};

// --- HELPER FUNCTIONS ---

const getCacheKey = (type: 'live' | 'ai' | 'patent', topics: string[]): string => {
    const sorted = [...topics].sort().join('_');
    return `${CACHE_KEY_PREFIX}${type}_${sorted}`;
};

const checkCache = (type: 'live' | 'ai' | 'patent', topics: string[]): PaperData[] | null => {
    try {
        const key = getCacheKey(type, topics);
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const entry: CacheEntry = JSON.parse(stored);
        const now = Date.now();
        
        let ttl = CACHE_TTL_LIVE;
        if (type === 'ai') ttl = CACHE_TTL_AI;
        if (type === 'patent') ttl = CACHE_TTL_PATENT;

        if (now - entry.timestamp < ttl) {
            console.log(`[Cache Hit - ${type}] Returning ${entry.papers.length} items.`);
            return entry.papers;
        } else {
            console.log(`[Cache Expired - ${type}] Removing old data.`);
            localStorage.removeItem(key);
            return null;
        }
    } catch (e) {
        return null;
    }
};

const saveCache = (type: 'live' | 'ai' | 'patent', topics: string[], papers: PaperData[]) => {
    try {
        const key = getCacheKey(type, topics);
        const entry: CacheEntry = {
            timestamp: Date.now(),
            papers: papers
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
        console.warn("Failed to save to cache (likely quota)", e);
    }
};

const parseJSON = (text: string): any[] => {
    try {
        const jsonBlockRegex = /```json\n([\s\S]*?)\n```/;
        const match = text.match(jsonBlockRegex);
        if (match) return JSON.parse(match[1]);
        
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

const checkTokenOverlap = (aiTitle: string, targetText: string): boolean => {
    if (!aiTitle || !targetText) return false;
    const tokenize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    const aiTokens = tokenize(aiTitle);
    const targetTokens = tokenize(targetText);
    if (aiTokens.length === 0) return false;
    const matches = aiTokens.filter(token => targetTokens.some(tt => tt.includes(token) || token.includes(tt)));
    return (matches.length / aiTokens.length) >= 0.4;
};

// Robust mapping to ensure legacy/synonym topics map to the new "MASH / NASH" enum value
const mapToDiseaseTopic = (input: string): DiseaseTopic => {
    const upper = input?.toUpperCase() || '';
    if (upper.includes('NASH') || upper.includes('MASH') || upper.includes('MASLD') || upper.includes('STEATOHEPATITIS')) {
        return DiseaseTopic.MASH; // Returns 'MASH / NASH'
    }
    // Iterate keys to find match
    for (const key in DiseaseTopic) {
        if (upper === key) {
            return DiseaseTopic[key as keyof typeof DiseaseTopic];
        }
    }
    // Iterate values to find match
    for (const value of Object.values(DiseaseTopic)) {
         if (upper === value.toUpperCase()) return value;
    }
    
    return DiseaseTopic.CVD; // Default fallback
};

// --- AGENT GENERATOR CORE ---

const runHybridAgent = async (
    agentName: string, 
    searchQuery: string, 
    cutoffDate: Date,
    feedType: 'live' | 'ai' | 'patent'
): Promise<PaperData[]> => {
    const modelId = "gemini-2.5-flash"; 

    // Customized System Prompts based on Feed Type
    // IMPL: Option 2 (Negative Prompt Tuning)
    let instructionBlock = `
        **INSTRUCTIONS:**
        1.  Use 'googleSearch' with query: \`${searchQuery}\`
        2.  **EXTRACT:** Articles, Clinical Trials, Preprints.
        3.  **EXCLUDE:** Generic reviews, editorials, commentaries, "Perspectives", opinion pieces, or news items that do not contain original data or statistical analysis.
        4.  **STRICT VERIFICATION:** 'url' MUST match a search result.
    `;
    
    if (feedType === 'patent') {
        instructionBlock = `
        **INSTRUCTIONS (PATENT MODE):**
        1.  Use 'googleSearch' with query: \`${searchQuery}\`
        2.  **EXTRACT:** Patent Applications, Grants.
        3.  **EXCLUDE:** Legal commentaries, law firm advertisements, general IP news, or press releases.
        4.  **MAPPING:** 
            - 'authors' = Assignee/Company (e.g. Novo Nordisk).
            - 'journalOrConference' = Patent Office (e.g. USPTO, WIPO).
        `;
    }

    const systemPrompt = `
        You are the ${agentName}.
        ${instructionBlock}
        
        **JSON SCHEMA:**
        [
          {
            "url": "Exact URL from search result",
            "title": "Full title",
            "date": "YYYY-MM-DD",
            "authors": ["Author 1" (or Assignee for Patents)],
            "doi": "10.xxxx/xxxxx",
            "topic": "CVD | CKD | MASH | NASH | MASLD | Diabetes | Obesity",
            "publicationType": "Preprint | Peer Reviewed | Review Article | Patent",
            "studyType": "Clinical Trial | Human Cohort | Pre-clinical | Simulated",
            "methodology": "AI/ML | Lab Experimental | Statistical",
            "modality": "Genetics | Proteomics | Imaging | Clinical Data | Other",
            "abstractHighlight": "Brief 15-word summary",
            "drugAndTarget": "Drug (Target) or N/A",
            "context": "Why relevant? (Max 10 words)"
          }
        ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: systemPrompt,
            config: {
                temperature: 0.1, 
                tools: [{ googleSearch: {} }]
            }
        });

        const aiJson = parseJSON(response?.text || "");
        // @ts-ignore 
        const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        if (aiJson.length === 0 || groundingChunks.length === 0) return [];

        const verifiedPapers: PaperData[] = [];
        const cutoffTime = cutoffDate.getTime();

        for (const item of aiJson) {
            const matchedChunk = groundingChunks.find((c: any) => {
                if (!c.web?.uri) return false;
                const exactUrlMatch = item.url && c.web.uri === item.url;
                const titleMatch = c.web.title ? checkTokenOverlap(item.title, c.web.title) : false;
                return exactUrlMatch || titleMatch;
            });

            if (!matchedChunk || !matchedChunk.web?.uri) continue;

            let finalUrl = matchedChunk.web.uri;
            if (item.doi && item.doi.includes('10.')) {
                finalUrl = `https://doi.org/${item.doi.trim()}`;
            }

            // Date Parsing & Filtering
            let itemDate = new Date(item.date);
            if (isNaN(itemDate.getTime())) {
                const snippet = (matchedChunk.web.title + " " + (matchedChunk.web.snippet || "")).toLowerCase();
                if (snippet.includes("2024") || snippet.includes("2025")) {
                    itemDate = new Date(); 
                } else {
                    continue; 
                }
            }

            if (itemDate.getTime() < cutoffTime) continue;

            verifiedPapers.push({
                id: `${feedType}-${Math.random().toString(36).substr(2, 9)}`,
                title: item.title,
                url: finalUrl,
                journalOrConference: item.journalOrConference || new URL(finalUrl).hostname.replace('www.', ''),
                date: itemDate.toISOString().split('T')[0],
                authors: item.authors || ["Unknown"],
                topic: mapToDiseaseTopic(item.topic), // Use strict mapper
                publicationType: feedType === 'patent' ? PublicationType.Patent : ((item.publicationType in PublicationType) ? item.publicationType : PublicationType.PeerReviewed),
                studyType: (item.studyType in StudyType) ? item.studyType : StudyType.PreClinical,
                methodology: feedType === 'ai' ? Methodology.AIML : ((item.methodology in Methodology) ? item.methodology : Methodology.Statistical),
                modality: (item.modality in ResearchModality) ? item.modality : ResearchModality.Other,
                abstractHighlight: item.abstractHighlight || "Summary unavailable.",
                drugAndTarget: item.drugAndTarget || "N/A",
                context: item.context || `${feedType.toUpperCase()} Feed Result`,
                validationScore: 90, 
                authorsVerified: false,
                isLive: true,
                isPolished: false
            });
        }

        return verifiedPapers;

    } catch (e: any) {
        console.warn(`Agent ${agentName} encountered an issue: ${e.message}`);
        return [];
    }
};

// --- EXPORTED STREAMS ---

// 1. LIVE LITERATURE STREAM (Original)
export async function* fetchLiteratureAnalysisStream(activeTopics: string[]): AsyncGenerator<PaperData[], void, unknown> {
    const cachedData = checkCache('live', activeTopics);
    if (cachedData) { yield cachedData; return; }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Use expansion map or fallback to quotes
    const topicStr = activeTopics.map(t => TOPIC_EXPANSION[t] || `"${t}"`).join(' OR ');
    const structuralAnchors = '("p-value" OR "confidence interval" OR "randomized" OR "cohort")';

    // Rebalanced Swarm Architecture: "Prestige" vs "Volume"
    // Swarm A: "Prestige & Society Swarm" - Targets the "Big 6" and critical society journals (AHA, ADA, Cell, Science).
    // Swarm B: "Aggregator & Preprint Swarm" - Targets high-volume aggregators (Elsevier, Wiley, OUP, Springer) and Preprints.
    const swarmConfig = [
        { 
            name: "Prestige & Society Swarm", 
            query: `(site:nature.com OR site:science.org OR site:nejm.org OR site:thelancet.com OR site:jamanetwork.com OR site:cell.com OR site:diabetesjournals.org OR site:ahajournals.org) ${topicStr} ${structuralAnchors} after:${dateStr} -news -editorial -commentary` 
        },
        { 
            name: "Aggregator & Preprint Swarm", 
            query: `(site:sciencedirect.com OR site:onlinelibrary.wiley.com OR site:academic.oup.com OR site:link.springer.com OR site:biorxiv.org OR site:medrxiv.org OR site:pubmed.ncbi.nlm.nih.gov) ${topicStr} after:${dateStr} -news` 
        }
    ];

    let allCollectedPapers: PaperData[] = [];
    for (const agent of swarmConfig) {
        await new Promise(r => setTimeout(r, 500));
        const batchResults = await runHybridAgent(agent.name, agent.query, thirtyDaysAgo, 'live');
        if (batchResults.length > 0) {
            allCollectedPapers = [...allCollectedPapers, ...batchResults];
            yield batchResults;
        }
    }
    if (allCollectedPapers.length > 0) saveCache('live', activeTopics, allCollectedPapers);
}

// 2. AI/ML NEXUS STREAM (New)
export async function* fetchAiAnalysisStream(activeTopics: string[]): AsyncGenerator<PaperData[], void, unknown> {
    const cachedData = checkCache('ai', activeTopics);
    if (cachedData) { yield cachedData; return; }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Use expansion map to ensure synonyms (NASH, MASLD) are searched
    const topicStr = activeTopics.map(t => TOPIC_EXPANSION[t] || `"${t}"`).join(' OR '); 
    const aiKeywords = '("Machine Learning" OR "Deep Learning" OR "Transformer" OR "Large Language Model" OR "Computer Vision" OR "Generative AI")';
    const clinicalKeywords = '("EHR" OR "Electronic Health Records" OR "MRI" OR "CT Scan" OR "Histopathology" OR "Clinical Cohort" OR "Real-world evidence")';
    
    // IMPL: Option 2 (Enhanced Exclusion)
    const exclusion = '-mouse -rat -murine -vitro -preclinical -"animal model" -editorial -commentary -"opinion"';

    const query = `${topicStr} AND ${aiKeywords} AND ${clinicalKeywords} ${exclusion} after:${dateStr} (site:nature.com OR site:arxiv.org OR site:medrxiv.org OR site:pubmed.ncbi.nlm.nih.gov)`;

    const batchResults = await runHybridAgent("AI Specialist Agent", query, thirtyDaysAgo, 'ai');
    if (batchResults.length > 0) {
        yield batchResults;
        saveCache('ai', activeTopics, batchResults);
    }
}

// 3. PATENT STREAM (New)
export async function* fetchPatentStream(activeTopics: string[]): AsyncGenerator<PaperData[], void, unknown> {
    const cachedData = checkCache('patent', activeTopics);
    if (cachedData) { yield cachedData; return; }

    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000)); // Patents move slower
    const dateStr = ninetyDaysAgo.toISOString().split('T')[0];

    // Use expansion map to ensure synonyms (NASH, MASLD) are searched
    const topicStr = activeTopics.map(t => TOPIC_EXPANSION[t] || `"${t}"`).join(' OR ');
    const typeKeywords = '("Method" OR "System" OR "Composition" OR "Apparatus")';

    // Target Google Patents or similar repositories
    const query = `(site:patents.google.com/patent/ OR site:freepatentsonline.com) ${topicStr} AND ${typeKeywords} after:${dateStr}`;

    const batchResults = await runHybridAgent("Patent Clerk Agent", query, ninetyDaysAgo, 'patent');
    if (batchResults.length > 0) {
        yield batchResults;
        saveCache('patent', activeTopics, batchResults);
    }
}

// --- ON-DEMAND LINK POLISHER (EXPOSED) ---
export const runLinkPolisher = async (paper: PaperData): Promise<string | null> => {
    if (!paper.url) return null;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find the DIRECT PDF or Full Text HTML link for the scientific paper titled "${paper.title}". The current link is "${paper.url}". Return ONLY the new URL.`,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        // @ts-ignore
        const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const betterChunk = chunks.find((c: any) => {
            const uri = c.web?.uri?.toLowerCase();
            return uri && 
                   !uri.includes('/toc/') && 
                   !uri.includes('/issue/') && 
                   (uri.includes('.pdf') || uri.includes('/full/') || uri.includes('/article/'));
        });
        
        return betterChunk?.web?.uri || null;
    } catch (e) {
        return null;
    }
};