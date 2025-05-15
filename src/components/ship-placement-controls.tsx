
"use client";

import type { ShipConfig, ShipName } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, RotateCcw, CheckCircle, Move } from 'lucide-react'; // Added Move icon for D&D hint

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
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-mono tracking-wider text-center">Ship Deployment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-lg mb-2 block font-semibold">Available Ships (Drag to Board):</Label>
          <div className="grid grid-cols-1 gap-2">
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
                  className={`flex items-center space-x-2 p-3 rounded-md border transition-colors w-full justify-start text-left h-auto
                    ${isSelected && !isFullyPlaced ? 'border-primary ring-2 ring-primary shadow-md' : 'hover:bg-muted/50'}
                    ${isFullyPlaced ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                  aria-label={`Select or drag ${ship.name}. Size: ${ship.size}. Placed: ${ship.placedCount} of ${ship.totalCount}.`}
                >
                  <Ship className="w-5 h-5 mr-1 flex-shrink-0" />
                  <span className="flex-grow font-medium">{ship.name} (Size: {ship.size})</span>
                  <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">({ship.placedCount}/{ship.totalCount})</span>
                  {!isFullyPlaced && <Move className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary" />}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button onClick={onToggleOrientation} variant="outline" className="w-full sm:w-auto flex-grow">
            <RotateCcw className="w-4 h-4 mr-2" />
            Rotate (Space): {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
          </Button>
           {onResetPlacement && (
            <Button onClick={onResetPlacement} variant="destructive" className="w-full sm:w-auto flex-grow">
              Reset Ships
            </Button>
          )}
        </div>
        
        {selectedShipName && !canPlaceCurrentSelectedShip && availableShips.some(s => s.name === selectedShipName && s.placedCount >= s.totalCount) && (
           <p className="text-center text-sm text-amber-400">All {selectedShipName}s placed. Select or drag another ship type.</p>
        )}

        {allShipsPlaced && (
          <Button onClick={onStartGame} size="lg" className="w-full font-semibold text-lg mt-4">
            <CheckCircle className="w-5 h-5 mr-2" />
            Start Game
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
