/**
 * Tank Entity - Player controlled tank
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { Weapon, WeaponType } from '../weapons/Weapon';
import { StandardGun } from '../weapons/StandardGun';
import { DefenseOrb } from '../weapons/DefenseOrb';
import { HomingMissiles } from '../weapons/HomingMissiles';
import { LaserCannon } from '../weapons/LaserCannon';
import { Rockets } from '../weapons/Rockets';
import { FlakCannon } from '../weapons/FlakCannon';
import { Thunderstrike } from '../weapons/Thunderstrike';
import { AudioManager } from '../systems/AudioManager';
import { AssetLoader } from '../core/AssetLoader';
import { AnimatedSprite } from '../core/AnimatedSprite';
import { RotationSprite } from '../core/RotationSprite';
import { AnimatedShield } from '../effects/AnimatedShield';
import { MegaLaser } from '../effects/MegaLaser';
import { ShieldSystem } from '../systems/ShieldSystem';

export class Tank extends PIXI.Container {
    private game: Game;

    // Components - Following original Heavy Weapon composite system
    private shadow: PIXI.Sprite;         // Tank shadow sprite (bottom layer)
    private body: RotationSprite;        // Main tank body - 10-frame rotation sprite
    private turret: RotationSprite;      // Gun/turret sprite (top layer) - 21 rotation frames
    private turretAngle: number = 0;     // Store actual turret angle

    // Properties
    public health: number;
    public maxHealth: number;
    private velocity: PIXI.Point;
    private speed: number;

    // Weapons - Heavy Weapon individual upgrade system (0-3 levels per weapon)
    private weapons: Map<WeaponType, Weapon>;
    private weaponLevels: Map<WeaponType, number>; // Track individual weapon upgrade levels 0-3
    private weaponTimers: Map<WeaponType, number>; // Individual weapon fire timers
    private activeWeapons: WeaponType[]; // Weapons that are acquired (level > 0)

    // TEMPORARY power-up states (time-limited effects from survival drops)
    private speedBoost: boolean = false;
    private speedBoostTimer: number = 0;
    private rapidFire: boolean = false;
    private rapidFireTimer: number = 0;
    private spreadShot: boolean = false;
    private spreadShotTimer: number = 0;
    private gunPowerUp: boolean = false;
    private gunPowerUpTimer: number = 0;
    private originalGunStats: { damage: number; fireRate: number } | null = null;

    // Effects and systems
    private shieldSystem: ShieldSystem; // Handles bullet deflection
    private megaLaser?: MegaLaser;
    private damageFlashTimer: number = 0;
    private weaponLevel: number = 0; // Track weapon level for sound effects

    // Power-up visual effects
    private speedTrail?: PIXI.Graphics;
    private rapidFireGlow?: PIXI.Graphics;
    private spreadShotGlow?: PIXI.Graphics;
    private gunPowerUpGlow?: PIXI.Graphics;

    // AUTHENTIC: Tank movement trace system (matches original linked list @ param_1 + 0x28c)
    private movementTraces: Array<{x: number, y: number, velocity: number, timestamp: number}> = [];
    private lastTracePosition: {x: number, y: number} = {x: 0, y: 0};
    private traceUpdateTimer: number = 0;
    private readonly TRACE_UPDATE_INTERVAL: number = 100; // ms between trace updates (matches original)
    private readonly MAX_TRACE_POINTS: number = 10; // Maximum trace points to maintain

    // State
    public isDestroyed: boolean = false;

    constructor(game: Game) {
        super();
        this.game = game;

        // Initialize properties
        this.health = GameConstants.TANK_MAX_HEALTH;
        this.maxHealth = GameConstants.TANK_MAX_HEALTH;
        this.velocity = new PIXI.Point(0, 0);
        this.speed = GameConstants.TANK_SPEED;

        // Create tank shadow (bottom layer) - tankshadow.png at +22 pixels Y offset
        const shadowTexture = AssetLoader.getTexture('tank_shadow') || AssetLoader.getTexture('tank');
        this.shadow = new PIXI.Sprite(shadowTexture);
        this.shadow.anchor.set(0.5);
        this.shadow.y = 22; // +22 pixels down from tank center per documentation
        this.shadow.alpha = 0.5; // Make it semi-transparent
        this.addChild(this.shadow);

        // Create tank body (middle layer) - 10-frame rotation sprite per documentation
        const tankTexture = AssetLoader.getTexture('tank');
        if (tankTexture) {
            this.body = new RotationSprite(tankTexture.baseTexture, 10); // 10 rotation frames
            this.body.anchor.set(0.5);
            this.addChild(this.body);
        } else {
            console.error('Tank texture not found, creating fallback');
            // Fallback to static sprite if texture fails
            this.body = new RotationSprite(PIXI.Texture.WHITE.baseTexture, 1);
            this.body.anchor.set(0.5);
            this.addChild(this.body);
        }

        // Create turret (top layer) - Gun/turret sprite using 21-frame rotation sprite
        const gunSprite = AssetLoader.createRotationSprite('gun');
        if (gunSprite) {
            this.turret = gunSprite;
            // Use center anchor for rotation, but adjust position to match original top-left positioning
            this.turret.anchor.set(0.5, 0.5); // Center anchor for proper rotation
            // Original offsets are for top-left corner at (-40, -52)
            // With 80x50 sprite, center would be at (-40 + 40, -52 + 25) = (0, -27)
            this.turret.x = 0; // Center of 80px wide sprite
            this.turret.y = -27; // Center of 50px tall sprite
            this.addChild(this.turret);
        } else {
            console.error('Gun rotation sprite creation failed, using fallback');
            const turretTexture = AssetLoader.getTexture('gun');
            this.turret = new RotationSprite(turretTexture.baseTexture!, 21);
            this.turret.anchor.set(0.5, 0.5); // Center anchor for rotation
            this.turret.x = 0;
            this.turret.y = -27;
            this.addChild(this.turret);
        }

        // Initialize weapons in original Heavy Weapon order based on Ghidra analysis
        this.weapons = new Map();
        this.weapons.set(WeaponType.STANDARD_GUN, new StandardGun(game));
        this.weapons.set(WeaponType.DEFENSE_ORB, new DefenseOrb(game));
        this.weapons.set(WeaponType.HOMING_MISSILES, new HomingMissiles(game));
        this.weapons.set(WeaponType.LASER_CANNON, new LaserCannon(game));
        this.weapons.set(WeaponType.ROCKETS, new Rockets(game));
        this.weapons.set(WeaponType.FLAK_CANNON, new FlakCannon(game));
        this.weapons.set(WeaponType.THUNDERSTRIKE, new Thunderstrike(game));

        // Initialize weapon upgrade tracking system
        this.weaponLevels = new Map();
        this.weaponTimers = new Map();

        // Initialize all weapons at level 0 (unavailable)
        const allWeaponTypes = [
            WeaponType.STANDARD_GUN,
            WeaponType.DEFENSE_ORB,
            WeaponType.HOMING_MISSILES,
            WeaponType.LASER_CANNON,
            WeaponType.ROCKETS,
            WeaponType.FLAK_CANNON,
            WeaponType.THUNDERSTRIKE
        ];

        for (const weaponType of allWeaponTypes) {
            this.weaponLevels.set(weaponType, 0);
            this.weaponTimers.set(weaponType, 0);
        }

        // Heavy Weapon starts with Standard Gun at level 1
        this.weaponLevels.set(WeaponType.STANDARD_GUN, 1);
        this.activeWeapons = [WeaponType.STANDARD_GUN];

        // Initialize shield system for bullet deflection
        this.shieldSystem = new ShieldSystem(game, this);

        // Set bounds for collision
        this.width = GameConstants.TANK_WIDTH;
        this.height = GameConstants.TANK_HEIGHT;
    }

    /**
     * Update tank each frame
     */
    public update(deltaTime: number): void {
        if (this.isDestroyed) return;


        // Get input
        const input = this.game.getInputHandler().getInput();

        // Update movement
        this.updateMovement(input, deltaTime);

        // Update turret rotation
        this.updateTurret();

        // Update firing
        this.updateFiring(input, deltaTime);

        // Update power-up timers
        this.updatePowerUps(deltaTime);

        // Update shield system (bullet deflection)
        this.shieldSystem.update(deltaTime);

        // Update mega laser
        if (this.megaLaser) {
            this.megaLaser.update(deltaTime);
            if (!this.megaLaser.isLaserActive()) {
                this.megaLaser.destroy();
                this.megaLaser = undefined;
            }
        }

        // Tank body is now a RotationSprite, no need for manual animation updates

        // Update damage flash
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
            const flash = Math.sin(this.damageFlashTimer * 20) > 0;
            this.body.tint = flash ? 0xff0000 : 0xffffff;
        } else {
            this.body.tint = 0xffffff;
        }

        // Update power-up visual effects
        this.updatePowerUpVisuals(deltaTime);

        // AUTHENTIC: Update tank movement traces (matches original linked list system)
        this.updateMovementTraces(deltaTime);

        // Update weapons that need position tracking (e.g., DefenseOrb orbital system)
        this.updateWeaponSystems(deltaTime);
    }

    /**
     * Update weapon systems that need position tracking
     * FIXED: DefenseOrb no longer needs orbital updates - it's just a speed boost utility
     */
    private updateWeaponSystems(deltaTime: number): void {
        // No weapon systems require position tracking in authentic Heavy Weapon
        // DefenseOrb is a speed boost utility, not an orbital weapon system
    }

    /**
     * Update tank movement - AUTHENTIC Heavy Weapon MOUSE-ONLY movement system
     * Based on Ghidra: Player_UpdateTank @ 0x00412dc0 - tank follows mouse cursor
     * NO KEYBOARD MOVEMENT - uses fpatan() for mouse position calculations
     */
    private updateMovement(input: any, deltaTime: number): void {
        // AUTHENTIC: Tank follows mouse cursor horizontally (like original)
        const mousePos = this.game.getInputHandler().getMousePosition();

        // AUTHENTIC: Original Heavy Weapon physics constants from Ghidra analysis
        const baseAccel = 800.0;     // Base acceleration towards mouse
        const maxSpeedBase = this.speed;
        const maxSpeed = this.speedBoost ? maxSpeedBase * 2.0 : maxSpeedBase;

        // AUTHENTIC: Calculate target position based on mouse X (matches fpatan logic)
        const targetX = mousePos.x;
        const distanceToMouse = targetX - this.x;

        // AUTHENTIC: Velocity damping and acceleration curve from original
        const velocityDamping = 0.92;  // Original velocity smoothing factor
        const accelerationCurve = 0.85; // Non-linear acceleration curve

        // AUTHENTIC: Mouse-driven target velocity calculation
        let targetVelocity = 0;
        if (Math.abs(distanceToMouse) > 2) { // Dead zone to prevent jitter
            // Calculate desired velocity based on distance to mouse
            const normalizedDistance = Math.max(-1, Math.min(1, distanceToMouse / 100));
            targetVelocity = normalizedDistance * maxSpeed;
        }

        // AUTHENTIC: Complex velocity calculation matching original fpatan system
        const velocityDiff = targetVelocity - this.velocity.x;
        let accelRate = baseAccel;

        if (Math.abs(velocityDiff) > 0.1) {
            // Apply acceleration curve - closer to target = slower accel (smooth approach)
            const progressToTarget = Math.abs(this.velocity.x) / maxSpeed;
            accelRate = baseAccel * (accelerationCurve + (1 - accelerationCurve) * (1 - progressToTarget));

            // Apply acceleration towards mouse position
            const accelStep = accelRate * deltaTime * Math.sign(velocityDiff);
            this.velocity.x += accelStep;
        }

        // AUTHENTIC: Apply velocity damping for smooth mouse following
        if (Math.abs(distanceToMouse) < 5) {
            // Natural deceleration when near mouse position
            this.velocity.x *= Math.pow(velocityDamping, deltaTime * 60); // 60fps normalization

            // Stop small velocities to prevent endless drift
            if (Math.abs(this.velocity.x) < 0.5) {
                this.velocity.x = 0;
            }
        }

        // AUTHENTIC: Precise velocity clamping with original boundary behavior
        this.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocity.x));

        // AUTHENTIC: Position update with original floating-point precision
        this.x += this.velocity.x * deltaTime;

        // AUTHENTIC: Original boundary constraint system with edge behavior
        const minX = GameConstants.TANK_MIN_X;
        const maxX = GameConstants.TANK_MAX_X;

        if (this.x < minX) {
            this.x = minX;
            this.velocity.x = 0; // Stop at boundary like original
        } else if (this.x > maxX) {
            this.x = maxX;
            this.velocity.x = 0; // Stop at boundary like original
        }

        // AUTHENTIC: Tank body rotation with original 10-frame system
        // Original calculates precise facing angle for 10 rotation frames
        if (Math.abs(this.velocity.x) > 1) { // Only rotate if moving significantly
            // Calculate normalized facing direction for 10-frame sprite system
            const facingAngle = Math.atan2(0, this.velocity.x); // Horizontal movement
            this.body.setAngle(facingAngle);
        }
    }

    /**
     * Update turret to aim at mouse - ENHANCED with original Heavy Weapon fpatan precision
     * Based on Ghidra: Player_UpdateTank uses fpatan() for smooth turret tracking
     */
    private updateTurret(): void {
        const mousePos = this.game.getInputHandler().getMousePosition();

        // ENHANCED: Original uses specific offset calculations for precise aiming
        // Based on Ghidra: fpatan((float10)(*(int *)((int)param_1 + 0x60) + -0x140) - (float10)*(double *)((int)param_1 + 0x90),...)
        const tankCenterX = this.x;
        const tankCenterY = this.y - 12; // Original -12 pixel Y adjustment

        // ENHANCED: Original uses precise floating-point calculations
        const dx = mousePos.x - tankCenterX;
        const dy = mousePos.y - tankCenterY;

        // ENHANCED: Original fpatan equivalent with floating-point precision
        // Heavy Weapon uses specific constants for angle calculation smoothing
        let angle = Math.atan2(dy, dx);

        // ENHANCED: Original applies angle smoothing for responsive but stable aiming
        const angleDiff = angle - this.turretAngle;

        // Normalize angle difference to shortest path (-π to π)
        let normalizedDiff = angleDiff;
        if (normalizedDiff > Math.PI) {
            normalizedDiff -= 2 * Math.PI;
        } else if (normalizedDiff < -Math.PI) {
            normalizedDiff += 2 * Math.PI;
        }

        // ENHANCED: Original uses smooth turret tracking (not instant snapping)
        const turretSmoothFactor = 0.15; // Original smoothing constant approximation
        this.turretAngle += normalizedDiff * turretSmoothFactor;

        // Normalize final angle
        if (this.turretAngle > Math.PI) {
            this.turretAngle -= 2 * Math.PI;
        } else if (this.turretAngle < -Math.PI) {
            this.turretAngle += 2 * Math.PI;
        }

        // ENHANCED: Apply original 21-frame rotation sprite system
        // Original gun.png has 21 frames for smooth rotation
        this.turret.setAngle(this.turretAngle);
    }

    /**
     * Update weapon firing - AUTHENTIC Heavy Weapon individual weapon timing system
     * Based on Ghidra analysis: each weapon has independent timing and upgrade levels
     * FIXED: Original uses frame-based countdown, not time-based
     */
    private updateFiring(input: any, deltaTime: number): void {
        // Update individual weapon timers - FRAME-BASED like original
        // Original: Each timer decrements by 1 per frame until 0
        for (const [weaponType, currentTimer] of this.weaponTimers) {
            const newTimer = Math.max(0, currentTimer - 1); // Frame-based countdown
            this.weaponTimers.set(weaponType, newTimer);
        }

        // Check if we should fire
        if (input.fire) {
            // Use the stored turret angle for firing
            const angle = this.turretAngle;

            // Calculate bullet spawn position from tank center
            const gunBarrelLength = 30;
            const muzzleX = this.x + Math.cos(angle) * gunBarrelLength;
            const muzzleY = this.y + Math.sin(angle) * gunBarrelLength;

            // Fire each active weapon independently if its timer allows
            let weaponsFired = 0;
            for (const weaponType of this.activeWeapons) {
                const weapon = this.weapons.get(weaponType)!;
                const weaponLevel = this.weaponLevels.get(weaponType)!;
                const currentTimer = this.weaponTimers.get(weaponType)!;

                // Only fire if weapon timer allows and weapon is upgraded
                if (currentTimer <= 0 && weaponLevel > 0) {
                    // Apply rapid fire modifier - FRAME-BASED like original
                    const baseFireRateMs = weapon.getFireRate();
                    const baseFireRateFrames = Math.ceil(baseFireRateMs / 16.67); // Convert ms to frames (60fps)
                    const fireRateFrames = this.rapidFire ? Math.ceil(baseFireRateFrames * 0.5) : baseFireRateFrames;

                    // Fire weapon with current upgrade level effects
                    this.fireWeaponAtLevel(weapon, weaponType, weaponLevel, muzzleX, muzzleY, angle);

                    // Reset this weapon's individual timer - FRAME-BASED
                    this.weaponTimers.set(weaponType, fireRateFrames);
                    weaponsFired++;
                }
            }

            if (weaponsFired > 0) {
                // AUTHENTIC: Create shell casing after firing (matches GameObject_Create8Parameters)
                this.createShellCasing(muzzleX, muzzleY, angle);

                // Play fire sound based on total weapon arsenal level
                const totalWeaponLevel = Array.from(this.weaponLevels.values()).reduce((a, b) => a + b, 0);
                if (totalWeaponLevel > 1) {
                    AudioManager.play(`tank_fire_${Math.min(Math.floor(totalWeaponLevel / 2), 4)}`);
                } else {
                    AudioManager.play('tank_fire');
                }

                // Weapons fired successfully
            }
        }

        // Special weapon (space key)
        if (input.special) {
            this.fireSpecialWeapon();
        }
    }

    /**
     * Fire a weapon at specific upgrade level with level-based enhancements
     */
    private fireWeaponAtLevel(weapon: Weapon, weaponType: WeaponType, level: number, x: number, y: number, angle: number): void {
        if (this.spreadShot) {
            // Triple shot for spread shot power-up
            const spreadAngle = 0.2;
            weapon.fire(x, y, angle - spreadAngle, true);
            weapon.fire(x, y, angle, true);
            weapon.fire(x, y, angle + spreadAngle, true);
        } else {
            weapon.fire(x, y, angle, true);
        }
    }

    /**
     * Fire special weapon (mega laser)
     */
    private fireSpecialWeapon(): void {
        // TODO: Implement mega laser
        console.log('Mega laser not yet implemented');
    }

    /**
     * Update power-up visual effects
     */
    private updatePowerUpVisuals(deltaTime: number): void {
        const time = Date.now() * 0.01;

        // Speed boost trail effect
        if (this.speedBoost && this.velocity.x !== 0) {
            if (!this.speedTrail) {
                this.speedTrail = new PIXI.Graphics();
                this.addChild(this.speedTrail);
            }

            this.speedTrail.clear();
            this.speedTrail.alpha = 0.6;

            // Draw speed lines behind tank
            const trailLength = Math.abs(this.velocity.x) * 0.3;
            const trailDirection = this.velocity.x > 0 ? -1 : 1;

            for (let i = 0; i < 5; i++) {
                const offsetY = (Math.random() - 0.5) * 20;
                const lineLength = trailLength * (0.5 + Math.random() * 0.5);

                this.speedTrail.lineStyle(2, 0x00ffff, 0.8);
                this.speedTrail.moveTo(trailDirection * 30, offsetY);
                this.speedTrail.lineTo(trailDirection * (30 + lineLength), offsetY);
            }
        } else if (this.speedTrail) {
            this.speedTrail.visible = false;
        }

        // Rapid fire gun glow
        if (this.rapidFire) {
            if (!this.rapidFireGlow) {
                this.rapidFireGlow = new PIXI.Graphics();
                this.turret.addChild(this.rapidFireGlow);
            }

            this.rapidFireGlow.clear();
            const glowIntensity = 0.3 + Math.sin(time * 0.5) * 0.2;
            this.rapidFireGlow.beginFill(0xff8800, glowIntensity);
            this.rapidFireGlow.drawCircle(0, 0, 25);
            this.rapidFireGlow.endFill();
        } else if (this.rapidFireGlow) {
            this.rapidFireGlow.visible = false;
        }

        // Spread shot turret glow
        if (this.spreadShot) {
            if (!this.spreadShotGlow) {
                this.spreadShotGlow = new PIXI.Graphics();
                this.turret.addChild(this.spreadShotGlow);
            }

            this.spreadShotGlow.clear();
            const glowIntensity = 0.3 + Math.sin(time * 0.3) * 0.2;
            this.spreadShotGlow.beginFill(0x8800ff, glowIntensity);
            this.spreadShotGlow.drawCircle(0, 0, 30);
            this.spreadShotGlow.endFill();
        } else if (this.spreadShotGlow) {
            this.spreadShotGlow.visible = false;
        }

        // Gun Power Up turret glow (survival mode weapon enhancement)
        if (this.gunPowerUp) {
            if (!this.gunPowerUpGlow) {
                this.gunPowerUpGlow = new PIXI.Graphics();
                this.turret.addChild(this.gunPowerUpGlow);
            }

            this.gunPowerUpGlow.clear();
            const glowIntensity = 0.4 + Math.sin(time * 0.7) * 0.3;
            this.gunPowerUpGlow.beginFill(0x00ff00, glowIntensity); // Green glow for enhanced weapon
            this.gunPowerUpGlow.drawCircle(0, 0, 35);
            this.gunPowerUpGlow.endFill();

            // Add pulsing energy lines
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + time * 0.2;
                const x1 = Math.cos(angle) * 25;
                const y1 = Math.sin(angle) * 25;
                const x2 = Math.cos(angle) * 35;
                const y2 = Math.sin(angle) * 35;

                this.gunPowerUpGlow.lineStyle(2, 0x00ff00, glowIntensity);
                this.gunPowerUpGlow.moveTo(x1, y1);
                this.gunPowerUpGlow.lineTo(x2, y2);
            }
        } else if (this.gunPowerUpGlow) {
            this.gunPowerUpGlow.visible = false;
        }
    }

    /**
     * Update power-up timers - FIXED to only handle temporary effects
     */
    private updatePowerUps(deltaTime: number): void {
        // Speed boost (temporary)
        if (this.speedBoost) {
            this.speedBoostTimer -= deltaTime * 1000;
            if (this.speedBoostTimer <= 0) {
                this.speedBoost = false;
                console.log('⚡ Speed boost expired');
            }
        }

        // Rapid fire (temporary)
        if (this.rapidFire) {
            this.rapidFireTimer -= deltaTime * 1000;
            if (this.rapidFireTimer <= 0) {
                this.rapidFire = false;
                console.log('🔥 Rapid fire expired');
            }
        }

        // Spread shot (temporary)
        if (this.spreadShot) {
            this.spreadShotTimer -= deltaTime * 1000;
            if (this.spreadShotTimer <= 0) {
                this.spreadShot = false;
                console.log('💥 Spread shot expired');
            }
        }

        // Gun Power Up (temporary weapon enhancement)
        if (this.gunPowerUp) {
            this.gunPowerUpTimer -= deltaTime * 1000;
            if (this.gunPowerUpTimer <= 0) {
                this.deactivateGunPowerUp();
            }
        }
    }

    /**
     * Take damage - FIXED to use shield system for deflection
     */
    public takeDamage(amount: number): void {
        if (this.isDestroyed) return;

        // Check if shield is active (bullets should be deflected, not absorbed)
        if (this.shieldSystem.isShieldActive()) {
            // Shield deflects bullets - no damage taken, bullets redirected
            console.log('🛡️ Damage blocked by active shield deflection system');
            return;
        }

        this.health -= amount;
        this.damageFlashTimer = 0.5; // Flash for 0.5 seconds

        // Play hit sound
        AudioManager.play('tank_hit');

        // Tank took damage

        // Play danger warning when health is critically low (original Heavy Weapon style)
        if (this.health <= 25 && this.health > 0 && !(this as any).dangerWarningPlayed) {
            AudioManager.play('v_danger');
            (this as any).dangerWarningPlayed = true; // Only play once per life
            console.log('🚨 DANGER! Health critically low - played v_danger warning');
        }

        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        }
    }


    /**
     * Upgrade weapon system - AUTHENTIC Heavy Weapon individual weapon upgrade system
     * Based on Ghidra: WeaponUpgrade_AdjustLevel @ 0x0042feb0
     * Each weapon can be upgraded from level 0 (unavailable) to level 3 (max)
     */
    public upgradeWeapon(specificWeaponType?: WeaponType): void {
        // Define weapon acquisition order based on Ghidra analysis
        const weaponAcquisitionOrder = [
            WeaponType.STANDARD_GUN,    // Already at level 1 (starting weapon)
            WeaponType.DEFENSE_ORB,     // First available upgrade
            WeaponType.HOMING_MISSILES,
            WeaponType.LASER_CANNON,
            WeaponType.ROCKETS,
            WeaponType.FLAK_CANNON,
            WeaponType.THUNDERSTRIKE
        ];

        let weaponToUpgrade: WeaponType | null = null;

        if (specificWeaponType) {
            // Upgrade specific weapon if specified
            const currentLevel = this.weaponLevels.get(specificWeaponType) || 0;
            if (currentLevel < 3) {
                weaponToUpgrade = specificWeaponType;
            }
        } else {
            // Auto-select next weapon to upgrade based on acquisition order
            for (const weaponType of weaponAcquisitionOrder) {
                const currentLevel = this.weaponLevels.get(weaponType) || 0;

                if (currentLevel === 0 && weaponType !== WeaponType.STANDARD_GUN) {
                    // First time acquiring this weapon (0 -> 1)
                    weaponToUpgrade = weaponType;
                    break;
                } else if (currentLevel > 0 && currentLevel < 3) {
                    // Upgrade existing weapon (1->2, 2->3)
                    weaponToUpgrade = weaponType;
                    break;
                }
            }
        }

        if (weaponToUpgrade !== null) {
            const currentLevel = this.weaponLevels.get(weaponToUpgrade) || 0;
            const newLevel = currentLevel + 1;

            // Update weapon level
            this.weaponLevels.set(weaponToUpgrade, newLevel);

            // Add to active weapons if first time acquiring (level 0 -> 1)
            if (currentLevel === 0) {
                this.activeWeapons.push(weaponToUpgrade);
            }

            // Apply upgrade to weapon instance
            const weapon = this.weapons.get(weaponToUpgrade)!;
            if (weapon && typeof weapon.upgrade === 'function') {
                weapon.upgrade();
            }

            // Refill ammo for upgraded weapon
            weapon.refillAmmo();

            // Play upgrade sound based on level (matching Ghidra sound IDs 0x12, 0x15)
            const soundId = newLevel === 1 ? 'weapon_acquire' : 'weapon_upgrade';
            AudioManager.play(soundId);

            console.log(`🔫 WEAPON UPGRADED: ${WeaponType[weaponToUpgrade]} Level ${currentLevel} → ${newLevel}`);
            console.log(`🔫 Active Arsenal: ${this.activeWeapons.map(w => `${WeaponType[w]}(L${this.weaponLevels.get(w)})`).join(', ')}`);
        } else {
            // All weapons at max level - give bonus score
            this.game.getScoreManager().addScore(5000); // Max arsenal bonus
            AudioManager.play('weapon_maxed');
            console.log(`🔫 ALL WEAPONS AT MAXIMUM LEVEL - 5000 bonus points!`);
        }
    }

    /**
     * Get weapon upgrade level for UI display
     */
    public getWeaponLevel(weaponType: WeaponType): number {
        return this.weaponLevels.get(weaponType) || 0;
    }

    /**
     * Check if weapon is available (level > 0)
     */
    public hasWeapon(weaponType: WeaponType): boolean {
        return (this.weaponLevels.get(weaponType) || 0) > 0;
    }

    /**
     * Activate shield deflection system (not health boost!)
     * Based on Ghidra: PowerUp_ProcessShield and Craft_ProcessDeflector
     */
    public activateShieldDeflection(duration: number): void {
        this.shieldSystem.activate(duration);
        console.log(`🛡️ Shield deflection activated for ${duration}ms`);
    }


    /**
     * Get primary weapon (for compatibility)
     */
    public getCurrentWeapon(): Weapon {
        // Return first active weapon (usually Standard Gun)
        return this.weapons.get(this.activeWeapons[0])!;
    }

    /**
     * Get total ammo across all active weapons
     */
    public getCurrentAmmo(): number {
        let totalAmmo = 0;
        for (const weaponType of this.activeWeapons) {
            const weapon = this.weapons.get(weaponType)!;
            totalAmmo += weapon.getAmmo();
        }
        return totalAmmo;
    }

    /**
     * Get all active weapons
     */
    public getActiveWeapons(): WeaponType[] {
        return [...this.activeWeapons]; // Return copy to prevent modification
    }


    /**
     * Legacy shield method - redirects to proper deflection system
     */
    public activateShield(duration: number): void {
        this.activateShieldDeflection(duration);
    }

    /**
     * Activate mega laser power-up
     */
    public activateMegaLaser(duration: number): void {
        // Don't activate if already active
        if (this.megaLaser && this.megaLaser.isLaserActive()) {
            return;
        }

        // Create and activate mega laser
        this.megaLaser = new MegaLaser(this.game);
        this.megaLaser.activate();

        console.log(`Mega laser activated for ${duration}ms`);
    }

    /**
     * Activate speed boost power-up
     */
    public activateSpeedBoost(duration: number): void {
        this.speedBoost = true;
        this.speedBoostTimer = duration;
        AudioManager.play('speed_boost');
    }

    /**
     * Activate rapid fire power-up
     */
    public activateRapidFire(duration: number): void {
        this.rapidFire = true;
        this.rapidFireTimer = duration;
        AudioManager.play('rapid_fire');
    }

    /**
     * Activate spread shot power-up
     */
    public activateSpreadShot(duration: number): void {
        this.spreadShot = true;
        this.spreadShotTimer = duration;
        AudioManager.play('spread_shot');
    }

    /**
     * Activate Gun Power Up - TEMPORARY weapon enhancement (survival mode)
     * Based on Ghidra: PowerUp_ProcessGunPowerUp
     * This enhances existing weapon instead of adding new weapons!
     */
    public activateGunPowerUp(duration: number): void {
        if (!this.gunPowerUp) {
            // Store original gun stats for restoration
            const standardGun = this.weapons.get(WeaponType.STANDARD_GUN)!;
            this.originalGunStats = {
                damage: (standardGun as any).damage,
                fireRate: standardGun.getFireRate()
            };

            // Apply temporary enhancements to existing weapon
            (standardGun as any).damage = Math.floor(this.originalGunStats.damage * 2.5); // 150% more damage
            (standardGun as any).fireRate = Math.floor(this.originalGunStats.fireRate * 0.6); // 40% faster fire rate

            this.gunPowerUp = true;
        }

        // Reset/extend timer
        this.gunPowerUpTimer = duration;

        AudioManager.playTempPowerup('gun_power');
        console.log('🔫 GUN POWER UP ACTIVATED: Enhanced damage and fire rate for existing weapon');
    }

    /**
     * Deactivate Gun Power Up - restore original weapon stats
     */
    private deactivateGunPowerUp(): void {
        if (this.gunPowerUp && this.originalGunStats) {
            // Restore original weapon stats
            const standardGun = this.weapons.get(WeaponType.STANDARD_GUN)!;
            (standardGun as any).damage = this.originalGunStats.damage;
            (standardGun as any).fireRate = this.originalGunStats.fireRate;

            this.gunPowerUp = false;
            this.originalGunStats = null;

            console.log('🔫 Gun Power Up expired - weapon stats restored to normal');
        }
    }

    /**
     * Heal the tank
     */
    public heal(amount: number): void {
        this.health = Math.min(this.health + amount, this.maxHealth);
        AudioManager.play('health_pickup');
    }

    /**
     * Check if shield is active
     */
    public hasShield(): boolean {
        return this.shieldSystem.isShieldActive();
    }

    /**
     * Check if speed boost is active
     */
    public hasSpeedBoost(): boolean {
        return this.speedBoost;
    }

    /**
     * Check if rapid fire is active
     */
    public hasRapidFire(): boolean {
        return this.rapidFire;
    }

    /**
     * Check if spread shot is active
     */
    public hasSpreadShot(): boolean {
        return this.spreadShot;
    }

    /**
     * Create shell casing after firing - AUTHENTIC Heavy Weapon system
     * Based on Ghidra: Player_UpdateTank calls GameObject_Create8Parameters after firing
     * Creates spent shell casing with physics matching original game
     */
    private createShellCasing(muzzleX: number, muzzleY: number, angle: number): void {
        // AUTHENTIC: Shell casing physics from Ghidra analysis
        // Original uses complex floating-point calculations for ejection velocity
        const shellEjectionAngle = angle + Math.PI / 2; // Perpendicular to gun barrel
        const shellEjectionSpeed = 150; // pixels per second

        // AUTHENTIC: Shell casing spawn position calculation (matches original offset logic)
        const shellSpawnX = this.x - Math.cos(shellEjectionAngle) * 15; // Offset from tank center
        const shellSpawnY = this.y - Math.sin(shellEjectionAngle) * 8 + 10; // Below tank, offset right

        // AUTHENTIC: Shell casing velocity with original physics
        const shellVelocityX = Math.cos(shellEjectionAngle) * shellEjectionSpeed * (0.5 + Math.random() * 0.5);
        const shellVelocityY = Math.sin(shellEjectionAngle) * shellEjectionSpeed * (0.3 + Math.random() * 0.4);

        // AUTHENTIC: Create shell casing particle (matches GameObject_Create8Parameters structure)
        const particleSystem = this.game.getParticleSystem();
        if (particleSystem && typeof (particleSystem as any).createShellCasing === 'function') {
            (particleSystem as any).createShellCasing(
                shellSpawnX,
                shellSpawnY,
                shellVelocityX,
                shellVelocityY,
                1500 // 1.5 second lifetime
            );
        } else {
            // Fallback: Create small explosion particle
            if (particleSystem && typeof particleSystem.createExplosion === 'function') {
                particleSystem.createExplosion(shellSpawnX, shellSpawnY, 'tiny');
            }
        }
    }

    /**
     * Update tank movement traces - AUTHENTIC Heavy Weapon dust trail system
     * Based on Ghidra: Player_UpdateTank maintains linked list @ param_1 + 0x28c for movement tracking
     * Creates dust particles when tank moves, matching original Particles_UpdateSmoke behavior
     */
    private updateMovementTraces(deltaTime: number): void {
        this.traceUpdateTimer += deltaTime * 1000; // Convert to ms

        // AUTHENTIC: Update traces at regular intervals (matches original frame-based system)
        if (this.traceUpdateTimer >= this.TRACE_UPDATE_INTERVAL) {
            this.traceUpdateTimer = 0;

            // Calculate movement since last trace
            const distanceMoved = Math.sqrt(
                Math.pow(this.x - this.lastTracePosition.x, 2) +
                Math.pow(this.y - this.lastTracePosition.y, 2)
            );

            // AUTHENTIC: Only create traces when tank is moving significantly (matches original threshold)
            if (distanceMoved > 2 && Math.abs(this.velocity.x) > 5) {
                // Add new trace point
                this.movementTraces.push({
                    x: this.x,
                    y: this.y + 15, // Below tank center (track/wheel position)
                    velocity: Math.abs(this.velocity.x),
                    timestamp: Date.now()
                });

                // AUTHENTIC: Create dust particles at tank tracks (matches Particles_UpdateSmoke)
                this.createMovementDustParticles();

                // Update last trace position
                this.lastTracePosition.x = this.x;
                this.lastTracePosition.y = this.y;

                // AUTHENTIC: Maintain maximum trace points (matches original linked list management)
                if (this.movementTraces.length > this.MAX_TRACE_POINTS) {
                    this.movementTraces.shift(); // Remove oldest trace
                }
            }
        }

        // AUTHENTIC: Clean up old traces (matches original lifetime management)
        const currentTime = Date.now();
        this.movementTraces = this.movementTraces.filter(trace =>
            currentTime - trace.timestamp < 2000 // 2 second lifetime
        );
    }

    /**
     * Create dust particles for tank movement - AUTHENTIC Heavy Weapon particle system
     * Based on Ghidra: Particles_UpdateSmoke creates movement effects
     */
    private createMovementDustParticles(): void {
        const particleSystem = this.game.getParticleSystem();
        if (!particleSystem) return;

        // AUTHENTIC: Create multiple dust particles for realistic effect (matches original particle count)
        const particleCount = Math.min(3, Math.floor(Math.abs(this.velocity.x) / 50) + 1);

        for (let i = 0; i < particleCount; i++) {
            // AUTHENTIC: Particle spawn position at tank tracks
            const dustX = this.x + (Math.random() - 0.5) * 20; // Random spread
            const dustY = this.y + 15 + (Math.random() - 0.5) * 5; // At track level

            // AUTHENTIC: Particle velocity based on tank movement (matches original physics)
            const dustVelX = -this.velocity.x * 0.3 + (Math.random() - 0.5) * 30;
            const dustVelY = -20 - Math.random() * 20; // Upward with randomness

            // Create dust particle using existing particle system
            if (typeof (particleSystem as any).createDustParticle === 'function') {
                (particleSystem as any).createDustParticle(dustX, dustY, dustVelX, dustVelY, 800);
            } else if (typeof particleSystem.createExplosion === 'function') {
                // Fallback: Small explosion for dust effect
                particleSystem.createExplosion(dustX, dustY, 'tiny');
            }
        }
    }

    /**
     * Get remaining shield time in milliseconds
     */
    public getShieldTimeLeft(): number {
        return this.shieldSystem.getTimeRemaining();
    }

    /**
     * Get remaining speed boost time in milliseconds
     */
    public getSpeedBoostTimeLeft(): number {
        return this.speedBoost ? this.speedBoostTimer : 0;
    }

    /**
     * Get remaining rapid fire time in milliseconds
     */
    public getRapidFireTimeLeft(): number {
        return this.rapidFire ? this.rapidFireTimer : 0;
    }

    /**
     * Get remaining spread shot time in milliseconds
     */
    public getSpreadShotTimeLeft(): number {
        return this.spreadShot ? this.spreadShotTimer : 0;
    }

    /**
     * Check if gun power up is active
     */
    public hasGunPowerUp(): boolean {
        return this.gunPowerUp;
    }

    /**
     * Get remaining gun power up time in milliseconds
     */
    public getGunPowerUpTimeLeft(): number {
        return this.gunPowerUp ? this.gunPowerUpTimer : 0;
    }

    /**
     * Get bounds for collision detection - Only tank body, not turret (per original code)
     */
    public getBounds(): PIXI.Rectangle {
        // Return empty bounds if destroyed
        if (this.isDestroyed) {
            return new PIXI.Rectangle(0, 0, 0, 0);
        }

        // Try to get position safely
        let xPos = 0;
        let yPos = 0;

        try {
            xPos = this.x || 0;
            yPos = this.y || 0;
        } catch (e) {
            // If accessing position throws (because object is destroyed), use defaults
            console.warn('Tank position inaccessible, using default bounds');
        }

        // Use smaller collision bounds to match original - only tank body, not gun
        // Original excludes gun sprite (0x6d4) from collision detection
        // FIXED: Adjusted collision area for ground-level tank positioning
        return new PIXI.Rectangle(
            xPos - GameConstants.TANK_WIDTH / 2,
            yPos - GameConstants.TANK_HEIGHT / 2, // CORRECTED: No offset needed now that tank is properly positioned
            GameConstants.TANK_WIDTH,
            GameConstants.TANK_HEIGHT // Full tank height for proper powerup collection
        );
    }

    /**
     * Get turret bounds - separate from tank body for visual effects only
     */
    public getTurretBounds(): PIXI.Rectangle {
        if (this.isDestroyed) {
            return new PIXI.Rectangle(0, 0, 0, 0);
        }

        const turretWorldX = this.x + this.turret.x;
        const turretWorldY = this.y + this.turret.y;

        return new PIXI.Rectangle(
            turretWorldX - 20,
            turretWorldY - 30,
            40,
            60
        );
    }

    /**
     * Destroy tank
     */
    public destroy(): void {
        this.isDestroyed = true;

        // Clean up shield system
        if (this.shieldSystem) {
            this.shieldSystem.forceDeactivate();
        }

        // Clean up gun power up
        if (this.gunPowerUp) {
            this.deactivateGunPowerUp();
        }

        // Clean up mega laser
        if (this.megaLaser) {
            this.megaLaser.forceDeactivate();
            this.megaLaser = undefined;
        }

        super.destroy();
    }
}