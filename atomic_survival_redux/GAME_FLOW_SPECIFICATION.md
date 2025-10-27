# Game Flow Specification - Atomic Survival Redux

## Simplified Game Flow

This document outlines the streamlined game flow for the survival-only experience, removing all unnecessary complexity from the original.

## Launch Sequence

### Immediate Start (0-3 seconds)
```javascript
// index.html - Minimal HTML
<!DOCTYPE html>
<html>
<head>
    <title>Atomic Survival Redux</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #loading {
            color: white;
            font-family: monospace;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <div id="loading">LOADING...</div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

```typescript
// main.ts - Direct game initialization
import { Game } from './core/Game';
import { AssetLoader } from './core/AssetLoader';

async function start() {
    // Show loading text
    const loadingDiv = document.getElementById('loading');

    // Load all assets (2-3 seconds max)
    await AssetLoader.loadAll();

    // Remove loading text
    loadingDiv?.remove();

    // Start game immediately
    const game = new Game();
    game.start();
}

// No menu, no delay - straight to action
window.addEventListener('DOMContentLoaded', start);
```

## Game Start Flow

### Tank Entry Animation (3 seconds)
```typescript
class GameStartSequence {
    async execute(game: Game): Promise<void> {
        // 1. Create tank off-screen left
        game.tank = new Tank();
        game.tank.x = -100;
        game.tank.y = 600;

        // 2. Roll tank in from left (2 seconds)
        await this.animateTankEntry(game.tank);

        // 3. Brief "Get Ready" text (1 second)
        const readyText = this.createReadyText();
        await this.showReadyText(readyText);

        // 4. Enable controls and start waves
        game.inputEnabled = true;
        game.waveSystem.start();
    }

    private async animateTankEntry(tank: Tank): Promise<void> {
        return new Promise(resolve => {
            const targetX = 640; // Center of screen

            // Smooth easing animation
            gsap.to(tank, {
                x: targetX,
                duration: 2,
                ease: "power2.out",
                onComplete: resolve
            });

            // Engine sound effect
            AudioManager.play('tank_engine');
        });
    }

    private createReadyText(): PIXI.Text {
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 72,
            fill: ['#ffffff', '#ffff00'],
            stroke: '#000000',
            strokeThickness: 8,
            dropShadow: true,
            dropShadowDistance: 6
        });

        const text = new PIXI.Text('GET READY!', style);
        text.anchor.set(0.5);
        text.x = 640;
        text.y = 300;

        return text;
    }

    private async showReadyText(text: PIXI.Text): Promise<void> {
        return new Promise(resolve => {
            // Add to stage
            game.uiContainer.addChild(text);

            // Pulse animation
            gsap.to(text.scale, {
                x: 1.2,
                y: 1.2,
                duration: 0.5,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    // Fade out
                    gsap.to(text, {
                        alpha: 0,
                        duration: 0.5,
                        onComplete: () => {
                            text.destroy();
                            resolve();
                        }
                    });
                }
            });
        });
    }
}
```

## Core Gameplay Loop

### Main Game State
```typescript
class Game {
    private state: GameState = GameState.PLAYING;
    private isPaused: boolean = false;

    // No menu states, no save states - just these:
    enum GameState {
        STARTING,   // Tank entry animation
        PLAYING,    // Active gameplay
        GAME_OVER   // Death screen
    }

    update(delta: number): void {
        switch (this.state) {
            case GameState.STARTING:
                // Handled by GameStartSequence
                break;

            case GameState.PLAYING:
                this.updateGameplay(delta);
                break;

            case GameState.GAME_OVER:
                this.updateGameOver(delta);
                break;
        }
    }

    private updateGameplay(delta: number): void {
        // Core update loop (no pausing, no menus)
        this.waveSystem.update(delta);
        this.tank.update(delta);
        this.enemies.forEach(e => e.update(delta));
        this.projectiles.forEach(p => p.update(delta));
        this.powerUps.forEach(p => p.update(delta));
        this.collisionSystem.update();
        this.particleSystem.update(delta);
        this.updateHUD();
    }
}
```

## Wave Flow

### Continuous Wave Generation
```typescript
class WaveFlow {
    private waveGap: number = 2000; // 2 seconds between waves
    private waveGapTimer: number = 0;
    private isSpawning: boolean = false;

    update(delta: number): void {
        if (!this.isSpawning) {
            // Between waves - count down
            this.waveGapTimer -= delta;

            if (this.waveGapTimer <= 0) {
                this.startNextWave();
            }
        } else {
            // During wave - spawn enemies
            this.spawnEnemies(delta);

            if (this.allEnemiesSpawned()) {
                this.endWave();
            }
        }
    }

    private startNextWave(): void {
        this.waveNumber++;
        this.isSpawning = true;

        // Show wave number briefly
        this.showWaveNumber(this.waveNumber);

        // Generate wave parameters
        this.currentWave = this.generateWave(this.waveNumber);
    }

    private endWave(): void {
        this.isSpawning = false;
        this.waveGapTimer = this.waveGap;

        // Bonus for wave completion
        if (this.noPlayerDamage) {
            this.awardNoDamageBonus();
        }
    }

