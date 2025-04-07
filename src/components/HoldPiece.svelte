<script lang="ts">
  import { TETROMINOS, TETROMINO_COLORS } from '../lib/tetrominos';
  import type { TetrominoType } from '../lib/types';
  import { onMount } from 'svelte';

  export let heldPiece: TetrominoType | null = null;
  
  let canvasElement: HTMLCanvasElement;
  let cellSize = 12; // Smaller default size for mobile layout

  // Draw the held piece preview
  function drawHeldPiece() {
    if (!canvasElement) return;

    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;
    
    // Clear canvas first, even if no held piece
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // If no held piece, just return after clearing
    if (!heldPiece) return;

    // Adjust cell size based on container width
    const container = document.querySelector(".hold-piece-container");
    if (container) {
      const containerWidth = container.clientWidth - 10; // Reduced padding
      cellSize = Math.floor(containerWidth / 6); // Smaller cell size
    }

    // Resize canvas based on cell size - consistent with canvas attributes
    canvasElement.width = cellSize * 4;
    canvasElement.height = cellSize * 4;

    // Get the shape for the held piece
    if (!TETROMINOS[heldPiece]) {
      console.error('Invalid held piece type:', heldPiece);
      return;
    }
    
    const shape = TETROMINOS[heldPiece];
    const color = TETROMINO_COLORS[heldPiece];
    
    // Log to help debugging
    console.log('Drawing held piece:', heldPiece, shape);

    // Center the piece in the preview
    const offsetX = (4 - shape[0].length) / 2;
    const offsetY = (4 - shape.length) / 2;

    // Draw the piece
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const previewX = Math.floor(offsetX + x);
          const previewY = Math.floor(offsetY + y);

          // Draw cell with explicit color value
          ctx.fillStyle = color; // Using the color from TETROMINO_COLORS
          ctx.fillRect(
            previewX * cellSize,
            previewY * cellSize,
            cellSize,
            cellSize
          );

          // Add highlight for 3D effect
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
          ctx.fillRect(
            previewX * cellSize,
            previewY * cellSize,
            cellSize / 3,
            cellSize / 3
          );

          // Draw border
          ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
          ctx.lineWidth = 1;
          ctx.strokeRect(
            previewX * cellSize,
            previewY * cellSize,
            cellSize,
            cellSize
          );

          // Add highlight for 3D effect
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.fillRect(
            previewX * cellSize + 1,
            previewY * cellSize + 1,
            cellSize / 4,
            cellSize / 4
          );
        }
      }
    }
  }

  // Update when heldPiece changes (even if null)
  $: {
    console.log('heldPiece changed:', heldPiece);
    if (canvasElement) {
      // Use RAF to ensure DOM is ready
      requestAnimationFrame(() => drawHeldPiece());
    }
  }

  // Also watch for canvasElement changes
  $: if (canvasElement) {
    console.log('Canvas element ready');
    requestAnimationFrame(() => drawHeldPiece());
  }

  onMount(() => {
    // Initial render
    setTimeout(() => drawHeldPiece(), 0);
    return () => {
      // Cleanup if needed
    };
  });
</script>

<div class="hold-piece-container">
  <canvas
    bind:this={canvasElement}
    width={4 * cellSize}
    height={4 * cellSize}
    class="hold-piece"
  ></canvas>
</div>

<style>
  .hold-piece-container {
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
