/**
 * Base Weapon Class
 */

import { Game } from '../core/Game';
import { Projectile } from '../entities/Projectile';

export enum WeaponType {
    STANDARD_GUN = 'STANDARD_GUN',
    DEFENSE_ORB = 'DEFENSE_ORB',
    HOMING_MISSILES = 'HOMING_MISSILES',
    LASER_CANNON = 'LASER_CANNON',
    ROCKETS = 'ROCKETS',
    FLAK_CANNON = 'FLAK_CANNON',
    THUNDERSTRIKE = 'THUNDERSTRIKE'
}

export abstract class Weapon {
    protected game: Game;
    protected type: WeaponType;
    protected damage: number;
    protected fireRate: number; // ms between shots
    protected projectileSpeed: number;
    protected ammo: number;
    protected maxAmmo: number;
    protected spread: number; // degrees
    protected upgradeLevel: number = 0; // Individual weapon upgrade level (0-3)
    protected lastFireTime: number = 0; // Track individual weapon fire timing

    constructor(game: Game, type: WeaponType) {
        this.game = game;
        this.type = type;
        this.damage = 10;
        this.fireRate = 200;
        this.projectileSpeed = 800;
        this.ammo = Infinity;
        this.maxAmmo = Infinity;
        this.spread = 0;
    }

    /**
     * Fire the weapon
     */
    public abstract fire(x: number, y: number, angle: number, isPlayerProjectile: boolean): void;

    /**
     * Get current ammo
     */
    public getAmmo(): number {
        return this.ammo;
    }

    /**
     * Get max ammo
     */
    public getMaxAmmo(): number {
        return this.maxAmmo;
    }

    /**
     * Refill ammo
     */
    public refillAmmo(): void {
        this.ammo = this.maxAmmo;
    }

    /**
     * Get fire rate
     */
    public getFireRate(): number {
        return this.fireRate;
    }

    /**
     * Get weapon type
     */
    public getType(): WeaponType {
        return this.type;
    }

    /**
     * Get current upgrade level (0-3)
     */
    public getUpgradeLevel(): number {
        return this.upgradeLevel;
    }

    /**
     * Check if weapon can fire (individual timing)
     */
    public canFire(): boolean {
        const currentTime = Date.now();
        return (currentTime - this.lastFireTime) >= this.fireRate;
    }

    /**
     * Upgrade weapon to next level (0-3)
     * Returns true if upgrade successful, false if already at max
     */
    public upgrade(): boolean {
        if (this.upgradeLevel >= 3) {
            return false;
        }
        this.upgradeLevel++;
        this.onUpgrade(); // Allow subclasses to handle upgrade effects
        return true;
    }

    /**
     * Override in subclasses to handle upgrade effects
     */
    protected onUpgrade(): void {
        // Base implementation - can be overridden
    }

    /**
     * Create a projectile
     */
    protected createProjectile(
        x: number,
        y: number,
        angle: number,
        isPlayerProjectile: boolean,
        textureName: string = 'bullets'
    ): Projectile {
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.projectileSpeed,
            this.damage,
            isPlayerProjectile,
            textureName
        );

        this.game.addProjectile(projectile);
        return projectile;
    }

    /**
     * Apply spread to angle
     */
    protected applySpread(angle: number): number {
        if (this.spread === 0) return angle;

        const spreadRadians = (this.spread * Math.PI) / 180;
        const randomSpread = (Math.random() - 0.5) * spreadRadians;
        return angle + randomSpread;
    }
}