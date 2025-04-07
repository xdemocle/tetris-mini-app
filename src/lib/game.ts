import type { GameState, Tetromino, GameAction, CellValue } from './types';
import { randomTetromino, rotateTetromino, isValidPosition } from './tetrominos';

// Constants
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const POINTS_PER_LINE = [0, 40, 100, 300, 1200]; // Points for 0, 1, 2, 3, 4 lines

// Create an empty game board
export function createEmptyBoard(): CellValue[][] {
  return Array(BOARD_HEIGHT).fill(0).map(() => 
    Array(BOARD_WIDTH).fill('empty')
  );
}

// Initialize game state
export function initGameState(): GameState {
  const nextPiece = randomTetromino();
  const currentPiece = randomTetromino();
  
  // Generate 3 additional pieces for preview
  const nextPieces = [
    randomTetromino(),
    randomTetromino(),
    randomTetromino()
  ];
  
  return {
    board: createEmptyBoard(),
    currentPiece,
    nextPiece,
    nextPieces,
    heldPiece: null,
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    isPaused: false
  };
}

// Calculate drop speed based on level
export function getDropSpeed(level: number): number {
  // Speed formula: starts at 1000ms (level 1) and decreases with each level
  // At level 10, it's around 100ms
  return Math.max(100, 1000 - ((level - 1) * 100));
}

// Game reducer to handle all game actions
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.gameOver && action.type !== 'NEW_GAME') {
    return state;
  }

  if (state.isPaused && 
      action.type !== 'RESUME_GAME' && 
      action.type !== 'NEW_GAME') {
    return state;
  }

  switch (action.type) {
    case 'NEW_GAME':
      return initGameState();
      
    case 'PAUSE_GAME':
      return { ...state, isPaused: true };
      
    case 'RESUME_GAME':
      return { ...state, isPaused: false };
      
    case 'MOVE_LEFT': {
      if (!state.currentPiece) return state;
      
      const newPosition = { 
        ...state.currentPiece.position, 
        x: state.currentPiece.position.x - 1 
      };
      
      if (isValidPosition(
        state.currentPiece, 
        state.board, 
        newPosition
      )) {
        return {
          ...state,
          currentPiece: {
            ...state.currentPiece,
            position: newPosition
          }
        };
      }
      return state;
    }
    
    case 'MOVE_RIGHT': {
      if (!state.currentPiece) return state;
      
      const newPosition = { 
        ...state.currentPiece.position, 
        x: state.currentPiece.position.x + 1 
      };
      
      if (isValidPosition(
        state.currentPiece, 
        state.board, 
        newPosition
      )) {
        return {
          ...state,
          currentPiece: {
            ...state.currentPiece,
            position: newPosition
          }
        };
      }
      return state;
    }
    
    case 'MOVE_DOWN': {
      if (!state.currentPiece) return state;
      
      const newPosition = { 
        ...state.currentPiece.position, 
        y: state.currentPiece.position.y + 1 
      };
      
      if (isValidPosition(
        state.currentPiece, 
        state.board, 
        newPosition
      )) {
        return {
          ...state,
          currentPiece: {
            ...state.currentPiece,
            position: newPosition
          }
        };
      } else {
        // If can't move down, lock the piece and generate a new one
        return lockPieceAndContinue(state);
      }
    }
    
    case 'ROTATE': {
      if (!state.currentPiece) return state;
      
      const rotatedShape = rotateTetromino(state.currentPiece);
      
      if (isValidPosition(
        state.currentPiece, 
        state.board, 
        state.currentPiece.position, 
        rotatedShape
      )) {
        return {
          ...state,
          currentPiece: {
            ...state.currentPiece,
            shape: rotatedShape,
            rotation: (state.currentPiece.rotation + 1) % 4
          }
        };
      }
      
      // Wall kick - try to adjust position if rotation near wall
      const kicks = [1, -1, 2, -2]; // Try these x-offsets
      for (const kick of kicks) {
        const kickedPosition = {
          ...state.currentPiece.position,
          x: state.currentPiece.position.x + kick
        };
        
        if (isValidPosition(
          state.currentPiece,
          state.board,
          kickedPosition,
          rotatedShape
        )) {
          return {
            ...state,
            currentPiece: {
              ...state.currentPiece,
              shape: rotatedShape,
              position: kickedPosition,
              rotation: (state.currentPiece.rotation + 1) % 4
            }
          };
        }
      }
      
      return state;
    }
    
    case 'HARD_DROP': {
      if (!state.currentPiece) return state;
      
      let newY = state.currentPiece.position.y;
      
      // Find the lowest valid position
      while (isValidPosition(
        state.currentPiece,
        state.board,
        { ...state.currentPiece.position, y: newY + 1 }
      )) {
        newY++;
      }
      
      const droppedPiece = {
        ...state.currentPiece,
        position: { ...state.currentPiece.position, y: newY }
      };
      
      return lockPieceAndContinue({
        ...state,
        currentPiece: droppedPiece
      });
    }
    
    case 'TICK': {
      // Same as MOVE_DOWN but automatic
      return gameReducer(state, { type: 'MOVE_DOWN' });
    }
    
    case 'GAME_OVER': {
      return { ...state, gameOver: true };
    }
    
    case 'NEW_PIECE': {
      // Shift pieces in the queue
      const [nextPiece1, ...remainingPieces] = state.nextPieces;
      const updatedNextPieces = [...remainingPieces, randomTetromino()];
      
      // Generate a new current piece and update next pieces
      return {
        ...state,
        currentPiece: state.nextPiece,
        nextPiece: nextPiece1,
        nextPieces: updatedNextPieces
      };
    }
    
    case 'HOLD': {
      if (!state.currentPiece || state.gameOver) return state;
      
      // Get current piece type
      const currentType = state.currentPiece.type;
      console.log('HOLD action dispatched:', currentType);
      
      if (!state.heldPiece) {
        // First hold - store current piece and get a new one
        console.log('First hold, storing piece:', currentType);
        
        // Shift pieces in the queue
        const [nextPiece1, ...remainingPieces] = state.nextPieces;
        const updatedNextPieces = [...remainingPieces, randomTetromino()];
        
        const newState = {
          ...state,
          heldPiece: currentType,
          currentPiece: state.nextPiece,
          nextPiece: nextPiece1,
          nextPieces: updatedNextPieces
        };
        console.log('New state after hold:', newState.heldPiece);
        return newState;
      } else {
        // Swap held piece with current piece
        const tempHeld = state.heldPiece;
        console.log('Swapping held piece:', tempHeld, 'with current:', currentType);
        
        // Create a new piece of the previously held type with centered position
        const newPiece = randomTetromino(tempHeld);
        newPiece.position = { x: tempHeld === 'O' ? 4 : 3, y: 0 };
        
        // Check if new piece position is valid
        if (!isValidPosition(newPiece, state.board, newPiece.position)) {
          console.log('Cannot swap - invalid position, game over');
          // If not valid, game is over
          return { ...state, gameOver: true };
        }
        
        const newState = {
          ...state,
          heldPiece: currentType,
          currentPiece: newPiece,
          // Keep the existing nextPieces array
          nextPieces: state.nextPieces
        };
        console.log('New state after swap:', newState.heldPiece);
        return newState;
      }
    }
    
    default:
      return state;
  }
}

