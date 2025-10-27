/**
 * Helicopter Drop Manager - Dynamic helicopter timing and positioning
 * Based on Ghidra analysis of Survival_ProcessPowerUpDrops @ 0x0040aed0
 * and Survival_CalculateWaveTiming @ 0x0040a790
 */

import { Game } from '../core/Game';
import { AllyHelicopter } from '../entities/AllyHelicopter';
import { PowerUpType } from '../entities/PowerUp';
import { GameConstants } from '../config/GameConstants';
import { SurvivalPowerUpSelector, GameStateContext } from './SurvivalPowerUpSelector';

export interface DropCalculationFactors {
    baseInterval: number;     // 15000ms base interval
    healthBonus: number;      // Frequency increase for low health
    weaponBonus: number;      // Frequency increase for basic weapons
    timeBonus: number;        // Frequency increase over survival time
    maxDropChance: number;    // Maximum drop probability (70%)
}

export class HelicopterDropManager {
    private game: Game;
    private dropCalculation: DropCalculationFactors;
    private lastDropTime: number = 0;
    private powerUpSelector: SurvivalPowerUpSelector;
    private activeHelicopters: AllyHelicopter[] = [];

    constructor(game: Game) {
        this.game = game;
        // Based on survival0.xml analysis - waves are 1-3 seconds with intense action
        // Helicopter drops must match this fast-paced intensity
        this.dropCalculation = {
            baseInterval: 20000,  // 20 seconds (matches fast wave progression)
            healthBonus: 0.15,    // 15% increase when health < 30% (supportive)
            weaponBonus: 0.1,     // 10% increase with basic weapons (helpful)
            timeBonus: 0.05,      // 5% increase after long periods (encouraging)
            maxDropChance: 0.4    // 40% maximum (supportive of intense action)
        };

        this.powerUpSelector = new SurvivalPowerUpSelector();
    }

    /**
     * Calculate helicopter drop probability based on survival context
     * Based on Ghidra function: Survival_ProcessPowerUpDrops
     */
    public calculateDropChance(context: GameStateContext): number {
        let dropChance = 0.15; // Base 15% chance (supportive of intense survival action)

        // Health-based bonus (Ghidra-verified logic)
        const healthPercentage = context.playerHealth / context.maxHealth;
        if (healthPercentage < 0.3) {
            dropChance += this.dropCalculation.healthBonus;
        } else if (healthPercentage < 0.6) {
            dropChance += this.dropCalculation.healthBonus * 0.5;
        }

        // Weapon tier bonus
        if (context.weaponTier === 0) {
            dropChance += this.dropCalculation.weaponBonus;
        }

        // Time-based bonus (increases over survival time)
        if (context.timeSinceLastDrop > 60000) { // Over 1 minute since last drop
            dropChance += this.dropCalculation.timeBonus;
        }

        // Survival time bonus (long survival gets more frequent drops)
        if (context.survivalTime > 120000) { // 2+ minutes
            dropChance += 0.05;
        }

        // Enemy count bonus
        if (context.enemyCount > 15) {
            dropChance += 0.1;
        }

        // Cap maximum drop chance
        return Math.min(dropChance, this.dropCalculation.maxDropChance);
    }

    /**
     * Determine if helicopter should spawn based on survival state
     * Based on Ghidra PowerUp_SpawningSystem timing gates
     */
    public shouldSpawnHelicopter(context: GameStateContext): boolean {
        const currentTime = context.survivalTime;

        // XML Analysis: Waves are 1-3 seconds long, requiring more frequent support
        // Minimum interval but allow checking more frequently
        if (currentTime - this.lastDropTime < this.dropCalculation.baseInterval) {
            return false;
        }

        // Simplified timing gate - check every 5 seconds instead of complex modulo
        // This matches the fast-paced nature of survival mode waves
        const checkTimer = Math.floor(currentTime / 1000); // Every second
        if (checkTimer % 5 !== 0) {
            return false; // Only check every 5 seconds
        }

        const dropChance = this.calculateDropChance(context);
        const shouldDrop = Math.random() < dropChance;

        if (shouldDrop) {
            console.log(`Helicopter spawn triggered - Drop chance: ${(dropChance * 100).toFixed(1)}%`);
        }

        return shouldDrop;
    }

