import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PaperCard } from './components/PaperCard';
import { StatCard } from './components/StatCard';
import { TrackerStack } from './components/TrackerStack';
import { AboutModal } from './components/AboutModal';
import { PaperData, DiseaseTopic, StudyType, Methodology, PublicationType } from './types';
import { INITIAL_PAPERS, APP_NAME, APP_VERSION } from './constants';
import { fetchLiteratureAnalysis } from './services/geminiService';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Cell } from 'recharts';
import { RefreshCw, BookOpen, Activity, FlaskConical, Database, History, Radio, Sparkles, FileText, ArrowDownUp, FilterX, Bookmark, ServerCog } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  // Archive Data (Static Landmark Papers)
  const [archivePapers] = useState<PaperData[]>(INITIAL_PAPERS);
  
  // Live Data (Fetched from API)
  const [livePapers, setLivePapers] = useState<PaperData[]>([]);

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
  const [activeTab, setActiveTab] = useState<'archive' | 'live' | 'bookmarks'>('archive');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>("");
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(true); // Changed to true for auto-open
  const [sortBy, setSortBy] = useState<'date' | 'relevance'>('date');

  // Filters
  const [activeTopics, setActiveTopics] = useState<DiseaseTopic[]>(Object.values(DiseaseTopic));
  const [activeStudyTypes, setActiveStudyTypes] = useState<StudyType[]>(Object.values(StudyType));
  const [activeMethodologies, setActiveMethodologies] = useState<Methodology[]>(Object.values(Methodology));
  const [eraFilter, setEraFilter] = useState<'all' | '5years' | '1year'>('all');

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    localStorage.setItem('bioinsight_bookmarks', JSON.stringify(savedPapers));
  }, [savedPapers]);

  useEffect(() => {
    localStorage.setItem('bioinsight_ratings', JSON.stringify(userRatings));
  }, [userRatings]);

  // --- FILTERING LOGIC ---
  const currentPapers = activeTab === 'archive' ? archivePapers : 
                        activeTab === 'live' ? livePapers : 
                        savedPapers;

  const filteredPapers = useMemo(() => {
    const filtered = currentPapers.filter(paper => {
      // 1. Topic Match (Always Active)
      // We respect user topic selection even in live mode to keep the feed relevant.
      const topicMatch = activeTopics.includes(paper.topic);
      
      // 2. Study Type Match (Bypassed in Live Mode)
      // In Live Mode, we show ALL study types returned by the agents (RSS-like).
      // The Sidebar inputs are visually disabled to indicate this.
      const studyTypeMatch = activeTab === 'live' ? true : activeStudyTypes.includes(paper.studyType);
      
      // 3. Methodology Match (Bypassed in Live Mode)
      const methodologyMatch = activeTab === 'live' ? true : activeMethodologies.includes(paper.methodology);
      
      // 4. Date/Era Logic
      // If activeTab is 'live' or 'bookmarks', we IGNORE the eraFilter.
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
        // Boost papers rated 'up' by the user
        const aRating = userRatings[a.id] === 'up' ? 1 : (userRatings[a.id] === 'down' ? -1 : 0);
        const bRating = userRatings[b.id] === 'up' ? 1 : (userRatings[b.id] === 'down' ? -1 : 0);
        
        if (aRating !== bRating) {
            return bRating - aRating; // Higher rating first
        }

        if (sortBy === 'date') {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else {
            // Sort by Score, then Date
            return (b.validationScore - a.validationScore) || (new Date(b.date).getTime() - new Date(a.date).getTime());
        }
    });
  }, [currentPapers, activeTopics, activeStudyTypes, activeMethodologies, eraFilter, activeTab, sortBy, userRatings]);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    return {
        total: filteredPapers.length,
        trials: filteredPapers.filter(p => p.studyType.includes('Trial')).length,
        aiMl: filteredPapers.filter(p => p.methodology.includes('AI/ML')).length,
        preprints: filteredPapers.filter(p => p.publicationType === PublicationType.Preprint).length,
        // Update: Group Reviews and Meta-Analyses with Peer Reviewed for stats
        peerReviewed: filteredPapers.filter(p => 
            p.publicationType === PublicationType.PeerReviewed || 
            p.publicationType === PublicationType.ReviewArticle ||
            p.publicationType === PublicationType.MetaAnalysis
        ).length,
    };
  }, [filteredPapers]);

  // Chart Data
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
        // Check by ID or fallback to Title+Author for robust matching across live re-fetches
        const exists = prev.some(p => p.id === paper.id || (p.title === paper.title && p.authors?.[0] === paper.authors?.[0]));
        if (exists) {
            // Remove
            return prev.filter(p => !(p.id === paper.id || (p.title === paper.title && p.authors?.[0] === paper.authors?.[0])));
        } else {
            // Add (ensure we save a clean copy)
            return [paper, ...prev];
        }
    });
  };

  const handleRatePaper = (paperId: string, rating: 'up' | 'down') => {
    setUserRatings(prev => {
        // Toggle off if clicking the same rating
        if (prev[paperId] === rating) {
            const copy = { ...prev };
            delete copy[paperId];
            return copy;
        }
        return { ...prev, [paperId]: rating };
    });
  };

  const handleLiveRefresh = async () => {
    setIsLoading(true);
    setActiveTab('live'); 
    setScanStatus("Initializing parallel agents...");

    // INTELLIGENCE TRACKER LOGIC:
    // We only pass activeTopics. The service will scan for these topics without methodology constraints
    // to function as a true "RSS" reader.
    const searchTopics = activeTopics;

    setTimeout(() => setScanStatus("Scanning BioRxiv & MedRxiv..."), 800);
    setTimeout(() => setScanStatus("Scanning Major Journals (Nature, NEJM)..."), 2000);

    // Call the updated service
    const newPapers = await fetchLiteratureAnalysis(searchTopics);
    
    setScanStatus("Synthesizing results...");

    if (newPapers.length > 0) {
        setLivePapers(prev => {
            // Deduplicate against existing live papers logic in App
            const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Only filter out papers that ALREADY exist in the feed
            const completelyNew = newPapers.filter(np => {
                const npFingerprint = normalize(np.title);
                const isAlreadyListed = prev.some(op => normalize(op.title) === npFingerprint);
                return !isAlreadyListed;
            });
            
            return [...completelyNew, ...prev];
        });
        setLastLiveUpdate(new Date());
    }
    setScanStatus("");
    setIsLoading(false);
  };

  const toggleTopic = (topic: DiseaseTopic) => {
    setActiveTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };
  const toggleStudyType = (type: StudyType) => {
    setActiveStudyTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };
  const toggleMethodology = (methodology: Methodology) => {
    setActiveMethodologies(prev => prev.includes(methodology) ? prev.filter(m => m !== methodology) : [...prev, methodology]);
  };

  const handleResetFilters = () => {
    setActiveTopics(Object.values(DiseaseTopic));
    setActiveStudyTypes(Object.values(StudyType));
    setActiveMethodologies(Object.values(Methodology));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      <Header onOpenAbout={() => setIsAboutOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
            <StatCard 
                label="Active Papers" 
                value={stats.total} 
                icon={<Database className="w-5 h-5 text-blue-400" />}
                trend={activeTab === 'live' ? "Live View" : activeTab === 'bookmarks' ? "Saved" : "Archive"}
            />
            <StatCard 
                label="Peer Reviewed" 
                value={stats.peerReviewed} 
                icon={<BookOpen className="w-5 h-5 text-green-400" />}
                colorClass="text-green-400"
            />
            <StatCard 
                label="Preprints" 
                value={stats.preprints} 
                icon={<FileText className="w-5 h-5 text-amber-400" />}
                colorClass="text-amber-400"
            />
            <StatCard 
                label="Clinical Trials" 
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
                 <TrackerStack daily={activeTab === 'live' ? stats.total : 0} weekly={stats.total * 3} monthly={stats.total * 12} />
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
            isLiveMode={activeTab === 'live'}
          />

          {/* Main Feed Area */}
          <div className="flex-1 min-w-0">
             
             {/* Feed Tabs & Header */}
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                
                {/* Custom Tabs */}
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button 
                        onClick={() => setActiveTab('archive')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'archive' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <History className="w-4 h-4" />
                        Archive
                    </button>
                    <button 
                        onClick={() => setActiveTab('live')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'live' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                        Live Feed
                    </button>
                    <button 
                        onClick={() => setActiveTab('bookmarks')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bookmarks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Bookmark className="w-4 h-4" />
                        Bookmarks
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-900/30 text-[10px]">{savedPapers.length}</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Sort Dropdown */}
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
                    <button 
                        onClick={handleLiveRefresh}
                        disabled={isLoading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
                    >
                        {isLoading ? (
                            <ServerCog className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        )}
                        {isLoading ? scanStatus || 'Scanning...' : (activeTab === 'live' ? 'Fetch Latest' : 'Switch to Live')}
                    </button>
                </div>
             </div>

             {/* Chart Area - Only show if we have data */}
             {filteredPapers.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">
                        {activeTab === 'archive' ? 'Historical Topic Distribution' : activeTab === 'bookmarks' ? 'Saved Papers Distribution' : 'Live Trend Distribution'}
                    </h3>
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topicData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{fill: 'transparent'}}
                                />
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

             {/* Papers List */}
             <div className="space-y-1">
                {/* Initial Live State */}
                {activeTab === 'live' && livePapers.length === 0 && !isLoading && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                        <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-200">Live Intelligence Standby</h3>
                        <p className="text-slate-400 mt-2 max-w-sm mx-auto mb-4">
                            System is ready to scan parallel channels (Preprints & Journals) for recent papers based on your selected topics.
                        </p>
                        <button 
                            onClick={handleLiveRefresh}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
                        >
                            <Sparkles className="w-4 h-4" /> Start Multi-Channel Scan
                        </button>
                    </div>
                )}

                {/* Empty Bookmarks State */}
                {activeTab === 'bookmarks' && savedPapers.length === 0 ? (
                     <div className="text-center py-12 border border-slate-700 rounded-xl bg-slate-800/50">
                        <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-slate-300 font-bold">No Bookmarks Yet</h4>
                        <p className="text-xs text-slate-500 mt-1 mb-4">
                           Save papers from the Archive or Live Feed to access them here.
                        </p>
                        <button 
                            onClick={() => setActiveTab('archive')}
                            className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded text-xs font-semibold transition-colors"
                        >
                            Browse Archive
                        </button>
                     </div>
                ) : 
                
                /* Empty Filter State (Loaded but filtered to 0) */
                filteredPapers.length === 0 && (activeTab !== 'live' || livePapers.length > 0) ? (
                     <div className="text-center py-12 border border-slate-700 rounded-xl bg-slate-800/50">
                        <FilterX className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                        <h4 className="text-slate-300 font-bold">No Results Found</h4>
                        <p className="text-xs text-slate-500 mt-1 mb-4">
                           Your current filters are too strict. The feed is empty.
                        </p>
                        
                        <div className="bg-slate-900/50 inline-block p-4 rounded-lg border border-slate-700 text-left space-y-2 max-w-md">
                            <p className="text-xs font-bold text-slate-400 uppercase">How to improve search:</p>
                            <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                                {activeTopics.length < 3 && <li>Select more <strong>Disease Topics</strong> in the sidebar.</li>}
                                {activeTab === 'archive' && <li>Switch <strong>Timeline</strong> to "Since 2010" (Archive only).</li>}
                            </ul>
                            <button 
                                onClick={handleResetFilters}
                                className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded text-xs font-semibold transition-colors"
                            >
                                Reset All Filters
                            </button>
                        </div>
                     </div>
                ) : (
                    filteredPapers.map(paper => (
                        <PaperCard 
                            key={paper.id} 
                            paper={paper} 
                            isBookmarked={savedPapers.some(p => p.id === paper.id || (p.title === paper.title && p.authors?.[0] === paper.authors?.[0]))}
                            onToggleBookmark={() => handleToggleBookmark(paper)}
                            userRating={userRatings[paper.id]}
                            onRate={(rating) => handleRatePaper(paper.id, rating)}
                        />
                    ))
                )}
             </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm mb-2">
                {APP_NAME} v{APP_VERSION} • Developed by <span className="text-blue-400 font-semibold">Vivek Das</span>
            </p>
            <div className="inline-block px-4 py-2 bg-slate-800/50 rounded border border-slate-700">
                <p className="text-[10px] text-slate-500 max-w-xl mx-auto leading-relaxed">
                    <strong>DUAL MODE SYSTEM:</strong> <br/>
                    1. <strong>Archive:</strong> Curated list of verified landmark papers (2010-Present).<br/>
                    2. <strong>Live Feed:</strong> Multi-Channel Swarm Intelligence scanning major journals and preprints for the last 30 days.
                </p>
            </div>
        </div>
      </footer>
      
      {/* Modals */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
};

export default App;
