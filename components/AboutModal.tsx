import React from 'react';
import { X, Cpu, Globe, Zap, Info, Search, BrainCircuit, ShieldCheck, Link2 } from 'lucide-react';

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
              We track breakthrough research in CVD, metabolic diseases, and AI-driven biology, providing researchers with instant access to verified data.
            </p>
          </section>

          {/* Technology Grid */}
          <section>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-fuchsia-400" /> Technology Stack: Hybrid Swarm
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <BrainCircuit className="w-3 h-3 text-teal-400" />
                    <div className="text-teal-400 text-xs font-bold">Sniper Agents</div>
                </div>
                <p className="text-slate-500 text-xs">Specialized agents that strictly target high-impact journals (Nature, NEJM) using 'site:' and 'after:' operators for maximum precision.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-3 h-3 text-indigo-400" />
                    <div className="text-indigo-400 text-xs font-bold">Trawler Agent</div>
                </div>
                <p className="text-slate-500 text-xs">A semantic search agent that casts a wide net using natural language to catch relevant papers from broader sources.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-3 h-3 text-green-400" />
                    <div className="text-green-400 text-xs font-bold">Strict Grounding</div>
                </div>
                <p className="text-slate-500 text-xs">Every result is verified against Google Search metadata. If the URL doesn't match the search hit, it's discarded.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <div className="text-yellow-400 text-xs font-bold">Post-Hoc Classification</div>
                </div>
                <p className="text-slate-500 text-xs">AI reads abstracts to tag methodologies (AI/ML) automatically, even if not present in the original query.</p>
              </div>
            </div>
          </section>

          {/* How Live Feed Works */}
          <section className="bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-700">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" /> How Live Intelligence Works
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-xs text-slate-400">
              <li>
                <span className="text-slate-300 font-bold">Hybrid Swarm Execution:</span> 
                <ul className="pl-5 mt-1 space-y-1 list-disc text-slate-500">
                   <li><span className="text-teal-400">Snipers:</span> Scan specific tiers (General, Clinical, Specialty, Preprints) for papers published in the last 30 days.</li>
                   <li><span className="text-indigo-400">Trawler:</span> Scans the broader web for semantic relevance.</li>
                </ul>
              </li>
              <li>
                <span className="text-slate-300 font-bold">Verification & Synthesis:</span> 
                The system merges results, removes duplicates (favoring Sniper hits), and enforces a strict 30-day verified date window.
              </li>
              <li>
                <span className="text-slate-300 font-bold">Auto-Classification:</span> 
                Found papers are automatically analyzed to identify study designs (RCTs) and methodologies (AI/ML) without user intervention.
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
