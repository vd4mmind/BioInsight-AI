# BioInsight.AI

<div align="center">
  <div style="background: linear-gradient(to bottom right, #3b82f6, #14b8a6); width: 80px; height: 80px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  </div>
  <br/>
  <h1>BioInsight.AI</h1>
  <h3>Live Scientific Intelligence Feed</h3>
</div>

## 🚀 Overview

**BioInsight.AI** is a next-generation scientific intelligence platform designed to bridge the gap between static archives and real-time discovery. It serves as a "Discovery Engine" for biomedical researchers, tracking breakthrough developments in **Cardiovascular Disease, CKD, Metabolic Disorders, and AI-driven Biology**.

The app features a dual-mode system:
1.  **Archive Mode**: A curated, validated database of landmark papers (2010–Present).
2.  **Live Intelligence Feed**: A real-time discovery feed powered by **Google Gemini 2.5 Flash** and **Google Search Grounding**, which scans the web (PubMed, BioRxiv, News) for high-impact research from the last 30 days.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS, Lucide React (Icons)
*   **Data Visualization**: Recharts
*   **AI Core**: 
    *   **Google Gemini 2.5 Flash**: Advanced reasoning for extracting structured clinical data from unstructured web results.
    *   **Google Search Grounding**: Real-time verification and data sourcing.

## ✨ Key Features

*   **Discovery Feed**: A "Google Discover"-style feed for scientists, highlighting trending preprints, FDA approvals, and controversial studies.
*   **Intersection Filtering**: Find papers specifically at the intersection of *Topic* (e.g., NASH) + *Methodology* (e.g., AI/ML).
*   **Smart Context Tags**: Auto-generated tags like "🔥 Trending on BioRxiv" or "⚡ First in Class" to explain *why* a paper matters.
*   **Visual Analytics**: Real-time charts showing the distribution of topics in the current feed.

## 👨‍💻 Developer

**Vivek Das**  

Passionate about building AI-augmented tools for scientific discovery and healthcare.

## ⚠️ Disclaimer

**Research Use Only.** BioInsight.AI aggregates and analyzes public scientific data using Generative AI. While we use search grounding to verify sources, all findings should be independently verified against the original publication. This tool is not for clinical decision-making.

## 🏃‍♂️ How to Run Locally

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/bioinsight-ai.git
    cd bioinsight-ai
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env` file in the root directory and add your Google Gemini API Key:
    ```bash
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Start the Application**
    ```bash
    npm start
    ```

---
*Built with ❤️ using Google Gemini API*