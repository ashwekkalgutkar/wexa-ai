import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, X } from 'lucide-react';
import { GenreBridge, NodeData } from '../types/graph';
import { fetchGenreBridges } from '../services/api';
import { getArtistAvatarData } from '../utils/avatar';

interface GenreBridgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArtist: (name: string) => void;
}

const BridgeArtistAvatar: React.FC<{ artist: NodeData }> = ({ artist }) => {
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

import { useGenreBridges } from '../hooks/useGraphQueries';

export const GenreBridgesModal: React.FC<GenreBridgesModalProps> = ({ isOpen, onClose, onSelectArtist }) => {
  const { data: bridges = [], isLoading } = useGenreBridges(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl glass-panel p-7 z-10 max-h-[85vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                  <GitMerge className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold font-display text-[#1A1A1A]">Cross-Genre Bridge Artists</h2>
                  <p className="text-xs text-slate-400">Artists sitting structurally between distinct genre clusters</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-3">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400 font-mono text-xs">Computing cross-genre graph traversals...</div>
              ) : (
                bridges.map((item) => {
                  return (
                    <div
                      key={item.artist.name}
                      onClick={() => {
                        onSelectArtist(item.artist.name);
                        onClose();
                      }}
                      className="p-4 rounded-2xl bg-white/80 hover:bg-purple-50/50 border border-slate-200/60 transition-all cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BridgeArtistAvatar artist={item.artist} />
                          <div>
                            <h3 className="font-extrabold text-base text-[#1A1A1A] group-hover:text-purple-600 transition-colors font-display">
                              {item.artist.name}
                            </h3>
                            <div className="text-xs text-slate-400">
                              Primary: {item.artist.genres.join(', ')}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                            Connects {item.diversityScore} Genres
                          </span>
                        </div>
                      </div>

                      {/* Connected Genres Pill Cloud */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Bridged Genres:</span>
                        {item.connectedGenres.map((g) => (
                          <span
                            key={g}
                            className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100/80 text-slate-500 border border-slate-200/60"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
