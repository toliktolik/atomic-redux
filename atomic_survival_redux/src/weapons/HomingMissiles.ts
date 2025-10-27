/**
 * Homing Missiles - Tracks enemies automatically
 */

import { Weapon, WeaponType } from './Weapon';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';

export class HomingMissiles extends Weapon {
    constructor(game: Game) {
        super(game, WeaponType.HOMING_MISSILES);

        const config = GameConstants.PLAYER_WEAPONS.HOMING_MISSILES;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.ammo = config.ammo;
        this.maxAmmo = config.ammo;
        this.spread = config.spread;
    }

    /**
     * Fire homing missiles
     */
    public fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void {
        if (this.ammo <= 0) return;

        // Fire two missiles from each side of tank
        const offsetX = 15;
        const offsetY = -5;

        // Left missile
        const leftX = x - offsetX;
        const leftY = y + offsetY;
        const leftProjectile = this.createProjectile(leftX, leftY, angle - 0.1, isPlayerProjectile, 'missile');

        // Right missile
        const rightX = x + offsetX;
        const rightY = y + offsetY;
        const rightProjectile = this.createProjectile(rightX, rightY, angle + 0.1, isPlayerProjectile, 'missile');

        // Decrease ammo
        this.ammo = Math.max(0, this.ammo - 2);
    }
}