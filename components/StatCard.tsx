import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, colorClass = "text-blue-400" }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 backdrop-blur-sm hover:border-slate-600 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg bg-slate-900 group-hover:scale-110 transition-transform duration-300 ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <h3 className="text-2xl font-bold text-slate-100 font-mono">{value}</h3>
        {trend && <span className="text-xs text-green-400 mb-1">{trend}</span>}
      </div>
    </div>
  );
};
