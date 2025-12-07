import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality, PublicationType, CacheEntry } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CACHE CONFIGURATION ---
const CACHE_KEY_PREFIX = 'bioinsight_cache_v2_';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minutes

// --- TOPIC EXPANSION MAP ---
// Updated with Option 2: Title Constraints & High-Signal Proxies (Drugs/Targets)
const TOPIC_EXPANSION: Record<string, string> = {
    'MASH': '("MASH" OR "NASH" OR "MASLD" OR "Steatohepatitis")',
    'NASH': '("MASH" OR "NASH" OR "MASLD" OR "Steatohepatitis")',
    'MASLD': '("MASH" OR "NASH" OR "MASLD" OR "Steatohepatitis")',
    'Obesity': '(intitle:"Obesity" OR intitle:"Weight Loss" OR intitle:"BMI" OR intitle:"Semaglutide" OR intitle:"Tirzepatide" OR intitle:"GLP-1")',
    'Diabetes': '(intitle:"Diabetes" OR intitle:"Type 2" OR intitle:"T2D" OR intitle:"HbA1c" OR intitle:"Insulin" OR intitle:"SGLT2")',
    'CVD': '("Cardiovascular" OR "Heart Failure" OR "Atherosclerosis" OR "Myocardial" OR "HFrEF")',
    'CKD': '("Chronic Kidney Disease" OR "CKD" OR "Renal Failure" OR "Nephropathy" OR "Glomerular")'
};

// --- HELPER FUNCTIONS ---

const getCacheKey = (topics: string[]): string => {
    const sorted = [...topics].sort().join('_');
    return `${CACHE_KEY_PREFIX}${sorted}`;
};

const checkCache = (topics: string[]): PaperData[] | null => {
    try {
        const key = getCacheKey(topics);
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const entry: CacheEntry = JSON.parse(stored);
        const now = Date.now();

        if (now - entry.timestamp < CACHE_TTL_MS) {
            console.log(`[Cache Hit] Returning ${entry.papers.length} papers from local storage.`);
            return entry.papers;
        } else {
            console.log(`[Cache Expired] Removing old data.`);
            localStorage.removeItem(key);
            return null;
        }
    } catch (e) {
        return null;
    }
};

