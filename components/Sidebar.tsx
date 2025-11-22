import React from 'react';
import { DiseaseTopic, PublicationType, StudyType, ResearchModality, Methodology } from '../types';
import { Filter, ChevronDown, CalendarRange, FlaskConical, Calendar, Microscope } from 'lucide-react';

interface SidebarProps {
  activeTopics: DiseaseTopic[];
  toggleTopic: (topic: DiseaseTopic) => void;
  activeStudyTypes: StudyType[];
  toggleStudyType: (type: StudyType) => void;
  activeMethodologies: Methodology[];
  toggleMethodology: (methodology: Methodology) => void;
  showPreprintsOnly: boolean;
  togglePreprints: () => void;
  only2025: boolean;
  toggle2025: () => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTopics, 
  toggleTopic, 
  activeStudyTypes,
  toggleStudyType,
  activeMethodologies,
  toggleMethodology,
  showPreprintsOnly, 
  togglePreprints,
  only2025,
  toggle2025,
  dateRange,
  setDateRange
}) => {
  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6 mb-6 lg:mb-0">
      
      {/* Date Filter */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
         <div className="flex items-center gap-2 mb-3 text-slate-300 font-semibold">
          <CalendarRange className="w-4 h-4" />
          <span>Time Range</span>
        </div>
        
        <label className="flex items-center justify-between cursor-pointer group p-2 rounded bg-slate-900/50 border border-slate-700/50 mb-4">
            <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">Since Jan 1, 2025</span>
                <span className="text-[10px] text-slate-500">Strict 2025+ Filter</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${only2025 ? 'bg-teal-500' : 'bg-slate-700'}`} onClick={toggle2025}>
                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${only2025 ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
        </label>

        <div className="space-y-3 pt-2 border-t border-slate-700/50">
           <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Calendar className="w-3 h-3" /> Custom Range
           </div>
           <div className="space-y-2">
             <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">From</label>
                <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 outline-none transition-colors"
                />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">To</label>
                <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 outline-none transition-colors"
                />
             </div>
             {(dateRange.start || dateRange.end) && (
                <button 
                    onClick={() => setDateRange({start: '', end: ''})}
                    className="text-[10px] text-red-400 hover:text-red-300 underline w-full text-right"
                >
                    Clear Dates
                </button>
             )}
           </div>
        </div>
      </div>

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

      {/* Study Types Panel */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4 text-slate-300 font-semibold">
          <FlaskConical className="w-4 h-4" />
          <span>Study Design</span>
        </div>
        <div className="space-y-2">
          {Object.values(StudyType).map((type) => (
            <label key={type} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="peer h-4 w-4 appearance-none rounded border border-slate-600 bg-slate-900 checked:bg-purple-500 checked:border-purple-500 transition-colors"
                  checked={activeStudyTypes.includes(type)}
                  onChange={() => toggleStudyType(type)}
                />
                <CheckIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Methodology Panel */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4 text-slate-300 font-semibold">
          <Microscope className="w-4 h-4" />
          <span>Methodology</span>
        </div>
        <div className="space-y-2">
          {Object.values(Methodology).map((methodology) => (
            <label key={methodology} className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="peer h-4 w-4 appearance-none rounded border border-slate-600 bg-slate-900 checked:bg-pink-500 checked:border-pink-500 transition-colors"
                  checked={activeMethodologies.includes(methodology)}
                  onChange={() => toggleMethodology(methodology)}
                />
                <CheckIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{methodology}</span>
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
        </div>
      </div>
      
      <div className="bg-gradient-to-b from-indigo-900/20 to-slate-900 border border-indigo-500/30 rounded-xl p-4">
         <h4 className="text-indigo-300 font-bold text-sm mb-2">Pro Insight</h4>
         <p className="text-xs text-indigo-200/70 mb-3">
            Trending: Single Cell Transcriptomics in NASH is up 240% this quarter.
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
