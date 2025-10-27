/**
 * Standard Gun - Default weapon with unlimited ammo
 */

import { Weapon, WeaponType } from './Weapon';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';

export class StandardGun extends Weapon {
    constructor(game: Game) {
        super(game, WeaponType.STANDARD_GUN);

        const config = GameConstants.PLAYER_WEAPONS.STANDARD_GUN;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.ammo = config.ammo;
        this.maxAmmo = config.ammo;
        this.spread = config.spread;
    }

    /**
     * Fire a standard bullet
     */
    public fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void {
        // Standard gun has unlimited ammo
        const finalAngle = this.applySpread(angle);
        this.createProjectile(x, y, finalAngle, isPlayerProjectile, 'bullets');
    }
}