    /**
     * Spawn helicopter with context-aware power-up selection
     */
    public spawnHelicopter(context?: GameStateContext): void {
        if (!context) {
            context = SurvivalPowerUpSelector.createGameContext(this.game);
        }

        const powerUpType = this.powerUpSelector.selectOptimalPowerUp(context);
        const dropX = this.calculateOptimalDropPosition(context);

        const helicopter = new AllyHelicopter(this.game, powerUpType, dropX);

        // Add to active helicopters tracking
        this.activeHelicopters.push(helicopter);

        // Try to add to allies layer, fallback to effects layer
        try {
            this.game.layers.getLayer('allies').addChild(helicopter);
        } catch (error) {
            console.warn('Allies layer not found, using effects layer for helicopter');
            this.game.layers.getLayer('effects').addChild(helicopter);
        }

        this.powerUpSelector.recordPowerUpDrop(powerUpType);
        this.lastDropTime = context.survivalTime;

        console.log(`Helicopter spawned with ${PowerUpType[powerUpType]} at x=${dropX} (drop chance was ${(this.calculateDropChance(context) * 100).toFixed(1)}%)`);
    }

    private calculateOptimalDropPosition(context: GameStateContext): number {
        const tank = this.game.getTank();
        if (!tank || tank.isDestroyed || !tank.position) {
            return GameConstants.SCREEN_WIDTH / 2;
        }

        // Position helicopter drop near player tank (within reasonable range)
        const tankX = tank.x || GameConstants.SCREEN_WIDTH / 2;
        const minDropX = Math.max(100, tankX - 200);
        const maxDropX = Math.min(GameConstants.SCREEN_WIDTH - 100, tankX + 200);

        return minDropX + Math.random() * (maxDropX - minDropX);
    }

    /**
     * Update drop manager (should be called from PowerUpSystem)
     */
    public update(deltaTime: number): void {
        const context = SurvivalPowerUpSelector.createGameContext(this.game);
        context.timeSinceLastDrop = context.survivalTime - this.lastDropTime;

        // Update active helicopters
        this.updateActiveHelicopters(deltaTime);

        // Check if it's time for a helicopter drop
        if (this.shouldSpawnHelicopter(context)) {
            this.spawnHelicopter(context);
        }
    }

    private updateActiveHelicopters(deltaTime: number): void {
        // Update all active helicopters and remove completed ones
        this.activeHelicopters = this.activeHelicopters.filter(helicopter => {
            helicopter.update(deltaTime);
            return !helicopter.isComplete();
        });
    }

    /**
     * Reset helicopter system (called when starting new game)
     */
    public reset(): void {
        this.activeHelicopters.forEach(helicopter => {
            helicopter.destroy();
        });
        this.activeHelicopters = [];
        this.lastDropTime = 0;
        console.log('Helicopter drop manager reset');
    }

    /**
     * Force helicopter drop (for testing or special events)
     */
    public forceHelicopterDrop(powerUpType?: PowerUpType): void {
        const context = SurvivalPowerUpSelector.createGameContext(this.game);

        if (powerUpType) {
            const dropX = this.calculateOptimalDropPosition(context);
            const helicopter = new AllyHelicopter(this.game, powerUpType, dropX);

            // Try to add to allies layer, fallback to effects layer
            try {
                this.game.layers.getLayer('allies').addChild(helicopter);
            } catch (error) {
                console.warn('Allies layer not found, using effects layer for helicopter');
                this.game.layers.getLayer('effects').addChild(helicopter);
            }
            this.powerUpSelector.recordPowerUpDrop(powerUpType);
            console.log(`Forced helicopter drop: ${PowerUpType[powerUpType]}`);
        } else {
            this.spawnHelicopter(context);
        }

        this.lastDropTime = context.survivalTime;
    }

    /**
     * Get drop statistics for debugging
     */
    public getDropStats(): {
        lastDropTime: number;
        timeSinceLastDrop: number;
        selectorStats: any;
    } {
        const context = SurvivalPowerUpSelector.createGameContext(this.game);
        return {
            lastDropTime: this.lastDropTime,
            timeSinceLastDrop: context.survivalTime - this.lastDropTime,
            selectorStats: this.powerUpSelector.getStats()
        };
    }

    /**
     * Evacuate all active ally helicopters when player dies
     */
    public evacuateAllHelicopters(): void {
        console.log(`Evacuating ${this.activeHelicopters.length} ally helicopters`);

        this.activeHelicopters.forEach((helicopter, index) => {
            helicopter.evacuate();
            console.log(`Helicopter ${index}: Emergency evacuation initiated`);
        });
    }

}