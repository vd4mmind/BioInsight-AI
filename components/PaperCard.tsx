import React, { useState } from 'react';
import { PaperData, PublicationType, Methodology, ResearchModality, DiseaseTopic } from '../types';
import { FileText, CheckCircle2, FlaskConical, BrainCircuit, Layers, ShieldCheck, ShieldAlert, ExternalLink, ChevronDown, ChevronUp, Building2, Wallet, Tags, Dna, Link2, Check, Radio, Sparkles, Bookmark, ThumbsUp, ThumbsDown, Biohazard, Newspaper, Microscope, BookOpen, Scale, Search, FileSearch } from 'lucide-react';
import { runLinkPolisher } from '../services/geminiService';

interface PaperCardProps {
  paper: PaperData;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  userRating?: 'up' | 'down';
  onRate: (rating: 'up' | 'down') => void;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, isBookmarked, onToggleBookmark, userRating, onRate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Link Polishing State
  const [isPolishing, setIsPolishing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(paper.url);
  const [linkPolished, setLinkPolished] = useState(paper.isPolished || false);
  
  const isPreprint = paper.publicationType === PublicationType.Preprint;
  const isNews = paper.publicationType === PublicationType.News;
  const isPatent = paper.publicationType === PublicationType.Patent;
  const isLive = paper.isLive;
  
  const getValidationColor = (score: number) => {
    if (score >= 90) return 'text-green-400 border-green-400/30 bg-green-400/10';
    if (score >= 75) return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
    return 'text-red-400 border-red-400/30 bg-red-400/10';
  };

  const getModalityConfig = (modality: ResearchModality) => {
    switch (modality) {
      case ResearchModality.InVitro:
        return { icon: FlaskConical, colorClass: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20', iconColor: 'text-cyan-400' };
      case ResearchModality.InVivo:
        return { icon: Biohazard, colorClass: 'text-rose-300 bg-rose-500/10 border-rose-500/20', iconColor: 'text-rose-400' };
      case ResearchModality.Imaging:
        return { icon: Layers, colorClass: 'text-amber-300 bg-amber-500/10 border-amber-500/20', iconColor: 'text-amber-400' };
      default:
        return { icon: Dna, colorClass: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20', iconColor: 'text-indigo-400' };
    }
  };

  // Helper to visually distinguish specific MASH subtypes based on title
  const getDisplayTopic = () => {
      if (paper.topic === DiseaseTopic.MASH) {
          const t = paper.title.toUpperCase();
          if (t.includes('NASH') || t.includes('NONALCOHOLIC')) return 'NASH';
          if (t.includes('MASLD')) return 'MASLD';
          if (t.includes('MASH') || t.includes('METABOLIC')) return 'MASH';
          return 'MASH / NASH';
      }
      return paper.topic;
  };

  const { icon: ModalityIcon, colorClass: modalityClass, iconColor: modalityIconColor } = getModalityConfig(paper.modality);
  const displayTopic = getDisplayTopic();

  const handleCopyLink = async () => {
    if (currentUrl) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  const handleImproveLink = async () => {
      setIsPolishing(true);
      const betterUrl = await runLinkPolisher(paper);
      if (betterUrl) {
          setCurrentUrl(betterUrl);
          setLinkPolished(true);
      }
      setIsPolishing(false);
  };

  // Styling based on Type
  const getTypeStyles = () => {
      if (isPreprint) return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      if (isNews) return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
      if (isPatent) return 'text-amber-300 border-amber-500/30 bg-amber-500/10'; // Gold/Amber for Patents
      if (paper.methodology === Methodology.AIML) return 'text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10'; // Special for AI
      return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10';
  };

  // Container Classes
  let containerClasses = `bg-slate-800 border-l-4 border-y border-r rounded-r-xl p-5 mb-4 transition-all duration-300 shadow-lg shadow-black/20 group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10`;
  
  if (userRating === 'up') containerClasses += ` border-l-green-500 border-slate-700 shadow-green-900/10`;
  else if (userRating === 'down') containerClasses += ` border-l-slate-600 border-slate-700 opacity-60 hover:opacity-100 grayscale-[0.5] hover:grayscale-0`;
  else if (isPatent) containerClasses += ` border-l-amber-500 border-slate-700`;
  else if (paper.methodology === Methodology.AIML) containerClasses += ` border-l-fuchsia-500 border-slate-700`;
  else if (isLive) containerClasses += ` border-l-blue-500 border-slate-700 shadow-blue-900/10`;
  else containerClasses += ` border-l-slate-600 border-slate-700`;

  return (
    <div className={containerClasses}>
        
        {/* Live Badge */}
        {isLive && (
            <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-lg z-10 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
            </div>
        )}

        <div className={`absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-colors ${userRating === 'up' ? 'bg-green-500/10' : isPatent ? 'bg-amber-500/10' : paper.methodology === Methodology.AIML ? 'bg-fuchsia-500/10' : 'bg-slate-500/5 group-hover:bg-slate-500/10'}`}></div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
        <div className="flex-1 space-y-3 w-full min-w-0">
            {/* Header Row: Type & Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-1 pr-20">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${getTypeStyles()}`}>
                    {isPatent ? <Scale className="w-3 h-3"/> : isNews ? <Newspaper className="w-3 h-3" /> : paper.methodology === Methodology.AIML ? <BrainCircuit className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {paper.publicationType}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border text-slate-300 border-slate-600 bg-slate-700/50">
                    {displayTopic}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border text-purple-300 border-purple-500/30 bg-purple-500/10">
                    {paper.studyType}
                </span>
            </div>

            {/* Title */}
            {currentUrl ? (
                 <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="block text-lg font-bold text-slate-100 leading-snug hover:text-blue-400 transition-colors cursor-pointer decoration-blue-400/20 hover:decoration-blue-400 underline-offset-4 line-clamp-2">
                    {paper.title} <ExternalLink className="inline w-3.5 h-3.5 ml-1 opacity-50 mb-1" />
                 </a>
            ) : (
                <h3 className="text-lg font-bold text-slate-100 leading-snug group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-2">
                    {paper.title}
                </h3>
            )}

            {/* Meta Info */}
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                <span className="flex items-center gap-1">
                    {isPatent ? <Building2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {paper.journalOrConference}
                </span>
                <span className="text-slate-600">|</span>
                <span>{paper.date}</span>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-1.5" title="Authors/Assignee">
                    {/* If Patent, authors array holds Assignee */}
                    <span className="italic truncate max-w-[150px] sm:max-w-[250px]">
                        {isPatent ? `Assignee: ${paper.authors.join(', ')}` : paper.authors.join(', ')}
                    </span>
                </div>
            </div>

            {/* The "Intelligence" Section */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 mt-3 space-y-2">
                <div className="flex items-start gap-2">
                    <BrainCircuit className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-200"><span className="font-semibold text-pink-400">Highlight:</span> {paper.abstractHighlight}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                     <div className="flex items-center gap-2 text-xs">
                        <Microscope className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-slate-400">Target:</span>
                        <span className="text-teal-300 font-mono">{paper.drugAndTarget}</span>
                     </div>
                     <div className="flex items-center gap-2 text-xs">
                        <ModalityIcon className={`w-3.5 h-3.5 ${modalityIconColor}`} />
                        <span className="text-slate-400">Modality:</span>
                        <span className={`${modalityClass} px-1.5 py-0.5 rounded border`}>{paper.modality}</span>
                     </div>
                </div>
            </div>

            {/* Expandable Details Section */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paper.affiliations && paper.affiliations.length > 0 && (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase">
                                    <Building2 className="w-3.5 h-3.5" /> {isPatent ? 'Inventors/Affiliations' : 'Affiliations'}
                                </div>
                                <ul className="text-xs text-slate-300 space-y-0.5 pl-5 list-disc marker:text-slate-600">
                                    {paper.affiliations.map((aff, idx) => <li key={idx}>{aff}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1 w-full justify-center md:justify-start">
                {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show Less</> : <><ChevronDown className="w-3 h-3" /> View Details</>}
            </button>
        </div>

        {/* Side Stats */}
        <div className="flex flex-row md:flex-col gap-3 md:w-32 shrink-0 items-center md:items-end border-t md:border-t-0 border-slate-700/50 pt-3 md:pt-0 w-full md:h-full justify-between md:justify-start">
            <div className="flex md:flex-col items-center gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBookmark(); }}
                    className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'}`}
                >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
                <div className="flex md:flex-col gap-1 md:gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onRate('up'); }} className={`p-2 rounded-lg transition-colors ${userRating === 'up' ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-700 text-slate-400 hover:text-green-400'}`}><ThumbsUp className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onRate('down'); }} className={`p-2 rounded-lg transition-colors ${userRating === 'down' ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-700 text-slate-400 hover:text-red-400'}`}><ThumbsDown className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div className={`hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 ${getValidationColor(paper.validationScore)}`}>
                <span className="text-lg font-bold">{paper.validationScore}</span>
                <span className="text-[8px] uppercase font-bold">Score</span>
            </div>
            
            <div className="flex flex-col items-end gap-2 md:mt-auto">
                {currentUrl && (
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyLink} className="p-1 hover:text-green-400 text-slate-500 transition-colors" title="Copy Link">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                        </button>
                        {isLive && !linkPolished && !isPatent && (
                            <button onClick={handleImproveLink} disabled={isPolishing} className={`p-1 rounded text-slate-500 hover:text-yellow-400 transition-colors ${isPolishing ? 'animate-spin' : ''}`} title="Find Direct PDF">
                                <FileSearch className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <a href={currentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors text-blue-400 hover:text-blue-300 underline decoration-blue-400/30`}>
                            {isPatent ? 'View Patent' : 'Read Source'} <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};