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
  hitCoordinates: z
    .array(z.tuple([z.number(), z.number()]))
    .describe(
      'An array of coordinates (row, column) where the computer has successfully hit a ship.'
    ),
  missCoordinates: z
    .array(z.tuple([z.number(), z.number()]))
    .describe(
      'An array of coordinates (row, column) where the computer has missed.'
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

  Given the current game state, your task is to determine the optimal coordinates for the next shot by the computer opponent.

  Here's the information you have:
  - Board Size: {{boardSize}}x{{boardSize}}
  - Hit Coordinates: {{#if hitCoordinates}}{{#each hitCoordinates}}({{this.0}}, {{this.1}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
  - Miss Coordinates: {{#if missCoordinates}}{{#each missCoordinates}}({{this.0}}, {{this.1}}){{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}

  Consider the following when choosing your next target:
  1. **Hunting Mode:** If no hits have been recorded, target coordinates randomly but avoid previously missed locations.
  2. **Targeting Mode:** If there are hit coordinates, focus on adjacent cells (horizontally and vertically) to those hits. Prioritize cells that have not been targeted before. Avoid diagonal shots.
  3. **Reasoning:** Explain your strategy for choosing the coordinates. For example, "Targeting Mode: There is a hit at (2,3), so I am targeting (2,4) to try and sink the ship." Or, "Hunting Mode: No hits yet, so I am randomly targeting an un-targeted cell."

  Output your decision in JSON format with 'row', 'column', and 'reasoning' fields.
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
    return output!;
  }
);
