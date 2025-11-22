import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PaperCard } from './components/PaperCard';
import { StatCard } from './components/StatCard';
import { TrackerStack } from './components/TrackerStack';
import { PaperData, DiseaseTopic, StudyType, Methodology, PublicationType } from './types';
import { INITIAL_PAPERS, APP_NAME, APP_VERSION } from './constants';
import { fetchLiteratureAnalysis } from './services/geminiService';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, Cell } from 'recharts';
import { RefreshCw, BookOpen, Activity, FlaskConical, Database, History, Radio, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  // Archive Data (Static Landmark Papers)
  const [archivePapers] = useState<PaperData[]>(INITIAL_PAPERS);
  
  // Live Data (Fetched from API)
  const [livePapers, setLivePapers] = useState<PaperData[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'archive' | 'live'>('archive');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);

  // Filters
  const [activeTopics, setActiveTopics] = useState<DiseaseTopic[]>(Object.values(DiseaseTopic));
  const [activeStudyTypes, setActiveStudyTypes] = useState<StudyType[]>(Object.values(StudyType));
  const [activeMethodologies, setActiveMethodologies] = useState<Methodology[]>(Object.values(Methodology));
  const [eraFilter, setEraFilter] = useState<'all' | '5years' | '1year'>('all');

  // --- FILTERING LOGIC ---
  const currentPapers = activeTab === 'archive' ? archivePapers : livePapers;

  const filteredPapers = useMemo(() => {
    const filtered = currentPapers.filter(paper => {
      const topicMatch = activeTopics.includes(paper.topic);
      const studyTypeMatch = activeStudyTypes.includes(paper.studyType);
      const methodologyMatch = activeMethodologies.includes(paper.methodology);
      
      // Date/Era Logic (Only applies to Archive, Live is always "Now")
      let dateMatch = true;
      if (activeTab === 'archive') {
          const paperYear = new Date(paper.date).getFullYear();
          const currentYear = new Date().getFullYear();
          if (eraFilter === '5years') dateMatch = paperYear >= (currentYear - 5);
          if (eraFilter === '1year') dateMatch = paperYear >= 2024;
      }

      return topicMatch && studyTypeMatch && methodologyMatch && dateMatch;
    });

    // Sort: Newest First
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPapers, activeTopics, activeStudyTypes, activeMethodologies, eraFilter, activeTab]);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    return {
        total: filteredPapers.length,
        trials: filteredPapers.filter(p => p.studyType.includes('Trial')).length,
        aiMl: filteredPapers.filter(p => p.methodology.includes('AI/ML')).length,
        preprints: filteredPapers.filter(p => p.publicationType === PublicationType.Preprint).length,
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
  const handleLiveRefresh = async () => {
    setIsLoading(true);
    setActiveTab('live'); // Switch to live tab
    
    // Simulate "Checking sources..." delay for UX
    await new Promise(r => setTimeout(r, 800));

    const newPapers = await fetchLiteratureAnalysis([]);
    
    if (newPapers.length > 0) {
        setLivePapers(prev => {
            // Deduplicate based on title
            const newUnique = newPapers.filter(np => !prev.some(op => op.title === np.title));
            return [...newUnique, ...prev];
        });
        setLastLiveUpdate(new Date());
    }
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col font-sans selection:bg-blue-500/30">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
            <StatCard 
                label="Active Papers" 
                value={stats.total} 
                icon={<Database className="w-5 h-5 text-blue-400" />}
                trend={activeTab === 'live' ? "Live View" : "Archive"}
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
          />

          {/* Main Feed Area */}
          <div className="flex-1 min-w-0">
             
             {/* Feed Tabs & Header */}
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                
                {/* Custom Tabs */}
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button 
                        onClick={() => setActiveTab('archive')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'archive' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <History className="w-4 h-4" />
                        Key Papers (Since 2010)
                    </button>
                    <button 
                        onClick={() => setActiveTab('live')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'live' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                        Live Intelligence Feed
                    </button>
                </div>

                {/* Refresh Button (Context Aware) */}
                <button 
                    onClick={handleLiveRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 hover:border-blue-500 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
                >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    {activeTab === 'live' ? 'Fetch Latest Papers' : 'Switch to Live Search'}
                </button>
             </div>

             {/* Chart Area */}
             <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">
                    {activeTab === 'archive' ? 'Historical Topic Distribution' : 'Live Trend Distribution'}
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

             {/* Papers List */}
             <div className="space-y-1">
                {activeTab === 'live' && livePapers.length === 0 && !isLoading && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                        <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-300 font-medium">Ready to scan live sources.</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Click "Fetch Latest Papers" to trigger the AI agent to search Google, PubMed, and BioRxiv for papers published in the last 30 days.
                        </p>
                    </div>
                )}
                
                {filteredPapers.length === 0 && activeTab === 'archive' ? (
                     <div className="text-center py-20">
                        <p className="text-slate-400">No papers match the current era filter.</p>
                     </div>
                ) : (
                    filteredPapers.map(paper => (
                        <PaperCard key={paper.id} paper={paper} />
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
                    2. <strong>Live Feed:</strong> Real-time AI agent using Google Search Grounding to find papers from the last 30 days.
                </p>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;