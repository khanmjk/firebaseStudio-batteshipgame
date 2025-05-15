
"use client";

import type { GameGrid, GridCell, CellState, ShipConfig } from '@/types';
import { cn } from '@/lib/utils';
import { Flame, Waves, Skull, Ship } from 'lucide-react'; 

interface GameBoardProps {
  grid: GameGrid;
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number) => void;
  onCellLeave?: () => void;
  onCellDrop?: (row: number, col: number, shipConfig: ShipConfig) => void;
  isPlayerBoard?: boolean;
  disabled?: boolean;
  boardTitle?: string;
}

const CellContent: React.FC<{ cell: GridCell; isPlayerBoard?: boolean }> = ({ cell, isPlayerBoard }) => {
  const iconSize = "w-4 h-4 sm:w-5 sm:h-5"; 
  switch (cell.state) {
    case 'hit':
      return <Flame className={cn("text-accent-foreground", iconSize)} />;
    case 'miss':
      return <Waves className={cn("text-safe-miss-foreground", iconSize)} />;
    case 'sunk':
      return <Skull className={cn("text-destructive-foreground", iconSize)} />;
    case 'ship':
      return isPlayerBoard ? <Ship className={cn("text-secondary-foreground", iconSize)} /> : null;
    case 'preview':
       return <div className="w-full h-full opacity-50 bg-primary rounded-sm" />; 
    default:
      return null;
  }
};

export function GameBoard({ 
  grid, 
  onCellClick, 
  onCellHover, 
  onCellLeave, 
  onCellDrop,
  isPlayerBoard = false, 
  disabled = false, 
  boardTitle 
}: GameBoardProps) {
  const getCellClass = (cell: GridCell): string => {
    switch (cell.state) {
      case 'hit':
        return 'bg-accent hover:bg-accent/90';
      case 'miss':
        return 'cell-miss hover:opacity-90';
      case 'sunk':
        return 'bg-destructive hover:bg-destructive/90';
      case 'ship':
        return isPlayerBoard ? 'bg-secondary hover:bg-secondary/90' : 'bg-card hover:bg-card/80';
      case 'preview':
        return 'cell-ship-preview'; 
      case 'empty':
      default:
        return 'bg-card hover:bg-card/80';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    if (onCellDrop) { // Only add visual cue if it's a droppable area
        event.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLButtonElement>, row: number, col: number) => {
    event.preventDefault();
    if (onCellDrop) {
      const shipConfigData = event.dataTransfer.getData("application/json");
      if (shipConfigData) {
        try {
          const shipConfig = JSON.parse(shipConfigData) as ShipConfig;
          onCellDrop(row, col, shipConfig);
        } catch (e) {
          console.error("Failed to parse dragged ship data:", e);
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      {boardTitle && <h2 className="text-xl font-semibold mb-3 font-mono tracking-wider">{boardTitle}</h2>}
      <div 
        className="grid gap-0.5 sm:gap-1 bg-border p-0.5 sm:p-1 rounded-md shadow-lg"
        style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
        onMouseLeave={onCellLeave} // For clearing hover previews
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              disabled={disabled && !onCellDrop} // Disable button interaction unless it's a drop target during setup
              onClick={() => onCellClick?.(rowIndex, colIndex)}
              onMouseEnter={() => onCellHover?.(rowIndex, colIndex)}
              onDragOver={onCellDrop ? handleDragOver : undefined} // Only allow drag over if onCellDrop is provided
              onDrop={onCellDrop ? (e) => handleDrop(e, rowIndex, colIndex) : undefined} // Only handle drop if onCellDrop is provided
              aria-label={`Cell ${rowIndex + 1}, ${colIndex + 1}: ${cell.state}. ${onCellDrop ? 'Drop target for ships.' : ''} ${onCellClick ? 'Click to fire.' : ''}`}
              className={cn(
                'aspect-square w-full flex items-center justify-center rounded-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background',
                getCellClass(cell),
                (onCellClick && !disabled) ? 'cursor-crosshair' : (onCellDrop ? 'cursor-alias' : 'cursor-default'), // Crosshair for shooting, alias for D&D
                'min-w-[24px] min-h-[24px] sm:min-w-[32px] sm:min-h-[32px] md:min-w-[36px] md:min-h-[36px]' 
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
