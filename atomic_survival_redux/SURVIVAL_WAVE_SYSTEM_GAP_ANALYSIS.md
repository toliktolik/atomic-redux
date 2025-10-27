# Survival Mode Wave System - Gap Analysis & Implementation Plan

## Overview
Analysis of Ghidra decompiled `Survival_*` functions vs. current atomic_survival_redux implementation reveals critical gaps in wave spawning, difficulty progression, and XML-based configuration loading.

## Current Implementation Status

### ✅ Implemented Features
- **Basic Wave Generation**: Simple wave creation with enemy counts
- **Progressive Difficulty**: Basic enemy count increases over time
- **Enemy Types**: All 13 enemy types from craft.xml implemented
- **Spawn Timing**: Basic spawn intervals and wave lengths

### ❌ Critical Gaps Identified

## Gap 1: XML-Based Configuration Loading

**Ghidra Function**: `Survival_LoadConfiguration @ 0x00403b70`
**Current Status**: Missing entirely

**Expected Behavior** (from decompiled code):
```cpp
_String_base * Survival_LoadConfiguration(_String_base *param_1, _String_base *param_2, int param_3) {
    // Loads survival0.xml through survival9.xml based on difficulty selection
    // Creates wave configuration objects from XML data
    // Initializes enemy spawn patterns and timings
}
```

**Current Implementation**: Uses hardcoded JavaScript arrays
```typescript
// Current approach - hardcoded values
const enemyProgression = {
    earlyGame: [/* static arrays */],
    midGame: [/* static arrays */],
    // ...
};
```

**Impact**:
- No authentic difficulty tiers (survival0-survival9)
- Missing proper wave progression as defined in XML
- Simplified enemy composition vs. original complex patterns

## Gap 2: Proper Wave Sequence Processing

**Ghidra Function**: `Survival_ProcessWaveSequence @ 0x0040a700`
**Current Status**: Partially implemented

**Expected Behavior**:
```cpp
void Survival_ProcessWaveSequence(void *this, uint param_1) {
    // Processes wave sequence from loaded XML configuration
    // Manages wave lengths (1000ms - 2900ms progression)
    // Handles proper enemy composition per wave
}
```

**Current Gap**:
- Wave lengths don't match XML specifications (1000-2900ms progression)
- Missing 20-level progression system per survival difficulty
- Enemy quantities don't match XML specifications

**XML Analysis** (survival0.xml vs survival9.xml):

| Metric | Survival0 (Easy) | Survival9 (Apocalypse) | Current Implementation |
|--------|------------------|-------------------------|------------------------|
| Level 1 Wave 1 | SMALLJET:9, JETFIGHTER:1 | SMALLJET:11, BOMBER:3 | Random mix |
| Level 20 Wave 4 | DEFLECTOR:16, BLIMP:29, SUPERBOMBER:29 | ENEMYTANK:18, DEFLECTOR:16, BIGCOPTER:33 | Simple scaling |
| Wave Length | 1000ms → 2900ms | 1000ms → 2900ms | 1000ms + (wave * 50) |
| Max Enemies/Wave | ~74 enemies | ~84 enemies | ~50 enemies |

## Gap 3: Difficulty Scaling System

**Ghidra Function**: `Survival_ProcessDifficultyScaling @ 0x0040af00`
**Current Status**: Simplified implementation

**Expected Behavior**:
```cpp
void Survival_ProcessDifficultyScaling(int param_1, int param_2, void *param_3) {
    Survival_ExecuteWaveSpawning(param_1, param_2, param_3);
    // Processes 10 distinct survival difficulty tiers
    // Each tier has 20 levels with 4 waves per level
}
```

**Missing Features**:
- **10 Survival Tiers**: survival0.xml through survival9.xml
- **20 Levels per Tier**: 80 waves total per survival mode
- **Proper Enemy Mix Evolution**: XML-defined enemy composition changes
- **Wave Length Progression**: Authentic 1000ms→2900ms timing

## Gap 4: Timed Enemy Spawn System

**Ghidra Function**: `Survival_ProcessTimedEnemySpawns @ 0x00432250`
**Current Status**: Basic implementation

**Expected Features Missing**:
- **Spawn Counters**: Frame-based spawn timing (70, 74 frame counters)
- **Enemy Formation Processing**: Proper enemy group spawning
- **Boss Integration**: Special boss spawning mechanics in survival
- **Helicopter Drop Timing**: Exact ally helicopter timing

## Gap 5: Enemy Formation Processing

**Ghidra Function**: `Survival_ProcessEnemyFormations @ 0x0040adb0`
**Current Status**: Missing formation logic

**Missing Elements**:
- **Group Spawning**: Enemies spawn in coordinated formations
- **Spawn Position Variation**: Different spawn zones per enemy type
- **Formation Patterns**: Specific attack formations per enemy group

