
# Naval Standoff: A Modern Battleship Game

Welcome to Naval Standoff! This is a classic game of Battleship built with a modern tech stack, featuring an intelligent AI opponent powered by Google's Generative AI. Deploy your fleet, strategize your shots, and outsmart the enemy to claim victory on the high seas.

## Table of Contents

- [Gameplay Instructions](#gameplay-instructions)
  - [Setup Phase: Deploy Your Fleet](#setup-phase-deploy-your-fleet)
  - [Playing Phase: Engage the Enemy](#playing-phase-engage-the-enemy)
  - [Winning the Game](#winning-the-game)
- [Technical Implementation](#technical-implementation)
  - [Tech Stack](#tech-stack)
  - [Core Components](#core-components)
  - [Game Logic (`src/lib/game-logic.ts`)](#game-logic-srclibgame-logicts)
  - [AI Opponent (`src/ai/flows/opponent-intelligence.ts`)](#ai-opponent-srcaiflowsopponent-intelligencets)
  - [Styling](#styling)
- [Running the Project Locally](#running-the-project-locally)
- [Project Structure](#project-structure)

## Gameplay Instructions

The game is played on two grids: "Your Waters" (where you place your ships and the AI shoots) and "Enemy Waters" (where the AI's hidden ships are, and you shoot).

### Setup Phase: Deploy Your Fleet

1.  **Select a Ship:**
    *   From the "Ship Deployment" panel, click on a ship from the "Available Ships" list to select it.
    *   Alternatively, you can drag a ship from the list directly onto your board.
2.  **Place the Ship:**
    *   **Click to Place:** After selecting a ship, click on a cell in "Your Waters" where you want the top-leftmost part of the ship to be.
    *   **Drag and Drop:** Drag the selected ship from the list and drop it onto the desired starting cell on your board.
3.  **Rotate the Ship:**
    *   Press the **Spacebar** key while a ship is selected (before placing it) to toggle its orientation between horizontal and vertical.
    *   You can also click the "Rotate" button in the "Ship Deployment" panel.
4.  **Placement Rules:**
    *   Ships cannot overlap.
    *   Ships must be placed entirely within the boundaries of the board.
    *   You must place all ships listed (Carrier, Battleship, Cruiser, Submarine, Destroyer).
5.  **Start Game:**
    *   Once all your ships are placed, the "Start Game" button will become active. Click it to begin the battle.
    *   If you wish to change your deployment, you can click the "Reset Ships" button.

### Playing Phase: Engage the Enemy

1.  **Taking Turns:** The game proceeds in turns. "Your Turn to Fire" or "Opponent's Turn" will be displayed.
2.  **Firing a Shot (Your Turn):**
    *   Click on a cell in the "Enemy Waters" grid to fire a shot at those coordinates.
    *   You cannot fire at the same cell twice.
3.  **Shot Results:**
    *   **Miss:** The cell turns a muted color (e.g., green), indicating empty water. An icon representing waves appears.
    *   **Hit:** The cell turns an accent color (e.g., orange/red), indicating you've hit part of an enemy ship. An icon representing flames appears.
    *   **Sunk:** If your hit sinks an entire enemy ship, all cells occupied by that ship will be marked as sunk (e.g., dark red/black). An icon representing a skull appears.
4.  **Opponent's Turn:**
    *   The AI opponent will take its turn automatically (or by clicking "Process Opponent's Move" if manual stepping is enabled).
    *   The AI's shot will be marked on "Your Waters" grid with the same hit, miss, or sunk indicators.
    *   The AI's reasoning for its shot choice will often be displayed in the "Game Status" panel.

### Winning the Game

*   You win by sinking all of the opponent's ships before the opponent sinks all of yours.
*   The game ends when one player's entire fleet is sunk.

## Technical Implementation

Naval Standoff is built using a modern web development stack, leveraging server-side rendering and generative AI for an enhanced experience.

### Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (using the App Router for routing and Server Components where appropriate)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **UI Components:** [ShadCN UI](https://ui.shadcn.com/) - A collection of beautifully designed, accessible components.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) - For utility-first CSS styling.
*   **Generative AI:** [Genkit](https://firebase.google.com/docs/genkit) (a Firebase product) - Used to orchestrate calls to Google's AI models (specifically Gemini) for the opponent's intelligence.

### Core Components

*   **`src/app/page.tsx` (`NavalStandoffPage`):**
    *   The main component that orchestrates the entire game.
    *   Manages game state (grids, ships, game phase, current player, winner).
    *   Handles user interactions for ship placement and firing shots.
    *   Manages the computer's turn and communication with the AI flow.
*   **`src/components/game-board.tsx` (`GameBoard`):**
    *   Renders the 10x10 game grids for both the player and the opponent.
    *   Displays cell states (empty, ship, hit, miss, sunk, preview) with appropriate styling and icons.
    *   Handles cell click, hover, leave, and drop events for interactivity.
    *   Includes row (A-J) and column (1-10) identifiers.
*   **`src/components/ship-placement-controls.tsx` (`ShipPlacementControls`):**
    *   Provides the UI for the ship setup phase.
    *   Lists available ships, allows selection, and supports drag-and-drop.
    *   Includes controls for rotating ships, resetting placement, and starting the game.
*   **`src/components/game-status-display.tsx` (`GameStatusDisplay`):**
    *   Shows game-related messages, current turn information, winner announcements.
    *   Displays the AI's reasoning for its moves.
    *   Shows the result of the last shot taken.

### Game Logic (`src/lib/game-logic.ts`)

This module contains the core, non-UI-related functions for managing the Battleship game mechanics:

*   `initializeGrid()`: Creates an empty game grid.
*   `getShipPositions()`: Calculates the cells a ship would occupy based on its start, size, and orientation.
*   `canPlaceShip()`: Validates if a ship can be placed at a given location without going out of bounds or overlapping existing ships.
*   `placeShipOnGrid()`: Updates the grid state when a ship is placed.
*   `placeAllComputerShips()`: Randomly places the computer's ships on its grid.
*   `processShot()`: Updates the grid and ship states after a shot is fired, determining if it's a hit, miss, or sunk.
*   `checkGameOver()`: Determines if all ships of a player have been sunk.
*   `getPreviewGrid()`: Generates a temporary grid to show where a ship would be placed during setup.
*   `getFiredCoordinates()`: Collects all coordinates that have already been targeted on a grid.

### AI Opponent (`src/ai/flows/opponent-intelligence.ts`)

The AI opponent's intelligence is powered by Genkit, which interacts with a Google AI model (Gemini).

*   **Purpose:** To determine the computer opponent's next shot in a strategically plausible manner.
*   **Genkit Flow (`getTargetCoordinatesFlow`):**
    *   Defines the input schema (`GetTargetCoordinatesInputSchema`): `boardSize`, `maxCoordinate`, `hitCoordinates` (successful hits, including sunk), `missCoordinates`.
    *   Defines the output schema (`GetTargetCoordinatesOutputSchema`): `row`, `column` for the next shot, and `reasoning` (the AI's explanation).
    *   Wraps an AI prompt defined with `ai.definePrompt`.
*   **Prompt Engineering:**
    *   The prompt instructs the AI to act as an expert Battleship strategist.
    *   It provides the current board state (hits and misses).
    *   **Critical Instructions:** The prompt heavily emphasizes that the AI *must* choose coordinates that are within bounds and *have not* been previously targeted.
    *   **Strategy Guidelines:**
        *   **Targeting Mode:** If there are active (non-sunk) hits, the AI is guided to shoot adjacent cells.
        *   **Hunting Mode:** If no active hits, the AI uses patterns (like checkerboard) or random selection to find new targets.
    *   The AI is required to explain its reasoning, especially if its initial strategic choice was invalid (e.g., already targeted).
*   **Server-Side Validation:**
    *   The `getTargetCoordinatesFlow` function includes server-side validation. After the LLM provides a response, the flow checks if the chosen coordinates are within bounds and if they haven't already been targeted.
    *   If the AI's choice is invalid, the flow throws an error, which is then handled by the frontend (usually by resorting to a random valid shot as a fallback).
*   **Invoking the AI:**
    *   The `NavalStandoffPage` component calls the exported `getTargetCoordinates(input)` function, which in turn executes the Genkit flow.

### Styling

*   **`src/app/globals.css`:** Defines the base Tailwind CSS layers, global HSL CSS variables for theming (dark theme focused), and custom game-specific styles (e.g., `cell-miss`, `cell-ship-preview`).
*   **Tailwind CSS:** Utility classes are used extensively throughout the components for styling.
*   **ShadCN UI Components:** These components come with their own styling, which is customized via the HSL variables in `globals.css`.
*   **Lucide React Icons:** Used for iconography throughout the application (e.g., ship, flame, skull icons).

## Running the Project Locally

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up Environment Variables:**
    *   Create a `.env` file in the root of the project.
    *   If your Genkit AI provider (e.g., Google AI Studio) requires an API key, add it here:
        ```env
        GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
        ```
4.  **Run the development server for Next.js:**
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002`.

5.  **Run the Genkit development server (in a separate terminal):**
    *   Genkit flows are often developed and tested with their own local server.
    ```bash
    npm run genkit:dev
    # or for auto-reloading on changes
    npm run genkit:watch
    ```
    This allows Genkit to manage and serve the AI flows, which the Next.js application will call.

## Project Structure

A brief overview of key directories:

*   **`src/app/`:** Contains the main page (`page.tsx`) and layout (`layout.tsx`) for the Next.js App Router.
*   **`src/components/`:**
    *   **`ui/`:** ShadCN UI components.
    *   Other custom React components used in the game (e.g., `game-board.tsx`, `ship-placement-controls.tsx`).
*   **`src/lib/`:**
    *   `game-logic.ts`: Core game mechanics.
    *   `utils.ts`: Utility functions (like `cn` for class names).
*   **`src/ai/`:**
    *   `genkit.ts`: Genkit global configuration.
    *   `flows/`: Contains Genkit flow definitions (e.g., `opponent-intelligence.ts`).
*   **`src/types/`:** TypeScript type definitions for the game.
*   **`public/`:** Static assets (though not heavily used in this project beyond a potential favicon).
*   **`src/hooks/`:** Custom React hooks (e.g., `useToast.ts`).

---

Enjoy playing Naval Standoff!
