import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createEmptyBoard, 
  initGameState, 
  gameReducer, 
  getDropSpeed,
  calculateShadowPosition,
  BOARD_WIDTH,
  BOARD_HEIGHT
} from './game';
import { randomTetromino } from './tetrominos';
import type { GameState, Tetromino } from './types';

// Mock the randomTetromino function to return predictable results for testing
vi.mock('./tetrominos', () => {
  let callCount = 0;
  const tetrominoTypes: Array<'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'> = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  
  return {
    randomTetromino: vi.fn((specificType?: 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z') => {
      const type = specificType || tetrominoTypes[callCount % tetrominoTypes.length] as 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
      callCount++;
      
      const shapes = {
        'I': [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0]
        ],
        'J': [
          [1, 0, 0],
          [1, 1, 1],
          [0, 0, 0]
        ],
        'L': [
          [0, 0, 1],
          [1, 1, 1],
          [0, 0, 0]
        ],
        'O': [
          [1, 1],
          [1, 1]
        ],
        'S': [
          [0, 1, 1],
          [1, 1, 0],
          [0, 0, 0]
        ],
        'T': [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0]
        ],
        'Z': [
          [1, 1, 0],
          [0, 1, 1],
          [0, 0, 0]
        ]
      };
      
      return {
        type,
        shape: shapes[type],
        position: { x: type === 'O' ? 4 : 3, y: 0 },
        rotation: 0
      };
    }),
    isValidPosition: vi.fn().mockImplementation((tetromino: any, board: any[][], position = tetromino.position, shape = tetromino.shape) => {
      const { x, y } = position;
      
      for (let row: number = 0; row < shape.length; row++) {
        for (let col: number = 0; col < shape[row].length; col++) {
          if (shape[row][col] === 0) continue;
          
          const boardX = x + col;
          const boardY = y + row;
          
          if (
            boardX < 0 || 
            boardX >= board[0].length || 
            boardY < 0 || 
            boardY >= board.length
          ) {
            return false;
          }
          
          if (board[boardY][boardX] !== 'empty') {
            return false;
          }
        }
      }
      
      return true;
    }),
    rotateTetromino: vi.fn().mockImplementation((tetromino: any) => {
      // Clone the shape to avoid modifying the original
      const shape = tetromino.shape.map((row: number[]) => [...row]);
      
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
    }),
    TETROMINOS: {
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
    }
  };
});

describe('Game Board Creation', () => {
  it('should create an empty board with correct dimensions', () => {
    const board = createEmptyBoard();
    
    // Check board dimensions
    expect(board.length).toBe(BOARD_HEIGHT);
    expect(board[0].length).toBe(BOARD_WIDTH);
    
    // Check all cells are empty
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        expect(board[y][x]).toBe('empty');
      }
    }
  });
});

describe('Game State Initialization', () => {
  it('should initialize game state with correct values', () => {
    const state = initGameState();
    
    // Check board is created
    expect(state.board).toBeDefined();
    expect(state.board.length).toBe(BOARD_HEIGHT);
    
    // Check pieces are generated
    expect(state.currentPiece).toBeDefined();
    expect(state.nextPiece).toBeDefined();
    expect(state.nextPieces.length).toBe(3);
    
    // Check initial game values
    expect(state.score).toBe(0);
    expect(state.level).toBe(1);
    expect(state.lines).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.heldPiece).toBeNull();
  });
});

describe('Drop Speed Calculation', () => {
  it('should calculate correct drop speed based on level', () => {
    // Level 1 should be 1000ms
    expect(getDropSpeed(1)).toBe(1000);
    
    // Level 5 should be 600ms
    expect(getDropSpeed(5)).toBe(600);
    
    // Level 10 should be 100ms
    expect(getDropSpeed(10)).toBe(100);
    
    // Level 15 should be capped at 100ms
    expect(getDropSpeed(15)).toBe(100);
  });
});

describe('Game Actions', () => {
  let initialState: GameState;
  
  beforeEach(() => {
    initialState = initGameState();
    // Ensure we have a predictable current piece for testing
    initialState.currentPiece = {
      type: 'T',
      shape: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ],
      position: { x: 3, y: 5 },
      rotation: 0
    };
  });
  
  it('should move piece left when valid', () => {
    const newState = gameReducer(initialState, { type: 'MOVE_LEFT' });
    
    expect(newState.currentPiece?.position.x).toBe(2);
    expect(newState.currentPiece?.position.y).toBe(5);
  });
  
  it('should move piece right when valid', () => {
    const newState = gameReducer(initialState, { type: 'MOVE_RIGHT' });
    
    expect(newState.currentPiece?.position.x).toBe(4);
    expect(newState.currentPiece?.position.y).toBe(5);
  });
  
  it('should move piece down when valid', () => {
    const newState = gameReducer(initialState, { type: 'MOVE_DOWN' });
    
    expect(newState.currentPiece?.position.x).toBe(3);
    expect(newState.currentPiece?.position.y).toBe(6);
  });
  
  it('should rotate piece when valid', () => {
    const newState = gameReducer(initialState, { type: 'ROTATE' });
    
    // Check if rotation happened (shape should be different)
    expect(newState.currentPiece?.shape).not.toEqual(initialState.currentPiece?.shape);
    expect(newState.currentPiece?.rotation).toBe(1);
  });
  
  it('should pause and resume the game', () => {
    const pausedState = gameReducer(initialState, { type: 'PAUSE_GAME' });
    expect(pausedState.isPaused).toBe(true);
    
    const resumedState = gameReducer(pausedState, { type: 'RESUME_GAME' });
    expect(resumedState.isPaused).toBe(false);
  });
  
  it('should start a new game', () => {
    // First set game over
    const gameOverState = { ...initialState, gameOver: true };
    
    // Then start a new game
    const newGameState = gameReducer(gameOverState, { type: 'NEW_GAME' });
    
    expect(newGameState.gameOver).toBe(false);
    expect(newGameState.score).toBe(0);
    expect(newGameState.level).toBe(1);
    expect(newGameState.lines).toBe(0);
  });
});

describe('Shadow Position Calculation', () => {
  it('should calculate the correct shadow position', () => {
    const state = initGameState();
    if (!state.currentPiece) {
      throw new Error('Current piece is null');
    }
    
    // Position the piece higher in the board
    state.currentPiece.position.y = 2;
    
    const shadow = calculateShadowPosition(state);
    
    expect(shadow).toBeDefined();
    expect(shadow?.position.x).toBe(state.currentPiece.position.x);
    expect(shadow?.position.y).toBeGreaterThan(state.currentPiece.position.y);
  });
});
