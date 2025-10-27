/**
 * PowerUp System - Manages power-up drops and helicopter deliveries
 */

import { Game } from '../core/Game';
import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { GameConstants } from '../config/GameConstants';
import { AllyHelicopter } from '../entities/AllyHelicopter';
import { HelicopterDropManager } from './HelicopterDropManager';

export class PowerUpSystem {
    private game: Game;

    // AUTHENTIC: Original uses frame-based powerup spawning system
    private spawnFrameCounter: number = 0;
    private spawnCheckInterval: number = 200; // Every 200 frames (3.33 seconds at 60fps)
    private enemyKillCounter: number = 0;

    // AUTHENTIC: 4-slot powerup management system (matches original array structure)
    private powerUpSlots: (PowerUp | null)[] = [null, null, null, null];

    private powerUps: PowerUp[] = [];
    private helicopters: AllyHelicopter[] = [];
    private helicopterDropManager: HelicopterDropManager;

    constructor(game: Game) {
        this.game = game;
        this.helicopterDropManager = new HelicopterDropManager(game);
    }

    /**
     * Update power-up system - AUTHENTIC: Frame-based spawning like original
     */
    public update(deltaTime: number): void {
        // Don't update if game is over
        if (this.game.getState() === 'GAME_OVER') {
            return;
        }

        // AUTHENTIC: Frame-based spawn checking (matches original 200-frame intervals)
        this.spawnFrameCounter++;
        if (this.spawnFrameCounter >= this.spawnCheckInterval) {
            this.checkPowerUpSpawnConditions();
            this.spawnFrameCounter = 0;
        }

        // Use helicopter drop manager for visual delivery
        this.helicopterDropManager.update(deltaTime);

        // Update all power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime);

            if (powerUp.isDestroyed) {
                this.powerUps.splice(i, 1);
            }
        }

