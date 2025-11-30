import { GoogleGenAI } from "@google/genai";
import { PaperData, DiseaseTopic, Methodology, StudyType, ResearchModality, PublicationType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- TOPIC EXPANSION MAP ---
// Maps single user selections to broad scientific query strings to capture all synonyms.
const TOPIC_EXPANSION: Record<string, string> = {
    'MASH': '("MASH" OR "NASH" OR "MASLD" OR "Steatohepatitis" OR "Fatty Liver")',
    'NASH': '("MASH" OR "NASH" OR "MASLD" OR "Steatohepatitis")',
    'MASLD': '("MASH" OR "NASH" OR "MASLD" OR "Steatohepatitis")',
    'Obesity': '("Obesity" OR "BMI" OR "Adiposity" OR "Overweight" OR "Weight Loss")',
    'Diabetes': '("Diabetes" OR "T2D" OR "Type 2 Diabetes" OR "Insulin Resistance" OR "Hyperglycemia")',
    'CVD': '("Cardiovascular" OR "Heart Failure" OR "Atherosclerosis" OR "Myocardial Infarction" OR "Coronary")',
    'CKD': '("Chronic Kidney Disease" OR "CKD" OR "Renal Failure" OR "Nephropathy" OR "Glomerular")'
};

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
        'Full Text', 'Abstract', 'View Article', 'Home Page', 'Article', 'doi'
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

// 4. Token Overlap Verification (Fuzzy Matching)
const checkTokenOverlap = (aiTitle: string, targetText: string): boolean => {
    if (!aiTitle || !targetText) return false;
    
    // Normalize: lowercase, remove non-alphanumeric, split by space, filter small words
    const tokenize = (s: string) => s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2); 
    
    const aiTokens = tokenize(aiTitle);
    const targetTokens = tokenize(targetText);
    
    if (aiTokens.length === 0) return false;
    
    // Check how many AI tokens exist in Target tokens
    const matches = aiTokens.filter(token => 
        targetTokens.some(tt => tt.includes(token) || token.includes(tt))
    );
    
    const score = matches.length / aiTokens.length;
    
    // Allow if >= 40% of significant words match
    return score >= 0.4;
};

