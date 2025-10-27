/**
 * Rockets - High damage explosive projectiles
 */

import { Weapon, WeaponType } from './Weapon';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';

export class Rockets extends Weapon {
    constructor(game: Game) {
        super(game, WeaponType.ROCKETS);

        const config = GameConstants.PLAYER_WEAPONS.ROCKETS;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.ammo = config.ammo;
        this.maxAmmo = config.ammo;
        this.spread = config.spread;
    }

    /**
     * Fire explosive rocket
     */
    public fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void {
        if (this.ammo <= 0) return;

        // Apply spread for less accuracy
        const finalAngle = this.applySpread(angle);

        // Create rocket projectile
        const projectile = this.createProjectile(x, y, finalAngle, isPlayerProjectile, 'rocket');

        // Decrease ammo
        this.ammo = Math.max(0, this.ammo - 1);
    }
}