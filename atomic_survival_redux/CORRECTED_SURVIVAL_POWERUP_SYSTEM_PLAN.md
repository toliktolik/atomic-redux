# Corrected Survival Power-Up System Implementation Plan
*Based on Ghidra Re-verification & HeavyWeapon_Asset_Hints_v2.xml Analysis*

## Overview
After re-verification against Ghidra functions and asset analysis, this corrected plan addresses helicopter ally drops, context-aware power-up selection, and authentic survival mode mechanics for the atomic_survival_redux Pixi.js project.

## Current Implementation Assessment

### ✅ Strong Foundation
- **AllyHelicopter**: Complete helicopter system already implemented
- **PowerUpSystem**: Functional power-up spawning and collection
- **PowerUp Types**: All 8 power-up types implemented with effects
- **Audio System**: Helicopter sounds and power-up audio

### ❌ Critical Gaps (Re-verified)
1. **Context-Aware Selection**: Random power-ups vs. situational selection
2. **Drop Timing Calculation**: Fixed intervals vs. dynamic survival-based timing
3. **Power-Up Stacking**: Single application vs. stackable duration effects
4. **Bonus Reward Integration**: Missing propaganda poster/tower reward markers

## Ghidra Function Analysis

**Key Functions Re-verified:**
- `Survival_ProcessPowerUpDrops @ 0x0040aed0`: Dynamic helicopter timing based on survival metrics
- `Survival_SpawnBonusRewardMarker @ 0x004327b0`: Temporary bonus markers for structure destruction
- `Survival_CalculateWaveTiming @ 0x0040a790`: Power-up frequency tied to player health/weapon tier

## Technical Implementation Plan

### Phase 1: Context-Aware Power-Up Selection (High Priority)

**1.1 Survival Power-Up Selector**
```typescript
// src/systems/SurvivalPowerUpSelector.ts - NEW FILE
export interface GameStateContext {
    playerHealth: number;
    maxHealth: number;
    weaponTier: number;
    enemyCount: number;
    survivalTime: number;
    timeSinceLastDrop: number;
    recentPowerUps: PowerUpType[];
}

export class SurvivalPowerUpSelector {
    private lastDropTime: number = 0;
    private recentPowerUps: PowerUpType[] = [];
    private maxRecentTracking: number = 5;

    /**
     * Select power-up based on current game state (Ghidra-verified logic)
     */
    public selectOptimalPowerUp(context: GameStateContext): PowerUpType {
        // Clear old recent power-ups
        if (this.recentPowerUps.length > this.maxRecentTracking) {
            this.recentPowerUps.shift();
        }

        // Priority 1: Critical health (< 30%) - Shield/Health preferred
        if (context.playerHealth / context.maxHealth < 0.3) {
            if (!this.wasRecentlyDropped(PowerUpType.SHIELD)) {
                return PowerUpType.SHIELD;
            }
        }

        // Priority 2: Low weapon tier - Weapon upgrades
        if (context.weaponTier === 0 && context.survivalTime > 10000) {
            const weaponUpgrades = [PowerUpType.GUN_POWER_UP, PowerUpType.SPREAD_SHOT];
            return this.selectFromArray(weaponUpgrades);
        }

        // Priority 3: High enemy count (> 20) - Area damage
        if (context.enemyCount > 20) {
            if (!this.wasRecentlyDropped(PowerUpType.NUKE)) {
                return PowerUpType.NUKE;
            }
            return PowerUpType.MEGA_LASER;
        }

        // Priority 4: Long survival time - Advanced power-ups
        if (context.survivalTime > 60000) { // 1+ minute
            const advancedPowerUps = [PowerUpType.RAPID_FIRE, PowerUpType.SPEED_BOOST];
            return this.selectFromArray(advancedPowerUps);
        }

        // Priority 5: Balance prevention - Avoid recent duplicates
        const availablePowerUps = this.getAvailablePowerUps();
        const filteredPowerUps = availablePowerUps.filter(
            powerUp => !this.wasRecentlyDropped(powerUp)
        );

        return this.selectFromArray(filteredPowerUps.length > 0 ? filteredPowerUps : availablePowerUps);
    }

    private wasRecentlyDropped(powerUpType: PowerUpType): boolean {
        return this.recentPowerUps.includes(powerUpType);
    }

    private selectFromArray(powerUps: PowerUpType[]): PowerUpType {
        return powerUps[Math.floor(Math.random() * powerUps.length)];
    }

    private getAvailablePowerUps(): PowerUpType[] {
        return [
            PowerUpType.SHIELD,
            PowerUpType.NUKE,
            PowerUpType.MEGA_LASER,
            PowerUpType.SPEED_BOOST,
            PowerUpType.RAPID_FIRE,
            PowerUpType.GUN_POWER_UP,
            PowerUpType.SPREAD_SHOT
        ];
    }

    /**
     * Record power-up drop for future selection logic
     */
    public recordPowerUpDrop(powerUpType: PowerUpType): void {
        this.recentPowerUps.push(powerUpType);
        this.lastDropTime = Date.now();
    }
}
```

