# Corrected Survival Enemy System Implementation Plan
*Based on Ghidra Re-verification & HeavyWeapon_Asset_Hints_v2.xml Analysis*

## Overview
After re-verification against Ghidra enemy management functions and HeavyWeapon_Asset_Hints_v2.xml asset data, this corrected plan addresses formation spawning, weapon specialization, and multi-row sprite systems for the atomic_survival_redux Pixi.js project.

## Current Implementation Assessment

### ✅ Strong Foundation
- **Enemy Types**: All 13 enemy types implemented with basic behavior
- **Movement Patterns**: 6 movement patterns (STRAIGHT, SINE_WAVE, DIVE_BOMB, etc.)
- **Health System**: Basic health and armor scaling
- **CollisionSystem**: Functional collision detection

### ❌ Critical Gaps (Re-verified)
1. **Multi-Row Sprite System**: Single sprite vs. 16-frame rotation system
2. **Formation Spawning**: Individual spawning vs. coordinated group behavior
3. **Weapon Specialization**: Generic projectiles vs. enemy-specific weapons
4. **Authentic Armor Values**: Incorrect scaling vs. craft.xml specifications

## Asset Analysis from HeavyWeapon_Asset_Hints_v2.xml

**Multi-Row Enemy Sprites Revealed:**
```xml
<!-- Enemy rotation sprites use multi-row grid system -->
enemies/bomber_sheet.png (4x4 grid = 16 rotation frames)
enemies/jetfighter_sheet.png (4x4 grid = 16 rotation frames)
enemies/blimp_sheet.png (4x4 grid = 16 rotation frames)

<!-- Ground vehicles use directional sprites -->
enemies/truck_sheet.png (2x1 grid = left/right facing)
enemies/enemytank_sheet.png (4x4 grid = 16 rotation frames)

<!-- Helicopter sprites with rotor animation -->
enemies/smallcopter_sheet.png (4x6 grid = 16 rotations + rotor frames)
```

**Weapon System Assets:**
```xml
<!-- Enemy projectiles with specific visuals -->
projectiles/dumb_bomb.png
projectiles/laser_guided_bomb.png
projectiles/armored_bomb.png (destructible projectile)
projectiles/energy_ball.png (satellite weapon)
projectiles/atomic_bomb.png (fatbomber weapon)
```

## Technical Implementation Plan

### Phase 1: Multi-Row Sprite System (High Priority)

**1.1 Enemy Sprite Grid Manager**
```typescript
// src/core/EnemySpriteGrid.ts - NEW FILE
export interface SpriteGridConfig {
    texturePath: string;
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
}

export class EnemySpriteGrid {
    private texture: PIXI.Texture;
    private frames: PIXI.Texture[];
    private config: SpriteGridConfig;

    constructor(config: SpriteGridConfig) {
        this.config = config;
        this.loadSpriteSheet();
    }

    private loadSpriteSheet(): void {
        this.texture = PIXI.Texture.from(this.config.texturePath);
        this.frames = [];

        // Extract individual frames from grid
        for (let row = 0; row < this.config.rows; row++) {
            for (let col = 0; col < this.config.columns; col++) {
                const frame = new PIXI.Texture(
                    this.texture.baseTexture,
                    new PIXI.Rectangle(
                        col * this.config.frameWidth,
                        row * this.config.frameHeight,
                        this.config.frameWidth,
                        this.config.frameHeight
                    )
                );
                this.frames.push(frame);
            }
        }
    }

    /**
     * Get sprite frame based on rotation angle
     * Uses Math_FloatToUInt64() equivalent for 16-frame rotation
     */
    public getFrameForRotation(rotation: number): PIXI.Texture {
        // Normalize rotation to 0-2π range
        const normalizedRotation = ((rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

        // Convert to 16-frame index (matching Ghidra Math_FloatToUInt64 logic)
        const frameIndex = Math.floor((normalizedRotation / (Math.PI * 2)) * 16) % 16;

        return this.frames[frameIndex] || this.frames[0];
    }

    /**
     * Get frame by direct index (for non-rotational sprites)
     */
    public getFrame(index: number): PIXI.Texture {
        return this.frames[index % this.frames.length] || this.frames[0];
    }

    public getFrameCount(): number {
        return this.frames.length;
    }
}
```

