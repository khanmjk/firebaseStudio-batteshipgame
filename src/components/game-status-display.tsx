
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Info, ShieldCheck, Skull, Trophy } from 'lucide-react';
import type { Player, GamePhase, ShotResult } from '@/types';

interface GameStatusDisplayProps {
  message: string;
  currentPlayer?: Player;
  gamePhase: GamePhase;
  winner?: Player | null;
  lastShotResult?: ShotResult | null;
  aiReasoning?: string | null;
}

export function GameStatusDisplay({
  message,
  currentPlayer,
  gamePhase,
  winner,
  lastShotResult,
  aiReasoning,
}: GameStatusDisplayProps) {
  
  let title = "Game Status";
  let Icon = Info;

  if (gamePhase === 'setup') {
    title = "Setup Phase";
    Icon = ShieldCheck;
  } else if (gamePhase === 'gameOver' && winner) {
    title = winner === 'user' ? "Victory!" : "Defeat!";
    Icon = winner === 'user' ? Trophy : Skull;
  } else if (gamePhase === 'playing') {
    title = currentPlayer === 'user' ? "Your Turn" : "Opponent's Turn";
    Icon = currentPlayer === 'user' ? ShieldCheck : AlertCircle;
  }

  return (
    <Card className="w-full shadow-lg font-mono">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-xl tracking-wider flex items-center justify-center gap-2">
          <Icon className="w-6 h-6"/> 
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-2">
        <p className="text-lg">{message}</p>
        {lastShotResult && (
          <p className="text-sm text-muted-foreground">
            Last shot at ({lastShotResult.coordinates[0]+1}, {lastShotResult.coordinates[1]+1}): 
            <span className={`font-semibold ${lastShotResult.type === 'hit' || lastShotResult.type === 'sunk' ? 'text-accent' : 'text-safe-miss-foreground'}`}>
              {` ${lastShotResult.type.toUpperCase()}`}
            </span>
            {lastShotResult.shipName && ` on ${lastShotResult.shipName}`}
          </p>
        )}
        {aiReasoning && currentPlayer === 'user' && gamePhase === 'playing' && ( // Show AI reasoning after its turn
          <p className="text-xs italic text-muted-foreground/80 p-2 border border-dashed border-muted rounded-md">
            AI Reasoning: {aiReasoning}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
