# Survival Mode Systems Reference

## Core Survival Mode Mechanics (From Original Analysis)

This document extracts all survival-specific mechanics from Heavy Weapon Deluxe for accurate recreation in Atomic Survival Redux.

## 1. Enemy Spawning System

### Wave Timing Formula
```javascript
// From original Wave_CalculateLength
const waveLength = {
    min: 1000,  // 1 second minimum
    max: 2900,  // 2.9 seconds maximum

    calculate: (waveNumber) => {
        // Waves get longer as difficulty increases
        return Math.min(1000 + (waveNumber * 50), 2900);
    }
};

// Enemy spawn intervals within wave
const spawnInterval = {
    early: 1500,  // ms between enemies (waves 1-10)
    mid: 1000,    // ms between enemies (waves 11-30)
    late: 500     // ms between enemies (waves 30+)
};
```

### Survival Configuration Files
```xml
<!-- From survival0.xml through survival9.xml -->
<!-- Each file represents escalating difficulty tier -->

survival0.xml: Beginner (6-8 enemies per wave)
survival1.xml: Easy (8-10 enemies per wave)
survival2.xml: Normal (10-12 enemies per wave)
survival3.xml: Hard (12-15 enemies per wave)
survival4.xml: Expert (15-20 enemies per wave)
survival5.xml: Master (20-25 enemies per wave)
survival6.xml: Insane (25-30 enemies per wave)
survival7.xml: Nightmare (30-40 enemies per wave)
survival8.xml: Hell (40-50 enemies per wave)
survival9.xml: Apocalypse (50+ enemies per wave)
```

### Enemy Health Scaling
```javascript
// From Enemy_InitializeWithDifficulty
function calculateEnemyHealth(baseHealth, survivalTime) {
    // Difficulty increases every 12 seconds
    const difficultyLevel = Math.floor(survivalTime / 12000);

    // Cap at level 14
    const cappedLevel = Math.min(difficultyLevel, 14);

    // Health formula: (level + 1) * 7
    const scaledHealth = (cappedLevel + 1) * 7;

    // Maximum health cap of 40
    return Math.min(scaledHealth, 40);
}
```

## 2. Enemy Types & Weapons

### Survival-Mode Enemy Progression
```javascript
const enemyProgression = {
    // Waves 1-5: Basic enemies
    earlyGame: [
        { type: 'PROPFIGHTER', armor: 1, points: 50, weapon: null },
        { type: 'SMALLJET', armor: 1, points: 100, weapon: 'DUMB_BOMB' }
    ],

    // Waves 6-15: Standard enemies
    midGame: [
        { type: 'BOMBER', armor: 4, points: 250, weapon: 'DUMB_BOMB' },
        { type: 'JETFIGHTER', armor: 10, points: 500, weapon: 'LASER_GUIDED' },
        { type: 'SMALLCOPTER', armor: 15, points: 750, weapon: 'ARMORED_BOMB' }
    ],

    // Waves 16-30: Advanced enemies
    lateGame: [
        { type: 'BIGBOMBER', armor: 40, points: 1500, weapon: 'FRAG_BOMB' },
        { type: 'MEDCOPTER', armor: 25, points: 1250, weapon: 'BURSTING_ROCKET' },
        { type: 'FATBOMBER', armor: 120, points: 2500, weapon: 'ATOMIC_BOMB' }
    ],

    // Waves 31+: Elite enemies
    endGame: [
        { type: 'BLIMP', armor: 400, points: 25000, weapon: 'ATOMIC_BOMB' },
        { type: 'SATELLITE', armor: 200, points: 5000, weapon: 'ENERGY_BALL' },
        { type: 'CRUISE', armor: 300, points: 20000, weapon: 'ATOMIC_BOMB' }
    ]
};
```

