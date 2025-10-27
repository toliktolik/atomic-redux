/**
 * Core Game Class - Main game loop and state management
 */

import * as PIXI from 'pixi.js';
import { Tank } from '../entities/Tank';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { PowerUp } from '../entities/PowerUp';
import { WaveSystem } from '../systems/WaveSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { ScoreManager } from '../systems/ScoreManager';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { BackgroundLayerSystem } from '../systems/BackgroundLayerSystem';
import { PropagandaPoster } from '../entities/PropagandaPoster';
import { ControlTower } from '../entities/ControlTower';
import { HUD } from '../ui/HUD';
import { LayerManager } from './LayerManager';
import { InputHandler } from '../input/InputHandler';
import { GameConstants } from '../config/GameConstants';
import { AudioManager } from '../systems/AudioManager';
import { DebugCheats } from '../systems/DebugCheats';
import { WeaponUpgradeSystem } from '../systems/WeaponUpgradeSystem';

export enum GameState {
    STARTING,   // Tank entry animation
    PLAYING,    // Active gameplay
    GAME_OVER,  // Death screen
    PAUSED      // Tab not visible
}

export class Game {
    // PIXI Application
    private app: PIXI.Application;
    public stage: PIXI.Container;

    // Containers
    private gameContainer: PIXI.Container;
    private uiContainer: PIXI.Container;

    // Layer management
    public layers: LayerManager;

    // Game state
    private state: GameState = GameState.STARTING;
    private isPaused: boolean = false;

    // Core entities
    public tank!: Tank;
    public enemies: Enemy[] = [];
    public projectiles: Projectile[] = [];
    public powerUps: PowerUp[] = [];

    // Systems
    private waveSystem: WaveSystem;
    private collisionSystem: CollisionSystem;
    private particleSystem: ParticleSystem;
    private scoreManager: ScoreManager;
    private powerUpSystem: PowerUpSystem;
    private weaponUpgradeSystem: WeaponUpgradeSystem; // Permanent weapon upgrades
    private backgroundSystem: BackgroundLayerSystem;
    private inputHandler: InputHandler;
    private hud: HUD;
    private debugCheats?: DebugCheats;

    // Timing
    private survivalTime: number = 0;
    private lastFrameTime: number = 0;
    private elapsedTime: number = 0;
    private lastLogTime: number = 0; // For 10-second interval logging

    // UI state
    private gameOverScreenShown: boolean = false;
    private tankDeathSequenceStarted: boolean = false;

    constructor() {
        // Create PIXI application
        this.app = new PIXI.Application({
            width: GameConstants.SCREEN_WIDTH,
            height: GameConstants.SCREEN_HEIGHT,
            backgroundAlpha: 0, // Make background transparent so background layers can show
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });

        // Add canvas to DOM
        document.body.appendChild(this.app.view as HTMLCanvasElement);

        // Make canvas focused for keyboard input
        (this.app.view as HTMLCanvasElement).tabIndex = 1;
        (this.app.view as HTMLCanvasElement).focus();

        // Setup containers
        this.stage = this.app.stage;
        this.gameContainer = new PIXI.Container();
        this.uiContainer = new PIXI.Container();

        this.stage.addChild(this.gameContainer);
        this.stage.addChild(this.uiContainer);

        // Initialize layer manager
        this.layers = new LayerManager(this.gameContainer);

        // Initialize systems
        this.inputHandler = new InputHandler(this.app.view as HTMLCanvasElement);
        this.waveSystem = new WaveSystem(this);
        this.collisionSystem = new CollisionSystem(this);
        this.particleSystem = new ParticleSystem(this);
        this.scoreManager = new ScoreManager();
        this.powerUpSystem = new PowerUpSystem(this);
        this.weaponUpgradeSystem = new WeaponUpgradeSystem(this); // Permanent weapon upgrades

        console.log('DEBUG: About to create BackgroundLayerSystem');
        this.backgroundSystem = new BackgroundLayerSystem(this);
        console.log('DEBUG: BackgroundLayerSystem created successfully');

        this.hud = new HUD(this);

        // Add particle system container to the particles layer
        this.layers.getLayer('particles').addChild(this.particleSystem.getContainer());

        // Background layers now use the working 'ground' layer container

        // Initialize interactive background elements
        this.initializeBackgroundElements();

        // Add HUD container to UI container
        this.uiContainer.addChild(this.hud.getContainer());

        // Initialize debug cheats (only in development)
        this.debugCheats = new DebugCheats(this);

        // Setup game loop
        this.app.ticker.add(this.gameLoop.bind(this));
    }