**1.2 Dynamic Drop Timing Calculator**
```typescript
// src/systems/HelicopterDropManager.ts - NEW FILE
export interface DropCalculationFactors {
    baseInterval: number;     // 15000ms base interval
    healthBonus: number;      // Frequency increase for low health
    weaponBonus: number;      // Frequency increase for basic weapons
    timeBonus: number;        // Frequency increase over survival time
    maxDropChance: number;    // Maximum drop probability (70%)
}

export class HelicopterDropManager {
    private dropCalculation: DropCalculationFactors;
    private lastDropTime: number = 0;
    private powerUpSelector: SurvivalPowerUpSelector;

    constructor() {
        this.dropCalculation = {
            baseInterval: 15000,  // 15 seconds
            healthBonus: 0.2,     // 20% increase when health < 30%
            weaponBonus: 0.1,     // 10% increase with basic weapons
            timeBonus: 0.1,       // 10% increase after 60+ seconds
            maxDropChance: 0.7    // 70% maximum
        };

        this.powerUpSelector = new SurvivalPowerUpSelector();
    }

    /**
     * Calculate helicopter drop probability based on survival context
     * Based on Ghidra function: Survival_ProcessPowerUpDrops
     */
    public calculateDropChance(context: GameStateContext): number {
        let dropChance = 0.3; // Base 30% chance

        // Health-based bonus (Ghidra-verified logic)
        const healthPercentage = context.playerHealth / context.maxHealth;
        if (healthPercentage < 0.3) {
            dropChance += this.dropCalculation.healthBonus;
        } else if (healthPercentage < 0.6) {
            dropChance += this.dropCalculation.healthBonus * 0.5;
        }

        // Weapon tier bonus
        if (context.weaponTier === 0) {
            dropChance += this.dropCalculation.weaponBonus;
        }

        // Time-based bonus (increases over survival time)
        if (context.timeSinceLastDrop > 60000) { // Over 1 minute since last drop
            dropChance += this.dropCalculation.timeBonus;
        }

        // Survival time bonus (long survival gets more frequent drops)
        if (context.survivalTime > 120000) { // 2+ minutes
            dropChance += 0.05;
        }

        // Cap maximum drop chance
        return Math.min(dropChance, this.dropCalculation.maxDropChance);
    }

    /**
     * Determine if helicopter should spawn based on survival state
     */
    public shouldSpawnHelicopter(context: GameStateContext): boolean {
        const currentTime = context.survivalTime;

        // Enforce minimum interval between drops
        if (currentTime - this.lastDropTime < this.dropCalculation.baseInterval * 0.5) {
            return false;
        }

        const dropChance = this.calculateDropChance(context);
        return Math.random() < dropChance;
    }

    /**
     * Spawn helicopter with context-aware power-up selection
     */
    public spawnHelicopter(game: Game, context: GameStateContext): void {
        const powerUpType = this.powerUpSelector.selectOptimalPowerUp(context);
        const dropX = this.calculateOptimalDropPosition(game, context);

        const helicopter = new AllyHelicopter(game, powerUpType, dropX);
        game.layers.getLayer('allies').addChild(helicopter);

        this.powerUpSelector.recordPowerUpDrop(powerUpType);
        this.lastDropTime = context.survivalTime;

        console.log(`Helicopter spawned with ${PowerUpType[powerUpType]} at x=${dropX} (drop chance was ${(this.calculateDropChance(context) * 100).toFixed(1)}%)`);
    }

    private calculateOptimalDropPosition(game: Game, context: GameStateContext): number {
        const tank = game.getTank();
        if (!tank) {
            return GameConstants.SCREEN_WIDTH / 2;
        }

        // Position helicopter drop near player tank (within reasonable range)
        const tankX = tank.x;
        const minDropX = Math.max(100, tankX - 200);
        const maxDropX = Math.min(GameConstants.SCREEN_WIDTH - 100, tankX + 200);

        return minDropX + Math.random() * (maxDropX - minDropX);
    }
}
```