### Enemy Weapon Damage Values
```javascript
const enemyWeapons = {
    DUMB_BOMB: {
        damage: 10,
        speed: 200,
        pattern: 'straight_down'
    },
    LASER_GUIDED: {
        damage: 50,
        speed: 300,
        pattern: 'homing',
        turnRate: 2.0
    },
    ARMORED_BOMB: {
        damage: 100,
        speed: 150,
        pattern: 'straight_down',
        health: 3  // Takes 3 hits
    },
    FRAG_BOMB: {
        damage: 75,
        speed: 200,
        pattern: 'straight_down',
        fragments: 8,
        fragmentDamage: 10
    },
    ATOMIC_BOMB: {
        damage: 200,
        speed: 100,
        pattern: 'straight_down',
        blastRadius: 150
    },
    ENERGY_BALL: {
        damage: 25,
        speed: 400,
        pattern: 'aimed_at_player'
    },
    BURSTING_ROCKET: {
        damage: 150,
        speed: 250,
        pattern: 'aimed_at_player',
        burstCount: 5,
        burstDamage: 20
    }
};
```

## 3. Player Weapon System

### Weapon Progression (Survival Drops Only)
```javascript
const playerWeapons = {
    // Tier 0: Starting weapon
    STANDARD_GUN: {
        damage: 10,
        fireRate: 200,  // ms
        projectileSpeed: 800,
        ammo: Infinity,
        spread: 0
    },

    // Tier 1: First upgrade
    HOMING_MISSILES: {
        damage: 30,
        fireRate: 400,
        projectileSpeed: 600,
        ammo: 40,
        turnRate: 3.0,
        spread: 0
    },

    // Tier 2
    LASER_CANNON: {
        damage: 50,
        fireRate: 100,
        projectileSpeed: 1200,
        ammo: 60,
        piercing: true,
        spread: 0
    },

    // Tier 3
    ROCKETS: {
        damage: 75,
        fireRate: 500,
        projectileSpeed: 700,
        ammo: 30,
        blastRadius: 50,
        spread: 15  // degrees
    },

    // Tier 4
    FLAK_CANNON: {
        damage: 20,
        fireRate: 150,
        projectileSpeed: 900,
        ammo: 50,
        projectileCount: 5,  // Shotgun effect
        spread: 30
    },

    // Tier 5: Ultimate
    THUNDERSTRIKE: {
        damage: 100,
        fireRate: 600,
        projectileSpeed: 1000,
        ammo: 20,
        chainLightning: true,
        maxChains: 3
    }
};
```

### Special Weapons
```javascript
const specialWeapons = {
    MEGA_LASER: {
        duration: 3000,  // 3 seconds
        damagePerTick: 10,
        tickRate: 100,  // ms
        width: 80,
        penetrating: true,
        activationKey: 'SPACE'
    },

    NUKE: {
        damage: 999,
        screenClear: true,
        scoreMultiplier: 0.5,  // Half points for nuked enemies
        maxPerGame: 3
    }
};
```

## 4. Power-Up System

### Helicopter Drop Mechanics
```javascript
const helicopterDrops = {
    // Drop timing
    dropInterval: 15000,  // Every 15 seconds base

    // Drop probability based on player state
    calculateDropChance: (playerHealth, currentWeapon, survivalTime) => {
        let chance = 0.3;  // 30% base chance

        if (playerHealth < 30) chance += 0.2;  // Low health bonus
        if (currentWeapon === 'STANDARD_GUN') chance += 0.1;  // No upgrade bonus
        if (survivalTime > 60000) chance += 0.1;  // Long survival bonus

        return Math.min(chance, 0.7);  // Max 70% chance
    },

    // Drop types and weights
    dropTable: [
        { type: 'WEAPON_UPGRADE', weight: 30 },
        { type: 'SHIELD', weight: 20 },
        { type: 'NUKE', weight: 10 },
        { type: 'MEGA_LASER', weight: 15 },
        { type: 'SPEED_BOOST', weight: 10 },
        { type: 'RAPID_FIRE', weight: 10 },
        { type: 'SPREAD_SHOT', weight: 5 }
    ]
};
```