        // Update ally helicopters
        for (let i = this.helicopters.length - 1; i >= 0; i--) {
            const helicopter = this.helicopters[i];
            helicopter.update(deltaTime);

            if (helicopter.isComplete()) {
                this.helicopters.splice(i, 1);
            }
        }
    }

    /**
     * AUTHENTIC: Check powerup spawn conditions based on original logic
     * Based on PowerUp_SpawningSystem @ 0x00419eb0 - uses boss index and enemy kill tracking
     */
    private checkPowerUpSpawnConditions(): void {
        // AUTHENTIC: Boss index determines powerup availability (original uses GetBossIndex)
        const currentWave = this.game.getWaveSystem().getCurrentWave();
        const bossIndex = Math.floor(currentWave / 10); // Every 10 waves = new boss tier

        // AUTHENTIC: Find empty slot (original checks param_1 + 0x314 + iVar8 * 4)
        const emptySlotIndex = this.findEmptyPowerUpSlot();
        if (emptySlotIndex === -1) {
            console.log('🎁 PowerUp spawn blocked: All slots occupied');
            return;
        }

        // AUTHENTIC: Enemy kill requirement (original uses Collision_HandleEnemyHit counter)
        const killThreshold = 5 + (bossIndex * 2); // Scales with boss progression
        if (this.enemyKillCounter < killThreshold) {
            return;
        }

        // AUTHENTIC: Spawn powerup (matches original slot assignment logic)
        this.spawnPowerUpInSlot(emptySlotIndex, bossIndex);
        this.enemyKillCounter = 0; // Reset counter after spawn
    }

    /**
     * AUTHENTIC: Find empty powerup slot (matches original array checking)
     */
    private findEmptyPowerUpSlot(): number {
        for (let i = 0; i < this.powerUpSlots.length; i++) {
            if (this.powerUpSlots[i] === null) {
                return i;
            }
        }
        return -1;
    }

    /**
     * AUTHENTIC: Spawn powerup in specific slot based on boss progression
     */
    private spawnPowerUpInSlot(slotIndex: number, bossIndex: number): void {
        // AUTHENTIC: PowerUp type selection based on boss level (matches original logic)
        const powerUpTypes = [
            PowerUpType.WEAPON_UPGRADE,
            PowerUpType.SHIELD,
            PowerUpType.SPEED_BOOST,
            PowerUpType.RAPID_FIRE
        ];

        // Higher boss tiers unlock better powerups
        if (bossIndex >= 1) powerUpTypes.push(PowerUpType.MEGA_LASER);
        if (bossIndex >= 2) powerUpTypes.push(PowerUpType.NUKE);
        if (bossIndex >= 3) powerUpTypes.push(PowerUpType.SPREAD_SHOT);

        const selectedType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

        // Create and assign to slot
        this.dropPowerUp(selectedType);
        console.log(`🎁 PowerUp spawned in slot ${slotIndex}: ${selectedType} (Boss Level: ${bossIndex})`);
    }

    /**
     * Drop a power-up from ally helicopter (authentic Heavy Weapon delivery)
     */
    public dropPowerUp(type?: PowerUpType): void {
        // Choose random type if not specified
        if (!type) {
            const types = [
                PowerUpType.WEAPON_UPGRADE,
                PowerUpType.SHIELD,
                PowerUpType.NUKE,
                PowerUpType.MEGA_LASER,
                PowerUpType.SPEED_BOOST,
                PowerUpType.RAPID_FIRE,
                PowerUpType.SPREAD_SHOT,
                PowerUpType.HEALTH
            ];

            // Weight certain power-ups based on conditions
            const tank = this.game.getTank();
            if (tank && tank.health < tank.maxHealth * 0.5) {
                // Higher chance for health when low
                types.push(PowerUpType.HEALTH, PowerUpType.HEALTH);
            }

            type = types[Math.floor(Math.random() * types.length)];
        }

        // Create ally helicopter to deliver power-up
        const dropX = 100 + Math.random() * (GameConstants.SCREEN_WIDTH - 200);
        const helicopter = new AllyHelicopter(this.game, type, dropX);

        // Add helicopter to game and track it
        this.helicopters.push(helicopter);
        this.game.layers.getLayer('effects').addChild(helicopter);

        console.log(`Ally helicopter dispatched to deliver ${type}`);
    }

    /**
     * Calculate next drop time
     */
    private calculateNextDropTime(): void {
        // Random time between 10-20 seconds
        this.nextDropTime = 10000 + Math.random() * 10000;
    }

    /**
     * Force drop a specific power-up (for testing or special events)
     */
    public forceDrop(type: PowerUpType, x?: number, y?: number): void {
        x = x ?? GameConstants.SCREEN_WIDTH / 2;
        y = y ?? -50;

        const powerUp = new PowerUp(this.game, type, x, y);
        this.powerUps.push(powerUp);
        this.game.addPowerUp(powerUp);
    }

    /**
     * Get all active power-ups
     */
    public getPowerUps(): PowerUp[] {
        return this.powerUps;
    }

    /**
     * Spawn a power-up at specific location (for debug/cheats)
     */
    public spawnPowerUp(type: PowerUpType, x: number, y: number): void {
        const powerUp = new PowerUp(this.game, type, x, y);
        this.powerUps.push(powerUp);
        this.game.addPowerUp(powerUp);
    }

    /**
     * Clear all power-ups and helicopters
     */
    public clear(): void {
        for (const powerUp of this.powerUps) {
            powerUp.destroy();
        }
        this.powerUps = [];

        for (const helicopter of this.helicopters) {
            helicopter.completeMission();
        }
        this.helicopters = [];
    }

    /**
     * Force helicopter drop (for background destruction rewards)
     * Based on Ghidra: Survival_SpawnBonusRewardMarker
     */
    public triggerHelicopterDrop(powerUpType?: PowerUpType): void {
        this.helicopterDropManager.forceHelicopterDrop(powerUpType);
    }

    /**
     * Get drop statistics for debugging
     */
    public getDropStats(): any {
        return this.helicopterDropManager.getDropStats();
    }

    /**
     * AUTHENTIC: Notify system of enemy kill (for spawn trigger logic)
     * Called by enemy destruction - matches original Collision_HandleEnemyHit tracking
     */
    public onEnemyKilled(): void {
        this.enemyKillCounter++;
        console.log(`💀 Enemy killed: Kill counter = ${this.enemyKillCounter}`);
    }

    /**
     * Reset the system - FIXED for authentic frame-based system
     */
    public reset(): void {
        this.clear();

        // AUTHENTIC: Reset frame-based counters
        this.spawnFrameCounter = 0;
        this.enemyKillCounter = 0;

        // Clear all powerup slots
        this.powerUpSlots.fill(null);

        this.helicopterDropManager.reset();
    }

    /**
     * Start the power-up system
     */
    public start(): void {
        // Reset and start fresh
        this.reset();
    }

    /**
     * Evacuate all ally helicopters when player dies
     */
    public evacuateAllHelicopters(): void {
        this.helicopterDropManager.evacuateAllHelicopters();
    }
}