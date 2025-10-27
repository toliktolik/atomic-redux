/**
 * Collision System - Handles collision detection between all game entities
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { Tank } from '../entities/Tank';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { PowerUp } from '../entities/PowerUp';
import { InteractiveBackgroundElement } from './BackgroundLayerSystem';

export class CollisionSystem {
    private game: Game;
    private backgroundElements: InteractiveBackgroundElement[] = [];

    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Register background element for collision detection
     */
    public addBackgroundElement(element: InteractiveBackgroundElement): void {
        this.backgroundElements.push(element);
    }

    /**
     * Remove background element from collision detection
     */
    public removeBackgroundElement(element: InteractiveBackgroundElement): void {
        const index = this.backgroundElements.indexOf(element);
        if (index > -1) {
            this.backgroundElements.splice(index, 1);
        }
    }

    /**
     * Check all collisions each frame
     */
    public update(
        tank: Tank,
        enemies: Enemy[],
        projectiles: Projectile[],
        powerUps: PowerUp[]
    ): void {
        // Check projectile-enemy collisions
        this.checkProjectileEnemyCollisions(projectiles, enemies);

        // Check projectile-tank collisions
        this.checkProjectileTankCollisions(projectiles, tank);

        // Check projectile-projectile collisions (player bullets vs enemy bullets)
        this.checkProjectileProjectileCollisions(projectiles);

        // Check enemy-tank collisions
        this.checkEnemyTankCollisions(enemies, tank);

        // Check tank-powerup collisions
        this.checkTankPowerUpCollisions(tank, powerUps);

        // Check splash damage
        this.checkSplashDamage(projectiles, enemies, tank);

        // NOTE: Projectiles should NOT collide with background elements from anims.xml
        // Only nuclear bombs (power-ups) can destroy background elements
        // this.checkProjectileBackgroundCollisions(projectiles); // REMOVED
    }

    /**
     * Check collisions between projectiles and enemies
     */
    private checkProjectileEnemyCollisions(projectiles: Projectile[], enemies: Enemy[]): void {
        for (const projectile of projectiles) {
            // Skip if projectile is null, destroyed, or not a player projectile
            if (!projectile || projectile.isDestroyed || !projectile.isPlayerProjectile) continue;

            // Skip if projectile position is invalid
            if (projectile.x === undefined || projectile.y === undefined) continue;

            for (const enemy of enemies) {
                if (!enemy || enemy.isDestroyed) continue;

                // Skip if enemy position is invalid
                if (enemy.x === undefined || enemy.y === undefined) continue;

                if (this.checkRectCollision(projectile.getBounds(), enemy.getBounds())) {
                    // Check if enemy can deflect bullets (DEFLECTOR type with active shield)
                    if ((enemy as any).canDeflectBullets && (enemy as any).canDeflectBullets()) {
                        // Deflect the bullet back at the tank
                        const tank = this.game.getTank();
                        if (tank) {
                            (enemy as any).deflectBullet(projectile, tank);
                        }

                        // Destroy the original projectile
                        projectile.onCollision();

                        // Break since projectile is deflected
                        if (!projectile.getIsPiercing()) {
                            break;
                        }
                    } else {
                        // Normal collision - apply damage to enemy
                        enemy.takeDamage(projectile.damage);

                        // Handle projectile collision
                        projectile.onCollision();

                        // If enemy was destroyed, notify systems
                        if (enemy.isDestroyed) {
                            this.game.getWaveSystem().onEnemyDefeated();
                        }

                        // Break if projectile is not piercing
                        if (!projectile.getIsPiercing()) {
                            break;
                        }
                    }
                }
            }
        }
    }

    /**
     * Check collisions between enemy projectiles and tank
     */
    private checkProjectileTankCollisions(projectiles: Projectile[], tank: Tank): void {
        // Check if tank is valid before processing
        if (!tank || tank.isDestroyed || tank.x === undefined || tank.y === undefined) return;

        for (const projectile of projectiles) {
            // Skip if projectile is null or destroyed or player's own projectiles
            if (!projectile || projectile.isDestroyed || projectile.isPlayerProjectile) continue;

            // Skip if projectile position is invalid
            if (projectile.x === undefined || projectile.y === undefined) continue;

            if (this.checkRectCollision(projectile.getBounds(), tank.getBounds())) {
                // Apply damage to tank if not shielded
                if (!tank.hasShield()) {
                    tank.takeDamage(projectile.damage);
                } else {
                    // Shield absorbs damage
                }

                // Handle projectile collision
                projectile.onCollision();
            }
        }
    }

    /**
     * Check collisions between player and enemy projectiles
     */
    private checkProjectileProjectileCollisions(projectiles: Projectile[]): void {
        for (let i = 0; i < projectiles.length; i++) {
            const playerProjectile = projectiles[i];

            // Skip if not a valid player projectile
            if (!playerProjectile || playerProjectile.isDestroyed || !playerProjectile.isPlayerProjectile) continue;
            if (playerProjectile.x === undefined || playerProjectile.y === undefined) continue;

            for (let j = 0; j < projectiles.length; j++) {
                if (i === j) continue; // Don't check projectile against itself

                const enemyProjectile = projectiles[j];

                // Skip if not a valid enemy projectile
                if (!enemyProjectile || enemyProjectile.isDestroyed || !enemyProjectile.isEnemyProjectile) continue;
                if (enemyProjectile.x === undefined || enemyProjectile.y === undefined) continue;

                // Check collision between player and enemy projectiles
                if (this.checkRectCollision(playerProjectile.getBounds(), enemyProjectile.getBounds())) {
                    // Player bullet intercepted enemy projectile

                    // Capture positions before destroying projectiles
                    const explosionX = (playerProjectile.x + enemyProjectile.x) / 2;
                    const explosionY = (playerProjectile.y + enemyProjectile.y) / 2;

                    // Both projectiles are destroyed on impact
                    playerProjectile.onCollision();
                    enemyProjectile.onCollision();

                    // Tiny spark effect at collision point (subtle visual feedback)
                    this.game.getParticleSystem().createExplosion(explosionX, explosionY, 3, 0xcccccc);

                    break; // Player projectile is destroyed, no need to check more enemy projectiles
                }
            }
        }
    }

    /**
     * Check collisions between enemies and tank
     */
    private checkEnemyTankCollisions(enemies: Enemy[], tank: Tank): void {
        // Check if tank is valid before processing any enemies
        if (!tank || tank.isDestroyed || tank.x === undefined || tank.y === undefined) return;

        for (const enemy of enemies) {
            if (!enemy || enemy.isDestroyed) continue;
            if (enemy.x === undefined || enemy.y === undefined) continue;

            if (this.checkRectCollision(enemy.getBounds(), tank.getBounds())) {
                // Collision damage to both
                const collisionDamage = 50;

                if (!tank.hasShield()) {
                    tank.takeDamage(collisionDamage);
                }

                enemy.takeDamage(collisionDamage * 2);

                // If enemy was destroyed, notify systems
                if (enemy.isDestroyed) {
                    this.game.getWaveSystem().onEnemyDefeated();
                }
            }
        }
    }

    /**
     * Check collisions between tank and power-ups
     */
    private checkTankPowerUpCollisions(tank: Tank, powerUps: PowerUp[]): void {
        // Check if tank is valid before processing
        if (!tank || tank.isDestroyed || tank.x === undefined || tank.y === undefined) return;

        for (const powerUp of powerUps) {
            if (powerUp.isDestroyed) continue;

            if (this.checkRectCollision(tank.getBounds(), powerUp.getBounds())) {
                // Apply power-up effect
                powerUp.collect(tank);
            }
        }
    }

    /**
     * Check splash damage from explosive projectiles
     */
    private checkSplashDamage(projectiles: Projectile[], enemies: Enemy[], tank: Tank): void {
        for (const projectile of projectiles) {
            if (projectile.isDestroyed) continue;

            const splashRadius = projectile.getSplashRadius();
            if (splashRadius <= 0) continue;

            // Check if projectile should explode (hitting ground or destroyed)
            if (projectile.y >= GameConstants.GROUND_Y || projectile.isDestroyed) {
                const explosionX = projectile.x;
                const explosionY = projectile.y;

                // Damage enemies in splash radius
                for (const enemy of enemies) {
                    if (enemy.isDestroyed) continue;

                    const distance = this.getDistance(
                        explosionX, explosionY,
                        enemy.x, enemy.y
                    );

                    if (distance <= splashRadius) {
                        // Damage falls off with distance
                        const damageFactor = 1 - (distance / splashRadius);
                        const splashDamage = projectile.damage * damageFactor;
                        enemy.takeDamage(splashDamage);

                        if (enemy.isDestroyed) {
                            this.game.getWaveSystem().onEnemyDefeated();
                        }
                    }
                }

                // Check tank splash damage (only from enemy projectiles)
                if (!projectile.isPlayerProjectile && tank && !tank.isDestroyed) {
                    const tankDistance = this.getDistance(
                        explosionX, explosionY,
                        tank.x, tank.y
                    );

                    if (tankDistance <= splashRadius && !tank.hasShield()) {
                        const damageFactor = 1 - (tankDistance / splashRadius);
                        const splashDamage = projectile.damage * damageFactor * 0.5; // Reduced for tank
                        tank.takeDamage(splashDamage);
                    }
                }
            }
        }
    }

    /**
     * Check rectangle collision
     */
    private checkRectCollision(rect1: PIXI.Rectangle, rect2: PIXI.Rectangle): boolean {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    /**
     * Check circle collision
     */
    private checkCircleCollision(
        x1: number, y1: number, r1: number,
        x2: number, y2: number, r2: number
    ): boolean {
        const distance = this.getDistance(x1, y1, x2, y2);
        return distance < r1 + r2;
    }

    /**
     * Get distance between two points
     */
    private getDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * Check if point is in rectangle
     */
    private pointInRect(x: number, y: number, rect: PIXI.Rectangle): boolean {
        return x >= rect.x &&
               x <= rect.x + rect.width &&
               y >= rect.y &&
               y <= rect.y + rect.height;
    }

    /**
     * Check collisions between projectiles and interactive background elements
     * Based on original Heavy Weapon destructible poster/tower system
     */
    private checkProjectileBackgroundCollisions(projectiles: Projectile[]): void {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];

            // Skip if projectile is null, destroyed, or has invalid position
            if (!projectile || projectile.isDestroyed ||
                projectile.x === undefined || projectile.y === undefined) continue;

            // Skip enemy projectiles (only player projectiles can damage background)
            if (!projectile.isPlayerProjectile) continue;

            for (let j = this.backgroundElements.length - 1; j >= 0; j--) {
                const element = this.backgroundElements[j];

                if (element.checkCollision(projectile)) {
                    const destroyed = element.takeDamage(projectile.damage);

                    // Remove projectile after hitting background element
                    projectile.destroy();
                    projectiles.splice(i, 1);

                    // Remove destroyed elements from collision array
                    if (destroyed) {
                        this.removeBackgroundElement(element);
                        console.log('Background element destroyed by player projectile');
                    }

                    break; // Projectile can only hit one element
                }
            }
        }
    }
}