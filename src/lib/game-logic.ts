
import type { GameGrid, GridCell, PlacedShip, ShipConfig, CellState, ShotResult, ShipName } from '@/types';
import { BOARD_SIZE, SHIPS_TO_PLACE_CONFIG, ALL_SHIP_CONFIGS } from '@/types';

export function initializeGrid(size: number = BOARD_SIZE): GameGrid {
  return Array(size)
    .fill(null)
    .map((_, rowIndex) =>
      Array(size)
        .fill(null)
        .map((_, colIndex) => ({
          row: rowIndex,
          col: colIndex,
          state: 'empty' as CellState,
          shipId: null,
        }))
    );
}

export function getShipPositions(
  row: number,
  col: number,
  shipSize: number,
  orientation: 'horizontal' | 'vertical'
): Array<[number, number]> {
  const positions: Array<[number, number]> = [];
  for (let i = 0; i < shipSize; i++) {
    if (orientation === 'horizontal') {
      positions.push([row, col + i]);
    } else {
      positions.push([row + i, col]);
    }
  }
  return positions;
}

export function canPlaceShip(
  grid: GameGrid,
  row: number,
  col: number,
  shipSize: number,
  orientation: 'horizontal' | 'vertical'
): boolean {
  const positions = getShipPositions(row, col, shipSize, orientation);

  for (const [r, c] of positions) {
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
      return false; // Out of bounds
    }
    if (grid[r][c].shipId) {
      return false; // Overlapping another ship
    }
  }
  return true;
}

export function placeShipOnGrid(
  grid: GameGrid,
  ship: PlacedShip
): GameGrid {
  const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
  ship.positions.forEach(([r, c]) => {
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      newGrid[r][c].shipId = ship.id;
      newGrid[r][c].state = 'ship';
    }
  });
  return newGrid;
}

export function placeAllComputerShips(): { ships: PlacedShip[]; grid: GameGrid } {
  let computerGrid = initializeGrid();
  const computerShips: PlacedShip[] = [];
  let shipIdCounter = 0;

  SHIPS_TO_PLACE_CONFIG.forEach(shipConfig => {
    let placed = false;
    while (!placed) {
      const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const row = Math.floor(Math.random() * BOARD_SIZE);
      const col = Math.floor(Math.random() * BOARD_SIZE);

      if (canPlaceShip(computerGrid, row, col, shipConfig.size, orientation)) {
        const positions = getShipPositions(row, col, shipConfig.size, orientation);
        const newShip: PlacedShip = {
          id: `computer-${shipConfig.name}-${shipIdCounter++}`,
          name: shipConfig.name,
          size: shipConfig.size,
          positions,
          hits: [],
          isSunk: false,
          orientation,
        };
        computerShips.push(newShip);
        computerGrid = placeShipOnGrid(computerGrid, newShip);
        placed = true;
      }
    }
  });
  return { ships: computerShips, grid: computerGrid };
}


export function processShot(
  targetGrid: GameGrid,
  targetShips: PlacedShip[],
  row: number,
  col: number
): { updatedGrid: GameGrid; updatedShips: PlacedShip[]; shotResult: ShotResult } {
  const newGrid = targetGrid.map(r => r.map(c => ({ ...c })));
  const newShips = targetShips.map(s => ({ ...s, hits: [...s.hits] })); // Ensure hits array is copied
  const cell = newGrid[row][col];
  let shotResultType: ShotResult['type'] = 'miss';
  let hitShipName: ShipName | undefined = undefined;
  let actualHitShipId: string | undefined = undefined;

  if (cell.shipId) {
    const shipIndex = newShips.findIndex(s => s.id === cell.shipId);
    if (shipIndex !== -1) {
      const ship = newShips[shipIndex];
      actualHitShipId = ship.id;
      hitShipName = ship.name;
      
      if (!ship.hits.some(h => h[0] === row && h[1] === col)) {
        ship.hits.push([row, col]);
      }

      if (ship.hits.length === ship.size) {
        ship.isSunk = true;
        shotResultType = 'sunk';
        ship.positions.forEach(([rPos, cPos]) => {
          newGrid[rPos][cPos].state = 'sunk';
        });
      } else {
        shotResultType = 'hit';
        newGrid[row][col].state = 'hit';
      }
    } else {
      newGrid[row][col].state = 'miss'; // Should not happen if shipId is valid
    }
  } else {
    newGrid[row][col].state = 'miss';
  }
  
  const shotResult: ShotResult = { type: shotResultType, coordinates: [row, col], shipName: hitShipName, shipId: actualHitShipId };
  return { updatedGrid: newGrid, updatedShips: newShips, shotResult };
}

export function checkGameOver(ships: PlacedShip[]): boolean {
  return ships.every(ship => ship.isSunk);
}

export function getPreviewGrid(
  baseGrid: GameGrid,
  row: number,
  col: number,
  shipConfig: ShipConfig | null,
  orientation: 'horizontal' | 'vertical'
): GameGrid {
  const previewGrid = baseGrid.map(r => r.map(c => ({ ...c, state: c.state === 'preview' ? 'empty' : c.state })));
  if (!shipConfig || row < 0 || col < 0) return previewGrid;

  const canPlace = canPlaceShip(baseGrid, row, col, shipConfig.size, orientation);
  const positions = getShipPositions(row, col, shipConfig.size, orientation);

  positions.forEach(([r, c]) => {
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      if (baseGrid[r][c].state === 'empty' || baseGrid[r][c].state === 'preview') {
         previewGrid[r][c].state = canPlace ? 'preview' : 'empty'; 
      }
    }
  });

  return previewGrid;
}

export function getFiredCoordinates(grid: GameGrid): Array<[number, number]> {
  const coordinates: Array<[number, number]> = [];
  grid.forEach(row => {
    row.forEach(cell => {
      if (cell.state === 'hit' || cell.state === 'miss' || cell.state === 'sunk') {
        coordinates.push([cell.row, cell.col]);
      }
    });
  });
  return coordinates;
}
