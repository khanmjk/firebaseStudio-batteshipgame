
'use server';
/**
 * @fileOverview An AI agent to provide the computer opponent with intelligent targeting for its shots.
 *
 * - getTargetCoordinates - A function that determines the next target coordinates for the computer opponent.
 * - GetTargetCoordinatesInput - The input type for the getTargetCoordinates function.
 * - GetTargetCoordinatesOutput - The return type for the getTargetCoordinates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetTargetCoordinatesInputSchema = z.object({
  boardSize: z
    .number()
    .describe('The size of the game board (e.g., 10 for a 10x10 board).'),
  maxCoordinate: z
    .number()
    .describe('The maximum valid coordinate index (boardSize - 1).'),
  hitCoordinates: z
    .array(z.tuple([z.number(), z.number()]))
    .describe(
      'An array of coordinates (row, column) where the computer has successfully hit an enemy ship part (includes parts of sunk ships).'
    ),
  missCoordinates: z
    .array(z.tuple([z.number(), z.number()]))
    .describe(
      'An array of coordinates (row, column) where the computer has shot and missed (hit empty water).'
    ),
});
export type GetTargetCoordinatesInput = z.infer<
  typeof GetTargetCoordinatesInputSchema
>;

const GetTargetCoordinatesOutputSchema = z.object({
  row: z
    .number()
    .describe('The row coordinate for the next shot (0-indexed).'),
  column: z
    .number()
    .describe('The column coordinate for the next shot (0-indexed).'),
  reasoning: z
    .string()
    .describe('The AI reasoning behind the chosen coordinates.'),
});
export type GetTargetCoordinatesOutput = z.infer<
  typeof GetTargetCoordinatesOutputSchema
>;

export async function getTargetCoordinates(
  input: GetTargetCoordinatesInput
): Promise<GetTargetCoordinatesOutput> {
  return getTargetCoordinatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getTargetCoordinatesPrompt',
  input: {schema: GetTargetCoordinatesInputSchema},
  output: {schema: GetTargetCoordinatesOutputSchema},
  prompt: `You are an expert strategist in the game of Battleship.

  Your task is to determine the optimal coordinates for the next shot by the computer opponent.
  The board is 0-indexed. For this {{boardSize}}x{{boardSize}} board, valid row and column indices are from 0 to {{maxCoordinate}}.

  Here's the information you have:
  - Board Size: {{boardSize}}x{{boardSize}} (indices 0 to {{maxCoordinate}})
  - Successfully Hit Coordinates (enemy ship parts are at these locations, some may be part of already sunk ships): {{#if hitCoordinates}}{{#each hitCoordinates}}({{this.0}}, {{this.1}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
  - Missed Shot Coordinates (confirmed empty water): {{#if missCoordinates}}{{#each missCoordinates}}({{this.0}}, {{this.1}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}

  **CRITICAL INSTRUCTIONS FOR TARGETING:**
  1.  You MUST choose a 'row' and 'column' that has NOT been previously targeted. This means the chosen (row, column) MUST NOT appear in EITHER the 'Successfully Hit Coordinates' list OR the 'Missed Shot Coordinates' list.
  2.  The chosen 'row' MUST be an integer between 0 and {{maxCoordinate}} (inclusive).
  3.  The chosen 'column' MUST be an integer between 0 and {{maxCoordinate}} (inclusive).
  4.  If all cells have been targeted, this is an error state for the prompt, but assume there's always a valid cell.

  Strategy Guidelines:
  - **Targeting Mode:** If there are 'Successfully Hit Coordinates' that could belong to a ship that is not yet sunk, prioritize shooting at adjacent cells (horizontally or vertically only, NO DIAGONALS) to these hits.
    - If multiple hits form a line, try to extend that line.
    - If a hit is isolated, try adjacent cells.
  - **Hunting Mode:** If there are no 'Successfully Hit Coordinates' to expand upon (e.g., all hits belong to sunk ships or all adjacent cells to hits are already targeted), or at the start of the game, select a cell randomly or using a search pattern (e.g., checkerboard, diagonal sweeps).
    - Ensure this random or pattern-based selection STILL ADHERES to all CRITICAL INSTRUCTIONS above (untargeted and within bounds).
    - If your first random/pattern pick is an already targeted cell, you MUST pick another cell until an untargeted one is found.

  Reasoning: Provide a brief explanation for your choice.
  Examples:
  - "Targeting Mode: Extending line from hit at (2,3) by shooting (2,4) as (2,4) is untargeted."
  - "Targeting Mode: Hit at (5,5) is isolated. Trying adjacent cell (5,6) as it's untargeted."
  - "Hunting Mode: No active hits. Randomly selected untargeted cell (7,2)."
  - "Hunting Mode: All cells adjacent to hit (1,1) are targeted. Switching to random hunt at (4,8)."

  Output your decision STRICTLY in the following JSON format:
  {
    "row": <number>,
    "column": <number>,
    "reasoning": "<string>"
  }
  `,
});

const getTargetCoordinatesFlow = ai.defineFlow(
  {
    name: 'getTargetCoordinatesFlow',
    inputSchema: GetTargetCoordinatesInputSchema,
    outputSchema: GetTargetCoordinatesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      // This case should ideally be handled by the LLM itself based on the prompt,
      // but as a fallback, we might need to generate a random valid coordinate if the LLM fails.
      // For now, we rely on the LLM and schema validation.
      // If output is null here, Genkit will likely throw an error due to schema mismatch if strict.
      throw new Error("AI failed to provide an output matching the schema.");
    }
    // Additional validation can be added here if needed, though Genkit handles schema validation.
    if (output.row < 0 || output.row > input.maxCoordinate || output.column < 0 || output.column > input.maxCoordinate) {
        // This should be caught by the prompt, but as a safeguard:
        throw new Error(`AI returned out-of-bounds coordinates: (${output.row}, ${output.column}) for max index ${input.maxCoordinate}`);
    }
    
    const isHit = input.hitCoordinates.some(coord => coord[0] === output.row && coord[1] === output.column);
    const isMiss = input.missCoordinates.some(coord => coord[0] === output.row && coord[1] === output.column);

    if (isHit || isMiss) {
        // This should be caught by the prompt, but as a safeguard:
        throw new Error(`AI returned already targeted coordinates: (${output.row}, ${output.column})`);
    }

    return output;
  }
);
