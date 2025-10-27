# Atomic Survival Redux - Implementation Plan

## Project Overview

**Atomic Survival Redux** is a focused recreation of Heavy Weapon Deluxe's Survival Mode using PixiJS. This streamlined implementation removes all campaign elements, menus, and save systems to focus purely on the core survival gameplay loop.

## Core Concept

**Immediate Action**: Game launches directly into survival mode
- Tank rolls in from the left
- Waves begin immediately
- No menus, no delays
- Pure arcade action

## Technical Stack

- **Engine**: PixiJS v7+ (WebGL/Canvas rendering)
- **Language**: TypeScript/JavaScript
- **Physics**: Simple AABB collision (no physics engine needed)
- **Audio**: Web Audio API
- **Build**: Vite/Webpack

## Implementation Phases

### Phase 1: Core Foundation (Week 1)

#### 1.1 Project Setup
```
atomic_survival_redux/
├── src/
│   ├── core/
│   │   ├── Game.ts           // Main game class
│   │   ├── GameLoop.ts       // Update/render loop
│   │   └── AssetLoader.ts    // Resource management
│   ├── entities/
│   │   ├── Tank.ts           // Player tank
│   │   ├── Enemy.ts          // Base enemy class
│   │   └── Projectile.ts     // Bullets/missiles
│   ├── systems/
│   │   ├── WaveSystem.ts     // Wave spawning
│   │   ├── CollisionSystem.ts // Collision detection
│   │   └── ParticleSystem.ts // Effects
│   └── main.ts              // Entry point
├── assets/
│   ├── sprites/
│   ├── sounds/
│   └── data/
└── index.html
```

#### 1.2 Core Game Loop
```typescript
class Game {
    private app: PIXI.Application;
    private tank: Tank;
    private enemies: Enemy[] = [];
    private deltaTime: number = 0;

    constructor() {
        // Initialize PIXI at 1280x720 (16:9)
        this.app = new PIXI.Application({
            width: 1280,
            height: 720,
            backgroundColor: 0x1099bb
        });

        // Start immediately
        this.initializeGame();
    }

    private gameLoop(delta: number): void {
        this.deltaTime = delta;

        // Fixed update order (from original)
        this.updateBackground(delta);
        this.updatePowerUps(delta);
        this.updatePhysics(delta);
        this.updateEntities(delta);
        this.checkCollisions();
        this.render();
    }
}
```

### Phase 2: Player Tank System (Week 1-2)

#### 2.1 Tank Implementation
```typescript
class Tank extends PIXI.Container {
    // Core properties from original
    private health: number = 100;  // Simplified from armor segments
    private speed: number = 300;   // Pixels per second
    private weapons: Weapon[] = [];
    private currentWeapon: number = 0;

    // Movement bounds
    private readonly MIN_X = 50;
    private readonly MAX_X = 1230;
    private readonly FIXED_Y = 600;  // Tank stays at bottom

    update(delta: number): void {
        this.processInput();
        this.updateWeapons(delta);
        this.clampPosition();
    }
}
```

#### 2.2 Weapon System
```typescript
enum WeaponType {
    STANDARD_GUN,      // Default, unlimited ammo
    HOMING_MISSILES,   // 40 ammo
    LASER_CANNON,      // 60 ammo
    ROCKETS,           // 30 ammo
    FLAK_CANNON,       // 50 ammo
    THUNDERSTRIKE      // 20 ammo
}

class WeaponSystem {
    // Weapon properties based on original
    private weaponStats = {
        [WeaponType.STANDARD_GUN]: {
            damage: 10,
            fireRate: 200,  // ms
            projectileSpeed: 800,
            ammo: Infinity
        },
        // ... other weapons
    };
}
```

### Phase 3: Enemy System (Week 2)

#### 3.1 Enemy Types (Survival-Relevant Only)
```typescript
// From craft.xml - survival mode enemies only
enum EnemyType {
    // Basic Enemies (Early Waves)
    PROPFIGHTER,     // 50 pts, 1 armor
    SMALLJET,        // 100 pts, 1 armor
    BOMBER,          // 250 pts, 4 armor

    // Medium Enemies (Mid Waves)
    JETFIGHTER,      // 500 pts, 10 armor
    SMALLCOPTER,     // 750 pts, 15 armor
    BIGBOMBER,       // 1500 pts, 40 armor

    // Advanced Enemies (Late Waves)
    FATBOMBER,       // 2500 pts, 120 armor
    BLIMP,           // 25000 pts, 400 armor
    SATELLITE,       // 5000 pts, 200 armor
    CRUISE           // 20000 pts, 300 armor
}
```