const saveCache = (topics: string[], papers: PaperData[]) => {
    try {
        const key = getCacheKey(topics);
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

// --- CORE HYBRID AGENT FUNCTION ---

const runHybridAgent = async (
    agentName: string, 
    searchQuery: string, 
    cutoffDate: Date
): Promise<PaperData[]> => {
    const modelId = "gemini-2.5-flash"; 

    const systemPrompt = `
        You are the ${agentName}. Find scientific papers based on the query.
        
        **INSTRUCTIONS:**
        1.  Use 'googleSearch' with query: \`${searchQuery}\`
        2.  **EXTRACT:** Articles, Clinical Trials, Preprints.
        3.  **DOI:** Extract DOI if available.
        4.  **STRICT VERIFICATION:** 'url' MUST match a search result.
        
        **JSON SCHEMA:**
        [
          {
            "url": "Exact URL from search result",
            "title": "Full academic title",
            "date": "YYYY-MM-DD",
            "authors": ["Author 1", "et al"],
            "doi": "10.xxxx/xxxxx",
            "topic": "CVD | CKD | MASH | Diabetes | Obesity",
            "publicationType": "Preprint | Peer Reviewed | Review Article | Meta-Analysis | News/Analysis",
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
        const thirtyDaysAgoTime = cutoffDate.getTime();

        for (const item of aiJson) {
            const matchedChunk = groundingChunks.find((c: any) => {
                if (!c.web?.uri) return false;
                const exactUrlMatch = item.url && c.web.uri === item.url;
                const titleMatch = c.web.title ? checkTokenOverlap(item.title, c.web.title) : false;
                const snippetMatch = (c.web.snippet || c.web.content) ? checkTokenOverlap(item.title, (c.web.snippet || c.web.content)) : false;
                return exactUrlMatch || titleMatch || snippetMatch;
            });

            if (!matchedChunk || !matchedChunk.web?.uri) continue;

            let finalUrl = matchedChunk.web.uri;
            if (item.doi && item.doi.includes('10.')) {
                finalUrl = `https://doi.org/${item.doi.trim()}`;
            }

            let itemDate = new Date(item.date);
            if (isNaN(itemDate.getTime())) {
                const snippet = (matchedChunk.web.title + " " + (matchedChunk.web.snippet || "")).toLowerCase();
                if (snippet.includes("2024") || snippet.includes("2025")) {
                    itemDate = new Date(); 
                } else {
                    continue; 
                }
            }

            if (itemDate.getTime() < thirtyDaysAgoTime) continue;

            verifiedPapers.push({
                id: `live-${Math.random().toString(36).substr(2, 9)}`,
                title: item.title,
                url: finalUrl,
                journalOrConference: new URL(finalUrl).hostname.replace('www.', ''),
                date: itemDate.toISOString().split('T')[0],
                authors: item.authors || ["Unknown"],
                topic: (item.topic in DiseaseTopic) ? item.topic : DiseaseTopic.CVD,
                publicationType: (item.publicationType in PublicationType) ? item.publicationType : PublicationType.PeerReviewed,
                studyType: (item.studyType in StudyType) ? item.studyType : StudyType.PreClinical,
                methodology: (item.methodology in Methodology) ? item.methodology : Methodology.Statistical,
                modality: (item.modality in ResearchModality) ? item.modality : ResearchModality.Other,
                abstractHighlight: item.abstractHighlight || "Summary unavailable.",
                drugAndTarget: item.drugAndTarget || "N/A",
                context: item.context || "Live Feed Result",
                validationScore: agentName.includes("Hub") ? 100 : 90, 
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
        // Filter out hubs, look for deep links
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

// --- STREAMING ORCHESTRATOR ---

export async function* fetchLiteratureAnalysisStream(activeTopics: string[]): AsyncGenerator<PaperData[], void, unknown> {
    
    // 1. Check Cache First
    const cachedData = checkCache(activeTopics);
    if (cachedData) {
        yield cachedData;
        return;
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // 2. Optimized Hub & Spoke Config
    const topicStr = activeTopics.slice(0, 3).map(t => TOPIC_EXPANSION[t] || `"${t}"`).join(' OR ');
    
    // Option 1: Structural Anchors
    // We strictly enforce these terms to filter out "News", "Collections", and "Editorials" 
    // that often pollute searches for high-volume terms like Obesity.
    const structuralAnchors = '("p-value" OR "confidence interval" OR "randomized" OR "cohort" OR "hazard ratio" OR "mechanism")';

    // Agent 1: The "Hub & Spoke" Model - High Precision
    // We inject structuralAnchors to ensure we only get Research Papers, not Landing Pages.
    const academicQuery = `(site:nature.com OR site:science.org OR site:nejm.org OR site:thelancet.com OR site:jamanetwork.com OR site:ahajournals.org OR site:diabetesjournals.org OR site:cell.com OR site:academic.oup.com OR site:sciencedirect.com OR site:link.springer.com OR site:onlinelibrary.wiley.com) ${topicStr} ${structuralAnchors} after:${dateStr} -news -editorial`;
    
    // Agent 2: The Safety Net (PubMed) + Preprints - High Recall
    // PubMed is structurally cleaner, but we still exclude news.
    const dragnetQuery = `(site:pubmed.ncbi.nlm.nih.gov OR site:biorxiv.org OR site:medrxiv.org) ${topicStr} after:${dateStr} -news`;

    const swarmConfig = [
        { name: "Publisher Hub Swarm", query: academicQuery },
        { name: "PubMed & Preprint Dragnet", query: dragnetQuery }
    ];

    let allCollectedPapers: PaperData[] = [];

    // 3. Sequential Execution with Yield (Streaming)
    // We run them one by one to prevent 429 errors and allow the UI to update progressively.
    for (const agent of swarmConfig) {
        // Small throttle before request
        await new Promise(r => setTimeout(r, 500));
        
        const batchResults = await runHybridAgent(agent.name, agent.query, thirtyDaysAgo);
        
        if (batchResults.length > 0) {
            allCollectedPapers = [...allCollectedPapers, ...batchResults];
            yield batchResults; // SEND DATA TO UI IMMEDIATELY
        }
    }

    // 4. Save to Cache if we found data
    if (allCollectedPapers.length > 0) {
        // Deduplicate before saving
        const seen = new Set<string>();
        const unique = allCollectedPapers.filter(p => {
            const fp = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
            if (seen.has(fp)) return false;
            seen.add(fp);
            return true;
        });
        saveCache(activeTopics, unique);
    }
}