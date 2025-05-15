
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
import { Ship, Crosshair, Brain, RotateCcw, Play } from 'lucide-react';
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

  const [gameMessage, setGameMessage] = useState('Place your ships to begin.');
  const [lastShotResult, setLastShotResult] = useState<ShotResult | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  const { toast } = useToast();
  let shipIdCounter = 0;

  const resetGameState = useCallback(() => {
    shipIdCounter = 0;
    const initialGrid = initializeGrid();
    setUserGrid(initialGrid);
    setPreviewUserGrid(initialGrid); // Reset preview grid as well
    setComputerGrid(initializeGrid());
    setUserShips([]);
    setComputerShips([]);
    setGamePhase('setup');
    setCurrentPlayer('user');
    setWinner(null);
    setSelectedShipConfig(SHIPS_TO_PLACE_CONFIG[0]);
    setOrientation('horizontal');
    setShipsToPlace(SHIPS_TO_PLACE_CONFIG.map(ship => ({ ...ship, placedCount: 0, totalCount: 1 })));
    setGameMessage('Place your ships to begin.');
    setLastShotResult(null);
    setAiReasoning(null);
    setIsComputerThinking(false);
  }, []);

  useEffect(() => {
    resetGameState();
  }, [resetGameState]);
  
  useEffect(() => {
    setPreviewUserGrid(getPreviewGrid(userGrid, -1, -1, null, orientation)); // Initialize preview grid
  }, [userGrid, orientation]);


  const handleCellHover = (row: number, col: number) => {
    if (gamePhase === 'setup' && selectedShipConfig) {
      setPreviewUserGrid(getPreviewGrid(userGrid, row, col, selectedShipConfig, orientation));
    }
  };

  const handleCellLeave = () => {
    if (gamePhase === 'setup') {
       // Reset preview to show only placed ships without hover effect
      setPreviewUserGrid(getPreviewGrid(userGrid, -1, -1, null, orientation));
    }
  };

  const handleShipPlacement = (row: number, col: number) => {
    if (gamePhase !== 'setup' || !selectedShipConfig) return;

    const currentShipPlacing = shipsToPlace.find(s => s.name === selectedShipConfig.name);
    if (!currentShipPlacing || currentShipPlacing.placedCount >= currentShipPlacing.totalCount) {
      setGameMessage(`All ${selectedShipConfig.name}s placed. Select another ship or start game.`);
      return;
    }

    if (canPlaceShip(userGrid, row, col, selectedShipConfig.size, orientation)) {
      const positions = getShipPositions(row, col, selectedShipConfig.size, orientation);
      const newShip: PlacedShip = {
        id: `user-${selectedShipConfig.name}-${shipIdCounter++}`,
        name: selectedShipConfig.name,
        size: selectedShipConfig.size,
        positions,
        hits: [],
        isSunk: false,
        orientation,
      };
      
      const updatedUserGrid = placeShipOnGrid(userGrid, newShip);
      setUserGrid(updatedUserGrid);
      setPreviewUserGrid(updatedUserGrid); // Update preview to reflect placed ship
      setUserShips(prev => [...prev, newShip]);

      setShipsToPlace(prev =>
        prev.map(s =>
          s.name === selectedShipConfig.name
            ? { ...s, placedCount: s.placedCount + 1 }
            : s
        )
      );
      
      // Auto-select next available ship
      const nextShipToPlace = shipsToPlace.find(s => s.name !== selectedShipConfig.name && s.placedCount < s.totalCount) || shipsToPlace.find(s => s.placedCount < s.totalCount);
      if (nextShipToPlace) {
        setSelectedShipConfig(ALL_SHIP_CONFIGS[nextShipToPlace.name]);
      } else {
        setSelectedShipConfig(null); // All ships of current type placed
         if (shipsToPlace.every(s => s.placedCount >= s.totalCount)) {
           setGameMessage("All ships placed! Ready to start the game.");
         }
      }
    } else {
      toast({ title: "Invalid Placement", description: "Cannot place ship here. It's out of bounds or overlaps another ship.", variant: "destructive" });
    }
  };

  const handleToggleOrientation = () => {
    setOrientation(prev => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  };
  
  const allShipsPlaced = shipsToPlace.every(s => s.placedCount >= s.totalCount);

  const handleStartGame = () => {
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
  };

  const handleUserShot = (row: number, col: number) => {
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
    setGameMessage("Opponent's turn. Click 'Fire for Opponent'.");
  };

  const handleComputerTurn = async () => {
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
      // Validate AI output if necessary, e.g., ensure it's not a re-fire, though AI should handle this.
      // For robustness, check if cell is 'empty' or 'ship' before processing.
      if (userGrid[row][column].state !== 'empty' && userGrid[row][column].state !== 'ship') {
        // AI picked an already fired cell, this indicates an issue or needs a fallback.
        // For now, let's assume AI provides valid untargeted cells based on prompt.
        // Or, we can add a loop here to ask AI for new coords if it picks a bad one.
        // Simple fallback: random valid shot if AI fails. This is complex to add now.
        toast({ title: "AI Error", description: "AI targeted an invalid cell. Please try again or this is a bug.", variant: "destructive"});
        setCurrentPlayer('user'); // Give turn back to user or retry AI.
        setGameMessage("AI targeting error. Your turn.");
        setIsComputerThinking(false);
        return;
      }


      const { updatedGrid, updatedShips, shotResult } = processShot(userGrid, userShips, row, column);
      setUserGrid(updatedGrid);
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
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter font-mono text-primary">Naval Standoff</h1>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player's Grid & Setup Controls */}
        <Card className="lg:col-span-1 flex flex-col items-center p-4 shadow-xl">
          <CardContent className="w-full space-y-4">
            <GameBoard
              grid={gamePhase === 'setup' ? previewUserGrid : userGrid}
              onCellClick={gamePhase === 'setup' ? handleShipPlacement : undefined}
              onCellHover={gamePhase === 'setup' ? handleCellHover : undefined}
              onCellLeave={gamePhase === 'setup' ? handleCellLeave : undefined}
              isPlayerBoard={true}
              boardTitle={gamePhase === 'setup' ? "Deploy Your Fleet" : "Your Waters"}
              disabled={gamePhase !== 'setup'}
            />
            {gamePhase === 'setup' && (
              <ShipPlacementControls
                availableShips={shipsToPlace}
                selectedShipName={selectedShipConfig?.name || null}
                onSelectShip={(name) => setSelectedShipConfig(ALL_SHIP_CONFIGS[name])}
                orientation={orientation}
                onToggleOrientation={handleToggleOrientation}
                allShipsPlaced={allShipsPlaced}
                onStartGame={handleStartGame}
                onResetPlacement={resetGameState}
              />
            )}
          </CardContent>
        </Card>

        {/* Middle Column: Game Status & Actions */}
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

        {/* Right Column: Opponent's Grid */}
        <Card className="lg:col-span-1 flex flex-col items-center p-4 shadow-xl">
          <CardContent className="w-full">
            <GameBoard
              grid={computerGrid}
              onCellClick={gamePhase === 'playing' && currentPlayer === 'user' ? handleUserShot : undefined}
              isPlayerBoard={false} // This is opponent's board, ships not visible until hit
              boardTitle="Enemy Waters"
              disabled={gamePhase !== 'playing' || currentPlayer !== 'user' || isComputerThinking}
            />
          </CardContent>
        </Card>
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Naval Standoff. A Classic Reimagined.</p>
      </footer>
    </div>
  );
}