### Power-Up Effects
```javascript
const powerUpEffects = {
    WEAPON_UPGRADE: {
        effect: 'Next tier weapon + full ammo',
        duration: 'permanent'
    },
    SHIELD: {
        effect: 'Invincibility',
        duration: 5000  // 5 seconds
    },
    NUKE: {
        effect: 'Clear all enemies on screen',
        duration: 'instant'
    },
    MEGA_LASER: {
        effect: 'Activate mega laser',
        duration: 3000  // 3 seconds
    },
    SPEED_BOOST: {
        effect: 'Double movement speed',
        duration: 10000  // 10 seconds
    },
    RAPID_FIRE: {
        effect: 'Double fire rate',
        duration: 8000  // 8 seconds
    },
    SPREAD_SHOT: {
        effect: 'Triple shot spread',
        duration: 12000  // 12 seconds
    }
};
```

## 5. Movement Patterns

### Enemy Movement AI
```javascript
const movementPatterns = {
    // Basic straight movement
    STRAIGHT: {
        update: (enemy, delta) => {
            enemy.x += enemy.speed * enemy.direction * delta;
        }
    },

    // Sine wave pattern (fighters)
    SINE_WAVE: {
        amplitude: 50,
        frequency: 0.01,
        update: (enemy, delta) => {
            enemy.x += enemy.speed * enemy.direction * delta;
            enemy.y = enemy.baseY + Math.sin(enemy.x * this.frequency) * this.amplitude;
        }
    },

    // Diving pattern (bombers)
    DIVE_BOMB: {
        diveRange: 100,
        diveSpeed: 2.0,
        update: (enemy, delta, tankX) => {
            enemy.x += enemy.speed * enemy.direction * delta;

            if (Math.abs(enemy.x - tankX) < this.diveRange) {
                enemy.y += enemy.speed * this.diveSpeed * delta;
            }
        }
    },

    // Hovering pattern (helicopters)
    HOVER: {
        hoverRange: 200,
        hoverSpeed: 0.5,
        update: (enemy, delta, tankX) => {
            const distance = tankX - enemy.x;

            if (Math.abs(distance) > 50) {
                enemy.x += Math.sign(distance) * enemy.speed * this.hoverSpeed * delta;
            }

            // Slight vertical bob
            enemy.y = enemy.baseY + Math.sin(Date.now() * 0.002) * 10;
        }
    },

    // Strafing pattern (jets)
    STRAFE: {
        passSpeed: 1.5,
        update: (enemy, delta, tankX) => {
            // Fast pass over player
            enemy.x += enemy.speed * this.passSpeed * enemy.direction * delta;

            // Fire when over player
            if (Math.abs(enemy.x - tankX) < 20) {
                enemy.shouldFire = true;
            }
        }
    }
};
```

## 6. Scoring System

### Score Calculation
```javascript
const scoringSystem = {
    // Base points from enemy kills
    enemyPoints: {
        PROPFIGHTER: 50,
        SMALLJET: 100,
        BOMBER: 250,
        JETFIGHTER: 500,
        SMALLCOPTER: 750,
        TRUCK: 750,
        BIGBOMBER: 1500,
        MEDCOPTER: 1250,
        BIGCOPTER: 1750,
        FATBOMBER: 2500,
        SATELLITE: 5000,
        CRUISE: 20000,
        BLIMP: 25000
    },

    // Bonus multipliers
    bonuses: {
        chainKill: {
            threshold: 3,  // Kills within 1 second
            multiplier: 1.5
        },
        accuracy: {
            threshold: 0.8,  // 80% hit rate
            bonus: 500
        },
        noDamage: {
            waveBonus: 1000  // Complete wave without damage
        },
        speedKill: {
            time: 500,  // Kill within 0.5s of spawn
            multiplier: 2.0
        }
    },

    // Combo system
    combo: {
        timeout: 2000,  // 2 seconds to maintain combo
        multipliers: [1, 1.2, 1.5, 2.0, 2.5, 3.0],  // Max 3x

        getMultiplier: (comboCount) => {
            const index = Math.min(comboCount, 5);
            return this.multipliers[index];
        }
    }
};
```

