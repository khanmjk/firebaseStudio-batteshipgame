
"use client";

import type { GameGrid, GridCell, CellState } from '@/types';
import { cn } from '@/lib/utils';
import { Flame, Waves, Skull, ShieldQuestion, Ship } from 'lucide-react'; // ShieldQuestion for hidden enemy ship, Ship for player ship

interface GameBoardProps {
  grid: GameGrid;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  onCellLeave?: () => void;
  isPlayerBoard?: boolean; // True if this board shows the player's own ships
  disabled?: boolean;
  boardTitle?: string;
}

const CellContent: React.FC<{ cell: GridCell; isPlayerBoard?: boolean }> = ({ cell, isPlayerBoard }) => {
  const iconSize = "w-4 h-4 sm:w-5 sm:h-5"; // Responsive icon size
  switch (cell.state) {
    case 'hit':
      return <Flame className={cn("text-accent-foreground", iconSize)} />;
    case 'miss':
      return <Waves className={cn("text-safe-miss-foreground", iconSize)} />;
    case 'sunk':
      return <Skull className={cn("text-destructive-foreground", iconSize)} />;
    case 'ship':
      return isPlayerBoard ? <Ship className={cn("text-secondary-foreground", iconSize)} /> : null; // Show player ship icon, hide opponent's
    case 'preview':
       return <div className="w-full h-full opacity-50 bg-primary rounded-sm" />; // Preview uses a div for full cell coverage
    default:
      return null;
  }
};

export function GameBoard({ grid, onCellClick, onCellHover, onCellLeave, isPlayerBoard = false, disabled = false, boardTitle }: GameBoardProps) {
  const getCellClass = (cell: GridCell): string => {
    switch (cell.state) {
      case 'hit':
        return 'bg-accent hover:bg-accent/90';
      case 'miss':
        return 'cell-miss hover:opacity-90'; // Uses custom class from globals.css
      case 'sunk':
        return 'bg-destructive hover:bg-destructive/90';
      case 'ship':
        return isPlayerBoard ? 'bg-secondary hover:bg-secondary/90' : 'bg-card hover:bg-card/80'; // Show ship color for player, default for opponent unless hit
      case 'preview':
        return 'cell-ship-preview'; // Uses custom class from globals.css
      case 'empty':
      default:
        return 'bg-card hover:bg-card/80';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {boardTitle && <h2 className="text-xl font-semibold mb-3 font-mono tracking-wider">{boardTitle}</h2>}
      <div 
        className="grid gap-0.5 sm:gap-1 bg-border p-0.5 sm:p-1 rounded-md shadow-lg"
        style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
        onMouseLeave={onCellLeave}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              disabled={disabled || (onCellClick === undefined)}
              onClick={() => onCellClick?.(rowIndex, colIndex)}
              onMouseEnter={() => onCellHover?.(rowIndex, colIndex)}
              aria-label={`Cell ${rowIndex + 1}, ${colIndex + 1}: ${cell.state}`}
              className={cn(
                'aspect-square w-full flex items-center justify-center rounded-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background',
                getCellClass(cell),
                (onCellClick && !disabled) ? 'cursor-pointer' : 'cursor-default',
                'min-w-[24px] min-h-[24px] sm:min-w-[32px] sm:min-h-[32px] md:min-w-[36px] md:min-h-[36px]' // Responsive cell size
              )}
            >
              <CellContent cell={cell} isPlayerBoard={isPlayerBoard} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