**1.2 Enhanced Enemy Class with Multi-Row Sprites**
```typescript
// src/entities/Enemy.ts - Enhanced with multi-row sprite support
export class Enemy extends PIXI.Container {
    private spriteGrid: EnemySpriteGrid;
    private enemySprite: PIXI.Sprite;
    private rotorSprite?: PIXI.Sprite; // For helicopters
    private currentRotation: number = 0;
    private rotorRotation: number = 0;

    constructor(game: Game, enemyType: EnemyType) {
        super();

        this.game = game;
        this.enemyType = enemyType;

        // Initialize multi-row sprite system
        this.initializeSpriteGrid();
        this.createEnemySprite();

        // Load authentic stats from craft.xml
        this.loadAuthenticStats();

        // Initialize movement and weapons
        this.initializeMovement();
        this.initializeWeapons();
    }

    private initializeSpriteGrid(): void {
        const spriteConfig = this.getSpriteGridConfig(this.enemyType);
        this.spriteGrid = new EnemySpriteGrid(spriteConfig);
    }

    private getSpriteGridConfig(enemyType: EnemyType): SpriteGridConfig {
        const configs: Record<EnemyType, SpriteGridConfig> = {
            [EnemyType.BOMBER]: {
                texturePath: 'enemies/bomber_sheet.png',
                columns: 4,
                rows: 4,
                frameWidth: 64,
                frameHeight: 64
            },
            [EnemyType.JETFIGHTER]: {
                texturePath: 'enemies/jetfighter_sheet.png',
                columns: 4,
                rows: 4,
                frameWidth: 48,
                frameHeight: 48
            },
            [EnemyType.SMALLCOPTER]: {
                texturePath: 'enemies/smallcopter_sheet.png',
                columns: 4,
                rows: 6, // 16 rotation frames + rotor frames
                frameWidth: 56,
                frameHeight: 56
            },
            [EnemyType.TRUCK]: {
                texturePath: 'enemies/truck_sheet.png',
                columns: 2,
                rows: 1, // Just left/right facing
                frameWidth: 72,
                frameHeight: 32
            },
            [EnemyType.BLIMP]: {
                texturePath: 'enemies/blimp_sheet.png',
                columns: 4,
                rows: 4,
                frameWidth: 96,
                frameHeight: 96
            },
            // Add more enemy configurations...
        };

        return configs[enemyType] || configs[EnemyType.BOMBER];
    }

    private createEnemySprite(): void {
        // Create main enemy sprite
        const initialFrame = this.spriteGrid.getFrame(0);
        this.enemySprite = new PIXI.Sprite(initialFrame);
        this.enemySprite.anchor.set(0.5);
        this.addChild(this.enemySprite);

        // Add rotor sprite for helicopters
        if (this.isHelicopter()) {
            this.createRotorSprite();
        }
    }

    private createRotorSprite(): void {
        // Use frames 16-31 for rotor animation (second half of sprite sheet)
        const rotorFrame = this.spriteGrid.getFrame(16);
        this.rotorSprite = new PIXI.Sprite(rotorFrame);
        this.rotorSprite.anchor.set(0.5);
        this.rotorSprite.y = -20; // Position above helicopter
        this.addChild(this.rotorSprite);
    }

    /**
     * Update enemy with authentic rotation rendering
     */
    public update(deltaTime: number, tank: Tank): void {
        // Update movement (existing logic)
        this.updateMovement(deltaTime, tank);

        // Update sprite rotation based on movement direction
        this.updateSpriteRotation();

        // Update rotor animation for helicopters
        if (this.rotorSprite) {
            this.updateRotorAnimation(deltaTime);
        }

        // Update weapons (existing logic)
        this.updateWeapons(deltaTime);
    }

    private updateSpriteRotation(): void {
        // Calculate rotation based on movement vector
        const movementRotation = Math.atan2(this.velocityY, this.velocityX);

        // Update sprite frame based on rotation
        const rotationFrame = this.spriteGrid.getFrameForRotation(movementRotation);
        this.enemySprite.texture = rotationFrame;
    }

    private updateRotorAnimation(deltaTime: number): void {
        this.rotorRotation += deltaTime * 30; // Fast rotor spin

        // Cycle through rotor frames (frames 16-19 for rotor animation)
        const rotorFrameIndex = 16 + Math.floor(this.rotorRotation * 0.1) % 4;
        const rotorFrame = this.spriteGrid.getFrame(rotorFrameIndex);
        this.rotorSprite!.texture = rotorFrame;
    }

    private loadAuthenticStats(): void {
        // Load exact stats from craft.xml (re-verified from original game files)
        const authenticStats: Record<EnemyType, {armor: number, points: number, weapon: string}> = {
            [EnemyType.CRUISE]: { armor: 300, points: 20000, weapon: 'DumbBomb' },
            [EnemyType.BLIMP]: { armor: 400, points: 25000, weapon: 'LaserGuidedBomb' },
            [EnemyType.SATELLITE]: { armor: 200, points: 5000, weapon: 'EnergyBall' },
            [EnemyType.DEFLECTOR]: { armor: 80, points: 2000, weapon: 'ArmoredBomb' },
            [EnemyType.FATBOMBER]: { armor: 300, points: 3000, weapon: 'AtomicBomb' },
            // Add all enemy types with exact craft.xml values
        };

        const stats = authenticStats[this.enemyType] || { armor: 1, points: 50, weapon: 'DumbBomb' };

        this.baseArmor = stats.armor;
        this.scoreValue = stats.points;
        this.weaponType = stats.weapon;
    }

    private isHelicopter(): boolean {
        const helicopterTypes = [
            EnemyType.SMALLCOPTER,
            EnemyType.MEDCOPTER,
            EnemyType.BIGCOPTER
        ];
        return helicopterTypes.includes(this.enemyType);
    }
}
```