## 7. Difficulty Progression

### Survival Difficulty Curve
```javascript
const difficultyProgression = {
    // Time-based progression (every 12 seconds)
    timeInterval: 12000,

    // Wave-based progression
    waveProgression: {
        enemyCountIncrease: 2,     // Every 5 waves
        enemySpeedMultiplier: 1.02, // 2% faster per wave
        enemyHealthMultiplier: 1.05, // 5% more health per 5 waves
        weaponDamageIncrease: 1.03  // 3% more damage per 10 waves
    },

    // Spawn rate progression
    spawnRateProgression: {
        initial: 1500,  // ms between spawns
        minimum: 300,   // Fastest spawn rate

        calculate: (waveNumber) => {
            return Math.max(1500 - (waveNumber * 20), 300);
        }
    },

    // Enemy mix progression
    enemyMixProgression: [
        { wave: 1, mix: [100, 0, 0, 0] },    // 100% basic
        { wave: 5, mix: [70, 30, 0, 0] },    // 70% basic, 30% medium
        { wave: 10, mix: [40, 40, 20, 0] },  // Mixed medium/advanced
        { wave: 20, mix: [20, 30, 30, 20] }, // All types
        { wave: 30, mix: [10, 20, 30, 40] }, // Mostly advanced/elite
        { wave: 50, mix: [0, 10, 30, 60] }   // Mostly elite
    ]
};
```

## 8. Tank Mechanics

### Tank Properties
```javascript
const tankStats = {
    // Movement
    baseSpeed: 300,  // pixels per second
    acceleration: 1000,  // pixels per second²
    deceleration: 2000,  // pixels per second²

    // Health system (simplified from armor segments)
    maxHealth: 100,

    // Bounds
    minX: 50,
    maxX: 1230,  // For 1280px width
    fixedY: 600,  // Bottom of screen

    // Hitbox
    width: 60,
    height: 40,
    collisionOffset: { x: -30, y: -20 }
};
```

## 9. Special Mechanics

### Screen Management
```javascript
const screenMechanics = {
    // Enemy spawn positions
    spawnZones: {
        air: { yMin: 50, yMax: 300 },    // Flying enemies
        ground: { y: 550 }                // Ground enemies (trucks)
    },

    // Off-screen cleanup
    bounds: {
        left: -100,
        right: 1380,
        top: -100,
        bottom: 820
    },

    // Particle limits
    maxParticles: 500,
    maxProjectiles: 100,
    maxEnemies: 50
};
```

### Audio Cues
```javascript
const audioCues = {
    // Priority system for overlapping sounds
    priorities: {
        PLAYER_HIT: 10,
        BOSS_SPAWN: 9,  // Not used in survival
        POWER_UP: 8,
        ENEMY_DESTROYED: 5,
        WEAPON_FIRE: 3,
        AMBIENT: 1
    },

    // Key sound effects
    sounds: {
        tankFire: 'tank_fire.ogg',
        explosion: 'explosion.ogg',
        powerUp: 'powerup.ogg',
        helicopterDrop: 'helicopter.ogg',
        megaLaser: 'laser_beam.ogg',
        warning: 'warning.ogg',
        hit: 'hit.ogg'
    }
};
```

## Implementation Priority

### Core Loop (Must Have)
1. ✅ Tank movement and shooting
2. ✅ Basic enemy spawning
3. ✅ Collision detection
4. ✅ Score tracking
5. ✅ Wave progression

### Essential Features (Should Have)
6. ✅ All enemy types
7. ✅ Enemy weapons
8. ✅ Power-up system
9. ✅ Helicopter drops
10. ✅ Difficulty scaling

### Polish (Nice to Have)
11. ⭕ Particle effects
12. ⭕ Screen shake
13. ⭕ Combo system
14. ⭕ Leaderboard
15. ⭕ Sound effects

This reference document provides all the mechanical details needed to recreate an authentic survival mode experience!