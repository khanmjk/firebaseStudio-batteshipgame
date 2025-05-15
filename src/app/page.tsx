
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { GameGrid, PlacedShip, ShipConfig, Player, GamePhase, CellState, ShotResult, ShipName } from '@/types';
import { BOARD_SIZE, SHIPS_TO_PLACE_CONFIG, ALL_SHIP_CONFIGS } from '@/types';
import {
  initializeGrid,
  canPlaceShip,
  placeShipOnGrid,
  placeAllComputerShips,
  processShot,
  checkGameOver,
  getShipPositions,
  getPreviewGrid,
  getFiredCoordinates,
} from '@/lib/game-logic';
import { getTargetCoordinates, type GetTargetCoordinatesInput } from '@/ai/flows/opponent-intelligence';
import { GameBoard } from '@/components/game-board';
import { ShipPlacementControls } from '@/components/ship-placement-controls';
import { GameStatusDisplay } from '@/components/game-status-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, RotateCcw, Play } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function NavalStandoffPage() {
  const [userGrid, setUserGrid] = useState<GameGrid>(() => initializeGrid());
  const [computerGrid, setComputerGrid] = useState<GameGrid>(() => initializeGrid());
  const [userShips, setUserShips] = useState<PlacedShip[]>([]);
  const [computerShips, setComputerShips] = useState<PlacedShip[]>([]);
  
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [currentPlayer, setCurrentPlayer] = useState<Player>('user');
  const [winner, setWinner] = useState<Player | null>(null);
  
  const [selectedShipConfig, setSelectedShipConfig] = useState<ShipConfig | null>(SHIPS_TO_PLACE_CONFIG[0]);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [shipsToPlace, setShipsToPlace] = useState(() => 
    SHIPS_TO_PLACE_CONFIG.map(ship => ({ ...ship, placedCount: 0, totalCount: 1 }))
  );
  const [previewUserGrid, setPreviewUserGrid] = useState<GameGrid>(userGrid);

  const [gameMessage, setGameMessage] = useState('Drag ships to your board. Press Space to rotate.');
  const [lastShotResult, setLastShotResult] = useState<ShotResult | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  const { toast } = useToast();
  let shipIdCounter = 0; // This will be reset in resetGameState

  const resetGameState = useCallback(() => {
    shipIdCounter = 0;
    const initialGrid = initializeGrid();
    setUserGrid(initialGrid);
    setPreviewUserGrid(initialGrid);
    setComputerGrid(initializeGrid());
    setUserShips([]);
    setComputerShips([]);
    setGamePhase('setup');
    setCurrentPlayer('user');
    setWinner(null);
    const firstShipToPlace = SHIPS_TO_PLACE_CONFIG.find(s => (shipsToPlace.find(sts => sts.name === s.name)?.placedCount ?? 0) < 1) || SHIPS_TO_PLACE_CONFIG[0];
    setSelectedShipConfig(firstShipToPlace);
    setOrientation('horizontal');
    setShipsToPlace(SHIPS_TO_PLACE_CONFIG.map(ship => ({ ...ship, placedCount: 0, totalCount: 1 })));
    setGameMessage('Drag ships to your board. Press Space to rotate.');
    setLastShotResult(null);
    setAiReasoning(null);
    setIsComputerThinking(false);
  }, []); // shipsToPlace removed as it's reset within

  useEffect(() => {
    resetGameState();
  }, [resetGameState]);
  
  useEffect(() => {
    // Update preview grid whenever base grid or orientation for selected ship changes
    setPreviewUserGrid(getPreviewGrid(userGrid, -1, -1, selectedShipConfig, orientation));
  }, [userGrid, selectedShipConfig, orientation]);


  const handleToggleOrientation = useCallback(() => {
    setOrientation(prev => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && gamePhase === 'setup') {
        event.preventDefault();
        handleToggleOrientation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gamePhase, handleToggleOrientation]);


  const handleCellHover = useCallback((row: number, col: number) => {
    if (gamePhase === 'setup' && selectedShipConfig) {
      setPreviewUserGrid(getPreviewGrid(userGrid, row, col, selectedShipConfig, orientation));
    }
  }, [gamePhase, selectedShipConfig, userGrid, orientation]);

  const handleCellLeave = useCallback(() => {
    if (gamePhase === 'setup') {
      setPreviewUserGrid(getPreviewGrid(userGrid, -1, -1, selectedShipConfig, orientation));
    }
  }, [gamePhase, userGrid, selectedShipConfig, orientation]);

  const handlePlaceShipOnBoard = useCallback((row: number, col: number, shipToPlace: ShipConfig) => {
    if (gamePhase !== 'setup') return;

    const currentShipPlacingStats = shipsToPlace.find(s => s.name === shipToPlace.name);
    if (!currentShipPlacingStats || currentShipPlacingStats.placedCount >= currentShipPlacingStats.totalCount) {
      setGameMessage(`All ${shipToPlace.name}s placed. Select another ship or start game.`);
      toast({ title: "Placement Limit", description: `All ${shipToPlace.name}s already placed.`, variant: "default" });
      return;
    }

    if (canPlaceShip(userGrid, row, col, shipToPlace.size, orientation)) {
      const positions = getShipPositions(row, col, shipToPlace.size, orientation);
      const newShip: PlacedShip = {
        id: `user-${shipToPlace.name}-${shipIdCounter++}`,
        name: shipToPlace.name,
        size: shipToPlace.size,
        positions,
        hits: [],
        isSunk: false,
        orientation,
      };
      
      const updatedUserGrid = placeShipOnGrid(userGrid, newShip);
      setUserGrid(updatedUserGrid);
      // Preview will update via useEffect listening to userGrid

      setUserShips(prev => [...prev, newShip]);

      const updatedShipsToPlace = shipsToPlace.map(s =>
        s.name === shipToPlace.name
          ? { ...s, placedCount: s.placedCount + 1 }
          : s
      );
      setShipsToPlace(updatedShipsToPlace);
      
      const nextShipTypeToPlace = SHIPS_TO_PLACE_CONFIG.find(sc => updatedShipsToPlace.find(s => s.name === sc.name)!.placedCount < 1);
      
      if (nextShipTypeToPlace) {
        setSelectedShipConfig(ALL_SHIP_CONFIGS[nextShipTypeToPlace.name]);
      } else {
        setSelectedShipConfig(null); 
         if (updatedShipsToPlace.every(s => s.placedCount >= s.totalCount)) {
           setGameMessage("All ships placed! Ready to start the game.");
         }
      }
      toast({ title: "Ship Placed", description: `${shipToPlace.name} deployed.`});
    } else {
      toast({ title: "Invalid Placement", description: "Cannot place ship here. It's out of bounds or overlaps another ship.", variant: "destructive" });
    }
    // Reset hover preview after drop attempt
    setPreviewUserGrid(getPreviewGrid(updatedUserGrid || userGrid, -1, -1, selectedShipConfig, orientation));
  }, [gamePhase, userGrid, shipsToPlace, orientation, toast, selectedShipConfig]);


  const handleShipDragStart = useCallback((event: React.DragEvent, shipConfig: ShipConfig) => {
    event.dataTransfer.setData('application/json', JSON.stringify(shipConfig));
    event.dataTransfer.effectAllowed = 'move';
    setSelectedShipConfig(shipConfig); // Update selected ship for preview and rotation context
  }, []);

  const handleCellDrop = useCallback((row: number, col: number, draggedShipConfig: ShipConfig) => {
    if (gamePhase === 'setup') {
      handlePlaceShipOnBoard(row, col, draggedShipConfig);
    }
  }, [gamePhase, handlePlaceShipOnBoard]);
  
  const allShipsPlaced = shipsToPlace.every(s => s.placedCount >= s.totalCount);

  const handleStartGame = useCallback(() => {
    if (!allShipsPlaced) {
      toast({ title: "Setup Incomplete", description: "Please place all your ships before starting.", variant: "destructive" });
      return;
    }
    const { ships: compShips, grid: compGrid } = placeAllComputerShips();
    setComputerShips(compShips);
    setComputerGrid(compGrid);
    setGamePhase('playing');
    setCurrentPlayer('user');
    setGameMessage("Game started! Your turn to fire.");
    setPreviewUserGrid(userGrid); // Finalize user grid view
  }, [allShipsPlaced, toast, userGrid]);

  const handleUserShot = useCallback((row: number, col: number) => {
    if (gamePhase !== 'playing' || currentPlayer !== 'user' || computerGrid[row][col].state !== 'empty') return;

    const { updatedGrid, updatedShips, shotResult } = processShot(computerGrid, computerShips, row, col);
    setComputerGrid(updatedGrid);
    setComputerShips(updatedShips);
    setLastShotResult(shotResult);
    setGameMessage(`You fired at (${row + 1}, ${col + 1}). It's a ${shotResult.type.toUpperCase()}!`);
    toast({ title: `Shot at (${row+1},${col+1})`, description: `Result: ${shotResult.type.toUpperCase()}${shotResult.shipName ? ` on ${shotResult.shipName}` : ''}`});


    if (checkGameOver(updatedShips)) {
      setGamePhase('gameOver');
      setWinner('user');
      setGameMessage("Congratulations! You've sunk all enemy ships!");
      return;
    }
    
    setCurrentPlayer('computer');
    setGameMessage("Opponent's turn.");
  }, [gamePhase, currentPlayer, computerGrid, computerShips, toast]);

  const handleComputerTurn = useCallback(async () => {
    if (gamePhase !== 'playing' || currentPlayer !== 'computer' || isComputerThinking) return;

    setIsComputerThinking(true);
    setGameMessage("Opponent is aiming...");

    const hitCoordinates = getFiredCoordinates(userGrid).filter(coord => userGrid[coord[0]][coord[1]].state === 'hit' || userGrid[coord[0]][coord[1]].state === 'sunk');
    const missCoordinates = getFiredCoordinates(userGrid).filter(coord => userGrid[coord[0]][coord[1]].state === 'miss');
    
    const aiInput: GetTargetCoordinatesInput = {
      boardSize: BOARD_SIZE,
      hitCoordinates: hitCoordinates,
      missCoordinates: missCoordinates,
    };

    try {
      const aiOutput = await getTargetCoordinates(aiInput);
      setAiReasoning(aiOutput.reasoning);
      
      const { row, column } = aiOutput;
      if (row < 0 || row >= BOARD_SIZE || column < 0 || column >= BOARD_SIZE || (userGrid[row][column].state !== 'empty' && userGrid[row][column].state !== 'ship')) {
        toast({ title: "AI Error", description: "AI targeted an invalid cell. This is a bug or needs fallback.", variant: "destructive"});
        setCurrentPlayer('user');
        setGameMessage("AI targeting error. Your turn.");
        setIsComputerThinking(false);
        return;
      }

      const { updatedGrid, updatedShips, shotResult } = processShot(userGrid, userShips, row, column);
      setUserGrid(updatedGrid); // This will trigger previewUserGrid update via useEffect if needed
      setUserShips(updatedShips);
      setLastShotResult(shotResult);
      setGameMessage(`Opponent fired at (${row + 1}, ${column + 1}). It's a ${shotResult.type.toUpperCase()}! ${aiOutput.reasoning}`);
      toast({ title: `Opponent shot at (${row+1},${column+1})`, description: `Result: ${shotResult.type.toUpperCase()}${shotResult.shipName ? ` on your ${shotResult.shipName}` : ''}`});

      if (checkGameOver(updatedShips)) {
        setGamePhase('gameOver');
        setWinner('computer');
        setGameMessage("Game Over! The opponent has sunk all your ships.");
      } else {
        setCurrentPlayer('user');
        setGameMessage("Your turn to fire.");
      }
    } catch (error) {
      console.error("Error getting AI target:", error);
      setGameMessage("Error with AI opponent. Your turn.");
      toast({ title: "AI Error", description: "Could not get opponent's move.", variant: "destructive"});
      setCurrentPlayer('user');
    } finally {
      setIsComputerThinking(false);
    }
  }, [gamePhase, currentPlayer, isComputerThinking, userGrid, userShips, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter font-mono text-primary">Naval Standoff</h1>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 flex flex-col items-center p-4 shadow-xl">
          <CardContent className="w-full space-y-4">
            <GameBoard
              grid={previewUserGrid} // Always show previewUserGrid for player board during setup and play
              onCellClick={undefined} // Click-to-place removed, use D&D
              onCellHover={gamePhase === 'setup' ? handleCellHover : undefined}
              onCellLeave={gamePhase === 'setup' ? handleCellLeave : undefined}
              onCellDrop={gamePhase === 'setup' ? handleCellDrop : undefined}
              isPlayerBoard={true}
              boardTitle={gamePhase === 'setup' ? "Deploy Your Fleet" : "Your Waters"}
              disabled={gamePhase !== 'setup' && gamePhase !== 'playing'} // Board active during setup (for D&D) and playing (for AI shots)
            />
            {gamePhase === 'setup' && (
              <ShipPlacementControls
                availableShips={shipsToPlace}
                selectedShipName={selectedShipConfig?.name || null}
                onSelectShip={(name) => setSelectedShipConfig(ALL_SHIP_CONFIGS[name])}
                onShipDragStart={handleShipDragStart}
                orientation={orientation}
                onToggleOrientation={handleToggleOrientation}
                allShipsPlaced={allShipsPlaced}
                onStartGame={handleStartGame}
                onResetPlacement={resetGameState}
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 flex flex-col items-center p-4 shadow-xl space-y-4">
            <GameStatusDisplay
              message={gameMessage}
              currentPlayer={currentPlayer}
              gamePhase={gamePhase}
              winner={winner}
              lastShotResult={lastShotResult}
              aiReasoning={aiReasoning}
            />
            {gamePhase === 'playing' && currentPlayer === 'computer' && (
              <Button onClick={handleComputerTurn} disabled={isComputerThinking} size="lg" className="w-full font-semibold">
                {isComputerThinking ? (
                  <><RotateCcw className="w-5 h-5 mr-2 animate-spin" /> Thinking...</>
                ) : (
                  <><Brain className="w-5 h-5 mr-2" /> Fire for Opponent</>
                )}
              </Button>
            )}
             {gamePhase === 'gameOver' && (
              <Button onClick={resetGameState} size="lg" className="w-full font-semibold">
                <Play className="w-5 h-5 mr-2" />
                Play Again
              </Button>
            )}
        </Card>

        <Card className="lg:col-span-1 flex flex-col items-center p-4 shadow-xl">
          <CardContent className="w-full">
            <GameBoard
              grid={computerGrid}
              onCellClick={gamePhase === 'playing' && currentPlayer === 'user' ? handleUserShot : undefined}
              isPlayerBoard={false}
              boardTitle="Enemy Waters"
              disabled={gamePhase !== 'playing' || currentPlayer !== 'user' || isComputerThinking}
            />
          </CardContent>
        </Card>
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Naval Standoff. Press Space to rotate ships during setup.</p>
      </footer>
    </div>
  );
}