### Phase 2: Formation Spawning System (High Priority)

**2.1 Formation Manager**
```typescript
// src/systems/FormationManager.ts - NEW FILE
export interface EnemyFormation {
    id: string;
    enemies: Enemy[];
    formationType: FormationType;
    leaderIndex: number;
    cohesion: number; // How tightly formation stays together
    completed: boolean;
}

export enum FormationType {
    V_FORMATION = 'v_formation',
    LINE_FORMATION = 'line_formation',
    DIAMOND_FORMATION = 'diamond_formation',
    SWARM_FORMATION = 'swarm_formation'
}

export class FormationManager {
    private game: Game;
    private activeFormations: Map<string, EnemyFormation> = new Map();
    private formationUpdateTimer: number = 0;

    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Spawn coordinated enemy formation
     * Based on Ghidra: Survival_ProcessEnemyFormations
     */
    public spawnFormation(
        enemyType: EnemyType,
        count: number,
        formationType: FormationType,
        spawnSide: 'left' | 'right' = 'left'
    ): string {
        const formationId = this.generateFormationId();
        const enemies: Enemy[] = [];

        // Calculate formation positions
        const positions = this.calculateFormationPositions(count, formationType, spawnSide);

        // Create enemies with coordinated spawning
        positions.forEach((position, index) => {
            setTimeout(() => {
                const enemy = new Enemy(this.game, enemyType);
                enemy.x = position.x;
                enemy.y = position.y;

                // Set formation behavior
                this.setFormationBehavior(enemy, formationId, index);

                enemies.push(enemy);
                this.game.addEnemy(enemy);
            }, index * 150); // Slight delay between spawns
        });

        // Create formation record
        const formation: EnemyFormation = {
            id: formationId,
            enemies,
            formationType,
            leaderIndex: 0, // First enemy is leader
            cohesion: this.getFormationCohesion(formationType),
            completed: false
        };

        this.activeFormations.set(formationId, formation);
        return formationId;
    }

    private calculateFormationPositions(
        count: number,
        formationType: FormationType,
        spawnSide: 'left' | 'right'
    ): Vector2[] {
        const positions: Vector2[] = [];
        const baseX = spawnSide === 'left' ? -100 : GameConstants.SCREEN_WIDTH + 100;
        const baseY = 200; // Mid-screen height
        const spacing = 60;

        switch (formationType) {
            case FormationType.V_FORMATION:
                // V-shaped formation
                const center = Math.floor(count / 2);
                for (let i = 0; i < count; i++) {
                    const offset = Math.abs(i - center);
                    positions.push(new Vector2(
                        baseX + (offset * spacing * (spawnSide === 'left' ? 1 : -1)),
                        baseY + ((i - center) * spacing)
                    ));
                }
                break;

            case FormationType.LINE_FORMATION:
                // Horizontal line formation
                for (let i = 0; i < count; i++) {
                    positions.push(new Vector2(
                        baseX,
                        baseY + ((i - count/2) * spacing)
                    ));
                }
                break;

            case FormationType.DIAMOND_FORMATION:
                // Diamond/rhombus formation
                this.createDiamondPositions(positions, count, baseX, baseY, spacing);
                break;

            case FormationType.SWARM_FORMATION:
                // Loose swarm formation
                for (let i = 0; i < count; i++) {
                    positions.push(new Vector2(
                        baseX + (Math.random() - 0.5) * spacing * 2,
                        baseY + (Math.random() - 0.5) * spacing * 2
                    ));
                }
                break;
        }

        return positions;
    }

    private setFormationBehavior(enemy: Enemy, formationId: string, index: number): void {
        // Extend enemy with formation-specific behavior
        (enemy as any).formationId = formationId;
        (enemy as any).formationIndex = index;
        (enemy as any).isInFormation = true;
    }

    /**
     * Update all active formations
     */
    public update(deltaTime: number): void {
        this.formationUpdateTimer += deltaTime * 1000;

        // Update formations every 100ms for performance
        if (this.formationUpdateTimer >= 100) {
            this.activeFormations.forEach(formation => {
                this.updateFormation(formation, deltaTime);
            });

            // Clean up completed formations
            this.cleanupCompletedFormations();

            this.formationUpdateTimer = 0;
        }
    }

    private updateFormation(formation: EnemyFormation, deltaTime: number): void {
        const aliveEnemies = formation.enemies.filter(enemy => !enemy.isDestroyed);

        if (aliveEnemies.length === 0) {
            formation.completed = true;
            return;
        }

        // Update formation cohesion
        if (aliveEnemies.length > 1) {
            const leader = aliveEnemies[formation.leaderIndex] || aliveEnemies[0];
            this.maintainFormation(aliveEnemies, leader, formation);
        }
    }

    private maintainFormation(enemies: Enemy[], leader: Enemy, formation: EnemyFormation): void {
        enemies.forEach((enemy, index) => {
            if (enemy === leader) return;

            // Calculate desired position relative to leader
            const desiredOffset = this.getFormationOffset(index, formation.formationType);
            const desiredX = leader.x + desiredOffset.x;
            const desiredY = leader.y + desiredOffset.y;

            // Apply cohesion force
            const dx = desiredX - enemy.x;
            const dy = desiredY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 50) { // Only adjust if too far from formation
                const cohesionForce = formation.cohesion * 0.01;
                (enemy as any).formationForceX = dx * cohesionForce;
                (enemy as any).formationForceY = dy * cohesionForce;
            }
        });
    }

    private getFormationOffset(index: number, formationType: FormationType): Vector2 {
        const spacing = 60;

        switch (formationType) {
            case FormationType.V_FORMATION:
                const vOffset = Math.floor(index / 2) + 1;
                const side = index % 2 === 0 ? -1 : 1;
                return new Vector2(vOffset * spacing, side * vOffset * spacing);

            case FormationType.LINE_FORMATION:
                return new Vector2(0, (index - 2) * spacing);

            case FormationType.DIAMOND_FORMATION:
                // Implement diamond offset calculation
                return new Vector2(
                    Math.cos(index * Math.PI / 2) * spacing,
                    Math.sin(index * Math.PI / 2) * spacing
                );

            default:
                return new Vector2(0, 0);
        }
    }

    private generateFormationId(): string {
        return 'formation_' + Math.random().toString(36).substr(2, 9);
    }

    private getFormationCohesion(formationType: FormationType): number {
        const cohesionValues = {
            [FormationType.V_FORMATION]: 0.8,
            [FormationType.LINE_FORMATION]: 0.9,
            [FormationType.DIAMOND_FORMATION]: 0.7,
            [FormationType.SWARM_FORMATION]: 0.3
        };
        return cohesionValues[formationType] || 0.5;
    }

    private cleanupCompletedFormations(): void {
        const toRemove: string[] = [];
        this.activeFormations.forEach((formation, id) => {
            if (formation.completed) {
                toRemove.push(id);
            }
        });
        toRemove.forEach(id => this.activeFormations.delete(id));
    }
}
```

