import React from 'react';
import { Network, Flame, GitMerge, Search } from 'lucide-react';
import { DBStatus } from '../types/graph';

interface NavbarProps {
  appMode?: 'landing' | 'path' | 'explore';
  dbStatus: DBStatus | null;
  onOpenCommandPalette: () => void;
  onOpenHubs: () => void;
  onOpenBridges: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  appMode = 'landing',
  dbStatus,
  onOpenCommandPalette,
  onOpenHubs,
  onOpenBridges,
}) => {
  const isConnected = dbStatus?.connected ?? false;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between pointer-events-none">
      {/* Left: Branding */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center">
          <Network className="w-5 h-5 text-[#6C5CE7]" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-[#1A1A1A] font-display">
            Six Degrees
          </h1>
          <p className="text-xs text-slate-500 font-sans">Music Collaboration Network</p>
        </div>
      </div>

      {/* Center: Command Bar Trigger */}
      {appMode !== 'landing' && (
        <div className="pointer-events-auto">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl glass-panel hover:border-slate-300 text-slate-600 hover:text-[#1A1A1A] transition-all group border border-white/90 shadow-sm"
          >
            <Search className="w-4 h-4 text-[#6C5CE7] group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold">Search / Connect artists</span>
          </button>
        </div>
      )}

      {/* Right: Navigation */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onOpenHubs}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/70 hover:bg-white text-slate-600 border border-slate-200/60 shadow-sm transition-all"
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Hubs</span>
        </button>

        <button
          onClick={onOpenBridges}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/70 hover:bg-white text-slate-600 border border-slate-200/60 shadow-sm transition-all"
        >
          <GitMerge className="w-3.5 h-3.5 text-purple-500" />
          <span>Bridges</span>
        </button>

        {/* Database Status Indicator (Dot only) */}
        <div className="flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-mono text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'
            }`}
          />
        </div>
      </div>
    </header>
  );
};
