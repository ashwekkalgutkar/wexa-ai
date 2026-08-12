import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PathResult, NodeData } from '../types/graph';
import { getArtistAvatarData } from '../utils/avatar';
import { getRoleBadgeColor } from '../utils/colors';
import { Music, Sparkles, Copy, Check, Compass } from 'lucide-react';

interface SequentialPathViewProps {
  pathResult: PathResult;
  alternatePaths: PathResult[];
  onSelectArtist: (name: string) => void;
  onSelectAlternatePath: (index: number) => void;
  onExploreArtist: (artist: NodeData) => void;
}

const PathArtistAvatar: React.FC<{ artist: NodeData }> = ({ artist }) => {
  const [imgError, setImgError] = useState(false);
  const avatar = getArtistAvatarData(artist.name);

  return (
    <div
      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 border-2 border-white shadow-xl transition-transform duration-200 group-hover:scale-105 group-hover:shadow-2xl overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${avatar.color1}, ${avatar.color2})`,
      }}
    >
      {artist.image_url && !imgError ? (
        <img
          src={artist.image_url}
          alt={artist.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full shadow-inner"
        />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center font-extrabold text-xl sm:text-2xl font-display shadow-inner" style={{ color: avatar.textColor }}>
          {avatar.initials}
        </div>
      )}
    </div>
  );
};

export const SequentialPathView: React.FC<SequentialPathViewProps> = ({
  pathResult,
  alternatePaths,
  onSelectArtist,
  onSelectAlternatePath,
  onExploreArtist,
}) => {
  const [activePathIdx, setActivePathIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentPath = alternatePaths[activePathIdx] || pathResult;
  const nodes = currentPath.chain;
  const links = currentPath.links;

  const handleCopy = () => {
    const text = nodes
      .map((n, i) => {
        if (i === 0) return n.name;
        const link = links[i - 1];
        return ` → "${link.track}" (${link.year}) [${link.role}] → ${n.name}`;
      })
      .join('');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between pt-24 pb-8 px-6 relative z-10 overflow-y-auto">
      {/* Top Banner: Degrees & Alternate Routes */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-2 mb-4 shrink-0"
      >
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-xs font-semibold text-slate-700 shadow-sm border border-white/90">
          <Sparkles className="w-3.5 h-3.5 text-[#6C5CE7]" />
          <span>
            {currentPath.length} {currentPath.length === 1 ? 'Degree' : 'Degrees'} of Separation Found
          </span>
        </div>

        {/* Alternate Routes Switcher */}
        {alternatePaths.length > 1 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-medium text-slate-400 font-mono">Alternate Routes:</span>
            <div className="flex gap-1.5">
              {alternatePaths.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActivePathIdx(idx);
                    onSelectAlternatePath(idx);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    idx === activePathIdx
                      ? 'bg-[#6C5CE7] text-white border-[#6C5CE7] shadow-sm'
                      : 'bg-white/70 text-slate-600 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  Route {idx + 1} ({p.length} hops)
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Main Sequential Chain Display */}
      <div className="w-full max-w-6xl my-auto py-8 flex items-center justify-center overflow-x-auto">
        <div className="flex items-center justify-center px-4 w-full">
          {nodes.map((artist, idx) => {
            const isLast = idx === nodes.length - 1;
            const link = !isLast ? links[idx] : null;

            const nodeDelay = idx * 0.2;
            const lineDelay = nodeDelay + 0.1;

            return (
              <React.Fragment key={artist.name + idx}>
                {/* Node Card Container */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: nodeDelay }}
                  onClick={() => onExploreArtist(artist)}
                  className="flex flex-col items-center group cursor-pointer shrink-0 select-none py-2 px-1"
                >
                  {/* Circular Avatar with Real Photo */}
                  <div className="relative">
                    <PathArtistAvatar artist={artist} />

                    {/* Hop Badge */}
                    <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-white text-[10px] font-extrabold font-mono text-[#1A1A1A] border border-slate-200 shadow-sm pointer-events-none z-10">
                      {idx === 0 ? 'START' : isLast ? 'TARGET' : `HOP ${idx}`}
                    </div>
                  </div>

                  {/* Name & Genres */}
                  <div className="mt-3 text-center max-w-[140px] pointer-events-none">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#1A1A1A] font-display group-hover:text-[#6C5CE7] transition-colors leading-snug line-clamp-1">
                      {artist.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                      {artist.genres.slice(0, 2).join(' • ') || 'Music'}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-bold text-[#6C5CE7] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Compass className="w-2.5 h-2.5" />
                      <span>Explore 1-hop</span>
                    </div>
                  </div>
                </motion.div>

                {/* Connecting Line + Track Cover Art Glass Chip */}
                {link && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: lineDelay }}
                    className="flex-1 min-w-[140px] max-w-[280px] flex items-center justify-center relative mx-1 my-auto shrink"
                  >
                    {/* Continuous solid gradient line */}
                    <div className="w-full h-[3px] bg-gradient-to-r from-[#6C5CE7] via-[#818cf8] to-[#6C5CE7] rounded-full shadow-sm" />

                    {/* Glass Midpoint Chip directly on top of line with Track Cover Art */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="glass-panel px-3 py-2 rounded-2xl border border-white/90 shadow-md text-center max-w-[200px] pointer-events-auto flex items-center gap-2.5">
                        {link.image_url ? (
                          <img
                            src={link.image_url}
                            alt={link.track}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200/80 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100">
                            <Music className="w-4 h-4 text-[#6C5CE7]" />
                          </div>
                        )}
                        <div className="text-left overflow-hidden">
                          <span className="font-extrabold text-xs text-[#1A1A1A] block truncate max-w-[120px]" title={link.track}>
                            "{link.track}"
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-400">{link.year}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getRoleBadgeColor(link.role)}`}>
                              {link.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: nodes.length * 0.2 }}
        className="w-full max-w-3xl glass-panel p-5 rounded-3xl shadow-xl flex items-center justify-between border border-white/90 shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#6C5CE7]" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Collaboration Summary
            </h4>
            <p className="text-xs sm:text-sm font-semibold text-[#1A1A1A] mt-0.5 leading-normal">
              {nodes.map((n, i) => (
                <React.Fragment key={i}>
                  <span className="font-bold text-[#6C5CE7]">{n.name}</span>
                  {i < nodes.length - 1 && (
                    <span className="text-slate-400 font-normal">
                      {' '}
                      collaborated via <span className="italic text-slate-700">"{links[i].track}"</span> ({links[i].year}) with{' '}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="ml-4 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-600">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy Path</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};
