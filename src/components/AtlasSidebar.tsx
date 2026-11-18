import React, { useMemo, useState } from 'react';
import { CrosswordPuzzle, PlacedWord } from '../utils/crosswordGenerator';
import { CheckCircle2, Compass, PanelRightClose, Search, Sparkles, X } from 'lucide-react';

interface AtlasSidebarProps {
  puzzle: CrosswordPuzzle;
  mode: 'classic' | 'quest';
  onChangeMode: (mode: 'classic' | 'quest') => void;
  activeWord: PlacedWord | null;
  solvedWordIds: Set<string>;
  selectedSectorFilter: number | 'all';
  onChangeSectorFilter: (sectorId: number | 'all') => void;
  onSelectWord: (word: PlacedWord) => void;
  onSolveCurrentSectorDemo: (sectorId: number) => void;
  isDesktopOpen?: boolean;
  onToggleDesktop?: () => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const AtlasSidebar: React.FC<AtlasSidebarProps> = ({
  puzzle,
  mode,
  onChangeMode,
  activeWord,
  solvedWordIds,
  selectedSectorFilter,
  onChangeSectorFilter,
  onSelectWord,
  onSolveCurrentSectorDemo,
  isDesktopOpen = true,
  onToggleDesktop,
  isOpenOnMobile = false,
  onCloseMobile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'across' | 'down' | 'cryptic' | 'unsolved'>('all');
  const [selectedQuestId, setSelectedQuestId] = useState<number>(0);

  // Filter clues for Classic Mode
  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return puzzle.words.filter((w) => {
      if (selectedSectorFilter !== 'all' && w.sectorId !== selectedSectorFilter) {
        return false;
      }
      if (directionFilter === 'across' && w.direction !== 'across') return false;
      if (directionFilter === 'down' && w.direction !== 'down') return false;
      if (directionFilter === 'cryptic' && !w.isCryptic) return false;
      if (directionFilter === 'unsolved' && solvedWordIds.has(w.id)) return false;

      if (q) {
        const matchNum = String(w.number).includes(q);
        const matchClue = w.clue.toLowerCase().includes(q);
        const matchCat = w.category.toLowerCase().includes(q);
        return matchNum || matchClue || matchCat;
      }
      return true;
    });
  }, [puzzle.words, selectedSectorFilter, directionFilter, solvedWordIds, searchQuery]);

  // Limit rendered list in DOM to 120 items for instant scrolling even with 2,600+ clues
  const visibleClueList = useMemo(() => filteredWords.slice(0, 120), [filteredWords]);

  const currentQuest = puzzle.quests[selectedQuestId] || puzzle.quests[0];

