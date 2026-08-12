import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NodeData, LinkData } from '../types/graph';
import { getRoleBadgeColor } from '../utils/colors';
import { getArtistAvatarData } from '../utils/avatar';
import { X, Sparkles, Flame, Music, ArrowRight } from 'lucide-react';

interface ArtistDetailPanelProps {
  artist: NodeData;
  neighbors: NodeData[];
  links: LinkData[];
  onClose: () => void;
  onSelectArtist: (name: string) => void;
  onSetAsPathStart: (name: string) => void;
}

const ArtistAvatar: React.FC<{ name: string; imageUrl?: string; sizeClass?: string }> = ({
  name,
  imageUrl,
  sizeClass = 'w-12 h-12',
}) => {
  const [imgError, setImgError] = useState(false);
  const avatar = getArtistAvatarData(name);

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 shadow-sm relative flex items-center justify-center font-bold text-xs`}>
      {imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={name}
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

export const ArtistDetailPanel: React.FC<ArtistDetailPanelProps> = ({
  artist,
  neighbors,
  links,
  onClose,
  onSelectArtist,
  onSetAsPathStart,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-6 top-24 bottom-6 w-full max-w-md glass-panel p-6 z-30 flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 shrink-0">
        <div className="flex items-center gap-3">
          <ArtistAvatar name={artist.name} imageUrl={artist.image_url} sizeClass="w-12 h-12" />
          <div>
            <h2 className="text-xl font-extrabold font-display text-[#1A1A1A]">{artist.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400 font-medium">
                {artist.genres.join(' • ')}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-500 transition-colors border border-slate-200/60 shadow-sm"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-200/60 shrink-0">
        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Degree Centrality</span>
          </div>
          <div className="text-2xl font-black font-display text-[#1A1A1A]">
            {artist.degree ?? neighbors.length}
            <span className="text-xs font-normal text-slate-400 ml-1">partners</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#6C5CE7]" />
            <span>Popularity</span>
          </div>
          <div className="text-2xl font-black font-display text-[#6C5CE7]">
            {artist.popularity}
            <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="py-3 border-b border-slate-200/60 shrink-0">
        <button
          onClick={() => onSetAsPathStart(artist.name)}
          className="w-full py-3 px-4 rounded-2xl bg-purple-50 hover:bg-purple-100/80 text-[#6C5CE7] border border-purple-200/80 text-xs font-bold transition-all flex items-center justify-center gap-2"
        >
          <span>Find Collaboration Chain from {artist.name}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Neighborhood List */}
      <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Direct 1-Hop Collaborators ({neighbors.length})
        </h3>

        {neighbors.map((partner) => {
          const matchingLink = links.find((l) => {
            const sName = typeof l.source === 'object' ? l.source.name : l.source;
            const tName = typeof l.target === 'object' ? l.target.name : l.target;
            return (
              (sName === artist.name && tName === partner.name) ||
              (tName === artist.name && sName === partner.name)
            );
          });

          return (
            <div
              key={partner.name}
              onClick={() => onSelectArtist(partner.name)}
              className="p-3.5 rounded-2xl bg-white/80 hover:bg-purple-50/50 border border-slate-200/60 transition-all cursor-pointer group flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <ArtistAvatar name={partner.name} imageUrl={partner.image_url} sizeClass="w-9 h-9" />
                <div>
                  <h4 className="font-bold text-sm text-[#1A1A1A] group-hover:text-[#6C5CE7] transition-colors font-display">
                    {partner.name}
                  </h4>
                  {matchingLink && (
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                      {matchingLink.image_url ? (
                        <img src={matchingLink.image_url} alt={matchingLink.track_title} className="w-3.5 h-3.5 rounded object-cover" />
                      ) : (
                        <Music className="w-3 h-3 text-slate-400" />
                      )}
                      <span>"{matchingLink.track_title}" ({matchingLink.year})</span>
                    </div>
                  )}
                </div>
              </div>

              {matchingLink && (
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeColor(
                    matchingLink.role
                  )}`}
                >
                  {matchingLink.role}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
