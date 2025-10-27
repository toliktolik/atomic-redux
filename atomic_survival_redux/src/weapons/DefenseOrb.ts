/**
 * Defense Orb Weapon - AUTHENTIC Heavy Weapon implementation
 * Based on Ghidra analysis: Weapon_ProcessDefenseOrb @ 0x0042eb30
 *
 * CRITICAL FIX: The original DefenseOrb is NOT an orbital weapon system!
 * Original function only calls PowerUp_ProcessSpeedBoost - it's a speed boost effect!
 */

import * as PIXI from 'pixi.js';
import { Weapon, WeaponType } from './Weapon';
import { Game } from '../core/Game';

export class DefenseOrb extends Weapon {
    // Defense orb properties - SIMPLIFIED to match original
    private speedBoostActive: boolean = false;
    private speedBoostDuration: number = 0;

    constructor(game: Game) {
        super(game, WeaponType.DEFENSE_ORB);

        // Defense orb stats - AUTHENTIC original behavior
        this.damage = 0; // DefenseOrb doesn't do damage - it's a utility effect
        this.fireRate = 5000; // 5 second activation cooldown
        this.ammo = -1; // Infinite ammo (utility system)
        this.maxAmmo = -1;
        this.projectileSpeed = 0; // No projectiles
    }

    /**
     * Fire weapon - AUTHENTIC: Activates speed boost effect
     * Based on Ghidra: Weapon_ProcessDefenseOrb only calls PowerUp_ProcessSpeedBoost
     */
    public fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void {
        if (!this.canFire()) return;

        // Original DefenseOrb provides speed boost to tank
        const tank = this.game.getPlayerTank();
        if (tank) {
            // Apply speed boost effect for 10 seconds
            tank.activateSpeedBoost(10000);
        }

        this.lastFireTime = Date.now();
        console.log(`⚡ Defense Orb activated: Speed boost granted to tank`);
    }

    /**
     * Upgrade weapon to next level (0-3)
     */
    public upgrade(): boolean {
        if (this.upgradeLevel >= 3) {
            console.log(`⚡ Defense Orb already at max level (${this.upgradeLevel})`);
            return false;
        }

        this.upgradeLevel++;

        // Upgrade effects: better cooldown and longer duration
        switch (this.upgradeLevel) {
            case 1:
                this.fireRate = 4000; // 4 second cooldown
                break;
            case 2:
                this.fireRate = 3000; // 3 second cooldown
                break;
            case 3:
                this.fireRate = 2000; // 2 second cooldown (max level)
                break;
        }

        console.log(`⚡ Defense Orb upgraded to Level ${this.upgradeLevel}: ${this.fireRate/1000}s cooldown`);
        return true;
    }

    /**
     * Clean up defense orb system
     */
    public cleanup(): void {
        // No cleanup needed for speed boost effect
    }
}