    /**
     * Start the game with tank entry animation
     */
    public async start(): Promise<void> {
        // Create tank off-screen
        this.tank = new Tank(this);
        this.tank.x = -100;
        this.tank.y = GameConstants.TANK_Y_POSITION;

        // Tank renders at original sprite size - no scaling needed

        this.layers.getLayer('tank').addChild(this.tank);

        // Apply any persistent weapon upgrades to new tank
        this.weaponUpgradeSystem.applyUpgradesToTank(this.tank);

        // Play "PREPARE FOR COMBAT!" voice announcement (original Heavy Weapon style)
        AudioManager.play('v_prepare');

        // Tank ready for gameplay

        // Animate tank entry
        await this.animateTankEntry();

        // Show "GET READY!" text with voice announcement
        AudioManager.play('v_getready');
        await this.showGetReady();

        // Start gameplay
        this.state = GameState.PLAYING;
        this.waveSystem.start();
        this.powerUpSystem.start();

        // Enable input
        this.inputHandler.enabled = true;
    }

    /**
     * Main game loop
     */
    private gameLoop(delta: number): void {
        // Calculate delta time in seconds
        const deltaTime = delta / 60; // PIXI ticker is 60fps based

        switch (this.state) {
            case GameState.STARTING:
                // Handled by start() method
                break;

            case GameState.PLAYING:
                if (!this.isPaused) {
                    this.updateGameplay(deltaTime);
                }
                break;

            case GameState.GAME_OVER:
                // Game over screen handles its own updates
                break;

            case GameState.PAUSED:
                // Do nothing
                break;
        }
    }

    /**
     * Update all game systems
     */
    private updateGameplay(deltaTime: number): void {
        // Update survival time
        this.survivalTime += deltaTime * 1000; // Convert to ms
        this.elapsedTime += deltaTime * 1000;

        // Log game state every 10 seconds
        if (this.elapsedTime - this.lastLogTime >= 10000) {
            const minutes = Math.floor(this.elapsedTime / 60000);
            const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
            const currentWave = this.waveSystem.getCurrentWave();
            const enemyCount = this.enemies.length;
            const tankHealth = this.tank ? Math.ceil(this.tank.health) : 0;
            const score = this.scoreManager.getScore();

            console.log(`⏱️ ${minutes}:${seconds.toString().padStart(2, '0')} | Wave ${currentWave} | Enemies: ${enemyCount} | Health: ${tankHealth}/100 | Score: ${score.toLocaleString()}`);
            this.lastLogTime = this.elapsedTime;
        }

        // Update systems in order
        this.backgroundSystem.update(deltaTime);
        this.waveSystem.update(deltaTime);
        this.powerUpSystem.update(deltaTime);

        // Update tank (but not during death sequence)
        if (this.tank && !this.tank.isDestroyed && !this.tankDeathSequenceStarted) {
            this.tank.update(deltaTime);
        }

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Comprehensive null/destroyed check
            if (!enemy || enemy.isDestroyed || !enemy.position) {
                this.enemies.splice(i, 1);
                continue;
            }

            try {
                enemy.update(deltaTime, this.tank);

                // Check if enemy is still valid after update
                if (!enemy || enemy.isDestroyed || !enemy.position) {
                    this.enemies.splice(i, 1);
                    continue;
                }

                // Clean up evacuating enemies that have flown off-screen
                const isEvacuating = (enemy as any).isEvacuating;
                if (isEvacuating && enemy.position &&
                   (enemy.position.x < -100 || enemy.position.x > GameConstants.SCREEN_WIDTH + 100 ||
                    enemy.position.y < -100 || enemy.position.y > GameConstants.SCREEN_HEIGHT + 100)) {
                    console.log('Evacuated enemy flew off-screen and was cleaned up');
                    enemy.destroy();
                    this.enemies.splice(i, 1);
                }
            } catch (error) {
                console.warn('Enemy update failed, removing enemy:', error);
                // Safely destroy the enemy if it exists
                if (enemy && typeof enemy.destroy === 'function') {
                    try {
                        enemy.destroy();
                    } catch (destroyError) {
                        console.warn('Failed to destroy enemy:', destroyError);
                    }
                }
                this.enemies.splice(i, 1);
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            if (projectile.isDestroyed) {
                this.projectiles.splice(i, 1);
            } else {
                projectile.update(deltaTime, this.enemies);
            }
        }

        // Update power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];

            if (powerUp.isDestroyed) {
                this.powerUps.splice(i, 1);
            } else {
                powerUp.update(deltaTime);
            }
        }

