import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CellData, CrosswordPuzzle, Direction, PlacedWord } from '../utils/crosswordGenerator';

interface CrosswordBoardProps {
  puzzle: CrosswordPuzzle;
  userGrid: Record<string, string>;
  revealedCells: Record<string, boolean>;
  selectedCell: { row: number; col: number };
  direction: Direction;
  activeWord: PlacedWord | null;
  cellSize: number;
  streamMode?: boolean;
  showErrors: boolean;
  panTarget: { row: number; col: number; timestamp: number } | null;
  onSelectCell: (row: number, col: number, toggleDirectionIfSame?: boolean) => void;
  onViewportChange: (rect: { startRow: number; endRow: number; startCol: number; endCol: number }) => void;
  onStreamWidthChange?: (widthPx: number) => void;
}

export const CrosswordBoard: React.FC<CrosswordBoardProps> = ({
  puzzle,
  userGrid,
  revealedCells,
  selectedCell,
  activeWord,
  cellSize,
  streamMode = false,
  showErrors,
  panTarget,
  onSelectCell,
  onViewportChange,
  onStreamWidthChange
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stageDims, setStageDims] = useState<{ width: number; height: number }>({
    width: 1000,
    height: 700
  });
  const [containerDims, setContainerDims] = useState<{ width: number; height: number }>({
    width: 1000,
    height: 700
  });

  // Dragging state for smooth pan across the giant grid
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
    moved: false
  });

  const streamCellSize = useMemo(() => {
    const avail = Math.min(stageDims.width - 16, stageDims.height - 16);
    return Math.max(22, Math.min(64, Math.floor(avail / 12)));
  }, [stageDims.width, stageDims.height]);

  const activeCellSize = streamMode ? streamCellSize : cellSize;
  const streamBoardPx = streamCellSize * 12;
  const totalBoardPx = puzzle.size * activeCellSize;

  useEffect(() => {
    if (streamMode && onStreamWidthChange) {
      onStreamWidthChange(streamBoardPx + 4);
    }
  }, [streamMode, streamBoardPx, onStreamWidthChange]);

  const clampPan = useCallback(
    (x: number, y: number, viewW: number, viewH: number) => {
      const minX = totalBoardPx <= viewW ? (viewW - totalBoardPx) / 2 : viewW - totalBoardPx;
      const maxX = totalBoardPx <= viewW ? (viewW - totalBoardPx) / 2 : 0;
      const minY = totalBoardPx <= viewH ? (viewH - totalBoardPx) / 2 : viewH - totalBoardPx;
      const maxY = totalBoardPx <= viewH ? (viewH - totalBoardPx) / 2 : 0;
      return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y))
      };
    },
    [totalBoardPx]
  );

  // Measure outer stage for Stream Mode 10x10 sizing
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateStage = () => {
      setStageDims({
        width: el.clientWidth || 1000,
        height: el.clientHeight || 700
      });
    };
    updateStage();
    const ro = new ResizeObserver(updateStage);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure viewport container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setContainerDims({
        width: el.clientWidth || 1000,
        height: el.clientHeight || 700
      });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [streamMode, streamBoardPx]);

  // Re-clamp pan whenever viewport dimensions or zoom level change so edges stay flush with the screen
  useEffect(() => {
    setPan((prev) => {
      const clamped = clampPan(prev.x, prev.y, containerDims.width, containerDims.height);
      if (clamped.x === prev.x && clamped.y === prev.y) return prev;
      return clamped;
    });
  }, [containerDims.width, containerDims.height, clampPan]);

  // Center a specific cell when panTarget changes
  useEffect(() => {
    if (!panTarget) return;
    const targetX = containerDims.width / 2 - (panTarget.col + 0.5) * activeCellSize;
    const targetY = containerDims.height / 2 - (panTarget.row + 0.5) * activeCellSize;
    setPan(clampPan(targetX, targetY, containerDims.width, containerDims.height));
  }, [panTarget, activeCellSize, containerDims.width, containerDims.height, clampPan]);

  // Keep selected cell comfortably inside viewport when typing/moving with arrows
  useEffect(() => {
    setPan((prev) => {
      const cellLeft = selectedCell.col * activeCellSize + prev.x;
      const cellRight = cellLeft + activeCellSize;
      const cellTop = selectedCell.row * activeCellSize + prev.y;
      const cellBottom = cellTop + activeCellSize;

      const padX = streamMode ? activeCellSize * 1.5 : Math.min(140, containerDims.width * 0.22);
      const padY = streamMode ? activeCellSize * 1.5 : Math.min(120, containerDims.height * 0.22);

      let nextX = prev.x;
      let nextY = prev.y;

      if (cellLeft < padX) {
        nextX += padX - cellLeft;
      } else if (cellRight > containerDims.width - padX) {
        nextX -= cellRight - (containerDims.width - padX);
      }

      if (cellTop < padY) {
        nextY += padY - cellTop;
      } else if (cellBottom > containerDims.height - padY) {
        nextY -= cellBottom - (containerDims.height - padY);
      }

      const clamped = clampPan(nextX, nextY, containerDims.width, containerDims.height);
      if (clamped.x === prev.x && clamped.y === prev.y) return prev;
      return clamped;
    });
  }, [selectedCell.row, selectedCell.col, activeCellSize, streamMode, containerDims.width, containerDims.height, clampPan]);

  // Compute visible window of rows and columns (virtualized rendering for 60fps performance)
  const visibleBounds = useMemo(() => {
    const buffer = streamMode ? 1 : 3;
    const startCol = Math.max(0, Math.floor(-pan.x / activeCellSize) - buffer);
    const endCol = Math.min(
      puzzle.size - 1,
      Math.ceil((containerDims.width - pan.x) / activeCellSize) + buffer
    );
    const startRow = Math.max(0, Math.floor(-pan.y / activeCellSize) - buffer);
    const endRow = Math.min(
      puzzle.size - 1,
      Math.ceil((containerDims.height - pan.y) / activeCellSize) + buffer
    );
    return { startRow, endRow, startCol, endCol };
  }, [pan.x, pan.y, activeCellSize, streamMode, containerDims.width, containerDims.height, puzzle.size]);

  useEffect(() => {
    onViewportChange(visibleBounds);
  }, [visibleBounds, onViewportChange]);

  // Set of coordinates belonging to the active word for instant O(1) lookup
  const activeWordCoords = useMemo(() => {
    const set = new Set<string>();
    if (!activeWord) return set;
    const dr = activeWord.direction === 'down' ? 1 : 0;
    const dc = activeWord.direction === 'across' ? 1 : 0;
    for (let i = 0; i < activeWord.length; i++) {
      set.add(`${activeWord.row + dr * i},${activeWord.col + dc * i}`);
    }
    return set;
  }, [activeWord]);

  // Render only visible cells in DOM
  const visibleCells: CellData[] = useMemo(() => {
    const list: CellData[] = [];
    for (let r = visibleBounds.startRow; r <= visibleBounds.endRow; r++) {
      const rowArr = puzzle.cells[r];
      if (!rowArr) continue;
      for (let c = visibleBounds.startCol; c <= visibleBounds.endCol; c++) {
        list.push(rowArr[c]);
      }
    }
    return list;
  }, [puzzle.cells, visibleBounds]);

  // Sector boundary lines for visual cartographic orientation
  const sectorsPerSide = Math.round(Math.sqrt(puzzle.sectors.length));
  const sectorSpan = puzzle.size / sectorsPerSide;

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPan((prev) =>
      clampPan(prev.x - e.deltaX, prev.y - e.deltaY, containerDims.width, containerDims.height)
    );
  };

  return (
    <div
      ref={stageRef}
      className={`relative w-full h-full overflow-hidden bg-[#131822] ${
        streamMode ? 'flex items-center justify-center p-1.5' : ''
      }`}
    >
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={(e) => {
          if (e.button !== 0 && e.button !== 1) return;
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            initialPanX: pan.x,
            initialPanY: pan.y,
            moved: false
          };
        }}
        onPointerMove={(e) => {
          if (!dragRef.current.active) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            dragRef.current.moved = true;
          }
          if (dragRef.current.moved) {
            setPan(
              clampPan(
                dragRef.current.initialPanX + dx,
                dragRef.current.initialPanY + dy,
                containerDims.width,
                containerDims.height
              )
            );
          }
        }}
        onPointerUp={() => {
          dragRef.current.active = false;
        }}
        onPointerLeave={() => {
          dragRef.current.active = false;
        }}
        style={
          streamMode
            ? { width: `${streamBoardPx}px`, height: `${streamBoardPx}px` }
            : undefined
        }
        className={`relative overflow-hidden bg-[#131822] cursor-grab active:cursor-grabbing select-none ${
          streamMode
            ? 'border-2 border-amber-500/60 rounded-sm shadow-2xl shrink-0'
            : 'w-full h-full'
        }`}
      >
      {/* Subtle radial desk lamp ambiance */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.92) 100%)'
        }}
      />

      {/* Transformed Virtual Board Layer */}
      <div
        className="absolute top-0 left-0 will-change-transform"
        style={{
          width: `${totalBoardPx}px`,
          height: `${totalBoardPx}px`,
          transform: `translate3d(${Math.round(pan.x)}px, ${Math.round(pan.y)}px, 0)`
        }}
      >
        {/* Cartographic outer brass border */}
        <div className="pointer-events-none absolute -inset-2 border-2 border-amber-500/40 rounded-sm bg-[#0D1119] shadow-2xl" />

        {/* Sector Watermark Banners at top-left of each sector */}
        {puzzle.sectors.map((sec, idx) => {
          const sRow = Math.floor(idx / sectorsPerSide);
          const sCol = idx % sectorsPerSide;
          const topPx = sRow * sectorSpan * activeCellSize;
          const leftPx = sCol * sectorSpan * activeCellSize;
          const spanPx = sectorSpan * activeCellSize;

          return (
            <div
              key={sec.id}
              className="pointer-events-none absolute border border-amber-500/20"
              style={{
                top: `${topPx}px`,
                left: `${leftPx}px`,
                width: `${spanPx}px`,
                height: `${spanPx}px`
              }}
            >
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-950/90 border-b border-r border-amber-500/30 text-[11px] font-mono-tabular tracking-wide text-amber-300/90">
                <span>{sec.name}</span>
              </div>
            </div>
          );
        })}

        {/* Virtualized Interactive Grid Cells */}
        {visibleCells.map((cell) => {
          const key = `${cell.row},${cell.col}`;
          const top = cell.row * activeCellSize;
          const left = cell.col * activeCellSize;

          // Black block cell
          if (!cell.solution) {
            return (
              <div
                key={key}
                style={{
                  top: `${top}px`,
                  left: `${left}px`,
                  width: `${activeCellSize}px`,
                  height: `${activeCellSize}px`
                }}
                className="absolute bg-[#141923] border border-[#1E2636]/70"
              />
            );
          }

          const isSelected =
            selectedCell.row === cell.row && selectedCell.col === cell.col;
          const isInActiveWord = activeWordCoords.has(key);
          const userVal = userGrid[key] || '';
          const isRevealed = !!revealedCells[key];
          const isCorrect = userVal !== '' && userVal === cell.solution;
          const isWrong = showErrors && userVal !== '' && userVal !== cell.solution;

          let bgClass = 'bg-[#FAF7F0] text-slate-900 hover:bg-[#F3EFE2]';
          if (isSelected) {
            bgClass = 'bg-amber-400 text-slate-950 ring-2 ring-amber-600 z-20';
          } else if (isInActiveWord) {
            bgClass = 'bg-amber-100 text-slate-950 z-10';
          } else if (isCorrect && showErrors) {
            bgClass = 'bg-emerald-50 text-emerald-950';
          } else if (cell.isQuestCell) {
            bgClass = 'bg-[#F6EFE0] text-slate-900';
          }

          const numberFontSize = Math.max(10, Math.round(activeCellSize * 0.252));
          const letterFontSize = Math.max(17, Math.round(activeCellSize * 0.624));
          const letterMarginTop = Math.max(3, Math.round(activeCellSize * 0.11));

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (dragRef.current.moved) return;
                onSelectCell(cell.row, cell.col, true);
              }}
              aria-label={`Row ${cell.row + 1}, Column ${cell.col + 1}${cell.number ? `, Clue number ${cell.number}` : ''}${userVal ? `, Letter ${userVal}` : ', Empty'}`}
              style={{
                top: `${top}px`,
                left: `${left}px`,
                width: `${activeCellSize}px`,
                height: `${activeCellSize}px`
              }}
              className={`absolute flex items-center justify-center border border-slate-400/80 transition-transform duration-100 focus:outline-none cursor-pointer ${bgClass}`}
            >
              {/* Clue Number */}
              {cell.number !== undefined && (
                <span
                  style={{ fontSize: `${numberFontSize}px` }}
                  className="pointer-events-none absolute top-0.5 left-1 leading-none font-grid font-bold text-slate-700"
                >
                  {cell.number}
                </span>
              )}

              {/* Quest Marker Corner Triangle */}
              {cell.isQuestCell && !isSelected && (
                <span
                  title="Quest Word Square"
                  className="pointer-events-none absolute top-0.5 right-0.5 w-2 h-2 border-t-4 border-r-4 border-amber-600/80"
                />
              )}

              {/* Revealed / Hint Corner Indicator */}
              {isRevealed && (
                <span
                  title="Revealed via Hint"
                  className="pointer-events-none absolute bottom-0.5 right-1 text-[9px] font-mono-tabular font-bold text-emerald-700"
                >
                  ★
                </span>
              )}

              {/* Entered Letter */}
              <span
                style={{ fontSize: `${letterFontSize}px`, marginTop: `${letterMarginTop}px` }}
                className={`pointer-events-none font-grid font-bold leading-none ${
                  isWrong
                    ? 'text-red-600 line-through decoration-2'
                    : isRevealed
                    ? 'text-emerald-800'
                    : 'text-slate-900'
                }`}
              >
                {userVal}
              </span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
};
