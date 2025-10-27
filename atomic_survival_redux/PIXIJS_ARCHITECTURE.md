# PixiJS Architecture Blueprint

## Technical Architecture for Atomic Survival Redux

This document provides the PixiJS-specific implementation architecture for recreating Heavy Weapon's survival mode.

## Core Architecture

### Application Structure
```typescript
// src/core/Game.ts
import * as PIXI from 'pixi.js';

export class Game {
    private app: PIXI.Application;
    private stage: PIXI.Container;
    private gameContainer: PIXI.Container;
    private uiContainer: PIXI.Container;

    constructor() {
        // Modern PixiJS v7 setup
        this.app = new PIXI.Application({
            width: 1280,
            height: 720,
            backgroundColor: 0x1099bb,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true,
            powerPreference: 'high-performance'
        });

        document.body.appendChild(this.app.view as HTMLCanvasElement);

        // Container hierarchy
        this.stage = this.app.stage;
        this.gameContainer = new PIXI.Container();
        this.uiContainer = new PIXI.Container();

        // Layer ordering (back to front)
        this.stage.addChild(this.gameContainer);
        this.stage.addChild(this.uiContainer);

        // Start game loop
        this.app.ticker.add(this.gameLoop.bind(this));
    }

    private gameLoop(delta: number): void {
        const deltaTime = delta / 60; // Normalize to 60fps
        this.update(deltaTime);
        this.render();
    }
}
```

### Layer Management
```typescript
// src/core/LayerManager.ts
export class LayerManager {
    private layers: Map<string, PIXI.Container>;

    constructor(parent: PIXI.Container) {
        this.layers = new Map();

        // Create layers in z-order
        const layerNames = [
            'background',    // Parallax backgrounds
            'ground',        // Ground layer
            'shadows',       // Entity shadows
            'enemies',       // Enemy sprites
            'powerups',      // Power-up items
            'tank',          // Player tank
            'projectiles',   // All projectiles
            'explosions',    // Explosion effects
            'particles',     // Particle effects
            'ui'            // HUD elements
        ];

        layerNames.forEach((name, index) => {
            const layer = new PIXI.Container();
            layer.zIndex = index;
            this.layers.set(name, layer);
            parent.addChild(layer);
        });

        // Enable sorting
        parent.sortableChildren = true;
    }

    getLayer(name: string): PIXI.Container {
        return this.layers.get(name)!;
    }
}
```

## Entity System

### Base Entity Class
```typescript
// src/entities/Entity.ts
export abstract class Entity extends PIXI.Container {
    protected velocity: PIXI.Point;
    protected sprite: PIXI.Sprite;
    protected bounds: PIXI.Rectangle;
    protected health: number;
    protected maxHealth: number;

    constructor(texture: PIXI.Texture) {
        super();

        this.sprite = new PIXI.Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.addChild(this.sprite);

        this.velocity = new PIXI.Point(0, 0);
        this.bounds = this.sprite.getBounds();
    }

    abstract update(delta: number): void;

    // Optimized collision check
    intersects(other: Entity): boolean {
        return this.bounds.intersects(other.bounds);
    }

    takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0) {
            this.destroy();
        }
    }

    destroy(): void {
        // Clean removal from parent
        if (this.parent) {
            this.parent.removeChild(this);
        }
        super.destroy({ children: true });
    }
}
```

### Tank Implementation
```typescript
// src/entities/Tank.ts
export class Tank extends Entity {
    private weapons: Weapon[];
    private currentWeaponIndex: number = 0;
    private inputHandler: InputHandler;
    private fireTimer: number = 0;

    constructor(textures: TankTextures) {
        super(textures.body);

        // Composite sprite structure
        this.turret = new PIXI.Sprite(textures.turret);
        this.turret.anchor.set(0.5, 0.8);
        this.addChild(this.turret);

        // Initialize weapons
        this.weapons = [new StandardGun()];

        // Setup input
        this.inputHandler = new InputHandler();
    }

    update(delta: number): void {
        // Handle input
        const input = this.inputHandler.getInput();

        // Movement with acceleration
        if (input.left) {
            this.velocity.x = Math.max(
                this.velocity.x - ACCELERATION * delta,
                -MAX_SPEED
            );
        } else if (input.right) {
            this.velocity.x = Math.min(
                this.velocity.x + ACCELERATION * delta,
                MAX_SPEED
            );
        } else {
            // Deceleration
            this.velocity.x *= 0.9;
        }

        // Update position
        this.x += this.velocity.x * delta;
        this.x = Math.max(50, Math.min(1230, this.x));

        // Aim turret at mouse
        const mousePos = this.inputHandler.getMousePosition();
        const angle = Math.atan2(
            mousePos.y - this.y,
            mousePos.x - this.x
        );
        this.turret.rotation = angle + Math.PI / 2;

        // Handle firing
        this.fireTimer -= delta;
        if (input.fire && this.fireTimer <= 0) {
            this.fire();
            this.fireTimer = this.weapons[this.currentWeaponIndex].fireRate;
        }

        // Update bounds for collision
        this.bounds = this.getBounds();
    }

    private fire(): void {
        const weapon = this.weapons[this.currentWeaponIndex];
        weapon.fire(this.x, this.y, this.turret.rotation);
    }
}
```

