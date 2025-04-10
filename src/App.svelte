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

  // View and device state
  let currentView = $state("welcome"); // welcome, game, settings
  let isMobile = $state(window.innerWidth < 768); // Track device type for responsive layout

  // Setup device detection and responsive behavior
  function updateDeviceType() {
    isMobile = window.innerWidth < 768;
  }

  // Game timer
  let gameTime = $state(0); // Time in seconds
  let gameTimerInterval: number | null = null;

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

  // View navigation functions
  function startGame() {
    currentView = "game";
    newGame();
    startGameTimer();
  }

  function showSettings() {
    currentView = "settings";
  }

  function goToWelcome() {
    currentView = "welcome";
    stopGameLoop();
    stopGameTimer();
  }

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

  // Game timer functions
  function startGameTimer() {
    // Reset timer when starting a new game
    gameTime = 0;

    // Clear any existing timer
    stopGameTimer();

    // Start a new timer that increments every second
    gameTimerInterval = window.setInterval(() => {
      gameTime++;
    }, 1000);
  }

  function stopGameTimer() {
    if (gameTimerInterval) {
      window.clearInterval(gameTimerInterval);
      gameTimerInterval = null;
    }
  }

  // Format time as MM:SS
  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
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
    // Store previous game state to detect transitions
    const wasGameOver = gameState.gameOver;
    
    // Apply the action to update game state
    // Using object spread to ensure reactivity in Svelte 5
    gameState = { ...gameReducer(gameState, action) };

    // Check if game just ended (transition to game over)
    if (!wasGameOver && gameState.gameOver) {
      stopGameLoop();
      stopGameTimer();
      vibrate("heavy");
    }
    
    // Handle explicit game over action
    if (action.type === "GAME_OVER") {
      stopGameLoop();
      stopGameTimer();
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
      stopGameTimer();
      vibrate("light");
    } else if (action.type === "RESUME_GAME") {
      startGameLoop();
      startGameTimer();
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
    startGameTimer();
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
    stopGameTimer();
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
  class={isMobile ? "mobile-view" : "desktop-view"}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  ondblclick={handleDoubleTap}
>
  <div class="app-container">
    {#if currentView === "welcome"}
      <div class="welcome-view">
        <div class="tetris-logo">
          <div class="tetris-pieces">
            <div class="tetris-piece yellow"></div>
            <div class="tetris-piece yellow"></div>
            <div class="tetris-piece yellow"></div>
            <div class="tetris-piece red"></div>
            <div class="tetris-piece red"></div>
            <div class="tetris-piece red"></div>
            <div class="tetris-piece blue"></div>
            <div class="tetris-piece blue"></div>
            <div class="tetris-piece blue"></div>
          </div>
          <h1>TETRIS</h1>
        </div>
        <div class="welcome-buttons">
          <button class="welcome-button" onclick={startGame}>PLAY</button>
          <button class="welcome-button" onclick={showSettings}>SETTINGS</button
          >
        </div>
      </div>
    {:else if currentView === "settings"}
      <div class="settings-view">
        <div class="settings-header">
          <button class="back-button" onclick={goToWelcome}>←</button>
          <h2>Settings</h2>
        </div>
        <div class="settings-content">
          <!-- Settings options will go here -->
          <p>Settings coming soon...</p>
        </div>
      </div>
    {:else}
      <div class="status-bar">
        <div class="time" class:game-over={gameState.gameOver}>{formatTime(gameTime)}</div>
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

            <button
              class="pause-button"
              onclick={togglePause}
              style="padding-left: {gameState.isPaused ? '3px' : '0'}"
            >
              {gameState.isPaused ? "▶" : "⏸"}
            </button>
          </div>
        </div>

        <div class="hidden-controls" style="display: none;">
          <button class="control-button" onclick={handleLeftButton}>←</button>
          <button class="control-button" onclick={handleRotateButton}>↑</button>
          <button class="control-button" onclick={handleDownButton}>↓</button>
          <button class="control-button" onclick={handleRightButton}>→</button>
          <button class="control-button" onclick={handleDropButton}>DROP</button
          >
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #6b88c9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  :global(html) {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Welcome screen styles */
  .welcome-view {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-flow: wrap;
    align-items: center;
    height: 100%;
    background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
    padding: 20px;
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

  .app-container {
    display: flex;
    flex-direction: column;
    background-color: white;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Desktop styling */
  .desktop-view .app-container {
    max-width: 375px;
    height: 90vh;
    max-height: 812px;
    border-radius: 40px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  /* Mobile styling */
  .mobile-view .app-container {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
    box-shadow: none;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px 0;
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
    transition: color 0.3s ease;
  }
  
  .time.game-over {
    color: #ff0000;
    font-weight: bold;
  }

  .game-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 10px;
    gap: 10px;
    box-sizing: border-box;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
  }

  .mobile-view .game-container {
    padding: 5px;
    gap: 5px;
  }

  .desktop-view .game-container {
    padding: 10px;
  }

  .top-controls {
    display: flex;
    justify-content: center;
    margin-bottom: 5px;
    height: auto;
    flex-shrink: 0; /* Prevent top controls from shrinking */
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
    box-sizing: border-box;
    min-height: 0; /* Critical for flex container to allow shrinking */
  }

  /* Responsive game board */
  .desktop-view .game-board-wrapper {
    max-height: calc(
      100% - 140px
    ); /* Reserve space for top and bottom controls */
  }

  .mobile-view .game-board-wrapper {
    padding: 5px;
    border-radius: 10px;
  }

  .bottom-controls {
    display: flex;
    margin-top: 10px;
    flex-shrink: 0; /* Prevent bottom controls from shrinking */
  }

  .level-score {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #222;
    border-radius: 16px;
    padding: 10px 20px;
    width: 100%;
    height: 60px; /* Fixed height to prevent layout shifts */
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
    width: 35px;
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-size: 20px;
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

  /* Tetris logo and pieces */
  .tetris-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 60px;
  }

  .tetris-logo h1 {
    font-size: 42px;
    font-weight: bold;
    color: #222;
    margin-top: 30px;
    letter-spacing: 2px;
  }

  .tetris-pieces {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 2px;
    width: 120px;
    height: 120px;
  }

  .tetris-piece {
    width: 100%;
    height: 100%;
    border-radius: 2px;
  }

  .tetris-piece.yellow {
    background-color: #ffd700;
  }

  .tetris-piece.red {
    background-color: #ff4136;
  }

  .tetris-piece.blue {
    background-color: #0074d9;
  }

  /* Welcome buttons */
  .welcome-buttons {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 300px;
    gap: 20px;
  }

  .welcome-button {
    background-color: #222;
    color: white;
    border: none;
    border-radius: 16px;
    padding: 16px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
    transition: background-color 0.2s;
  }

  .welcome-button:hover {
    background-color: #444;
  }

  /* Settings view */
  .settings-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #f0f0f0;
  }

  .settings-header {
    display: flex;
    align-items: center;
    padding: 15px;
    background-color: #222;
    color: white;
  }

  .back-button {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    margin-right: 15px;
  }

  .settings-content {
    padding: 20px;
    flex: 1;
  }
</style>
