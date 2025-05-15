
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Info, ShieldCheck, Skull, Trophy, Target } from 'lucide-react';
import type { Player, GamePhase, ShotResult } from '@/types';
import { cn } from '@/lib/utils'; // Added missing import

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
  let cardVariant = "default";

  if (gamePhase === 'setup') {
    title = "Deployment Phase";
    Icon = ShieldCheck;
  } else if (gamePhase === 'gameOver') {
    if (winner === 'user') {
      title = "VICTORY!";
      Icon = Trophy;
      cardVariant = "bg-primary/10 border-primary";
    } else {
      title = "DEFEAT!";
      Icon = Skull;
      cardVariant = "bg-destructive/10 border-destructive";
    }
  } else if (gamePhase === 'playing') {
    title = currentPlayer === 'user' ? "Your Turn to Fire" : "Opponent's Turn";
    Icon = currentPlayer === 'user' ? Target : AlertCircle;
     cardVariant = currentPlayer === 'user' ? "bg-secondary/10 border-secondary" : "bg-muted/20";
  }

  return (
    <Card className={cn("w-full shadow-xl font-mono", cardVariant)}>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-center text-2xl tracking-wider flex items-center justify-center gap-2">
          <Icon className="w-7 h-7"/> 
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-3 pb-4">
        <p className="text-lg min-h-[2.5em] flex items-center justify-center">{message}</p>
        {lastShotResult && (
          <CardDescription className="text-sm text-muted-foreground/90">
            Last shot ({lastShotResult.type === 'miss' ? 'by you' : 'on target'}) at ({lastShotResult.coordinates[0]+1}, {lastShotResult.coordinates[1]+1}): 
            <span className={`font-semibold ml-1 ${lastShotResult.type === 'hit' || lastShotResult.type === 'sunk' ? 'text-accent' : 'text-safe-miss-foreground'}`}>
              {`${lastShotResult.type.toUpperCase()}`}
            </span>
            {lastShotResult.shipName && ` on ${lastShotResult.shipName}`}
          </CardDescription>
        )}
        {aiReasoning && gamePhase === 'playing' && (
          <p className="text-xs italic text-muted-foreground/70 p-2 border border-dashed border-muted rounded-md bg-background/30">
            Opponent Intel: "{aiReasoning}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}
