import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality, PublicationType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPER FUNCTIONS ---

// 1. Clean Title (Deterministic)
const cleanWebTitle = (title: string): string => {
    if (!title) return "";
    // Remove common SEO suffixes
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
            if (i === retries) throw error;
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

// --- CORE HYBRID AGENT FUNCTION ---

const runHybridAgent = async (
    agentName: string, 
    searchQuery: string, 
    cutoffDate: Date
): Promise<PaperData[]> => {
    const modelId = "gemini-2.5-flash"; 

    // System Prompt: Focus on Extraction & Classification
    const systemPrompt = `
        You are the ${agentName}. Your goal is to find scientific literature based on the executed search.
        
        **INSTRUCTIONS:**
        1.  Use the 'googleSearch' tool to execute this exact query: \`${searchQuery}\`
        2.  From the search results, IDENTIFY scientific papers, clinical trials, or preprints.
        3.  **STRICT JSON OUTPUT:** Map findings to the schema below.
        4.  **VERIFICATION:** The 'url' field MUST match one of the search result links exactly.
        5.  **CLASSIFICATION:** Infer 'studyType', 'methodology', and 'topic' from the title/abstract.
            - "AI", "Machine Learning" -> methodology: "AI/ML"
            - "Trial", "RCT" -> studyType: "Clinical Trial"
            - "Review" -> publicationType: "Review Article"
            - BioRxiv/MedRxiv -> publicationType: "Preprint"
        
        **JSON SCHEMA:**
        [
          {
            "url": "Exact URL from search result",
            "title": "Full academic title",
            "date": "YYYY-MM-DD",
            "authors": ["Author 1", "et al"],
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
        const response = await generateContentWithRetry(modelId, {
            contents: systemPrompt,
            config: {
                temperature: 0.1, 
                tools: [{ googleSearch: {} }]
            }
        });

        const aiJson = parseJSON(response?.text || "");
        const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        if (aiJson.length === 0 || groundingChunks.length === 0) return [];

        const verifiedPapers: PaperData[] = [];
        const thirtyDaysAgoTime = cutoffDate.getTime();

        for (const item of aiJson) {
            // A. Verification (Grounding Handshake)
            // Priority: Exact URL match -> Title Containment
            const matchedChunk = groundingChunks.find((c: any) => 
                (c.web?.uri && item.url && c.web.uri === item.url) || 
                (c.web?.title && item.title && c.web.title.includes(item.title))
            );

            if (!matchedChunk || !matchedChunk.web?.uri || !matchedChunk.web?.title) continue;

            // B. Date Filter (Strict)
            let itemDate = new Date(item.date);
            if (isNaN(itemDate.getTime())) {
                // If date parsing fails, strictly check year in title/snippet
                const snippet = (matchedChunk.web.title + " " + (item.abstractHighlight || "")).toLowerCase();
                if (snippet.includes("2024") || snippet.includes("2025")) {
                    itemDate = new Date(); // Assume recent if year is present
                } else {
                    continue; 
                }
            }

            if (itemDate.getTime() < thirtyDaysAgoTime) continue;

            // C. Construct Object
            verifiedPapers.push({
                id: `live-${Math.random().toString(36).substr(2, 9)}`,
                title: cleanWebTitle(matchedChunk.web.title), // Source of Truth
                url: matchedChunk.web.uri,
                journalOrConference: new URL(matchedChunk.web.uri).hostname.replace('www.', ''),
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
                validationScore: agentName.includes("Sniper") ? 100 : 90, // Snipers are authoritative
                authorsVerified: false,
                isLive: true
            });
        }

        return verifiedPapers;

    } catch (e) {
        console.error(`Hybrid Agent ${agentName} failed:`, e);
        return [];
    }
};

// --- ORCHESTRATOR ---

export const fetchLiteratureAnalysis = async (
    activeTopics: string[]
): Promise<PaperData[]> => {
    
    // 1. Calculate Strict Date Cutoff (30 Days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // 2. Prepare Query Strings
    // If no topics selected, default to broad query
    const topicStr = activeTopics.length > 0 
        ? `("${activeTopics.join('" OR "')}")`
        : '("CVD" OR "Diabetes" OR "Obesity" OR "NASH")';
    
    // For Trawler (Natural Language)
    const trawlerTopicStr = activeTopics.length > 0 ? activeTopics.join(', ') : "Cardiovascular Disease, Metabolic Disorders";

    console.log("Launching Hybrid Swarm (Sniper + Trawler)...");

    // 3. Define Swarm Configuration
    const swarmConfig = [
        // --- PIPELINE A: SNIPER AGENTS (Precision + Prestige) ---
        // Break journals into tiers to avoid query timeouts.
        {
            name: "Sniper-General",
            query: `(site:nature.com OR site:science.org OR site:cell.com OR site:pnas.org) ${topicStr} after:${dateStr}`
        },
        {
            name: "Sniper-Clinical",
            query: `(site:nejm.org OR site:thelancet.com OR site:jamanetwork.com OR site:bmj.com) ${topicStr} after:${dateStr}`
        },
        {
            name: "Sniper-Specialty",
            query: `(site:ahajournals.org OR site:diabetesjournals.org OR site:embo.org) ${topicStr} after:${dateStr}`
        },
        {
            name: "Sniper-Preprint",
            query: `(site:biorxiv.org OR site:medrxiv.org) ${topicStr} after:${dateStr}`
        },
        // --- PIPELINE B: TRAWLER AGENT (Semantic + Broad) ---
        // Catches papers from other sources using natural language intent.
        {
            name: "Trawler-Semantic",
            query: `latest research papers study ${trawlerTopicStr} published after ${dateStr} -news -blog`
        }
    ];

    // 4. Parallel Execution
    try {
        const results = await Promise.all(
            swarmConfig.map(agent => runHybridAgent(agent.name, agent.query, thirtyDaysAgo))
        );

        // 5. Synthesis & Deduplication
        const allPapers = results.flat();
        const seen = new Set<string>();
        const uniquePapers: PaperData[] = [];

        // Prioritize Sniper results (first in array) during dedupe
        for (const p of allPapers) {
            // Fingerprint: 1st 20 chars of normalized title
            const fingerprint = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
            
            if (!seen.has(fingerprint)) {
                seen.add(fingerprint);
                uniquePapers.push(p);
            }
        }

        // 6. Sort by Date (Newest First)
        // If dates are equal, Sniper results (score 100) will float to top naturally via stable sort or we can force it.
        return uniquePapers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (e) {
        console.error("Hybrid Swarm failed:", e);
        return [];
    }
};
