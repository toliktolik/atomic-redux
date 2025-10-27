/**
 * Laser Cannon - Piercing laser beams
 */

import { Weapon, WeaponType } from './Weapon';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';

export class LaserCannon extends Weapon {
    constructor(game: Game) {
        super(game, WeaponType.LASER_CANNON);

        const config = GameConstants.PLAYER_WEAPONS.LASER_CANNON;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.ammo = config.ammo;
        this.maxAmmo = config.ammo;
        this.spread = config.spread;
    }

    /**
     * Fire piercing laser beam
     */
    public fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void {
        if (this.ammo <= 0) return;

        // Create laser projectile
        const projectile = this.createProjectile(x, y, angle, isPlayerProjectile, 'laser');

        // Decrease ammo
        this.ammo = Math.max(0, this.ammo - 1);
    }
}