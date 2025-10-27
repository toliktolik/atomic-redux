/**
 * Weapon Factory - Creates and manages weapon instances
 */

import { Game } from '../core/Game';
import { Weapon, WeaponType } from './Weapon';
import { StandardGun } from './StandardGun';
import { HomingMissiles } from './HomingMissiles';
import { LaserCannon } from './LaserCannon';
import { Rockets } from './Rockets';
import { FlakCannon } from './FlakCannon';
import { Thunderstrike } from './Thunderstrike';

export class WeaponFactory {
    /**
     * Create a weapon by type
     */
    public static createWeapon(game: Game, type: WeaponType): Weapon {
        switch (type) {
            case WeaponType.STANDARD_GUN:
                return new StandardGun(game);

            case WeaponType.HOMING_MISSILES:
                return new HomingMissiles(game);

            case WeaponType.LASER_CANNON:
                return new LaserCannon(game);

            case WeaponType.ROCKETS:
                return new Rockets(game);

            case WeaponType.FLAK_CANNON:
                return new FlakCannon(game);

            case WeaponType.THUNDERSTRIKE:
                return new Thunderstrike(game);

            default:
                console.warn(`Unknown weapon type: ${type}, defaulting to StandardGun`);
                return new StandardGun(game);
        }
    }

    /**
     * Get next weapon type in progression
     */
    public static getNextWeaponType(currentType: WeaponType): WeaponType {
        const progression = [
            WeaponType.STANDARD_GUN,
            WeaponType.HOMING_MISSILES,
            WeaponType.LASER_CANNON,
            WeaponType.ROCKETS,
            WeaponType.FLAK_CANNON,
            WeaponType.THUNDERSTRIKE
        ];

        const currentIndex = progression.indexOf(currentType);
        const nextIndex = (currentIndex + 1) % progression.length;

        return progression[nextIndex];
    }

    /**
     * Get random weapon type (excluding standard gun)
     */
    public static getRandomWeaponType(): WeaponType {
        const weapons = [
            WeaponType.HOMING_MISSILES,
            WeaponType.LASER_CANNON,
            WeaponType.ROCKETS,
            WeaponType.FLAK_CANNON,
            WeaponType.THUNDERSTRIKE
        ];

        const randomIndex = Math.floor(Math.random() * weapons.length);
        return weapons[randomIndex];
    }
}