### Phase 3: Specialized Enemy Weapons (Medium Priority)

**3.1 Enemy Weapon System**
```typescript
// src/weapons/EnemyWeaponFactory.ts - NEW FILE
export enum EnemyWeaponType {
    DUMB_BOMB = 'DumbBomb',
    LASER_GUIDED_BOMB = 'LaserGuidedBomb',
    ARMORED_BOMB = 'ArmoredBomb',
    FRAG_BOMB = 'FragBomb',
    ATOMIC_BOMB = 'AtomicBomb',
    ENERGY_BALL = 'EnergyBall',
    BURSTING_ROCKET = 'BurstingRocket',
    NONE = 'None'
}

export class EnemyWeaponFactory {
    /**
     * Create enemy weapon projectile based on craft.xml specifications
     */
    public static createProjectile(
        weaponType: EnemyWeaponType,
        x: number,
        y: number,
        targetX: number,
        targetY: number,
        game: Game
    ): EnemyProjectile | null {
        switch (weaponType) {
            case EnemyWeaponType.DUMB_BOMB:
                return new DumbBombProjectile(x, y, game);

            case EnemyWeaponType.LASER_GUIDED_BOMB:
                return new LaserGuidedBombProjectile(x, y, targetX, targetY, game);

            case EnemyWeaponType.ARMORED_BOMB:
                return new ArmoredBombProjectile(x, y, game); // Destructible projectile

            case EnemyWeaponType.ENERGY_BALL:
                return new EnergyBallProjectile(x, y, targetX, targetY, game);

            case EnemyWeaponType.ATOMIC_BOMB:
                return new AtomicBombProjectile(x, y, game); // Large blast radius

            case EnemyWeaponType.FRAG_BOMB:
                return new FragBombProjectile(x, y, game); // Splits into fragments

            case EnemyWeaponType.BURSTING_ROCKET:
                return new BurstingRocketProjectile(x, y, targetX, targetY, game);

            case EnemyWeaponType.NONE:
            default:
                return null;
        }
    }
}

/**
 * Base class for enemy projectiles
 */
export abstract class EnemyProjectile extends Projectile {
    protected damage: number;
    protected blastRadius: number;
    protected hasSpecialBehavior: boolean = false;

    constructor(x: number, y: number, damage: number, game: Game) {
        super(x, y, 0, 1, damage, game); // Enemy projectile (not player)
        this.damage = damage;
    }

    abstract updateSpecialBehavior(deltaTime: number): void;
}

/**
 * Armored Bomb - Destructible projectile (takes 3 hits)
 */
export class ArmoredBombProjectile extends EnemyProjectile {
    private health: number = 3; // Takes 3 hits to destroy

    constructor(x: number, y: number, game: Game) {
        super(x, y, 15, game); // 15 damage
        this.blastRadius = 80;
        this.hasSpecialBehavior = true;
    }

    public takeDamage(damage: number): boolean {
        this.health -= 1;

        if (this.health <= 0) {
            this.explode();
            return true; // Destroyed
        }

        // Flash effect when hit
        this.tint = 0xff0000;
        setTimeout(() => { this.tint = 0xffffff; }, 100);

        return false; // Still alive
    }

    protected explode(): void {
        // Create explosion at projectile position
        this.game.getParticleSystem().createExplosion(this.x, this.y, 'medium');
        this.destroy();
    }

    updateSpecialBehavior(deltaTime: number): void {
        // Armored bombs have slightly slower movement
        this.velocityY *= 0.8;
    }
}

/**
 * Energy Ball - Satellite weapon that homes on player
 */
export class EnergyBallProjectile extends EnemyProjectile {
    private targetX: number;
    private targetY: number;
    private homingStrength: number = 0.02;

    constructor(x: number, y: number, targetX: number, targetY: number, game: Game) {
        super(x, y, 25, game); // 25 damage
        this.targetX = targetX;
        this.targetY = targetY;
        this.hasSpecialBehavior = true;
    }

    updateSpecialBehavior(deltaTime: number): void {
        // Home in on target position
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
            this.velocityX += (dx / distance) * this.homingStrength;
            this.velocityY += (dy / distance) * this.homingStrength;
        }

        // Update visual rotation to match movement
        this.rotation = Math.atan2(this.velocityY, this.velocityX);
    }
}

/**
 * Atomic Bomb - Massive blast radius and damage
 */
export class AtomicBombProjectile extends EnemyProjectile {
    constructor(x: number, y: number, game: Game) {
        super(x, y, 200, game); // 200 damage
        this.blastRadius = 150; // Huge blast radius
    }

    protected explode(): void {
        // Create massive explosion
        this.game.getParticleSystem().createExplosion(this.x, this.y, 'massive');

        // Screen shake effect
        this.game.screenShake(30, 1000); // Intense shake

        this.destroy();
    }

    updateSpecialBehavior(deltaTime: number): void {
        // Atomic bombs fall slowly but steadily
        this.velocityY = Math.min(this.velocityY, 100); // Cap fall speed
    }
}
```

