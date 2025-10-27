/**
 * Thunderstrike - Chain lightning weapon
 */

import { Weapon, WeaponType } from './Weapon';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { Projectile } from '../entities/Projectile';

export class Thunderstrike extends Weapon {
    private chainRange: number = 150;
    private maxChains: number = 3;

    constructor(game: Game) {
        super(game, WeaponType.THUNDERSTRIKE);

        const config = GameConstants.PLAYER_WEAPONS.THUNDERSTRIKE;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.ammo = config.ammo;
        this.maxAmmo = config.ammo;
        this.spread = config.spread;
    }

    /**
     * Fire chain lightning bolt
     */
    public fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void {
        if (this.ammo <= 0) return;

        // Create primary lightning bolt
        const projectile = this.createProjectile(x, y, angle, isPlayerProjectile, 'energy_ball');

        // Add chain lightning properties
        this.addChainLightningProperties(projectile);

        // Decrease ammo
        this.ammo = Math.max(0, this.ammo - 1);
    }

    /**
     * Add chain lightning properties to projectile
     */
    private addChainLightningProperties(projectile: Projectile): void {
        // This would normally add special properties to the projectile
        // For chain lightning behavior, but requires extending Projectile class
        // For now, the projectile acts as a powerful single-target weapon
    }
}