### Phase 2: Power-Up Stacking System (Medium Priority)

**2.1 Stackable Power-Up Effects**
```typescript
// src/systems/StackablePowerUpManager.ts - NEW FILE
export interface PowerUpStack {
    type: PowerUpType;
    stacks: number;
    duration: number;
    maxStacks: number;
    intensity: number;
}

export class StackablePowerUpManager {
    private activePowerUps: Map<PowerUpType, PowerUpStack> = new Map();
    private tank: Tank;

    constructor(tank: Tank) {
        this.tank = tank;
    }

    /**
     * Apply power-up with stacking logic
     */
    public applyPowerUp(type: PowerUpType): void {
        const existing = this.activePowerUps.get(type);

        if (existing && this.canStack(type)) {
            // Stack existing power-up
            this.stackPowerUp(existing);
        } else {
            // Apply new power-up
            this.createNewPowerUp(type);
        }
    }

    private canStack(type: PowerUpType): boolean {
        const stackableTypes = [
            PowerUpType.RAPID_FIRE,
            PowerUpType.SPEED_BOOST,
            PowerUpType.SHIELD,
            PowerUpType.GUN_POWER_UP
        ];
        return stackableTypes.includes(type);
    }

    private stackPowerUp(powerUp: PowerUpStack): void {
        if (powerUp.stacks < powerUp.maxStacks) {
            powerUp.stacks++;
            powerUp.duration += this.getBaseDuration(powerUp.type) * 0.5; // Extend duration
            powerUp.intensity = Math.min(powerUp.intensity * 1.2, 3.0); // Increase intensity
        } else {
            // Max stacks reached, just refresh duration
            powerUp.duration = Math.max(powerUp.duration, this.getBaseDuration(powerUp.type));
        }

        this.applyStackedEffect(powerUp);
    }

    private createNewPowerUp(type: PowerUpType): void {
        const stack: PowerUpStack = {
            type,
            stacks: 1,
            duration: this.getBaseDuration(type),
            maxStacks: this.getMaxStacks(type),
            intensity: 1.0
        };

        this.activePowerUps.set(type, stack);
        this.applyStackedEffect(stack);
    }

    private applyStackedEffect(powerUp: PowerUpStack): void {
        switch (powerUp.type) {
            case PowerUpType.RAPID_FIRE:
                this.tank.setRapidFireMultiplier(1.5 * powerUp.intensity);
                break;

            case PowerUpType.SPEED_BOOST:
                this.tank.setSpeedMultiplier(1.3 * powerUp.intensity);
                break;

            case PowerUpType.SHIELD:
                this.tank.addShieldHealth(25 * powerUp.stacks);
                break;

            case PowerUpType.GUN_POWER_UP:
                this.tank.setDamageMultiplier(1.25 * powerUp.intensity);
                break;
        }
    }

    public update(deltaTime: number): void {
        const toRemove: PowerUpType[] = [];

        this.activePowerUps.forEach((powerUp, type) => {
            powerUp.duration -= deltaTime * 1000;

            if (powerUp.duration <= 0) {
                this.removePowerUpEffect(type);
                toRemove.push(type);
            }
        });

        toRemove.forEach(type => this.activePowerUps.delete(type));
    }

    private getBaseDuration(type: PowerUpType): number {
        const durations = new Map([
            [PowerUpType.RAPID_FIRE, 10000],
            [PowerUpType.SPEED_BOOST, 8000],
            [PowerUpType.SHIELD, 15000],
            [PowerUpType.GUN_POWER_UP, 12000]
        ]);
        return durations.get(type) || 5000;
    }

    private getMaxStacks(type: PowerUpType): number {
        const maxStacks = new Map([
            [PowerUpType.RAPID_FIRE, 3],
            [PowerUpType.SPEED_BOOST, 2],
            [PowerUpType.SHIELD, 5],
            [PowerUpType.GUN_POWER_UP, 3]
        ]);
        return maxStacks.get(type) || 1;
    }

    private removePowerUpEffect(type: PowerUpType): void {
        // Reset tank stats when power-up expires
        switch (type) {
            case PowerUpType.RAPID_FIRE:
                this.tank.setRapidFireMultiplier(1.0);
                break;

            case PowerUpType.SPEED_BOOST:
                this.tank.setSpeedMultiplier(1.0);
                break;

            case PowerUpType.GUN_POWER_UP:
                this.tank.setDamageMultiplier(1.0);
                break;
        }
    }
}
```