#### 3.2 Enemy Weapons
```typescript
enum EnemyWeapon {
    DUMB_BOMB,        // 10 damage - straight down
    LASER_GUIDED,     // 50 damage - tracks player
    ARMORED_BOMB,     // 100 damage - takes hits
    FRAG_BOMB,        // 75 damage - area effect
    ATOMIC_BOMB,      // 200 damage - massive area
    ENERGY_BALL,      // 25 damage - fast projectile
    BURSTING_ROCKET   // 150 damage - explodes into fragments
}
```

#### 3.3 Movement Patterns
```typescript
class MovementPattern {
    static patterns = {
        STRAIGHT: (enemy: Enemy) => {
            enemy.x += enemy.speed * enemy.direction;
        },
        SINE_WAVE: (enemy: Enemy) => {
            enemy.x += enemy.speed * enemy.direction;
            enemy.y = enemy.baseY + Math.sin(enemy.x * 0.01) * 50;
        },
        DIVE_BOMB: (enemy: Enemy) => {
            if (Math.abs(enemy.x - tank.x) < 100) {
                enemy.y += enemy.speed * 2;
            }
        },
        HOVER: (enemy: Enemy) => {
            // Helicopter behavior
            if (Math.abs(enemy.x - tank.x) > 50) {
                enemy.x += Math.sign(tank.x - enemy.x) * enemy.speed * 0.5;
            }
        }
    };
}
```

### Phase 4: Wave System (Week 2-3)

#### 4.1 Survival Wave Generation
```typescript
class WaveSystem {
    private waveNumber: number = 0;
    private enemiesPerWave: number = 6;
    private timeBetweenWaves: number = 2000; // ms
    private difficultyMultiplier: number = 1.0;

    generateWave(): Wave {
        this.waveNumber++;

        // Difficulty scaling from original
        if (this.waveNumber % 5 === 0) {
            this.difficultyMultiplier += 0.2;
            this.enemiesPerWave += 2;
        }

        // Enemy selection based on wave number
        const availableEnemies = this.getEnemiesForWave(this.waveNumber);

        return {
            enemies: this.selectEnemies(availableEnemies),
            spawnDelay: Math.max(500, 1500 - this.waveNumber * 10),
            waveLength: Math.min(2900, 1000 + this.waveNumber * 50)
        };
    }

    private getEnemiesForWave(wave: number): EnemyType[] {
        if (wave < 5) return [EnemyType.PROPFIGHTER, EnemyType.SMALLJET];
        if (wave < 10) return [EnemyType.BOMBER, EnemyType.JETFIGHTER];
        if (wave < 20) return [EnemyType.SMALLCOPTER, EnemyType.BIGBOMBER];
        // ... progression continues
    }
}
```

### Phase 5: Power-Up System (Week 3)

#### 5.1 Helicopter Drops
```typescript
class HelicopterDrop extends PIXI.Container {
    private dropType: PowerUpType;
    private allyHelicopter: PIXI.Sprite;

    // Power-ups from original
    enum PowerUpType {
        WEAPON_UPGRADE,    // Next weapon tier
        NUKE,             // Clear screen
        SHIELD,           // Temporary invincibility
        MEGA_LASER,       // Special weapon
        SPEED_BOOST,      // Faster movement
        RAPID_FIRE,       // Increased fire rate
        SPREAD_SHOT       // Triple shot
    }

    spawnDrop(): void {
        // Helicopter enters from side
        // Drops power-up at random X position
        // Player must catch before it lands
    }
}
```

#### 5.2 Mega Laser Special
```typescript
class MegaLaser {
    private duration: number = 3000;  // 3 seconds
    private damage: number = 100;     // Per tick
    private width: number = 80;       // Laser width

    activate(tank: Tank): void {
        // Create vertical laser from tank
        // Damage all enemies in path
        // Visual and audio effects
    }
}
```

