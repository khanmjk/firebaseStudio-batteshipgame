"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Info, ShieldCheck, Skull, Trophy, Target, Brain } from 'lucide-react';
import type { Player, GamePhase, ShotResult } from '@/types';
import { cn } from '@/lib/utils';

interface GameStatusDisplayProps {
  message: string;
  currentPlayer?: Player;
  gamePhase: GamePhase;
  winner?: Player | null;
  lastShotResult?: ShotResult | null;
  aiReasoning?: string | null;
  isComputerThinking?: boolean;
}

export function GameStatusDisplay({
  message,
  currentPlayer,
  gamePhase,
  winner,
  lastShotResult,
  aiReasoning,
  isComputerThinking,
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
    if (isComputerThinking) {
        title = "Opponent is Aiming...";
        Icon = Brain;
        cardVariant = "bg-muted/30 border-amber-500/50";
    } else if (currentPlayer === 'user') {
        title = "Your Turn to Fire";
        Icon = Target;
        cardVariant = "bg-secondary/10 border-secondary";
    } else if (currentPlayer === 'computer') {
        title = "Opponent's Turn"; // This state might be brief before 'isComputerThinking'
        Icon = AlertCircle;
        cardVariant = "bg-muted/20";
    }
  }


  return (
    <Card className={cn("w-full shadow-xl font-mono flex-grow flex flex-col", cardVariant)}>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-center text-lg sm:text-xl tracking-wider flex items-center justify-center gap-2">
          <Icon className="w-6 h-6"/> 
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-2 pb-3 px-3 flex-grow flex flex-col justify-center">
        <p className="text-base sm:text-lg min-h-[2em] flex items-center justify-center">{message}</p>
        {lastShotResult && (
          <CardDescription className="text-xs sm:text-sm text-muted-foreground/90">
            Last shot at ({String.fromCharCode(65 + lastShotResult.coordinates[0])}{lastShotResult.coordinates[1]+1}): 
            <span className={`font-semibold ml-1 ${lastShotResult.type === 'hit' || lastShotResult.type === 'sunk' ? 'text-accent' : 'text-safe-miss-foreground'}`}>
              {`${lastShotResult.type.toUpperCase()}`}
            </span>
            {lastShotResult.shipName && ` on ${lastShotResult.shipName}`}
          </CardDescription>
        )}
        {aiReasoning && (isComputerThinking || (gamePhase === 'playing' && currentPlayer === 'user' && lastShotResult?.type)) && ( // Show reasoning if AI is thinking OR if it's user's turn and AI just made a move
          <p className="text-xs italic text-muted-foreground/70 p-1.5 border border-dashed border-muted rounded-md bg-background/30 mt-1">
            Opponent Intel: "{aiReasoning}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}