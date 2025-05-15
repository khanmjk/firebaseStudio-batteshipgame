
"use client";

import type { ShipConfig, ShipName } from '@/types';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, RotateCcw, CheckCircle } from 'lucide-react';

interface ShipPlacementControlsProps {
  availableShips: Array<ShipConfig & { placedCount: number; totalCount: number }>;
  selectedShipName: ShipName | null;
  onSelectShip: (shipName: ShipName) => void;
  orientation: 'horizontal' | 'vertical';
  onToggleOrientation: () => void;
  onConfirmPlacement?: () => void; // For individual ship confirmation if needed
  onResetPlacement?: () => void;
  allShipsPlaced: boolean;
  onStartGame: () => void;
}

export function ShipPlacementControls({
  availableShips,
  selectedShipName,
  onSelectShip,
  orientation,
  onToggleOrientation,
  onResetPlacement,
  allShipsPlaced,
  onStartGame,
}: ShipPlacementControlsProps) {
  const currentShip = availableShips.find(s => s.name === selectedShipName);
  const canPlaceCurrentShip = currentShip ? currentShip.placedCount < currentShip.totalCount : false;

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="font-mono tracking-wider text-center">Ship Deployment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-lg mb-2 block font-semibold">Select Ship:</Label>
          <RadioGroup
            value={selectedShipName ?? ""}
            onValueChange={(value) => onSelectShip(value as ShipName)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {availableShips.map((ship) => (
              <Label
                key={ship.name}
                htmlFor={ship.name}
                className={`flex items-center space-x-2 p-3 rounded-md border transition-colors cursor-pointer
                  ${selectedShipName === ship.name ? 'bg-primary/20 border-primary ring-2 ring-primary' : 'bg-card hover:bg-muted/50'}
                  ${ship.placedCount >= ship.totalCount ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RadioGroupItem value={ship.name} id={ship.name} disabled={ship.placedCount >= ship.totalCount} />
                <Ship className="w-5 h-5 mr-1" />
                <span className="flex-grow">{ship.name} (Size: {ship.size})</span>
                <span className="text-xs">({ship.placedCount}/{ship.totalCount})</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button onClick={onToggleOrientation} variant="outline" className="w-full sm:w-auto flex-grow">
            <RotateCcw className="w-4 h-4 mr-2" />
            Orientation: {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
          </Button>
           {onResetPlacement && (
            <Button onClick={onResetPlacement} variant="destructive" className="w-full sm:w-auto flex-grow">
              Reset Ships
            </Button>
          )}
        </div>
        
        {selectedShipName && !canPlaceCurrentShip && availableShips.some(s => s.name === selectedShipName && s.placedCount >= s.totalCount) && (
           <p className="text-center text-sm text-amber-400">All {selectedShipName}s placed. Select another ship type.</p>
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
