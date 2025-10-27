# Corrected Survival Wave System Implementation Plan
*Based on Ghidra Re-verification & HeavyWeapon_Asset_Hints_v2.xml Analysis*

## Overview
After re-verification against actual game assets, this corrected plan addresses XML-based wave configuration, formation spawning, and authentic difficulty scaling for the atomic_survival_redux Pixi.js project.

## Current Implementation Assessment

### ✅ Strong Foundation
- **XMLDataLoader**: Functional XML parsing system
- **WaveSystem**: Existing wave management with timer-based spawning
- **SurvivalWaveData**: Hardcoded survival0.xml data already implemented
- **Enemy System**: All 13 enemy types from craft.xml implemented

### ❌ Critical Gaps (Re-verified)
1. **XML Configuration Loading**: Uses hardcoded arrays instead of dynamic XML loading
2. **Formation Spawning**: Individual enemy spawning vs. coordinated group spawning
3. **Survival Timer Integration**: Missing wave progression tied to survival time
4. **Difficulty Scaling Formula**: Incorrect enemy health calculation vs. original

## Technical Implementation Plan

### Phase 1: XML Configuration System (High Priority)

**1.1 Enhanced XMLDataLoader for Survival Mode**
```typescript
// src/core/XMLDataLoader.ts - Enhanced survival loading
export class XMLDataLoader {
    /**
     * Load specific survival tier configuration (survival0.xml - survival9.xml)
     */
    public static async loadSurvivalTier(tier: number): Promise<SurvivalTierData> {
        const url = `./data/survival${tier}.xml`;
        const response = await fetch(url);
        const xmlText = await response.text();
        const xmlDoc = this.parser.parseFromString(xmlText, 'text/xml');

        const levels: SurvivalLevel[] = [];
        const levelElements = xmlDoc.querySelectorAll('Level');

        levelElements.forEach(level => {
            const waves: SurvivalWave[] = [];
            const waveElements = level.querySelectorAll('Wave');

            waveElements.forEach(wave => {
                const length = parseInt(wave.getAttribute('length') || '1000', 10);
                const enemies: SurvivalCraft[] = [];

                const craftElements = wave.querySelectorAll('Craft');
                craftElements.forEach(craft => {
                    enemies.push({
                        id: craft.getAttribute('id') || '',
                        qty: parseInt(craft.getAttribute('qty') || '1', 10)
                    });
                });

                waves.push({ length, enemies });
            });

            levels.push({ waves });
        });

        return {
            tier,
            levels,
            totalWaves: levels.reduce((sum, level) => sum + level.waves.length, 0)
        };
    }
}
```

**1.2 Dynamic Survival Configuration**
```typescript
// src/systems/SurvivalConfigManager.ts - NEW FILE
export interface SurvivalTierData {
    tier: number;
    levels: SurvivalLevel[];
    totalWaves: number;
}

export class SurvivalConfigManager {
    private static tierConfigs: Map<number, SurvivalTierData> = new Map();
    private static currentTier: number = 0;

    /**
     * Load survival configuration for specified tier
     */
    public static async loadTier(tier: number): Promise<SurvivalTierData> {
        if (this.tierConfigs.has(tier)) {
            return this.tierConfigs.get(tier)!;
        }

        try {
            const config = await XMLDataLoader.loadSurvivalTier(tier);
            this.tierConfigs.set(tier, config);
            return config;
        } catch (error) {
            console.warn(`Failed to load survival tier ${tier}, using fallback`);
            return this.createFallbackTier(tier);
        }
    }

    /**
     * Get wave configuration by survival time (every 12 seconds = difficulty increase)
     */
    public static getWaveForTime(survivalTimeMs: number, tier: number): SurvivalWave | null {
        const config = this.tierConfigs.get(tier);
        if (!config) return null;

        // Calculate level and wave based on survival time
        const difficultyLevel = Math.floor(survivalTimeMs / 12000); // Every 12 seconds
        const levelIndex = Math.floor(difficultyLevel / 4); // 4 waves per level
        const waveIndex = difficultyLevel % 4;

        if (levelIndex >= config.levels.length) {
            // Loop back to highest level for extended survival
            const lastLevel = config.levels[config.levels.length - 1];
            return lastLevel.waves[waveIndex % lastLevel.waves.length];
        }

        const level = config.levels[levelIndex];
        return level.waves[waveIndex % level.waves.length];
    }
}
```

