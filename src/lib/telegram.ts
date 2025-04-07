import WebApp from '@twa-dev/sdk';
import type { LeaderboardEntry } from './types';

// Get user data from Telegram WebApp
export function getUserData() {
  try {
    // Check if we have user data from Telegram
    if (WebApp.initDataUnsafe && WebApp.initDataUnsafe.user) {
      const { id, first_name, last_name, username } = WebApp.initDataUnsafe.user;
      return {
        userId: id.toString(),
        firstName: first_name,
        lastName: last_name || '',
        username: username || first_name,
        fullName: last_name ? `${first_name} ${last_name}` : first_name
      };
    }
    
    // Return placeholder data for testing when not in Telegram
    return {
      userId: 'test_user',
      firstName: 'Test',
      lastName: 'User',
      username: 'test_user',
      fullName: 'Test User'
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Mock leaderboard data for development
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { userId: '1', username: 'tetris_master', score: 12500, level: 10, lines: 95, timestamp: Date.now() },
  { userId: '2', username: 'block_stacker', score: 9800, level: 8, lines: 78, timestamp: Date.now() },
  { userId: '3', username: 'line_clearer', score: 7200, level: 6, lines: 60, timestamp: Date.now() },
  { userId: '4', username: 'arcade_pro', score: 5500, level: 5, lines: 45, timestamp: Date.now() },
  { userId: '5', username: 'game_expert', score: 3200, level: 3, lines: 30, timestamp: Date.now() },
];

// In a real app, this would be a server API call
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In a real app, this would fetch from a backend
  return MOCK_LEADERBOARD;
}

// Submit score to leaderboard
export async function submitScore(entry: LeaderboardEntry): Promise<boolean> {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In a real app, this would send to a backend
    console.log('Score submitted:', entry);
    
    // Show a native Telegram popup
    WebApp.showPopup({
      title: 'Score Submitted!',
      message: `Your score of ${entry.score} has been submitted to the leaderboard!`,
      buttons: [
        {
          type: 'ok',
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error('Error submitting score:', error);
    return false;
  }
}

// Show TON token prize information
export function showPrizeInfo() {
  try {
    // Only use showPopup if supported in this version (6.1+)
    if (WebApp.isVersionAtLeast('6.1')) {
      WebApp.showPopup({
        title: 'TON Token Prizes',
        message: 'Top 50 players on the leaderboard will receive TON token prizes at the end of each month! Keep playing to improve your rank.',
        buttons: [
          {
            type: 'ok',
          }
        ]
      });
    } else {
      // Fallback for older versions
      alert('Top 50 players on the leaderboard will receive TON token prizes at the end of each month! Keep playing to improve your rank.');
    }
  } catch (error) {
    // Fallback if showPopup fails
    console.log('showPopup not supported in this version');
    alert('Top 50 players on the leaderboard will receive TON token prizes at the end of each month!');
  }
}

// Show haptic feedback
export function vibrate(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') {
  try {
    // Only use HapticFeedback if supported in this version (6.1+)
    if (WebApp.isVersionAtLeast('6.1') && WebApp.HapticFeedback) {
      WebApp.HapticFeedback.impactOccurred(style);
    }
  } catch (error) {
    // Silently fail if haptic feedback is not supported
    console.log('HapticFeedback not supported in this version');
  }
}