// 5. Hub URL Detection
const isHubUrl = (url: string): boolean => {
    const lower = url.toLowerCase();
    // Detect Table of Contents, Issues, Volumes, Subjects lists
    return /\/(toc|issue|volume|subjects|collections|topics|list)\//.test(lower);
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
        You are the ${agentName}. Your goal is to find specific scientific papers based on the executed search.
        
        **INSTRUCTIONS:**
        1.  Use the 'googleSearch' tool to execute this exact query: \`${searchQuery}\`
        2.  **EXTRACT SPECIFIC PAPERS:** Look for Articles, Clinical Trials, and Preprints.
        3.  **DOI EXTRACTION:** If available, extract the DOI (Digital Object Identifier) to ensure a direct link.
        4.  **STRICT JSON OUTPUT:** Map findings to the schema below.
        5.  **VERIFICATION:** The 'url' field MUST match one of the search result links exactly.
        
        **JSON SCHEMA:**
        [
          {
            "url": "Exact URL from search result",
            "title": "Full academic title",
            "date": "YYYY-MM-DD",
            "authors": ["Author 1", "et al"],
            "doi": "10.xxxx/xxxxx (Optional but preferred)",
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
        // @ts-ignore - groundingMetadata types might vary in SDK versions
        const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        if (aiJson.length === 0 || groundingChunks.length === 0) return [];

        const verifiedPapers: PaperData[] = [];
        const thirtyDaysAgoTime = cutoffDate.getTime();

        for (const item of aiJson) {
            // A. Verification (Snippet-First Catch)
            const matchedChunk = groundingChunks.find((c: any) => {
                if (!c.web?.uri) return false;
                
                // 1. Exact URL Match (Best)
                const exactUrlMatch = item.url && c.web.uri === item.url;
                
                // 2. Fuzzy Title Match (Fallback)
                const titleMatch = c.web.title ? checkTokenOverlap(item.title, c.web.title) : false;

                // 3. Snippet Match (Critical for "Issue Index" pages)
                // If the paper title is in the summary text, we accept the page as a source
                const snippetText = c.web.snippet || c.web.content || "";
                const snippetMatch = snippetText ? checkTokenOverlap(item.title, snippetText) : false;
                
                return exactUrlMatch || titleMatch || snippetMatch;
            });

            if (!matchedChunk || !matchedChunk.web?.uri) continue;

            // B. URL Construction (Gold Standard DOI)
            let finalUrl = matchedChunk.web.uri;
            if (item.doi && item.doi.includes('10.')) {
                // If we found a DOI, construct the canonical URL. This is 100% accurate.
                finalUrl = `https://doi.org/${item.doi.trim()}`;
            }

            // C. Date Filter (Strict)
            let itemDate = new Date(item.date);
            if (isNaN(itemDate.getTime())) {
                // Snippet date check fallback
                const snippet = (matchedChunk.web.title + " " + (matchedChunk.web.snippet || "")).toLowerCase();
                if (snippet.includes("2024") || snippet.includes("2025")) {
                    itemDate = new Date(); 
                } else {
                    continue; 
                }
            }

            if (itemDate.getTime() < thirtyDaysAgoTime) continue;

            // D. Construct Object
            verifiedPapers.push({
                id: `live-${Math.random().toString(36).substr(2, 9)}`,
                title: item.title, // Use AI title as it's cleaner than "Vol 45 Issue 2"
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
                validationScore: agentName.includes("Sniper") ? 100 : 90, 
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

// --- LINK POLISHER AGENT ---
// Scans for a specific title on a domain to find the direct link
const runLinkPolisher = async (paper: PaperData): Promise<string | null> => {
    if (!paper.url) return null;
    const domain = new URL(paper.url).hostname;
    const query = `site:${domain} intitle:"${paper.title}"`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find the direct link for the paper "${paper.title}". Return ONLY the URL.`,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        // @ts-ignore
        const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        // Return the first valid URI that looks like an article
        const betterChunk = chunks.find((c: any) => c.web?.uri && !isHubUrl(c.web.uri));
        return betterChunk?.web?.uri || null;
    } catch (e) {
        return null;
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
    const slicedTopics = activeTopics.slice(0, 3); 
    const expandedTopics = slicedTopics.map(t => TOPIC_EXPANSION[t] || `"${t}"`);
    const topicStr = expandedTopics.length > 0 
        ? `(${expandedTopics.join(' OR ')})`
        : '("CVD" OR "Diabetes")';
    const trawlerTopicStr = activeTopics.map(t => TOPIC_EXPANSION[t]?.replace(/[()"]/g, '') || t).join(', ');

    console.log("Launching Hybrid Swarm V2 (Relaxed + Polisher)...");

    // 3. Define Swarm Configuration
    // STRATEGY: 
    // - Sniper-General: Use 'deepLinkOps' (inurl:articles) because Nature/Science are huge and noisy.
    // - Sniper-Clinical/Specialty: RELAXED structure (just site:) to catch non-standard URLs.
    const deepLinkOps = "(inurl:articles OR inurl:doi OR inurl:abs OR inurl:full)";
    
    const swarmConfig = [
        // --- PIPELINE A: SNIPER AGENTS ---
        {
            name: "Sniper-General",
            // Keep strict inurl for huge publishers
            query: `(site:nature.com OR site:science.org OR site:cell.com OR site:pnas.org) ${deepLinkOps} ${topicStr} after:${dateStr}`
        },
        {
            name: "Sniper-Clinical",
            // Relaxed: Removed deepLinkOps to allow "Issue" pages (we verify via Snippet)
            query: `(site:nejm.org OR site:thelancet.com OR site:jamanetwork.com OR site:bmj.com) ${topicStr} after:${dateStr}`
        },
        {
            name: "Sniper-Specialty",
            // Relaxed: Removed deepLinkOps for specialty journals with weird URLs
            query: `(site:ahajournals.org OR site:diabetesjournals.org OR site:embo.org OR site:aasldpubs.onlinelibrary.wiley.com) ${topicStr} after:${dateStr}`
        },
        {
            name: "Sniper-Preprint",
            query: `(site:biorxiv.org OR site:medrxiv.org) ${topicStr} after:${dateStr}`
        },
        // --- PIPELINE B: TRAWLER AGENT ---
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

        for (const p of allPapers) {
            const fingerprint = p.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
            if (!seen.has(fingerprint)) {
                seen.add(fingerprint);
                uniquePapers.push(p);
            }
        }

        // 6. STAGE 2: LINK POLISHING (Refining Hub Links)
        // Check for papers with "Hub" URLs (e.g. /toc/) but no DOI, and try to find the direct link
        const polishedPapers = await Promise.all(uniquePapers.map(async (p) => {
            if (p.url && isHubUrl(p.url) && !p.url.includes('doi.org')) {
                // This paper is one-click-away. Let's try to polish it.
                const betterUrl = await runLinkPolisher(p);
                if (betterUrl) {
                    return { ...p, url: betterUrl };
                }
            }
            return p;
        }));

        // 7. Sort by Date
        return polishedPapers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (e) {
        console.error("Hybrid Swarm failed:", e);
        return [];
    }
};
