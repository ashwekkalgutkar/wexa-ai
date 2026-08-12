import React from 'react';
import { AlertTriangle, RefreshCw, SearchX, Music } from 'lucide-react';

interface ErrorStateProps {
  type: 'empty' | 'error' | 'not-found';
  message: string;
  onRetry?: () => void;
  onOpenSearch?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type,
  message,
  onRetry,
  onOpenSearch,
}) => {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pointer-events-auto">
      <div className="glass-panel glass-panel-glow rounded-2xl p-4 flex items-center justify-between shadow-2xl border border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            {type === 'not-found' ? (
              <SearchX className="w-5 h-5 text-amber-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-display">
              {type === 'not-found' ? 'No Collaboration Path Found' : 'Notice'}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="px-3 py-1.5 rounded-lg bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/30 text-xs font-bold transition-all"
            >
              Try Other Artists
            </button>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
