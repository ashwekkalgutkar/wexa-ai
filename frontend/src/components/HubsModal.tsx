import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { NodeData } from '../types/graph';
import { fetchHubArtists } from '../services/api';
import { getArtistAvatarData } from '../utils/avatar';

interface HubsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArtist: (name: string) => void;
}

const ModalArtistAvatar: React.FC<{ artist: NodeData }> = ({ artist }) => {
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

import { useHubArtists } from '../hooks/useGraphQueries';

export const HubsModal: React.FC<HubsModalProps> = ({ isOpen, onClose, onSelectArtist }) => {
  const { data: hubs = [], isLoading } = useHubArtists(isOpen);

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
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="relative w-full max-w-2xl glass-panel p-7 z-10 max-h-[85vh] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold font-display text-[#1A1A1A]">Most-Connected Hub Artists</h2>
                  <p className="text-xs text-slate-400">Ranked by Cypher Degree Centrality <code className="text-amber-600 font-semibold">count(DISTINCT other)</code></p>
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
                <div className="py-12 text-center text-slate-400 font-mono text-xs">Loading degree centrality statistics...</div>
              ) : (
                hubs.map((artist, rank) => {
                  return (
                    <div
                      key={artist.name}
                      onClick={() => {
                        onSelectArtist(artist.name);
                        onClose();
                      }}
                      className="p-4 rounded-2xl bg-white/80 hover:bg-purple-50/50 border border-slate-200/60 transition-all cursor-pointer group flex items-center justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-extrabold text-lg text-slate-300 group-hover:text-[#6C5CE7] font-mono w-6">
                          #{rank + 1}
                        </span>
                        <ModalArtistAvatar artist={artist} />
                        <div>
                          <h3 className="font-extrabold text-base text-[#1A1A1A] group-hover:text-[#6C5CE7] transition-colors font-display">
                            {artist.name}
                          </h3>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {artist.genres.slice(0, 3).join(', ')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-black font-display text-amber-600">
                          {artist.degree}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                          Direct Collaborators
                        </div>
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
