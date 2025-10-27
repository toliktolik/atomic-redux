# Survival Mode Enemy System - Gap Analysis & Implementation Plan

## Overview
Analysis of Ghidra-decompiled enemy management functions reveals significant gaps in enemy behavior, weapon systems, and AI patterns specific to survival mode vs. the current atomic_survival_redux implementation.

## Current Implementation Status

### ✅ Implemented Features
- **Enemy Types**: All 13 enemy types from craft.xml
- **Basic Movement Patterns**: STRAIGHT, SINE_WAVE, DIVE_BOMB, HOVER, STRAFE, ZIGZAG
- **Health System**: Basic health and armor scaling
- **Collision Detection**: Enemy-projectile and enemy-tank collisions

### ❌ Critical Gaps Identified

## Gap 1: Survival-Specific Enemy Spawning

**Ghidra Functions**:
- `Survival_SpawnEnemyProjectile @ 0x004320c0`
- `Survival_ExecuteWaveSpawning @ 0x0040a820`

**Current Status**: Generic enemy spawning

**Missing Features**:

### Survival-Specific Spawn Mechanics
Based on decompiled code analysis:
```cpp
void Survival_ExecuteWaveSpawning(int param_1, int param_2, void *param_3) {
    // Processes survival-specific enemy spawning patterns
    // Handles formation-based spawning (groups of enemies)
    // Manages spawn timing based on survival wave configuration
}
```

**Current Gap**:
- Single enemy spawning vs. formation spawning
- Missing wave-based spawn coordination
- No survival-specific spawn position variation

### Formation Spawning Analysis (XML Data)

| Wave Type | Enemy Formation | Current Implementation | Expected Implementation |
|-----------|----------------|------------------------|------------------------|
| Early Wave | 9-11 SMALLJETS + 1-3 JETFIGHTERS | Random individual spawns | Coordinated group spawn |
| Mid Wave | 12 BOMBERS + 5 TRUCKS | Sequential spawning | Formation-based waves |
| Late Wave | 29 BLIMPS + 29 SUPERBOMBERS + 16 DEFLECTORS | Single spawns | Mass formation spawn |

## Gap 2: Enemy Weapon System

**Ghidra Function**: `Survival_SpawnEnemyProjectile @ 0x004320c0`
**Current Status**: Basic projectile system

**Missing Weapon Behaviors**:

### Weapon-Specific Gaps (from craft.xml analysis)

1. **DEFLECTOR Enemy Weapon System**
   - **Expected**: Reflects player projectiles back
   - **Current**: Standard enemy behavior
   - **Impact**: Major survival mechanic missing

2. **SATELLITE Enemy Behavior**
   - **Expected**: ENERGY_BALL weapon (25 damage, aimed at player)
   - **Current**: Generic projectile
   - **XML Spec**: `<Craft id="SATELLITE" arms="EnergyBall" armor="200" points="5000"/>`

3. **Advanced Bomber Weapons**
   - **FATBOMBER**: Should use ATOMIC_BOMB (200 damage, 150 blast radius)
   - **SUPERBOMBER**: Enhanced bombing patterns
   - **Current**: All bombers use basic DUMB_BOMB

### Enemy Weapon Implementation Gaps

```typescript
// Current simplified approach
class Enemy {
    fireProjectile() {
        // Generic projectile creation
        return new Projectile(this.x, this.y, this.weaponType);
    }
}

// Expected survival-specific approach (based on Ghidra analysis)
class SurvivalEnemy {
    fireProjectile() {
        // Weapon-specific behavior per craft.xml
        switch(this.craftType) {
            case 'DEFLECTOR':
                return this.createDeflectorBehavior();
            case 'SATELLITE':
                return this.createEnergyBall(); // Aimed at player
            case 'FATBOMBER':
                return this.createAtomicBomb(); // 200 damage, blast radius
        }
    }
}
```

## Gap 3: Enemy AI & Movement Patterns

**Ghidra Functions**:
- `Survival_ProcessEnemyFormations @ 0x0040adb0`
- `Survival_HandlePlayerCollisionWithMarker @ 0x00432930`

**Current Status**: Basic individual AI

**Missing AI Systems**:

### Formation AI (Missing Entirely)
Based on XML analysis and decompiled functions:
```cpp
void Survival_ProcessEnemyFormations(void *param_1, int param_2, int param_3) {
    // Processes coordinated enemy formations
    // Manages group behavior and attack patterns
    // Handles formation-specific movement synchronization
}
```

**Current Gap**: Enemies act independently without group coordination

### Survival-Specific Movement Patterns

1. **TRUCK Ground Movement**
   - **Expected**: Ground-level movement on fixed Y coordinate
   - **Current**: Standard aerial movement
   - **XML**: Ground vehicle should move on road level

2. **HELICOPTER Behavior**
   - **Expected**: Ally white helicopter for power-up drops
   - **Current**: Only enemy helicopters implemented
   - **Missing**: Survival mode ally helicopter system

3. **CRUISE Movement**
   - **Expected**: Slow, heavy movement pattern (high armor: 300, high points: 20000)
   - **Current**: Standard movement speed
   - **Impact**: Balance issues for high-value targets

## Gap 4: Enemy Health & Armor System

**Current Implementation vs. XML Specifications**:

| Enemy | XML Armor | XML Points | Current Armor | Current Points | Gap |
|-------|-----------|------------|---------------|----------------|-----|
| PROPFIGHTER | 1 | 50 | 1 | 50 | ✅ Correct |
| CRUISE | 300 | 20000 | ~50 | ~1000 | ❌ Massively Under-powered |
| BLIMP | 400 | 25000 | ~60 | ~1500 | ❌ Massively Under-powered |
| SATELLITE | 200 | 5000 | ~30 | ~500 | ❌ Under-powered |
| DEFLECTOR | 80 | 2000 | ~20 | ~200 | ❌ Under-powered |

