
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
  - Successfully Hit Coordinates (enemy ship parts are at these locations, some may be part of already sunk ships): {{#if hitCoordinates}}{{#each hitCoordinates}}({{this.[0]}}, {{this.[1]}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
  - Missed Shot Coordinates (confirmed empty water): {{#if missCoordinates}}{{#each missCoordinates}}({{this.[0]}}, {{this.[1]}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}

  **CRITICAL INSTRUCTIONS FOR TARGETING:**
  1.  Your final chosen 'row' and 'column' for the shot MUST NOT be a coordinate that has already been shot. It MUST NOT be in EITHER the 'Successfully Hit Coordinates' list OR the 'Missed Shot Coordinates' list. DOUBLE-CHECK THIS.
  2.  The chosen 'row' MUST be an integer between 0 and {{maxCoordinate}} (inclusive).
  3.  The chosen 'column' MUST be an integer between 0 and {{maxCoordinate}} (inclusive).

  Strategy Guidelines:
  - **Targeting Mode:** If there are 'Successfully Hit Coordinates' that could belong to a ship that is not yet sunk, prioritize shooting at adjacent cells (horizontally or vertically only, NO DIAGONALS) to these hits.
    - Any adjacent cell you pick MUST adhere to all CRITICAL INSTRUCTIONS (untargeted, within bounds).
    - If multiple hits form a line, try to extend that line, ensuring the new target is valid.
    - If a hit is isolated, try adjacent cells, ensuring the new target is valid.
    - If your first choice for an adjacent cell is already targeted or out of bounds, you MUST select a different valid adjacent cell, or switch to Hunting Mode if no valid adjacent cells remain.
  - **Hunting Mode:** If there are no 'Successfully Hit Coordinates' to expand upon (e.g., all hits belong to sunk ships or all adjacent cells to hits are already targeted), or at the start of the game, select a cell using a search pattern (e.g., checkerboard, diagonal sweeps) or randomly.
    - Ensure this selection STILL ADHERES to all CRITICAL INSTRUCTIONS above (untargeted and within bounds).
    - If your first pick using your pattern or randomness is an already targeted cell, you MUST pick another cell using your pattern or randomness until an untargeted one is found.

  Reasoning: Provide a brief explanation for your choice.
  - If your initial strategic choice (e.g. from a pattern, or next to a hit) was an already targeted cell or out of bounds, EXPLAIN THIS and then describe how you selected your new, valid, untargeted cell.
  Examples:
  - "Targeting Mode: Extending line from hit at (2,3) by shooting (2,4) as (2,4) is untargeted and within bounds."
  - "Targeting Mode: Hit at (5,5) is isolated. Tried (5,4) (missed), (6,5) (hit). Targeting (5,6) as it's untargeted and within bounds."
  - "Hunting Mode: No active hits. Randomly selected untargeted cell (7,2) which is within bounds."
  - "Hunting Mode: Checkerboard pattern suggested (3,3), but it was a previous miss. Randomly selected untargeted cell (4,8) instead."
  - "Targeting Mode: Hit at (0,0). Tried (0,1) (already hit), tried (1,0) (out of bounds as it's a 1x1 board for example). Switching to hunt: randomly picked (0,0) - no, this is bad example. Picked (valid_row, valid_col) instead."

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
      throw new Error("AI failed to provide a parsable output or an output matching the schema. The response might have been empty, malformed, or not adhere to the output JSON structure.");
    }
    
    // Validate AI output server-side as a crucial safeguard
    if (output.row < 0 || output.row > input.maxCoordinate || output.column < 0 || output.column > input.maxCoordinate) {
        throw new Error(`AI returned out-of-bounds coordinates: (${output.row}, ${output.column}) for max index ${input.maxCoordinate}. Reasoning: "${output.reasoning}"`);
    }
    
    const isHit = input.hitCoordinates.some(coord => coord[0] === output.row && coord[1] === output.column);
    const isMiss = input.missCoordinates.some(coord => coord[0] === output.row && coord[1] === output.column);

    if (isHit || isMiss) {
        let type = isHit ? "hit" : "miss";
        throw new Error(`AI returned already targeted coordinates: (${output.row}, ${output.column}) which was a previous ${type}. Reasoning: "${output.reasoning}"`);
    }

    return output;
  }
);