## Gap 6: Propaganda Poster & Control Tower System

**Ghidra Functions**:
- `Survival_UpdatePropagandaPosterReward @ 0x00432900`
- `Survival_UpdateControlTowerHealth @ 0x00432c20`
- `Survival_SpawnBonusRewardMarker @ 0x004327b0`

**Current Status**: Missing entirely

**Expected Features**:
- **Propaganda Posters**: Destructible background elements that provide score bonuses
- **Control Towers**: Special survival-mode structures
- **Bonus Markers**: Special reward markers that appear during survival

## Gap 7: Authentic HUD System

**Ghidra Function**: `SurvivalMode_DrawHUD @ 0x0042e220`
**Current Status**: Generic HUD implementation

**Missing HUD Elements**:
- **Survival Mode Timer**: Proper survival time display (format: "i:%02i:%02i")
- **Survival Difficulty Indicator**: Shows current survival tier (0-9)
- **Special Effects**: Flashing elements during difficulty transitions
- **Authentic Font Rendering**: Original font and styling

## Gap 8: Score & Reward System

**Ghidra Function**: `Survival_UpdateScoreRewardSystem @ 0x00432220`
**Current Status**: Basic scoring only

**Missing Features**:
- **Survival-Specific Bonuses**: Time-based multipliers
- **Poster Destruction Bonuses**: Additional points for background elements
- **Control Tower Bonuses**: Special structure destruction rewards
- **Survival Milestone Rewards**: Bonuses for reaching time/level milestones

## Implementation Priority Plan

### Phase 1: Core XML Integration (Critical)
1. **XML Configuration Loader**
   - Parse survival0.xml through survival9.xml
   - Load all 20 levels × 4 waves per survival tier
   - Implement proper wave length progression (1000-2900ms)

2. **Authentic Wave System**
   - Replace hardcoded arrays with XML-loaded configurations
   - Implement 10 survival difficulty tiers
   - Proper enemy quantities per XML specifications

### Phase 2: Advanced Spawning (Important)
3. **Formation Spawning System**
   - Implement coordinated enemy group spawning
   - Add spawn position variation per enemy type
   - Formation-based attack patterns

4. **Timed Spawn Processing**
   - Frame-accurate spawn timing
   - Proper spawn intervals based on XML configuration
   - Boss integration for survival mode

### Phase 3: Survival-Specific Features (Enhancement)
5. **Propaganda Poster System**
   - Destructible background elements
   - Score bonuses for destruction
   - Visual effects and animations

6. **Control Tower System**
   - Special survival structures
   - Health tracking and destruction
   - Reward system integration

7. **Enhanced HUD**
   - Authentic survival timer display
   - Difficulty tier indicator
   - Visual effects for transitions

### Phase 4: Polish & Optimization (Nice-to-Have)
8. **Performance Optimization**
   - Object pooling for high enemy counts (74+ per wave)
   - Efficient collision detection for dense waves
   - Memory management for long survival sessions

9. **Visual Effects**
   - Authentic particle effects
   - Background animations
   - Screen effects for special events

## Technical Implementation Notes

### XML Parser Requirements
```typescript
interface SurvivalConfiguration {
    levels: SurvivalLevel[];
}

interface SurvivalLevel {
    waves: SurvivalWave[];
}

interface SurvivalWave {
    length: number; // 1000-2900ms
    crafts: CraftSpawn[];
}

interface CraftSpawn {
    id: string; // SMALLJET, BOMBER, etc.
    qty: number;
}
```

### Wave Processing System
```typescript
class SurvivalWaveProcessor {
    private configurations: Map<number, SurvivalConfiguration>;
    private currentTier: number = 0; // 0-9 for survival0-9
    private currentLevel: number = 0; // 0-19 for levels 1-20
    private currentWave: number = 0; // 0-3 for waves 1-4

    loadConfiguration(tier: number): void {
        // Load appropriate survival{tier}.xml
    }

    processWaveSequence(): void {
        // Implement Ghidra function logic
    }
}
```

## Expected Outcomes

### Immediate Benefits
- **Authentic Difficulty Progression**: Matches original game exactly
- **Proper Enemy Scaling**: XML-defined enemy compositions
- **Enhanced Longevity**: 10 distinct survival experiences

### Long-term Benefits
- **Feature Parity**: Complete survival mode recreation
- **Enhanced Challenge**: Authentic late-game difficulty spikes
- **Improved Gameplay**: Proper reward systems and visual feedback

This implementation plan addresses all critical gaps identified between the Ghidra-decompiled survival functions and the current atomic_survival_redux implementation, ensuring feature parity with the original Heavy Weapon Deluxe survival mode.