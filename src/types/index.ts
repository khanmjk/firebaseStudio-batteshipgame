

export const BOARD_SIZE = 10;

export type ShipName = 'Carrier' | 'Battleship' | 'Cruiser' | 'Submarine' | 'Destroyer';

export interface ShipConfig {
  name: ShipName;
  size: number;
  icon?: React.ElementType; // For potential UI representation
}

export const ALL_SHIP_CONFIGS: Readonly<Record<ShipName, ShipConfig>> = {
  Carrier: { name: 'Carrier', size: 5 },
  Battleship: { name: 'Battleship', size: 4 },
  Cruiser: { name: 'Cruiser', size: 3 },
  Submarine: { name: 'Submarine', size: 3 },
  Destroyer: { name: 'Destroyer', size: 2 },
};

export const SHIPS_TO_PLACE_CONFIG: ShipConfig[] = [
  ALL_SHIP_CONFIGS.Carrier,
  ALL_SHIP_CONFIGS.Battleship,
  ALL_SHIP_CONFIGS.Cruiser,
  ALL_SHIP_CONFIGS.Submarine,
  ALL_SHIP_CONFIGS.Destroyer,
];


export interface PlacedShip {
  id: string; // Unique ID for each placed ship instance, e.g., "Carrier-1"
  name: ShipName;
  size: number;
  positions: Array<[number, number]>; // Array of [row, col]
  hits: Array<[number, number]>;
  isSunk: boolean;
  orientation: 'horizontal' | 'vertical';
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk' | 'preview';

export interface GridCell {
  row: number;
  col: number;
  state: CellState;
  shipId?: string | null; // ID of the ship occupying this cell
}

export type GameGrid = GridCell[][];

export type Player = 'user' | 'computer';

export type GamePhase = 'setup' | 'playing' | 'gameOver';

export interface ShotResult {
  type: 'hit' | 'miss' | 'sunk';
  shipName?: ShipName; // Name of the ship hit or sunk
  coordinates: [number, number]; // [row, col] of the shot
  shipId?: string; // ID of the ship that was hit/sunk
}

// AI Flow Input/Output Types
export interface GetTargetCoordinatesInput {
  boardSize: number;
  maxCoordinate: number; // boardSize - 1
  hitCoordinates: Array<[number, number]>;
  missCoordinates: Array<[number, number]>;
}

export interface GetTargetCoordinatesOutput {
  row: number;
  column: number;
  reasoning: string;
}
