import React, { useEffect, useRef, useState } from 'react';
import { CrosswordPuzzle, PlacedWord } from '../utils/crosswordGenerator';
import { Compass, Maximize2, Minimize2, X } from 'lucide-react';

interface MiniMapProps {
  puzzle: CrosswordPuzzle;
  userGrid: Record<string, string>;
  activeWord: PlacedWord | null;
  viewportRect: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  onCenterCell: (row: number, col: number) => void;
  onClose?: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  puzzle,
  userGrid,
  activeWord,
  viewportRect,
  onCenterCell,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canvasSize = expanded ? 320 : 220;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { size, cells } = puzzle;
    const scale = canvasSize / size;

    // Dark cartographic slate background
    ctx.fillStyle = '#0F141C';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw sector grid hairlines
    const sectorsPerSide = Math.round(Math.sqrt(puzzle.sectors.length));
    const sectorSpan = size / sectorsPerSide;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.lineWidth = 1;
    for (let i = 1; i < sectorsPerSide; i++) {
      const pos = Math.floor(i * sectorSpan * scale) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvasSize, pos);
      ctx.stroke();
    }

    // Render every crossword cell
    const cellPx = Math.max(1, scale);
    for (let r = 0; r < size; r++) {
      const rowCells = cells[r];
      for (let c = 0; c < size; c++) {
        const cell = rowCells[c];
        if (!cell.solution) continue;

        const key = `${r},${c}`;
        const val = userGrid[key];

        if (val === cell.solution) {
          ctx.fillStyle = '#10B981'; // Emerald solved
        } else if (val) {
          ctx.fillStyle = '#60A5FA'; // Entered but unverified
        } else if (cell.isQuestCell) {
          ctx.fillStyle = '#D97706'; // Quest highlight
        } else {
          ctx.fillStyle = '#64748B'; // Unsolved playable square
        }

        ctx.fillRect(c * scale, r * scale, cellPx, cellPx);
      }
    }

    // Highlight active word on minimap
    if (activeWord) {
      ctx.fillStyle = '#FBBF24';
      const dr = activeWord.direction === 'down' ? 1 : 0;
      const dc = activeWord.direction === 'across' ? 1 : 0;
      for (let i = 0; i < activeWord.length; i++) {
        const r = activeWord.row + dr * i;
        const c = activeWord.col + dc * i;
        ctx.fillRect(c * scale - 0.5, r * scale - 0.5, Math.max(2.5, cellPx + 1), Math.max(2.5, cellPx + 1));
      }
    }

    // Draw current camera viewport reticle
    const vx = Math.max(0, viewportRect.startCol * scale);
    const vy = Math.max(0, viewportRect.startRow * scale);
    const vw = Math.min(canvasSize - vx, (viewportRect.endCol - viewportRect.startCol) * scale);
    const vh = Math.min(canvasSize - vy, (viewportRect.endRow - viewportRect.startRow) * scale);

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.strokeRect(vx, vy, Math.max(8, vw), Math.max(8, vh));
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.fillRect(vx, vy, Math.max(8, vw), Math.max(8, vh));
  }, [puzzle, userGrid, activeWord, viewportRect, canvasSize]);

  const handlePointerToGrid = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvasSize, e.clientX - rect.left));
    const y = Math.max(0, Math.min(canvasSize, e.clientY - rect.top));

    const targetCol = Math.floor((x / canvasSize) * puzzle.size);
    const targetRow = Math.floor((y / canvasSize) * puzzle.size);
    onCenterCell(targetRow, targetCol);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-2xl select-none">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">Atlas Radar ({puzzle.size}×{puzzle.size})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            title={expanded ? 'Compact Radar' : 'Expand Radar'}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close Atlas Radar"
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative rounded overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDragging(true);
            handlePointerToGrid(e);
          }}
          onPointerMove={(e) => {
            if (!isDragging) return;
            handlePointerToGrid(e);
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setIsDragging(false);
          }}
          className="block cursor-crosshair"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono-tabular">
        <span>R{Math.max(1, viewportRect.startRow + 1)} · C{Math.max(1, viewportRect.startCol + 1)}</span>
        <span className="text-amber-400/90">Click/Drag to Jump</span>
      </div>
    </div>
  );
};
