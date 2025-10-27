/**
 * Flak Cannon - Shotgun-style spread weapon
 */

import { Weapon, WeaponType } from './Weapon';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';

export class FlakCannon extends Weapon {
    private projectileCount: number = 5;

    constructor(game: Game) {
        super(game, WeaponType.FLAK_CANNON);

        const config = GameConstants.PLAYER_WEAPONS.FLAK_CANNON;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.ammo = config.ammo;
        this.maxAmmo = config.ammo;
        this.spread = config.spread;
        this.projectileCount = config.projectileCount || 5;
    }

    /**
     * Fire multiple projectiles in a spread pattern
     */
    public fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void {
        if (this.ammo <= 0) return;

        // Calculate spread angles
        const spreadRadians = (this.spread * Math.PI) / 180;
        const angleStep = spreadRadians / (this.projectileCount - 1);
        const startAngle = angle - spreadRadians / 2;

        // Fire multiple projectiles
        for (let i = 0; i < this.projectileCount; i++) {
            const projectileAngle = startAngle + angleStep * i;

            // Add some randomness to each projectile
            const randomSpread = (Math.random() - 0.5) * 0.1;
            const finalAngle = projectileAngle + randomSpread;

            this.createProjectile(x, y, finalAngle, isPlayerProjectile, 'bullet');
        }

        // Decrease ammo (one shot uses one ammo despite multiple projectiles)
        this.ammo = Math.max(0, this.ammo - 1);
    }
}