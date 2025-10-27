/**
 * Mega Laser Effect - Full-screen laser beam power-up
 * Creates spectacular visual effect across the entire screen
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { AudioManager } from '../systems/AudioManager';

export class MegaLaser extends PIXI.Container {
    private game: Game;
    private duration: number = 3000; // 3 seconds
    private timer: number = 0;
    private isActive: boolean = false;
    private chargeTime: number = 1000; // 1 second charge time
    private chargeTimer: number = 0;
    private isCharging: boolean = false;

    // Visual components
    private laserBeams: PIXI.Graphics[] = [];
    private chargeEffect: PIXI.Graphics;
    private backgroundFlash: PIXI.Graphics;
    private sparkles: PIXI.Graphics[] = [];

    // Animation properties
    private beamIntensity: number = 0;
    private chargeIntensity: number = 0;
    private damageTimer: number = 0;
    private damageInterval: number = 100; // 10 DPS

    constructor(game: Game) {
        super();
        this.game = game;
        this.createVisualEffects();
    }

    /**
     * Create all visual effect components
     */
    private createVisualEffects(): void {
        // Background flash effect
        this.backgroundFlash = new PIXI.Graphics();
        this.backgroundFlash.beginFill(0xffffff, 0);
        this.backgroundFlash.drawRect(0, 0, GameConstants.SCREEN_WIDTH, GameConstants.SCREEN_HEIGHT);
        this.backgroundFlash.endFill();
        this.addChild(this.backgroundFlash);

        // Charge effect (growing circle)
        this.chargeEffect = new PIXI.Graphics();
        this.addChild(this.chargeEffect);

        // Create 5 laser beams across the screen
        for (let i = 0; i < 5; i++) {
            const beam = new PIXI.Graphics();
            this.laserBeams.push(beam);
            this.addChild(beam);
        }

        // Create sparkle effects
        for (let i = 0; i < 20; i++) {
            const sparkle = new PIXI.Graphics();
            this.sparkles.push(sparkle);
            this.addChild(sparkle);
        }

        // Initially invisible
        this.visible = false;
    }

    /**
     * Activate the mega laser
     */
    public activate(): void {
        if (this.isActive || this.isCharging) return;

        console.log('MEGA LASER activated - charging...');
        this.isCharging = true;
        this.chargeTimer = 0;
        this.timer = 0;
        this.visible = true;

        // Play charge sound
        AudioManager.play('mega_laser');

        // Add to effects layer
        this.game.layers.getLayer('effects').addChild(this);
    }

    /**
     * Update mega laser effect
     */
    public update(deltaTime: number): void {
        if (!this.isCharging && !this.isActive) return;

        const deltaMs = deltaTime * 1000;

        if (this.isCharging) {
            // Charge phase
            this.chargeTimer += deltaMs;
            this.chargeIntensity = Math.min(this.chargeTimer / this.chargeTime, 1);

            this.updateChargeEffect();

            if (this.chargeTimer >= this.chargeTime) {
                // Charging complete, activate laser
                this.isCharging = false;
                this.isActive = true;
                this.timer = 0;
                this.chargeEffect.visible = false;
                console.log('MEGA LASER fired!');
            }
        } else if (this.isActive) {
            // Active phase
            this.timer += deltaMs;
            this.damageTimer += deltaMs;

            // Calculate beam intensity (pulse effect)
            const progress = this.timer / this.duration;
            const pulse = Math.sin(this.timer * 0.02) * 0.3 + 0.7;
            this.beamIntensity = (1 - progress * 0.3) * pulse;

            this.updateLaserBeams();
            this.updateBackgroundFlash();
            this.updateSparkles();

            // Deal damage to enemies
            if (this.damageTimer >= this.damageInterval) {
                this.dealDamageToEnemies();
                this.damageTimer = 0;
            }

            // Check if duration is over
            if (this.timer >= this.duration) {
                this.deactivate();
            }
        }
    }

    /**
     * Update charging visual effect
     */
    private updateChargeEffect(): void {
        this.chargeEffect.clear();

        // Tank position (where charge starts)
        const tank = this.game.getTank();
        if (!tank) return;

        const centerX = tank.x;
        const centerY = tank.y;

        // Growing charge circle
        const radius = this.chargeIntensity * 100;
        const alpha = 0.8 * this.chargeIntensity;

        // Outer ring (cyan)
        this.chargeEffect.beginFill(0x00ffff, alpha * 0.3);
        this.chargeEffect.drawCircle(centerX, centerY, radius);
        this.chargeEffect.endFill();

        // Inner ring (white)
        this.chargeEffect.beginFill(0xffffff, alpha * 0.6);
        this.chargeEffect.drawCircle(centerX, centerY, radius * 0.7);
        this.chargeEffect.endFill();

        // Warning lines (show where beams will fire)
        if (this.chargeIntensity > 0.5) {
            this.chargeEffect.lineStyle(2, 0xff0000, alpha);
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2; // Start from top
                const endX = centerX + Math.cos(angle) * GameConstants.SCREEN_WIDTH;
                const endY = centerY + Math.sin(angle) * GameConstants.SCREEN_HEIGHT;
                this.chargeEffect.moveTo(centerX, centerY);
                this.chargeEffect.lineTo(endX, endY);
            }
        }
    }

    /**
     * Update laser beam effects
     */
    private updateLaserBeams(): void {
        const tank = this.game.getTank();
        if (!tank) return;

        const centerX = tank.x;
        const centerY = tank.y;

        this.laserBeams.forEach((beam, index) => {
            beam.clear();

            // Calculate beam direction (5 beams in different directions)
            const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2; // Start from top
            const beamLength = GameConstants.SCREEN_WIDTH * 2; // Ensure it goes off-screen

            // Calculate end position
            const endX = centerX + Math.cos(angle) * beamLength;
            const endY = centerY + Math.sin(angle) * beamLength;

            // Outer beam (red/orange)
            const outerWidth = 25 * this.beamIntensity;
            const outerAlpha = 0.8 * this.beamIntensity;
            beam.lineStyle(outerWidth, 0xff4400, outerAlpha);
            beam.moveTo(centerX, centerY);
            beam.lineTo(endX, endY);

            // Inner beam (bright white/cyan)
            const innerWidth = 12 * this.beamIntensity;
            const innerAlpha = 1.0 * this.beamIntensity;
            beam.lineStyle(innerWidth, 0x00ffff, innerAlpha);
            beam.moveTo(centerX, centerY);
            beam.lineTo(endX, endY);

            // Core beam (pure white)
            const coreWidth = 4 * this.beamIntensity;
            beam.lineStyle(coreWidth, 0xffffff, innerAlpha);
            beam.moveTo(centerX, centerY);
            beam.lineTo(endX, endY);
        });
    }

    /**
     * Update background flash effect
     */
    private updateBackgroundFlash(): void {
        const flashAlpha = this.beamIntensity * 0.1;
        this.backgroundFlash.clear();
        this.backgroundFlash.beginFill(0x00ffff, flashAlpha);
        this.backgroundFlash.drawRect(0, 0, GameConstants.SCREEN_WIDTH, GameConstants.SCREEN_HEIGHT);
        this.backgroundFlash.endFill();
    }

    /**
     * Update sparkle effects
     */
    private updateSparkles(): void {
        const tank = this.game.getTank();
        if (!tank) return;

        this.sparkles.forEach((sparkle, index) => {
            sparkle.clear();

            // Random position around the tank
            const distance = 50 + Math.random() * 100;
            const angle = (Date.now() * 0.001 + index * 0.3) % (Math.PI * 2);
            const x = tank.x + Math.cos(angle) * distance;
            const y = tank.y + Math.sin(angle) * distance;

            // Random sparkle size and color
            const size = 3 + Math.random() * 5;
            const intensity = Math.random() * this.beamIntensity;
            const colors = [0xffffff, 0x00ffff, 0xff4400];
            const color = colors[Math.floor(Math.random() * colors.length)];

            sparkle.beginFill(color, intensity);
            sparkle.drawCircle(x, y, size);
            sparkle.endFill();
        });
    }

    /**
     * Deal damage to all enemies on screen
     */
    private dealDamageToEnemies(): void {
        const enemies = this.game.getEnemies();
        enemies.forEach(enemy => {
            if (!enemy.isDestroyed) {
                enemy.takeDamage(50); // 50 damage per 0.1 seconds = 500 DPS
            }
        });
    }

    /**
     * Deactivate mega laser
     */
    private deactivate(): void {
        console.log('MEGA LASER deactivated');
        this.isActive = false;
        this.isCharging = false;
        this.visible = false;

        // Clean up visual effects
        this.laserBeams.forEach(beam => beam.clear());
        this.chargeEffect.clear();
        this.backgroundFlash.clear();
        this.sparkles.forEach(sparkle => sparkle.clear());

        // Remove from parent
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }

    /**
     * Check if mega laser is currently active
     */
    public isLaserActive(): boolean {
        return this.isActive || this.isCharging;
    }

    /**
     * Force deactivate (for cleanup)
     */
    public forceDeactivate(): void {
        this.deactivate();
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        this.laserBeams.forEach(beam => beam?.destroy());
        this.chargeEffect?.destroy();
        this.backgroundFlash?.destroy();
        this.sparkles.forEach(sparkle => sparkle?.destroy());
        super.destroy();
    }
}