### Enemy System
```typescript
// src/entities/Enemy.ts
export class Enemy extends Entity {
    protected enemyType: EnemyType;
    protected movementPattern: MovementPattern;
    protected weapon: EnemyWeapon;
    protected pointValue: number;

    constructor(type: EnemyType, config: EnemyConfig) {
        super(config.texture);

        this.enemyType = type;
        this.health = config.health;
        this.maxHealth = config.health;
        this.pointValue = config.points;

        // Setup movement pattern
        this.movementPattern = MovementFactory.create(config.movement);

        // Setup weapon if applicable
        if (config.weapon) {
            this.weapon = WeaponFactory.createEnemyWeapon(config.weapon);
        }

        // Add health bar
        this.createHealthBar();
    }

    private createHealthBar(): void {
        const bar = new PIXI.Graphics();
        bar.beginFill(0x00ff00);
        bar.drawRect(-20, -30, 40, 4);
        bar.endFill();
        this.addChild(bar);
    }

    update(delta: number, tankPosition: PIXI.Point): void {
        // Update movement
        this.movementPattern.update(this, delta, tankPosition);

        // Update weapon
        if (this.weapon) {
            this.weapon.update(delta, this.position, tankPosition);
        }

        // Check if off-screen
        if (this.x < -100 || this.x > 1380 || this.y > 820) {
            this.destroy();
        }

        this.bounds = this.getBounds();
    }
}
```

## Resource Management

### Asset Loader
```typescript
// src/core/AssetLoader.ts
export class AssetLoader {
    private static instance: AssetLoader;
    private textures: Map<string, PIXI.Texture>;
    private sounds: Map<string, Howl>;

    static async loadAll(): Promise<void> {
        const loader = PIXI.Assets;

        // Add all assets to load queue
        const manifest = {
            bundles: [
                {
                    name: 'game',
                    assets: [
                        // Tank assets
                        { alias: 'tank_body', src: 'assets/tank/body.png' },
                        { alias: 'tank_turret', src: 'assets/tank/turret.png' },

                        // Enemy assets
                        { alias: 'enemy_fighter', src: 'assets/enemies/fighter.png' },
                        { alias: 'enemy_bomber', src: 'assets/enemies/bomber.png' },
                        { alias: 'enemy_helicopter', src: 'assets/enemies/helicopter.png' },

                        // Projectiles
                        { alias: 'bullet', src: 'assets/projectiles/bullet.png' },
                        { alias: 'missile', src: 'assets/projectiles/missile.png' },
                        { alias: 'bomb', src: 'assets/projectiles/bomb.png' },

                        // Effects
                        { alias: 'explosion', src: 'assets/effects/explosion.json' },
                        { alias: 'smoke', src: 'assets/effects/smoke.png' },

                        // UI
                        { alias: 'health_bar', src: 'assets/ui/health.png' },
                        { alias: 'ammo_icon', src: 'assets/ui/ammo.png' }
                    ]
                }
            ]
        };

        await loader.init({ manifest });
        await loader.loadBundle('game');
    }

    static getTexture(name: string): PIXI.Texture {
        return PIXI.Assets.get(name);
    }
}
```

### Object Pooling
```typescript
// src/core/ObjectPool.ts
export class ObjectPool<T extends PIXI.DisplayObject> {
    private pool: T[] = [];
    private active: Set<T> = new Set();
    private createFn: () => T;
    private resetFn: (obj: T) => void;

    constructor(
        createFn: () => T,
        resetFn: (obj: T) => void,
        initialSize: number = 10
    ) {
        this.createFn = createFn;
        this.resetFn = resetFn;

        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    get(): T {
        let obj: T;

        if (this.pool.length > 0) {
            obj = this.pool.pop()!;
        } else {
            obj = this.createFn();
        }

        this.active.add(obj);
        this.resetFn(obj);
        return obj;
    }

    release(obj: T): void {
        if (this.active.has(obj)) {
            this.active.delete(obj);
            this.pool.push(obj);
            obj.visible = false;
        }
    }

    releaseAll(): void {
        this.active.forEach(obj => this.release(obj));
    }
}
```

## Systems

