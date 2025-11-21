import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Image as ImageIcon, 
  MessageSquare, 
  ChevronLeft, 
  Star, 
  Copy, 
  Volume2, 
  ArrowRight,
  MoreHorizontal,
  Sparkles
} from 'lucide-react';
import { LANGUAGES, Language, VOICES } from './types';
import { useLiveTranslator } from './hooks/useLiveTranslator';
import { ConnectionState } from './types';
import { DualLanguageSelector, VoiceSelector } from './components/LanguageSelector';
import { Visualizer } from './components/Visualizer';

// --- Sub-Components ---

const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6 md:p-8 relative overflow-hidden font-sans">
      
      {/* App Header */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex items-center justify-center md:justify-start">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center shadow-inner">
               <Sparkles size={20} className="text-blue-400 fill-blue-400/20" />
            </div>
            <span className="font-semibold text-lg tracking-wide text-white/90">Live Language Translator</span>
         </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full z-10 mt-16 md:mt-10">
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center leading-[1.1] mb-6 tracking-tight">
          Break Free<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">from Language</span><br />
          Barriers
        </h1>
        
        <p className="text-slate-400 text-center mb-12 md:mb-16 text-sm md:text-base leading-relaxed max-w-xs font-light px-4">
          Simplify language exchange with next-generation real-time AI translation.
        </p>

        {/* Circular Flags Visualization */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-8 md:mb-12 group">
           {/* Center decorative elements */}
           <div className="absolute inset-0 grid place-items-center pointer-events-none">
             <div className="col-start-1 row-start-1 w-28 h-28 sm:w-36 sm:h-36 bg-gradient-to-tr from-blue-600/30 to-purple-600/30 rounded-full blur-2xl animate-pulse"></div>
             <div className="col-start-1 row-start-1 w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center z-10 shadow-2xl relative">
                <Mic size={28} className="text-white opacity-80 sm:w-8 sm:h-8" />
             </div>
           </div>
           
           {/* Flags positioned in a circle */}
           {LANGUAGES.slice(0, 8).map((lang, index) => {
              const total = 8;
              const angle = (index / total) * 2 * Math.PI;
              const radius = 100; // px mobile
              // We'll use a dynamic radius based on screen size via CSS calc or just a safe approximation
              // For simplicity in TS, we use a smaller radius for mobile visually by scaling the container
              const visualRadius = window.innerWidth < 640 ? 95 : 120;
              const vx = Math.cos(angle) * visualRadius;
              const vy = Math.sin(angle) * visualRadius;

              return (
                <div 
                  key={lang.code}
                  className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-700 flex items-center justify-center text-xl sm:text-2xl shadow-xl transform transition-all duration-500 group-hover:scale-110 hover:!scale-125 hover:z-20 hover:border-blue-500/50"
                  style={{
                    left: `calc(50% + ${vx}px - ${window.innerWidth < 640 ? '1.5rem' : '1.75rem'})`,
                    top: `calc(50% + ${vy}px - ${window.innerWidth < 640 ? '1.5rem' : '1.75rem'})`,
                  }}
                >
                  {lang.flag}
                </div>
              );
           })}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="w-full flex items-center justify-center pb-12 z-10">
        <button 
          onClick={onStart}
          className="group w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]"
        >
          <ArrowRight size={28} strokeWidth={2} className="group-hover:translate-x-1 transition-transform sm:w-8 sm:h-8" />
        </button>
      </div>
    </div>
  );
};

