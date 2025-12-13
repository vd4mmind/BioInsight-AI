import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PaperCard } from './components/PaperCard';
import { StatCard } from './components/StatCard';
import { TrackerStack } from './components/TrackerStack';
import { AboutModal } from './components/AboutModal';
import { PaperData, DiseaseTopic, StudyType, Methodology, PublicationType } from './types';
import { INITIAL_PAPERS, APP_NAME, APP_VERSION } from './constants';
import { fetchLiteratureAnalysisStream, fetchAiAnalysisStream, fetchPatentStream } from './services/geminiService';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Cell } from 'recharts';
import { RefreshCw, BookOpen, Activity, FlaskConical, Database, History, Radio, Sparkles, FileText, ArrowDownUp, FilterX, Bookmark, ServerCog, Timer, BrainCircuit, Scale } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  // Archive Data
  const [archivePapers] = useState<PaperData[]>(INITIAL_PAPERS);
  
  // Live Data (Streams)
  const [livePapers, setLivePapers] = useState<PaperData[]>([]);
  const [aiPapers, setAiPapers] = useState<PaperData[]>([]);
  const [patentPapers, setPatentPapers] = useState<PaperData[]>([]);

  // Bookmarked Data (Persisted)
  const [savedPapers, setSavedPapers] = useState<PaperData[]>(() => {
    try {
      const saved = localStorage.getItem('bioinsight_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load bookmarks", e);
      return [];
    }
  });

  // User Ratings (Persisted)
  const [userRatings, setUserRatings] = useState<Record<string, 'up' | 'down'>>(() => {
    try {
      const saved = localStorage.getItem('bioinsight_ratings');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load ratings", e);
      return {};
    }
  });
  
  // UI State
  const [activeTab, setActiveTab] = useState<'archive' | 'live' | 'ai' | 'patents' | 'bookmarks'>('archive');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'date' | 'relevance'>('date');
  const [cooldown, setCooldown] = useState<number>(0);

  // Filters
  const [activeTopics, setActiveTopics] = useState<DiseaseTopic[]>(Object.values(DiseaseTopic));
  const [activeStudyTypes, setActiveStudyTypes] = useState<StudyType[]>(Object.values(StudyType));
  const [activeMethodologies, setActiveMethodologies] = useState<Methodology[]>(Object.values(Methodology));
  const [eraFilter, setEraFilter] = useState<'all' | '5years' | '1year'>('all');

  // Cooldown Timer
  useEffect(() => {
    if (cooldown > 0) {
        const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('bioinsight_bookmarks', JSON.stringify(savedPapers));
  }, [savedPapers]);

  useEffect(() => {
    localStorage.setItem('bioinsight_ratings', JSON.stringify(userRatings));
  }, [userRatings]);

  // --- FILTERING LOGIC ---
  const currentPapers = useMemo(() => {
    switch(activeTab) {
        case 'live': return livePapers;
        case 'ai': return aiPapers;
        case 'patents': return patentPapers;
        case 'bookmarks': return savedPapers;
        default: return archivePapers;
    }
  }, [activeTab, livePapers, aiPapers, patentPapers, savedPapers, archivePapers]);

  const filteredPapers = useMemo(() => {
    const filtered = currentPapers.filter(paper => {
      // 1. Topic Match
      const topicMatch = activeTopics.includes(paper.topic);
      
      // 2. Study Type Match (Bypassed in Streams)
      const isStream = ['live', 'ai', 'patents'].includes(activeTab);
      const studyTypeMatch = isStream ? true : activeStudyTypes.includes(paper.studyType);
      
      // 3. Methodology Match (Bypassed in Streams)
      const methodologyMatch = isStream ? true : activeMethodologies.includes(paper.methodology);
      
      // 4. Date/Era Logic (Archive Only)
      let dateMatch = true;
      if (activeTab === 'archive') {
          const paperYear = new Date(paper.date).getFullYear();
          const currentYear = new Date().getFullYear();
          if (eraFilter === '5years') dateMatch = paperYear >= (currentYear - 5);
          if (eraFilter === '1year') dateMatch = paperYear >= 2024;
      }

      return topicMatch && studyTypeMatch && methodologyMatch && dateMatch;
    });

    // Sort Logic
    return filtered.sort((a, b) => {
        const aRating = userRatings[a.id] === 'up' ? 1 : (userRatings[a.id] === 'down' ? -1 : 0);
        const bRating = userRatings[b.id] === 'up' ? 1 : (userRatings[b.id] === 'down' ? -1 : 0);
        if (aRating !== bRating) return bRating - aRating;
        if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
        return (b.validationScore - a.validationScore) || (new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }, [currentPapers, activeTopics, activeStudyTypes, activeMethodologies, eraFilter, activeTab, sortBy, userRatings]);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    // Stats are global across tabs or specific? Let's make them reflect the CURRENT view
    return {
        total: filteredPapers.length,
        trials: filteredPapers.filter(p => p.studyType.includes('Trial')).length,
        aiMl: filteredPapers.filter(p => p.methodology.includes('AI/ML')).length,
        preprints: filteredPapers.filter(p => p.publicationType === PublicationType.Preprint).length,
        peerReviewed: filteredPapers.filter(p => 
            p.publicationType === PublicationType.PeerReviewed || 
            p.publicationType === PublicationType.ReviewArticle ||
            p.publicationType === PublicationType.MetaAnalysis
        ).length,
    };
  }, [filteredPapers]);

  const topicData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(DiseaseTopic).forEach(t => counts[t] = 0);
    filteredPapers.forEach(p => {
        if (counts[p.topic] !== undefined) counts[p.topic]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(i => i.value > 0);
  }, [filteredPapers]);
  
  const COLORS = ['#60A5FA', '#34D399', '#818CF8', '#F472B6', '#FBBF24', '#A78BFA', '#F87171'];

  // --- HANDLERS ---
  const handleToggleBookmark = (paper: PaperData) => {
    setSavedPapers(prev => {
        const exists = prev.some(p => p.id === paper.id || (p.title === paper.title && p.authors?.[0] === paper.authors?.[0]));
        if (exists) return prev.filter(p => !(p.id === paper.id || (p.title === paper.title && p.authors?.[0] === paper.authors?.[0])));
        return [paper, ...prev];
    });
  };

  const handleRatePaper = (paperId: string, rating: 'up' | 'down') => {
    setUserRatings(prev => {
        if (prev[paperId] === rating) {
            const copy = { ...prev };
            delete copy[paperId];
            return copy;
        }
        return { ...prev, [paperId]: rating };
    });
  };

  // --- STREAM ORCHESTRATOR ---
  const handleFetchStream = async (targetTab: 'live' | 'ai' | 'patents') => {
    if (cooldown > 0) return;
    setIsLoading(true);
    setScanStatus("Initializing Specialist Agents...");
    
    // Switch to the tab immediately
    setActiveTab(targetTab); 
    
    // Clear data for fresh fetch? Or Append? 
    // We clear for simplicity in this version.
    if (targetTab === 'live') setLivePapers([]);
    if (targetTab === 'ai') setAiPapers([]);
    if (targetTab === 'patents') setPatentPapers([]);

    const searchTopics = activeTopics;
    
    try {
        let stream;
        if (targetTab === 'live') stream = fetchLiteratureAnalysisStream(searchTopics);
        else if (targetTab === 'ai') stream = fetchAiAnalysisStream(searchTopics);
        else if (targetTab === 'patents') stream = fetchPatentStream(searchTopics);

        if (!stream) return;

        let totalFetched = 0;
        
        for await (const batch of stream) {
            const batchSize = batch.length;
            totalFetched += batchSize;
            setScanStatus(`Processing ${totalFetched} new items...`);
            
            const updater = targetTab === 'live' ? setLivePapers : (targetTab === 'ai' ? setAiPapers : setPatentPapers);
            
            updater(prev => {
                const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
                const completelyNew = batch.filter(np => {
                    const npFingerprint = normalize(np.title);
                    const isAlreadyListed = prev.some(op => normalize(op.title) === npFingerprint);
                    return !isAlreadyListed;
                });
                return [...prev, ...completelyNew];
            });
        }
        
        setCooldown(60); 
    } catch (e) {
        console.error("Stream error", e);
        setScanStatus("Error during scan.");
    } finally {
        setScanStatus("");
        setIsLoading(false);
    }
  };

  const handleTabClick = (tab: 'live' | 'ai' | 'patents') => {
      setActiveTab(tab);
      // Auto-trigger if empty
      const data = tab === 'live' ? livePapers : (tab === 'ai' ? aiPapers : patentPapers);
      if (data.length === 0 && !isLoading) {
          handleFetchStream(tab);
      }
  };

  // Helpers
  const toggleTopic = (topic: DiseaseTopic) => setActiveTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  const toggleStudyType = (type: StudyType) => setActiveStudyTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  const toggleMethodology = (methodology: Methodology) => setActiveMethodologies(prev => prev.includes(methodology) ? prev.filter(m => m !== methodology) : [...prev, methodology]);
  const handleResetFilters = () => { setActiveTopics(Object.values(DiseaseTopic)); setActiveStudyTypes(Object.values(StudyType)); setActiveMethodologies(Object.values(Methodology)); };

  const isStreamMode = ['live', 'ai', 'patents'].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      <Header onOpenAbout={() => setIsAboutOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
            <StatCard 
                label="Active Items" 
                value={stats.total} 
                icon={<Database className="w-5 h-5 text-blue-400" />}
                trend={activeTab.toUpperCase()}
            />
            <StatCard 
                label={activeTab === 'patents' ? "Grants" : "Peer Reviewed"} 
                value={stats.peerReviewed} 
                icon={activeTab === 'patents' ? <Scale className="w-5 h-5 text-green-400"/> : <BookOpen className="w-5 h-5 text-green-400" />}
                colorClass="text-green-400"
            />
            <StatCard 
                label={activeTab === 'patents' ? "Applications" : "Preprints"}
                value={stats.preprints} 
                icon={<FileText className="w-5 h-5 text-amber-400" />}
                colorClass="text-amber-400"
            />
            <StatCard 
                label={activeTab === 'ai' ? "Cohorts" : "Clinical Trials"} 
                value={stats.trials} 
                icon={<Activity className="w-5 h-5 text-teal-400" />}
                colorClass="text-teal-400"
            />
            <StatCard 
                label="AI/ML Methods" 
                value={stats.aiMl} 
                icon={<FlaskConical className="w-5 h-5 text-fuchsia-400" />}
                colorClass="text-fuchsia-400"
            />
             <div className="hidden xl:block col-span-3">
                 <TrackerStack daily={isStreamMode ? stats.total : 0} weekly={stats.total * 3} monthly={stats.total * 12} />
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <Sidebar 
            activeTopics={activeTopics} 
            toggleTopic={toggleTopic}
            activeStudyTypes={activeStudyTypes}
            toggleStudyType={toggleStudyType}
            activeMethodologies={activeMethodologies}
            toggleMethodology={toggleMethodology}
            eraFilter={eraFilter}
            setEraFilter={setEraFilter}
            isLiveMode={isStreamMode}
          />

          {/* Main Feed Area */}
          <div className="flex-1 min-w-0">
             
             {/* Feed Tabs */}
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div className="flex flex-wrap bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button onClick={() => setActiveTab('archive')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'archive' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                        <History className="w-3.5 h-3.5" /> Archive
                    </button>
                    <button onClick={() => handleTabClick('live')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'live' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                        <Radio className="w-3.5 h-3.5" /> Live Feed
                    </button>
                    <button onClick={() => handleTabClick('ai')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'ai' ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                        <BrainCircuit className="w-3.5 h-3.5" /> AI/ML Nexus
                    </button>
                    <button onClick={() => handleTabClick('patents')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'patents' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                        <Scale className="w-3.5 h-3.5" /> Patents
                    </button>
                    <button onClick={() => setActiveTab('bookmarks')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'bookmarks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                        <Bookmark className="w-3.5 h-3.5" /> Saved
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 gap-2">
                        <ArrowDownUp className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium mr-1">Sort:</span>
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'date' | 'relevance')}
                            className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer appearance-none pr-4"
                            style={{ backgroundImage: 'none' }}
                        >
                            <option value="date">Latest Date</option>
                            <option value="relevance">Impact Score</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    {isStreamMode && (
                        <button 
                            onClick={() => handleFetchStream(activeTab as any)}
                            disabled={isLoading || cooldown > 0}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium transition-all ${isLoading || cooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 hover:bg-slate-700 text-slate-300'}`}
                        >
                            {isLoading ? <ServerCog className="w-3.5 h-3.5 animate-pulse" /> : <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
                            {isLoading ? scanStatus : cooldown > 0 ? `Cooldown (${cooldown}s)` : 'Fetch Latest'}
                        </button>
                    )}
                </div>
             </div>

             {/* Chart Area */}
             {filteredPapers.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topicData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {topicData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
             )}

             {/* Content List */}
             <div className="space-y-1">
                {/* Empty State for Streams */}
                {isStreamMode && currentPapers.length === 0 && !isLoading && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                        {activeTab === 'ai' ? <BrainCircuit className="w-12 h-12 text-fuchsia-500 mx-auto mb-3" /> : 
                         activeTab === 'patents' ? <Scale className="w-12 h-12 text-amber-500 mx-auto mb-3" /> :
                         <Radio className="w-12 h-12 text-blue-500 mx-auto mb-3" />}
                        <h3 className="text-lg font-bold text-slate-200">
                            {activeTab === 'ai' ? 'AI/ML Clinical Nexus' : activeTab === 'patents' ? 'Patent Intelligence' : 'Live Feed'}
                        </h3>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto mb-4">
                            {activeTab === 'ai' ? 'Scan for recent AI-driven clinical cohorts and imaging studies. (Wet-lab excluded)' :
                             activeTab === 'patents' ? 'Search for recent IP filings in CVD & Obesity.' :
                             'System ready to scan parallel channels.'}
                        </p>
                        <button 
                            onClick={() => handleFetchStream(activeTab as any)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg"
                        >
                            Start Scan
                        </button>
                    </div>
                )}

                {/* Filtered Empty State */}
                {currentPapers.length > 0 && filteredPapers.length === 0 && (
                     <div className="text-center py-12 border border-slate-700 rounded-xl bg-slate-800/50">
                        <FilterX className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                        <h4 className="text-slate-300 font-bold">No Results Found</h4>
                        <button onClick={handleResetFilters} className="mt-3 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-xs">Reset Filters</button>
                     </div>
                )}

                {filteredPapers.map(paper => (
                    <PaperCard 
                        key={paper.id} 
                        paper={paper} 
                        isBookmarked={savedPapers.some(p => p.id === paper.id)}
                        onToggleBookmark={() => handleToggleBookmark(paper)}
                        userRating={userRatings[paper.id]}
                        onRate={(rating) => handleRatePaper(paper.id, rating)}
                    />
                ))}
             </div>

          </div>
        </div>
      </main>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
};

export default App;