### Expected Armor Scaling (from Ghidra analysis)
```cpp
// Survival mode applies additional health scaling
int calculateSurvivalEnemyHealth(int baseArmor, int survivalTime) {
    int difficultyLevel = survivalTime / 12000; // Every 12 seconds
    int scaledHealth = baseArmor * ((difficultyLevel + 1) * 7);
    return min(scaledHealth, baseArmor * 40); // Cap scaling
}
```

**Current Gap**: No survival-specific health scaling beyond basic difficulty

## Gap 5: Enemy Special Behaviors

### Missing Enemy-Specific Mechanics

1. **DOZER Behavior**
   - **Expected**: Bulldozer pushing mechanics, destroys obstacles
   - **XML Spec**: 400 armor, 8000 points (tank-class enemy)
   - **Current**: Standard enemy behavior

2. **STRAFER Attack Pattern**
   - **Expected**: Fast strafing runs with precise firing
   - **Current**: Basic enemy movement
   - **Impact**: Missing authentic enemy variety

3. **ENEMYTANK Ground Combat**
   - **Expected**: Tank-vs-tank ground combat
   - **XML Spec**: 150 armor, 7500 points
   - **Current**: Aerial enemy behavior (incorrect)

## Gap 6: Power-Up Drop Integration

**Ghidra Function**: `Survival_ProcessPowerUpDrops @ 0x0040aed0`
**Current Status**: Basic power-up system

**Missing Integration**:
- Enemy destruction triggers for power-up drops
- Survival-specific drop rates based on enemy type
- Helicopter ally spawning system tied to enemy waves

## Gap 7: Projectile Collision & Destruction

**Ghidra Function**: `Survival_DestroyProjectileInstance @ 0x00435f20`
**Current Status**: Basic collision system

**Missing Features**:
- **Armored Projectile System**: Some enemy projectiles have health (ARMORED_BOMB takes 3 hits)
- **Deflection Mechanics**: DEFLECTOR enemies bounce projectiles back
- **Projectile Interaction**: Enemy projectiles can collide with each other

## Implementation Priority Plan

### Phase 1: Core Enemy System Overhaul (Critical)

1. **XML-Accurate Enemy Stats**
   ```typescript
   // Load exact stats from craft.xml
   interface EnemyCraftData {
       id: string;
       armor: number;    // 1-400 per XML
       points: number;   // 50-25000 per XML
       weapon: string;   // Weapon type per XML
   }
   ```

2. **Survival Health Scaling**
   ```typescript
   class SurvivalEnemy extends Enemy {
       calculateHealth(baseArmor: number, survivalTime: number): number {
           const difficultyLevel = Math.floor(survivalTime / 12000);
           return Math.min(baseArmor * ((difficultyLevel + 1) * 7), baseArmor * 40);
       }
   }
   ```

### Phase 2: Weapon System Implementation (Important)

3. **Enemy Weapon Specialization**
   ```typescript
   class WeaponSystem {
       createEnemyWeapon(craftType: string): EnemyWeapon {
           switch(craftType) {
               case 'DEFLECTOR': return new DeflectorWeapon();
               case 'SATELLITE': return new EnergyBallWeapon();
               case 'FATBOMBER': return new AtomicBombWeapon();
           }
       }
   }
   ```

4. **Advanced Projectile System**
   - Armored projectiles with health
   - Deflection mechanics
   - Blast radius calculations

### Phase 3: Formation & AI System (Enhancement)

5. **Formation Spawning**
   ```typescript
   class FormationSpawner {
       spawnWave(waveConfig: SurvivalWave): void {
           // Spawn coordinated enemy groups
           // Maintain formation during movement
           // Coordinate attack patterns
       }
   }
   ```

6. **Advanced Enemy AI**
   - Group coordination
   - Formation maintenance
   - Tactical positioning

### Phase 4: Special Behaviors (Polish)

7. **Enemy-Specific Mechanics**
   - DOZER obstacle destruction
   - STRAFER precision attacks
   - ENEMYTANK ground combat

8. **Visual & Audio Effects**
   - Enemy-specific explosion effects
   - Weapon-specific visual effects
   - Audio cues for enemy types

## Technical Implementation Notes

### Enemy Data Structure
```typescript
interface SurvivalEnemyConfig {
    craftId: string;
    baseArmor: number;
    basePoints: number;
    weaponType: string;
    movementPattern: MovementPattern;
    specialBehaviors: SpecialBehavior[];
    formationRole: FormationRole;
}
```

### Formation System
```typescript
class EnemyFormation {
    enemies: SurvivalEnemy[];
    formationType: FormationType;
    spawnPositions: Vector2[];

    spawnFormation(): void {
        // Coordinate simultaneous enemy spawning
    }

    updateFormation(deltaTime: number): void {
        // Maintain formation during movement
    }
}
```

## Expected Outcomes

### Immediate Benefits
- **Authentic Enemy Behavior**: Matches original game specifications
- **Balanced Difficulty**: Proper enemy health and point values
- **Enhanced Challenge**: Advanced enemy weapon systems

### Long-term Benefits
- **Strategic Gameplay**: Formation-based enemy encounters
- **Improved Balance**: High-value targets require appropriate effort
- **Complete Feature Parity**: All original enemy mechanics implemented

This implementation plan addresses the critical gaps between the current enemy system and the authentic Heavy Weapon Deluxe survival mode enemy behaviors, ensuring proper challenge progression and gameplay balance.