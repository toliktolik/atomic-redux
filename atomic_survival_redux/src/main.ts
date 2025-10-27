/**
 * Atomic Survival Redux - Main Entry Point
 * Direct boot into survival mode, no menus
 */

import { Game } from './core/Game';
import { AssetLoader } from './core/AssetLoader';
import { AudioManager } from './systems/AudioManager';

// Global game instance for debugging
declare global {
    interface Window {
        game: Game;
    }
}

/**
 * Main initialization - launches directly into gameplay
 */
async function start(): Promise<void> {
    const loadingDiv = document.getElementById('loading');

    try {
        // Update loading text
        if (loadingDiv) {
            loadingDiv.textContent = 'LOADING ASSETS...';
        }

        // Load all game assets (2-3 seconds max)
        await AssetLoader.initialize();
        await AssetLoader.loadAll();

        // Initialize audio system
        AudioManager.initialize();

        // Remove loading screen
        if (loadingDiv) {
            loadingDiv.style.opacity = '0';
            setTimeout(() => loadingDiv.remove(), 500);
        }

        // Create and start game immediately
        const game = new Game();
        window.game = game; // For debugging

        // Start with tank entry animation
        await game.start();

    } catch (error) {
        console.error('Failed to start game:', error);
        if (loadingDiv) {
            loadingDiv.textContent = 'FAILED TO LOAD - REFRESH TO RETRY';
            loadingDiv.style.color = '#ff0000';
        }
    }
}

// Start as soon as DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    // DOM already loaded
    start();
}

// Handle visibility change (pause when tab not visible)
document.addEventListener('visibilitychange', () => {
    if (window.game) {
        if (document.hidden) {
            window.game.pause();
        } else {
            window.game.resume();
        }
    }
});