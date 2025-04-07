<script lang="ts">
  import WebApp from "@twa-dev/sdk";
  import { onDestroy, onMount } from "svelte";
  import GameBoard from "./components/GameBoard.svelte";
  import NextPiece from "./components/NextPiece.svelte";
  import { gameReducer, getDropSpeed, initGameState } from "./lib/game";
  import {
    getUserData,
    showPrizeInfo,
    submitScore,
    vibrate,
  } from "./lib/telegram";
  import type { GameAction, LeaderboardEntry } from "./lib/types";

  // Initialize game state with proper Svelte 5 runes
  let gameState = $state(initGameState());

  // Get user data from Telegram
  const userData = getUserData();

  // Game loop variables
  let gameLoopInterval: number | null = null;
  let lastDropTime = Date.now();

  // Touch controls variables
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouching = false;

  // Start the game loop
  function startGameLoop() {
    if (gameLoopInterval) return;

    gameLoopInterval = window.setInterval(() => {
      const now = Date.now();
      const dropSpeed = getDropSpeed(gameState.level);

      if (now - lastDropTime > dropSpeed) {
        dispatch({ type: "TICK" });
        lastDropTime = now;
      }
    }, 16); // ~60fps
  }

  // Stop the game loop
  function stopGameLoop() {
    if (gameLoopInterval) {
      window.clearInterval(gameLoopInterval);
      gameLoopInterval = null;
    }
  }

  // Dispatch game actions
  function dispatch(action: GameAction) {
    // Apply the action to update game state
    // Using object spread to ensure reactivity in Svelte 5
    gameState = { ...gameReducer(gameState, action) };

    // Handle game over
    if (action.type === "GAME_OVER") {
      stopGameLoop();
      vibrate("heavy");

      // Submit score to leaderboard
      if (userData) {
        const entry: LeaderboardEntry = {
          userId: userData.userId,
          username: userData.username,
          score: gameState.score,
          level: gameState.level,
          lines: gameState.lines,
          timestamp: Date.now(),
        };

        submitScore(entry);
      }
    }

    // Handle pause/resume
    if (action.type === "PAUSE_GAME") {
      stopGameLoop();
      vibrate("light");
    } else if (action.type === "RESUME_GAME") {
      startGameLoop();
      vibrate("light");
    }

    // Provide haptic feedback for moves
    if (["MOVE_LEFT", "MOVE_RIGHT", "ROTATE"].includes(action.type)) {
      vibrate("light");
    } else if (action.type === "HARD_DROP") {
      vibrate("medium");
    }
  }

  // Keyboard controls
  function handleKeydown(event: KeyboardEvent) {
    if (gameState.gameOver) return;

    switch (event.key) {
      case "ArrowLeft":
        dispatch({ type: "MOVE_LEFT" });
        break;
      case "ArrowRight":
        dispatch({ type: "MOVE_RIGHT" });
        break;
      case "ArrowDown":
        dispatch({ type: "MOVE_DOWN" });
        break;
      case "ArrowUp":
        dispatch({ type: "ROTATE" });
        break;
      case " ":
        dispatch({ type: "HARD_DROP" });
        break;
      case "c":
      case "C":
        holdPiece();
        break;
      case "p":
        if (gameState.isPaused) {
          dispatch({ type: "RESUME_GAME" });
        } else {
          dispatch({ type: "PAUSE_GAME" });
        }
        break;
      case "r":
        dispatch({ type: "NEW_GAME" });
        startGameLoop();
        break;
    }
  }

  // Touch controls
  function handleTouchStart(event: TouchEvent) {
    if (gameState.gameOver) return;

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isTouching || gameState.gameOver) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Require minimum movement to trigger action
    const threshold = 30;

    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      // Determine direction of swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          dispatch({ type: "MOVE_RIGHT" });
        } else {
          dispatch({ type: "MOVE_LEFT" });
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          dispatch({ type: "MOVE_DOWN" });
        } else {
          dispatch({ type: "ROTATE" });
        }
      }

      // Reset touch position after action
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }
  }

  function handleTouchEnd() {
    isTouching = false;
  }

  function handleDoubleTap() {
    if (gameState.gameOver) {
      dispatch({ type: "NEW_GAME" });
      startGameLoop();
    } else {
      dispatch({ type: "HARD_DROP" });
    }
  }

  // Button controls
  function handleLeftButton() {
    dispatch({ type: "MOVE_LEFT" });
  }

  function handleRightButton() {
    dispatch({ type: "MOVE_RIGHT" });
  }

  function handleDownButton() {
    dispatch({ type: "MOVE_DOWN" });
  }

  function handleRotateButton() {
    dispatch({ type: "ROTATE" });
  }

  function handleDropButton() {
    dispatch({ type: "HARD_DROP" });
  }

  function holdPiece() {
    if (gameState.currentPiece && !gameState.gameOver) {
      dispatch({ type: "HOLD" });
      vibrate("medium"); // Add haptic feedback for hold action
    }
  }

  function togglePause() {
    if (gameState.isPaused) {
      dispatch({ type: "RESUME_GAME" });
    } else {
      dispatch({ type: "PAUSE_GAME" });
    }
  }

  function newGame() {
    dispatch({ type: "NEW_GAME" });
    startGameLoop();
  }

  function showPrizes() {
    showPrizeInfo();
  }

  // Setup and cleanup
  onMount(() => {
    // Start game when component mounts
    startGameLoop();

    // Add event listeners
    window.addEventListener("keydown", handleKeydown);

    // Set back button handler for Telegram
    WebApp.onEvent("backButtonClicked", () => {
      if (gameState.isPaused) {
        dispatch({ type: "RESUME_GAME" });
      } else {
        dispatch({ type: "PAUSE_GAME" });
      }
    });

    // Show back button only if supported in this version
    try {
      if (WebApp.isVersionAtLeast("6.1")) {
        WebApp.BackButton.show();
      }
    } catch (error) {
      console.log("BackButton not supported in this version");
    }
  });

  onDestroy(() => {
    // Clean up when component is destroyed
    stopGameLoop();
    window.removeEventListener("keydown", handleKeydown);

    // Hide back button only if supported
    try {
      if (WebApp.isVersionAtLeast("6.1")) {
        WebApp.BackButton.hide();
      }
    } catch (error) {
      console.log("BackButton not supported in this version");
    }
  });
