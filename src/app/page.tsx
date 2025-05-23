
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
import { RotateCcw, Play, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { playSound } from '@/lib/audio-utils';

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
  const [sunkShipAnimationTarget, setSunkShipAnimationTarget] = useState<{ shipId: string; board: 'user' | 'computer' } | null>(null);


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
    setSelectedShipConfig(SHIPS_TO_PLACE_CONFIG[0] || null);
    setOrientation('horizontal');
    setShipsToPlace(SHIPS_TO_PLACE_CONFIG.map(ship => ({ ...ship, placedCount: 0, totalCount: 1 })));
    setGameMessage('Select a ship, then click or drag to place. Space to rotate.');
    setLastShotResult(null);
    setAiReasoning(null);
    setIsComputerThinking(false);
    setSunkShipAnimationTarget(null);
  }, []); 

  useEffect(() => {
    resetGameState();
  }, [resetGameState]); 
  
  useEffect(() => {
    if (gamePhase === 'setup') {
        const shipToPreview = selectedShipConfig && shipsToPlace.find(s => s.name === selectedShipConfig.name && s.placedCount < s.totalCount) 
                              ? selectedShipConfig 
                              : null;
        setPreviewUserGrid(getPreviewGrid(userGrid, -1, -1, shipToPreview, orientation));
    } else {
      setPreviewUserGrid(userGrid); 
    }
  }, [userGrid, selectedShipConfig, orientation, gamePhase, shipsToPlace]);

  useEffect(() => {
    if (sunkShipAnimationTarget) {
      const timer = setTimeout(() => {
        setSunkShipAnimationTarget(null);
      }, 1500); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [sunkShipAnimationTarget]);


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
      const shipToPreview = shipsToPlace.find(s => s.name === selectedShipConfig.name && s.placedCount < s.totalCount) 
                            ? selectedShipConfig 
                            : null;
      if (shipToPreview) {
        setPreviewUserGrid(getPreviewGrid(userGrid, row, col, shipToPreview, orientation));
      }
    }
  }, [gamePhase, selectedShipConfig, userGrid, orientation, shipsToPlace]);

  const handleCellLeave = useCallback(() => {
    if (gamePhase === 'setup') {
       const shipToPreview = selectedShipConfig && shipsToPlace.find(s => s.name === selectedShipConfig.name && s.placedCount < s.totalCount) 
                              ? selectedShipConfig 
                              : null;
      setPreviewUserGrid(getPreviewGrid(userGrid, -1, -1, shipToPreview, orientation));
    }
  }, [gamePhase, userGrid, selectedShipConfig, orientation, shipsToPlace]);

  const handlePlaceShipOnBoard = useCallback((row: number, col: number, shipToPlaceConfig: ShipConfig) => {
    if (gamePhase !== 'setup') return;

     if (!shipToPlaceConfig) {
        toast({ title: "No Ship Selected", description: "Please select a ship to place.", variant: "default" });
        return;
    }
    
    let gridForPreviewDisplay = userGrid;
    let shipStatsForPreview = shipsToPlace;

    const currentShipPlacingStats = shipsToPlace.find(s => s.name === shipToPlaceConfig.name);
    if (!currentShipPlacingStats || currentShipPlacingStats.placedCount >= currentShipPlacingStats.totalCount) {
      setGameMessage(`All ${shipToPlaceConfig.name}s placed. Select another ship or start game.`);
      toast({ title: "Placement Limit", description: `All ${shipToPlaceConfig.name}s already placed.`, variant: "default" });
      setSelectedShipConfig(null); 
      return;
    }
    

    if (canPlaceShip(userGrid, row, col, shipToPlaceConfig.size, orientation)) {
      const positions = getShipPositions(row, col, shipToPlaceConfig.size, orientation);
      const newShip: PlacedShip = {
        id: `user-${shipToPlaceConfig.name}-${shipIdCounter++}`,
        name: shipToPlaceConfig.name,
        size: shipToPlaceConfig.size,
        positions,
        hits: [],
        isSunk: false,
        orientation,
      };
      
      const newGridAfterPlacement = placeShipOnGrid(userGrid, newShip); 
      setUserGrid(newGridAfterPlacement);
      setUserShips(prev => [...prev, newShip]);
      gridForPreviewDisplay = newGridAfterPlacement;

      const newShipPlacementStats = shipsToPlace.map(s =>
        s.name === shipToPlaceConfig.name
          ? { ...s, placedCount: s.placedCount + 1 }
          : s
      );
      setShipsToPlace(newShipPlacementStats);
      shipStatsForPreview = newShipPlacementStats;
      
      const nextShipTypeToPlace = SHIPS_TO_PLACE_CONFIG.find(sc => {
          const stats = newShipPlacementStats.find(s => s.name === sc.name);
          return stats && stats.placedCount < stats.totalCount;
      });
      
      if (nextShipTypeToPlace) {
        setSelectedShipConfig(ALL_SHIP_CONFIGS[nextShipTypeToPlace.name]);
      } else {
        setSelectedShipConfig(null); 
         if (newShipPlacementStats.every(s => s.placedCount >= s.totalCount)) {
           setGameMessage("All ships placed! Ready to start the game.");
         }
      }
      playSound('place_ship.mp3');
      toast({ title: "Ship Placed", description: `${shipToPlaceConfig.name} deployed at (${String.fromCharCode(65 + row)}${col + 1}).`});
    } else {
      toast({ title: "Invalid Placement", description: "Cannot place ship here. It's out of bounds or overlaps another ship.", variant: "destructive" });
    }
    
    const shipConfigForNextPreview = shipStatsForPreview.every(s => s.placedCount >= s.totalCount) 
        ? null 
        : ALL_SHIP_CONFIGS[shipStatsForPreview.find(s => s.placedCount < s.totalCount)!.name];
    
    setPreviewUserGrid(getPreviewGrid(gridForPreviewDisplay, -1, -1, shipConfigForNextPreview, orientation));

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
    playSound('game_start.mp3');
    setPreviewUserGrid(userGrid); 
  }, [allShipsPlaced, toast, userGrid]);


  const handleComputerTurn = useCallback(async () => {
    if (gamePhase !== 'playing' || currentPlayer !== 'computer' || isComputerThinking || winner) {
        return;
    }

    setIsComputerThinking(true);
    setGameMessage("Opponent is aiming...");
    setAiReasoning(null); 
    playSound('fire_shot.mp3'); // Or a distinct enemy_fire_shot.mp3

    const hitCoordinates = getFiredCoordinates(userGrid).filter(coord => userGrid[coord[0]][coord[1]].state === 'hit' || userGrid[coord[0]][coord[1]].state === 'sunk');
    const missCoordinates = getFiredCoordinates(userGrid).filter(coord => userGrid[coord[0]][coord[1]].state === 'miss');
    
    const aiInput: GetTargetCoordinatesInput = {
      boardSize: BOARD_SIZE,
      maxCoordinate: BOARD_SIZE - 1,
      hitCoordinates: hitCoordinates,
      missCoordinates: missCoordinates,
    };
    // console.log("AI Input for computer's turn:", JSON.stringify(aiInput, null, 2));

    try {
      const aiOutput = await getTargetCoordinates(aiInput);
      // console.log("AI Output from computer's turn:", aiOutput);
      setAiReasoning(aiOutput.reasoning);
      
      let { row: targetRow, column: targetCol } = aiOutput;
      
      const { updatedGrid, updatedShips, shotResult } = processShot(userGrid, userShips, targetRow, targetCol);
      setUserGrid(updatedGrid); 
      setUserShips(updatedShips);
      setLastShotResult(shotResult);
      setGameMessage(`Opponent fired at (${String.fromCharCode(65 + targetRow)}${targetCol + 1}). It's a ${shotResult.type.toUpperCase()}!`);
      toast({ title: `Opponent shot at (${String.fromCharCode(65 + targetRow)}${targetCol+1})`, description: `Result: ${shotResult.type.toUpperCase()}${shotResult.shipName ? ` on your ${shotResult.shipName}` : ''}`});

      if (shotResult.type === 'hit') playSound('shot_hit.mp3');
      if (shotResult.type === 'miss') playSound('shot_miss.mp3');
      if (shotResult.type === 'sunk') {
        playSound('ship_sunk.mp3');
        setSunkShipAnimationTarget({ shipId: shotResult.shipId!, board: 'user' });
      }

      if (checkGameOver(updatedShips)) {
        setGamePhase('gameOver');
        setWinner('computer');
        setGameMessage("Game Over! The opponent has sunk all your ships.");
        playSound('game_lose.mp3');
      } else {
        setCurrentPlayer('user');
        setGameMessage("Your turn to fire.");
      }
      
    } catch (error: any) {
      console.error("Error in handleComputerTurn or AI flow:", error);
      let errorMessage = "Could not get opponent's move. Performing random fallback.";
      if (error && typeof error.message === 'string') {
        errorMessage = `AI Error: ${error.message}. Using fallback.`;
      } else if (typeof error === 'string') {
        errorMessage = `AI Error: ${error}. Using fallback.`;
      }
      
      setAiReasoning(`Error: ${error?.message || 'Unknown AI issue.'} Attempting fallback.`);
      toast({ 
        title: "AI Opponent Error",
        description: errorMessage,
        variant: "destructive",
        duration: 7000
      });

      // Fallback logic
      const availableCells: Array<[number, number]> = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (userGrid[r][c].state === 'empty' || userGrid[r][c].state === 'ship') {
            availableCells.push([r, c]);
          }
        }
      }

      if (availableCells.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableCells.length);
        const [fallbackRow, fallbackCol] = availableCells[randomIndex];
        const { updatedGrid, updatedShips, shotResult } = processShot(userGrid, userShips, fallbackRow, fallbackCol);
        setUserGrid(updatedGrid); 
        setUserShips(updatedShips);
        setLastShotResult(shotResult);
        setGameMessage(`Opponent (fallback) fired at (${String.fromCharCode(65 + fallbackRow)}${fallbackCol + 1}). It's a ${shotResult.type.toUpperCase()}!`);
        toast({ title: `Opponent Fallback Shot`, description: `At (${String.fromCharCode(65 + fallbackRow)}${fallbackCol+1}), Result: ${shotResult.type.toUpperCase()}`});
        
        if (shotResult.type === 'hit') playSound('shot_hit.mp3');
        if (shotResult.type === 'miss') playSound('shot_miss.mp3');
        if (shotResult.type === 'sunk') {
            playSound('ship_sunk.mp3');
            setSunkShipAnimationTarget({ shipId: shotResult.shipId!, board: 'user' });
        }
        if (checkGameOver(updatedShips)) {
            setGamePhase('gameOver');
            setWinner('computer');
            setGameMessage("Game Over! The opponent has sunk all your ships (via fallback).");
            playSound('game_lose.mp3');
        } else {
            setCurrentPlayer('user');
            setGameMessage("Your turn to fire.");
        }
      } else {
        toast({ title: "AI Critical Error", description: "AI could not find ANY valid cell to target (board full or error during fallback). Game might be stuck.", variant: "destructive", duration: 7000});
        setCurrentPlayer('user'); 
        setGameMessage("Your turn. AI encountered a critical issue finding a target.");
      }
    } finally {
      setIsComputerThinking(false);
    }
  }, [gamePhase, currentPlayer, isComputerThinking, userGrid, userShips, winner, toast]);

  useEffect(() => {
    if (gamePhase === 'playing' && currentPlayer === 'computer' && !winner && !isComputerThinking) {
      setGameMessage("Opponent's turn...");
      const timerId = setTimeout(() => {
        handleComputerTurn();
      }, 750); 
      return () => clearTimeout(timerId); 
    }
  }, [gamePhase, currentPlayer, winner, isComputerThinking, handleComputerTurn]);


  const handleUserShot = useCallback((row: number, col: number) => {
    if (gamePhase !== 'playing' || currentPlayer !== 'user' || isComputerThinking || winner || computerGrid[row][col].state === 'hit' || computerGrid[row][col].state === 'miss' || computerGrid[row][col].state === 'sunk') return;

    playSound('fire_shot.mp3');
    const { updatedGrid, updatedShips, shotResult } = processShot(computerGrid, computerShips, row, col);
    setComputerGrid(updatedGrid);
    setComputerShips(updatedShips);
    setLastShotResult(shotResult);
    setGameMessage(`You fired at (${String.fromCharCode(65 + row)}${col + 1}). It's a ${shotResult.type.toUpperCase()}!`);
    toast({ title: `Shot at (${String.fromCharCode(65 + row)}${col+1})`, description: `Result: ${shotResult.type.toUpperCase()}${shotResult.shipName ? ` on ${shotResult.shipName}` : ''}`});

    if (shotResult.type === 'hit') playSound('shot_hit.mp3');
    if (shotResult.type === 'miss') playSound('shot_miss.mp3');
    if (shotResult.type === 'sunk') {
        playSound('ship_sunk.mp3');
        setSunkShipAnimationTarget({ shipId: shotResult.shipId!, board: 'computer' });
    }

    if (checkGameOver(updatedShips)) {
      setGamePhase('gameOver');
      setWinner('user');
      setGameMessage("Congratulations! You've sunk all enemy ships!");
      playSound('game_win.mp3');
      return;
    }
    
    setCurrentPlayer('computer');

  }, [gamePhase, currentPlayer, computerGrid, computerShips, winner, toast, isComputerThinking]);


  return (
    <div className="h-screen overflow-hidden flex flex-col items-center p-2 sm:p-3 lg:p-4 bg-background text-foreground">
      <header className="mb-2 sm:mb-3 text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tighter font-mono text-primary">Naval Standoff</h1>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 flex-1 overflow-hidden">
        {/* Left Column: Player's Board and Controls/Status */}
        <div className="space-y-3 flex flex-col min-h-0"> 
          <Card className="shadow-xl flex-shrink-0">
            <CardContent className="p-2 sm:p-3">
              <GameBoard
                grid={previewUserGrid}
                onCellClick={
                  gamePhase === 'setup' && selectedShipConfig
                    ? (row, col) => handlePlaceShipOnBoard(row, col, selectedShipConfig)
                    : undefined // Player cannot click their own board to shoot
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
                    (gamePhase === 'setup' && (!selectedShipConfig && !shipsToPlace.find(s => s.placedCount < s.totalCount))) || // Disable if no ship selected or all of current type placed
                    (gamePhase === 'playing') || 
                    gamePhase === 'gameOver'
                }
                sunkShipAnimationTrigger={sunkShipAnimationTarget?.board === 'user' ? sunkShipAnimationTarget.shipId : null}
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
                  setSelectedShipConfig(null); 
                  if (shipStats && shipStats.placedCount >= shipStats.totalCount) {
                    toast({title: "All Placed", description: `All ${name}s have been deployed.`, variant: "default"})
                  }
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
          {gamePhase !== 'setup' && (
            <GameStatusDisplay
              message={gameMessage}
              currentPlayer={currentPlayer}
              gamePhase={gamePhase}
              winner={winner}
              lastShotResult={lastShotResult}
              aiReasoning={aiReasoning}
              isComputerThinking={isComputerThinking}
            />
          )}
        </div>

        {/* Right Column: Opponent's Board and Game Over Controls */}
        <div className="space-y-3 flex flex-col min-h-0"> 
          <Card className="shadow-xl flex-shrink-0">
            <CardContent className="p-2 sm:p-3">
              <GameBoard
                grid={computerGrid}
                onCellClick={gamePhase === 'playing' && currentPlayer === 'user' && !isComputerThinking && !winner ? handleUserShot : undefined}
                isPlayerBoard={false}
                boardTitle="Enemy Waters"
                disabled={gamePhase !== 'playing' || currentPlayer !== 'user' || isComputerThinking || !!winner}
                sunkShipAnimationTrigger={sunkShipAnimationTarget?.board === 'computer' ? sunkShipAnimationTarget.shipId : null}
              />
            </CardContent>
          </Card>
          
          {gamePhase === 'gameOver' && (
            <Button onClick={resetGameState} size="lg" className="w-full font-semibold py-2 text-base sm:text-lg mt-auto"> 
              <Play className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          )}
          {gamePhase === 'setup' && !allShipsPlaced && (
             <Card className="shadow-md bg-muted/30 border-dashed border-muted mt-auto lg:hidden"> {/* Hide on large screens if GameStatus is there */}
                <CardContent className="p-3 text-center text-muted-foreground">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-sm">Place all your ships on the board to begin the standoff!</p>
                </CardContent>
             </Card>
          )}
           {/* Placeholder to maintain layout balance if GameStatusDisplay moves */}
           {gamePhase !== 'gameOver' && gamePhase !== 'setup' && <div className="flex-grow"></div>}


        </div>
      </main>
      <footer className="mt-1 sm:mt-2 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Naval Standoff. Press Space to rotate ships during setup.</p>
      </footer>
    </div>
  );
}