const TranslatorPage: React.FC<{ 
  sourceLang: Language, 
  setSourceLang: (l: Language) => void,
  targetLang: Language, 
  setTargetLang: (l: Language) => void,
  onBack: () => void 
}> = ({ sourceLang, setSourceLang, targetLang, setTargetLang, onBack }) => {
  
  const [transcripts, setTranscripts] = useState<{id: string, text: string, isUser: boolean, lang: Language}[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>(VOICES[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // We use a ref to track connection intent because the hook manages the actual state
  const [isActive, setIsActive] = useState(false);

  const handleTranscript = (text: string, isUser: boolean) => {
    setTranscripts(prev => {
        const last = prev[prev.length - 1];
        // Update last message if it's the same speaker and recent
        if (last && last.isUser === isUser && (Date.now() - parseInt(last.id.split('-')[0] || '0')) < 5000) {
             return [...prev.slice(0, -1), { ...last, text: last.text + " " + text }];
        }
        return [...prev, { 
            id: `${Date.now()}-${Math.random()}`, 
            text, 
            isUser, 
            lang: isUser ? sourceLang : targetLang 
        }];
    });
  };

  const { connectionState, connect, disconnect, analysers } = useLiveTranslator({
    sourceLang,
    targetLang,
    voiceName: selectedVoice,
    onTranscript: handleTranscript
  });

  const toggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
      setIsActive(false);
    } else {
      connect();
      setIsActive(true);
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [transcripts.length, transcripts[transcripts.length-1]?.text]);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      
      {/* Header */}
      <header className="flex-none px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between bg-[#F8FAFC] z-20">
        <button onClick={onBack} className="p-2 sm:p-3 -ml-2 rounded-full bg-white hover:bg-gray-100 border border-transparent hover:border-gray-200 shadow-sm hover:shadow-md transition-all">
          <ChevronLeft size={20} className="text-slate-600 sm:w-[22px] sm:h-[22px]" />
        </button>
        <div className="flex items-center gap-2 opacity-80">
           <Sparkles size={14} className="text-blue-500 fill-blue-500/20" />
           <h2 className="text-xs sm:text-sm font-bold tracking-widest text-slate-500 uppercase">Live Language Translator</h2>
        </div>
        <button className="p-2 sm:p-3 -mr-2 rounded-full bg-white hover:bg-gray-100 border border-transparent hover:border-gray-200 shadow-sm hover:shadow-md transition-all">
          <Star size={18} className="text-slate-600 sm:w-5 sm:h-5" />
        </button>
      </header>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col relative w-full max-w-3xl mx-auto">

        {/* Top Section: Visualizer & Controls */}
        <div className="flex-none flex flex-col items-center justify-center pt-2 sm:pt-4 pb-4 sm:pb-6 z-10 transition-all duration-500">
             
             {/* Visualizer Container */}
             <div className="relative w-full h-20 sm:h-24 flex items-center justify-center mb-4 sm:mb-6">
                 {isActive && (
                     <div className="absolute w-24 h-24 sm:w-32 sm:h-32 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
                 )}
                 <div className="w-full max-w-[200px] sm:max-w-[240px]">
                    <Visualizer 
                        analyser={analysers.input || analysers.output} 
                        isActive={connectionState === ConnectionState.CONNECTED} 
                        color={isActive ? "#3b82f6" : "#94a3b8"}
                    />
                 </div>
             </div>

             {/* Unified Control Bar */}
             <div className="flex items-center gap-2 sm:gap-4 bg-white px-3 py-1.5 sm:py-2 rounded-full shadow-lg shadow-slate-200/60 border border-slate-100 transform transition-transform hover:scale-[1.01] max-w-[98vw]">
                  <DualLanguageSelector 
                      source={sourceLang} 
                      target={targetLang} 
                      setSource={setSourceLang} 
                      setTarget={setTargetLang} 
                      disabled={isActive}
                  />
                  <div className="w-px h-4 sm:h-6 bg-slate-100 flex-shrink-0" />
                  <VoiceSelector 
                      selected={selectedVoice}
                      onChange={setSelectedVoice}
                      disabled={isActive}
                  />
             </div>

             {/* Connection Status Indicator */}
             <div className="mt-3 sm:mt-4 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[10px] sm:text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {connectionState === ConnectionState.CONNECTED ? 'Live' : connectionState === ConnectionState.CONNECTING ? 'Connecting...' : 'Ready'}
                </span>
             </div>
        </div>

        {/* Transcript Area */}
        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 pb-32 sm:pb-40 space-y-4 sm:space-y-6 scrollbar-hide mask-image-gradient-b"
        >
            {transcripts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 sm:h-40 text-slate-300 mt-6 sm:mt-10">
                    <MessageSquare size={40} className="mb-4 opacity-20 sm:w-12 sm:h-12" />
                    <p className="text-center text-sm">Start speaking to translate</p>
                </div>
            )}
            
            {transcripts.map((t, i) => (
                <div 
                    key={t.id} 
                    className={`w-full max-w-xl mx-auto transform transition-all duration-500 ease-out ${
                        i === transcripts.length - 1 ? 'translate-y-0 opacity-100' : 'opacity-100'
                    }`}
                >
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 relative group">
                        
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl sm:text-2xl">{t.lang.flag}</span>
                                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${t.isUser ? 'text-slate-500' : 'text-blue-600'}`}>
                                    {t.lang.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1.5 sm:p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                    <Copy size={12} className="sm:w-[14px] sm:h-[14px]" />
                                </button>
                                <button className="p-1.5 sm:p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                    <Volume2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Text */}
                        <p className="text-[15px] sm:text-[17px] leading-relaxed text-slate-700 font-medium">
                            {t.text}
                        </p>

                        {/* Subtle corner decoration for visual hierarchy */}
                        <div className={`absolute top-5 sm:top-6 left-0 w-1 h-6 sm:h-8 rounded-r-full ${t.isUser ? 'bg-slate-200' : 'bg-blue-500'}`} />
                    </div>
                </div>
            ))}
        </div>

      </div>

      {/* Bottom Controls (Floating Island) */}
      <div className="fixed bottom-0 left-0 right-0 pb-6 sm:pb-8 pt-16 sm:pt-20 px-4 sm:px-8 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent pointer-events-none z-30 flex justify-center">
         <div className="pointer-events-auto flex items-center gap-4 sm:gap-8">
              {/* Secondary Button */}
              <button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-lg shadow-slate-200/50 border border-white text-slate-400 flex items-center justify-center hover:text-blue-600 hover:scale-110 transition-all duration-300">
                  <MessageSquare size={18} className="sm:w-5 sm:h-5" />
              </button>

              {/* Primary Mic Button */}
              <button 
                  onClick={toggleConnection}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-105 active:scale-95 ${
                      isActive 
                        ? 'bg-white text-red-500 shadow-red-500/20 ring-4 ring-red-50' 
                        : 'bg-slate-900 text-white shadow-slate-900/20 ring-4 ring-slate-100'
                  }`}
              >
                  {connectionState === ConnectionState.CONNECTING ? (
                       <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isActive ? (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-[2px]" />
                      </div>
                  ) : (
                      <Mic size={24} strokeWidth={2.5} className="sm:w-7 sm:h-7" />
                  )}
              </button>

              {/* Secondary Button */}
              <button className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-lg shadow-slate-200/50 border border-white text-slate-400 flex items-center justify-center hover:text-blue-600 hover:scale-110 transition-all duration-300">
                  <ImageIcon size={18} className="sm:w-5 sm:h-5" />
              </button>
         </div>
      </div>
      
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'translator'>('landing');
  const [sourceLang, setSourceLang] = useState<Language>(LANGUAGES[0]); // English
  const [targetLang, setTargetLang] = useState<Language>(LANGUAGES[1]); // Spanish

  return (
    <>
      {view === 'landing' ? (
        <LandingPage onStart={() => setView('translator')} />
      ) : (
        <TranslatorPage 
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            onBack={() => setView('landing')}
        />
      )}
    </>
  );
};

export default App;
