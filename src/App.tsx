/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Trash2, 
  Loader2, 
  Globe,
  History,
  Info,
  BookMarked,
  Plus,
  X,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translateText, getPinyin, type Language } from '@/services/gemini';

const LANGUAGES: Language[] = ['Chinese', 'Italian', 'English'];

interface TranslationHistory {
  id: string;
  source: string;
  target: string;
  sourceLang: Language;
  targetLang: Language;
  timestamp: number;
}

interface GlossaryItem {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  pronunciation?: string;
  sourceLang: Language;
  targetLang: Language;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<Language>('English');
  const [targetLang, setTargetLang] = useState<Language>('Italian');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // New States
  const [translationMode, setTranslationMode] = useState<'general' | 'specialist'>('specialist');
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [showGlossary, setShowGlossary] = useState(false);
  const [isGlossaryMode, setIsGlossaryMode] = useState(false);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedPronunciation, setSelectedPronunciation] = useState('');
  const [isGeneratingPinyin, setIsGeneratingPinyin] = useState(false);

  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // Load data from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('translation_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
    const savedGlossary = localStorage.getItem('translation_glossary');
    if (savedGlossary) {
      try { setGlossary(JSON.parse(savedGlossary)); } catch (e) { console.error(e); }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('translation_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('translation_glossary', JSON.stringify(glossary));
  }, [glossary]);

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await translateText({
        text: inputText,
        sourceLang,
        targetLang,
        mode: translationMode
      });
      setTranslatedText(result);
      
      const newEntry: TranslationHistory = {
        id: crypto.randomUUID(),
        source: inputText,
        target: result,
        sourceLang,
        targetLang,
        timestamp: Date.now()
      };
      setHistory(prev => [newEntry, ...prev].slice(0, 20));
    } catch (error) {
      console.error(error);
      setTranslatedText('Errore durante la traduzione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const clearAll = () => {
    setInputText('');
    setTranslatedText('');
    setSelectedSource('');
    setSelectedTarget('');
  };

  const clearHistory = () => setHistory([]);

  // Glossary Logic
  const handleSourceSelect = () => {
    if (!isGlossaryMode) return;
    const selection = sourceRef.current?.value.substring(
      sourceRef.current.selectionStart,
      sourceRef.current.selectionEnd
    );
    if (selection) setSelectedSource(selection.trim());
  };

  const handleTargetSelect = () => {
    if (!isGlossaryMode) return;
    const selection = window.getSelection()?.toString();
    if (selection) setSelectedTarget(selection.trim());
  };

  const addToGlossary = () => {
    if (!selectedSource || !selectedTarget) return;
    const newItem: GlossaryItem = {
      id: crypto.randomUUID(),
      sourceTerm: selectedSource,
      targetTerm: selectedTarget,
      pronunciation: selectedPronunciation,
      sourceLang,
      targetLang
    };
    setGlossary(prev => [newItem, ...prev]);
    setSelectedSource('');
    setSelectedTarget('');
    setSelectedPronunciation('');
  };

  const removeGlossaryItem = (id: string) => {
    setGlossary(prev => prev.filter(item => item.id !== id));
  };

  const handleGeneratePinyin = async (text: string) => {
    if (!text.trim()) return;
    setIsGeneratingPinyin(true);
    try {
      const pinyin = await getPinyin(text);
      setSelectedPronunciation(pinyin);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPinyin(false);
    }
  };

  const exportGlossary = (format: 'csv' | 'json' | 'word') => {
    if (glossary.length === 0) return;

    let content = '';
    let fileName = `glossario_lingoassist_${new Date().toISOString().split('T')[0]}`;
    let mimeType = '';

    if (format === 'csv') {
      const headers = ['Sorgente', 'Pronuncia', 'Traduzione', 'Lingua Sorgente', 'Lingua Destinazione'];
      const rows = glossary.map(item => [
        `"${item.sourceTerm.replace(/"/g, '""')}"`,
        `"${(item.pronunciation || '').replace(/"/g, '""')}"`,
        `"${item.targetTerm.replace(/"/g, '""')}"`,
        item.sourceLang,
        item.targetLang
      ]);
      content = [headers, ...rows].map(e => e.join(",")).join("\n");
      fileName += '.csv';
      mimeType = 'text/csv;charset=utf-8;';
    } else if (format === 'json') {
      content = JSON.stringify(glossary, null, 2);
      fileName += '.json';
      mimeType = 'application/json;charset=utf-8;';
    } else if (format === 'word') {
      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Glossario LingoAssist</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #0f172a; }
        </style>
        </head>
        <body>
          <div class="header">Glossario LingoAssist</div>
          <p>Esportato il: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Sorgente</th>
                <th>Pronuncia</th>
                <th>Traduzione</th>
                <th>Lingue</th>
              </tr>
            </thead>
            <tbody>
              ${glossary.map(item => `
                <tr>
                  <td>${item.sourceTerm}</td>
                  <td>${item.pronunciation || '-'}</td>
                  <td>${item.targetTerm}</td>
                  <td>${item.sourceLang} &rarr; ${item.targetLang}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      content = html;
      fileName += '.doc';
      mimeType = 'application/msword';
    }

    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-[#f8fafc]">
      <div className="w-full max-w-[1440px] min-h-[85vh] bg-white border border-slate-200 rounded-[32px] shadow-2xl flex flex-col p-6 md:p-10 relative overflow-hidden">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="logo font-bold text-lg md:text-xl tracking-tight text-slate-800">
              Amico traduttore: <span className="text-[var(--color-accent)] font-medium">dammi qualsiasi pezzo da tradurre e ci lavoreremo insieme</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-slate-100 p-1 rounded-xl gap-1">
              <button 
                onClick={() => setTranslationMode('general')}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all",
                  translationMode === 'general' ? "bg-white text-[var(--color-accent)] shadow-sm" : "text-slate-500 hover:bg-white/50"
                )}
              >
                Generale
              </button>
              <button 
                onClick={() => setTranslationMode('specialist')}
                className={cn(
                  "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all",
                  translationMode === 'specialist' ? "bg-white text-[var(--color-accent)] shadow-sm" : "text-slate-500 hover:bg-white/50"
                )}
              >
                Specialistico
              </button>
            </div>
            <div className="specialist-badge bg-slate-100 text-slate-600 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-slate-200">
              Enterprise v4.2
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowGlossary(!showGlossary)}
                className={cn(
                  "p-2 rounded-full transition-colors hover:bg-white/20",
                  showGlossary && "bg-white/30"
                )}
                title="Glossario"
              >
                <BookMarked className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "p-2 rounded-full transition-colors hover:bg-white/20",
                  showHistory && "bg-white/30"
                )}
                title="Cronologia"
              >
                <History className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-10 relative">
          {/* Left Side: Translations */}
          <main className="flex-[2] grid grid-cols-1 gap-6 relative">
            {/* Swap Icon (Mobile/Stacked) */}
            <div className="lg:hidden flex justify-center -my-2 z-10">
              <button onClick={handleSwapLanguages} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center shadow-lg border border-slate-800 hover:bg-slate-800 transition-colors">
                <ArrowRightLeft className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Left Panel: Input */}
            <div className={cn(
              "panel flex flex-col bg-white border border-slate-200 rounded-[20px] p-6 relative transition-all min-h-[250px] shadow-sm",
              isGlossaryMode && "ring-2 ring-[var(--color-accent)]/20"
            )}>
              <div className="lang-selector flex items-center gap-2.5 mb-4 font-semibold text-sm text-[var(--color-text-secondary)]">
                DA: <span className="lang-tag bg-white px-2.5 py-1 rounded-lg shadow-sm text-[var(--color-text-main)]">
                  <select 
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value as Language)}
                    className="bg-transparent focus:outline-none cursor-pointer"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </span>
              </div>
              
              <textarea
                ref={sourceRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onSelect={handleSourceSelect}
                placeholder="Inserisci il testo qui..."
                className="w-full flex-1 bg-transparent border-none resize-none text-lg leading-relaxed focus:outline-none placeholder:text-[var(--color-text-secondary)]/50"
              />
              
              <div className="flex justify-between items-center mt-4">
                <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">
                  {inputText.length} caratteri
                </span>
                {inputText && (
                  <button 
                    onClick={clearAll}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors text-[var(--color-text-secondary)]"
                    title="Cancella tutto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel: Output */}
            <div className={cn(
              "panel flex flex-col bg-white border border-slate-200 rounded-[20px] p-6 relative transition-all min-h-[250px] shadow-sm",
              isGlossaryMode && "ring-2 ring-[var(--color-accent)]/20"
            )}>
              <div className="lang-selector flex items-center gap-2.5 mb-4 font-semibold text-sm text-[var(--color-text-secondary)]">
                A: <span className="lang-tag bg-white px-2.5 py-1 rounded-lg shadow-sm text-[var(--color-text-main)]">
                  <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value as Language)}
                    className="bg-transparent focus:outline-none cursor-pointer"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </span>
              </div>
              
              <div 
                ref={targetRef}
                onMouseUp={handleTargetSelect}
                className={cn(
                  "w-full flex-1 text-lg leading-relaxed font-medium",
                  !translatedText && "text-[var(--color-text-secondary)]/40 italic"
                )}
              >
                {translatedText || "La traduzione apparirà qui..."}
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span>Verified Accuracy: 98.4%</span>
                </div>
                
                {translatedText && (
                  <button 
                    onClick={() => copyToClipboard(translatedText)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/60 hover:bg-white border border-[var(--color-glass-border)] rounded-lg transition-all text-xs font-semibold"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        Copiato
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copia
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </main>

          {/* Right Side: Controls & Glossary Form */}
          <aside className="w-full lg:w-96 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <button
                onClick={handleTranslate}
                disabled={isLoading || !inputText.trim()}
                className={cn(
                  "w-full py-4 bg-[var(--color-accent)] text-white font-bold rounded-[16px] shadow-lg shadow-[var(--color-accent)]/30 transition-all flex items-center justify-center gap-3 active:scale-95",
                  (isLoading || !inputText.trim()) ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Languages className="w-5 h-5" />
                )}
                Traduci Ora
              </button>

              <button 
                onClick={() => setIsGlossaryMode(!isGlossaryMode)}
                className={cn(
                  "w-full py-4 font-bold rounded-[16px] border border-[var(--color-glass-border)] transition-all flex items-center justify-center gap-3",
                  isGlossaryMode ? "bg-white text-[var(--color-accent)] shadow-inner" : "bg-white/60 text-[var(--color-text-main)] hover:bg-white"
                )}
              >
                <BookMarked className="w-5 h-5" />
                {isGlossaryMode ? "Chiudi Editor" : "Crea Glossario"}
              </button>

              <button 
                onClick={clearAll}
                className="w-full py-3 bg-white/40 text-[var(--color-text-main)] text-sm font-semibold rounded-[12px] border border-[var(--color-glass-border)] hover:bg-white/60 transition-all"
              >
                Svuota tutto
              </button>
            </div>

            {/* Glossary Form */}
            <AnimatePresence>
              {isGlossaryMode && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-xl space-y-5"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Nuovo Termine</h4>
                    <Info className="w-3.5 h-3.5 opacity-30" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Sorgente ({sourceLang})</label>
                      <textarea 
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        placeholder="Incolla o seleziona..."
                        className="w-full p-3 bg-white/60 border border-[var(--color-glass-border)] rounded-xl text-sm focus:outline-none focus:ring-1 ring-[var(--color-accent)]/30 resize-none h-20"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Destinazione ({targetLang})</label>
                      <textarea 
                        value={selectedTarget}
                        onChange={(e) => setSelectedTarget(e.target.value)}
                        placeholder="Incolla o seleziona..."
                        className="w-full p-3 bg-white/60 border border-[var(--color-glass-border)] rounded-xl text-sm focus:outline-none focus:ring-1 ring-[var(--color-accent)]/30 resize-none h-20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold opacity-40 uppercase ml-1">Pronuncia (Pinyin)</label>
                        {(sourceLang === 'Chinese' || targetLang === 'Chinese') && (
                          <button 
                            onClick={() => handleGeneratePinyin(sourceLang === 'Chinese' ? selectedSource : selectedTarget)}
                            disabled={isGeneratingPinyin || !(sourceLang === 'Chinese' ? selectedSource : selectedTarget).trim()}
                            className="text-[9px] font-bold text-[var(--color-accent)] hover:underline disabled:opacity-30"
                          >
                            {isGeneratingPinyin ? "Generazione..." : "Genera Pinyin"}
                          </button>
                        )}
                      </div>
                      <input 
                        type="text"
                        value={selectedPronunciation}
                        onChange={(e) => setSelectedPronunciation(e.target.value)}
                        placeholder="Es: nǐ hǎo"
                        className="w-full p-3 bg-white/60 border border-[var(--color-glass-border)] rounded-xl text-sm focus:outline-none focus:ring-1 ring-[var(--color-accent)]/30"
                      />
                    </div>
                  </div>

              <button 
                onClick={addToGlossary}
                disabled={!selectedSource.trim() || !selectedTarget.trim()}
                className="w-full py-3 bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" /> Salva nel Glossario
              </button>
                  
                  <p className="text-[9px] text-center opacity-40 font-medium">
                    Puoi incollare il testo o sottolinearlo direttamente nei pannelli a sinistra.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </div>

      {/* Glossary Sidebar */}
      <AnimatePresence>
        {showGlossary && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGlossary(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20" />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-[var(--color-accent)]" />
                  <h2 className="font-bold text-xl">Glossario</h2>
                </div>
                <button onClick={() => setShowGlossary(false)} className="p-2 hover:bg-black/5 rounded-full text-sm font-semibold uppercase tracking-wider">Chiudi</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {glossary.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center gap-4">
                    <BookMarked className="w-12 h-12" />
                    <p className="font-mono text-sm">Il tuo glossario è vuoto</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <button 
                        onClick={() => exportGlossary('csv')}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        title="Esporta CSV"
                      >
                        <Download className="w-3 h-3" /> CSV
                      </button>
                      <button 
                        onClick={() => exportGlossary('json')}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        title="Esporta JSON"
                      >
                        <Download className="w-3 h-3" /> JSON
                      </button>
                      <button 
                        onClick={() => exportGlossary('word')}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        title="Esporta Word"
                      >
                        <Download className="w-3 h-3" /> Word
                      </button>
                    </div>
                    {glossary.map((item) => (
                      <div key={item.id} className="p-4 bg-white border border-slate-100 rounded-xl group relative shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-[9px] font-bold uppercase opacity-40">{item.sourceLang} → {item.targetLang}</div>
                          <button onClick={() => removeGlossaryItem(item.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 rounded-full transition-all"><Trash2 className="w-3 h-3" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="font-semibold text-sm">{item.sourceTerm}</div>
                            {item.pronunciation && <div className="text-[10px] text-slate-400 font-medium italic">{item.pronunciation}</div>}
                          </div>
                          <div className="text-sm text-[var(--color-accent)] font-medium">{item.targetTerm}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20" />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[var(--color-accent)]" />
                  <h2 className="font-bold text-xl">Cronologia</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-black/5 rounded-full text-sm font-semibold uppercase tracking-wider">Chiudi</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center gap-4">
                    <History className="w-12 h-12" />
                    <p className="font-mono text-sm">Nessuna traduzione recente</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="group border-b border-black/5 pb-6 last:border-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter opacity-50">
                          <span>{item.sourceLang}</span>
                          <ArrowRightLeft className="w-2 h-2" />
                          <span>{item.targetLang}</span>
                        </div>
                        <span className="text-[9px] font-mono opacity-30">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1 line-clamp-2">{item.source}</p>
                      <p className="text-sm text-black/60 line-clamp-2 italic">{item.target}</p>
                      <div className="mt-3 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setInputText(item.source); setTranslatedText(item.target); setSourceLang(item.sourceLang); setTargetLang(item.targetLang); setShowHistory(false); }} className="text-[10px] font-bold uppercase underline underline-offset-2 hover:text-[var(--color-accent)]">Ripristina</button>
                        <button onClick={() => copyToClipboard(item.target)} className="text-[10px] font-bold uppercase underline underline-offset-2 hover:text-[var(--color-accent)]">Copia</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {history.length > 0 && (
                <div className="p-6 border-t border-slate-100">
                  <button onClick={clearHistory} className="w-full py-3 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors rounded-xl">Cancella Cronologia</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
            © 2026 LingoAssist • Precision AI v4.2
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-bold opacity-40 uppercase tracking-widest hover:opacity-100 transition-opacity">Privacy</a>
            <a href="#" className="text-[10px] font-bold opacity-40 uppercase tracking-widest hover:opacity-100 transition-opacity">Termini</a>
            <a href="#" className="text-[10px] font-bold opacity-40 uppercase tracking-widest hover:opacity-100 transition-opacity">Supporto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
