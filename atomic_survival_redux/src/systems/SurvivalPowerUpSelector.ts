/**
 * Survival Power-Up Selector - Context-aware power-up selection system
 * Based on Ghidra analysis of Survival_ProcessPowerUpDrops @ 0x0040aed0
 */

import { PowerUpType } from '../entities/PowerUp';
import { Game } from '../core/Game';

export interface GameStateContext {
    playerHealth: number;
    maxHealth: number;
    weaponTier: number;
    enemyCount: number;
    survivalTime: number;
    timeSinceLastDrop: number;
    recentPowerUps: PowerUpType[];
}

export class SurvivalPowerUpSelector {
    private lastDropTime: number = 0;
    private recentPowerUps: PowerUpType[] = [];
    private maxRecentTracking: number = 5;

    /**
     * Select power-up based on current game state (Ghidra-verified logic)
     */
    public selectOptimalPowerUp(context: GameStateContext): PowerUpType {
        // Clear old recent power-ups
        if (this.recentPowerUps.length > this.maxRecentTracking) {
            this.recentPowerUps.shift();
        }

        // Priority 1: Critical health (< 30%) - Shield/Health preferred
        if (context.playerHealth / context.maxHealth < 0.3) {
            if (!this.wasRecentlyDropped(PowerUpType.SHIELD)) {
                console.log('Selected SHIELD due to critical health');
                return PowerUpType.SHIELD;
            }
        }

        // Priority 2: Low weapon tier - Weapon upgrades
        if (context.weaponTier === 0 && context.survivalTime > 10000) {
            if (!this.wasRecentlyDropped(PowerUpType.WEAPON_UPGRADE)) {
                console.log('Selected WEAPON_UPGRADE due to low weapon tier');
                return PowerUpType.WEAPON_UPGRADE;
            }
            if (!this.wasRecentlyDropped(PowerUpType.SPREAD_SHOT)) {
                console.log('Selected SPREAD_SHOT due to low weapon tier');
                return PowerUpType.SPREAD_SHOT;
            }
        }

        // Priority 3: High enemy count (> 20) - Area damage
        if (context.enemyCount > 20) {
            if (!this.wasRecentlyDropped(PowerUpType.NUKE)) {
                console.log('Selected NUKE due to high enemy count');
                return PowerUpType.NUKE;
            }
            console.log('Selected MEGA_LASER due to high enemy count (NUKE recent)');
            return PowerUpType.MEGA_LASER;
        }

        // Priority 4: Long survival time - Advanced power-ups
        if (context.survivalTime > 60000) { // 1+ minute
            const advancedPowerUps = [PowerUpType.RAPID_FIRE, PowerUpType.SPEED_BOOST];
            const available = advancedPowerUps.filter(p => !this.wasRecentlyDropped(p));
            if (available.length > 0) {
                const selected = this.selectFromArray(available);
                console.log(`Selected ${PowerUpType[selected]} for advanced survival`);
                return selected;
            }
        }

        // Priority 5: Balance prevention - Avoid recent duplicates
        const availablePowerUps = this.getAvailablePowerUps();
        const filteredPowerUps = availablePowerUps.filter(
            powerUp => !this.wasRecentlyDropped(powerUp)
        );

        const finalSelection = this.selectFromArray(filteredPowerUps.length > 0 ? filteredPowerUps : availablePowerUps);
        console.log(`Selected ${PowerUpType[finalSelection]} (balanced selection)`);
        return finalSelection;
    }

    private wasRecentlyDropped(powerUpType: PowerUpType): boolean {
        return this.recentPowerUps.includes(powerUpType);
    }

    private selectFromArray(powerUps: PowerUpType[]): PowerUpType {
        if (powerUps.length === 0) {
            console.warn('No power-ups available, defaulting to NUKE');
            return PowerUpType.NUKE;
        }
        return powerUps[Math.floor(Math.random() * powerUps.length)];
    }

    private getAvailablePowerUps(): PowerUpType[] {
        return [
            PowerUpType.SHIELD,
            PowerUpType.NUKE,
            PowerUpType.MEGA_LASER,
            PowerUpType.SPEED_BOOST,
            PowerUpType.RAPID_FIRE,
            PowerUpType.WEAPON_UPGRADE,
            PowerUpType.SPREAD_SHOT,
            PowerUpType.HEALTH
        ];
    }

    /**
     * Record power-up drop for future selection logic
     */
    public recordPowerUpDrop(powerUpType: PowerUpType): void {
        if (powerUpType === undefined || powerUpType === null) {
            console.warn('Attempted to record undefined power-up, skipping');
            return;
        }

        this.recentPowerUps.push(powerUpType);
        this.lastDropTime = Date.now();

        console.log(`Recorded power-up drop: ${PowerUpType[powerUpType]}, recent: [${this.recentPowerUps.map(p => PowerUpType[p]).join(', ')}]`);
    }

    /**
     * Create game state context from current game state
     */
    public static createGameContext(game: Game): GameStateContext {
        const tank = game.getTank();
        const weaponTier = tank ? (tank as any).getCurrentWeaponTier?.() || 0 : 0;

        return {
            playerHealth: tank ? tank.health : 100,
            maxHealth: tank ? tank.maxHealth : 100,
            weaponTier: weaponTier,
            enemyCount: game.getEnemies().length,
            survivalTime: game.getElapsedTime(),
            timeSinceLastDrop: 0, // Would need tracking in PowerUpSystem
            recentPowerUps: []
        };
    }

    /**
     * Get selection statistics for debugging
     */
    public getStats(): {
        recentDrops: string[];
        lastDropTime: number;
    } {
        return {
            recentDrops: this.recentPowerUps.map(p => PowerUpType[p]),
            lastDropTime: this.lastDropTime
        };
    }
}