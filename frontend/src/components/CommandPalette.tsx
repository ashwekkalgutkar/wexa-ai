import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRightLeft, Sparkles, X, Music, UserCheck, Flame } from 'lucide-react';
import { NodeData } from '../types/graph';
import { searchArtists } from '../services/api';
import { getArtistAvatarData } from '../utils/avatar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onFindPath: (artistA: string, artistB: string) => void;
}

const PRESET_PATHS = [
  { a: 'Kanye West', b: 'Daft Punk', label: 'Hip Hop ↔ Electronic (Stronger)' },
  { a: 'Damon Albarn', b: 'Snoop Dogg', label: 'Britpop ↔ West Coast Rap' },
  { a: 'Coldplay', b: 'BTS', label: 'Pop Rock ↔ K-Pop' },
  { a: 'Taylor Swift', b: 'Kendrick Lamar', label: 'Pop ↔ Conscious Rap' },
  { a: 'David Bowie', b: 'Trent Reznor', label: 'Glam Rock ↔ Industrial Rock' },
  { a: 'Skrillex', b: 'Brian Eno', label: 'Dubstep ↔ Ambient Master' },
];

const SuggestionArtistAvatar: React.FC<{ artist: NodeData }> = ({ artist }) => {
  const [imgError, setImgError] = useState(false);
  const avatar = getArtistAvatarData(artist.name);

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 shadow-sm relative flex items-center justify-center font-bold text-[10px]">
      {artist.image_url && !imgError ? (
        <img
          src={artist.image_url}
          alt={artist.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center rounded-full"
          style={{
            background: `linear-gradient(135deg, ${avatar.color1}, ${avatar.color2})`,
            color: avatar.textColor,
          }}
        >
          {avatar.initials}
        </div>
      )}
    </div>
  );
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onFindPath,
}) => {
  const [artistA, setArtistA] = useState('');
  const [artistB, setArtistB] = useState('');
  const [activeInput, setActiveInput] = useState<'A' | 'B'>('A');

  const [suggestions, setSuggestions] = useState<NodeData[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const inputRefA = useRef<HTMLInputElement>(null);
  const inputRefB = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRefA.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const query = activeInput === 'A' ? artistA : artistB;
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchArtists(query);
        setSuggestions(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [artistA, artistB, activeInput]);

  const handleSwap = () => {
    const temp = artistA;
    setArtistA(artistB);
    setArtistB(temp);
  };

  const handleSelectSuggestion = (artist: NodeData) => {
    if (activeInput === 'A') {
      setArtistA(artist.name);
      setActiveInput('B');
      setTimeout(() => inputRefB.current?.focus(), 50);
    } else {
      setArtistB(artist.name);
    }
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (artistA.trim() && artistB.trim()) {
      onFindPath(artistA.trim(), artistB.trim());
      onClose();
    }
  };

  const handlePresetSelect = (a: string, b: string) => {
    setArtistA(a);
    setArtistB(b);
    onFindPath(a, b);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/20 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-xl glass-panel p-7 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#6C5CE7]" />
                </div>
                <h2 className="text-lg font-bold font-display text-[#1A1A1A]">Find Collaboration Chain</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Input A */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Artist A (Start)
                </label>
                <div className="relative flex items-center">
                  <UserCheck className="absolute left-4 w-4 h-4 text-[#6C5CE7]" />
                  <input
                    ref={inputRefA}
                    type="text"
                    value={artistA}
                    onFocus={() => setActiveInput('A')}
                    onChange={(e) => setArtistA(e.target.value)}
                    placeholder="e.g. Kanye West, Daft Punk..."
                    className="w-full bg-white/80 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-[#1A1A1A] placeholder-slate-400 focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 transition-all"
                  />
                  {artistA && (
                    <button
                      type="button"
                      onClick={() => setArtistA('')}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-2 relative z-10">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="p-2 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-[#6C5CE7] hover:border-purple-300 transition-all shadow-sm"
                  title="Swap Artists"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Input B */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Artist B (Target)
                </label>
                <div className="relative flex items-center">
                  <Music className="absolute left-4 w-4 h-4 text-[#6C5CE7]" />
                  <input
                    ref={inputRefB}
                    type="text"
                    value={artistB}
                    onFocus={() => setActiveInput('B')}
                    onChange={(e) => setArtistB(e.target.value)}
                    placeholder="e.g. David Bowie, Rihanna..."
                    className="w-full bg-white/80 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-[#1A1A1A] placeholder-slate-400 focus:outline-none focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20 transition-all"
                  />
                  {artistB && (
                    <button
                      type="button"
                      onClick={() => setArtistB('')}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Autocomplete Suggestions with Matching Photos */}
              {suggestions.length > 0 && (
                <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-xl max-h-44 overflow-y-auto space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">
                    Matching Artists ({activeInput === 'A' ? 'Artist A' : 'Artist B'})
                  </div>
                  {suggestions.map((item) => {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-purple-50/60 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <SuggestionArtistAvatar artist={item} />
                          <span className="text-sm font-semibold text-[#1A1A1A]">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {item.genres[0] || 'music'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={!artistA.trim() || !artistB.trim()}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-[#6C5CE7] hover:bg-[#5b4bc4] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-white fill-white" />
                <span>Calculate Cypher Shortest Path</span>
              </button>
            </form>

            {/* Presets */}
            <div className="mt-6 pt-4 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Popular Connections to Try</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_PATHS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetSelect(preset.a, preset.b)}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/70 hover:bg-purple-50/50 border border-slate-200/60 text-left transition-all group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-700 group-hover:text-[#6C5CE7] transition-colors">
                        {preset.a} → {preset.b}
                      </div>
                      <div className="text-[10px] text-slate-400">{preset.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