### Phase 2: Formation Spawning System (Medium Priority)

**2.1 Formation-Based Wave Spawning**
```typescript
// src/systems/WaveSystem.ts - Enhanced formation spawning
export class WaveSystem {
    private formationSpawner: FormationSpawner;
    private currentSurvivalTier: number = 0;

    /**
     * Generate wave from XML configuration with formation spawning
     */
    private async generateWaveFromXML(survivalTimeMs: number): Promise<WaveDefinition> {
        const waveConfig = SurvivalConfigManager.getWaveForTime(survivalTimeMs, this.currentSurvivalTier);
        if (!waveConfig) {
            return this.generateFallbackWave();
        }

        // Create formation groups from XML wave data
        const formations: EnemyFormation[] = [];

        // Group similar enemy types for formation spawning
        const enemyGroups = this.groupEnemiesByType(waveConfig.enemies);

        for (const [enemyType, count] of enemyGroups) {
            if (count >= 3) {
                // Large groups spawn as formations
                formations.push(this.createFormation(enemyType, count));
            } else {
                // Small groups spawn individually with slight delays
                formations.push(this.createIndividualSpawns(enemyType, count));
            }
        }

        return {
            formations,
            waveLength: waveConfig.length,
            spawnInterval: this.calculateSpawnInterval(waveConfig.length, formations.length)
        };
    }

    private createFormation(enemyType: string, count: number): EnemyFormation {
        return {
            enemyType,
            count,
            spawnPattern: this.getFormationPattern(enemyType, count),
            delay: 0,
            coordinatedMovement: true
        };
    }
}
```

**2.2 Formation Spawner Implementation**
```typescript
// src/systems/FormationSpawner.ts - NEW FILE
export interface EnemyFormation {
    enemyType: string;
    count: number;
    spawnPattern: SpawnPattern;
    delay: number;
    coordinatedMovement: boolean;
}

export interface SpawnPattern {
    type: 'line' | 'v_formation' | 'cluster' | 'wave_front';
    spacing: number;
    basePosition: Vector2;
}

export class FormationSpawner {
    private game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Spawn enemy formation with coordinated movement
     */
    public spawnFormation(formation: EnemyFormation): void {
        const positions = this.calculateFormationPositions(formation);
        const formationId = Math.random().toString(36).substr(2, 9);

        positions.forEach((position, index) => {
            setTimeout(() => {
                const enemy = new Enemy(this.game, formation.enemyType as EnemyType);
                enemy.x = position.x;
                enemy.y = position.y;

                // Apply formation movement if coordinated
                if (formation.coordinatedMovement) {
                    this.applyFormationMovement(enemy, formationId, index, positions.length);
                }

                this.game.addEnemy(enemy);
            }, index * 200); // Stagger spawns slightly
        });
    }

    private calculateFormationPositions(formation: EnemyFormation): Vector2[] {
        const positions: Vector2[] = [];
        const pattern = formation.spawnPattern;

        switch (pattern.type) {
            case 'line':
                for (let i = 0; i < formation.count; i++) {
                    positions.push(new Vector2(
                        pattern.basePosition.x,
                        pattern.basePosition.y + (i * pattern.spacing)
                    ));
                }
                break;

            case 'v_formation':
                const center = Math.floor(formation.count / 2);
                for (let i = 0; i < formation.count; i++) {
                    const offset = Math.abs(i - center);
                    positions.push(new Vector2(
                        pattern.basePosition.x - (offset * pattern.spacing),
                        pattern.basePosition.y + (i * pattern.spacing)
                    ));
                }
                break;

            // Additional formation patterns...
        }

        return positions;
    }
}
```

### Phase 3: Authentic Difficulty Scaling (Medium Priority)

