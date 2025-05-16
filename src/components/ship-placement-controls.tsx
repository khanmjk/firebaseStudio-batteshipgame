
"use client";

import type { ShipConfig, ShipName } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, RotateCcw, CheckCircle, Move } from 'lucide-react'; 

interface ShipPlacementControlsProps {
  availableShips: Array<ShipConfig & { placedCount: number; totalCount: number }>;
  selectedShipName: ShipName | null;
  onSelectShip: (shipName: ShipName) => void;
  onShipDragStart: (event: React.DragEvent, shipConfig: ShipConfig) => void;
  orientation: 'horizontal' | 'vertical';
  onToggleOrientation: () => void;
  onResetPlacement?: () => void;
  allShipsPlaced: boolean;
  onStartGame: () => void;
}

export function ShipPlacementControls({
  availableShips,
  selectedShipName,
  onSelectShip,
  onShipDragStart,
  orientation,
  onToggleOrientation,
  onResetPlacement,
  allShipsPlaced,
  onStartGame,
}: ShipPlacementControlsProps) {
  const currentSelectedShipInfo = availableShips.find(s => s.name === selectedShipName);
  const canPlaceCurrentSelectedShip = currentSelectedShipInfo ? currentSelectedShipInfo.placedCount < currentSelectedShipInfo.totalCount : false;

  return (
    <Card className="w-full shadow-xl flex-grow flex flex-col"> {/* Removed max-w-md */}
      <CardHeader className="py-3 px-4">
        <CardTitle className="font-mono tracking-wider text-center text-lg sm:text-xl">Ship Deployment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-3 sm:p-4 flex-grow flex flex-col">
        <div>
          <Label className="text-base mb-1 block font-semibold">Available Ships (Drag or Click to Select):</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {availableShips.map((ship) => {
              const isSelected = selectedShipName === ship.name;
              const isFullyPlaced = ship.placedCount >= ship.totalCount;
              return (
                <Button
                  key={ship.name}
                  variant={isSelected && !isFullyPlaced ? 'default' : 'outline'}
                  disabled={isFullyPlaced}
                  draggable={!isFullyPlaced}
                  onDragStart={(e) => {
                    if (!isFullyPlaced) {
                      onShipDragStart(e, ship);
                    } else {
                      e.preventDefault();
                    }
                  }}
                  onClick={() => {
                    if (!isFullyPlaced) {
                      onSelectShip(ship.name);
                    }
                  }}
                  className={`flex items-center space-x-2 p-2 rounded-md border transition-colors w-full justify-start text-left h-auto text-sm
                    ${isSelected && !isFullyPlaced ? 'border-primary ring-2 ring-primary shadow-md' : 'hover:bg-muted/50'}
                    ${isFullyPlaced ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                  aria-label={`Select or drag ${ship.name}. Size: ${ship.size}. Placed: ${ship.placedCount} of ${ship.totalCount}.`}
                >
                  <Ship className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="flex-grow font-medium">{ship.name} (Size: {ship.size})</span>
                  <span className="text-xs bg-muted/50 px-1 py-0.5 rounded">({ship.placedCount}/{ship.totalCount})</span>
                  {!isFullyPlaced && <Move className="w-3 h-3 ml-auto text-muted-foreground group-hover:text-primary" />}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <Button onClick={onToggleOrientation} variant="outline" className="w-full sm:w-auto flex-grow text-sm py-2">
            <RotateCcw className="w-4 h-4 mr-2" />
            Rotate (Space): {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
          </Button>
           {onResetPlacement && (
            <Button onClick={onResetPlacement} variant="destructive" className="w-full sm:w-auto flex-grow text-sm py-2">
              Reset Ships
            </Button>
          )}
        </div>
        
        {selectedShipName && !canPlaceCurrentSelectedShip && availableShips.some(s => s.name === selectedShipName && s.placedCount >= s.totalCount) && !allShipsPlaced && (
           <p className="text-center text-xs text-amber-400 mt-2">All {selectedShipName}s placed. Select or drag another ship type.</p>
        )}

        {allShipsPlaced && (
          <Button onClick={onStartGame} size="lg" className="w-full font-semibold text-base sm:text-lg py-2 mt-2">
            <CheckCircle className="w-5 h-5 mr-2" />
            Start Game
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
