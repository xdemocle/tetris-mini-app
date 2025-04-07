import type { Tetromino, TetrominoType, Position } from './types';

// Define the shapes of each tetromino
export const TETROMINOS = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ]
};

// Colors for each tetromino type
export const TETROMINO_COLORS = {
  I: '#00FFFF', // Cyan
  J: '#0000FF', // Blue
  L: '#FFA500', // Orange
  O: '#FFFF00', // Yellow
  S: '#00FF00', // Green
  T: '#FF00FF', // Magenta/Pink
  Z: '#FF0000', // Red
  empty: 'transparent'
};

// Generate a random tetromino
export function randomTetromino(specificType?: TetrominoType): Tetromino {
  let type: TetrominoType;
  
  if (specificType) {
    type = specificType;
  } else {
    const types: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    type = types[Math.floor(Math.random() * types.length)];
  }
  
  return {
    type,
    shape: TETROMINOS[type],
    position: { x: type === 'O' ? 4 : 3, y: 0 },
    rotation: 0
  };
}

// Rotate a tetromino
export function rotateTetromino(tetromino: Tetromino): number[][] {
  // Clone the shape to avoid modifying the original
  const shape = tetromino.shape.map(row => [...row]);
  
  // For O tetromino, no rotation is needed
  if (tetromino.type === 'O') return shape;
  
  const size = shape.length;
  const rotated = Array(size).fill(0).map(() => Array(size).fill(0));
  
  // Rotate 90 degrees clockwise
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rotated[x][size - 1 - y] = shape[y][x];
    }
  }
  
  return rotated;
}

// Check if a position is valid (within bounds and not colliding)
export function isValidPosition(
  tetromino: Tetromino,
  board: any[][],
  position: Position = tetromino.position,
  shape: number[][] = tetromino.shape
): boolean {
  const { x, y } = position;
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      // Skip empty cells in the tetromino
      if (shape[row][col] === 0) continue;
      
      const boardX = x + col;
      const boardY = y + row;
      
      // Check if out of bounds
      if (
        boardX < 0 || 
        boardX >= board[0].length || 
        boardY < 0 || 
        boardY >= board.length
      ) {
        return false;
      }
      
      // Check if collision with existing pieces
      if (board[boardY][boardX] !== 'empty') {
        return false;
      }
    }
  }
  
  return true;
}
