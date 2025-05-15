
"use client";

import * as React from 'react';
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

const CellContent: React.FC<{ cell: GridCell; isPlayerBoard?: boolean }> = ({ cell, isPlayerBoard }) => {
  const iconSize = "w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5"; 
  switch (cell.state) {
    case 'hit':
      return <Flame className={cn("text-accent-foreground", iconSize)} />;
    case 'miss':
      return <Waves className={cn("text-safe-miss-foreground", iconSize)} />;
    case 'sunk':
      return <Skull className={cn("text-destructive-foreground", iconSize)} />;
    case 'ship':
      // Only show ship icon if it's the player's board
      return isPlayerBoard ? <Ship className={cn("text-secondary-foreground opacity-80", iconSize)} /> : <ShieldQuestion className={cn("text-muted-foreground opacity-30", iconSize)} />;
    case 'preview':
       return <div className="w-full h-full opacity-60 bg-primary rounded-sm" />; 
    case 'empty':
      // Show question mark for opponent's empty/unrevealed cells
      return !isPlayerBoard ? <ShieldQuestion className={cn("text-muted-foreground opacity-30", iconSize)} /> : null;
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
        // For opponent's board, 'ship' cells look like 'empty' cells until hit
        return isPlayerBoard ? 'bg-secondary hover:bg-secondary/90' : 'bg-card hover:bg-muted/50';
      case 'preview':
        return 'cell-ship-preview'; 
      case 'empty':
      default:
        return 'bg-card hover:bg-muted/50';
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

  const labelBaseClass = "flex items-center justify-center text-xs font-mono text-muted-foreground select-none";

  return (
    <div className="flex flex-col items-center w-full">
      {boardTitle && <h2 className="text-xl sm:text-2xl font-semibold mb-2 font-mono tracking-wider text-primary-foreground/90">{boardTitle}</h2>}
      <div 
        className="grid bg-border p-0.5 rounded-md shadow-lg"
        style={{ 
          gridTemplateColumns: `minmax(16px, auto) repeat(${grid.length}, minmax(0, 1fr))`,
          gridTemplateRows: `minmax(16px, auto) repeat(${grid.length}, minmax(0, 1fr))`,
          width: 'fit-content', 
          gap: '2px', 
        }}
        onMouseLeave={onCellLeave} 
      >
        <div /> 
        
        {Array.from({ length: grid.length }).map((_, i) => (
          <div key={`col-header-${i}`} className={cn(labelBaseClass, "p-1")}>
            {i + 1}
          </div>
        ))}

        {grid.map((row, rowIndex) => (
          <React.Fragment key={`row-fragment-${rowIndex}`}>
            <div key={`row-header-${rowIndex}`} className={cn(labelBaseClass, "p-1")}>
              {String.fromCharCode(65 + rowIndex)}
            </div>
            {row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                disabled={disabled && !(onCellDrop && !disabled)}
                onClick={() => onCellClick?.(rowIndex, colIndex)}
                onMouseEnter={() => onCellHover?.(rowIndex, colIndex)}
                onDragOver={onCellDrop ? handleDragOver : undefined} 
                onDrop={onCellDrop ? (e) => handleDrop(e, rowIndex, colIndex) : undefined} 
                aria-label={`Cell ${String.fromCharCode(65 + rowIndex)}${colIndex + 1}: ${isPlayerBoard || cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk' ? cell.state : 'unknown'}. ${onCellDrop ? 'Drop target for ships.' : ''} ${onCellClick ? 'Click to fire.' : ''}`}
                className={cn(
                  'aspect-square w-full flex items-center justify-center rounded-sm transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background',
                  getCellClass(cell),
                  (onCellClick && !disabled) ? 'cursor-crosshair' : (onCellDrop && !disabled ? 'cursor-grab' : 'cursor-default'),
                  'min-w-[20px] min-h-[20px] sm:min-w-[28px] sm:min-h-[28px] md:min-w-[32px] md:min-h-[32px]'
                )}
              >
                <CellContent cell={cell} isPlayerBoard={isPlayerBoard} />
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
