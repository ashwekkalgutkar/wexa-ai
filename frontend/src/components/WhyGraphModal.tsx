import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, CheckCircle2, AlertTriangle, Code2 } from 'lucide-react';

interface WhyGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhyGraphModal: React.FC<WhyGraphModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl glass-panel glass-panel-glow rounded-2xl p-6 z-10 max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00f0ff]/20 border border-[#00f0ff]/30 flex items-center justify-center">
                  <Info className="w-5 h-5 text-[#00f0ff]" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold font-display text-white">Why a Graph Database?</h2>
                  <p className="text-xs text-slate-400">Comparing openCypher graph traversals vs Relational SQL recursive CTEs</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-slate-300">
              <div>
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                  The Problem: Unbounded Variable-Length Hops
                </h3>
                <p className="leading-relaxed">
                  Finding the shortest collaboration path between two arbitrary artists out of an unknown number of intermediate hops is a classic variable-length path problem. In a relational database, you do not know the depth in advance.
                </p>
              </div>

              {/* Code comparison grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cypher */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      openCypher (CognoDB)
                    </span>
                    <span className="text-[10px] text-emerald-400/80 font-mono">1 Single Query</span>
                  </div>
                  <pre className="text-xs font-mono text-emerald-200 bg-black/50 p-3 rounded-lg overflow-x-auto leading-relaxed border border-emerald-500/20">
                    {`MATCH p = shortestPath(
  (a:Artist {name: $nameA})
  -[:COLLABORATED_ON*1..6]-
  (b:Artist {name: $nameB})
)
RETURN nodes(p), relationships(p);`}
                  </pre>
                  <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li>• Native O(1) index-free adjacency traversal</li>
                    <li>• Simple, intuitive 5-line declarative query</li>
                    <li>• Scales naturally as graph size grows</li>
                  </ul>
                </div>

                {/* SQL CTE */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Relational SQL (Recursive CTE)
                    </span>
                    <span className="text-[10px] text-rose-400/80 font-mono">Slow & Unreadable</span>
                  </div>
                  <pre className="text-xs font-mono text-rose-200 bg-black/50 p-3 rounded-lg overflow-x-auto leading-relaxed border border-rose-500/20">
                    {`WITH RECURSIVE artist_path AS (
  SELECT artist1_id, artist2_id, 
         ARRAY[artist1_id, artist2_id] AS path, 1 AS depth
  FROM collaborations WHERE artist1_id = $idA
  UNION ALL
  SELECT c.artist1_id, c.artist2_id, 
         p.path || c.artist2_id, p.depth + 1
  FROM collaborations c
  JOIN artist_path p ON c.artist1_id = p.artist2_id
  WHERE NOT c.artist2_id = ANY(p.path) AND p.depth < 6
)
SELECT * FROM artist_path WHERE artist2_id = $idB ORDER BY depth LIMIT 1;`}
                  </pre>
                  <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li>• Exploding self-joins on intermediate tables</li>
                    <li>• High CPU and memory overhead per hop</li>
                    <li>• Extremely hard to maintain or expand</li>
                  </ul>
                </div>
              </div>

              {/* Key Takeaway */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="font-bold text-sm text-white mb-1">Key Engineering Takeaway</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In graph databases like CognoDB, relationships are first-class citizens stored directly alongside nodes. Traversal does not require scanning entire tables or computing expensive Cartesian joins — it simply follows physical pointers, making graph queries orders of magnitude faster for connected domain modeling.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