### Phase 6: Scoring & Progression (Week 3-4)

#### 6.1 Scoring System
```typescript
class ScoringSystem {
    private score: number = 0;
    private multiplier: number = 1;
    private combo: number = 0;

    // Point values from original
    private pointValues = {
        [EnemyType.PROPFIGHTER]: 50,
        [EnemyType.SMALLJET]: 100,
        [EnemyType.BOMBER]: 250,
        // ... all enemy values
    };

    addKill(enemy: Enemy): void {
        const basePoints = this.pointValues[enemy.type];
        const bonusPoints = this.calculateBonus(enemy);

        this.score += (basePoints + bonusPoints) * this.multiplier;
        this.updateCombo();
    }

    private calculateBonus(enemy: Enemy): number {
        // Chain bonus: rapid kills
        // Accuracy bonus: high hit rate
        // No-damage bonus: wave without hits
        return 0;
    }
}
```

#### 6.2 Difficulty Progression
```typescript
class DifficultyManager {
    // Based on original survival time scaling
    private getEnemyHealth(baseHealth: number, survivalTime: number): number {
        const difficultyLevel = Math.floor(survivalTime / 12000); // Every 12 seconds
        const scaledHealth = (difficultyLevel + 1) * 7;
        return Math.min(scaledHealth, 40); // Cap at 40
    }

    private getEnemySpeed(baseSpeed: number, waveNumber: number): number {
        return baseSpeed * (1 + waveNumber * 0.02); // 2% faster per wave
    }
}
```

### Phase 7: Effects & Polish (Week 4)

#### 7.1 Particle System
```typescript
class ParticleSystem {
    // Explosion effects
    createExplosion(x: number, y: number, size: 'small' | 'large'): void {
        // Particle burst
        // Screen shake for large explosions
    }

    // Bullet trails
    createTrail(projectile: Projectile): void {
        // Smoke trail for missiles
        // Light trail for lasers
    }
}
```

#### 7.2 Background System
```typescript
class ParallaxBackground {
    private layers: PIXI.Container[] = [];

    // Simplified 3-layer system for survival
    private scrollSpeeds = [0.1, 0.3, 0.5]; // Sky, far, near

    update(delta: number): void {
        // Continuous scrolling
        // No need for region-specific backgrounds
    }
}
```

## Core Game Flow

```typescript
// main.ts - Immediate start
window.addEventListener('load', () => {
    const game = new Game();

    // Tank entrance animation
    game.tank.enterFromLeft(() => {
        // Start spawning waves immediately
        game.waveSystem.start();
        game.inputEnabled = true;
    });
});
```

## Simplified Systems (vs Original)

### Removed:
- ❌ All menus (main, pause, options)
- ❌ Campaign mode and bosses
- ❌ Save/load system
- ❌ Level progression
- ❌ Regional backgrounds
- ❌ Intel briefings
- ❌ Armory upgrade screen

### Simplified:
- ✅ Direct game start
- ✅ Single difficulty curve
- ✅ Infinite waves only
- ✅ Fixed background
- ✅ Auto weapon upgrades via drops
- ✅ No persistent progress

## Performance Targets

- **Frame Rate**: 60 FPS constant
- **Resolution**: 1280×720 (scalable)
- **Load Time**: < 3 seconds
- **Memory**: < 100MB
- **Min Spec**: Any device from 2015+

## Development Timeline

### Week 1: Foundation
- Project setup
- Core game loop
- Basic tank movement
- Simple shooting

### Week 2: Combat
- Enemy types
- Enemy AI/patterns
- Collision system
- Basic weapons

### Week 3: Systems
- Wave generation
- Power-ups
- Scoring
- Difficulty scaling

### Week 4: Polish
- Particles/effects
- Audio
- UI/HUD
- Performance optimization

### Week 5: Testing & Tuning
- Balance tweaking
- Bug fixes
- Performance optimization
- Deploy to web

## Key Differences from Original

1. **Immediate Gameplay**: No menus, instant action
2. **Simplified Progression**: No saves, pure arcade
3. **Modern Resolution**: 16:9 instead of 4:3
4. **Web-Based**: Runs in browser, no installation
5. **Responsive Controls**: Mouse + keyboard support

This focused approach eliminates 60% of the original's complexity while preserving the core survival experience!