import React from 'react';

interface TrackerStackProps {
  daily: number;
  weekly: number;
  monthly: number;
}

export const TrackerStack: React.FC<TrackerStackProps> = ({ daily, weekly, monthly }) => {
  // Calculate heights for visual representation (max height 24 units)
  // Simple normalization log scaleish
  const hD = Math.min(Math.max(daily * 2, 2), 12);
  const hW = Math.min(Math.max(weekly / 2, 4), 16);
  const hM = Math.min(Math.max(monthly / 5, 6), 24);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-4 h-full">
      <h3 className="text-sm font-semibold text-slate-300">Volume Tracker</h3>
      <div className="flex items-end justify-between gap-4 flex-1 h-32 px-2 pb-2 border-b border-slate-700/50">
        
        {/* Daily */}
        <div className="flex flex-col items-center gap-2 w-1/3 group cursor-pointer">
            <div className="relative w-full flex flex-col-reverse items-center gap-[1px]">
                 {Array.from({ length: hD }).map((_, i) => (
                    <div key={i} className={`w-full rounded-sm bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-300 group-hover:bg-blue-400 h-1.5`} 
                         style={{ opacity: 0.5 + (i/hD)*0.5 }}
                    />
                 ))}
            </div>
            <div className="text-center">
                <div className="text-xl font-bold text-white">{daily}</div>
                <div className="text-[10px] uppercase text-slate-500 font-bold">24H</div>
            </div>
        </div>

        {/* Weekly */}
        <div className="flex flex-col items-center gap-2 w-1/3 group cursor-pointer">
            <div className="relative w-full flex flex-col-reverse items-center gap-[1px]">
                 {Array.from({ length: hW }).map((_, i) => (
                    <div key={i} className={`w-full rounded-sm bg-teal-500/80 shadow-[0_0_8px_rgba(20,184,166,0.5)] transition-all duration-300 group-hover:bg-teal-400 h-1.5`} 
                         style={{ opacity: 0.5 + (i/hW)*0.5 }}
                    />
                 ))}
            </div>
            <div className="text-center">
                <div className="text-xl font-bold text-white">{weekly}</div>
                <div className="text-[10px] uppercase text-slate-500 font-bold">7D</div>
            </div>
        </div>

        {/* Monthly */}
        <div className="flex flex-col items-center gap-2 w-1/3 group cursor-pointer">
            <div className="relative w-full flex flex-col-reverse items-center gap-[1px]">
                 {Array.from({ length: hM }).map((_, i) => (
                    <div key={i} className={`w-full rounded-sm bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-300 group-hover:bg-indigo-400 h-1.5`} 
                         style={{ opacity: 0.5 + (i/hM)*0.5 }}
                    />
                 ))}
            </div>
            <div className="text-center">
                <div className="text-xl font-bold text-white">{monthly}</div>
                <div className="text-[10px] uppercase text-slate-500 font-bold">30D</div>
            </div>
        </div>

      </div>
    </div>
  );
};