// Lock the current piece in place and generate a new piece
function lockPieceAndContinue(state: GameState): GameState {
  if (!state.currentPiece) return state;
  
  // Create a new board with the current piece locked in place
  const newBoard = state.board.map(row => [...row]);
  const { shape, position, type } = state.currentPiece;
  
  // Add the current piece to the board
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const boardY = position.y + y;
        const boardX = position.x + x;
        
        // If piece is locked above the board, game over
        if (boardY < 0) {
          return { ...state, gameOver: true };
        }
        
        newBoard[boardY][boardX] = type;
      }
    }
  }
  
  // Check for completed lines
  const { clearedBoard, linesCleared } = clearLines(newBoard);
  
  // Calculate score based on lines cleared and level
  const additionalScore = POINTS_PER_LINE[linesCleared] * state.level;
  const newScore = state.score + additionalScore;
  
  // Update lines cleared and level
  const newLines = state.lines + linesCleared;
  const newLevel = Math.floor(newLines / 10) + 1;
  
  // Shift pieces in the queue and add a new one at the end
  const [nextPiece1, ...remainingPieces] = state.nextPieces;
  const updatedNextPieces = [...remainingPieces, randomTetromino()];
  
  // Check if there are any blocks in the top row (game over condition)
  const isGameOver = clearedBoard[0].some(cell => cell !== 'empty');
  
  return {
    ...state,
    board: clearedBoard,
    currentPiece: state.nextPiece,
    nextPiece: nextPiece1,
    nextPieces: updatedNextPieces,
    score: newScore,
    lines: newLines,
    level: newLevel,
    gameOver: isGameOver || state.gameOver
  };
}

// Clear completed lines and return the new board and number of lines cleared
function clearLines(board: CellValue[][]): { clearedBoard: CellValue[][], linesCleared: number } {
  let linesCleared = 0;
  let clearedBoard = [...board];
  
  // Check each row from bottom to top
  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    // If row is full (no empty cells)
    if (clearedBoard[y].every(cell => cell !== 'empty')) {
      linesCleared++;
      
      // Remove the completed line and add an empty line at the top
      clearedBoard.splice(y, 1);
      clearedBoard.unshift(Array(BOARD_WIDTH).fill('empty'));
      
      // Since we removed a line, we need to check the same y index again
      y++;
    }
  }
  
  return { clearedBoard, linesCleared };
}

// Calculate shadow position (ghost piece)
export function calculateShadowPosition(state: GameState): Tetromino | null {
  if (!state.currentPiece) return null;
  
  let shadowY = state.currentPiece.position.y;
  
  // Find the lowest valid position
  while (isValidPosition(
    state.currentPiece,
    state.board,
    { ...state.currentPiece.position, y: shadowY + 1 }
  )) {
    shadowY++;
  }
  
  return {
    ...state.currentPiece,
    position: { ...state.currentPiece.position, y: shadowY }
  };
}
