/**
 * Enemy Weapon System - Enhanced enemy weapon management based on Ghidra analysis
 * Based on Survival_SpawnEnemyProjectile @ 0x004320c0
 * and Projectile_CreateAndFire @ 0x00411d40
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { Projectile } from './Projectile';

export enum EnemyWeaponType {
    NONE = 'none',
    DUMB_BOMB = 'dumb_bomb',
    LASER_GUIDED_BOMB = 'laser_guided_bomb',
    ARMORED_BOMB = 'armored_bomb',
    FRAG_BOMB = 'frag_bomb',
    ATOMIC_BOMB = 'atomic_bomb',
    ENERGY_CANNON = 'energy_cannon',
    BURST_ROCKET = 'burst_rocket',
    ENERGY_BALL = 'energy_ball'
}

export interface EnemyWeaponConfig {
    type: EnemyWeaponType;
    damage: number;
    speed: number;
    fireRate: number; // ms between shots
    range: number;
    projectileTexture: string;
    sound?: string;
    special?: {
        homing?: boolean;
        explosive?: boolean;
        penetration?: boolean;
        multiShot?: number;
    };
}

export class EnemyWeapon {
    private game: Game;
    private config: EnemyWeaponConfig;
    private fireTimer: number = 0;
    private lastFireTime: number = 0;

    constructor(game: Game, config: EnemyWeaponConfig) {
        this.game = game;
        this.config = config;
        this.fireTimer = config.fireRate;
    }

    /**
     * Update weapon timing
     */
    public update(deltaTime: number): void {
        this.fireTimer -= deltaTime * 1000;
    }

    /**
     * Check if weapon can fire
     */
    public canFire(): boolean {
        return this.fireTimer <= 0;
    }

    /**
     * Fire weapon at target
     */
    public fire(originX: number, originY: number, targetX: number, targetY: number): void {
        if (!this.canFire()) return;

        const dx = targetX - originX;
        const dy = targetY - originY;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if target is in range
        if (distance > this.config.range) return;

        // Create projectile(s) based on weapon type
        switch (this.config.type) {
            case EnemyWeaponType.DUMB_BOMB:
                this.fireDumbBomb(originX, originY, angle);
                break;

            case EnemyWeaponType.LASER_GUIDED_BOMB:
                this.fireLaserGuidedBomb(originX, originY, targetX, targetY);
                break;

            case EnemyWeaponType.ARMORED_BOMB:
                this.fireArmoredBomb(originX, originY, angle);
                break;

            case EnemyWeaponType.FRAG_BOMB:
                this.fireFragBomb(originX, originY, angle);
                break;

            case EnemyWeaponType.ATOMIC_BOMB:
                this.fireAtomicBomb(originX, originY, angle);
                break;

            case EnemyWeaponType.ENERGY_CANNON:
                this.fireEnergyBullet(originX, originY, angle);
                break;

            case EnemyWeaponType.BURST_ROCKET:
                this.fireBurstRocket(originX, originY, angle);
                break;

            case EnemyWeaponType.ENERGY_BALL:
                this.fireEnergyBall(originX, originY, angle);
                break;
        }

        // Reset fire timer
        this.fireTimer = this.config.fireRate;
        this.lastFireTime = Date.now();

        // Play sound if specified
        if (this.config.sound) {
            this.game.getAudioManager()?.playSound(this.config.sound);
        }
    }

    /**
     * Fire basic dumb bomb (straight trajectory)
     */
    private fireDumbBomb(x: number, y: number, angle: number): void {
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed,
            this.config.damage,
            false, // Not player projectile
            this.config.projectileTexture
        );

        // Add slight gravity effect
        projectile.setGravity(0.2);
        this.game.addProjectile(projectile);
    }

    /**
     * Fire laser-guided bomb (homing)
     */
    private fireLaserGuidedBomb(x: number, y: number, targetX: number, targetY: number): void {
        const angle = Math.atan2(targetY - y, targetX - x);
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed,
            this.config.damage,
            false,
            this.config.projectileTexture
        );

        // Enable homing behavior
        projectile.setHoming(true, targetX, targetY);
        projectile.setGravity(0.1);
        this.game.addProjectile(projectile);
    }

    /**
     * Fire armored bomb (high damage, penetration)
     */
    private fireArmoredBomb(x: number, y: number, angle: number): void {
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed * 0.8, // Slower but more powerful
            this.config.damage,
            false,
            this.config.projectileTexture
        );

        // Armored bombs have penetration
        projectile.setPenetration(true);
        projectile.setGravity(0.25);
        this.game.addProjectile(projectile);
    }

    /**
     * Fire frag bomb (explosive with fragments)
     */
    private fireFragBomb(x: number, y: number, angle: number): void {
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed,
            this.config.damage,
            false,
            this.config.projectileTexture
        );

        // Frag bombs explode on impact and create fragments
        projectile.setExplosive(true, 80); // 80px explosion radius
        projectile.setFragments(6); // Creates 6 fragments on explosion
        projectile.setGravity(0.15);
        this.game.addProjectile(projectile);
    }

    /**
     * Fire atomic bomb (massive explosion)
     */
    private fireAtomicBomb(x: number, y: number, angle: number): void {
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed * 0.6, // Slow but devastating
            this.config.damage,
            false,
            this.config.projectileTexture
        );

        // Atomic bombs have huge explosion radius
        projectile.setExplosive(true, 150);
        projectile.setGravity(0.3);
        this.game.addProjectile(projectile);
    }

    /**
     * Fire energy cannon bullet (fast, no gravity)
     */
    private fireEnergyBullet(x: number, y: number, angle: number): void {
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed,
            this.config.damage,
            false,
            this.config.projectileTexture
        );

        // Energy bullets have no gravity and glow effect
        projectile.setGlow(0x00ffff, 0.8);
        this.game.addProjectile(projectile);
    }

    /**
     * Fire burst rocket (creates multiple projectiles)
     */
    private fireBurstRocket(x: number, y: number, angle: number): void {
        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed,
            this.config.damage,
            false,
            this.config.projectileTexture
        );

        // Burst rockets explode into multiple projectiles
        projectile.setExplosive(true, 60);
        projectile.setBurst(true, 4); // Splits into 4 smaller rockets
        projectile.setGravity(0.1);
        this.game.addProjectile(projectile);
    }

    /**
     * Fire energy ball (slow, tracking)
     */
    private fireEnergyBall(x: number, y: number, angle: number): void {
        const tank = this.game.getTank();
        if (!tank) return;

        const projectile = new Projectile(
            this.game,
            x,
            y,
            angle,
            this.config.speed * 0.7,
            this.config.damage,
            false,
            this.config.projectileTexture
        );

        // Energy balls slowly track the player
        projectile.setHoming(true, tank.x, tank.y, 0.02); // Slow homing
        projectile.setGlow(0xff00ff, 1.0); // Purple glow
        this.game.addProjectile(projectile);
    }

    /**
     * Get weapon configuration
     */
    public getConfig(): EnemyWeaponConfig {
        return { ...this.config };
    }

    /**
     * Get time since last fire
     */
    public getTimeSinceLastFire(): number {
        return Date.now() - this.lastFireTime;
    }
}