</script>

<main
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  ondblclick={handleDoubleTap}
>
  <div class="phone-container">
    <div class="status-bar">
      <div class="time">02:12</div>
      <div class="status-buttons">
        <button class="status-button" onclick={newGame}>NEW GAME</button>
        <button class="status-button" onclick={showPrizes}>PRIZES</button>
      </div>
    </div>

    <div class="game-container">
      <div class="top-controls">
        <div class="next-piece-display">
          <div class="control-label">Next</div>
          <NextPiece
            nextPiece={gameState.nextPiece}
            nextPieces={gameState.nextPieces}
          />
        </div>
      </div>

      <div class="game-board-wrapper">
        <GameBoard {gameState} />
      </div>

      <div class="bottom-controls">
        <div class="level-score">
          <div class="level-display">
            <div class="control-label">Level</div>
            <div class="value">{gameState.level}</div>
          </div>

          <div class="score-display">
            <div class="control-label">Score</div>
            <div class="value">{gameState.score}</div>
          </div>

          <button class="pause-button" onclick={togglePause}>
            {gameState.isPaused ? "▶" : "⏸"}
          </button>
        </div>
      </div>

      <div class="hidden-controls" style="display: none;">
        <button class="control-button" onclick={handleLeftButton}>←</button>
        <button class="control-button" onclick={handleRotateButton}>↑</button>
        <button class="control-button" onclick={handleDownButton}>↓</button>
        <button class="control-button" onclick={handleRightButton}>→</button>
        <button class="control-button" onclick={handleDropButton}>DROP</button>
      </div>
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: "Press Start 2P", monospace, sans-serif;
    background-color: #121212;
    color: #fff;
  }

  :global(body) {
    background-color: #6b88c9;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  }

  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 0;
    width: 100%;
    box-sizing: border-box;
  }

  @media (max-width: 430px) {
    main {
      padding: 0;
      height: 100vh;
    }
  }

  .phone-container {
    display: flex;
    flex-direction: column;
    background-color: white;
    border-radius: 40px;
    width: 100%;
    max-width: 375px;
    height: 90vh;
    max-height: 812px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 430px) {
    .phone-container {
      width: 100%;
      height: 100%;
      max-height: none;
      border-radius: 0;
      box-shadow: none;
    }
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background-color: #f8f8f8;
  }

  .status-buttons {
    display: flex;
    gap: 10px;
  }

  .status-button {
    background-color: #222;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 7px 8px;
    font-size: 10px;
    cursor: pointer;
    text-transform: uppercase;
  }

  .status-button:hover {
    background-color: #444;
  }

  .time {
    font-weight: bold;
    font-size: 14px;
    color: #222;
    background-color: #e0e0e0;
    padding: 4px 8px;
    border-radius: 5px;
  }

  .game-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 10px;
    gap: 10px;
  }

  .top-controls {
    display: flex;
    justify-content: center;
    margin-bottom: 5px;
    height: auto;
  }

  .next-piece-display {
    position: relative;
    display: flex;
    flex-direction: column;
    background-color: #222;
    border-radius: 10px;
    padding: 3px;
    width: 100%;
    height: auto;

    .control-label {
      position: absolute;
      top: 0;
      left: 0;
      text-align: left;
      margin: 0.25rem 0.5rem 0;
    }
  }

  .control-label {
    color: white;
    font-size: 12px;
    margin-bottom: 2px;
    text-align: center;
  }

  .game-board-wrapper {
    flex: 1;
    background-color: #222;
    border-radius: 16px;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .bottom-controls {
    display: flex;
    margin-top: 10px;
  }

  .level-score {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #222;
    border-radius: 16px;
    padding: 10px 20px;
    width: 100%;
  }

  .level-display,
  .score-display {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .value {
    color: white;
    font-size: 24px;
    font-weight: bold;
  }

  .pause-button {
    background-color: transparent;
    border: 2px solid white;
    color: white;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 14px;
  }

  .hidden-controls {
    position: absolute;
    visibility: hidden;
    height: 0;
    width: 0;
    overflow: hidden;
  }

  .control-button {
    padding: 0.75rem 1rem;
    background-color: #333;
    color: #fff;
    border: 2px solid #555;
    font-family: inherit;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .control-button:hover {
    background-color: #444;
  }

  .control-button:active {
    background-color: #555;
  }
</style>
