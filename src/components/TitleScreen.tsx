import React, { useEffect, useState } from 'react';
import { GridScale, SCALE_CONFIG } from '../utils/crosswordGenerator';
import { Compass, Play, Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  selectedScale: GridScale;
  onSelectScale: (scale: GridScale) => void;
  initialMode: 'classic' | 'quest';
  onSelectMode: (mode: 'classic' | 'quest') => void;
  streamLayout: boolean;
  onSelectStreamLayout: (stream: boolean) => void;
  hasSavedProgress: boolean;
  savedStats: { solvedWords: number; totalWords: number } | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedScale,
  onSelectScale,
  initialMode,
  onSelectMode,
  streamLayout,
  onSelectStreamLayout,
  hasSavedProgress,
  savedStats,
  isMuted,
  onToggleMute,
  onStartGame
}) => {
  const [imgError, setImgError] = useState(false);

  // Allow Enter or Space to start the game from the Title Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'BUTTON' || tag === 'INPUT') return;
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  const scales: GridScale[] = ['colossal', 'grand', 'district'];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0E131B] text-slate-100 flex flex-col lg:flex-row items-stretch">
      {/* Left / Backdrop Key-Art Showcase (60% width on desktop) */}
      <div className="relative lg:w-[58%] h-[38vh] lg:h-full overflow-hidden bg-[#141B26] shrink-0">
        {!imgError ? (
          <img
            src="/src/assets/images/hero_crossword_atlas_1794974606559.jpg"
            alt="Vintage cartographic crossword broadsheet atlas with brass magnifying glass and compass"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center scale-[1.02] transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 p-12">
            <Compass className="w-28 h-28 text-amber-400/40" />
          </div>
        )}

        {/* Measured directional contrast scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0E131B]/40 via-[#0E131B]/65 to-[#0E131B]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E131B] via-transparent to-[#0E131B]/50" />

        {/* Quiet Cartographic Edition Kicker at bottom-left */}
        <div className="hidden lg:flex flex-col justify-end absolute inset-0 p-10 pointer-events-none">
          <div className="max-w-md space-y-2 bg-[#0E131B]/80 p-5 rounded-lg border border-slate-800/90">
            <div className="flex items-center gap-2 text-xs text-amber-300/90 font-mono-tabular">
              <span>Cartographic Edition</span>
              <span aria-hidden="true">·</span>
              <span>40,000 Interlocking Squares</span>
              <span aria-hidden="true">·</span>
              <span>25 Named Sectors</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore a massive continent of Popular Culture, Cinema, Music, Television, Gaming, Science, and History clues. Complete themed quests or jump across the board with the pop-up Atlas Radar.
            </p>
          </div>
        </div>
      </div>

      {/* Right Dedicated Control & SVG Title Lockup Panel (42% calm negative space on desktop) */}
      <div className="relative flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto bg-[#0E131B]">
        {/* Top utility row: Audio toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular">
            <span>Expanded 200×200 Edition</span>
            <span aria-hidden="true">·</span>
            <span>Pop Culture, Film, Music & Lore</span>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isMuted ? 'Audio Muted' : 'Audio On'}</span>
          </button>
        </div>

        {/* Center Bespoke SVG Title Lockup & Scale/Mode Controls */}
        <div className="my-auto py-6 space-y-7 max-w-xl">
          {/* Bespoke Inline SVG Title Lockup */}
          <div className="space-y-3">
            <svg
              viewBox="0 0 520 116"
              className="w-full max-w-[460px] h-auto select-none"
              role="img"
              aria-label="The Colossal Crossword"
            >
              {/* Decorative Crossword Grid Emblem */}
              <g transform="translate(4, 10)">
                <rect x="0" y="0" width="92" height="92" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
                {/* 3x3 Mini Crossword Graphic */}
                <rect x="6" y="6" width="24" height="24" fill="#FAF7F0" />
                <rect x="34" y="6" width="24" height="24" fill="#FAF7F0" />
                <rect x="62" y="6" width="24" height="24" fill="#111827" />

                <rect x="6" y="34" width="24" height="24" fill="#F59E0B" />
                <rect x="34" y="34" width="24" height="24" fill="#FAF7F0" />
                <rect x="62" y="34" width="24" height="24" fill="#FAF7F0" />

                <rect x="6" y="62" width="24" height="24" fill="#111827" />
                <rect x="34" y="62" width="24" height="24" fill="#FAF7F0" />
                <rect x="62" y="62" width="24" height="24" fill="#FAF7F0" />

                <text x="18" y="23" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">B</text>
                <text x="46" y="23" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">I</text>
                <text x="18" y="51" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">G</text>
                <text x="46" y="51" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">G</text>
                <text x="74" y="51" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">E</text>
                <text x="46" y="79" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">R</text>
                <text x="74" y="79" textAnchor="middle" fill="#0F172A" fontSize="14" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">!</text>
              </g>

              {/* Editorial Serif Lockup */}
              <text
                x="114"
                y="28"
                fill="#F59E0B"
                fontSize="13"
                fontWeight="700"
                letterSpacing="3.5"
                fontFamily="JetBrains Mono, monospace"
              >
                THE GRAND CARTOGRAPHIC
              </text>
              <text
                x="112"
                y="68"
                fill="#F8FAFC"
                fontSize="42"
                fontWeight="700"
                fontFamily="Fraunces, Georgia, serif"
              >
                Colossal
              </text>
              <text
                x="112"
                y="102"
                fill="#E2E8F0"
                fontSize="34"
                fontWeight="500"
                fontStyle="italic"
                fontFamily="Fraunces, Georgia, serif"
              >
                Crossword Atlas
              </text>
            </svg>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
              A monumental interlocking word puzzle built on a 200×200 broadsheet canvas—4× the area of a 100×100 giant crossword, packed with Cinema, Pop Music, TV, Gaming, and World Lore.
            </p>
          </div>

          {/* Grid Scale Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-slate-400">
              01. Select Atlas Grid Scale
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {scales.map((sc) => {
                const info = SCALE_CONFIG[sc];
                const active = selectedScale === sc;
                return (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => onSelectScale(sc)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                      active
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{info.label}</div>
                      <div className="text-xs text-slate-400 font-mono-tabular mt-0.5">{info.sublabel}</div>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-amber-400 whitespace-nowrap shrink-0">
                      {active ? 'Selected' : 'Choose'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gameplay Mode Selector (Classic vs Quest Mode) */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              02. Choose Expedition Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onSelectMode('quest')}
                className={`px-3 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  initialMode === 'quest'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Quest Mode (Themed Chains)
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('classic')}
                className={`px-3 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  initialMode === 'classic'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Classic Mode (All Clues)
              </button>
            </div>
          </div>

          {/* Viewport Layout Selector (Full Atlas vs Stream 10x10) */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">
              03. Viewport Layout
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onSelectStreamLayout(false)}
                className={`px-3 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  !streamLayout
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Atlas Full Viewport
              </button>
              <button
                type="button"
                onClick={() => onSelectStreamLayout(true)}
                className={`px-3 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  streamLayout
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Stream Layout (12×12)
              </button>
            </div>
          </div>

          {/* Primary Start CTA */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={onStartGame}
              className="w-full py-3.5 px-6 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-base rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {hasSavedProgress && savedStats
                  ? `Resume Atlas (${savedStats.solvedWords.toLocaleString()} / ${savedStats.totalWords.toLocaleString()} Words Solved)`
                  : 'Enter The Colossal Grid'}
              </span>
            </button>
          </div>
        </div>

        {/* Single flat control-hint line matched to the genre */}
        <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-400 font-mono-tabular flex flex-wrap items-center justify-between gap-2">
          <span>Click/Drag Grid to Pan · Type A–Z to Fill · Space/Tab Switch Direction · Esc Menu</span>
          <span>Press Enter to Start</span>
        </div>
      </div>
    </div>
  );
};
