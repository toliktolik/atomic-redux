/**
 * PowerUp Entity - Collectible items dropped by helicopter
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { Tank } from './Tank';
import { GameConstants } from '../config/GameConstants';
import { AudioManager } from '../systems/AudioManager';
import { AssetLoader } from '../core/AssetLoader';
import { WeaponType } from '../weapons/Weapon';

export enum PowerUpType {
    WEAPON_UPGRADE = 'WEAPON_UPGRADE',
    SHIELD = 'SHIELD',
    NUKE = 'NUKE',
    MEGA_LASER = 'MEGA_LASER',
    SPEED_BOOST = 'SPEED_BOOST',
    RAPID_FIRE = 'RAPID_FIRE',
    SPREAD_SHOT = 'SPREAD_SHOT',
    HEALTH = 'HEALTH'
}

export class PowerUp extends PIXI.Container {
    private game: Game;

    // Properties
    public type: PowerUpType;
    public isDestroyed: boolean = false;

    // Components
    private sprite: PIXI.Sprite;
    private glow: PIXI.Graphics;
    private parachute?: PIXI.Graphics;

    // Movement
    private velocity: PIXI.Point;
    private fallSpeed: number = 50;
    private swayAmount: number = 30;
    private swaySpeed: number = 2;
    private time: number = 0;
    private baseX: number;
    private landed: boolean = false;

    // Effects
    private glowPulse: number = 0;
    private bounceOffset: number = 0;

    // Lifetime
    private lifeTime: number = 0;
    private maxLifeTime: number = 30000; // 30 seconds on ground

    constructor(game: Game, type: PowerUpType, x: number, y: number) {
        super();
        this.game = game;
        this.type = type;

        // Position
        this.x = x;
        this.y = y;
        this.baseX = x;

        // Velocity for falling
        this.velocity = new PIXI.Point(0, this.fallSpeed);

        // Create parachute for falling
        this.createParachute();

        // Create glow effect
        this.glow = new PIXI.Graphics();
        this.addChild(this.glow);

        // Create sprite
        const textureName = this.getTextureName(type);
        this.sprite = new PIXI.Sprite(AssetLoader.getTexture(textureName));
        this.sprite.anchor.set(0.5);
        this.addChild(this.sprite);

        // Add text label
        this.addLabel();
    }

    /**
     * Create parachute visual
     */
    private createParachute(): void {
        this.parachute = new PIXI.Graphics();

        // Parachute canopy
        this.parachute.beginFill(0xffffff, 0.8);
        this.parachute.moveTo(-20, -40);
        this.parachute.quadraticCurveTo(0, -50, 20, -40);
        this.parachute.lineTo(20, -30);
        this.parachute.quadraticCurveTo(0, -35, -20, -30);
        this.parachute.closePath();
        this.parachute.endFill();

        // Parachute strings
        this.parachute.lineStyle(1, 0x666666);
        this.parachute.moveTo(-15, -30);
        this.parachute.lineTo(-5, 0);
        this.parachute.moveTo(15, -30);
        this.parachute.lineTo(5, 0);
        this.parachute.moveTo(0, -35);
        this.parachute.lineTo(0, 0);

        this.addChild(this.parachute);
    }

    /**
     * Add text label for power-up type
     */
    private addLabel(): void {
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 10,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 2
        });

        const labelText = this.getLabelText();
        const label = new PIXI.Text(labelText, style);
        label.anchor.set(0.5);
        label.y = 20;
        this.addChild(label);
    }

    /**
     * Update power-up each frame
     */
    public update(deltaTime: number): void {
        if (this.isDestroyed) return;

        this.time += deltaTime;

        if (!this.landed) {
            // Fall with parachute
            this.y += this.velocity.y * deltaTime;

            // Sway back and forth
            this.x = this.baseX + Math.sin(this.time * this.swaySpeed) * this.swayAmount;

            // Check if landed
            if (this.y >= GameConstants.GROUND_Y - 30) {
                this.land();
            }
        } else {
            // Update lifetime on ground
            this.lifeTime += deltaTime * 1000;

            // Flash when about to expire
            if (this.lifeTime > this.maxLifeTime * 0.8) {
                const flash = Math.sin(this.time * 10) > 0;
                this.alpha = flash ? 0.5 : 1;
            }

            // Destroy when expired
            if (this.lifeTime >= this.maxLifeTime) {
                this.destroy();
            }

            // Bounce animation
            this.bounceOffset = Math.sin(this.time * 3) * 5;
            this.sprite.y = this.bounceOffset;
        }

        // Update glow effect
        this.updateGlow();
    }

    /**
     * Land on ground
     */
    private land(): void {
        this.landed = true;
        this.y = GameConstants.GROUND_Y - 30;

        // Remove parachute
        if (this.parachute) {
            this.removeChild(this.parachute);
            this.parachute.destroy();
            this.parachute = undefined;
        }

        // Play landing sound
        AudioManager.play('powerup_land');
    }

    /**
     * Update glow effect
     */
    private updateGlow(): void {
        this.glowPulse += 0.05;

        const glowSize = 25 + Math.sin(this.glowPulse) * 5;
        const glowAlpha = 0.3 + Math.sin(this.glowPulse) * 0.1;

        this.glow.clear();
        this.glow.beginFill(this.getGlowColor(), glowAlpha);
        this.glow.drawCircle(0, 0, glowSize);
        this.glow.endFill();
    }

    /**
     * Collect power-up - FIXED to properly separate temporary powerups from permanent upgrades
     */
    public collect(tank: Tank): void {
        if (this.isDestroyed) return;

        // Apply power-up effect
        switch (this.type) {
            case PowerUpType.WEAPON_UPGRADE:
                // TEMPORARY Gun Power Up (enhances existing weapon, doesn't add new weapons)
                this.applyGunPowerUp(tank);
                break;

            case PowerUpType.SHIELD:
                // TEMPORARY bullet deflection shield (NOT health boost!)
                tank.activateShieldDeflection(10000); // 10 seconds of bullet deflection
                break;

            case PowerUpType.NUKE:
                // INSTANT effect - destroy all enemies and projectiles
                this.triggerNuke();
                break;

            case PowerUpType.MEGA_LASER:
                // TEMPORARY mega laser effect
                tank.activateMegaLaser(5000); // 5 seconds
                break;

            case PowerUpType.SPEED_BOOST:
                // TEMPORARY speed increase
                tank.activateSpeedBoost(8000); // 8 seconds
                break;

            case PowerUpType.RAPID_FIRE:
                // TEMPORARY fire rate increase
                tank.activateRapidFire(10000); // 10 seconds
                break;

            case PowerUpType.SPREAD_SHOT:
                // TEMPORARY spread shot pattern
                tank.activateSpreadShot(10000); // 10 seconds
                break;

            case PowerUpType.HEALTH:
                // INSTANT health restoration
                tank.heal(50);
                break;
        }

        // Play collection sound
        AudioManager.play('powerup');

        // Award points
        this.game.getScoreManager().addScore(500);

        // Destroy power-up
        this.destroy();
    }

    /**
     * Apply Gun Power Up - TEMPORARY weapon enhancement (not permanent weapon addition)
     * Based on Ghidra: PowerUp_ProcessGunPowerUp - enhances existing gun temporarily
     */
    private applyGunPowerUp(tank: Tank): void {
        // Apply temporary gun enhancement - more damage, faster fire rate, better bullets
        // This is a survival mode powerup - it enhances existing weapon, doesn't add new ones!
        tank.activateGunPowerUp(15000); // 15 seconds of enhanced gun performance

        console.log('🔫 TEMPORARY GUN POWER UP APPLIED - Enhanced weapon performance for 15s');
    }

    /**
     * Trigger nuke effect (FIXED VERSION)
     */
    private triggerNuke(): void {
        console.log('🚀 NUKE FIXED: Starting nuke sequence');

        // Destroy all enemies on screen
        const enemies = this.game.getEnemies();
        console.log(`🚀 NUKE: Destroying ${enemies.length} enemies`);
        for (const enemy of enemies) {
            if (!enemy.isDestroyed) {
                enemy.takeDamage(99999);
            }
        }

        // Destroy all enemy projectiles on screen - FIXED to use direct property access
        console.log('🚀 NUKE: Accessing projectiles array directly');
        try {
            const projectiles = this.game.projectiles; // Direct property access instead of method call
            console.log(`🚀 NUKE: Found ${projectiles.length} projectiles`);
            for (let i = projectiles.length - 1; i >= 0; i--) {
                const projectile = projectiles[i];
                if (projectile && projectile.isEnemyProjectile && !projectile.isDestroyed) {
                    console.log(`🚀 NUKE: Destroying enemy projectile at index ${i}`);
                    projectile.destroy();
                    projectiles.splice(i, 1);
                }
            }
        } catch (error) {
            console.error('🚀 NUKE ERROR:', error);
        }

        // Destroy interactive background elements (nuke="yes" in anims.xml)
        const backgroundElements = this.game.getBackgroundSystem().getInteractiveElements();
        console.log(`🚀 NUKE: Destroying ${backgroundElements.length} background elements`);
        for (const element of backgroundElements) {
            if (!element.destroyed) {
                element.takeDamage(99999, true); // Force destroy with massive damage, isNukeAttack=true
            }
        }

        // Create screen flash effect
        this.game.getParticleSystem().createNukeFlash();

        // Play nuke sound
        AudioManager.play('nuke');
    }

    /**
     * Get texture name for power-up type
     */
    private getTextureName(type: PowerUpType): string {
        switch (type) {
            case PowerUpType.WEAPON_UPGRADE: return 'powerup_weapon';
            case PowerUpType.SHIELD: return 'powerup_shield';
            case PowerUpType.NUKE: return 'powerup_nuke';
            case PowerUpType.MEGA_LASER: return 'powerup_weapon';
            case PowerUpType.SPEED_BOOST: return 'powerup_speed';
            case PowerUpType.RAPID_FIRE: return 'powerup_rapid';
            case PowerUpType.SPREAD_SHOT: return 'powerup_spread';
            case PowerUpType.HEALTH: return 'powerup_health';
            default: return 'powerup_weapon';
        }
    }

    /**
     * Get glow color for power-up type
     */
    private getGlowColor(): number {
        switch (this.type) {
            case PowerUpType.WEAPON_UPGRADE: return 0x00ff00;
            case PowerUpType.SHIELD: return 0x00ffff;
            case PowerUpType.NUKE: return 0xff0000;
            case PowerUpType.MEGA_LASER: return 0xff00ff;
            case PowerUpType.SPEED_BOOST: return 0xffff00;
            case PowerUpType.RAPID_FIRE: return 0xff8800;
            case PowerUpType.SPREAD_SHOT: return 0x8800ff;
            case PowerUpType.HEALTH: return 0xff00ff;
            default: return 0xffffff;
        }
    }

    /**
     * Get label text for power-up
     */
    private getLabelText(): string {
        switch (this.type) {
            case PowerUpType.WEAPON_UPGRADE: return 'WEAPON';
            case PowerUpType.SHIELD: return 'SHIELD';
            case PowerUpType.NUKE: return 'NUKE';
            case PowerUpType.MEGA_LASER: return 'MEGA';
            case PowerUpType.SPEED_BOOST: return 'SPEED';
            case PowerUpType.RAPID_FIRE: return 'RAPID';
            case PowerUpType.SPREAD_SHOT: return 'SPREAD';
            case PowerUpType.HEALTH: return 'HEALTH';
            default: return '';
        }
    }

    /**
     * Get bounds for collision detection
     */
    public getBounds(): PIXI.Rectangle {
        const width = 40;
        const height = 40;
        return new PIXI.Rectangle(
            this.x - width / 2,
            this.y - height / 2,
            width,
            height
        );
    }

    /**
     * Destroy power-up
     */
    public destroy(): void {
        this.isDestroyed = true;
        super.destroy();
    }
}