### Collision System
```typescript
// src/systems/CollisionSystem.ts
export class CollisionSystem {
    private quadTree: QuadTree;

    constructor(bounds: PIXI.Rectangle) {
        this.quadTree = new QuadTree(bounds, 4, 6);
    }

    update(
        playerProjectiles: Projectile[],
        enemyProjectiles: Projectile[],
        enemies: Enemy[],
        tank: Tank,
        powerUps: PowerUp[]
    ): void {
        // Clear and rebuild quadtree
        this.quadTree.clear();

        // Insert all entities
        enemies.forEach(e => this.quadTree.insert(e));
        enemyProjectiles.forEach(p => this.quadTree.insert(p));
        powerUps.forEach(p => this.quadTree.insert(p));

        // Check player projectiles vs enemies
        playerProjectiles.forEach(projectile => {
            const candidates = this.quadTree.retrieve(projectile);
            candidates.forEach(candidate => {
                if (candidate instanceof Enemy) {
                    if (projectile.intersects(candidate)) {
                        this.handleProjectileEnemyCollision(projectile, candidate);
                    }
                }
            });
        });

        // Check enemy projectiles vs tank
        const tankCandidates = this.quadTree.retrieve(tank);
        tankCandidates.forEach(candidate => {
            if (candidate instanceof Projectile) {
                if (tank.intersects(candidate)) {
                    this.handleProjectileTankCollision(candidate, tank);
                }
            }
        });

        // Check tank vs power-ups
        powerUps.forEach(powerUp => {
            if (tank.intersects(powerUp)) {
                this.handleTankPowerUpCollision(tank, powerUp);
            }
        });
    }

    private handleProjectileEnemyCollision(
        projectile: Projectile,
        enemy: Enemy
    ): void {
        enemy.takeDamage(projectile.damage);
        projectile.destroy();

        // Create explosion effect
        ParticleSystem.createExplosion(projectile.x, projectile.y);

        // Award points if enemy destroyed
        if (enemy.health <= 0) {
            ScoreManager.addKill(enemy);
        }
    }
}
```

### Wave System
```typescript
// src/systems/WaveSystem.ts
export class WaveSystem {
    private waveNumber: number = 0;
    private enemiesSpawned: number = 0;
    private enemiesInWave: number = 0;
    private spawnTimer: number = 0;
    private waveTimer: number = 0;
    private difficulty: number = 1.0;

    update(delta: number): Enemy[] {
        const newEnemies: Enemy[] = [];

        this.waveTimer -= delta;
        this.spawnTimer -= delta;

        // Start new wave
        if (this.waveTimer <= 0 && this.enemiesSpawned >= this.enemiesInWave) {
            this.startNewWave();
        }

        // Spawn enemy
        if (this.spawnTimer <= 0 && this.enemiesSpawned < this.enemiesInWave) {
            const enemy = this.spawnEnemy();
            newEnemies.push(enemy);
            this.enemiesSpawned++;
            this.spawnTimer = this.calculateSpawnDelay();
        }

        return newEnemies;
    }

    private startNewWave(): void {
        this.waveNumber++;
        this.enemiesSpawned = 0;

        // Calculate wave parameters
        this.enemiesInWave = 6 + Math.floor(this.waveNumber / 2);
        this.waveTimer = Math.min(1000 + this.waveNumber * 50, 2900);

        // Update difficulty
        if (this.waveNumber % 5 === 0) {
            this.difficulty *= 1.2;
        }
    }

    private spawnEnemy(): Enemy {
        const types = this.getAvailableEnemyTypes();
        const type = types[Math.floor(Math.random() * types.length)];

        const config = EnemyConfigs[type];
        config.health *= this.difficulty;

        const enemy = new Enemy(type, config);

        // Random spawn position
        const side = Math.random() < 0.5 ? -50 : 1330;
        enemy.x = side;
        enemy.y = 50 + Math.random() * 250;

        return enemy;
    }

    private getAvailableEnemyTypes(): EnemyType[] {
        if (this.waveNumber < 5) {
            return [EnemyType.PROPFIGHTER, EnemyType.SMALLJET];
        } else if (this.waveNumber < 10) {
            return [EnemyType.BOMBER, EnemyType.JETFIGHTER];
        } else if (this.waveNumber < 20) {
            return [EnemyType.SMALLCOPTER, EnemyType.BIGBOMBER];
        } else {
            return Object.values(EnemyType);
        }
    }
}
```

