
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { GameGrid, PlacedShip, ShipConfig, Player, GamePhase, CellState, ShotResult, ShipName, GetTargetCoordinatesInput } from '@/types';
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
import { getTargetCoordinates } from '@/ai/flows/opponent-intelligence';
import { GameBoard } from '@/components/game-board';
import { ShipPlacementControls } from '@/components/ship-placement-controls';
import { GameStatusDisplay } from '@/components/game-status-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, RotateCcw, Play, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function NavalStandoffPage() {
  const [userGrid, setUserGrid] = useState<GameGrid>(() => initializeGrid());
  const [computerGrid, setComputerGrid] = useState<GameGrid>(() => initializeGrid());
  const [userShips, setUserShips] = useState<PlacedShip[]>([]);
  const [computerShips, setComputerShips] = useState<PlacedShip[]>([]);
  
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [currentPlayer, setCurrentPlayer] = useState<Player>('user');
  const [winner, setWinner] = useState<Player | null>(null);
  
  const [selectedShipConfig, setSelectedShipConfig] = useState<ShipConfig | null>(null); 
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [shipsToPlace, setShipsToPlace] = useState(() => 
    SHIPS_TO_PLACE_CONFIG.map(ship => ({ ...ship, placedCount: 0, totalCount: 1 }))
  );
  const [previewUserGrid, setPreviewUserGrid] = useState<GameGrid>(userGrid);

  const [gameMessage, setGameMessage] = useState('Loading game...');
  const [lastShotResult, setLastShotResult] = useState<ShotResult | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  const { toast } = useToast();
  let shipIdCounter = 0; 

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
    setSelectedShipConfig(SHIPS_TO_PLACE_CONFIG[0]); 
    setOrientation('horizontal');
    setShipsToPlace(SHIPS_TO_PLACE_CONFIG.map(ship => ({ ...ship, placedCount: 0, totalCount: 1 })));
    setGameMessage('Select a ship, then click or drag to place. Space to rotate.');
    setLastShotResult(null);
    setAiReasoning(null);
    setIsComputerThinking(false);
  }, []); 

  useEffect(() => {
    resetGameState();
  }, [resetGameState]); 
  
  useEffect(() => {
    if (gamePhase === 'setup') {
      setPreviewUserGrid(getPreviewGrid(userGrid, -1, -1, selectedShipConfig, orientation));
    } else {
      setPreviewUserGrid(userGrid); 
    }
  }, [userGrid, selectedShipConfig, orientation, gamePhase]);


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

     if (!shipToPlace) {
        toast({ title: "No Ship Selected", description: "Please select a ship to place.", variant: "default" });
        return;
    }

    const currentShipPlacingStats = shipsToPlace.find(s => s.name === shipToPlace.name);
    if (!currentShipPlacingStats || currentShipPlacingStats.placedCount >= currentShipPlacingStats.totalCount) {
      setGameMessage(`All ${shipToPlace.name}s placed. Select another ship or start game.`);
      toast({ title: "Placement Limit", description: `All ${shipToPlace.name}s already placed.`, variant: "default" });
      setSelectedShipConfig(null); // Deselect if all of this type are placed
      return;
    }

    let updatedUserGrid = userGrid; 
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
      
      updatedUserGrid = placeShipOnGrid(userGrid, newShip); 
      setUserGrid(updatedUserGrid);
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
      toast({ title: "Ship Placed", description: `${shipToPlace.name} deployed at (${String.fromCharCode(65 + row)}${col + 1}).`});
    } else {
      toast({ title: "Invalid Placement", description: "Cannot place ship here. It's out of bounds or overlaps another ship.", variant: "destructive" });
    }
    // Ensure preview grid is updated after attempt, regardless of success
    setPreviewUserGrid(getPreviewGrid(updatedUserGrid, -1, -1, selectedShipConfig, orientation));


  }, [gamePhase, userGrid, shipsToPlace, orientation, toast, shipIdCounter, selectedShipConfig]);


  const handleShipDragStart = useCallback((event: React.DragEvent, shipConfig: ShipConfig) => {
    event.dataTransfer.setData('application/json', JSON.stringify(shipConfig));
    event.dataTransfer.effectAllowed = 'move';
    setSelectedShipConfig(shipConfig); 
  }, []);
  
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
    setPreviewUserGrid(userGrid); 
  }, [allShipsPlaced, toast, userGrid]);

  const handleUserShot = useCallback((row: number, col: number) => {
    if (gamePhase !== 'playing' || currentPlayer !== 'user' || isComputerThinking || computerGrid[row][col].state === 'hit' || computerGrid[row][col].state === 'miss' || computerGrid[row][col].state === 'sunk') return;

    const { updatedGrid, updatedShips, shotResult } = processShot(computerGrid, computerShips, row, col);
    setComputerGrid(updatedGrid);
    setComputerShips(updatedShips);
    setLastShotResult(shotResult);
    setGameMessage(`You fired at (${String.fromCharCode(65 + row)}${col + 1}). It's a ${shotResult.type.toUpperCase()}!`);
    toast({ title: `Shot at (${String.fromCharCode(65 + row)}${col+1})`, description: `Result: ${shotResult.type.toUpperCase()}${shotResult.shipName ? ` on ${shotResult.shipName}` : ''}`});


    if (checkGameOver(updatedShips)) {
      setGamePhase('gameOver');
      setWinner('user');
      setGameMessage("Congratulations! You've sunk all enemy ships!");
      return;
    }
    
    setCurrentPlayer('computer');
    setGameMessage("Opponent's turn.");
  }, [gamePhase, currentPlayer, computerGrid, computerShips, toast, isComputerThinking]);

  const handleComputerTurn = useCallback(async () => {
    if (gamePhase !== 'playing' || currentPlayer !== 'computer' || isComputerThinking) return;

    setIsComputerThinking(true);
    setGameMessage("Opponent is aiming...");

    const hitCoordinates = getFiredCoordinates(userGrid).filter(coord => userGrid[coord[0]][coord[1]].state === 'hit' || userGrid[coord[0]][coord[1]].state === 'sunk');
    const missCoordinates = getFiredCoordinates(userGrid).filter(coord => userGrid[coord[0]][coord[1]].state === 'miss');
    
    const aiInput: GetTargetCoordinatesInput = {
      boardSize: BOARD_SIZE,
      maxCoordinate: BOARD_SIZE - 1,
      hitCoordinates: hitCoordinates,
      missCoordinates: missCoordinates,
    };

    try {
      const aiOutput = await getTargetCoordinates(aiInput);
      setAiReasoning(aiOutput.reasoning);
      
      let { row: targetRow, column: targetCol } = aiOutput;
            
      let useFallback = false;
      if (targetRow < 0 || targetRow >= BOARD_SIZE || targetCol < 0 || targetCol >= BOARD_SIZE || 
          (userGrid[targetRow][targetCol].state !== 'empty' && userGrid[targetRow][targetCol].state !== 'ship')) {
          
        console.warn("AI targeted an invalid or already fired upon cell:", {targetRow, targetCol, cellState: userGrid[targetRow]?.[targetCol]?.state });
        toast({ title: "AI Recalibrating", description: "AI chose an invalid target, attempting fallback.", variant: "default"});
        useFallback = true;
      }
        
      if (useFallback) {
        let fallbackRow, fallbackCol, attempts = 0;
        const maxAttempts = BOARD_SIZE * BOARD_SIZE * 2; // Increased max attempts
        const availableCells: Array<[number, number]> = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (userGrid[r][c].state === 'empty' || userGrid[r][c].state === 'ship') {
              availableCells.push([r, c]);
            }
          }
        }

        if (availableCells.length === 0) {
            toast({ title: "AI Error", description: "AI could not find any valid cell to target (no empty/ship cells left).", variant: "destructive"});
            setCurrentPlayer('user'); 
            setGameMessage("Your turn. AI encountered an issue finding a target.");
            setIsComputerThinking(false);
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * availableCells.length);
        [fallbackRow, fallbackCol] = availableCells[randomIndex];
        targetRow = fallbackRow;
        targetCol = fallbackCol;
        setAiReasoning(`Fallback: Randomly targeted (${String.fromCharCode(65 + targetRow)}${targetCol + 1}). Original reason: ${aiOutput.reasoning || 'N/A'}`);
      }


      const { updatedGrid, updatedShips, shotResult } = processShot(userGrid, userShips, targetRow, targetCol);
      setUserGrid(updatedGrid); 
      setUserShips(updatedShips);
      setLastShotResult(shotResult);
      setGameMessage(`Opponent fired at (${String.fromCharCode(65 + targetRow)}${targetCol + 1}). It's a ${shotResult.type.toUpperCase()}!`);
      toast({ title: `Opponent shot at (${String.fromCharCode(65 + targetRow)}${targetCol+1})`, description: `Result: ${shotResult.type.toUpperCase()}${shotResult.shipName ? ` on your ${shotResult.shipName}` : ''}`});

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
      setGameMessage("Error with AI opponent. Could not get opponent's move. Your turn.");
      toast({ title: "AI Error", description: "Could not get opponent's move. Your turn.", variant: "destructive"});
      setCurrentPlayer('user'); 
    } finally {
      setIsComputerThinking(false);
    }
  }, [gamePhase, currentPlayer, isComputerThinking, userGrid, userShips, toast]);


  return (
    <div className="h-screen overflow-hidden flex flex-col items-center p-2 sm:p-3 lg:p-4 bg-background text-foreground">
      <header className="mb-2 sm:mb-3 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tighter font-mono text-primary">Naval Standoff</h1>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 flex-1 overflow-hidden">
        {/* Left Column: Player's Board and Controls */}
        <div className="space-y-3 flex flex-col min-h-0"> 
          <Card className="shadow-xl flex-shrink-0">
            <CardContent className="p-2 sm:p-3">
              <GameBoard
                grid={previewUserGrid}
                onCellClick={
                  gamePhase === 'setup' && selectedShipConfig
                    ? (row, col) => handlePlaceShipOnBoard(row, col, selectedShipConfig)
                    : undefined
                }
                onCellHover={gamePhase === 'setup' ? handleCellHover : undefined}
                onCellLeave={gamePhase === 'setup' ? handleCellLeave : undefined}
                onCellDrop={
                    gamePhase === 'setup' 
                    ? (row, col, draggedShipConfig) => handlePlaceShipOnBoard(row, col, draggedShipConfig) 
                    : undefined
                }
                isPlayerBoard={true}
                boardTitle={gamePhase === 'setup' ? "Deploy Your Fleet" : "Your Waters"}
                disabled={
                    (gamePhase === 'setup' && !selectedShipConfig && !allShipsPlaced) || // Allow interaction if ships left to place or all placed (for start game)
                    (gamePhase === 'playing' && (currentPlayer !== 'user' || isComputerThinking)) ||
                    gamePhase === 'gameOver'
                }
              />
            </CardContent>
          </Card>
          {gamePhase === 'setup' && (
            <ShipPlacementControls
              availableShips={shipsToPlace}
              selectedShipName={selectedShipConfig?.name || null}
              onSelectShip={(name) => {
                const ship = ALL_SHIP_CONFIGS[name];
                const shipStats = shipsToPlace.find(s => s.name === name);
                if (ship && shipStats && shipStats.placedCount < shipStats.totalCount) {
                  setSelectedShipConfig(ship);
                } else {
                  setSelectedShipConfig(null); // Deselect if all placed or ship not found
                  toast({title: "All Placed", description: `All ${name}s have been deployed.`, variant: "default"})
                }
              }}
              onShipDragStart={handleShipDragStart}
              orientation={orientation}
              onToggleOrientation={handleToggleOrientation}
              allShipsPlaced={allShipsPlaced}
              onStartGame={handleStartGame}
              onResetPlacement={resetGameState}
            />
          )}
        </div>

        {/* Right Column: Opponent's Board and Game Status */}
        <div className="space-y-3 flex flex-col min-h-0"> 
          <Card className="shadow-xl flex-shrink-0">
            <CardContent className="p-2 sm:p-3">
              <GameBoard
                grid={computerGrid}
                onCellClick={gamePhase === 'playing' && currentPlayer === 'user' && !isComputerThinking ? handleUserShot : undefined}
                isPlayerBoard={false}
                boardTitle="Enemy Waters"
                disabled={gamePhase !== 'playing' || currentPlayer !== 'user' || isComputerThinking}
              />
            </CardContent>
          </Card>
          
          <GameStatusDisplay
            message={gameMessage}
            currentPlayer={currentPlayer}
            gamePhase={gamePhase}
            winner={winner}
            lastShotResult={lastShotResult}
            aiReasoning={aiReasoning}
          />

          {gamePhase === 'playing' && currentPlayer === 'computer' && !winner && (
            <Button onClick={handleComputerTurn} disabled={isComputerThinking} size="lg" className="w-full font-semibold py-2 text-base sm:text-lg mt-auto">
              {isComputerThinking ? (
                <><RotateCcw className="w-5 h-5 mr-2 animate-spin" /> Thinking...</>
              ) : (
                <><Brain className="w-5 h-5 mr-2" /> Process Opponent's Move</>
              )}
            </Button>
          )}
          {gamePhase === 'gameOver' && (
            <Button onClick={resetGameState} size="lg" className="w-full font-semibold py-2 text-base sm:text-lg mt-auto"> 
              <Play className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          )}
          {gamePhase === 'setup' && !allShipsPlaced && (
             <Card className="shadow-md bg-muted/30 border-dashed border-muted mt-auto">
                <CardContent className="p-3 text-center text-muted-foreground">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-sm">Place all your ships on the board to begin the standoff!</p>
                </CardContent>
             </Card>
          )}
        </div>
      </main>
      <footer className="mt-1 sm:mt-2 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Naval Standoff. Press Space to rotate ships during setup.</p>
      </footer>
    </div>
  );
}

    