    private showWaveNumber(num: number): void {
        // Quick fade-in/out text
        const text = new PIXI.Text(`WAVE ${num}`, waveTextStyle);
        text.anchor.set(0.5);
        text.x = 640;
        text.y = 100;
        text.alpha = 0;

        game.uiContainer.addChild(text);

        // Fade in, hold, fade out
        gsap.timeline()
            .to(text, { alpha: 1, duration: 0.3 })
            .to(text, { alpha: 1, duration: 1 })  // Hold
            .to(text, { alpha: 0, duration: 0.3 })
            .call(() => text.destroy());
    }
}
```

## Power-Up Flow

### Helicopter Drop Sequence
```typescript
class HelicopterDropFlow {
    private dropInterval: number = 15000; // Every 15 seconds
    private dropTimer: number = 15000;

    update(delta: number): void {
        this.dropTimer -= delta;

        if (this.dropTimer <= 0) {
            this.checkAndSpawnDrop();
            this.dropTimer = this.dropInterval;
        }
    }

    private async checkAndSpawnDrop(): Promise<void> {
        // Calculate drop chance based on player state
        const chance = this.calculateDropChance();

        if (Math.random() < chance) {
            await this.spawnHelicopter();
        }
    }

    private async spawnHelicopter(): Promise<void> {
        // 1. Play helicopter sound (gets louder)
        const heliSound = AudioManager.play('helicopter_approach');

        // 2. Create helicopter off-screen
        const helicopter = new AllyHelicopter();
        helicopter.x = -100;
        helicopter.y = 200;

        // 3. Fly in
        await gsap.to(helicopter, {
            x: 300 + Math.random() * 680, // Random drop position
            duration: 2,
            ease: "none"
        });

        // 4. Drop power-up
        const powerUp = this.createRandomPowerUp();
        powerUp.x = helicopter.x;
        powerUp.y = helicopter.y;
        game.powerUps.push(powerUp);

        // 5. Fly away
        await gsap.to(helicopter, {
            x: 1380,
            duration: 2,
            ease: "none",
            onComplete: () => {
                helicopter.destroy();
                heliSound.fade(1, 0, 1000);
            }
        });
    }
}
```

## Death & Restart Flow

### Game Over Sequence
```typescript
class GameOverFlow {
    execute(finalScore: number, survivalTime: number): void {
        // 1. Freeze gameplay
        game.state = GameState.GAME_OVER;

        // 2. Tank destruction animation
        this.animateTankDestruction();

        // 3. Show game over screen (after 1 second)
        setTimeout(() => {
            this.showGameOverScreen(finalScore, survivalTime);
        }, 1000);
    }

    private animateTankDestruction(): void {
        // Big explosion
        ParticleSystem.createExplosion(
            game.tank.x,
            game.tank.y,
            'large'
        );

        // Screen shake
        gsap.to(game.gameContainer, {
            x: "+=20",
            y: "+=20",
            duration: 0.05,
            repeat: 10,
            yoyo: true,
            ease: "none"
        });

        // Hide tank
        game.tank.visible = false;

        // Explosion sound
        AudioManager.play('tank_destroyed');
    }

    private showGameOverScreen(score: number, time: number): void {
        // Semi-transparent overlay
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.7);
        overlay.drawRect(0, 0, 1280, 720);
        overlay.endFill();

        // Game Over text
        const gameOverText = new PIXI.Text('GAME OVER', {
            fontSize: 96,
            fill: 0xff0000,
            fontFamily: 'Arial Black'
        });
        gameOverText.anchor.set(0.5);
        gameOverText.x = 640;
        gameOverText.y = 200;

        // Score display
        const scoreText = new PIXI.Text(
            `SCORE: ${score.toLocaleString()}\n` +
            `TIME: ${this.formatTime(time)}\n` +
            `WAVES: ${game.waveSystem.waveNumber}`,
            {
                fontSize: 36,
                fill: 0xffffff,
                fontFamily: 'Arial',
                align: 'center'
            }
        );
        scoreText.anchor.set(0.5);
        scoreText.x = 640;
        scoreText.y = 360;

        // Restart button (simple text)
        const restartText = new PIXI.Text('PRESS SPACE TO RESTART', {
            fontSize: 32,
            fill: 0x00ff00,
            fontFamily: 'Arial'
        });
        restartText.anchor.set(0.5);
        restartText.x = 640;
        restartText.y = 500;

        // Flash restart text
        gsap.to(restartText, {
            alpha: 0.3,
            duration: 0.5,
            repeat: -1,
            yoyo: true
        });

        // Add all to container
        const gameOverContainer = new PIXI.Container();
        gameOverContainer.addChild(overlay);
        gameOverContainer.addChild(gameOverText);
        gameOverContainer.addChild(scoreText);
        gameOverContainer.addChild(restartText);

        game.uiContainer.addChild(gameOverContainer);

