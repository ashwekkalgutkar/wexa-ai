import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SequentialPathView } from './components/SequentialPathView';
import { ExploreGraphView } from './components/ExploreGraphView';
import { CommandPalette } from './components/CommandPalette';
import { HubsModal } from './components/HubsModal';
import { GenreBridgesModal } from './components/GenreBridgesModal';
import { ErrorState } from './components/ErrorState';

import { NodeData, LinkData, PathResult, DBStatus } from './types/graph';
import {
  fetchDBStatus,
  fetchFullGraph,
  fetchShortestPath,
  fetchAllPaths,
  fetchArtistNeighborhood,
} from './services/api';
import { Sparkles, Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  // App Mode: 'landing' (quiet search, NO graph), 'path' (sequential chain), 'explore' (1-hop neighborhood)
  const [appMode, setAppMode] = useState<'landing' | 'path' | 'explore'>('landing');

  // Database status
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);

  // Full graph data cached for lookups
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Path state (Screen 2)
  const [activePath, setActivePath] = useState<PathResult | null>(null);
  const [alternatePaths, setAlternatePaths] = useState<PathResult[]>([]);

  // Explore state (Screen 3)
  const [exploreArtist, setExploreArtist] = useState<NodeData | null>(null);
  const [exploreNeighbors, setExploreNeighbors] = useState<NodeData[]>([]);
  const [exploreLinks, setExploreLinks] = useState<LinkData[]>([]);

  // Modals state
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isHubsOpen, setIsHubsOpen] = useState<boolean>(false);
  const [isBridgesOpen, setIsBridgesOpen] = useState<boolean>(false);

  // Error feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial Load - Cache status & full dataset for fast traversals
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [statusData, graphData] = await Promise.all([
          fetchDBStatus().catch(() => ({ tested: true, connected: false, uri: 'bolt://localhost:7687' })),
          fetchFullGraph().catch(() => ({ nodes: [], links: [] })),
        ]);

        setDbStatus(statusData);
        setNodes(graphData.nodes);
        setLinks(graphData.links);
      } catch (err: any) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Screen 2: Handle Finding Shortest Path (Sequential Path Reveal)
  const handleFindPath = useCallback(async (artistA: string, artistB: string) => {
    setErrorMessage(null);
    setExploreArtist(null);

    try {
      setLoading(true);
      const [shortest, alternates] = await Promise.all([
        fetchShortestPath(artistA, artistB),
        fetchAllPaths(artistA, artistB).catch(() => []),
      ]);

      setActivePath(shortest);
      setAlternatePaths(alternates.length > 0 ? alternates : [shortest]);
      setAppMode('path');
    } catch (err: any) {
      console.error('Path finding error:', err);
      setErrorMessage(err.message || `No collaboration path found between "${artistA}" and "${artistB}".`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Screen 3: Handle Entering Explore Mode for an Artist Node
  const handleExploreArtist = useCallback(async (artist: NodeData) => {
    setErrorMessage(null);
    setExploreArtist(artist);

    try {
      setLoading(true);
      const data = await fetchArtistNeighborhood(artist.name);
      setExploreArtist(data.artist);
      setExploreNeighbors(data.neighbors);
      setExploreLinks(data.links);
      setAppMode('explore');
    } catch (err: any) {
      console.error('Explore load error:', err);
      setErrorMessage(`Failed to load collaborators for ${artist.name}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectArtistByName = useCallback(
    (name: string) => {
      const found = nodes.find((n) => n.name.toLowerCase() === name.toLowerCase());
      if (found) {
        handleExploreArtist(found);
      } else {
        fetchArtistNeighborhood(name)
          .then((data) => {
            setExploreArtist(data.artist);
            setExploreNeighbors(data.neighbors);
            setExploreLinks(data.links);
            setAppMode('explore');
          })
          .catch((err) => {
            setErrorMessage(err.message);
          });
      }
    },
    [nodes, handleExploreArtist]
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#FAFAF8] relative font-sans text-[#1A1A1A]">
      {/* Background Ambient Texture Mesh */}
      <div className="ambient-bg">
        <div className="blob-1" />
        <div className="blob-2" />
      </div>

      {/* Top Navbar */}
      <Navbar
        appMode={appMode}
        dbStatus={dbStatus}
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        onOpenHubs={() => setIsHubsOpen(true)}
        onOpenBridges={() => setIsBridgesOpen(true)}
      />

      {/* Main Mode View Switcher */}
      <AnimatePresence mode="wait">
        {/* SCREEN 1: LANDING (NO graph visible at all!) */}
        {appMode === 'landing' && (
          <motion.main
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col items-center justify-center px-4 relative z-10"
          >
            <div className="w-full max-w-2xl text-center space-y-6">
              {/* Quiet Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-xs font-semibold text-[#6C5CE7] border border-purple-200/60 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Variable-Length Graph Traversal Engine</span>
              </div>

              {/* Quiet Headline */}
              <h1 className="text-4xl sm:text-6xl font-extrabold font-display text-[#1A1A1A] tracking-tight leading-tight">
                Connect any two musical artists
              </h1>
              <p className="text-sm sm:text-base text-slate-500 max-w-lg mx-auto font-sans leading-relaxed">
                Discover variable-length recording, feature, production, and remix paths computed natively in openCypher.
              </p>

              {/* Centered Glass Search Pill (Single Focal Point of Landing Screen) */}
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setIsCommandOpen(true)}
                  className="w-full max-w-xl glass-panel p-4 rounded-3xl hover:border-purple-300 transition-all shadow-xl flex items-center justify-between group cursor-pointer border border-white/90"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-[#6C5CE7] group-hover:scale-105 transition-transform">
                      <Search className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-extrabold text-[#1A1A1A] font-display">
                        Search or pick two artists...
                      </div>
                      <div className="text-xs text-slate-400">
                        e.g. Kanye West → Daft Punk
                      </div>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-[#6C5CE7] text-white flex items-center justify-center shadow-md group-hover:bg-[#5b4bc4] transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>

              {/* Low-Emphasis Example Suggestion */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => handleFindPath('Kanye West', 'Daft Punk')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/70 hover:bg-white text-slate-600 border border-slate-200/70 text-xs font-semibold shadow-sm transition-all group"
                >
                  <span className="text-slate-400">Low-emphasis example:</span>
                  <span className="font-bold text-[#1A1A1A] group-hover:text-[#6C5CE7]">
                    Try Kanye West → Daft Punk
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          </motion.main>
        )}

        {/* SCREEN 2: PATH RESULT (Sequential left-to-right chain) */}
        {appMode === 'path' && activePath && (
          <motion.main
            key="path"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative"
          >
            <SequentialPathView
              pathResult={activePath}
              alternatePaths={alternatePaths}
              onSelectArtist={handleSelectArtistByName}
              onSelectAlternatePath={(idx) => setActivePath(alternatePaths[idx])}
              onExploreArtist={handleExploreArtist}
            />
          </motion.main>
        )}

        {/* SCREEN 3: EXPLORE MODE (1-hop neighborhood force graph) */}
        {appMode === 'explore' && exploreArtist && (
          <motion.main
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full relative"
          >
            <ExploreGraphView
              centerArtist={exploreArtist}
              neighbors={exploreNeighbors}
              links={exploreLinks}
              onSelectArtist={handleExploreArtist}
              onClose={() => setAppMode('landing')}
            />
          </motion.main>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onFindPath={handleFindPath}
      />

      <HubsModal
        isOpen={isHubsOpen}
        onClose={() => setIsHubsOpen(false)}
        onSelectArtist={handleSelectArtistByName}
      />

      <GenreBridgesModal
        isOpen={isBridgesOpen}
        onClose={() => setIsBridgesOpen(false)}
        onSelectArtist={handleSelectArtistByName}
      />

      {/* Error State */}
      {errorMessage && (
        <ErrorState
          type="not-found"
          message={errorMessage}
          onOpenSearch={() => setIsCommandOpen(true)}
          onRetry={() => setErrorMessage(null)}
        />
      )}
    </div>
  );
};