**3.1 Corrected Enemy Health Calculation**
```typescript
// src/entities/Enemy.ts - Corrected health scaling
export class Enemy extends PIXI.Container {
    /**
     * Calculate enemy health using authentic Heavy Weapon formula
     * Based on Ghidra analysis: health = base_armor * ((difficulty_level + 1) * 7)
     */
    private calculateSurvivalHealth(baseArmor: number, survivalTimeMs: number): number {
        const difficultyLevel = Math.floor(survivalTimeMs / 12000); // Every 12 seconds
        const scaledHealth = baseArmor * ((difficultyLevel + 1) * 7);
        const cappedHealth = Math.min(scaledHealth, baseArmor * 40); // Maximum 40x scaling

        return cappedHealth;
    }

    /**
     * Apply survival mode health scaling on enemy creation
     */
    public applySurvivalScaling(survivalTimeMs: number): void {
        const baseArmor = CRAFT_SPECIFICATIONS.get(this.enemyType)?.armor || 1;
        this.maxHealth = this.calculateSurvivalHealth(baseArmor, survivalTimeMs);
        this.health = this.maxHealth;
    }
}
```

**3.2 Wave Timing System**
```typescript
// src/systems/WaveSystem.ts - Enhanced timing
export class WaveSystem {
    private survivalTimer: number = 0;
    private lastDifficultyIncrease: number = 0;

    public update(deltaTime: number): void {
        this.survivalTimer += deltaTime * 1000;

        // Check for difficulty increase every 12 seconds
        const currentDifficultyLevel = Math.floor(this.survivalTimer / 12000);
        const lastDifficultyLevel = Math.floor(this.lastDifficultyIncrease / 12000);

        if (currentDifficultyLevel > lastDifficultyLevel) {
            this.onDifficultyIncrease(currentDifficultyLevel);
            this.lastDifficultyIncrease = this.survivalTimer;
        }

        // Update wave spawning based on survival time
        this.updateWaveSpawning(deltaTime);
    }

    private onDifficultyIncrease(newLevel: number): void {
        console.log(`Difficulty increased to level ${newLevel}`);

        // Increase spawn rates and enemy health
        this.currentSpawnInterval = Math.max(800, 1500 - (newLevel * 50));

        // Apply health scaling to future enemies
        this.difficultyLevel = newLevel;
    }
}
```

### Phase 4: Enhanced Visual Feedback (Low Priority)

**4.1 Wave Progression Display**
```typescript
// src/ui/WaveProgressHUD.ts - NEW FILE
export class WaveProgressHUD extends PIXI.Container {
    private waveText: PIXI.Text;
    private difficultyText: PIXI.Text;
    private progressBar: PIXI.Graphics;

    /**
     * Update wave progress display
     */
    public updateWaveProgress(currentWave: number, difficultyLevel: number, waveProgress: number): void {
        this.waveText.text = `WAVE ${currentWave}`;
        this.difficultyText.text = `DIFFICULTY ${difficultyLevel}`;

        // Update progress bar
        this.progressBar.clear();
        this.progressBar.beginFill(0x00ff00);
        this.progressBar.drawRect(0, 0, 200 * waveProgress, 10);
        this.progressBar.endFill();
    }
}
```

## Implementation Timeline

### Week 1: XML Configuration System
- [ ] Implement enhanced XMLDataLoader for survival tiers
- [ ] Create SurvivalConfigManager for dynamic configuration
- [ ] Test XML loading with survival0.xml through survival9.xml

### Week 2: Formation Spawning
- [ ] Implement FormationSpawner class
- [ ] Add formation pattern calculations
- [ ] Integrate formation spawning with existing WaveSystem

### Week 3: Difficulty Scaling
- [ ] Correct enemy health calculation formula
- [ ] Implement authentic 12-second difficulty progression
- [ ] Add visual feedback for difficulty increases

### Week 4: Integration & Testing
- [ ] Integrate all systems with existing game architecture
- [ ] Performance testing with large enemy formations
- [ ] Validate against original game behavior

## Technical Notes

**XML Asset Structure:**
- survival0.xml through survival9.xml provide 10 difficulty tiers
- Each tier contains 20 levels with 4 waves each (80 waves per tier)
- Wave lengths progress from 1000ms to 2900ms

**Formation Spawn Patterns:**
- **Line Formation**: Enemies spawn in vertical line (smaller craft)
- **V-Formation**: Larger craft in V-shaped patterns
- **Wave Front**: Ground vehicles in horizontal lines
- **Cluster**: Helicopters in loose groupings

**Performance Considerations:**
- Formation spawning limited to 50 enemies maximum
- XMLDataLoader caching to prevent redundant network requests
- Enemy pooling for formation spawns to reduce garbage collection

This corrected implementation plan ensures authentic Heavy Weapon Deluxe survival mode wave mechanics while leveraging the existing Pixi.js architecture effectively.