        // Listen for restart
        this.waitForRestart(gameOverContainer);
    }

    private waitForRestart(container: PIXI.Container): void {
        const handleRestart = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                // Clean up
                window.removeEventListener('keydown', handleRestart);
                container.destroy();

                // Restart game
                game.restart();
            }
        };

        window.addEventListener('keydown', handleRestart);
    }

    private formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}
```

## Instant Restart

### Quick Restart System
```typescript
class Game {
    restart(): void {
        // Reset everything in <1 second
        this.cleanup();
        this.initialize();

        // Skip intro - tank already on screen
        this.tank.x = 640;
        this.tank.y = 600;
        this.tank.health = 100;

        // Start immediately
        this.state = GameState.PLAYING;
        this.waveSystem.reset();
        this.waveSystem.start();
        this.inputEnabled = true;

        // Show "GO!" briefly
        const goText = new PIXI.Text('GO!', {
            fontSize: 72,
            fill: 0x00ff00,
            fontFamily: 'Arial Black'
        });
        goText.anchor.set(0.5);
        goText.x = 640;
        goText.y = 300;

        this.uiContainer.addChild(goText);

        gsap.to(goText, {
            alpha: 0,
            y: 250,
            duration: 1,
            onComplete: () => goText.destroy()
        });
    }

    private cleanup(): void {
        // Clear all game objects
        this.enemies.forEach(e => e.destroy());
        this.enemies = [];

        this.projectiles.forEach(p => p.destroy());
        this.projectiles = [];

        this.powerUps.forEach(p => p.destroy());
        this.powerUps = [];

        this.particleSystem.clear();

        // Reset scores
        this.score = 0;
        this.survivalTime = 0;
        this.combo = 0;
    }
}
```

## HUD Flow

### Minimal HUD Display
```typescript
class HUD {
    private scoreText: PIXI.Text;
    private healthBar: PIXI.Graphics;
    private ammoText: PIXI.Text;
    private waveText: PIXI.Text;
    private comboText: PIXI.Text;

    constructor() {
        // Top-left: Score
        this.scoreText = new PIXI.Text('SCORE: 0', hudStyle);
        this.scoreText.x = 20;
        this.scoreText.y = 20;

        // Top-right: Wave
        this.waveText = new PIXI.Text('WAVE: 1', hudStyle);
        this.waveText.anchor.set(1, 0);
        this.waveText.x = 1260;
        this.waveText.y = 20;

        // Bottom-left: Health bar
        this.createHealthBar();

        // Bottom-right: Ammo (only for special weapons)
        this.ammoText = new PIXI.Text('', hudStyle);
        this.ammoText.anchor.set(1, 1);
        this.ammoText.x = 1260;
        this.ammoText.y = 700;

        // Center: Combo (appears/disappears)
        this.comboText = new PIXI.Text('', comboStyle);
        this.comboText.anchor.set(0.5);
        this.comboText.x = 640;
        this.comboText.y = 150;
        this.comboText.visible = false;
    }

    update(gameData: GameData): void {
        // Update score with formatting
        this.scoreText.text = `SCORE: ${gameData.score.toLocaleString()}`;

        // Update wave
        this.waveText.text = `WAVE: ${gameData.waveNumber}`;

        // Update health bar
        this.updateHealthBar(gameData.tankHealth);

        // Update ammo (only show for special weapons)
        if (gameData.currentWeapon !== 'STANDARD_GUN') {
            this.ammoText.text = `AMMO: ${gameData.ammo}`;
            this.ammoText.visible = true;
        } else {
            this.ammoText.visible = false;
        }

        // Update combo
        if (gameData.combo > 1) {
            this.comboText.text = `${gameData.combo}x COMBO!`;
            this.comboText.visible = true;
            this.pulseCombo();
        } else {
            this.comboText.visible = false;
        }
    }

    private pulseCombo(): void {
        gsap.to(this.comboText.scale, {
            x: 1.2,
            y: 1.2,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        });
    }
}
```

## Flow Diagram

```
START
  ↓
Load Assets (2-3s)
  ↓
Tank Entry Animation (2s)
  ↓
"GET READY!" (1s)
  ↓
┌─────────────────┐
│  GAMEPLAY LOOP  │←─────┐
├─────────────────┤      │
│ • Spawn Waves   │      │
│ • Process Input │      │
│ • Update Enemies│      │
│ • Check Collision│     │
│ • Update Score  │      │
│ • Drop Power-ups│      │
└────────┬────────┘      │
         ↓               │
    Tank Destroyed       │
         ↓               │
   GAME OVER SCREEN      │
         ↓               │
   Press Space           │
         ↓               │
   Instant Restart───────┘
```

## Key Simplifications

### Removed Completely
- ❌ Main menu
- ❌ Pause menu
- ❌ Options screen
- ❌ Save/Load system
- ❌ Campaign selection
- ❌ Level progression
- ❌ Armory screen
- ❌ Credits
- ❌ Help screen
- ❌ High score entry

### Streamlined
- ✅ Direct game start
- ✅ Single game mode
- ✅ Instant restart
- ✅ Minimal HUD
- ✅ No interruptions
- ✅ Pure arcade action

This simplified flow creates a focused, addictive gameplay loop perfect for quick sessions and high replayability!