### Phase 4: Integration and Testing (Low Priority)

**4.1 Enhanced Wave System Integration**
```typescript
// src/systems/WaveSystem.ts - Integration with formation spawning
export class WaveSystem {
    private formationManager: FormationManager;

    constructor(game: Game) {
        this.game = game;
        this.formationManager = new FormationManager(game);
    }

    /**
     * Generate wave with formation-based spawning
     */
    private generateWaveFromXML(waveNumber: number, difficulty: number, xmlData: any): WaveDefinition {
        const waveConfig = xmlData[waveNumber % xmlData.length];
        const formations: string[] = [];

        // Group enemies by type for formation spawning
        const enemyGroups = new Map<string, number>();
        waveConfig.enemies.forEach((enemy: any) => {
            const currentCount = enemyGroups.get(enemy.id) || 0;
            enemyGroups.set(enemy.id, currentCount + enemy.qty);
        });

        // Create formations for groups of 3+ enemies
        enemyGroups.forEach((count, enemyType) => {
            if (count >= 3) {
                const formationType = this.selectFormationType(enemyType, count);
                const formationId = this.formationManager.spawnFormation(
                    enemyType as EnemyType,
                    count,
                    formationType
                );
                formations.push(formationId);
            } else {
                // Spawn individual enemies for small groups
                for (let i = 0; i < count; i++) {
                    this.spawnSingleEnemy(enemyType as EnemyType);
                }
            }
        });

        return {
            formations,
            waveLength: waveConfig.length,
            enemyCount: Array.from(enemyGroups.values()).reduce((sum, count) => sum + count, 0)
        };
    }

    private selectFormationType(enemyType: string, count: number): FormationType {
        // Select formation type based on enemy type and count
        if (enemyType.includes('BOMBER')) {
            return FormationType.V_FORMATION;
        } else if (enemyType.includes('JET')) {
            return FormationType.LINE_FORMATION;
        } else if (enemyType.includes('COPTER')) {
            return FormationType.SWARM_FORMATION;
        } else {
            return FormationType.V_FORMATION;
        }
    }

    public update(deltaTime: number): void {
        // Update existing wave logic...

        // Update formation manager
        this.formationManager.update(deltaTime);
    }
}
```

