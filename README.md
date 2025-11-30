# BioInsight.AI

<div align="center">
  <img src="./public/logo.svg" alt="BioInsight Logo" width="120" height="120" />
  <br/>
  <h1>BioInsight.AI</h1>
  <h3>The Live Scientific Intelligence Platform</h3>
  <p>
    <em>Powered by Google Gemini 2.5 Flash & Swarm Intelligence</em>
  </p>
</div>

---

## 🚀 Overview

**BioInsight.AI** is a next-generation scientific intelligence aggregator designed to bridge the gap between static archives and real-time discovery. Unlike traditional search engines, it functions as an **Intelligent RSS Reader**, using a swarm of AI agents to actively scan high-impact journals and preprint servers for the latest breakthroughs in **Cardiovascular Disease, Metabolic Disorders, and AI-driven Biology**.

It features a dual-mode architecture:
1.  **Archive Mode**: A curated, validated library of landmark clinical trials and papers (2010–Present).
2.  **Live Intelligence Feed**: A real-time, multi-agent system that aggregates, verifies, and classifies research from the last 30 days.

## 🧠 Core Architecture: Hub & Spoke Swarm (v2.1)

BioInsight.AI utilizes a **Hybrid Swarm Architecture** optimized for high-recall performance and resilience against API rate limits.

### 1. The Hub & Spoke Model
To bypass query length limits while ensuring coverage of 1000+ specialty journals (e.g., *JASN*, *JACC*, *Hepatology*), we target "Publisher Hubs":
*   **Swarm A: The Publisher Hubs (High Precision)**: Scans the "Big 4" (Nature, Science, NEJM, Lancet) PLUS major aggregator hubs: **Elsevier (ScienceDirect), Oxford Academic, Springer, and Wiley**.
*   **Swarm B: The Dragnet (High Recall)**: Scans **PubMed** and Preprint servers (BioRxiv/MedRxiv) to catch anything missed by the main hubs.

### 2. "Cache-First, Ask-Later" Strategy
*   **Smart Caching**: Every search result is hashed and stored locally with a 15-minute Time-To-Live (TTL).
*   **Benefit**: This prevents accidental quota burn and provides instant load times for repeat visits.

### 3. Streaming Response Engine
*   **Generator Pattern**: The UI does not wait for the entire scan to finish. 
*   **Instant Feedback**: Papers are yielded to the dashboard as soon as the first agent returns, reducing perceived latency to <2 seconds.

### 4. On-Demand Enrichment (Lazy Loading)
*   **Link Polishing**: To save resources, the system finds the generic URL first (e.g., PubMed Abstract).
*   **User Action**: If a user finds a PubMed link, a **pulsing yellow button** appears. Clicking "Find Publisher Source" triggers a specialized agent to hunt for the specific PDF/Full-Text link.

## ✨ Key Features

*   **⚡ Live Intelligence Feed**: Real-time aggregation of scientific literature with sub-second analysis.
*   **🛡️ Verified Sources**: Strict domain filtering ensures data comes only from trusted academic publishers.
*   **🤖 Smart Tagging**: Auto-detection of "AI/ML" methods, "Clinical Trials", and "Preprints".
*   **⏱️ 60s Cooldown**: Built-in rate limiting protection to ensure API stability.
*   **🔖 Bookmarks & Ratings**: Local-first persistence allows users to save papers and rate relevance (`localStorage` backed).
*   **📊 Visual Analytics**: Real-time charts showing the distribution of topics and trends in the current feed.

## 🛠️ Tech Stack

*   **Frontend**: React 19 (RC), TypeScript, Vite
*   **AI & Logic**: 
    *   **Google GenAI SDK**: `@google/genai`
    *   **Model**: `gemini-2.5-flash` (Optimized for low-latency reasoning)
    *   **Tooling**: Google Search Grounding (`googleSearch`)
*   **UI/UX**: Tailwind CSS, Lucide React, Recharts
*   **State**: React Hooks + LocalStorage Persistence + Generator Functions

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/bioinsight-ai.git
    cd bioinsight-ai
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    Create a `.env` file in the root directory. You must use a paid Google Cloud Project key for Search Grounding access.
    ```bash
    API_KEY=AIzaSy...
    ```

4.  **Run Development Server**
    ```bash
    npm start
    ```

## ⚠️ Disclaimer

**Research Use Only.** BioInsight.AI aggregates and analyzes public scientific data using Generative AI. While we use strict search grounding to verify sources, all findings should be independently verified against the original publication. This tool is not for clinical decision-making.

---
*Developed by Vivek Das • Built with Google Gemini*