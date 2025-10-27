/**
 * Projectile Entity - Enhanced projectile system based on Ghidra analysis
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { AssetLoader } from '../core/AssetLoader';
import { DirectionalSprite } from '../core/DirectionalSprite';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { AnimationConfig } from '../config/AnimationConfig';

export enum ProjectileType {
    BULLET = 'BULLET',
    MISSILE = 'MISSILE',
    LASER = 'LASER',
    ROCKET = 'ROCKET',
    FLAK = 'FLAK',
    THUNDER = 'THUNDER',
    BOMB = 'BOMB',
    ENERGY_BALL = 'ENERGY_BALL'
}

export class Projectile extends PIXI.Container {
    private game: Game;

    // AUTHENTIC HEAVY WEAPON: Physics constants from Ghidra @ Projectile_CreateWithVelocity
    private static readonly AUTHENTIC_GRAVITY_DOWN = 0.2620; // _DAT_0052c620
    private static readonly AUTHENTIC_GRAVITY_UP = 0.2560;   // _DAT_0052c560
    private static readonly AUTHENTIC_SPEED_MULTIPLIER = 1.0; // _DAT_0052c5c0
    private static readonly AUTHENTIC_ROTATION_LIMIT = 6.28318; // _DAT_0052c568 (2π)
    private static readonly AUTHENTIC_FRAME_DELTA = 0.016667; // 60 FPS timing

    // Properties
    public damage: number;
    public speed: number;
    public angle: number;
    public isPlayerProjectile: boolean;
    public isDestroyed: boolean = false;
    public type: ProjectileType;

    // Movement
    private velocity: PIXI.Point;
    private lifeTime: number = 0;
    private maxLifeTime: number = 5000; // 5 seconds max

    // Homing properties
    private isHoming: boolean = false;
    private homingTarget?: PIXI.Container;
    private homingStrength: number = 0.05;
    private homingTargetX?: number;
    private homingTargetY?: number;

    // Visual
    private sprite: PIXI.Sprite | AnimatedSprite | DirectionalSprite;
    private trail?: PIXI.Graphics;
    private trailPositions: PIXI.Point[] = [];

    // Special properties (enhanced system)
    private isPiercing: boolean = false;
    private splashRadius: number = 0;
    private hasGravity: boolean = false;
    private gravity: number = 0;
    private isExplosive: boolean = false;
    private explosionRadius: number = 0;
    private hasPenetration: boolean = false;
    private fragmentCount: number = 0;
    private isBurst: boolean = false;
    private burstProjectiles: number = 0;
    private glowColor?: number;
    private glowIntensity?: number;

    constructor(
        game: Game,
        x: number,
        y: number,
        angle: number,
        speed: number,
        damage: number,
        isPlayerProjectile: boolean,
        textureName: string = 'bullet'
    ) {
        super();
        this.game = game;

        // Position
        this.x = x;
        this.y = y;

        // Properties
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.isPlayerProjectile = isPlayerProjectile;

        // Determine type from texture
        this.type = this.getTypeFromTexture(textureName);

        // Set special properties based on type
        this.setSpecialProperties();

        // AUTHENTIC velocity calculation from Ghidra @ Projectile_CreateWithVelocity
        // Original formula: pdVar3[2] = (double)-(fVar6 * fVar5); pdVar3[3] = (double)(fVar6 * fVar5);
        const authenticSpeed = speed * Projectile.AUTHENTIC_SPEED_MULTIPLIER;
        this.velocity = new PIXI.Point(
            -Math.cos(angle) * authenticSpeed, // AUTHENTIC: Negative X velocity from Ghidra
            Math.sin(angle) * authenticSpeed   // AUTHENTIC: Positive Y velocity from Ghidra
        );

        // Create sprite based on projectile type and animation config
        this.createProjectileSprite(textureName, angle);

        // Create trail for certain projectiles
        if (this.shouldHaveTrail()) {
            this.createTrail();
        }

        // Add glow effect for energy weapons
        if (this.type === ProjectileType.LASER || this.type === ProjectileType.ENERGY_BALL) {
            this.addGlowEffect();
        }
    }

    /**
     * Update projectile each frame (single comprehensive method)
     */
    public update(deltaTime: number, enemies?: any[]): void {
        if (this.isDestroyed) return;

        // Update lifetime
        this.lifeTime += deltaTime * 1000;
        if (this.lifeTime >= this.maxLifeTime) {
            this.destroy();
            return;
        }

        // AUTHENTIC gravity application from Ghidra @ Projectile_UpdateMovementAndCollision
        // Original: *(double *)(param_1 + 0x18) = dVar2; where dVar2 includes gravity
        if (this.hasGravity) {
            // Use authentic frame delta timing for consistent physics
            const frameNormalizedDelta = deltaTime / Projectile.AUTHENTIC_FRAME_DELTA;
            this.velocity.y += this.gravity * frameNormalizedDelta;
        }

        // Update homing behavior with authentic timing
        if (this.isHoming) {
            if (this.homingTarget && enemies) {
                this.updateHoming(deltaTime, enemies);
            } else if (this.homingTargetX !== undefined && this.homingTargetY !== undefined) {
                this.updateHomingWithCoords(deltaTime);
            }
        }

        // AUTHENTIC position update - matches Ghidra velocity application
        // Original formula from CreateWithVelocity: position += velocity * deltaTime
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;

        // Update animated sprite if needed
        if (this.sprite instanceof AnimatedSprite) {
            this.sprite.update(deltaTime);
        }

        // Update sprite rotation based on velocity
        if (this.sprite && !this.isHoming) {
            this.sprite.rotation = Math.atan2(this.velocity.y, this.velocity.x);
        }

        // Update animated sprite if applicable
        if (this.sprite instanceof AnimatedSprite) {
            this.sprite.update(deltaTime);
        }

        // Update trail
        if (this.trail) {
            this.updateTrail();
        }

        // Check if off screen and destroy
        if (this.isOffScreen()) {
            this.destroy();
        }
    }

    /**
     * Handle collision (single comprehensive method)
     */
    public onCollision(): void {
        if (this.isDestroyed) return;

        // Handle explosion first
        if (this.isExplosive) {
            this.handleExplosion();
        }

        // Create splash damage if has splash radius
        if (this.splashRadius > 0 && !this.isExplosive) {
            this.createSplashDamage();
        }

        // Destroy if not piercing/penetrating
        if (!this.isPiercing && !this.hasPenetration) {
            this.destroy();
        }
    }

    /**
     * Set gravity for projectile using AUTHENTIC Heavy Weapon constants
     * From Ghidra @ Projectile_CreateWithVelocity: _DAT_0052c620 and _DAT_0052c560
     */
    public setGravity(gravity: number): void {
        this.hasGravity = gravity > 0;

        // Use authentic gravity constants if default values provided
        if (gravity === 0.15) {
            // Convert common fallback to authentic downward gravity
            this.gravity = Projectile.AUTHENTIC_GRAVITY_DOWN;
        } else if (gravity === 0.1) {
            // Convert light gravity to authentic upward/neutral
            this.gravity = Projectile.AUTHENTIC_GRAVITY_UP;
        } else {
            // Use provided value but scale with authentic multiplier
            this.gravity = gravity * Projectile.AUTHENTIC_SPEED_MULTIPLIER;
        }
    }

    /**
     * Set homing behavior
     */
    public setHoming(enabled: boolean, targetX?: number, targetY?: number, strength?: number): void {
        this.isHoming = enabled;
        if (targetX !== undefined) this.homingTargetX = targetX;
        if (targetY !== undefined) this.homingTargetY = targetY;
        if (strength !== undefined) this.homingStrength = strength;
    }

    /**
     * Set explosive behavior
     */
    public setExplosive(explosive: boolean, radius: number = 50): void {
        this.isExplosive = explosive;
        this.explosionRadius = radius;
        this.splashRadius = radius; // For compatibility
    }

    /**
     * Set penetration behavior
     */
    public setPenetration(penetrating: boolean): void {
        this.hasPenetration = penetrating;
        this.isPiercing = penetrating; // For compatibility
    }

    /**
     * Set fragment behavior
     */
    public setFragments(count: number): void {
        this.fragmentCount = count;
    }

    /**
     * Set burst behavior
     */
    public setBurst(burst: boolean, projectileCount: number = 4): void {
        this.isBurst = burst;
        this.burstProjectiles = projectileCount;
    }

    /**
     * Set glow effect
     */
    public setGlow(color: number, intensity: number = 0.8): void {
        this.glowColor = color;
        this.glowIntensity = intensity;
        this.addGlowEffect();
    }

    private getTypeFromTexture(textureName: string): ProjectileType {
        if (textureName.includes('missile')) return ProjectileType.MISSILE;
        if (textureName.includes('laser')) return ProjectileType.LASER;
        if (textureName.includes('rocket')) return ProjectileType.ROCKET;
        if (textureName.includes('flak')) return ProjectileType.FLAK;
        if (textureName.includes('thunder')) return ProjectileType.THUNDER;
        if (textureName.includes('bomb')) return ProjectileType.BOMB;
        if (textureName.includes('energy')) return ProjectileType.ENERGY_BALL;
        return ProjectileType.BULLET;
    }

    private setSpecialProperties(): void {
        switch (this.type) {
            case ProjectileType.MISSILE:
                this.isHoming = true;
                this.splashRadius = 30;
                break;
            case ProjectileType.ROCKET:
                this.splashRadius = 50;
                break;
            case ProjectileType.FLAK:
                this.splashRadius = 40;
                this.hasGravity = true;
                break;
            case ProjectileType.LASER:
                this.isPiercing = true;
                break;
            case ProjectileType.ENERGY_BALL:
                this.isHoming = true;
                this.homingStrength = 0.02; // Slow homing
                break;
        }
    }

    private createProjectileSprite(textureName: string, angle: number): void {
        // For bullets, missiles, and rockets, always use DirectionalSprite for proper multi-row grid handling
        if (this.type === ProjectileType.BULLET ||
            this.type === ProjectileType.MISSILE ||
            this.type === ProjectileType.ROCKET) {
            const texture = AssetLoader.getTexture(textureName);

            if (texture && texture.baseTexture) {
                this.sprite = new DirectionalSprite(texture.baseTexture, 21, 5); // 21 angles x 5 rows per Heavy Weapon
            } else {
                this.sprite = new PIXI.Sprite(texture);
            }
        }
        // For bomb projectiles, try animated sprites first
        else if (AnimationConfig[textureName]) {
            const config = AnimationConfig[textureName];
            const texture = AssetLoader.getTexture(textureName);
            if (texture && texture.baseTexture) {
                this.sprite = new AnimatedSprite(texture.baseTexture, config.frameCount, config.frameRate, config.loop);
            } else {
                console.error(`❌ Failed to create AnimatedSprite - no baseTexture for ${textureName}`);
                this.sprite = new PIXI.Sprite(texture);
            }
        } else {
            // Default to static sprite
            const texture = AssetLoader.getTexture(textureName);
            this.sprite = new PIXI.Sprite(texture);

            // Check if texture is missing
            if (!texture) {
                console.error(`❌ Missing texture for ${textureName}! This will appear as purple line.`);
            }
        }

        this.sprite.anchor.set(0.5);

        // For DirectionalSprite, set angle instead of rotation
        if (this.sprite instanceof DirectionalSprite) {
            this.sprite.setAngleAndRow(angle, 0); // Use first row (basic bullets)
        } else {
            this.sprite.rotation = angle;
        }

        this.addChild(this.sprite);
    }

    private shouldHaveTrail(): boolean {
        return this.type === ProjectileType.MISSILE ||
               this.type === ProjectileType.ROCKET ||
               this.type === ProjectileType.ENERGY_BALL;
    }

    private createTrail(): void {
        this.trail = new PIXI.Graphics();
        this.addChild(this.trail);
    }

    private addGlowEffect(): void {
        if (this.glowColor && this.glowIntensity) {
            const filter = new PIXI.GlowFilter({
                color: this.glowColor,
                outerStrength: this.glowIntensity,
                innerStrength: 0.5,
                distance: 15
            });
            this.sprite.filters = [filter];
        }
    }

    private updateHoming(deltaTime: number, enemies: any[]): void {
        if (!this.homingTarget && enemies.length > 0) {
            // Find closest enemy
            let closestDistance = Infinity;
            for (const enemy of enemies) {
                const distance = this.getDistance(this.x, this.y, enemy.x, enemy.y);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    this.homingTarget = enemy;
                }
            }
        }

        if (this.homingTarget && !this.homingTarget.isDestroyed) {
            const dx = this.homingTarget.x - this.x;
            const dy = this.homingTarget.y - this.y;
            const targetAngle = Math.atan2(dy, dx);

            // Gradually adjust angle towards target
            const angleDiff = targetAngle - this.angle;
            const adjustedAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

            this.angle += adjustedAngleDiff * this.homingStrength;

            // Update velocity based on new angle
            this.velocity.x = Math.cos(this.angle) * this.speed;
            this.velocity.y = Math.sin(this.angle) * this.speed;

            // Update sprite rotation
            this.sprite.rotation = this.angle;
        }
    }

    private updateHomingWithCoords(deltaTime: number): void {
        if (!this.isHoming || (this.homingTargetX === undefined || this.homingTargetY === undefined)) return;

        const dx = this.homingTargetX - this.x;
        const dy = this.homingTargetY - this.y;
        const targetAngle = Math.atan2(dy, dx);

        // Gradually adjust angle towards target
        const angleDiff = targetAngle - this.angle;
        const adjustedAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));

        this.angle += adjustedAngleDiff * this.homingStrength;

        // Update velocity based on new angle
        this.velocity.x = Math.cos(this.angle) * this.speed;
        this.velocity.y = Math.sin(this.angle) * this.speed;

        // Update sprite rotation
        if (this.sprite) {
            this.sprite.rotation = this.angle;
        }
    }

    private updateTrail(): void {
        if (!this.trail) return;

        // Add current position to trail
        this.trailPositions.push(new PIXI.Point(this.x, this.y));

        // Limit trail length
        if (this.trailPositions.length > 10) {
            this.trailPositions.shift();
        }

        // Redraw trail
        this.trail.clear();
        if (this.trailPositions.length > 1) {
            this.trail.lineStyle(3, 0xffffff, 0.8);
            this.trail.moveTo(this.trailPositions[0].x - this.x, this.trailPositions[0].y - this.y);
            for (let i = 1; i < this.trailPositions.length; i++) {
                this.trail.lineTo(this.trailPositions[i].x - this.x, this.trailPositions[i].y - this.y);
            }
        }
    }

    private handleExplosion(): void {
        if (!this.isExplosive) return;

        // Create explosion effect (toned down for enemy projectiles)
        const explosionSize = this.isPlayerProjectile ?
            (this.explosionRadius > 100 ? 'large' : this.explosionRadius > 50 ? 'medium' : 'small') :
            'tiny'; // Enemy projectiles always use tiny explosions (3x smaller than small)
        this.game.getParticleSystem().createExplosion(
            this.x,
            this.y,
            explosionSize
        );

        // Create fragments if specified
        if (this.fragmentCount > 0) {
            this.createFragments();
        }

        // Create burst projectiles if specified
        if (this.isBurst && this.burstProjectiles > 0) {
            this.createBurstProjectiles();
        }
    }

    private createFragments(): void {
        const angleStep = (Math.PI * 2) / this.fragmentCount;
        for (let i = 0; i < this.fragmentCount; i++) {
            const angle = angleStep * i;
            const fragmentSpeed = this.speed * 0.6;
            const fragmentDamage = Math.ceil(this.damage * 0.3);

            const fragment = new Projectile(
                this.game,
                this.x,
                this.y,
                angle,
                fragmentSpeed,
                fragmentDamage,
                this.isPlayerProjectile,
                'fragment'
            );

            fragment.setGravity(0.3);
            this.game.addProjectile(fragment);
        }
    }

    private createBurstProjectiles(): void {
        const angleStep = (Math.PI * 2) / this.burstProjectiles;
        for (let i = 0; i < this.burstProjectiles; i++) {
            const angle = angleStep * i;
            const burstSpeed = this.speed * 0.8;
            const burstDamage = Math.ceil(this.damage * 0.5);

            const burstProjectile = new Projectile(
                this.game,
                this.x,
                this.y,
                angle,
                burstSpeed,
                burstDamage,
                this.isPlayerProjectile,
                'burst_rocket'
            );

            this.game.addProjectile(burstProjectile);
        }
    }

    private createSplashDamage(): void {
        // Create smaller splash explosions for enemy projectiles
        const splashSize = this.isPlayerProjectile ?
            (this.splashRadius > 50 ? 'medium' : 'small') :
            'tiny'; // Enemy splash always tiny (3x smaller than small)
        this.game.getParticleSystem().createExplosion(
            this.x,
            this.y,
            splashSize
        );
    }

    private isOffScreen(): boolean {
        const margin = 100;
        return this.x < -margin ||
               this.x > GameConstants.SCREEN_WIDTH + margin ||
               this.y < -margin ||
               this.y > GameConstants.SCREEN_HEIGHT + margin;
    }

    private getDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    public getBounds(): PIXI.Rectangle {
        let width = 10;
        let height = 10;

        if (this.sprite) {
            width = this.sprite.width || width;
            height = this.sprite.height || height;

            if (width < 2 || width > 100) width = 10;
            if (height < 2 || height > 100) height = 10;
        }

        return new PIXI.Rectangle(
            this.x - width / 2,
            this.y - height / 2,
            width,
            height
        );
    }

    public getSplashRadius(): number {
        return this.splashRadius;
    }

    public getIsPiercing(): boolean {
        return this.isPiercing;
    }

    public get isEnemyProjectile(): boolean {
        return !this.isPlayerProjectile;
    }

    public destroy(): void {
        this.isDestroyed = true;
        super.destroy();
    }
}