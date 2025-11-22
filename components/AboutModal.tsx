import React from 'react';
import { X, Cpu, Globe, Zap, Database, Info } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
            About BioInsight.AI
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Mission */}
          <section>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Mission
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              BioInsight.AI is a next-generation scientific intelligence platform designed to bridge the gap between static archives and real-time discovery. 
              We track breakthrough research in CVD, metabolic diseases, and AI-driven biology, providing researchers with instant access to validated data.
            </p>
          </section>

          {/* Technology Grid */}
          <section>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-fuchsia-400" /> Technology Stack
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-teal-400 text-xs font-bold mb-1">Google Gemini 2.5 Flash</div>
                <p className="text-slate-500 text-xs">High-speed reasoning engine for analyzing complex medical abstracts.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-indigo-400 text-xs font-bold mb-1">Search Grounding</div>
                <p className="text-slate-500 text-xs">Real-time connection to Google Search to fetch papers from the last 30 days.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="text-blue-400 text-xs font-bold mb-1">React 19 & Tailwind</div>
                <p className="text-slate-500 text-xs">Modern, responsive UI with concurrent rendering features.</p>
              </div>
            </div>
          </section>

          {/* How Live Feed Works */}
          <section className="bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-700">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> How Live Intelligence Works
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-400">
              <li>
                <span className="text-slate-300 font-medium">Query Generation:</span> The system constructs a complex search query targeting specific disease topics and date ranges (Last 30 Days).
              </li>
              <li>
                <span className="text-slate-300 font-medium">Grounding Check:</span> Gemini executes the search against Google's live index to find authentic URLs and titles.
              </li>
              <li>
                <span className="text-slate-300 font-medium">Structured Parsing:</span> The AI synthesizes the raw search results into a structured JSON format, extracting authors, journals, and key findings.
              </li>
              <li>
                <span className="text-slate-300 font-medium">Verification:</span> Results are compared against existing entries to ensure a clean, duplicate-free feed.
              </li>
            </ol>
          </section>

          {/* Disclaimer */}
           <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
             <p className="text-[10px] text-amber-500/80 text-center flex items-center justify-center gap-2">
               <Info className="w-3 h-3" /> BioInsight.AI is a research tool. Always verify findings with original source publications.
             </p>
           </div>

        </div>
      </div>
    </div>
  );
};