### Particle System
```typescript
// src/systems/ParticleSystem.ts
export class ParticleSystem {
    private static emitters: Map<string, PIXI.particles.Emitter> = new Map();
    private static container: PIXI.Container;

    static init(container: PIXI.Container): void {
        this.container = container;

        // Pre-create emitter configurations
        this.createEmitterConfig('explosion', {
            lifetime: { min: 0.5, max: 1 },
            frequency: 0.001,
            emitterLifetime: 0.2,
            maxParticles: 100,
            addAtBack: false,
            behaviors: [
                {
                    type: 'alpha',
                    config: { alpha: { start: 1, end: 0 } }
                },
                {
                    type: 'scale',
                    config: { scale: { start: 1, end: 0.3 } }
                },
                {
                    type: 'moveSpeed',
                    config: { speed: { start: 200, end: 0 } }
                },
                {
                    type: 'rotation',
                    config: { rotation: { start: 0, end: 360 } }
                }
            ]
        });
    }

    static createExplosion(x: number, y: number, size: 'small' | 'large' = 'small'): void {
        const config = this.emitterConfigs.get('explosion');
        const emitter = new PIXI.particles.Emitter(this.container, config);

        emitter.updateOwnerPos(x, y);
        emitter.playOnceAndDestroy();

        // Screen shake for large explosions
        if (size === 'large') {
            this.container.parent.pivot.x += (Math.random() - 0.5) * 10;
            this.container.parent.pivot.y += (Math.random() - 0.5) * 10;
        }
    }
}
```

## Performance Optimization

### Render Optimization
```typescript
// src/core/RenderOptimizer.ts
export class RenderOptimizer {
    static setupRenderer(app: PIXI.Application): void {
        // Enable render batching
        app.renderer.plugins.batch.size = 4096;

        // Setup texture caching
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.ROUND_PIXELS = true;

        // Disable mipmapping for pixel art
        PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;

        // Setup render groups
        app.stage.enableTempDisplayObjectRemoval = true;
    }

    static createSpriteBatch(textures: PIXI.Texture[]): PIXI.ParticleContainer {
        return new PIXI.ParticleContainer(1000, {
            scale: true,
            position: true,
            rotation: true,
            tint: true,
            alpha: true
        });
    }
}
```

### Memory Management
```typescript
// src/core/MemoryManager.ts
export class MemoryManager {
    private static pools: Map<string, ObjectPool<any>> = new Map();

    static init(): void {
        // Create object pools
        this.pools.set('projectile', new ObjectPool(
            () => new Projectile(),
            (p) => p.reset(),
            100
        ));

        this.pools.set('particle', new ObjectPool(
            () => new PIXI.Sprite(),
            (s) => { s.visible = false; s.alpha = 1; },
            500
        ));

        this.pools.set('enemy', new ObjectPool(
            () => new Enemy(),
            (e) => e.reset(),
            50
        ));
    }

    static getFromPool<T>(poolName: string): T {
        return this.pools.get(poolName)?.get();
    }

    static returnToPool(poolName: string, obj: any): void {
        this.pools.get(poolName)?.release(obj);
    }

    static cleanup(): void {
        this.pools.forEach(pool => pool.releaseAll());
    }
}
```

## Input Handling

### Input System
```typescript
// src/input/InputHandler.ts
export class InputHandler {
    private keys: Map<string, boolean> = new Map();
    private mousePosition: PIXI.Point = new PIXI.Point();
    private mouseDown: boolean = false;

    constructor(view: HTMLCanvasElement) {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys.set(e.code, true);
            e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys.set(e.code, false);
            e.preventDefault();
        });

        // Mouse events
        view.addEventListener('mousemove', (e) => {
            const rect = view.getBoundingClientRect();
            this.mousePosition.x = (e.clientX - rect.left) * (1280 / rect.width);
            this.mousePosition.y = (e.clientY - rect.top) * (720 / rect.height);
        });

        view.addEventListener('mousedown', () => this.mouseDown = true);
        view.addEventListener('mouseup', () => this.mouseDown = false);

        // Touch support
        view.addEventListener('touchstart', this.handleTouch.bind(this));
        view.addEventListener('touchmove', this.handleTouch.bind(this));
    }

    getInput(): InputState {
        return {
            left: this.keys.get('ArrowLeft') || this.keys.get('KeyA'),
            right: this.keys.get('ArrowRight') || this.keys.get('KeyD'),
            fire: this.mouseDown || this.keys.get('Space'),
            special: this.keys.get('ShiftLeft')
        };
    }
}
```

## Build Configuration

### Vite Setup
```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        target: 'es2015',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true
            }
        }
    },
    optimizeDeps: {
        include: ['pixi.js']
    }
});
```

### Package.json
```json
{
    "name": "atomic-survival-redux",
    "version": "1.0.0",
    "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "pixi.js": "^7.3.0",
        "@pixi/particle-emitter": "^5.0.0",
        "howler": "^2.2.0"
    },
    "devDependencies": {
        "typescript": "^5.0.0",
        "vite": "^5.0.0",
        "@types/howler": "^2.2.0"
    }
}
```

This PixiJS architecture provides a solid foundation for implementing Atomic Survival Redux with modern web technologies while maintaining the performance and feel of the original game!