        // Check collisions (only if tank exists and is not destroyed and not in death sequence)
        if (this.tank && !this.tank.isDestroyed && !this.tankDeathSequenceStarted) {
            this.collisionSystem.update(
                this.tank,
                this.enemies,
                this.projectiles,
                this.powerUps
            );
        }

        // Update particle effects
        this.particleSystem.update(deltaTime);

        // Update HUD (always update when tank exists to show final health state)
        if (this.tank && !this.tank.isDestroyed) {
            this.hud.update(deltaTime, this.tank);
        }

        // Check game over
        if (this.tank && this.tank.health <= 0 && !this.tankDeathSequenceStarted) {
            console.log('=== TANK DEATH DETECTED ===');
            console.log('Tank health:', this.tank.health);

            // Force final HUD update to show 0 health before death sequence starts
            this.hud.update(deltaTime, this.tank);

            console.log('Entity counts before game over:');
            console.log('- Enemies:', this.enemies.length);
            console.log('- Projectiles:', this.projectiles.length);
            console.log('- PowerUps:', this.powerUps.length);
            console.log('- Particle effects:', this.particleSystem ? 'exists' : 'null');
            console.log('WebGL context state:', this.app.renderer.gl.getParameter(this.app.renderer.gl.MAX_TEXTURE_IMAGE_UNITS));
            this.tankDeathSequenceStarted = true;
            this.gameOver();
        }
    }

    /**
     * Tank entry animation
     */
    private async animateTankEntry(): Promise<void> {
        return new Promise(resolve => {
            const targetX = GameConstants.SCREEN_WIDTH / 2;
            const duration = 120; // frames (2 seconds at 60fps)
            let frame = 0;

            const animate = () => {
                frame++;
                const progress = frame / duration;

                // Easing function (ease-out)
                const eased = 1 - Math.pow(1 - progress, 3);

                this.tank.x = -100 + (targetX + 100) * eased;

                if (frame >= duration) {
                    this.app.ticker.remove(animate);
                    resolve();
                }
            };

            this.app.ticker.add(animate);
        });
    }

    /**
     * Show "GET READY!" text
     */
    private async showGetReady(): Promise<void> {
        return new Promise(resolve => {
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
            text.x = GameConstants.SCREEN_WIDTH / 2;
            text.y = GameConstants.SCREEN_HEIGHT / 2 - 100;

            this.uiContainer.addChild(text);

            // Pulse and fade animation
            let frame = 0;
            const animate = () => {
                frame++;

                if (frame < 30) {
                    // Pulse in
                    const scale = 1 + Math.sin(frame * 0.2) * 0.2;
                    text.scale.set(scale);
                } else if (frame > 60) {
                    // Fade out
                    text.alpha = Math.max(0, 1 - (frame - 60) / 30);
                }

                if (frame >= 90) {
                    this.app.ticker.remove(animate);
                    text.destroy();
                    resolve();
                }
            };

            this.app.ticker.add(animate);
        });
    }

    /**
     * Handle game over
     */
    private gameOver(): void {
        console.log('=== GAME OVER METHOD CALLED ===');

        console.log('Tank destroyed - starting evacuation sequence');
        // Don't change state yet - let enemies evacuate first

        // Tank destruction effect (only if tank exists and not destroyed)
        if (this.tank && !this.tank.isDestroyed) {
            let explosionX = GameConstants.SCREEN_WIDTH / 2;
            let explosionY = GameConstants.TANK_Y_POSITION;

            try {
                // Try to get tank position
                explosionX = this.tank.x || explosionX;
                explosionY = this.tank.y || explosionY;
            } catch (e) {
                // Use defaults if position is inaccessible
                console.warn('Tank position inaccessible in gameOver');
            }

            console.log('Creating large explosion at:', explosionX, explosionY);
            console.log('Particle system state before explosion:', this.particleSystem);
            this.particleSystem.createExplosion(explosionX, explosionY, 'large');
            console.log('Large explosion created');

            try {
                // Hide tank
                this.tank.visible = false;
            } catch (e) {
                // Tank may be already destroyed
                console.warn('Could not hide tank in gameOver');
            }
        } else {
            // Create explosion at default position if tank is destroyed
            this.particleSystem.createExplosion(
                GameConstants.SCREEN_WIDTH / 2,
                GameConstants.TANK_Y_POSITION,
                'large'
            );
        }

        // Play destruction sound
        AudioManager.play('tank_destroyed');

        // Play "GAME OVER!" voice announcement (original Heavy Weapon style)
        AudioManager.play('v_gameover');

        // Screen shake
        this.screenShake();

        // Authentic Heavy Weapon: evacuate all enemies off screen
        this.evacuateAllEnemies();

        // Change game state after evacuation completes
        console.log('Setting timeout for game state change and screen');
        setTimeout(() => {
            console.log('Evacuation complete - setting GAME_OVER state');
            this.state = GameState.GAME_OVER;
            this.showGameOverScreen();
        }, 2500); // Delay allows enemy evacuation
    }

    /**
     * Screen shake effect
     */
    private screenShake(): void {
        const intensity = 20;
        const duration = 30; // frames
        let frame = 0;

        const shake = () => {
            frame++;

            if (frame < duration) {
                const decay = 1 - (frame / duration);
                this.gameContainer.x = (Math.random() - 0.5) * intensity * decay;
                this.gameContainer.y = (Math.random() - 0.5) * intensity * decay;
            } else {
                this.gameContainer.x = 0;
                this.gameContainer.y = 0;
                this.app.ticker.remove(shake);
            }
        };

        this.app.ticker.add(shake);
    }

    /**
     * Evacuate all enemies off screen (authentic Heavy Weapon behavior)
     * Based on Ghidra analysis: enemies should flee when player is destroyed
     */
    private evacuateAllEnemies(): void {
        console.log('=== ENEMY EVACUATION STARTED ===');
        console.log(`Evacuating ${this.enemies.length} enemies`);

        this.enemies.forEach((enemy, index) => {
            // Determine evacuation direction based on enemy position
            const evacuationSpeedMultiplier = 3.0; // Make them fly away quickly

            // Determine which edge is closest for evacuation
            const leftDistance = enemy.x;
            const rightDistance = GameConstants.SCREEN_WIDTH - enemy.x;
            const evacuateLeft = leftDistance < rightDistance;

            // Set high-speed evacuation velocity
            if (evacuateLeft) {
                enemy.velocityX = -200 * evacuationSpeedMultiplier; // Fast leftward evacuation
            } else {
                enemy.velocityX = 200 * evacuationSpeedMultiplier;  // Fast rightward evacuation
            }

            // Slight upward angle for more dramatic effect
            enemy.velocityY = -50 - (Math.random() * 50);

            // Mark enemy as evacuating (prevent normal AI behavior)
            (enemy as any).isEvacuating = true;

            console.log(`Enemy ${index}: ${evacuateLeft ? 'LEFT' : 'RIGHT'} evacuation, vel=(${enemy.velocityX}, ${enemy.velocityY})`);
        });

        // Clear enemy projectiles immediately (they stop fighting)
        this.projectiles = this.projectiles.filter(projectile => {
            if (projectile.isEnemyProjectile) {
                projectile.destroy();
                return false;
            }
            return true;
        });

        console.log('Enemy evacuation initiated - enemies will flee off-screen');

        // Also evacuate ally helicopters
        console.log('=== ALLY HELICOPTER EVACUATION ===');
        this.powerUpSystem.evacuateAllHelicopters();
    }

    /**
     * Display game over screen
     */
    private showGameOverScreen(): void {
        console.log('=== SHOWING GAME OVER SCREEN ===');
        console.log('Entity counts at game over screen:');
        console.log('- Enemies:', this.enemies.length);
        console.log('- Projectiles:', this.projectiles.length);
        console.log('- PowerUps:', this.powerUps.length);

        // Prevent multiple game over screens
        if (this.gameOverScreenShown) {
            console.log('Game over screen already shown, returning');
            return;
        }
        console.log('Setting gameOverScreenShown to true');
        this.gameOverScreenShown = true;

        // Clean up any existing game over screen
        if ((this as any).currentFlashAnimation) {
            this.app.ticker.remove((this as any).currentFlashAnimation);
            (this as any).currentFlashAnimation = null;
        }
        if ((this as any).currentGameOverContainer) {
            (this as any).currentGameOverContainer.destroy();
            (this as any).currentGameOverContainer = null;
        }

        // Create overlay
        console.log('Creating overlay graphics object');
        const overlay = new PIXI.Graphics();
        overlay.beginFill(0x000000, 0.7);
        overlay.drawRect(0, 0, GameConstants.SCREEN_WIDTH, GameConstants.SCREEN_HEIGHT);
        overlay.endFill();
        console.log('Overlay created successfully');

        // Game over text
        const gameOverStyle = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 96,
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 8
        });

        console.log('Creating GAME OVER text object');
        const gameOverText = new PIXI.Text('GAME OVER', gameOverStyle);
        gameOverText.anchor.set(0.5);
        gameOverText.x = GameConstants.SCREEN_WIDTH / 2;
        gameOverText.y = 200;
        console.log('Game over text created successfully');

        // Stats text
        const statsStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 36,
            fill: '#ffffff',
            align: 'center'
        });

        const minutes = Math.floor(this.survivalTime / 60000);
        const seconds = Math.floor((this.survivalTime % 60000) / 1000);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const statsText = new PIXI.Text(
            `SCORE: ${this.scoreManager.getScore().toLocaleString()}\n` +
            `TIME: ${timeStr}\n` +
            `WAVES: ${this.waveSystem.getCurrentWave()}`,
            statsStyle
        );
        statsText.anchor.set(0.5);
        statsText.x = GameConstants.SCREEN_WIDTH / 2;
        statsText.y = 360;

        // Restart text
        const restartStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 32,
            fill: '#00ff00'
        });

        const restartText = new PIXI.Text('PRESS SPACE TO RESTART', restartStyle);
        restartText.anchor.set(0.5);
        restartText.x = GameConstants.SCREEN_WIDTH / 2;
        restartText.y = 500;

        // Flash restart text
        let flashFrame = 0;
        const flash = () => {
            flashFrame++;
            restartText.alpha = 0.5 + Math.sin(flashFrame * 0.1) * 0.5;
        };
        this.app.ticker.add(flash);

        // Add to container
        console.log('Creating game over container');
        const gameOverContainer = new PIXI.Container();
        console.log('Adding children to game over container');
        gameOverContainer.addChild(overlay);
        gameOverContainer.addChild(gameOverText);
        gameOverContainer.addChild(statsText);
        gameOverContainer.addChild(restartText);

        console.log('Adding game over container to UI container');
        this.uiContainer.addChild(gameOverContainer);
        console.log('Game over screen fully created');

        // Store reference for cleanup
        (this as any).currentGameOverContainer = gameOverContainer;
        (this as any).currentFlashAnimation = flash;

        // Listen for restart
        const handleRestart = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                window.removeEventListener('keydown', handleRestart);
                this.app.ticker.remove(flash);
                gameOverContainer.destroy();

                // Clean up references
                (this as any).currentGameOverContainer = null;
                (this as any).currentFlashAnimation = null;

                this.restart();
            }
        };

        window.addEventListener('keydown', handleRestart);
    }

    /**
     * Restart the game
     */
    private restart(): void {
        // Clear all entities
        this.cleanup();

        // Reset game state
        this.state = GameState.PLAYING;
        this.survivalTime = 0;
        this.elapsedTime = 0;
        this.lastLogTime = 0;
        this.gameOverScreenShown = false;
        this.tankDeathSequenceStarted = false;

        // Reset systems
        this.scoreManager.reset();
        this.waveSystem.reset();
        this.powerUpSystem.reset();
        // NOTE: WeaponUpgradeSystem is NOT reset - upgrades persist between lives!

        // Create new tank at center
        this.tank = new Tank(this);
        this.tank.x = GameConstants.SCREEN_WIDTH / 2;
        this.tank.y = GameConstants.TANK_Y_POSITION;

        // Tank renders at original sprite size - no scaling needed
        this.layers.getLayer('tank').addChild(this.tank);

        // Apply persistent weapon upgrades to new tank
        this.weaponUpgradeSystem.applyUpgradesToTank(this.tank);

        // Show "GO!" text
        const goStyle = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 72,
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 8
        });

        const goText = new PIXI.Text('GO!', goStyle);
        goText.anchor.set(0.5);
        goText.x = GameConstants.SCREEN_WIDTH / 2;
        goText.y = GameConstants.SCREEN_HEIGHT / 2 - 100;

        this.uiContainer.addChild(goText);

        // Fade out GO! text
        let fadeFrame = 0;
        const fade = () => {
            fadeFrame++;
            goText.alpha = Math.max(0, 1 - fadeFrame / 60);
            goText.y -= 1;

            if (fadeFrame >= 60) {
                this.app.ticker.remove(fade);
                goText.destroy();
            }
        };
        this.app.ticker.add(fade);

        // Start systems
        this.waveSystem.start();
        this.powerUpSystem.start();
        this.inputHandler.enabled = true;
    }

    /**
     * Clean up all game entities
     */
    private cleanup(): void {
        // Destroy all enemies
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];

        // Destroy all projectiles
        this.projectiles.forEach(projectile => projectile.destroy());
        this.projectiles = [];

        // Destroy all power-ups
        this.powerUps.forEach(powerUp => powerUp.destroy());
        this.powerUps = [];

        // Clear particles
        this.particleSystem.clear();

        // Destroy tank if exists
        if (this.tank) {
            this.tank.destroy();
        }
    }

    /**
     * Pause the game
     */
    public pause(): void {
        this.isPaused = true;
        this.app.ticker.stop();
    }

    /**
     * Resume the game
     */
    public resume(): void {
        this.isPaused = false;
        this.app.ticker.start();
    }

    // Public getters for systems to access
    public getInputHandler(): InputHandler {
        return this.inputHandler;
    }

    public getScoreManager(): ScoreManager {
        return this.scoreManager;
    }

    public getParticleSystem(): ParticleSystem {
        return this.particleSystem;
    }

    public addProjectile(projectile: Projectile): void {
        // Enforce projectile limit
        if (this.projectiles.length >= GameConstants.MAX_PROJECTILES) {
            // Remove oldest projectile
            const oldest = this.projectiles.shift();
            if (oldest && !oldest.isDestroyed) {
                oldest.destroy();
            }
        }

        this.projectiles.push(projectile);
        this.layers.getLayer('projectiles').addChild(projectile);
    }

    public addEnemy(enemy: Enemy): void {
        // Enforce enemy limit
        if (this.enemies.length >= GameConstants.MAX_ENEMIES) {
            console.warn(`Maximum enemy limit reached (${GameConstants.MAX_ENEMIES})`);
            enemy.destroy();
            return;
        }

        this.enemies.push(enemy);

        try {
            this.layers.getLayer('enemies').addChild(enemy);
        } catch (error) {
            console.error(`Failed to add enemy ${enemy.type} to enemies layer:`, error);
        }
    }

    public addPowerUp(powerUp: PowerUp): void {
        this.powerUps.push(powerUp);
        this.layers.getLayer('powerups').addChild(powerUp);
    }

    public getEnemies(): Enemy[] {
        return this.enemies;
    }

    public getTank(): Tank | null {
        return this.tank;
    }

    public getRenderer(): PIXI.Renderer {
        return this.app.renderer;
    }

    public getWaveSystem(): WaveSystem {
        return this.waveSystem;
    }

    public getPowerUpSystem(): PowerUpSystem {
        return this.powerUpSystem;
    }

    public getElapsedTime(): number {
        return this.elapsedTime;
    }

    public getState(): GameState {
        return this.state;
    }

    /**
     * Initialize interactive background elements
     * Based on original Heavy Weapon survival mode layout
     */
    private initializeBackgroundElements(): void {
        // Based on anims.xml analysis: interactive elements have rare="yes" attribute
        // They should spawn rarely, not always (maybe 20% chance in survival mode)
        const rareSpawnChance = 0.2; // 20% chance for rare elements to spawn

        let posters: any[] = [];
        let towers: any[] = [];

        // Rare spawn for propaganda posters
        if (Math.random() < rareSpawnChance) {
            posters = PropagandaPoster.spawnPosters(this, this.backgroundSystem);

            // Register posters with collision system
            posters.forEach(poster => {
                this.collisionSystem.addBackgroundElement(poster);
            });
        }

        // Rare spawn for control towers
        if (Math.random() < rareSpawnChance) {
            towers = ControlTower.spawnTowers(this, this.backgroundSystem);

            // Register towers with collision system
            towers.forEach(tower => {
                this.collisionSystem.addBackgroundElement(tower);
            });
        }

        console.log(`Initialized ${posters.length} propaganda posters and ${towers.length} control towers (rare spawn system)`);
    }

    public isDebugMode(): boolean {
        // Check URL params for debug mode
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('debug');
    }

    /**
     * Get game state for debug access
     */
    public getGameState(): any {
        return {
            getState: () => this.state === GameState.PLAYING ? 'playing' : 'other',
            getTank: () => this.tank,
            getEnemies: () => this.enemies,
            spawnPowerUp: (type: any, x: number, y: number) => {
                this.powerUpSystem.spawnPowerUp(type, x, y);
            }
        };
    }
}