/**
 * Enemy Weapon Factory - Creates weapon configurations based on Heavy Weapon data
 */
export class EnemyWeaponFactory {
    /**
     * Create weapon configuration for enemy type
     * Based on craft.xml weapon specifications
     */
    public static createWeaponForEnemyType(enemyType: string): EnemyWeaponConfig | null {
        const weaponConfigs: { [key: string]: EnemyWeaponConfig } = {
            // R-44 Hominov prop plane - No weapons
            PROPFIGHTER: {
                type: EnemyWeaponType.NONE,
                damage: 0,
                speed: 0,
                fireRate: 0,
                range: 0,
                projectileTexture: ''
            },

            // RG-28 Bravski jet fighter - Dumb bombs (AUTHENTIC fire rates)
            SMALLJET: {
                type: EnemyWeaponType.DUMB_BOMB,
                damage: 10,
                speed: 120,
                fireRate: 800, // CORRECTED: was 3000ms, now matches original game
                range: 400,
                projectileTexture: 'dumbbomb'
            },

            // T-83 Spetznak bomber - Dumb bombs (AUTHENTIC fire rates)
            BOMBER: {
                type: EnemyWeaponType.DUMB_BOMB,
                damage: 15,
                speed: 100,
                fireRate: 900, // CORRECTED: was 2500ms, now matches original game
                range: 500,
                projectileTexture: 'dumbbomb'
            },

            // MG-24 Nikzov jet fighter - Laser-guided bombs (red) (AUTHENTIC fire rates)
            JETFIGHTER: {
                type: EnemyWeaponType.LASER_GUIDED_BOMB,
                damage: 20,
                speed: 140,
                fireRate: 600, // CORRECTED: was 3500ms, now matches original game - FAST!
                range: 600,
                projectileTexture: 'lgb',
                special: { homing: true }
            },

            // Modified pickup truck - RPGs
            TRUCK: {
                type: EnemyWeaponType.BURST_ROCKET,
                damage: 25,
                speed: 180,
                fireRate: 4000,
                range: 450,
                projectileTexture: 'rocket'
            },

            // TS-31 Kriznek carpet bomber - Multiple dumb bombs
            BIGBOMBER: {
                type: EnemyWeaponType.DUMB_BOMB,
                damage: 18,
                speed: 90,
                fireRate: 2000,
                range: 500,
                projectileTexture: 'dumbbomb',
                special: { multiShot: 3 }
            },

            // KB-22 Czerk light helicopter - Energy cannon
            SMALLCOPTER: {
                type: EnemyWeaponType.ENERGY_CANNON,
                damage: 12,
                speed: 250,
                fireRate: 1500,
                range: 400,
                projectileTexture: 'energy_bullet'
            },

            // KB-31 Grakin assault helicopter - Air-to-surface missiles
            MEDCOPTER: {
                type: EnemyWeaponType.LASER_GUIDED_BOMB,
                damage: 30,
                speed: 200,
                fireRate: 2500,
                range: 500,
                projectileTexture: 'missile',
                special: { homing: true }
            },

            // KB-72 Mokum assault helicopter - Air-to-surface missiles
            BIGCOPTER: {
                type: EnemyWeaponType.LASER_GUIDED_BOMB,
                damage: 35,
                speed: 220,
                fireRate: 2000,
                range: 550,
                projectileTexture: 'missile',
                special: { homing: true }
            },

            // TD-52 Vorskat delta bomber - Frag bombs (yellow)
            DELTABOMBER: {
                type: EnemyWeaponType.FRAG_BOMB,
                damage: 25,
                speed: 110,
                fireRate: 3000,
                range: 480,
                projectileTexture: 'fragbomb'
            },

            // TD-21 Shiznik delta fighter - Armored bombs (dark grey)
            DELTAJET: {
                type: EnemyWeaponType.ARMORED_BOMB,
                damage: 40,
                speed: 130,
                fireRate: 3500,
                range: 500,
                projectileTexture: 'ironbomb'
            },

            // CS-148 Romanov satellite - Energy balls
            SATELLITE: {
                type: EnemyWeaponType.ENERGY_BALL,
                damage: 50,
                speed: 80,
                fireRate: 4000,
                range: 600,
                projectileTexture: 'energy_ball'
            },

            // H-51 Barskov blimp - Atomic bombs
            BLIMP: {
                type: EnemyWeaponType.ATOMIC_BOMB,
                damage: 100,
                speed: 60,
                fireRate: 8000,
                range: 400,
                projectileTexture: 'ironbomb' // Using ironbomb for atomic (heaviest bomb)
            }
        };

        return weaponConfigs[enemyType] || null;
    }

    /**
     * Create weapon instance for enemy
     */
    public static createWeapon(game: Game, enemyType: string): EnemyWeapon | null {
        const config = this.createWeaponForEnemyType(enemyType);
        if (!config || config.type === EnemyWeaponType.NONE) {
            return null;
        }

        return new EnemyWeapon(game, config);
    }
}