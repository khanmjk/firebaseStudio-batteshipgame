
"use client";

import type { GameGrid, GridCell, CellState, ShipConfig } from '@/types';
import { cn } from '@/lib/utils';
import { Flame, Waves, Skull, Ship, ShieldQuestion } from 'lucide-react'; 

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

const CellContent: React.FC<{ cell: GridCell; isPlayerBoard?: boolean; isOpponentBoardAndEmpty?: boolean }> = ({ cell, isPlayerBoard, isOpponentBoardAndEmpty }) => {
  const iconSize = "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"; 
  switch (cell.state) {
    case 'hit':
      return <Flame className={cn("text-accent-foreground", iconSize)} />;
    case 'miss':
      return <Waves className={cn("text-safe-miss-foreground", iconSize)} />;
    case 'sunk':
      return <Skull className={cn("text-destructive-foreground", iconSize)} />;
    case 'ship':
      return isPlayerBoard ? <Ship className={cn("text-secondary-foreground opacity-80", iconSize)} /> : null;
    case 'preview':
       return <div className="w-full h-full opacity-60 bg-primary rounded-sm" />; 
    case 'empty':
      return isOpponentBoardAndEmpty ? <ShieldQuestion className={cn("text-muted-foreground opacity-30", iconSize)} /> : null;
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
        return isPlayerBoard ? 'bg-secondary hover:bg-secondary/90' : 'bg-card hover:bg-card/80'; // Opponent ships are hidden
      case 'preview':
        return 'cell-ship-preview'; 
      case 'empty':
      default:
        return 'bg-card hover:bg-muted/50'; // Use muted for empty cells for subtle hover
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault(); 
    if (onCellDrop) { 
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
    <div className="flex flex-col items-center w-full">
      {boardTitle && <h2 className="text-2xl font-semibold mb-4 font-mono tracking-wider text-primary-foreground/90">{boardTitle}</h2>}
      <div 
        className="grid gap-1 bg-border p-1 rounded-md shadow-xl aspect-square w-full max-w-md sm:max-w-lg md:max-w-xl" // Ensure aspect-square and set max-width
        style={{ gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))` }}
        onMouseLeave={onCellLeave} 
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              disabled={disabled && !onCellDrop} 
              onClick={() => onCellClick?.(rowIndex, colIndex)}
              onMouseEnter={() => onCellHover?.(rowIndex, colIndex)}
              onDragOver={onCellDrop ? handleDragOver : undefined} 
              onDrop={onCellDrop ? (e) => handleDrop(e, rowIndex, colIndex) : undefined} 
              aria-label={`Cell ${rowIndex + 1}, ${colIndex + 1}: ${cell.state}. ${onCellDrop ? 'Drop target for ships.' : ''} ${onCellClick ? 'Click to fire.' : ''}`}
              className={cn(
                'aspect-square w-full flex items-center justify-center rounded-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                getCellClass(cell),
                (onCellClick && !disabled) ? 'cursor-crosshair' : (onCellDrop && !disabled ? 'cursor-grab' : 'cursor-default'),
                'min-w-[28px] min-h-[28px] sm:min-w-[36px] sm:min-h-[36px] md:min-w-[40px] md:min-h-[40px]' // Slightly increased min cell sizes
              )}
            >
              <CellContent cell={cell} isPlayerBoard={isPlayerBoard} isOpponentBoardAndEmpty={!isPlayerBoard && cell.state === 'empty'} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
