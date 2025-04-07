<script lang="ts">
  import { TETROMINO_COLORS } from "../lib/tetrominos";
  import type { Tetromino } from '../lib/types';
  
  export let nextPiece: Tetromino | null;
  export let nextPieces: Tetromino[] = [];
  let cellSize = 8; // Smaller cell size for compact display

  import { onMount } from "svelte";

  // Canvas element reference
  let canvasElement: HTMLCanvasElement;

  // Draw the next pieces preview
  function drawNextPieces() {
    if (!canvasElement) return;

    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    // Set height to 60px to fully display tetrominos
    const canvasHeight = 60;
    // Adjust cell size to ensure tetrominos are properly sized and centered
    const minCellSize = 6; // Minimum cell size to ensure visibility

    // Adjust cell size based on container width
    const container = document.querySelector(".next-piece-display");
    if (container) {
      const containerWidth = container.clientWidth - 10; // Reduced padding
      cellSize = Math.max(Math.floor(containerWidth / 15), minCellSize); // Ensure minimum cell size
    }
    
    // Limit to exactly 3 tetrominos
    const piecesToDraw = [nextPiece, ...nextPieces.slice(0, 2)].filter(Boolean);
    while (piecesToDraw.length < 3 && piecesToDraw.length > 0) {
      // Add placeholder pieces if we have fewer than 3
      piecesToDraw.push(piecesToDraw[0]);
    }
    
    // Resize canvas for horizontal display of exactly 3 pieces
    const pieceWidth = cellSize * 4;
    canvasElement.width = pieceWidth * 3; // Always 3 pieces
    canvasElement.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw each piece horizontally
    piecesToDraw.forEach((piece, index) => {
      if (!piece) return;
      
      const { shape, type } = piece;
      const color = TETROMINO_COLORS[type];

      // Calculate dimensions for better centering
      const pieceWidth = shape[0].length * cellSize;
      const pieceHeight = shape.length * cellSize;
      
      // Calculate position for this piece
      const pieceX = index * (cellSize * 4);
      
      // Center the piece in its slot both horizontally and vertically
      const offsetX = pieceX + (pieceWidth * 4 / shape[0].length - pieceWidth) / 2;
      const offsetY = Math.max((canvasHeight - pieceHeight) / 2, 5); // Ensure minimum 5px from top

      // Draw the piece
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x] !== 0) {
            // Draw cell with explicit color value
            ctx.fillStyle = color; // Using the color from TETROMINO_COLORS
            ctx.fillRect(
              offsetX + x * cellSize,
              offsetY + y * cellSize,
              cellSize,
              cellSize
            );

            // Add highlight for 3D effect (simplified for small cells)
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fillRect(
              offsetX + x * cellSize,
              offsetY + y * cellSize,
              cellSize / 3,
              cellSize / 3
            );

            // No border
          }
        }
      }
    });
  }

  // Update the canvas when any piece changes
  $: {
    if (canvasElement && (nextPiece || nextPieces.length > 0)) {
      drawNextPieces();
    }
  }

  onMount(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => drawNextPieces());
    return () => {
      // Cleanup if needed
    };
  });
</script>

<div class="next-piece-container">
  <canvas
    bind:this={canvasElement}
    width={4 * cellSize * 3}
    height={60}
    class="next-piece"
  ></canvas>
</div>

<style>
  .next-piece-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    padding: 0;
    margin: 0;
  }
  
  canvas {
    display: block;
    image-rendering: pixelated;
    width: auto !important;
    height: auto !important;
    max-width: 100%;
    max-height: 100%;
    background-color: transparent;
  }
</style>