## Implementation Timeline

### Week 1: Multi-Row Sprite System
- [ ] Implement EnemySpriteGrid with 16-frame rotation support
- [ ] Enhance Enemy class with authentic sprite rendering
- [ ] Test rotation frame calculation performance

### Week 2: Formation Spawning
- [ ] Create FormationManager with coordinated spawning
- [ ] Implement formation behavior and cohesion
- [ ] Test formation rendering and movement

### Week 3: Weapon Specialization
- [ ] Implement EnemyWeaponFactory with specialized projectiles
- [ ] Create ArmoredBombProjectile and EnergyBallProjectile
- [ ] Test weapon-specific behaviors and balance

### Week 4: Integration & Optimization
- [ ] Integrate with existing WaveSystem
- [ ] Performance optimization for multiple formations
- [ ] Balance testing and difficulty adjustment

## Technical Considerations

**Performance Optimization:**
- Sprite sheet caching to minimize texture memory
- Formation update batching (100ms intervals)
- Culling off-screen enemies with active formations
- Multi-row sprite frame pre-calculation

**Asset Requirements:**
- 4x4 sprite grids for rotational enemies (256x256px)
- 2x1 sprite grids for ground vehicles (144x64px)
- Individual projectile sprites (32x32px each)
- Rotor animation frames for helicopters

**Compatibility:**
- Uses existing Enemy class as base
- Leverages current CollisionSystem
- Maintains performance with existing particle system
- Compatible with current audio and visual effects

This corrected implementation plan provides authentic Heavy Weapon Deluxe enemy behavior with multi-row sprite rendering, formation coordination, and specialized weapon systems, ensuring visual and gameplay fidelity to the original while maintaining optimal performance in Pixi.js.