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

## 🧠 Core Architecture: Multi-Agent Swarm

BioInsight.AI utilizes a **Parallel Multi-Agent Swarm** architecture to ensure high-precision data retrieval without hallucinations.

### 1. The Swarm
Instead of a single search query, the system dispatches three specialized AI agents simultaneously:
*   **🕵️ Preprint Hunter**: Exclusively scans `biorxiv.org` and `medrxiv.org` for rapid, unreviewed scientific data.
*   **🦅 Journal Scout**: Monitors high-impact domains including *Nature, NEJM, The Lancet, Cell, and Science*.
*   **🌐 Broad Aggregator**: Scans trusted aggregators like PubMed and academic databases for broader coverage.

### 2. Strict Grounding (Zero Hallucination Policy)
The platform enforces a "Grounding-First" verification layer.
*   **Verification**: Every paper returned by an agent is cross-referenced with Google Search metadata.
*   **Source of Truth**: The application **discards** any result where the URL/Title cannot be cryptographically matched to a real-world search hit.
*   **Result**: 100% verified links. No broken URLs. No made-up titles.

### 3. Post-Hoc Classification
To ensure an "RSS-like" experience with high recall:
*   **Search Phase**: Agents search broadly based on **Disease Topics** (e.g., "CVD") and **Time** (Last 30 days).
*   **Analysis Phase**: The AI reads the abstract of every found paper to *automatically classify* it into Methodologies (e.g., "AI/ML") or Study Types (e.g., "Clinical Trial"), even if those keywords weren't in the original search query.

## ✨ Key Features

*   **⚡ Live Intelligence Feed**: Real-time aggregation of scientific literature with sub-second analysis.
*   **🛡️ Verified Sources**: Strict domain filtering ensures data comes only from trusted academic publishers.
*   **🤖 Smart Tagging**: Auto-detection of "AI/ML" methods, "Clinical Trials", and "Preprints".
*   **🔖 Bookmarks & Ratings**: Local-first persistence allows users to save papers and rate relevance (`localStorage` backed).
*   **📊 Visual Analytics**: Real-time charts showing the distribution of topics and trends in the current feed.
*   **⏳ Time Travel**: Filter by "Last 30 Days", "Since Jan 2024", or "5 Year History".

## 🛠️ Tech Stack

*   **Frontend**: React 19 (RC), TypeScript, Vite
*   **AI & Logic**: 
    *   **Google GenAI SDK**: `@google/genai`
    *   **Model**: `gemini-2.5-flash` (Optimized for low-latency reasoning)
    *   **Tooling**: Google Search Grounding (`googleSearch`)
*   **UI/UX**: Tailwind CSS, Lucide React, Recharts
*   **State**: React Hooks + LocalStorage Persistence

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