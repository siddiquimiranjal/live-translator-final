import React, { useState, useRef, useEffect } from 'react';
import { Language, LANGUAGES, VOICES } from '../types';
import { ChevronDown, ArrowRightLeft, AudioLines, Search, Check, X } from 'lucide-react';

interface LanguageSelectorProps {
  selected: Language;
  onChange: (l: Language) => void;
  disabled?: boolean;
  label?: string;
}

export const SimpleLanguageSelector: React.FC<LanguageSelectorProps> = ({
  selected,
  onChange,
  disabled,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-full transition-all duration-200 border border-transparent ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'
        } ${isOpen ? 'bg-slate-100' : ''}`}
      >
        <span className="text-lg sm:text-xl leading-none filter drop-shadow-sm">{selected.flag}</span>
        <div className="flex flex-col items-start">
            {label && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{label}</span>}
            <span className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap max-w-[60px] sm:max-w-[80px] truncate leading-none">{selected.name}</span>
        </div>
        <ChevronDown 
            size={14} 
            className={`text-slate-400 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Modal / Bottom Sheet Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          
          {/* Backdrop Click to Close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          {/* Modal Content */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 fade-in duration-200">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <h3 className="font-bold text-slate-800">Select Language</h3>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 bg-slate-50/50">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Search language (e.g. Hindi, Spanish)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-base bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800 shadow-sm"
                    />
                </div>
            </div>
            
            {/* Language List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              {filteredLanguages.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    {filteredLanguages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                onChange(lang);
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                            className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all ${
                                selected.code === lang.code 
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                                    : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-2xl shadow-sm rounded-full">{lang.flag}</span>
                                <span className="text-base font-medium">{lang.name}</span>
                            </div>
                            {selected.code === lang.code && (
                                <div className="bg-blue-100 p-1 rounded-full">
                                    <Check size={14} className="text-blue-600" strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    ))}
                  </div>
              ) : (
                  <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                      <Search size={32} className="mb-3 opacity-20" />
                      <p className="text-sm font-medium">No languages found for "{searchTerm}"</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const DualLanguageSelector: React.FC<{
    source: Language, 
    target: Language, 
    setSource: (l: Language) => void, 
    setTarget: (l: Language) => void,
    disabled: boolean
}> = ({ source, target, setSource, setTarget, disabled }) => {
    
    return (
        <div className="flex items-center gap-1 sm:gap-2">
             <SimpleLanguageSelector 
                selected={source} 
                onChange={setSource} 
                disabled={disabled} 
                // label="From"
            />
            <button 
                onClick={() => {
                    setSource(target);
                    setTarget(source);
                }}
                disabled={disabled}
                className="p-2 rounded-full hover:bg-gray-100 text-slate-400 hover:text-blue-600 transition-all active:scale-95 flex-shrink-0"
            >
                <ArrowRightLeft size={16} strokeWidth={2.5} />
            </button>
            <SimpleLanguageSelector 
                selected={target} 
                onChange={setTarget} 
                disabled={disabled} 
                // label="To"
            />
        </div>
    )
}

export const VoiceSelector: React.FC<{
  selected: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}> = ({ selected, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-full transition-all duration-200 border border-transparent ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'
        } ${isOpen ? 'bg-slate-100' : ''}`}
      >
        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-600'} transition-colors flex-shrink-0`}>
            <AudioLines size={14} />
        </div>
        <span className="hidden sm:block text-xs sm:text-sm font-medium text-slate-600 max-w-[60px] truncate">{selected}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
           <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
           
           <div className="relative w-full sm:max-w-xs bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <h3 className="font-bold text-slate-800">Select Voice</h3>
                    <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-slate-400 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-2 overflow-y-auto max-h-[50vh]">
                    {VOICES.map(voice => (
                        <button
                            key={voice}
                            onClick={() => {
                                onChange(voice);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors mb-1 ${
                                selected === voice 
                                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                                    : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="text-base font-medium">{voice}</span>
                            {selected === voice && (
                                <div className="bg-blue-100 p-1 rounded-full">
                                    <Check size={14} className="text-blue-600" strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
           </div>
        </div>
      )}
    </>
  );
};
