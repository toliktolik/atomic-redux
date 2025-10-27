/**
 * WeaponUpgradeSystem - Manages PERMANENT weapon upgrades (separate from temporary powerups)
 * Based on Ghidra analysis of WeaponUpgrade_AdjustLevel and persistent weapon storage
 */

import { Game } from '../core/Game';
import { Tank } from '../entities/Tank';
import { WeaponType } from '../weapons/Weapon';

export interface WeaponUpgradeState {
    defenseOrb: number;      // 0-3 levels
    homingMissiles: number;  // 0-3 levels
    laserCannon: number;     // 0-3 levels
    rocketPods: number;      // 0-3 levels
    flakCannon: number;      // 0-3 levels
    thunderstrike: number;   // 0-3 levels
}

export class WeaponUpgradeSystem {
    private game: Game;
    private upgradeState: WeaponUpgradeState;

    constructor(game: Game) {
        this.game = game;

        // Initialize with no upgrades (like starting a new campaign)
        this.upgradeState = {
            defenseOrb: 0,
            homingMissiles: 0,
            laserCannon: 0,
            rocketPods: 0,
            flakCannon: 0,
            thunderstrike: 0
        };
    }

    /**
     * Apply permanent weapon upgrade (like buying in shop between levels)
     * Based on Ghidra: WeaponUpgrade_AdjustLevel function
     */
    public upgradeWeapon(weaponType: WeaponType): boolean {
        const currentLevel = this.getUpgradeLevel(weaponType);

        if (currentLevel >= 3) {
            console.log(`⚔️ ${weaponType} already at maximum level (3)`);
            return false; // Already maxed
        }

        // Increase upgrade level permanently
        this.setUpgradeLevel(weaponType, currentLevel + 1);

        // Apply to current tank if exists
        const tank = this.game.getTank();
        if (tank) {
            this.applyUpgradesToTank(tank);
        }

        console.log(`⚔️ PERMANENT UPGRADE: ${weaponType} upgraded to level ${currentLevel + 1}`);
        return true;
    }

    /**
     * Get current upgrade level for weapon
     */
    public getUpgradeLevel(weaponType: WeaponType): number {
        switch (weaponType) {
            case WeaponType.STANDARD_GUN: return this.upgradeState.defenseOrb; // Defense orb affects standard gun
            case WeaponType.HOMING_MISSILES: return this.upgradeState.homingMissiles;
            case WeaponType.LASER_CANNON: return this.upgradeState.laserCannon;
            case WeaponType.ROCKETS: return this.upgradeState.rocketPods;
            case WeaponType.FLAK_CANNON: return this.upgradeState.flakCannon;
            case WeaponType.THUNDERSTRIKE: return this.upgradeState.thunderstrike;
            default: return 0;
        }
    }

    /**
     * Set upgrade level for weapon
     */
    private setUpgradeLevel(weaponType: WeaponType, level: number): void {
        level = Math.max(0, Math.min(3, level)); // Clamp 0-3

        switch (weaponType) {
            case WeaponType.STANDARD_GUN:
                this.upgradeState.defenseOrb = level;
                break;
            case WeaponType.HOMING_MISSILES:
                this.upgradeState.homingMissiles = level;
                break;
            case WeaponType.LASER_CANNON:
                this.upgradeState.laserCannon = level;
                break;
            case WeaponType.ROCKETS:
                this.upgradeState.rocketPods = level;
                break;
            case WeaponType.FLAK_CANNON:
                this.upgradeState.flakCannon = level;
                break;
            case WeaponType.THUNDERSTRIKE:
                this.upgradeState.thunderstrike = level;
                break;
        }
    }

    /**
     * Apply all current upgrades to a tank
     * Based on Ghidra: Tank_RenderWithPowerUps showing persistent upgrade rendering
     */
    public applyUpgradesToTank(tank: Tank): void {
        // Apply permanent damage/fire rate upgrades based on levels
        for (const [weaponType, weapon] of (tank as any).weapons.entries()) {
            const level = this.getUpgradeLevel(weaponType);
            if (level > 0) {
                // Apply permanent upgrades (these persist across powerups)
                this.applyWeaponLevelBoosts(weapon, level);
            }
        }

        console.log('⚔️ Applied permanent weapon upgrades to tank');
    }

    /**
     * Apply level-based boosts to weapon (permanent effects)
     */
    private applyWeaponLevelBoosts(weapon: any, level: number): void {
        const baseDamage = weapon.baseDamage || weapon.damage;
        const baseFireRate = weapon.baseFireRate || weapon.getFireRate();

        // Each level increases damage by 25% and fire rate by 15%
        const damageMultiplier = 1 + (level * 0.25);
        const fireRateMultiplier = 1 - (level * 0.15); // Lower = faster

        weapon.damage = Math.floor(baseDamage * damageMultiplier);
        weapon.fireRate = Math.floor(baseFireRate * fireRateMultiplier);

        // Store base values for future calculations
        weapon.baseDamage = baseDamage;
        weapon.baseFireRate = baseFireRate;
    }

    /**
     * Get total upgrade points spent (for display)
     */
    public getTotalUpgradePoints(): number {
        return this.upgradeState.defenseOrb +
               this.upgradeState.homingMissiles +
               this.upgradeState.laserCannon +
               this.upgradeState.rocketPods +
               this.upgradeState.flakCannon +
               this.upgradeState.thunderstrike;
    }

    /**
     * Reset all upgrades (new campaign)
     */
    public reset(): void {
        this.upgradeState = {
            defenseOrb: 0,
            homingMissiles: 0,
            laserCannon: 0,
            rocketPods: 0,
            flakCannon: 0,
            thunderstrike: 0
        };
        console.log('⚔️ Weapon upgrades reset for new campaign');
    }

    /**
     * Save upgrade state (for persistence between sessions)
     */
    public getUpgradeState(): WeaponUpgradeState {
        return { ...this.upgradeState };
    }

    /**
     * Load upgrade state (from saved game)
     */
    public setUpgradeState(state: WeaponUpgradeState): void {
        this.upgradeState = { ...state };

        // Apply to current tank if exists
        const tank = this.game.getTank();
        if (tank) {
            this.applyUpgradesToTank(tank);
        }

        console.log('⚔️ Weapon upgrades loaded:', this.upgradeState);
    }
}