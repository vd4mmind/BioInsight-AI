import React from 'react';
import { DiseaseTopic, PublicationType, StudyType, OmicsType, Methodology } from '../types';
import { Filter, ChevronDown } from 'lucide-react';

interface SidebarProps {
  activeTopics: DiseaseTopic[];
  toggleTopic: (topic: DiseaseTopic) => void;
  showPreprintsOnly: boolean;
  togglePreprints: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTopics, 
  toggleTopic, 
  showPreprintsOnly, 
  togglePreprints 
}) => {
  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6 mb-6 lg:mb-0">
      
      {/* Topics Panel */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4 text-slate-300 font-semibold">
          <Filter className="w-4 h-4" />
          <span>Disease Topics</span>
        </div>
        <div className="space-y-2">
          {Object.values(DiseaseTopic).map((topic) => (
            <label key={topic} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="peer h-4 w-4 appearance-none rounded border border-slate-600 bg-slate-900 checked:bg-blue-500 checked:border-blue-500 transition-colors"
                  checked={activeTopics.includes(topic)}
                  onChange={() => toggleTopic(topic)}
                />
                <CheckIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{topic}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4 text-slate-300 font-semibold cursor-pointer">
           <span>Source Type</span>
           <ChevronDown className="w-4 h-4" />
        </div>
        <div className="space-y-3">
             <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-slate-400 group-hover:text-slate-200">Preprints Only</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${showPreprintsOnly ? 'bg-blue-500' : 'bg-slate-700'}`} onClick={togglePreprints}>
                     <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showPreprintsOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
             </label>
             {/* Visual-only static filters for demo aesthetics */}
             <div className="pt-3 border-t border-slate-700/50 space-y-2 opacity-75">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Study Type</div>
                {[StudyType.ClinicalTrial, StudyType.PreClinical, StudyType.HumanCohort].map(t => (
                    <div key={t} className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 cursor-pointer">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> {t}
                    </div>
                ))}
             </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-b from-indigo-900/20 to-slate-900 border border-indigo-500/30 rounded-xl p-4">
         <h4 className="text-indigo-300 font-bold text-sm mb-2">Pro Insight</h4>
         <p className="text-xs text-indigo-200/70 mb-3">
            Trending: Multi-omics in NASH is up 240% this quarter.
         </p>
         <div className="h-1 w-full bg-indigo-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-3/4"></div>
         </div>
      </div>

    </aside>
  );
};

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
