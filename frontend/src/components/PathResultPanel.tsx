import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PathResult, NodeData } from '../types/graph';
import { getRoleBadgeColor } from '../utils/colors';
import { getArtistAvatarData } from '../utils/avatar';
import { Sparkles, X, Layers, Copy, Check, Music } from 'lucide-react';

interface PathResultPanelProps {
  pathResult: PathResult;
  alternatePaths: PathResult[];
  onClose: () => void;
  onSelectArtist: (name: string) => void;
}

const RowArtistAvatar: React.FC<{ artist: NodeData }> = ({ artist }) => {
  const [imgError, setImgError] = useState(false);
  const avatar = getArtistAvatarData(artist.name);

  return (
    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 shadow-sm relative flex items-center justify-center font-bold text-xs">
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

export const PathResultPanel: React.FC<PathResultPanelProps> = ({
  pathResult,
  alternatePaths,
  onClose,
  onSelectArtist,
}) => {
  const [activePathIdx, setActivePathIdx] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const currentPath = alternatePaths[activePathIdx] || pathResult;

  const handleCopy = () => {
    const text = currentPath.chain
      .map((node, i) => {
        if (i === 0) return node.name;
        const link = currentPath.links[i - 1];
        return ` → "${link.track}" (${link.year}) [${link.role}] → ${node.name}`;
      })
      .join('');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed right-6 top-24 bottom-6 w-full max-w-md glass-panel p-6 z-30 flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6C5CE7]" />
            <h2 className="text-lg font-bold font-display text-[#1A1A1A]">Collaboration Path</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {currentPath.length} {currentPath.length === 1 ? 'Degree' : 'Degrees'} of Separation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-500 transition-colors border border-slate-200/60 shadow-sm"
            title="Copy Path Text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-500 transition-colors border border-slate-200/60 shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alternate Paths Switcher */}
      {alternatePaths.length > 1 && (
        <div className="py-3 border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-2">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Found {alternatePaths.length} Alternate Routes</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {alternatePaths.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setActivePathIdx(idx)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  idx === activePathIdx
                    ? 'bg-purple-50 text-[#6C5CE7] border-purple-200'
                    : 'bg-white/70 text-slate-500 border-slate-200 hover:bg-white'
                }`}
              >
                Route {idx + 1} ({p.length} hops)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Path Chain Timeline */}
      <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-4">
        {currentPath.chain.map((artist, idx) => {
          const isLast = idx === currentPath.chain.length - 1;
          const link = !isLast ? currentPath.links[idx] : null;

          return (
            <div key={artist.name + idx} className="relative">
              {/* Artist Row */}
              <div
                onClick={() => onSelectArtist(artist.name)}
                className="group p-3.5 rounded-2xl bg-white/80 hover:bg-purple-50/50 border border-slate-200/70 shadow-sm cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <RowArtistAvatar artist={artist} />
                  <div>
                    <h3 className="font-extrabold text-sm text-[#1A1A1A] group-hover:text-[#6C5CE7] transition-colors font-display">
                      {artist.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-medium text-slate-400">
                        {artist.genres.slice(0, 2).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase">
                  {idx === 0 ? 'START' : isLast ? 'TARGET' : `HOP ${idx}`}
                </span>
              </div>

              {/* Clean Vertical Connecting Line with Track Cover Art */}
              {link && (
                <div className="my-2 ml-8 pl-6 border-l-2 border-slate-200 py-1.5 relative">
                  <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#6C5CE7]" />

                  <div className="bg-white/90 border border-slate-200/60 rounded-xl p-3 shadow-sm flex items-center gap-3">
                    {link.image_url ? (
                      <img
                        src={link.image_url}
                        alt={link.track}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200/80 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
                        <Music className="w-4 h-4 text-[#6C5CE7]" />
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-[#1A1A1A] truncate" title={link.track}>
                          "{link.track}"
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${getRoleBadgeColor(
                            link.role
                          )}`}
                        >
                          {link.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Released: {link.year}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-200/60 shrink-0 text-center">
        <p className="text-[10px] text-slate-400 font-mono">
          Traversed via openCypher <code className="text-[#6C5CE7] font-semibold">shortestPath()</code>
        </p>
      </div>
    </motion.div>
  );
};