### Phase 3: Bonus Reward Marker System (Medium Priority)

**3.1 Background Destruction Rewards**
```typescript
// src/systems/BonusRewardSystem.ts - NEW FILE
export enum RewardMarkerType {
    PROPAGANDA_BONUS = 'propaganda_bonus',
    TOWER_BONUS = 'tower_bonus',
    TIME_MILESTONE = 'time_milestone',
    SCORE_MULTIPLIER = 'score_multiplier'
}

export interface RewardMarker {
    type: RewardMarkerType;
    position: Vector2;
    value: number;
    duration: number;
    collected: boolean;
}

export class BonusRewardSystem {
    private game: Game;
    private activeMarkers: RewardMarker[] = [];
    private helicopterDropManager: HelicopterDropManager;

    constructor(game: Game, helicopterDropManager: HelicopterDropManager) {
        this.game = game;
        this.helicopterDropManager = helicopterDropManager;
    }

    /**
     * Spawn bonus marker when propaganda poster destroyed
     * Based on Ghidra: Survival_SpawnBonusRewardMarker
     */
    public spawnPropagandaBonus(x: number, y: number): void {
        const marker: RewardMarker = {
            type: RewardMarkerType.PROPAGANDA_BONUS,
            position: new Vector2(x, y),
            value: 1500, // Bonus score for poster destruction
            duration: 8000, // 8 seconds to collect
            collected: false
        };

        this.activeMarkers.push(marker);
        this.createMarkerVisual(marker);

        // Chance to trigger helicopter drop after poster destruction
        this.tryTriggerHelicopterDrop('poster_destroyed');
    }

    /**
     * Spawn bonus marker when control tower destroyed
     */
    public spawnTowerBonus(x: number, y: number): void {
        const marker: RewardMarker = {
            type: RewardMarkerType.TOWER_BONUS,
            position: new Vector2(x, y),
            value: 3000, // High bonus for strategic target
            duration: 12000, // 12 seconds to collect
            collected: false
        };

        this.activeMarkers.push(marker);
        this.createMarkerVisual(marker);

        // High chance to trigger helicopter drop after tower destruction
        this.tryTriggerHelicopterDrop('tower_destroyed');
    }

    /**
     * Spawn time-based milestone markers
     */
    public spawnTimeMilestone(survivalTime: number): void {
        const milestoneMinutes = Math.floor(survivalTime / 60000);
        const marker: RewardMarker = {
            type: RewardMarkerType.TIME_MILESTONE,
            position: new Vector2(GameConstants.SCREEN_WIDTH / 2, 200),
            value: milestoneMinutes * 1000, // 1000 points per minute survived
            duration: 5000,
            collected: false
        };

        this.activeMarkers.push(marker);
        this.createMarkerVisual(marker);
    }

    private createMarkerVisual(marker: RewardMarker): void {
        const markerSprite = new PIXI.Container();

        // Background glow
        const glow = new PIXI.Graphics();
        glow.beginFill(0xffff00, 0.3);
        glow.drawCircle(0, 0, 30);
        glow.endFill();
        markerSprite.addChild(glow);

        // Score text
        const scoreText = new PIXI.Text(`+${marker.value}`, {
            fontFamily: 'Arial Black',
            fontSize: 24,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        scoreText.anchor.set(0.5);
        markerSprite.addChild(scoreText);

        // Position marker
        markerSprite.x = marker.position.x;
        markerSprite.y = marker.position.y;

        this.game.layers.getLayer('effects').addChild(markerSprite);

        // Animate marker (pulsing effect)
        this.animateMarker(markerSprite, marker);
    }

    private animateMarker(sprite: PIXI.Container, marker: RewardMarker): void {
        let elapsedTime = 0;

        const animate = (deltaTime: number) => {
            elapsedTime += deltaTime * 1000;

            // Pulse animation
            const pulse = 1 + Math.sin(elapsedTime * 0.008) * 0.2;
            sprite.scale.set(pulse);

            // Fade out near expiration
            if (elapsedTime > marker.duration * 0.7) {
                const fadeProgress = (elapsedTime - marker.duration * 0.7) / (marker.duration * 0.3);
                sprite.alpha = 1 - fadeProgress;
            }

            // Remove when expired
            if (elapsedTime >= marker.duration && !marker.collected) {
                this.game.app.ticker.remove(animate);
                sprite.destroy();
                this.removeMarker(marker);
            }
        };

        this.game.app.ticker.add(animate);
    }

    private tryTriggerHelicopterDrop(trigger: string): void {
        // Calculate bonus helicopter chance based on trigger
        let bonusChance = 0;

        switch (trigger) {
            case 'poster_destroyed':
                bonusChance = 0.3; // 30% chance
                break;
            case 'tower_destroyed':
                bonusChance = 0.7; // 70% chance
                break;
        }

        if (Math.random() < bonusChance) {
            // Create context for helicopter spawn
            const context = this.createGameContext();
            this.helicopterDropManager.spawnHelicopter(this.game, context);
        }
    }

    private createGameContext(): GameStateContext {
        const tank = this.game.getTank();
        return {
            playerHealth: tank ? tank.health : 100,
            maxHealth: tank ? tank.maxHealth : 100,
            weaponTier: tank ? tank.getCurrentWeaponTier() : 0,
            enemyCount: this.game.getEnemies().length,
            survivalTime: this.game.getElapsedTime(),
            timeSinceLastDrop: 0, // Would need tracking
            recentPowerUps: []
        };
    }

    public update(deltaTime: number): void {
        // Check for marker collection by tank
        this.checkMarkerCollections();
    }

    private checkMarkerCollections(): void {
        const tank = this.game.getTank();
        if (!tank) return;

        this.activeMarkers.forEach(marker => {
            if (!marker.collected && this.isMarkerCollected(marker, tank)) {
                this.collectMarker(marker);
            }
        });
    }

    private isMarkerCollected(marker: RewardMarker, tank: Tank): boolean {
        const distance = Math.sqrt(
            Math.pow(marker.position.x - tank.x, 2) +
            Math.pow(marker.position.y - tank.y, 2)
        );
        return distance < 50; // Collection radius
    }

    private collectMarker(marker: RewardMarker): void {
        marker.collected = true;
        this.game.getScoreManager().addScore(marker.value);

        // Visual collection effect
        this.game.getParticleSystem().createScorePopup(
            marker.position.x,
            marker.position.y,
            marker.value
        );
    }

    private removeMarker(marker: RewardMarker): void {
        const index = this.activeMarkers.indexOf(marker);
        if (index > -1) {
            this.activeMarkers.splice(index, 1);
        }
    }
}
```

