/**
 * ShieldSystem - Implements bullet deflection shield (not health boost)
 * Based on Ghidra analysis of Craft_ProcessDeflector and shield mechanics
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { Tank } from '../entities/Tank';
import { Projectile } from '../entities/Projectile';
import { AudioManager } from './AudioManager';

export class ShieldSystem {
    private game: Game;
    private tank: Tank;
    private isActive: boolean = false;
    private remainingTime: number = 0;
    private maxTime: number = 0;

    // Shield visual effect
    private shieldGraphics: PIXI.Graphics;
    private deflectionRadius: number = 60; // Radius around tank that deflects bullets

    // Shield impact effects
    private impactParticles: PIXI.Graphics[] = [];

    constructor(game: Game, tank: Tank) {
        this.game = game;
        this.tank = tank;

        // Create shield visual
        this.shieldGraphics = new PIXI.Graphics();
        tank.addChild(this.shieldGraphics);
        this.shieldGraphics.visible = false;
    }

    /**
     * Activate shield for specified duration
     * Based on Ghidra: PowerUp_ProcessShield
     */
    public activate(duration: number): void {
        this.isActive = true;
        this.remainingTime = duration;
        this.maxTime = duration;
        this.shieldGraphics.visible = true;

        AudioManager.play('shield_activate');
        console.log(`🛡️ SHIELD ACTIVATED: ${duration}ms of bullet deflection`);
    }

    /**
     * Update shield system
     */
    public update(deltaTime: number): void {
        if (!this.isActive) {
            return;
        }

        // Update timer
        this.remainingTime -= deltaTime * 1000;

        if (this.remainingTime <= 0) {
            this.deactivate();
            return;
        }

        // Update shield visual
        this.updateShieldVisual();

        // Check for bullet deflections
        this.checkBulletDeflections();

        // Update impact particles
        this.updateImpactParticles(deltaTime);
    }

    /**
     * Update shield visual effect
     */
    private updateShieldVisual(): void {
        this.shieldGraphics.clear();

        const time = Date.now() * 0.01;
        const pulseIntensity = 0.3 + Math.sin(time * 0.5) * 0.2;

        // Warning effect when shield is about to expire
        let alpha = pulseIntensity;
        if (this.remainingTime < 2000) {
            alpha *= Math.sin(time * 2) > 0 ? 1 : 0.3; // Flash when expiring
        }

        // Draw shield bubble
        this.shieldGraphics.lineStyle(3, 0x00ffff, alpha);
        this.shieldGraphics.beginFill(0x00ffff, alpha * 0.1);
        this.shieldGraphics.drawCircle(0, 0, this.deflectionRadius);
        this.shieldGraphics.endFill();

        // Draw shield energy lines
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 0.1;
            const x1 = Math.cos(angle) * (this.deflectionRadius - 10);
            const y1 = Math.sin(angle) * (this.deflectionRadius - 10);
            const x2 = Math.cos(angle) * this.deflectionRadius;
            const y2 = Math.sin(angle) * this.deflectionRadius;

            this.shieldGraphics.lineStyle(2, 0x00ffff, alpha * 0.8);
            this.shieldGraphics.moveTo(x1, y1);
            this.shieldGraphics.lineTo(x2, y2);
        }
    }

    /**
     * Check for bullet collisions with shield and deflect them
     * Based on Ghidra: Craft_ProcessDeflector logic
     */
    private checkBulletDeflections(): void {
        const projectiles = this.game.projectiles; // Direct access to projectiles array

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];

            // Only deflect enemy projectiles
            if (!projectile.isEnemyProjectile || projectile.isDestroyed) {
                continue;
            }

            // Check distance from tank center
            const dx = projectile.x - this.tank.x;
            const dy = projectile.y - this.tank.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.deflectionRadius) {
                // Deflect the bullet!
                this.deflectProjectile(projectile, dx, dy, distance);
                this.createImpactEffect(projectile.x, projectile.y);

                // Play deflection sound with pitch variation
                AudioManager.playShieldDeflect();

                console.log(`🛡️ BULLET DEFLECTED: Distance ${distance.toFixed(1)}`);
            }
        }
    }

    /**
     * Deflect a projectile away from tank
     * Based on original Heavy Weapon deflection physics
     */
    private deflectProjectile(projectile: Projectile, dx: number, dy: number, distance: number): void {
        // Normalize the vector from tank to projectile
        const nx = dx / distance;
        const ny = dy / distance;

        // Reflect projectile velocity around the normal
        const currentVelX = Math.cos(projectile.angle || 0) * projectile.speed;
        const currentVelY = Math.sin(projectile.angle || 0) * projectile.speed;

        // Reflection formula: v' = v - 2(v·n)n
        const dot = currentVelX * nx + currentVelY * ny;
        const newVelX = currentVelX - 2 * dot * nx;
        const newVelY = currentVelY - 2 * dot * ny;

        // Update projectile direction
        projectile.angle = Math.atan2(newVelY, newVelX);

        // Add some random deflection for more dynamic effect
        projectile.angle += (Math.random() - 0.5) * 0.5;

        // Mark as player projectile now (can damage enemies)
        (projectile as any).isPlayerProjectile = true;

        // Move projectile outside shield radius to prevent multiple deflections
        const pushDistance = this.deflectionRadius + 5;
        projectile.x = this.tank.x + nx * pushDistance;
        projectile.y = this.tank.y + ny * pushDistance;
    }

    /**
     * Create visual impact effect when bullet hits shield
     */
    private createImpactEffect(x: number, y: number): void {
        const impact = new PIXI.Graphics();
        impact.x = x;
        impact.y = y;
        impact.beginFill(0xffffff, 0.8);
        impact.drawCircle(0, 0, 8);
        impact.endFill();

        this.tank.parent.addChild(impact);
        this.impactParticles.push(impact);
    }

    /**
     * Update impact particle effects
     */
    private updateImpactParticles(deltaTime: number): void {
        for (let i = this.impactParticles.length - 1; i >= 0; i--) {
            const particle = this.impactParticles[i];

            // Fade out and shrink
            particle.alpha -= deltaTime * 5;
            particle.scale.set(particle.scale.x * (1 - deltaTime * 3));

            if (particle.alpha <= 0) {
                particle.destroy();
                this.impactParticles.splice(i, 1);
            }
        }
    }

    /**
     * Deactivate shield
     */
    private deactivate(): void {
        this.isActive = false;
        this.shieldGraphics.visible = false;

        // Clean up impact particles
        this.impactParticles.forEach(particle => particle.destroy());
        this.impactParticles = [];

        AudioManager.play('shield_deactivate');
        console.log('🛡️ SHIELD DEACTIVATED');
    }

    /**
     * Force deactivate (when tank is destroyed)
     */
    public forceDeactivate(): void {
        if (this.isActive) {
            this.deactivate();
        }
    }

    /**
     * Check if shield is currently active
     */
    public isShieldActive(): boolean {
        return this.isActive;
    }

    /**
     * Get remaining shield time in milliseconds
     */
    public getTimeRemaining(): number {
        return this.isActive ? this.remainingTime : 0;
    }

    /**
     * Get shield strength (0.0 - 1.0)
     */
    public getShieldStrength(): number {
        if (!this.isActive) return 0;
        return this.remainingTime / this.maxTime;
    }

    /**
     * Clean up shield system
     */
    public destroy(): void {
        this.forceDeactivate();
        if (this.shieldGraphics) {
            this.shieldGraphics.destroy();
        }
    }
}