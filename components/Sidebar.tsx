import React from 'react';
import { DiseaseTopic, StudyType, Methodology } from '../types';
import { Filter, ChevronDown, CalendarRange, FlaskConical, Microscope, Clock, Check } from 'lucide-react';

interface SidebarProps {
  activeTopics: DiseaseTopic[];
  toggleTopic: (topic: DiseaseTopic) => void;
  activeStudyTypes: StudyType[];
  toggleStudyType: (type: StudyType) => void;
  activeMethodologies: Methodology[];
  toggleMethodology: (methodology: Methodology) => void;
  eraFilter: 'all' | '5years' | '1year';
  setEraFilter: (era: 'all' | '5years' | '1year') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTopics, 
  toggleTopic, 
  activeStudyTypes,
  toggleStudyType,
  activeMethodologies,
  toggleMethodology,
  eraFilter,
  setEraFilter
}) => {
  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-6 mb-6 lg:mb-0">
      
      {/* Era Filter - Simplified for Tracker */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
         <div className="flex items-center gap-2 mb-3 text-slate-300 font-semibold">
          <Clock className="w-4 h-4" />
          <span>Timeline</span>
        </div>
        
        <div className="space-y-1">
            <button 
                onClick={() => setEraFilter('all')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${eraFilter === 'all' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
            >
                <span>Since 2010 (Archive)</span>
                {eraFilter === 'all' && <Check className="w-3 h-3" />}
            </button>
            <button 
                onClick={() => setEraFilter('5years')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${eraFilter === '5years' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
            >
                <span>Last 5 Years</span>
                {eraFilter === '5years' && <Check className="w-3 h-3" />}
            </button>
            <button 
                onClick={() => setEraFilter('1year')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${eraFilter === '1year' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
            >
                <span>Since Jan 2024</span>
                {eraFilter === '1year' && <Check className="w-3 h-3" />}
            </button>
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
      
      <div className="bg-gradient-to-b from-indigo-900/20 to-slate-900 border border-indigo-500/30 rounded-xl p-4">
         <h4 className="text-indigo-300 font-bold text-sm mb-2">Pro Insight</h4>
         <p className="text-xs text-indigo-200/70 mb-3">
            Trend Alert: "In-vivo Imaging" combined with "AI/ML" has seen a 40% uptick in BioRxiv this month.
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