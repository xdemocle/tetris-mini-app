export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type CellValue = TetrominoType | 'empty';

export type Position = {
  x: number;
  y: number;
};

export type Tetromino = {
  type: TetrominoType;
  shape: number[][];
  position: Position;
  rotation: number;
};

export type GameState = {
  board: CellValue[][];
  currentPiece: Tetromino | null;
  nextPiece: Tetromino | null;
  nextPieces: Tetromino[];
  heldPiece: TetrominoType | null;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  isPaused: boolean;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  level: number;
  lines: number;
  timestamp: number;
};

export type GameAction = 
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'MOVE_DOWN' }
  | { type: 'ROTATE' }
  | { type: 'HARD_DROP' }
  | { type: 'NEW_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'GAME_OVER' }
  | { type: 'TICK' }
  | { type: 'NEW_PIECE' }
  | { type: 'HOLD' };
