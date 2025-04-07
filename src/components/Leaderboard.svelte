<script lang="ts">
  import { onMount } from 'svelte';
  import { getLeaderboard } from '../lib/telegram';
  import type { LeaderboardEntry } from '../lib/types';
  
  let leaderboardData: LeaderboardEntry[] = [];
  let isLoading = true;
  
  onMount(async () => {
    try {
      leaderboardData = await getLeaderboard();
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      isLoading = false;
    }
  });
  
  // Format score with commas
  function formatScore(score: number): string {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
</script>

<div class="leaderboard">
  <div class="leaderboard-title">TOP SCORES</div>
  
  {#if isLoading}
    <div class="loading">Loading...</div>
  {:else if leaderboardData.length === 0}
    <div class="empty">No scores yet</div>
  {:else}
    {#each leaderboardData.slice(0, 5) as entry, index}
      <div class="leaderboard-item">
        <span class="rank">{index + 1}. {entry.username}</span>
        <span class="score">{formatScore(entry.score)}</span>
      </div>
    {/each}
  {/if}
</div>

<style>
  .loading, .empty {
    text-align: center;
    padding: 10px 0;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .leaderboard-item {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    font-size: 0.6rem;
  }
  
  .rank {
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70%;
  }
  
  .score {
    text-align: right;
    color: var(--accent-color);
  }
</style>
