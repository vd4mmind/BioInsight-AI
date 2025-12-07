import React from 'react';
import { X, Cpu, Globe, Zap, Info, Search, BrainCircuit, Layers, Database, Filter } from 'lucide-react';

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
              We track breakthrough research in CVD, metabolic diseases, and AI-driven biology using an optimized, cache-backed AI swarm.
            </p>
          </section>

          {/* Technology Grid */}
          <section>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-fuchsia-400" /> Technology Stack: Streaming Swarm
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <BrainCircuit className="w-3 h-3 text-teal-400" />
                    <div className="text-teal-400 text-xs font-bold">Consolidated Swarms</div>
                </div>
                <p className="text-slate-500 text-xs">Replaced single-agent queries with 2 high-density swarms ("Hubs" & "Dragnet") to maximize coverage while minimizing API calls.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <Database className="w-3 h-3 text-indigo-400" />
                    <div className="text-indigo-400 text-xs font-bold">Smart Caching Layer</div>
                </div>
                <p className="text-slate-500 text-xs">Implements a "Cache-First" strategy (15-min TTL) to provide instant results for frequent queries and protect quota.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <Layers className="w-3 h-3 text-green-400" />
                    <div className="text-green-400 text-xs font-bold">Streaming Response</div>
                </div>
                <p className="text-slate-500 text-xs">Utilizes Generator functions to yield results progressively. You see the first papers in seconds while the deep scan continues.</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <Filter className="w-3 h-3 text-rose-400" />
                    <div className="text-rose-400 text-xs font-bold">Signal Denoising</div>
                </div>
                <p className="text-slate-500 text-xs">New "Structural Anchor" logic forces results to contain statistical markers (e.g., "p-value"), filtering out 90% of editorials in Obesity & Diabetes.</p>
              </div>
            </div>
          </section>

          {/* How Live Feed Works */}
          <section className="bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-700">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" /> Architecture 2.0 Flow
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-xs text-slate-400">
              <li>
                <span className="text-slate-300 font-bold">Check Cache:</span> 
                System checks for a recent valid scan (fingerprinted by topics) to load instantly.
              </li>
              <li>
                <span className="text-slate-300 font-bold">Parallel Swarm Execution:</span> 
                If fresh data is needed, we launch the <strong>Publisher Hub Swarm</strong> and <strong>Dragnet Swarm</strong> sequentially.
              </li>
              <li>
                <span className="text-slate-300 font-bold">Streaming & Verification:</span> 
                Results are grounded against Google Search metadata and streamed to the UI immediately upon verification.
              </li>
              <li>
                <span className="text-slate-300 font-bold">Lazy Enrichment:</span> 
                Users browse quickly. Heavy tasks (finding direct PDF links) are only executed when you explicitly request them.
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