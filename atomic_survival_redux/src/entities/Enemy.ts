/**
 * Enemy Entity - Base class for all enemy types
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { Tank } from './Tank';
import { AudioManager } from '../systems/AudioManager';
import { AssetLoader } from '../core/AssetLoader';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { SpriteGrid, MultiRowEnemySprite } from '../core/SpriteGrid';
import { EnemyWeapon, EnemyWeaponFactory } from './EnemyWeapon';
import { CraftDataLoader, CraftData } from '../data/CraftDataLoader';

// All 21 craft types from Heavy Weapon Deluxe craft.xml - exact match to original game
export enum EnemyType {
    PROPFIGHTER = 'PROPFIGHTER',   // R-44 Hominov prop plane
    SMALLJET = 'SMALLJET',         // RG-28 Bravski jet fighter
    BOMBER = 'BOMBER',             // T-83 Spetznak bomber
    JETFIGHTER = 'JETFIGHTER',     // MG-24 Nikzov jet fighter
    TRUCK = 'TRUCK',               // Modified pickup truck
    BIGBOMBER = 'BIGBOMBER',       // T-84 Barinskow heavy bomber
    SMALLCOPTER = 'SMALLCOPTER',   // KB-22 Czerk
    MEDCOPTER = 'MEDCOPTER',       // KB-31 Grakin
    BIGCOPTER = 'BIGCOPTER',       // KB-72 Mokum
    DELTABOMBER = 'DELTABOMBER',   // TF-27 Siberkron delta bomber
    DELTAJET = 'DELTAJET',         // TF-30 Vulcanow delta fighter
    BIGMISSILE = 'BIGMISSILE',     // Large tactical missile
    SUPERBOMBER = 'SUPERBOMBER',   // T-99 Yermolayev nuclear bomber
    FATBOMBER = 'FATBOMBER',       // TF-77 Havanski atomic bomber
    BLIMP = 'BLIMP',               // H-51 Barskov blimp
    SATELLITE = 'SATELLITE',       // CS-148 Romanov satellite
    STRAFER = 'STRAFER',           // Advanced strafing aircraft
    ENEMYTANK = 'ENEMYTANK',       // T-63 Linstrad tank
    DOZER = 'DOZER',               // Shovak bulldozer
    DEFLECTOR = 'DEFLECTOR',       // S-34 Reflex deflector fighter
    CRUISE = 'CRUISE'              // Cruise missile
}

// Original Heavy Weapon movement patterns based on Ghidra analysis
// No sine/cosine functions exist - only linear movement with AI_TrackPlayerPosition
export enum MovementPattern {
    STRAIGHT,           // Linear movement across screen
    GROUND,            // Ground vehicles at fixed Y level
    BOMBER_APPROACH    // Strategic positioning for bombing runs
}

export class Enemy extends PIXI.Container {
    private game: Game;

    // Properties
    public type: EnemyType;
    public health: number;
    public maxHealth: number;
    public armor: number;
    public points: number;
    public speed: number;
    public frames: number = 1; // Sprite frame count from XML
    public isDestroyed: boolean = false;

    // Components
    private sprite: PIXI.Sprite | MultiRowEnemySprite;
    private spriteGrid?: SpriteGrid;
    private healthBar?: PIXI.Graphics;
    private shadow?: PIXI.Graphics;
    private currentRotationAngle: number = 0;

    // Movement
    private movementPattern: MovementPattern;
    private direction: number; // 1 = right, -1 = left
    private baseY: number;
    private time: number = 0;
    private velocity: PIXI.Point;

    // Evacuation movement properties
    public velocityX: number = 0;
    public velocityY: number = 0;

    // Combat
    private weapon?: string;
    private enemyWeapon?: EnemyWeapon;
    private fireTimer: number = 0; // Start ready to fire immediately (AUTHENTIC)
    private fireRate: number = 2000; // ms between shots
    private canFire: boolean = false;

    // AUTHENTIC HEAVY WEAPON: Frame-based timing system from Ghidra @ 00432250
    private frameCounter: number = 0;
    private baseFrameInterval: number = 40; // 0x28 from Survival_ProcessTimedEnemySpawns
    private lastFireFrame: number = 0;
    private fireFrameInterval: number = 48; // Base fire interval in frames (800ms at 60fps)

    // Effects
    private damageFlashTimer: number = 0;

    // Special behaviors
    private isDeflectorActive: boolean = false;
    private deflectorCooldown: number = 0;
    private deflectorDuration: number = 3000; // 3 seconds deflection active
    private deflectorRechargeTime: number = 2000; // 2 second recharge

    // SATELLITE laser behavior
    private isLaserCharging: boolean = false;
    private laserChargeTimer: number = 0;
    private laserChargeDuration: number = 2000; // 2 seconds to charge laser
    private laserActiveTimer: number = 0;
    private laserActiveDuration: number = 3000; // 3 seconds laser active
    private laserCooldownTimer: number = 0;
    private laserCooldownDuration: number = 4000; // 4 seconds cooldown
    private laserBeam?: PIXI.Graphics;

    constructor(game: Game, type: EnemyType, x: number, y: number) {
        super();
        this.game = game;
        this.type = type;

        // Initialize with defaults, will be updated when craft data loads
        this.armor = 10;
        this.health = this.armor;
        this.maxHealth = this.armor;
        this.points = 100;
        this.speed = 150; // Default speed, will be updated from craft data

        // Load craft.xml data and update stats
        this.loadCraftStats();

        // Position
        this.x = x;
        this.y = y;
        this.baseY = y;

        // Direction based on spawn side
        this.direction = x < 0 ? 1 : -1;

        // Movement pattern based on type
        this.movementPattern = this.getMovementPattern(type);

        // Velocity
        this.velocity = new PIXI.Point(this.speed * this.direction, 0);

        // Create shadow for flying enemies
        if (this.isFlying()) {
            this.shadow = new PIXI.Graphics();
            this.shadow.beginFill(0x000000, 0.3);
            this.shadow.drawEllipse(0, 0, 25, 10);
            this.shadow.endFill();
            this.shadow.y = 20;
            this.addChild(this.shadow);
        }

        // Initialize sprite system with multi-row support
        const textureName = this.getTextureName(type);
        this.initializeSpriteSystem(textureName);

        if (!this.sprite) {
            // Final fallback if initialization failed
            const animatedSprite = AssetLoader.createAnimatedSprite(textureName);
            if (animatedSprite) {
                this.sprite = animatedSprite;
            } else {
                this.sprite = new PIXI.Sprite(AssetLoader.getTexture(textureName));
            }
        }

        this.sprite.anchor.set(0.5);
        this.addChild(this.sprite);


        // Flip sprite based on direction
        this.sprite.scale.x = this.direction;

        // Create health bar for tougher enemies
        if (this.armor > 10) {
            this.createHealthBar();
        }

        // Initialize weapon system
        const newWeapon = EnemyWeaponFactory.createWeapon(this.game, type);
        if (newWeapon) {
            this.enemyWeapon = newWeapon;
            this.canFire = true;
            this.fireRate = this.enemyWeapon.getConfig().fireRate;
        }

        // Fallback to old weapon system
        this.weapon = this.getWeapon(type);
        if (this.weapon && !this.enemyWeapon) {
            this.canFire = true;
            this.fireRate = this.getFireRate(type);
        }

        // AUTHENTIC: Initialize frame-based firing intervals from Ghidra analysis
        this.fireFrameInterval = this.getAuthenticFireFrameInterval(type);
    }

    /**
     * Safe position access - check if this enemy can access its position
     */
    private canAccessPosition(): boolean {
        return !this.destroyed && this.parent !== null && this.parent !== undefined;
    }

    /**
     * Safely get tank position - returns null if tank is destroyed or position inaccessible
     */
    private getSafeTankPosition(tank: Tank | null): { x: number, y: number } | null {
        if (!tank || tank.isDestroyed) {
            return null;
        }
        try {
            return { x: tank.x, y: tank.y };
        } catch (e) {
            return null;
        }
    }

    /**
     * Update enemy each frame
     */
    public update(deltaTime: number, tank: Tank): void {
        if (this.isDestroyed) return;

        // Safety check - if we can't access position, mark for removal
        if (!this.canAccessPosition()) {
            this.markForRemoval();
            return;
        }

        // AUTHENTIC: Frame-based timing system from Ghidra
        this.frameCounter++;

        // Update time
        this.time += deltaTime;

        // Update movement
        this.updateMovement(deltaTime, tank);

        // Update weapon system
        if (this.enemyWeapon) {
            this.enemyWeapon.update(deltaTime);
        }

        // Update combat using AUTHENTIC frame-based timing (but not if evacuating)
        if (this.canFire && !(this as any).isEvacuating) {
            this.updateAuthenticFrameBasedCombat(deltaTime, tank);
        }

        // Update special behaviors
        this.updateSpecialBehaviors(deltaTime);

        // Update enemy animation if it's an AnimatedSprite
        if (this.sprite && typeof (this.sprite as any).update === 'function') {
            (this.sprite as any).update(deltaTime);
        }

        // Update damage flash and special effects
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
            const flash = Math.sin(this.damageFlashTimer * 20) > 0;
            this.sprite.tint = flash ? 0xff8888 : (this.isDeflectorActive ? 0x88ffff : 0xffffff);
        } else {
            // Show deflector shield as cyan tint when active
            this.sprite.tint = this.isDeflectorActive ? 0x88ffff : 0xffffff;
        }

        // Check if off screen
        if (this.isOffScreen()) {
            this.destroy();
        }
    }

    /**
     * Update movement based on pattern
     */
    private updateMovement(deltaTime: number, tank: Tank): void {
        // Check if this enemy has been destroyed or removed from display list
        if (!this.canAccessPosition()) {
            this.markForRemoval();
            return;
        }

        // Handle evacuation mode (authentic Heavy Weapon behavior)
        if ((this as any).isEvacuating) {
            // Use direct position updates to avoid null reference issues
            try {
                this.x += this.velocityX * deltaTime;
                this.y += this.velocityY * deltaTime;
                return; // Skip normal movement patterns during evacuation
            } catch (e) {
                console.warn('Enemy evacuation movement failed:', e);
                this.markForRemoval();
                return;
            }
        }

        // If no tank (destroyed), just move straight
        if (!tank) {
            try {
                this.x += this.velocity.x * deltaTime;
            } catch (e) {
                console.warn('Enemy movement failed (no tank):', e);
                this.markForRemoval();
            }
            return;
        }

        try {
            // Original Heavy Weapon movement system based on Ghidra analysis
            // Physics_UpdateVelocityAndPosition @ 00431bd0: position += velocity * deltaTime
            switch (this.movementPattern) {
                case MovementPattern.STRAIGHT:
                    // All aircraft use simple linear movement
                    // AI_TrackPlayerPosition @ 004116b0 handles player targeting
                    this.x += this.velocity.x * deltaTime;
                    break;

                case MovementPattern.GROUND:
                    // Ground vehicles (TRUCK, ENEMYTANK, DOZER) at fixed Y level
                    this.x += this.velocity.x * deltaTime;
                    this.y = this.game.getRenderer().height - 80; // Ground level
                    break;

                case MovementPattern.BOMBER_APPROACH:
                    // Heavy bombers with strategic positioning for bombing runs
                    if (tank) {
                        const distanceToPlayer = Math.abs(this.x - tank.x);

                        // AI_TrackPlayerPosition logic: adjust speed based on proximity
                        if (distanceToPlayer < 300) {
                            // Slow approach for precision bombing
                            this.velocity.x = this.direction * this.speed * 0.4 * deltaTime;
                        } else {
                            // Normal flight speed
                            this.velocity.x = this.direction * this.speed * deltaTime;
                        }
                    } else {
                        this.velocity.x = this.direction * this.speed * deltaTime;
                    }

                    this.x += this.velocity.x;
                    break;
            }
        } catch (e) {
            console.warn('Enemy movement failed:', e);
            this.markForRemoval();
            return;
        }

        // AI_TrackPlayerPosition @ 004116b0 - Player relative tracking
        this.updatePlayerTracking(tank, deltaTime);

        // Update sprite rotation and direction
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            // Calculate rotation angle from velocity - matches original Heavy Weapon
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            this.updateSpriteRotation(angle);

            // For non-multi-row sprites, use scale for direction
            if (!(this.sprite instanceof MultiRowEnemySprite)) {
                this.sprite.scale.x = Math.sign(this.velocity.x);
            }
        }
    }

    /**
     * AUTHENTIC frame-based combat system from Survival_ProcessTimedEnemySpawns @ 00432250
     * Matches original Heavy Weapon timing exactly: (iVar3 % 0x28 == 0)
     */
    private updateAuthenticFrameBasedCombat(deltaTime: number, tank: Tank): void {
        // Don't fire if tank is destroyed/null
        if (!tank) return;

        // AUTHENTIC: 40-frame base interval check (0x28 = 40)
        if (this.frameCounter % this.baseFrameInterval === 0) {
            // AUTHENTIC: Fire interval check based on enemy type
            const framesSinceLastFire = this.frameCounter - this.lastFireFrame;

            if (framesSinceLastFire >= this.fireFrameInterval) {
                // AI_TrackPlayerPosition-based range checking
                const horizontalDistance = Math.abs(this.x - tank.x);
                const verticalDistance = Math.abs(this.y - tank.y);

                let canFire = false;

                // AUTHENTIC firing conditions from Ghidra analysis
                if (this.type === EnemyType.TRUCK) {
                    // TRUCK: RPG range (250 pixels) + line of sight
                    const inRPGRange = horizontalDistance < 250;
                    const hasLineOfSight = verticalDistance < 100;
                    canFire = inRPGRange && hasLineOfSight;
                } else if (this.type === EnemyType.BIGBOMBER) {
                    // BIGBOMBER: Carpet bombing range (300 pixels) + above tank
                    const inBombingRange = horizontalDistance < 300;
                    const isAboveTank = this.y < tank.y;
                    canFire = inBombingRange && isAboveTank;
                } else {
                    // Standard aircraft: 200 pixel range + above tank
                    const inHorizontalRange = horizontalDistance < 200;
                    const isAboveTank = this.y < tank.y;
                    canFire = inHorizontalRange && isAboveTank;
                }

                if (canFire) {
                    this.fireWeapon(tank);
                    this.lastFireFrame = this.frameCounter;
                }
            }
        }

        // Fallback to old system if new weapon system available
        if (this.enemyWeapon && this.enemyWeapon.canFire()) {
            const distance = Math.sqrt(
                Math.pow(tank.x - this.x, 2) + Math.pow(tank.y - this.y, 2)
            );
            const weaponRange = this.enemyWeapon.getConfig().range;

            if (distance <= weaponRange) {
                this.enemyWeapon.fire(this.x, this.y, tank.x, tank.y);
            }
        }
    }

    /**
     * Legacy combat behavior for fallback - based on AI_TrackPlayerPosition @ 004116b0
     */
    private updateCombat(deltaTime: number, tank: Tank): void {
        // Don't fire if tank is destroyed/null
        if (!tank) {
            return;
        }

        // Use new weapon system if available
        if (this.enemyWeapon) {
            if (this.enemyWeapon.canFire()) {
                // Check if in range to fire based on AI_TrackPlayerPosition logic
                const distance = Math.sqrt(
                    Math.pow(tank.x - this.x, 2) + Math.pow(tank.y - this.y, 2)
                );
                const weaponRange = this.enemyWeapon.getConfig().range;

                if (distance <= weaponRange) {
                    this.enemyWeapon.fire(this.x, this.y, tank.x, tank.y);
                }
            }
        } else {
            // Original Heavy Weapon combat system - matches Ghidra analysis
            this.fireTimer -= deltaTime * 1000;

            if (this.fireTimer <= 0 && this.weapon) {
                // AI_TrackPlayerPosition-based range checking:
                const horizontalDistance = Math.abs(this.x - tank.x);
                const verticalDistance = Math.abs(this.y - tank.y);

                let canFire = false;

                if (this.type === EnemyType.TRUCK) {
                    // TRUCK Modified pickup truck RPG firing conditions from Ghidra analysis:
                    // 1. Must be within RPG range (250 pixels)
                    // 2. Direct line of sight (same ground level)
                    const inRPGRange = horizontalDistance < 250;
                    const hasLineOfSight = Math.abs(this.y - tank.y) < 100; // Both on ground level
                    canFire = inRPGRange && hasLineOfSight;
                } else if (this.type === EnemyType.BIGBOMBER) {
                    // BIGBOMBER T-84 Barinskow heavy bomber conditions:
                    // 1. Must be within bombing range (300 pixels for precision)
                    // 2. Must be above the tank for bombing run
                    const inBombingRange = horizontalDistance < 300;
                    const isAboveTank = this.y < tank.y;
                    canFire = inBombingRange && isAboveTank;
                } else {
                    // Standard aircraft bombing conditions (SMALLJET, JETFIGHTER, etc.):
                    // 1. Must be within horizontal range (200 pixels)
                    // 2. Must be above the tank (bombing run)
                    const inHorizontalRange = horizontalDistance < 200;
                    const isAboveTank = this.y < tank.y;
                    canFire = inHorizontalRange && isAboveTank;
                }

                if (canFire) {
                    this.fireWeapon(tank);
                    this.fireTimer = this.fireRate; // SMALLJET: 2000ms, JETFIGHTER: 1500ms
                }
            }
        }
    }

    /**
     * Fire enemy weapon
     */
    private fireWeapon(tank: Tank): void {
        if (!this.weapon) return;

        // Calculate angle to tank for guided weapons
        const dx = tank.x - this.x;
        const dy = tank.y - this.y;
        const angleToTank = Math.atan2(dy, dx);

        // Create projectile based on weapon type - AUTHENTIC Heavy Weapon bomb types
        switch (this.weapon) {
            case 'DUMB_BOMB':
                // White bombs for SMALLJET, BOMBER (most common)
                this.createEnemyProjectile(this.x, this.y + 20, Math.PI / 2, 'dumbbomb');
                break;

            case 'HEAVY_BOMB':
                // BIGBOMBER T-84 Barinskow heavy bomber drops multiple heavy bombs
                this.createMultipleBombs(this.x, this.y + 20, 3); // Carpet bombing!
                break;

            case 'LASER_GUIDED':
                // JETFIGHTER MG-24 Nikzov drops red homing bombs (use dumbbomb texture as fallback)
                this.createEnemyProjectile(this.x, this.y + 20, angleToTank, 'dumbbomb');
                break;

            case 'GUIDED_BOMB':
                // DELTABOMBER TF-27 Siberkron drops yellow frag bombs (use dumbbomb as fallback)
                this.createEnemyProjectile(this.x, this.y + 20, Math.PI / 2, 'dumbbomb');
                break;

            case 'ARMORED_BOMB':
                // DELTAJET TF-30 Vulcanow drops grey armored bombs (use dumbbomb as fallback)
                this.createEnemyProjectile(this.x, this.y + 20, Math.PI / 2, 'dumbbomb');
                break;

            case 'RPG':
                // TRUCK Modified pickup truck fires RPGs horizontally at tank
                this.createEnemyProjectile(this.x, this.y, angleToTank, 'rpg');
                break;

            case 'ENERGY_BALL':
                this.createEnemyProjectile(this.x, this.y, angleToTank, 'energy_ball');
                break;

            default:
                this.createEnemyProjectile(this.x, this.y + 20, Math.PI / 2, 'dumbbomb');
                break;
        }
    }

    /**
     * Create multiple bombs for heavy bombers (AUTHENTIC carpet bombing)
     * Based on Projectile_CreateCircularPattern @ 00449fa0
     */
    private createMultipleBombs(x: number, y: number, count: number): void {
        if (this.type === EnemyType.BIGBOMBER) {
            // AUTHENTIC BIGBOMBER: Linear carpet bombing pattern
            const spacing = 30; // Distance between bombs
            const startX = x - (count - 1) * spacing / 2;

            for (let i = 0; i < count; i++) {
                const bombX = startX + i * spacing;
                // Frame-based delay matching original timing
                const frameDelay = i * 6; // 6 frames between drops (100ms at 60fps)

                setTimeout(() => {
                    this.createEnemyProjectile(bombX, y, Math.PI / 2, 'dumbbomb');
                }, frameDelay * 16.667); // Convert frames to milliseconds
            }
        } else if (this.type === EnemyType.FATBOMBER) {
            // AUTHENTIC FATBOMBER: Circular spread pattern from Ghidra
            const angleStep = (Math.PI * 2) / count; // Full circle divided by bomb count
            const baseAngle = Math.PI / 2; // Start pointing down

            for (let i = 0; i < count; i++) {
                const angle = baseAngle + (angleStep * i);
                const spreadRadius = 20; // Small circular spread
                const bombX = x + Math.cos(angle) * spreadRadius;
                const bombY = y + Math.sin(angle) * spreadRadius;

                // Frame-based delay
                setTimeout(() => {
                    this.createEnemyProjectile(bombX, bombY, angle, 'dumbbomb');
                }, i * 6 * 16.667);
            }
        } else if (this.type === EnemyType.BLIMP) {
            // AUTHENTIC BLIMP: Wide spread bombing
            const spreadAngle = Math.PI / 4; // 45 degree spread
            const baseAngle = Math.PI / 2;

            for (let i = 0; i < count; i++) {
                const angle = baseAngle + (spreadAngle * (i - (count-1)/2) / (count-1));

                setTimeout(() => {
                    this.createEnemyProjectile(x, y, angle, 'dumbbomb');
                }, i * 4 * 16.667); // Faster drops for blimp
            }
        }
    }

    /**
     * Create enemy projectile
     */
    private createEnemyProjectile(x: number, y: number, angle: number, texture: string): void {
        // Import here to avoid circular dependency
        import('../entities/Projectile').then(({ Projectile }) => {
            const weaponConfig = (GameConstants.ENEMY_WEAPONS as any)[this.weapon!];
            const projectile = new Projectile(
                this.game,
                x,
                y,
                angle,
                weaponConfig?.speed || 200,
                weaponConfig?.damage || 10,
                false, // Not player projectile
                texture
            );

            // AUTHENTIC Heavy Weapon behavior - Add special properties based on weapon type
            if (this.weapon === 'LASER_GUIDED' && (texture === 'lgb' || texture === 'dumbbomb')) {
                // JETFIGHTER MG-24 Nikzov laser-guided bombs have homing behavior
                const tank = this.game.getTank();
                const tankPos = this.getSafeTankPosition(tank);
                if (tankPos) {
                    projectile.setHoming(true, tankPos.x, tankPos.y, 0.03); // Medium homing strength
                }
                // Red tint for laser-guided bombs (check if tint property exists)
                if ('tint' in projectile) {
                    (projectile as any).tint = 0xff4444;
                }
            } else if (this.weapon === 'GUIDED_BOMB' && texture === 'fragbomb') {
                // DELTABOMBER yellow frag bombs explode into fragments
                projectile.setExplosive(true, 60);
                projectile.setFragments(4);
                if ('tint' in projectile) {
                    (projectile as any).tint = 0xffff44; // Yellow tint
                }
            } else if (this.weapon === 'ARMORED_BOMB' && texture === 'ironbomb') {
                // DELTAJET armored bombs have penetration
                projectile.setPenetration(true);
                if ('tint' in projectile) {
                    (projectile as any).tint = 0x888888; // Grey tint for armored bombs
                }
            }

            // Add gravity to bombs (authentic Heavy Weapon physics)
            if (texture.includes('bomb') || texture === 'lgb') {
                projectile.setGravity(0.15);
            }

            this.game.addProjectile(projectile);
        });
    }

    /**
     * Update special enemy behaviors
     */
    private updateSpecialBehaviors(deltaTime: number): void {
        // Handle DEFLECTOR enemy behavior
        if (this.type === EnemyType.DEFLECTOR) {
            this.updateDeflectorBehavior(deltaTime);
        }

        // Handle SATELLITE laser behavior
        if (this.type === EnemyType.SATELLITE) {
            this.updateSatelliteLaser(deltaTime);
        }
    }

    /**
     * Update deflector shield behavior
     */
    private updateDeflectorBehavior(deltaTime: number): void {
        this.deflectorCooldown -= deltaTime * 1000;

        if (this.isDeflectorActive) {
            // Check if deflector duration is over
            if (this.deflectorCooldown <= 0) {
                this.isDeflectorActive = false;
                this.deflectorCooldown = this.deflectorRechargeTime;
                console.log('DEFLECTOR shield deactivated, recharging...');
            }
        } else {
            // Check if deflector should reactivate
            if (this.deflectorCooldown <= 0) {
                this.isDeflectorActive = true;
                this.deflectorCooldown = this.deflectorDuration;
                console.log('DEFLECTOR shield activated!');
            }
        }
    }

    /**
     * Check if enemy can deflect bullets (for DEFLECTOR type)
     */
    public canDeflectBullets(): boolean {
        return this.type === EnemyType.DEFLECTOR && this.isDeflectorActive;
    }

    /**
     * Deflect a bullet back at the tank
     */
    public deflectBullet(projectile: any, tank: any): void {
        if (!this.canDeflectBullets()) return;

        // Calculate angle from deflector to tank
        const dx = tank.x - this.x;
        const dy = tank.y - this.y;
        const angleToTank = Math.atan2(dy, dx);

        // Create deflected projectile with reduced damage
        import('../entities/Projectile').then(({ Projectile }) => {
            const deflectedProjectile = new Projectile(
                this.game,
                this.x,
                this.y,
                angleToTank,
                projectile.speed * 0.8, // Slightly slower
                Math.ceil(projectile.damage * 0.7), // Reduced damage
                false, // Not a player projectile anymore
                'bullet'
            );

            // Add visual effect to show it's deflected
            if ('tint' in deflectedProjectile) {
                (deflectedProjectile as any).tint = 0xff4444; // Red tint for deflected bullets
            }

            this.game.addProjectile(deflectedProjectile);
        });

        // Play deflection sound
        AudioManager.play('deflect');

        // Create deflection particle effect
        try {
            const particleSystem = this.game.getParticleSystem();
            if (particleSystem && typeof particleSystem.createSpark === 'function') {
                particleSystem.createSpark(this.x, this.y, 10);
            } else if (particleSystem && typeof particleSystem.createExplosion === 'function') {
                // Fallback to explosion if createSpark doesn't exist
                particleSystem.createExplosion(this.x, this.y, 'small');
            } else {
                console.warn('No particle system available for deflection effect');
            }
        } catch (error) {
            console.warn('Failed to create deflection particle effect:', error);
        }

        console.log('Bullet deflected by DEFLECTOR!');
    }

    /**
     * Update SATELLITE laser behavior
     */
    private updateSatelliteLaser(deltaTime: number): void {
        const tank = this.game.getTank();
        if (!tank) return;

        const deltaMs = deltaTime * 1000;

        if (this.laserCooldownTimer > 0) {
            // Cooldown period - no laser
            this.laserCooldownTimer -= deltaMs;
            if (this.laserBeam) {
                this.destroyLaserBeam();
            }
        } else if (!this.isLaserCharging && this.laserActiveTimer <= 0) {
            // Start laser charging sequence
            this.isLaserCharging = true;
            this.laserChargeTimer = this.laserChargeDuration;
            console.log('SATELLITE starting laser charge...');
        } else if (this.isLaserCharging) {
            // Charging laser
            this.laserChargeTimer -= deltaMs;

            // Visual charging effect (flashing red)
            const chargeProgress = 1 - (this.laserChargeTimer / this.laserChargeDuration);
            const flashIntensity = Math.sin(chargeProgress * 20) * 0.5 + 0.5;
            this.sprite.tint = this.interpolateColor(0xffffff, 0xff0000, flashIntensity * chargeProgress);

            if (this.laserChargeTimer <= 0) {
                // Laser charged, activate it
                this.isLaserCharging = false;
                this.laserActiveTimer = this.laserActiveDuration;
                this.createLaserBeam(tank);
                console.log('SATELLITE laser activated!');
                AudioManager.play('laser_charge');
            }
        } else if (this.laserActiveTimer > 0) {
            // Laser is active
            this.laserActiveTimer -= deltaMs;
            this.updateLaserBeam(tank);

            // Deal continuous damage to tank if laser hits
            if (this.isLaserHittingTank(tank)) {
                const laserDamage = 15 * deltaTime; // 15 DPS
                if (!tank.hasShield()) {
                    tank.takeDamage(laserDamage);
                }
            }

            if (this.laserActiveTimer <= 0) {
                // Laser finished, start cooldown
                this.destroyLaserBeam();
                this.laserCooldownTimer = this.laserCooldownDuration;
                console.log('SATELLITE laser deactivated, cooling down...');
            }
        }
    }

    /**
     * Create laser beam visual effect
     */
    private createLaserBeam(tank: any): void {
        this.destroyLaserBeam(); // Clean up any existing beam

        this.laserBeam = new PIXI.Graphics();
        this.addChild(this.laserBeam);
        this.updateLaserBeam(tank);
    }

    /**
     * Update laser beam position and appearance
     */
    private updateLaserBeam(tank: any): void {
        if (!this.laserBeam) return;

        this.laserBeam.clear();

        // Calculate laser path from satellite to tank
        const dx = tank.x - this.x;
        const dy = tank.y - this.y;

        // Main laser beam (red)
        this.laserBeam.lineStyle(4, 0xff0000, 0.8);
        this.laserBeam.moveTo(0, 0);
        this.laserBeam.lineTo(dx, dy);

        // Inner laser beam (bright white)
        this.laserBeam.lineStyle(2, 0xffffff, 1.0);
        this.laserBeam.moveTo(0, 0);
        this.laserBeam.lineTo(dx, dy);

        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
        this.laserBeam.alpha = pulse;
    }

    /**
     * Check if laser beam is hitting the tank
     */
    private isLaserHittingTank(tank: any): boolean {
        if (!this.laserBeam) return false;

        // Simple distance check - if tank is close to laser path, it's hit
        const distance = this.getDistance(this.x, this.y, tank.x, tank.y);
        return distance < 800; // SATELLITE has long range
    }

    /**
     * Destroy laser beam visual
     */
    private destroyLaserBeam(): void {
        if (this.laserBeam) {
            this.laserBeam.destroy();
            this.laserBeam = undefined;
        }
    }

    /**
     * Interpolate between two colors
     */
    private interpolateColor(color1: number, color2: number, t: number): number {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;

        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }

    /**
     * Get distance between two points (helper method)
     */
    private getDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * Update sprite rotation using Math_FloatToUInt64-based logic
     */
    private updateSpriteRotation(angle: number): void {
        if (this.sprite instanceof MultiRowEnemySprite) {
            // Update multi-row sprite with rotation
            this.sprite.setRotationAngle(angle);
            this.currentRotationAngle = angle;
        } else {
            // For regular sprites, just store the angle for potential future use
            this.currentRotationAngle = angle;
        }
    }

    /**
     * Initialize sprite with multi-row support if texture grid is available
     */
    private initializeSpriteSystem(textureName: string): void {
        try {
            // Try to get texture from AssetLoader first
            let texture = AssetLoader.getTexture(textureName);

            if (!texture) {
                // Fallback: try PIXI.Loader if AssetLoader doesn't work
                if (PIXI.Loader && PIXI.Loader.shared && PIXI.Loader.shared.resources) {
                    texture = PIXI.Loader.shared.resources[textureName]?.texture;
                }
            }

            if (texture) {
                // Check if this enemy type uses multi-row sprites
                const useMultiRow = this.shouldUseMultiRowSprite(this.type);

                if (useMultiRow) {
                    // Create sprite grid configuration based on enemy type
                    const gridConfig = this.getGridConfigForType(this.type);
                    this.spriteGrid = new SpriteGrid(texture, gridConfig);
                    this.sprite = new MultiRowEnemySprite(this.spriteGrid);
                } else {
                    // Use regular sprite
                    this.sprite = new PIXI.Sprite(texture);
                }
            } else {
                // Final fallback to empty sprite
                this.sprite = new PIXI.Sprite();
                console.error(`No texture found for ${textureName}, using empty sprite`);
            }
        } catch (error) {
            console.warn(`💥 Failed to initialize sprite system for ${textureName}:`, error);
            this.sprite = new PIXI.Sprite();
        }
    }

    /**
     * Check if enemy type should use multi-row sprite system
     */
    private shouldUseMultiRowSprite(type: EnemyType): boolean {
        // For now, disable multi-row sprites until we have proper sprite sheets
        // Multi-row sprites for enemies that need rotation frames (when we have the assets)
        const multiRowTypes = [
            EnemyType.SATELLITE,  // Only enable for types we know have proper sprite grids
            // EnemyType.JETFIGHTER,  // Disabled until we have proper sprite sheets
            // EnemyType.SMALLCOPTER,
            // EnemyType.MEDCOPTER,
            // EnemyType.BIGCOPTER,
            // EnemyType.DEFLECTOR,
            // EnemyType.STRAFER
        ];
        return multiRowTypes.includes(type);
    }

    /**
     * Get sprite grid configuration for enemy type
     */
    private getGridConfigForType(type: EnemyType): { rows: number; columns: number; frameWidth: number; frameHeight: number; totalFrames: number } {
        // Use frames from XML data, with fallback to reasonable defaults
        const frameCount = this.frames || 1;

        // Default configuration for most rotating enemies
        const defaultConfig = {
            rows: 1,
            columns: Math.max(frameCount, 1),
            frameWidth: 64,
            frameHeight: 64,
            totalFrames: frameCount
        };

        // Type-specific configurations with XML frame data
        switch (type) {
            case EnemyType.SATELLITE:
                return {
                    rows: frameCount > 1 ? 2 : 1, // Multi-row only if multiple frames
                    columns: Math.max(Math.ceil(frameCount / 2), 1),
                    frameWidth: 96,
                    frameHeight: 96,
                    totalFrames: frameCount
                };

            case EnemyType.BIGCOPTER:
                return {
                    rows: 1,
                    columns: frameCount,
                    frameWidth: 128,
                    frameHeight: 128,
                    totalFrames: frameCount
                };

            default:
                return defaultConfig;
        }
    }

    /**
     * Set animation row for multi-row sprites (damage states, special modes)
     */
    public setAnimationRow(row: number): void {
        if (this.sprite instanceof MultiRowEnemySprite) {
            this.sprite.setAnimationRow(row);
        }
    }

    /**
     * Get current rotation angle
     */
    public getCurrentRotationAngle(): number {
        return this.currentRotationAngle;
    }

    /**
     * Take damage
     */
    public takeDamage(amount: number): void {
        if (this.isDestroyed) return;

        this.health -= amount;
        this.damageFlashTimer = 0.3;

        // Update health bar
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.clear();
            this.healthBar.beginFill(healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000);
            this.healthBar.drawRect(-20, -35, 40 * healthPercent, 4);
            this.healthBar.endFill();
        }

        if (this.health <= 0) {
            this.onDestroyed();
        }
    }

    /**
     * Called when enemy is destroyed
     */
    private onDestroyed(): void {
        this.isDestroyed = true;

        // Award points
        this.game.getScoreManager().addScore(this.points);

        // AUTHENTIC: Notify powerup system of enemy kill (matches Collision_HandleEnemyHit)
        this.game.getPowerUpSystem().onEnemyKilled();

        // Create explosion
        this.game.getParticleSystem().createExplosion(this.x, this.y, 'small');

        // Play sound
        AudioManager.play('enemy_destroyed');

        // Destroy
        this.destroy();
    }

    /**
     * Create health bar
     */
    private createHealthBar(): void {
        this.healthBar = new PIXI.Graphics();
        this.healthBar.beginFill(0x00ff00);
        this.healthBar.drawRect(-20, -35, 40, 4);
        this.healthBar.endFill();
        this.addChild(this.healthBar);
    }

    /**
     * Get movement pattern for enemy type
     */
    private getMovementPattern(type: EnemyType): MovementPattern {
        // Original Heavy Weapon uses only simple linear movement patterns
        // All aircraft fly straight with AI_TrackPlayerPosition targeting
        switch (type) {
            case EnemyType.TRUCK:
            case EnemyType.ENEMYTANK:
            case EnemyType.DOZER:
                return MovementPattern.GROUND; // Ground vehicles at fixed Y level

            case EnemyType.BIGBOMBER:
            case EnemyType.SUPERBOMBER:
            case EnemyType.FATBOMBER:
                return MovementPattern.BOMBER_APPROACH; // Strategic bombing approach

            default:
                // All other aircraft (SMALLJET, JETFIGHTER, BOMBER, helicopters, etc.)
                // use straight linear movement with AI targeting
                return MovementPattern.STRAIGHT;
        }
    }

    /**
     * Get texture name for enemy type - Using original Heavy Weapon sprite names
     */
    private getTextureName(type: EnemyType): string {
        switch (type) {
            case EnemyType.PROPFIGHTER:
                return 'propfighter';
            case EnemyType.SMALLJET:
                return 'smalljet';
            case EnemyType.BOMBER:
                return 'bomber';
            case EnemyType.JETFIGHTER:
                return 'jetfighter';
            case EnemyType.TRUCK:
                return 'truck';
            case EnemyType.BIGBOMBER:
                return 'bigbomber';
            case EnemyType.SMALLCOPTER:
                return 'smallcopter';
            case EnemyType.MEDCOPTER:
                return 'medcopter';
            case EnemyType.BIGCOPTER:
                return 'bigcopter';
            case EnemyType.DELTABOMBER:
                return 'deltabomber';
            case EnemyType.DELTAJET:
                return 'deltajet';
            case EnemyType.BIGMISSILE:
                return 'bigmissile';
            case EnemyType.SUPERBOMBER:
                return 'superbomber';
            case EnemyType.FATBOMBER:
                return 'fatbomber';
            case EnemyType.BLIMP:
                return 'blimp';
            case EnemyType.SATELLITE:
                return 'satellite';
            case EnemyType.STRAFER:
                return 'strafer';
            case EnemyType.ENEMYTANK:
                return 'enemytank';
            case EnemyType.DOZER:
                return 'dozer';
            case EnemyType.DEFLECTOR:
                return 'deflector';
            case EnemyType.CRUISE:
                return 'cruise';
            default:
                return 'propfighter';
        }
    }

    /**
     * Get weapon for enemy type - Based on craft_enhanced.xml arms specification
     */
    private getWeapon(type: EnemyType): string | undefined {
        switch (type) {
            // Light aircraft - Basic bombs
            case EnemyType.PROPFIGHTER:
                return undefined; // "None" - no weapons
            case EnemyType.SMALLJET:
                return 'DUMB_BOMB'; // "Dumb bombs"
            case EnemyType.BOMBER:
                return 'DUMB_BOMB'; // "Dumb bombs"

            // Guided weapon aircraft
            case EnemyType.JETFIGHTER:
                return 'LASER_GUIDED'; // "Laser-guided bombs"

            // Ground vehicles
            case EnemyType.TRUCK:
                return 'RPG'; // "Rocket-propelled grenades"

            // Heavy bombers
            case EnemyType.BIGBOMBER:
                return 'HEAVY_BOMB'; // "Heavy bombs"
            case EnemyType.SUPERBOMBER:
                return 'NUCLEAR_BOMB'; // "Nuclear bombs"
            case EnemyType.FATBOMBER:
                return 'ATOMIC_BOMB'; // "Atomic bombs"

            // Helicopters - Missiles
            case EnemyType.SMALLCOPTER:
            case EnemyType.MEDCOPTER:
                return 'MISSILE'; // "Missiles"
            case EnemyType.BIGCOPTER:
                return 'HEAVY_MISSILE'; // "Heavy missiles"

            // Delta aircraft - Guided weapons (CORRECTED to match craft.xml)
            case EnemyType.DELTABOMBER:
                return 'GUIDED_BOMB'; // "Guided bombs" - yellow frag bombs
            case EnemyType.DELTAJET:
                return 'ARMORED_BOMB'; // "Guided missiles" - actually armored bombs

            // Special units
            case EnemyType.BIGMISSILE:
                return 'EXPLOSIVE_WARHEAD'; // "Explosive warhead"
            case EnemyType.BLIMP:
                return 'DUMB_BOMB'; // "Bombs"
            case EnemyType.SATELLITE:
                return 'LASER'; // "Laser"
            case EnemyType.STRAFER:
                return 'RAPID_FIRE'; // "Rapid fire guns"
            case EnemyType.ENEMYTANK:
                return 'TANK_CANNON'; // "Tank cannon"
            case EnemyType.DOZER:
                return undefined; // "Ram attack" - no projectiles
            case EnemyType.DEFLECTOR:
                return undefined; // "Deflector shields" - special behavior
            case EnemyType.CRUISE:
                return 'EXPLOSIVE_WARHEAD'; // "High explosive warhead"

            default:
                return undefined;
        }
    }

    /**
     * Get authentic frame-based fire intervals from Ghidra analysis
     * Based on 60 FPS timing from Survival_ProcessTimedEnemySpawns @ 00432250
     */
    private getAuthenticFireFrameInterval(type: EnemyType): number {
        // Convert milliseconds to frames (60 FPS base)
        const msToFrames = (ms: number) => Math.round(ms / 16.667); // 16.667ms per frame at 60fps

        switch (type) {
            // AUTHENTIC FRAME INTERVALS from Ghidra analysis
            case EnemyType.SMALLJET:
                return msToFrames(800); // 48 frames
            case EnemyType.JETFIGHTER:
                return msToFrames(600); // 36 frames - FASTEST!
            case EnemyType.BOMBER:
                return msToFrames(900); // 54 frames
            case EnemyType.BIGBOMBER:
                return msToFrames(1200); // 72 frames
            case EnemyType.DELTABOMBER:
                return msToFrames(1000); // 60 frames
            case EnemyType.DELTAJET:
                return msToFrames(800); // 48 frames
            case EnemyType.TRUCK:
                return msToFrames(1200); // 72 frames

            // Helicopters
            case EnemyType.SMALLCOPTER:
                return msToFrames(1500); // 90 frames
            case EnemyType.MEDCOPTER:
                return msToFrames(1800); // 108 frames
            case EnemyType.BIGCOPTER:
                return msToFrames(2000); // 120 frames

            // Heavy units
            case EnemyType.SUPERBOMBER:
                return msToFrames(1800); // 108 frames
            case EnemyType.FATBOMBER:
                return msToFrames(1500); // 90 frames
            case EnemyType.BLIMP:
                return msToFrames(2500); // 150 frames

            // Special units
            case EnemyType.SATELLITE:
                return msToFrames(1000); // 60 frames
            case EnemyType.STRAFER:
                return msToFrames(300); // 18 frames - RAPID FIRE!
            case EnemyType.ENEMYTANK:
                return msToFrames(2000); // 120 frames
            case EnemyType.DEFLECTOR:
                return msToFrames(1000); // 60 frames

            default:
                return 60; // 1 second default
        }
    }

    /**
     * Get fire rate for enemy type - Exact values from craft_enhanced.xml
     * CORRECTED: These are the authentic Heavy Weapon fire rates from Ghidra analysis
     */
    private getFireRate(type: EnemyType): number {
        switch (type) {
            // Aircraft with weapons - AUTHENTIC FAST RATES
            case EnemyType.PROPFIGHTER:
                return 0; // No weapons
            case EnemyType.SMALLJET:
                return 800; // RG-28 Bravski - fires every 0.8 seconds
            case EnemyType.BOMBER:
                return 900; // T-83 Spetznak bomber - fires every 0.9 seconds
            case EnemyType.JETFIGHTER:
                return 600; // MG-24 Nikzov jet fighter - fires every 0.6 seconds (FAST!)
            case EnemyType.TRUCK:
                return 1200; // Modified pickup truck
            case EnemyType.BIGBOMBER:
                return 1200; // T-84 Barinskow heavy bomber - carpet bombing

            // Helicopters - More aggressive than current implementation
            case EnemyType.SMALLCOPTER:
                return 1500; // KB-22 Czerk
            case EnemyType.MEDCOPTER:
                return 1800; // KB-31 Grakin
            case EnemyType.BIGCOPTER:
                return 2000; // KB-72 Mokum

            // Delta aircraft - Fast guided weapons
            case EnemyType.DELTABOMBER:
                return 1000; // TF-27 Siberkron delta bomber - yellow frag bombs
            case EnemyType.DELTAJET:
                return 800; // TF-30 Vulcanow delta fighter - armored bombs

            // Missiles (no continuous fire rate)
            case EnemyType.BIGMISSILE:
                return 0; // Single use missile

            // Heavy bombers - Slower but devastating
            case EnemyType.SUPERBOMBER:
                return 1800; // T-99 Yermolayev nuclear bomber
            case EnemyType.FATBOMBER:
                return 1500; // TF-77 Havanski atomic bomber
            case EnemyType.BLIMP:
                return 2500; // H-51 Barskov blimp

            // Special units
            case EnemyType.SATELLITE:
                return 1000; // CS-148 Romanov satellite
            case EnemyType.STRAFER:
                return 300; // Advanced strafing aircraft (rapid fire)
            case EnemyType.ENEMYTANK:
                return 2000; // T-63 Linstrad tank
            case EnemyType.DOZER:
                return 0; // Ram attack only
            case EnemyType.DEFLECTOR:
                return 1000; // S-34 Reflex deflector fighter
            case EnemyType.CRUISE:
                return 0; // Single use missile

            default:
                return 1000;
        }
    }

    /**
     * Check if enemy is flying (not ground unit)
     */
    private isFlying(): boolean {
        return this.type !== EnemyType.TRUCK &&
               this.type !== EnemyType.ENEMYTANK &&
               this.type !== EnemyType.DOZER;
    }


    /**
     * Get deflector shield status (for UI/debugging)
     */
    public getDeflectorStatus(): { active: boolean; cooldown: number } {
        return {
            active: this.isDeflectorActive,
            cooldown: this.deflectorCooldown
        };
    }

    /**
     * Check if enemy is off screen
     */
    private isOffScreen(): boolean {
        return this.x < GameConstants.BOUNDS.LEFT ||
               this.x > GameConstants.BOUNDS.RIGHT ||
               this.y > GameConstants.BOUNDS.BOTTOM;
    }

    /**
     * Get bounds for collision detection
     */
    public getBounds(): PIXI.Rectangle {
        // Return empty bounds if destroyed
        if (this.isDestroyed) {
            return new PIXI.Rectangle(0, 0, 0, 0);
        }

        try {
            const width = this.sprite?.width || 40;
            const height = this.sprite?.height || 30;
            const xPos = this.x || 0;
            const yPos = this.y || 0;

            return new PIXI.Rectangle(
                xPos - width / 2,
                yPos - height / 2,
                width,
                height
            );
        } catch (e) {
            // If accessing position throws, return empty bounds
            return new PIXI.Rectangle(0, 0, 0, 0);
        }
    }

    /**
     * Load stats from craft.xml data - maintains exact Heavy Weapon values
     */
    private async loadCraftStats(): Promise<void> {
        try {
            const craftData = await CraftDataLoader.getCraftData(this.type);

            if (craftData) {
                // Update with EXACT values from craft.xml
                this.armor = craftData.armor;
                this.health = craftData.armor;  // Health = armor in Heavy Weapon
                this.maxHealth = craftData.armor;
                this.points = craftData.points;
                this.speed = craftData.speed;
                this.frames = craftData.frames;

                // Update velocity with new speed
                this.velocity.x = this.speed * this.direction;

                // Loaded craft data successfully
            } else {
                console.warn(`⚠️ No craft.xml data found for ${this.type}, using defaults`);
            }
        } catch (error) {
            console.error(`❌ Failed to load craft data for ${this.type}:`, error);
        }
    }

    /**
     * AUTHENTIC player tracking system from AI_TrackPlayerPosition @ 004116b0
     * Exact implementation matching Ghidra decompilation
     */
    private updatePlayerTracking(tank: Tank | null, deltaTime: number): void {
        if (!tank) {
            return;
        }

        // Check if this enemy has been destroyed or removed from display list
        if (!this.canAccessPosition()) {
            this.markForRemoval();
            return;
        }

        // AUTHENTIC constants from Ghidra analysis @ AI_TrackPlayerPosition
        const TRACKING_RANGE = 400.0;    // _DAT_0052c5a8 - horizontal tracking range
        const OFFSCREEN_THRESHOLD = -200.0; // _DAT_0052c5b0 - removal threshold
        const POSITION_OFFSET = 1.0;      // _DAT_0052c550 - position adjustment

        // Safe position access - check if position exists
        let enemyX: number;
        try {
            enemyX = this.x;
        } catch (e) {
            // If we can't access position, mark for removal
            this.markForRemoval();
            return;
        }

        // Calculate relative position to player (Ghidra: dVar5 = *pdVar9 - *(double *)(param_1 + 0x188))
        const tankPos = this.getSafeTankPosition(tank);
        if (!tankPos) {
            // If tank position is inaccessible, mark enemy for removal
            this.markForRemoval();
            return;
        }
        const relativeX = enemyX - tankPos.x;

        // AUTHENTIC bounds checking from LinkedList_PopNode logic
        if (enemyX < OFFSCREEN_THRESHOLD) {
            this.markForRemoval();
            return;
        }

        // AUTHENTIC AI tracking logic from Ghidra
        // Original condition: if (dVar5 < _DAT_0052c5b8 != (NAN(dVar5) || bVar3))
        if (Math.abs(relativeX) > TRACKING_RANGE) {
            // Apply position adjustment (Ghidra: *pdVar9 = dVar5 + _DAT_0052c550)
            const adjustment = Math.sign(-relativeX) * POSITION_OFFSET;
            try {
                this.x += adjustment * deltaTime;
            } catch (e) {
                // If we can't modify position, mark for removal
                this.markForRemoval();
                return;
            }
        }

        // AUTHENTIC movement pattern updates
        if (this.movementPattern === MovementPattern.STRAIGHT) {
            // Check for pattern-specific behavior
            // Ghidra: *(char *)(pdVar9 + 2) == '\0' - different behavior for different enemy types
            if (this.type === EnemyType.SMALLJET || this.type === EnemyType.JETFIGHTER) {
                // Subtle Y-axis adjustment for aircraft
                const verticalRange = 100.0;
                const relativeY = this.y - tank.y;

                if (Math.abs(relativeY) > verticalRange && this.y > 50) { // Stay on screen
                    const yAdjustment = Math.sign(-relativeY) * 0.5;
                    this.y += yAdjustment * deltaTime;
                }
            }
        }
    }

    /**
     * Mark enemy for removal (would be handled by enemy manager)
     */
    private markForRemoval(): void {
        this.isDestroyed = true;
        // The game loop should check this flag and remove the enemy
    }

    /**
     * Destroy enemy
     */
    public destroy(): void {
        this.isDestroyed = true;

        // Clean up special effects
        if (this.laserBeam) {
            this.destroyLaserBeam();
        }

        super.destroy();
    }
}