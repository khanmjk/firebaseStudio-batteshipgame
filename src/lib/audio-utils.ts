
'use client';

/**
 * Plays a sound effect.
 * Assumes sound files are located in the `public/sounds/` directory.
 * @param soundFileName The name of the sound file (e.g., "shot_hit.mp3").
 */
export function playSound(soundFileName: string): void {
  if (typeof window !== 'undefined') {
    const audio = new Audio(`/sounds/${soundFileName}`);
    audio.play().catch(error => {
      // Log a warning if the sound fails to play, but don't crash the game.
      // This can happen if the audio file is missing or if the browser blocks autoplay.
      console.warn(`Could not play sound: ${soundFileName}. Error: ${error.message}`);
    });
  }
}