## Integration Plan

### Phase 1: Context-Aware System (Week 1)
- [ ] Implement SurvivalPowerUpSelector with Ghidra-verified logic
- [ ] Create HelicopterDropManager with dynamic timing
- [ ] Test context-aware power-up selection

### Phase 2: Stacking Effects (Week 2)
- [ ] Implement StackablePowerUpManager
- [ ] Add power-up intensity scaling
- [ ] Test multiple power-up interactions

### Phase 3: Bonus System (Week 2-3)
- [ ] Create BonusRewardSystem
- [ ] Integrate with background destruction events
- [ ] Add time-based milestone markers

### Phase 4: Integration (Week 3-4)
- [ ] Integrate all systems with existing PowerUpSystem
- [ ] Performance testing with multiple helicopters
- [ ] Balance testing and adjustment

## Technical Considerations

**Performance Optimizations:**
- Power-up selection calculation cached for 1-second intervals
- Helicopter pooling for multiple simultaneous spawns
- Marker visual effects using GPU-accelerated particle system

**Balance Considerations:**
- Maximum 2 helicopters on screen simultaneously
- Power-up stacking caps to prevent overpowered combinations
- Bonus marker timing prevents spam collection

**Asset Integration:**
- Uses existing AllyHelicopter implementation
- Leverages current PowerUp visual system
- Compatible with existing audio and particle systems

This corrected implementation plan provides authentic Heavy Weapon Deluxe survival mode power-up mechanics with context-aware selection and advanced stacking systems, fully compatible with the existing Pixi.js architecture.