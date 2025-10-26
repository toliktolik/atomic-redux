/**
 * Camera Effects System - Screen shake and camera impact effects
 * Based on authentic Heavy Weapon feedback systems
 */

import * as PIXI from 'pixi.js';

export enum ShakeIntensity {
    TINY = 2,
    LIGHT = 5,
    MEDIUM = 10,
    HEAVY = 20,
    EXTREME = 35
}

export class CameraEffects {
    private app: PIXI.Application;
    private gameContainer: PIXI.Container;

    // Shake state
    private isShaking: boolean = false;
    private shakeIntensity: number = 0;
    private shakeDuration: number = 0;
    private shakeFrame: number = 0;
    private shakeTickerFunction?: () => void;

    // Original camera position
    private originalX: number = 0;
    private originalY: number = 0;

    // Multiple shake support
    private shakeQueue: Array<{intensity: number, duration: number}> = [];

    constructor(app: PIXI.Application, gameContainer: PIXI.Container) {
        this.app = app;
        this.gameContainer = gameContainer;
        this.originalX = gameContainer.x;
        this.originalY = gameContainer.y;
    }

    /**
     * Trigger screen shake with specified intensity and duration
     */
    public shake(intensity: ShakeIntensity | number, duration: number = 30): void {
        // Queue shake if one is already in progress
        if (this.isShaking) {
            this.shakeQueue.push({intensity, duration});
            return;
        }

        this.startShake(intensity, duration);
    }

    /**
     * Start shake effect
     */
    private startShake(intensity: number, duration: number): void {
        this.isShaking = true;
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeFrame = 0;

        // Remove previous ticker if exists
        if (this.shakeTickerFunction) {
            this.app.ticker.remove(this.shakeTickerFunction);
        }

        this.shakeTickerFunction = () => this.updateShake();
        this.app.ticker.add(this.shakeTickerFunction);
    }

    /**
     * Update shake effect each frame
     */
    private updateShake(): void {
        this.shakeFrame++;

        if (this.shakeFrame < this.shakeDuration) {
            // Exponential decay for authentic Heavy Weapon feel
            const decay = Math.pow(1 - (this.shakeFrame / this.shakeDuration), 2);
            const currentIntensity = this.shakeIntensity * decay;

            // Apply shake offset
            this.gameContainer.x = this.originalX + (Math.random() - 0.5) * currentIntensity;
            this.gameContainer.y = this.originalY + (Math.random() - 0.5) * currentIntensity;
        } else {
            this.endShake();
        }
    }

    /**
     * End current shake and process queue
     */
    private endShake(): void {
        // Reset position
        this.gameContainer.x = this.originalX;
        this.gameContainer.y = this.originalY;

        // Remove ticker
        if (this.shakeTickerFunction) {
            this.app.ticker.remove(this.shakeTickerFunction);
            this.shakeTickerFunction = undefined;
        }

        this.isShaking = false;

        // Process next shake in queue
        if (this.shakeQueue.length > 0) {
            const nextShake = this.shakeQueue.shift()!;
            this.startShake(nextShake.intensity, nextShake.duration);
        }
    }

    /**
     * Trigger tank firing shake (subtle)
     */
    public tankFired(): void {
        this.shake(ShakeIntensity.TINY, 8);
    }

    /**
     * Trigger enemy explosion shake
     */
    public enemyDestroyed(isLargeEnemy: boolean = false): void {
        if (isLargeEnemy) {
            this.shake(ShakeIntensity.MEDIUM, 20);
        } else {
            this.shake(ShakeIntensity.LIGHT, 12);
        }
    }

    /**
     * Trigger player projectile impact
     */
    public projectileImpact(explosionRadius: number = 0): void {
        if (explosionRadius > 100) {
            this.shake(ShakeIntensity.HEAVY, 25); // Nuclear/atomic explosion
        } else if (explosionRadius > 50) {
            this.shake(ShakeIntensity.MEDIUM, 18); // Large explosion
        } else if (explosionRadius > 0) {
            this.shake(ShakeIntensity.LIGHT, 10); // Small explosion
        } else {
            this.shake(ShakeIntensity.TINY, 5); // Bullet hit
        }
    }

    /**
     * Trigger enemy bomb impact near player
     */
    public enemyBombImpact(distance: number): void {
        // Shake intensity based on proximity
        if (distance < 50) {
            this.shake(ShakeIntensity.HEAVY, 30);
        } else if (distance < 100) {
            this.shake(ShakeIntensity.MEDIUM, 20);
        } else if (distance < 150) {
            this.shake(ShakeIntensity.LIGHT, 15);
        }
    }

    /**
     * Trigger tank damage shake
     */
    public tankDamaged(damageAmount: number): void {
        const intensity = Math.min(damageAmount / 2, ShakeIntensity.MEDIUM);
        this.shake(intensity, 15);
    }

    /**
     * Trigger game over shake (intense)
     */
    public gameOver(): void {
        this.shake(ShakeIntensity.EXTREME, 60);
    }

    /**
     * Trigger power-up collection (positive feedback)
     */
    public powerUpCollected(): void {
        this.shake(ShakeIntensity.LIGHT, 8);
    }

    /**
     * Stop all shake effects immediately
     */
    public stopShake(): void {
        if (this.shakeTickerFunction) {
            this.app.ticker.remove(this.shakeTickerFunction);
            this.shakeTickerFunction = undefined;
        }

        this.gameContainer.x = this.originalX;
        this.gameContainer.y = this.originalY;
        this.isShaking = false;
        this.shakeQueue = [];
    }

    /**
     * Update original position if game container is moved
     */
    public updateOrigin(x: number, y: number): void {
        this.originalX = x;
        this.originalY = y;
    }
}