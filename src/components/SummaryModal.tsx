import React from 'react';
import { CrosswordPuzzle, GridScale, SCALE_CONFIG } from '../utils/crosswordGenerator';
import { Award, CheckCircle2, Compass, Play, RotateCcw, Sparkles, X } from 'lucide-react';

interface SummaryModalProps {
  isOpen: boolean;
  isVictory: boolean;
  puzzle: CrosswordPuzzle;
  solvedWordsCount: number;
  filledCellsCount: number;
  hintsUsed: number;
  elapsedSeconds: number;
  streamLayout: boolean;
  onChangeStreamLayout: (stream: boolean) => void;
  onClose: () => void;
  onRestartPuzzle: () => void;
  onChangeScale: (scale: GridScale) => void;
  onReturnToTitle: () => void;
  onAutoSolveEntireBoard: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  isVictory,
  puzzle,
  solvedWordsCount,
  filledCellsCount,
  hintsUsed,
  elapsedSeconds,
  streamLayout,
  onChangeStreamLayout,
  onClose,
  onRestartPuzzle,
  onChangeScale,
  onReturnToTitle,
  onAutoSolveEntireBoard
}) => {
  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rem = secs % 60;
    if (hrs > 0) {
      return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(rem).padStart(2, '0')}s`;
    }
    return `${String(mins).padStart(2, '0')}m ${String(rem).padStart(2, '0')}s`;
  };

  const wordCompletionPct =
    puzzle.words.length > 0 ? Math.round((solvedWordsCount / puzzle.words.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
      <div className="w-full max-w-xl bg-[#121824] border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            {isVictory ? (
              <Award className="w-5 h-5 text-amber-400" />
            ) : (
              <Compass className="w-5 h-5 text-amber-400" />
            )}
            <h2 className="text-lg font-bold tracking-tight">
              {isVictory ? 'Colossal Atlas Completed!' : 'Expedition Pause & Atlas Log'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Resume Game"
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="space-y-1">
            <div className="text-xs text-amber-300 font-mono-tabular">
              {SCALE_CONFIG[puzzle.scale].label} · {puzzle.size}×{puzzle.size} Grid
            </div>
            <p className="text-sm text-slate-300">
              {isVictory
                ? 'Every interlocking word across the cartographic broadsheet has been verified and cataloged.'
                : 'Your progress is automatically saved in your browser. Switch grid scales or review your progress below.'}
            </p>
          </div>

          {/* Tabular Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">Words Solved</div>
              <div className="text-lg font-bold font-mono-tabular text-white mt-1">
                {solvedWordsCount.toLocaleString()} / {puzzle.words.length.toLocaleString()}
              </div>
              <div className="text-[11px] font-mono-tabular text-emerald-400 mt-0.5">
                {wordCompletionPct}% Complete
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">Squares Filled</div>
              <div className="text-lg font-bold font-mono-tabular text-white mt-1">
                {filledCellsCount.toLocaleString()}
              </div>
              <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                of {puzzle.totalWhiteCells.toLocaleString()} letters
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">Elapsed Time</div>
              <div className="text-lg font-bold font-mono-tabular text-white mt-1">
                {formatTime(elapsedSeconds)}
              </div>
              <div className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                Active session
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400">Hints Used</div>
              <div className="text-lg font-bold font-mono-tabular text-white mt-1">
                {hintsUsed}
              </div>
              <div className="text-[11px] font-mono-tabular text-amber-400 mt-0.5">
                3-Tier Assist
              </div>
            </div>
          </div>

          {/* Switch Scale Quickly */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">Switch Atlas Grid Size</div>
            <div className="grid grid-cols-3 gap-2">
              {(['colossal', 'grand', 'district'] as GridScale[]).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => {
                    onChangeScale(sc);
                    onClose();
                  }}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    puzzle.scale === sc
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {SCALE_CONFIG[sc].size}×{SCALE_CONFIG[sc].size} Grid
                </button>
              ))}
            </div>
          </div>

          {/* Viewport Layout Selector */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-400">Viewport Layout</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangeStreamLayout(false);
                  onClose();
                }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  !streamLayout
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Full Atlas Viewport
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeStreamLayout(true);
                  onClose();
                }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  streamLayout
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Stream Layout (12×12)
              </button>
            </div>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRestartPuzzle}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again (Clear Grid)</span>
              </button>

              {!isVictory && (
                <button
                  type="button"
                  onClick={onAutoSolveEntireBoard}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reveal Full Atlas</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReturnToTitle}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Title Screen
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {isVictory ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isVictory ? 'Inspect Solved Board' : 'Resume Solving'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
