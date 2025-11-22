import React from 'react';
import { Zap, Activity } from 'lucide-react';
import { APP_NAME } from '../constants';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300 tracking-tight">
              {APP_NAME}
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-wide">INTELLIGENCE FEED</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-xs text-slate-300 font-medium">System Operational</span>
           </div>
           <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
             <Zap className="w-5 h-5" />
           </button>
        </div>
      </div>
    </header>
  );
};
