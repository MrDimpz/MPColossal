import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CrosswordPuzzle,
  Direction,
  GridScale,
  PlacedWord,
  generateColossalCrossword
} from './utils/crosswordGenerator';
import { sound } from './utils/sound';
import { TitleScreen } from './components/TitleScreen';
import { CrosswordBoard } from './components/CrosswordBoard';
import { MiniMap } from './components/MiniMap';
import { AtlasSidebar } from './components/AtlasSidebar';
import { SummaryModal } from './components/SummaryModal';
import {
  ArrowLeftRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  HelpCircle,
  LocateFixed,
  Map as MapIcon,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Sparkles,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

interface SavedScaleState {
  userGrid: Record<string, string>;
  revealedCells: Record<string, boolean>;
  hintsUsed: number;
  elapsedSeconds: number;
}

const STORAGE_PREFIX = 'colossal_crossword_save_v1_';

interface DynamicClueTextProps {
  text: string;
  maxPx?: number;
  minPx?: number;
  centered?: boolean;
}

const DynamicClueText: React.FC<DynamicClueTextProps> = ({
  text,
  maxPx = 17,
  minPx = 9.5,
  centered = false
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(maxPx);

  const fitText = useCallback(() => {
    const box = boxRef.current;
    const p = textRef.current;
    if (!box || !p) return;
    if (box.clientHeight <= 0 || box.clientWidth <= 0) return;

    let size = maxPx;
    p.style.fontSize = `${size}px`;
    while (size > minPx && (p.scrollHeight > box.clientHeight || p.scrollWidth > box.clientWidth)) {
      size -= 0.5;
      p.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [maxPx, minPx]);

  useLayoutEffect(() => {
    fitText();
  }, [text, centered, fitText]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(fitText);
    ro.observe(box);
    return () => ro.disconnect();
  }, [fitText]);

  return (
    <div
      ref={boxRef}
      className={`w-full h-full flex items-center ${centered ? 'justify-center' : ''} overflow-hidden`}
    >
      <p
        ref={textRef}
        style={{ fontSize: `${fontSize}px` }}
        className={`w-full font-medium text-slate-100 leading-snug break-words ${
          centered ? 'text-center' : ''
        }`}
      >
        {text}
      </p>
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [scale, setScale] = useState<GridScale>('colossal');
  const [mode, setMode] = useState<'classic' | 'quest'>('quest');

  // Generate puzzle for current scale
  const puzzle: CrosswordPuzzle = useMemo(() => generateColossalCrossword(scale), [scale]);

  // Player state
  const [userGrid, setUserGrid] = useState<Record<string, string>>({});
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Active selection & camera
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({
    row: 10,
    col: 10
  });
  const [direction, setDirection] = useState<Direction>('across');
  const [cellSize, setCellSize] = useState<number>(48);
  const [showErrors, setShowErrors] = useState<boolean>(false);
  const [streamLayout, setStreamLayout] = useState<boolean>(false);
  const [streamGridWidthPx, setStreamGridWidthPx] = useState<number>(0);
  const [showRadarPopup, setShowRadarPopup] = useState<boolean>(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<number | 'all'>('all');
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.isMuted());

  const [panTarget, setPanTarget] = useState<{
    row: number;
    col: number;
    timestamp: number;
  } | null>(null);

  const [viewportRect, setViewportRect] = useState<{
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  }>({ startRow: 0, endRow: 20, startCol: 0, endCol: 25 });

  // Notification banner when a quest is completed
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const prevSolvedQuestsRef = useRef<number>(0);

  // Load saved progress when scale changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${scale}`);
      if (raw) {
        const parsed: SavedScaleState = JSON.parse(raw);
        setUserGrid(parsed.userGrid || {});
        setRevealedCells(parsed.revealedCells || {});
        setHintsUsed(parsed.hintsUsed || 0);
        setElapsedSeconds(parsed.elapsedSeconds || 0);
      } else {
        setUserGrid({});
        setRevealedCells({});
        setHintsUsed(0);
        setElapsedSeconds(0);
      }
    } catch {
      setUserGrid({});
      setRevealedCells({});
      setHintsUsed(0);
      setElapsedSeconds(0);
    }

    // Focus first word of Quest 0 or Word 0
    const firstWord = puzzle.words[0];
    if (firstWord) {
      setSelectedCell({ row: firstWord.row, col: firstWord.col });
      setDirection(firstWord.direction);
      setPanTarget({ row: firstWord.row, col: firstWord.col, timestamp: Date.now() });
    }
  }, [scale, puzzle]);

  // Save state to localStorage
  useEffect(() => {
    if (gameState === 'TITLE_MENU') return;
    try {
      const payload: SavedScaleState = {
        userGrid,
        revealedCells,
        hintsUsed,
        elapsedSeconds
      };
      localStorage.setItem(`${STORAGE_PREFIX}${scale}`, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [userGrid, revealedCells, hintsUsed, elapsedSeconds, scale, gameState]);

  // Session timer when actively playing
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameState]);

  // Compute solved words set
  const solvedWordIds = useMemo(() => {
    const set = new Set<string>();
    for (const w of puzzle.words) {
      const dr = w.direction === 'down' ? 1 : 0;
      const dc = w.direction === 'across' ? 1 : 0;
      let allMatch = true;
      for (let i = 0; i < w.length; i++) {
        const key = `${w.row + dr * i},${w.col + dc * i}`;
        if (userGrid[key] !== w.word[i]) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) {
        set.add(w.id);
      }
    }
    return set;
  }, [puzzle.words, userGrid]);

  // Check if any quest newly completed
  useEffect(() => {
    const completedQuests = puzzle.quests.filter(
      (q) => q.wordIds.length > 0 && q.wordIds.every((id) => solvedWordIds.has(id))
    ).length;

    if (completedQuests > prevSolvedQuestsRef.current && gameState === 'PLAYING') {
      sound.playQuestComplete();
      setToastMessage(`Expedition Quest Completed! (${completedQuests}/${puzzle.quests.length} Quests)`);
      const t = window.setTimeout(() => setToastMessage(null), 4000);
      prevSolvedQuestsRef.current = completedQuests;
      return () => window.clearTimeout(t);
    }
    prevSolvedQuestsRef.current = completedQuests;
  }, [solvedWordIds, puzzle.quests, gameState]);

  // Trigger Victory when all words solved
  useEffect(() => {
    if (
      gameState === 'PLAYING' &&
      puzzle.words.length > 0 &&
      solvedWordIds.size === puzzle.words.length
    ) {
      sound.playQuestComplete();
      setGameState('GAME_OVER');
    }
  }, [solvedWordIds.size, puzzle.words.length, gameState]);

  // Determine active word from selectedCell and direction
  const activeWord: PlacedWord | null = useMemo(() => {
    const cell = puzzle.cells[selectedCell.row]?.[selectedCell.col];
    if (!cell || !cell.solution) return null;

    if (direction === 'across' && cell.acrossWordId) {
      return puzzle.wordMap[cell.acrossWordId] || null;
    }
    if (direction === 'down' && cell.downWordId) {
      return puzzle.wordMap[cell.downWordId] || null;
    }
    const fallbackId = cell.acrossWordId || cell.downWordId;
    return fallbackId ? puzzle.wordMap[fallbackId] || null : null;
  }, [puzzle, selectedCell, direction]);

  // Keep direction synced if cell only has one valid direction
  useEffect(() => {
    const cell = puzzle.cells[selectedCell.row]?.[selectedCell.col];
    if (!cell || !cell.solution) return;
    if (direction === 'across' && !cell.acrossWordId && cell.downWordId) {
      setDirection('down');
    } else if (direction === 'down' && !cell.downWordId && cell.acrossWordId) {
      setDirection('across');
    }
  }, [puzzle.cells, selectedCell, direction]);

  const handleSelectCell = useCallback(
    (row: number, col: number, toggleDirectionIfSame = false) => {
      const cell = puzzle.cells[row]?.[col];
      if (!cell || !cell.solution) return;

      if (
        toggleDirectionIfSame &&
        row === selectedCell.row &&
        col === selectedCell.col
      ) {
        if (direction === 'across' && cell.downWordId) {
          setDirection('down');
          sound.playStep();
          return;
        }
        if (direction === 'down' && cell.acrossWordId) {
          setDirection('across');
          sound.playStep();
          return;
        }
      }

      setSelectedCell({ row, col });
      if (direction === 'across' && !cell.acrossWordId && cell.downWordId) {
        setDirection('down');
      } else if (direction === 'down' && !cell.downWordId && cell.acrossWordId) {
        setDirection('across');
      }
      sound.playStep();
    },
    [puzzle.cells, selectedCell, direction]
  );

  const handleSelectWord = useCallback((word: PlacedWord) => {
    setDirection(word.direction);
    setSelectedCell({ row: word.row, col: word.col });
    setPanTarget({
      row: word.row + (word.direction === 'down' ? Math.floor(word.length / 2) : 0),
      col: word.col + (word.direction === 'across' ? Math.floor(word.length / 2) : 0),
      timestamp: Date.now()
    });
    sound.playStep();
  }, []);

  const handleCenterCell = useCallback(
    (row: number, col: number) => {
      const clampedRow = Math.max(0, Math.min(puzzle.size - 1, row));
      const clampedCol = Math.max(0, Math.min(puzzle.size - 1, col));
      setPanTarget({ row: clampedRow, col: clampedCol, timestamp: Date.now() });

      // If the clicked cell or a nearby cell is a playable letter, select it
      for (let rad = 0; rad <= 6; rad++) {
        for (let dr = -rad; dr <= rad; dr++) {
          for (let dc = -rad; dc <= rad; dc++) {
            const nr = clampedRow + dr;
            const nc = clampedCol + dc;
            const cData = puzzle.cells[nr]?.[nc];
            if (cData && cData.solution) {
              setSelectedCell({ row: nr, col: nc });
              return;
            }
          }
        }
      }
    },
    [puzzle]
  );

  // Move cursor within active word or across grid
  const advanceCursorInWord = useCallback(
    (step: 1 | -1, updatedGrid?: Record<string, string>) => {
      if (!activeWord) return;
      const gridToUse = updatedGrid || userGrid;
      const dr = activeWord.direction === 'down' ? 1 : 0;
      const dc = activeWord.direction === 'across' ? 1 : 0;

      const currentOffset =
        activeWord.direction === 'down'
          ? selectedCell.row - activeWord.row
          : selectedCell.col - activeWord.col;

      if (step === 1) {
        // First look for next empty cell in this word
        for (let i = currentOffset + 1; i < activeWord.length; i++) {
          const r = activeWord.row + dr * i;
          const c = activeWord.col + dc * i;
          if (!gridToUse[`${r},${c}`]) {
            setSelectedCell({ row: r, col: c });
            return;
          }
        }
        // Otherwise step +1 if within word bounds
        if (currentOffset + 1 < activeWord.length) {
          setSelectedCell({
            row: activeWord.row + dr * (currentOffset + 1),
            col: activeWord.col + dc * (currentOffset + 1)
          });
        }
      } else {
        if (currentOffset - 1 >= 0) {
          setSelectedCell({
            row: activeWord.row + dr * (currentOffset - 1),
            col: activeWord.col + dc * (currentOffset - 1)
          });
        }
      }
    },
    [activeWord, selectedCell, userGrid]
  );

  // Input a letter A-Z into selected cell
  const handleLetterInput = useCallback(
    (letter: string) => {
      const char = letter.toUpperCase();
      const cell = puzzle.cells[selectedCell.row]?.[selectedCell.col];
      if (!cell || !cell.solution) return;

      const key = `${selectedCell.row},${selectedCell.col}`;
      const nextGrid = { ...userGrid, [key]: char };
      setUserGrid(nextGrid);

      // Check if this letter completed the active word
      if (activeWord) {
        const dr = activeWord.direction === 'down' ? 1 : 0;
        const dc = activeWord.direction === 'across' ? 1 : 0;
        let wordComplete = true;
        for (let i = 0; i < activeWord.length; i++) {
          const k = `${activeWord.row + dr * i},${activeWord.col + dc * i}`;
          if (nextGrid[k] !== activeWord.word[i]) {
            wordComplete = false;
            break;
          }
        }
        if (wordComplete && !solvedWordIds.has(activeWord.id)) {
          sound.playWordSolved();
        } else {
          sound.playKeyPress(char.charCodeAt(0) - 65);
        }
      } else {
        sound.playKeyPress(char.charCodeAt(0) - 65);
      }

      advanceCursorInWord(1, nextGrid);
    },
    [puzzle.cells, selectedCell, userGrid, activeWord, solvedWordIds, advanceCursorInWord]
  );

  // Backspace handler
  const handleBackspace = useCallback(() => {
    const key = `${selectedCell.row},${selectedCell.col}`;
    if (revealedCells[key]) {
      advanceCursorInWord(-1);
      return;
    }

    if (userGrid[key]) {
      const next = { ...userGrid };
      delete next[key];
      setUserGrid(next);
      sound.playBackspace();
    } else if (activeWord) {
      const dr = activeWord.direction === 'down' ? 1 : 0;
      const dc = activeWord.direction === 'across' ? 1 : 0;
      const currentOffset =
        activeWord.direction === 'down'
          ? selectedCell.row - activeWord.row
          : selectedCell.col - activeWord.col;

      if (currentOffset > 0) {
        const prevR = activeWord.row + dr * (currentOffset - 1);
        const prevC = activeWord.col + dc * (currentOffset - 1);
        const prevKey = `${prevR},${prevC}`;
        setSelectedCell({ row: prevR, col: prevC });
        if (!revealedCells[prevKey] && userGrid[prevKey]) {
          const next = { ...userGrid };
          delete next[prevKey];
          setUserGrid(next);
        }
        sound.playBackspace();
      }
    }
  }, [selectedCell, userGrid, revealedCells, activeWord, advanceCursorInWord]);

  // Step to next or previous word
  const stepToAdjacentWord = useCallback(
    (delta: 1 | -1) => {
      if (puzzle.words.length === 0) return;
      const currentIdx = activeWord
        ? puzzle.words.findIndex((w) => w.id === activeWord.id)
        : 0;
      const nextIdx = (currentIdx + delta + puzzle.words.length) % puzzle.words.length;
      handleSelectWord(puzzle.words[nextIdx]);
    },
    [puzzle.words, activeWord, handleSelectWord]
  );

  // Global keyboard shortcuts during PLAYING state
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setGameState('PAUSED');
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        stepToAdjacentWord(e.shiftKey ? -1 : 1);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        const cell = puzzle.cells[selectedCell.row]?.[selectedCell.col];
        if (direction === 'across' && cell?.downWordId) {
          setDirection('down');
          sound.playStep();
        } else if (direction === 'down' && cell?.acrossWordId) {
          setDirection('across');
          sound.playStep();
        }
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp'
      ) {
        e.preventDefault();
        const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        const dc = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;

        for (let dist = 1; dist < 15; dist++) {
          const nr = selectedCell.row + dr * dist;
          const nc = selectedCell.col + dc * dist;
          const target = puzzle.cells[nr]?.[nc];
          if (target && target.solution) {
            setSelectedCell({ row: nr, col: nc });
            sound.playStep();
            break;
          }
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleLetterInput(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    selectedCell,
    direction,
    puzzle.cells,
    handleLetterInput,
    handleBackspace,
    stepToAdjacentWord
  ]);

  // ---------------------------------------------------------------------------
  // 4-TIER ASSISTIVE HINT HANDLERS
  // ---------------------------------------------------------------------------

  // Tier 1: Reveal Start or End Letter of Active Word
  const handleHintStartOrEnd = () => {
    if (!activeWord) return;
    const dr = activeWord.direction === 'down' ? 1 : 0;
    const dc = activeWord.direction === 'across' ? 1 : 0;

    // Check first letter, then last letter, then first unrevealed letter
    const indices = [0, activeWord.length - 1];
    for (let i = 1; i < activeWord.length - 1; i++) indices.push(i);

    for (const idx of indices) {
      const r: number = activeWord.row + dr * idx;
      const c: number = activeWord.col + dc * idx;
      const key = `${r},${c}`;
      if (userGrid[key] !== activeWord.word[idx]) {
        setUserGrid((prev) => ({ ...prev, [key]: activeWord.word[idx] }));
        setRevealedCells((prev) => ({ ...prev, [key]: true }));
        setHintsUsed((h) => h + 1);
        setSelectedCell({ row: r, col: c });
        sound.playHint();
        return;
      }
    }
  };

  // Tier 2: Reveal Currently Focused Square
  const handleHintRevealCell = () => {
    const cell = puzzle.cells[selectedCell.row]?.[selectedCell.col];
    if (!cell || !cell.solution) return;
    const key = `${cell.row},${cell.col}`;
    setUserGrid((prev) => ({ ...prev, [key]: cell.solution }));
    setRevealedCells((prev) => ({ ...prev, [key]: true }));
    setHintsUsed((h) => h + 1);
    sound.playHint();
    advanceCursorInWord(1);
  };

  // Tier 3: Reveal Entire Active Word
  const handleHintRevealWord = () => {
    if (!activeWord) return;
    const dr = activeWord.direction === 'down' ? 1 : 0;
    const dc = activeWord.direction === 'across' ? 1 : 0;
    const nextGrid = { ...userGrid };
    const nextRevealed = { ...revealedCells };

    for (let i = 0; i < activeWord.length; i++) {
      const r = activeWord.row + dr * i;
      const c = activeWord.col + dc * i;
      const key = `${r},${c}`;
      nextGrid[key] = activeWord.word[i];
      nextRevealed[key] = true;
    }

    setUserGrid(nextGrid);
    setRevealedCells(nextRevealed);
    setHintsUsed((h) => h + 1);
    sound.playWordSolved();
  };

  // Complete a specific Quest's words
  const handleCompleteQuestWords = (sectorId: number) => {
    const quest = puzzle.quests.find((q) => q.sectorId === sectorId);
    if (!quest) return;
    const nextGrid = { ...userGrid };
    const nextRevealed = { ...revealedCells };

    for (const wId of quest.wordIds) {
      const w = puzzle.wordMap[wId];
      if (!w) continue;
      const dr = w.direction === 'down' ? 1 : 0;
      const dc = w.direction === 'across' ? 1 : 0;
      for (let i = 0; i < w.length; i++) {
        const key = `${w.row + dr * i},${w.col + dc * i}`;
        nextGrid[key] = w.word[i];
        nextRevealed[key] = true;
      }
    }
    setUserGrid(nextGrid);
    setRevealedCells(nextRevealed);
    setHintsUsed((h) => h + 1);
    sound.playQuestComplete();
  };

  // Reveal entire board (to inspect full solved atlas and trigger Victory summary)
  const handleAutoSolveEntireBoard = () => {
    const nextGrid: Record<string, string> = {};
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        const sol = puzzle.cells[r][c].solution;
        if (sol) {
          nextGrid[`${r},${c}`] = sol;
        }
      }
    }
    setUserGrid(nextGrid);
    sound.playQuestComplete();
    setGameState('GAME_OVER');
  };

  // Reset current board
  const handleRestartPuzzle = () => {
    setUserGrid({});
    setRevealedCells({});
    setHintsUsed(0);
    setElapsedSeconds(0);
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${scale}`);
    } catch {
      // Ignore storage error
    }
    setGameState('PLAYING');
  };

  const currentSector = useMemo(() => {
    const cell = puzzle.cells[selectedCell.row]?.[selectedCell.col];
    const sId = cell ? cell.sectorId : 0;
    return puzzle.sectors[sId % puzzle.sectors.length];
  }, [puzzle, selectedCell]);

  const handleChangeStreamLayout = useCallback(
    (enabled: boolean) => {
      setStreamLayout(enabled);
      if (enabled) {
        setIsDesktopSidebarOpen(false);
        setIsMobileSidebarOpen(false);
      }
      setPanTarget({
        row: selectedCell.row,
        col: selectedCell.col,
        timestamp: Date.now()
      });
    },
    [selectedCell.row, selectedCell.col]
  );

  // Render Title Screen when in TITLE_MENU state
  if (gameState === 'TITLE_MENU') {
    const hasProgress = Object.keys(userGrid).length > 0;
    return (
      <TitleScreen
        selectedScale={scale}
        onSelectScale={(newScale) => setScale(newScale)}
        initialMode={mode}
        onSelectMode={(m) => setMode(m)}
        streamLayout={streamLayout}
        onSelectStreamLayout={handleChangeStreamLayout}
        hasSavedProgress={hasProgress}
        savedStats={{
          solvedWords: solvedWordIds.size,
          totalWords: puzzle.words.length
        }}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(sound.toggleMute())}
        onStartGame={() => setGameState('PLAYING')}
      />
    );
  }

  const toggleActiveDirection = () => {
    const cell = puzzle.cells[selectedCell.row]?.[selectedCell.col];
    if (direction === 'across' && cell?.downWordId) {
      setDirection('down');
      sound.playStep();
    } else if (direction === 'down' && cell?.acrossWordId) {
      setDirection('across');
      sound.playStep();
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0E131B] text-slate-100 select-none">
      {/* Top Perimeter HUD Bar (Compressed in Stream Layout) */}
      <header
        className={`${
          streamLayout
            ? 'h-9 px-2.5 gap-2'
            : 'h-12 sm:h-13 px-2.5 sm:px-4 gap-2 sm:gap-4'
        } bg-[#10151F] border-b border-slate-800 flex items-center justify-between shrink-0 z-30`}
      >
        {/* Left: Brand & Active Sector Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setGameState('TITLE_MENU')}
            className={`${
              streamLayout ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } font-bold tracking-tight text-white hover:text-amber-300 transition-colors font-display whitespace-nowrap shrink-0 cursor-pointer`}
          >
            {streamLayout ? 'Colossal Crossword' : 'The Colossal Crossword'}
          </button>

          {streamLayout ? (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-tabular whitespace-nowrap">
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-semibold">12×12</span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-white">{solvedWordIds.size}</strong>/{puzzle.words.length}
              </span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono-tabular truncate">
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-medium">{puzzle.size}×{puzzle.size} Grid</span>
              <span aria-hidden="true">·</span>
              <span className="truncate text-slate-300">{currentSector?.name}</span>
            </div>
          )}
        </div>

        {/* Center: Tabular Progress Readout (Full Atlas Layout only) */}
        {!streamLayout && (
          <div className="hidden xl:flex items-center gap-3 text-xs font-mono-tabular text-slate-300">
            <span>
              Words: <strong className="text-white">{solvedWordIds.size.toLocaleString()}</strong> / {puzzle.words.length.toLocaleString()}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Squares: <strong className="text-white">{Object.keys(userGrid).length.toLocaleString()}</strong> / {puzzle.totalWhiteCells.toLocaleString()}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              Quests: <strong className="text-emerald-400">
                {puzzle.quests.filter((q) => q.wordIds.length > 0 && q.wordIds.every((id) => solvedWordIds.has(id))).length}
              </strong> / {puzzle.quests.length}
            </span>
          </div>
        )}

        {/* Right: Zoom, Center, Verify, Clues Drawer, Audio & Menu Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {!streamLayout && (
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setCellSize((s) => Math.max(32, s - 6))}
                title="Zoom Out Grid"
                className="p-1.5 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCellSize((s) => (s >= 60 ? 48 : 64))}
                title="Toggle Senior Jumbo 64px Type"
                className="px-1.5 sm:px-2 py-1 text-[11px] font-mono-tabular font-semibold text-amber-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {cellSize}px
              </button>
              <button
                type="button"
                onClick={() => setCellSize((s) => Math.min(72, s + 6))}
                title="Zoom In Grid"
                className="p-1.5 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              setPanTarget({
                row: selectedCell.row,
                col: selectedCell.col,
                timestamp: Date.now()
              })
            }
            title="Center Active Cell"
            className={`inline-flex items-center gap-1 ${
              streamLayout ? 'px-1.5 py-1 text-[11px]' : 'px-2 sm:px-2.5 py-1.5 text-xs'
            } font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap`}
          >
            <LocateFixed className="w-3.5 h-3.5 text-amber-400" />
            {!streamLayout && <span className="hidden sm:inline">Center</span>}
          </button>

          <button
            type="button"
            onClick={() => setShowErrors((prev) => !prev)}
            title="Highlight Incorrect Letters"
            className={`inline-flex items-center gap-1 ${
              streamLayout ? 'px-2 py-1 text-[11px]' : 'px-2 sm:px-2.5 py-1.5 text-xs'
            } font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
              showErrors
                ? 'bg-emerald-950/50 border-emerald-700/70 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className={streamLayout ? 'inline' : 'hidden sm:inline'}>Check</span>
          </button>

          {/* Side Clue Bar Pop-In/Out Toggle (Desktop & Mobile) */}
          <button
            type="button"
            onClick={() => setIsDesktopSidebarOpen((prev) => !prev)}
            title={isDesktopSidebarOpen ? 'Hide Side Clue Bar' : 'Show Side Clue Bar'}
            className={`hidden lg:inline-flex items-center gap-1 ${
              streamLayout ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
            } font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
              isDesktopSidebarOpen
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-slate-900 text-slate-200 border-slate-700 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isDesktopSidebarOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Clues</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            title="Open Quests & Clue List"
            className={`lg:hidden inline-flex items-center gap-1 ${
              streamLayout ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
            } font-semibold text-amber-300 bg-slate-900 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className={streamLayout ? 'inline' : 'hidden xs:inline'}>Clues</span>
          </button>

          {!streamLayout && (
            <button
              type="button"
              onClick={() => setIsMuted(sound.toggleMute())}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="hidden sm:inline-flex p-1.5 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setGameState('PAUSED')}
            className={`inline-flex items-center gap-1 ${
              streamLayout ? 'px-2 py-1 text-[11px]' : 'px-2.5 sm:px-3 py-1.5 text-xs'
            } font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors cursor-pointer whitespace-nowrap`}
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Playfield + Right Sidebar */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left/Center Playfield Column */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {streamLayout ? (
            /* STREAM LAYOUT TOP CLUE BANNER: Centered above grid, constrained to grid width, dynamically sized to fit */
            <div className="w-full bg-[#141A26] border-b border-slate-800 flex justify-center shrink-0 z-20 px-1.5">
              <button
                type="button"
                onClick={toggleActiveDirection}
                title="Click or press Space to toggle Across/Down"
                style={{
                  width: streamGridWidthPx > 0 ? `${streamGridWidthPx}px` : '100%',
                  maxWidth: '100%'
                }}
                className="px-2.5 py-2 hover:bg-[#182030] flex flex-col items-center justify-center gap-1 text-center transition-colors cursor-pointer"
              >
                {activeWord ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="font-mono-tabular text-[11px] font-bold text-slate-950 bg-amber-400 px-2 py-0.5 rounded whitespace-nowrap">
                        {activeWord.number} {activeWord.direction === 'across' ? 'ACROSS' : 'DOWN'}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-400 whitespace-nowrap">
                        {activeWord.category}
                      </span>
                    </div>
                    <div className="w-full h-11 sm:h-13">
                      <DynamicClueText
                        text={activeWord.clue}
                        centered
                        maxPx={16.5}
                        minPx={9}
                      />
                    </div>
                  </>
                ) : (
                  <div className="h-12 flex items-center justify-center text-sm text-slate-400 text-center">
                    Select any white square on the 12×12 grid to view its clue
                  </div>
                )}
              </button>
            </div>
          ) : (
            /* FULL ATLAS TOP CLUE BAR (Visible on Desktop/Tablet; hidden on small mobile so Grid stays at top on mobile) */
            <div className="hidden md:flex items-center justify-between gap-3 px-4 py-2 bg-[#141A26] border-b border-slate-800 shrink-0 z-20">
              <button
                type="button"
                onClick={() => stepToAdjacentWord(-1)}
                title="Previous Clue (Shift+Tab)"
                className="p-1.5 text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleActiveDirection}
                title="Click or press Space to toggle Across/Down"
                className="flex-1 min-w-0 flex items-center justify-between gap-4 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-md text-left transition-colors cursor-pointer"
              >
                {activeWord ? (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono-tabular text-xs font-bold text-slate-950 bg-amber-400 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                        {activeWord.number} {activeWord.direction.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-slate-100 truncate">
                        {activeWord.clue}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular whitespace-nowrap shrink-0">
                      <span>{activeWord.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>R{activeWord.row + 1}:C{activeWord.col + 1}</span>
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400 ml-1" />
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-slate-400">
                    Select any white square on the grid to inspect its clue
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => stepToAdjacentWord(1)}
                title="Next Clue (Tab)"
                className="p-1.5 text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 rounded-md transition-colors cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Interactive Crossword Viewport (12x12 window in Stream Layout, Full Fill in Atlas Layout) */}
          <div className="flex-1 relative min-h-0">
            <CrosswordBoard
              puzzle={puzzle}
              userGrid={userGrid}
              revealedCells={revealedCells}
              selectedCell={selectedCell}
              direction={direction}
              activeWord={activeWord}
              cellSize={cellSize}
              streamMode={streamLayout}
              showErrors={showErrors}
              panTarget={panTarget}
              onSelectCell={handleSelectCell}
              onViewportChange={setViewportRect}
              onStreamWidthChange={setStreamGridWidthPx}
            />

            {/* Quest Completion Toast Notification */}
            {toastMessage && (
              <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 px-4 py-2 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Pop-up Atlas Radar anchored above the bottom bar when toggled */}
            {showRadarPopup && (
              <div className="absolute bottom-3 right-3 z-30">
                <MiniMap
                  puzzle={puzzle}
                  userGrid={userGrid}
                  activeWord={activeWord}
                  viewportRect={viewportRect}
                  onCenterCell={handleCenterCell}
                  onClose={() => setShowRadarPopup(false)}
                />
              </div>
            )}

            {/* Right-edge pop-in tab when desktop Side Clue Bar is collapsed */}
            {!isDesktopSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsDesktopSidebarOpen(true)}
                title="Show Side Clue Bar"
                aria-label="Show Side Clue Bar"
                className="hidden lg:flex items-center gap-1.5 absolute top-1/2 -translate-y-1/2 right-0 z-30 pl-2 pr-1.5 py-3 bg-[#10151E]/95 hover:bg-slate-800 text-amber-300 border border-r-0 border-slate-700 rounded-l-lg shadow-xl transition-colors cursor-pointer"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bottom Bar: Buttons Underneath (Stream Layout) OR Clue + Hints (Full Atlas Layout) */}
          <div
            className={`bg-[#10151F] border-t border-slate-800 ${
              streamLayout ? 'px-2.5 py-2' : 'px-2.5 sm:px-4 py-2 space-y-2'
            } z-30 shrink-0`}
          >
            {!streamLayout && (
              /* Current Clue Bar Underneath Grid with Back (<) and Forward (>) Buttons Either Side */
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => stepToAdjacentWord(-1)}
                  aria-label="Previous Clue"
                  title="Previous Clue (Shift+Tab)"
                  className="min-w-[44px] min-h-[44px] px-3 flex items-center justify-center text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={toggleActiveDirection}
                  title="Tap to switch Across / Down direction"
                  className="flex-1 min-w-0 min-h-[44px] px-3 py-1.5 bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-lg flex flex-col justify-center text-left cursor-pointer transition-colors"
                >
                  {activeWord ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tabular text-[11px] font-bold text-amber-400 whitespace-nowrap">
                          {activeWord.number} {activeWord.direction.toUpperCase()} · {activeWord.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono-tabular whitespace-nowrap">
                          <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                          <span>Flip Dir</span>
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-100 line-clamp-2 leading-snug mt-0.5">
                        {activeWord.clue}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm text-slate-400">
                      Tap any square on the grid to view its clue
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => stepToAdjacentWord(1)}
                  aria-label="Next Clue"
                  title="Next Clue (Tab)"
                  className="min-w-[44px] min-h-[44px] px-3 flex items-center justify-center text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Action & Hint Buttons Underneath */}
            <div
              className={`flex items-center gap-1.5 flex-wrap ${
                streamLayout ? 'justify-center' : 'justify-center sm:justify-end'
              }`}
            >
              {streamLayout && (
                <>
                  <button
                    type="button"
                    onClick={() => stepToAdjacentWord(-1)}
                    aria-label="Previous Clue"
                    title="Previous Clue (Shift+Tab)"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleActiveDirection}
                    title="Switch Across / Down direction (Space)"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                    <span>Flip</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleHintStartOrEnd}
                disabled={!activeWord}
                title="Hint 1: Reveal the first or last letter of this word"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>{streamLayout ? '1. Edge' : '1. Edge Letter'}</span>
              </button>

              <button
                type="button"
                onClick={handleHintRevealCell}
                disabled={!activeWord}
                title="Hint 2: Reveal currently focused square"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>{streamLayout ? '2. Square' : '2. Reveal Square'}</span>
              </button>

              <button
                type="button"
                onClick={handleHintRevealWord}
                disabled={!activeWord}
                title="Hint 3: Reveal entire active word"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{streamLayout ? '3. Word' : '3. Reveal Word'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRadarPopup((prev) => !prev)}
                title="Toggle Pop-up Atlas Radar Minimap"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                  showRadarPopup
                    ? 'bg-amber-400 text-slate-950 border-amber-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>{streamLayout ? 'Radar' : 'Atlas Radar'}</span>
              </button>

              {streamLayout && (
                <button
                  type="button"
                  onClick={() => stepToAdjacentWord(1)}
                  aria-label="Next Clue"
                  title="Next Clue (Tab)"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Quest Mode & Classic Clues (Collapsible on Desktop, Slide-over Drawer on Mobile) */}
        <AtlasSidebar
          puzzle={puzzle}
          mode={mode}
          onChangeMode={setMode}
          activeWord={activeWord}
          solvedWordIds={solvedWordIds}
          selectedSectorFilter={selectedSectorFilter}
          onChangeSectorFilter={setSelectedSectorFilter}
          onSelectWord={handleSelectWord}
          onSolveCurrentSectorDemo={handleCompleteQuestWords}
          isDesktopOpen={isDesktopSidebarOpen}
          onToggleDesktop={() => setIsDesktopSidebarOpen((prev) => !prev)}
          isOpenOnMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Pause / Victory / Summary Modal */}
      <SummaryModal
        isOpen={gameState === 'PAUSED' || gameState === 'GAME_OVER'}
        isVictory={gameState === 'GAME_OVER'}
        puzzle={puzzle}
        solvedWordsCount={solvedWordIds.size}
        filledCellsCount={Object.keys(userGrid).length}
        hintsUsed={hintsUsed}
        elapsedSeconds={elapsedSeconds}
        streamLayout={streamLayout}
        onChangeStreamLayout={handleChangeStreamLayout}
        onClose={() => setGameState('PLAYING')}
        onRestartPuzzle={handleRestartPuzzle}
        onChangeScale={(newScale) => setScale(newScale)}
        onReturnToTitle={() => setGameState('TITLE_MENU')}
        onAutoSolveEntireBoard={handleAutoSolveEntireBoard}
      />
    </div>
  );
}