  const handleWordClick = (w: PlacedWord) => {
    onSelectWord(w);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/75 z-40 lg:hidden"
        />
      )}

      <aside
        className={`${
          isOpenOnMobile
            ? 'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm shadow-2xl'
            : isDesktopOpen
            ? 'hidden lg:flex lg:w-80 xl:w-96'
            : 'hidden'
        } h-full bg-[#10151E] border-l border-slate-800 flex-col shrink-0 select-none`}
      >
        {/* Mode Switcher Tabs + Collapse / Mobile Close Controls */}
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 flex-1">
            <button
              type="button"
              onClick={() => onChangeMode('quest')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'quest'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Quest Mode ({puzzle.quests.length})
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('classic')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'classic'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Classic Clues ({puzzle.words.length.toLocaleString()})
            </button>
          </div>

          {onToggleDesktop && (
            <button
              type="button"
              onClick={onToggleDesktop}
              aria-label="Hide Side Clue Bar"
              title="Pop out / Hide Side Clue Bar"
              className="hidden lg:inline-flex p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close Clues Drawer"
              className="lg:hidden p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      {/* QUEST MODE VIEW */}
      {mode === 'quest' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quest Selector Dropdown & Sector Progress */}
          <div className="p-3.5 border-b border-slate-800 space-y-3 bg-slate-900/40">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="quest-select" className="text-xs font-medium text-slate-400">
                Active Expedition Quest
              </label>
              <span className="text-xs font-mono-tabular text-amber-400">
                {puzzle.quests.filter((q) => q.wordIds.every((id) => solvedWordIds.has(id))).length} / {puzzle.quests.length} Completed
              </span>
            </div>

            <select
              id="quest-select"
              value={selectedQuestId}
              onChange={(e) => setSelectedQuestId(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {puzzle.quests.map((q, idx) => {
                const doneCount = q.wordIds.filter((id) => solvedWordIds.has(id)).length;
                const isComplete = doneCount === q.wordIds.length && q.wordIds.length > 0;
                return (
                  <option key={q.id} value={idx}>
                    {isComplete ? '✓ ' : ''}
                    {q.subtitle} — {q.title} ({doneCount}/{q.wordIds.length})
                  </option>
                );
              })}
            </select>

            {currentQuest && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{currentQuest.title}</h3>
                  <button
                    type="button"
                    onClick={() => onSolveCurrentSectorDemo(currentQuest.sectorId)}
                    title="Auto-complete this quest's clues"
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Complete Quest</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {currentQuest.description}
                </p>
              </div>
            )}
          </div>

          {/* Quest Clue Steps List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
            {currentQuest?.wordIds.map((wordId, idx) => {
              const w = puzzle.wordMap[wordId];
              if (!w) return null;
              const isSolved = solvedWordIds.has(w.id);
              const isCurrent = activeWord?.id === w.id;

              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleWordClick(w)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-amber-500/15 text-white'
                      : isSolved
                      ? 'bg-emerald-950/20 text-slate-400 hover:bg-slate-900/60'
                      : 'hover:bg-slate-900/70 text-slate-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isSolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="inline-flex items-center justify-center w-4 h-4 text-[11px] font-mono-tabular font-bold text-amber-400">
                        {idx + 1}.
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono-tabular text-slate-400">
                      <span>
                        {w.number} {w.direction === 'across' ? 'Across' : 'Down'} · {w.category}
                      </span>
                      <span>R{w.row + 1}:C{w.col + 1}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isSolved ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {w.clue}
                    </p>
                    {isSolved && (
                      <div className="text-[11px] font-mono-tabular font-bold text-emerald-400 tracking-wider">
                        {w.word}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* CLASSIC CLUES VIEW */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search & Sector Filter Controls */}
          <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clue number, keyword, or topic..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by Cartographic Sector"
                value={selectedSectorFilter}
                onChange={(e) =>
                  onChangeSectorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="flex-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="all">All Sectors ({puzzle.words.length.toLocaleString()} Clues)</option>
                {puzzle.sectors.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-md border border-slate-800 overflow-x-auto">
              {(['all', 'across', 'down', 'cryptic', 'unsolved'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDirectionFilter(f)}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer capitalize whitespace-nowrap shrink-0 ${
                    directionFilter === f
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Virtual-sliced Clue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {visibleClueList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <Compass className="w-6 h-6 mx-auto text-slate-600" />
                <p>No clues match your current filter.</p>
              </div>
            ) : (
              visibleClueList.map((w) => {
                const isSolved = solvedWordIds.has(w.id);
                const isCurrent = activeWord?.id === w.id;

                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleWordClick(w)}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isCurrent
                        ? 'bg-amber-500/15 text-white'
                        : isSolved
                        ? 'bg-emerald-950/15 text-slate-500 hover:bg-slate-900/50'
                        : 'hover:bg-slate-900/60 text-slate-200'
                    }`}
                  >
                    <span className="font-mono-tabular text-xs font-bold text-amber-400 shrink-0 w-12">
                      {w.number}
                      {w.direction === 'across' ? 'A' : 'D'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-snug ${isSolved ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {w.clue}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono-tabular">
                        <span>{w.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>R{w.row + 1}:C{w.col + 1}</span>
                        {w.isCryptic && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-300">Cryptic</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            {filteredWords.length > 120 && (
              <div className="p-3 text-center text-[11px] text-slate-400 font-mono-tabular">
                Showing 120 of {filteredWords.length.toLocaleString()} matching clues · Refine search or sector above
              </div>
            )}
          </div>
        </div>
      )}
      </aside>
    </>
  );
};
