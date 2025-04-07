<script lang="ts">
  import { TETROMINO_COLORS } from '../lib/tetrominos';
  import type { GameState, Tetromino } from '../lib/types';
  import { calculateShadowPosition } from '../lib/game';
  
  export let gameState: GameState;
  
  // Calculate cell size based on screen size
  let cellSize = 25; // Default size
  let boardWidth = 10 * cellSize;
  let boardHeight = 20 * cellSize;
  
  // Resize board based on window size
  function updateBoardSize() {
    const container = document.querySelector('.canvas-container');
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate the maximum possible cell size that would fit in the container
    // while maintaining the 10:20 ratio of the game board
    const containerRatio = containerWidth / containerHeight;
    const boardRatio = 10 / 20; // width:height ratio of the game board
    
    let maxWidth, maxHeight;
    
    if (containerRatio > boardRatio) {
      // Container is wider than the board ratio, so height is the limiting factor
      maxHeight = containerHeight;
      maxWidth = maxHeight * boardRatio;
    } else {
      // Container is taller than the board ratio, so width is the limiting factor
      maxWidth = containerWidth;
      maxHeight = maxWidth / boardRatio;
    }
    
    // Calculate cell size based on available space
    const widthBasedSize = Math.floor(maxWidth / 10);
    const heightBasedSize = Math.floor(maxHeight / 20);
    
    // Use the smaller of the two to ensure board fits
    cellSize = Math.min(widthBasedSize, heightBasedSize);
    
    // Update board dimensions
    boardWidth = 10 * cellSize;
    boardHeight = 20 * cellSize;
  }
  
  // Update on mount and window resize
  $: if (typeof window !== 'undefined') {
    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
  }
  
  // Calculate shadow position for the current piece
  $: shadowPiece = calculateShadowPosition(gameState);
  
  // Draw a cell with the specified color
  function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isGhost = false) {
    const borderWidth = Math.max(1, Math.floor(cellSize / 10));
    
    // Fill cell
    if (isGhost) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    } else {
      // Make sure we're using the actual color value, not just the variable name
      ctx.fillStyle = color;
    }
    
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    
    // Draw border (only for non-empty cells)
    if (color !== 'transparent') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      
      // Add highlight for 3D effect (not for ghost pieces)
      if (!isGhost) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(
          x * cellSize + borderWidth, 
          y * cellSize + borderWidth, 
          cellSize / 4, 
          cellSize / 4
        );
      }
    }
  }
  
  // Draw the current piece on the board
  function drawPiece(ctx: CanvasRenderingContext2D, piece: Tetromino, isGhost = false) {
    const { shape, position, type } = piece;
    const color = TETROMINO_COLORS[type];
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          
          // Only draw if within board bounds
          if (boardY >= 0 && boardY < 20 && boardX >= 0 && boardX < 10) {
            drawCell(ctx, boardX, boardY, color, isGhost);
          }
        }
      }
    }
  }
  
  import { onMount } from 'svelte';

  // Canvas element reference
  let canvasElement: HTMLCanvasElement;

  // Draw the entire board
  function drawBoard() {
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw the grid
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 10; x++) {
        const cellValue = gameState.board[y][x];
        const color = cellValue === 'empty' ? 'transparent' : TETROMINO_COLORS[cellValue];
        drawCell(ctx, x, y, color);
      }
    }
    
    // Draw shadow piece
    if (shadowPiece && gameState.currentPiece && !gameState.gameOver) {
      drawPiece(ctx, shadowPiece, true);
    }
    
    // Draw current piece
    if (gameState.currentPiece && !gameState.gameOver) {
      drawPiece(ctx, gameState.currentPiece);
    }
    
    // Draw game over overlay
    if (gameState.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(16, cellSize)}px 'Press Start 2P', 'Press Start 2P Fallback', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvasElement.width / 2, canvasElement.height / 2);
    }
    
    // Draw pause overlay
    if (gameState.isPaused && !gameState.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(16, cellSize)}px 'Press Start 2P', 'Press Start 2P Fallback', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', canvasElement.width / 2, canvasElement.height / 2);
    }
  }
  
  // Update the canvas when the game state changes
  $: if (gameState) drawBoard();
  $: if (canvasElement) drawBoard();
  
  onMount(() => {
    drawBoard();
    return () => {
      // Cleanup if needed
    };
  });
</script>

<div class="canvas-container">
  <canvas 
    bind:this={canvasElement}
    width={boardWidth} 
    height={boardHeight} 
    class="game-board"
  ></canvas>
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }
  
  canvas {
    display: block;
    max-width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
</style>
