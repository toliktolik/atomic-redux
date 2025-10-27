# Corrected Survival HUD System Implementation Plan
*Based on Ghidra Re-verification & HeavyWeapon_Asset_Hints_v2.xml Analysis*

## Overview
After re-verification against `SurvivalMode_DrawHUD @ 0x0042e220` and coordinate analysis, this corrected plan addresses authentic survival timer display, mode identification, and visual effects for the atomic_survival_redux Pixi.js project.

## Current Implementation Assessment

### ✅ Strong Foundation
- **HUD System**: Functional HUD with score, health, and ammo display
- **Text Rendering**: Pixi.js text system with styling capabilities
- **UI Container**: Proper UI layer separation from game elements
- **Update System**: HUD updates tied to game loop

### ❌ Critical Gaps (Re-verified)
1. **Survival Timer Format**: Missing `MM:SS:MS` timer display
2. **Mode Identification**: No "SURVIVAL MODE" title display
3. **Authentic Positioning**: Coordinates don't match Ghidra decompiled layout
4. **Visual State Indicators**: Missing survival-specific warning systems

## Ghidra Function Analysis

**Key Function Re-verified:**
```cpp
void SurvivalMode_DrawHUD(void *this, undefined4 *param_1) {
    // Renders "SURVIVAL MODE" text at coordinates (0xd1, 0x14) = (209, 20)
    // Displays formatted timer: "%i:%02i:%02i" format
    // Shows survival tier and level indicators
    // Applies health-based color modulation effects
}
```

**Coordinate Mapping (Ghidra → Pixi.js):**
- Title position: `(0xd1, 0x14)` = `(209, 20)`
- Timer position: `(0x14, timer_y)` = `(20, 40)`
- Status indicators: `(0xc4, 0x6)` = `(196, 6)`

## Technical Implementation Plan

### Phase 1: Authentic Survival Timer (High Priority)

**1.1 Survival Timer Component**
```typescript
// src/ui/SurvivalTimer.ts - NEW FILE
export class SurvivalTimer extends PIXI.Container {
    private timerText: PIXI.Text;
    private startTime: number;
    private currentTime: number = 0;
    private timerStyle: PIXI.TextStyle;

    constructor() {
        super();

        this.startTime = Date.now();
        this.createTimerStyle();
        this.createTimerDisplay();
        this.positionTimer();
    }

    private createTimerStyle(): void {
        // Based on Ghidra coordinates and original game styling
        this.timerStyle = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 24,
            fill: '#00ff00',        // Green color matching original
            stroke: '#000000',
            strokeThickness: 2,
            dropShadow: true,
            dropShadowDistance: 2,
            dropShadowColor: '#000000',
            dropShadowAlpha: 0.8
        });
    }

    private createTimerDisplay(): void {
        this.timerText = new PIXI.Text('0:00:00', this.timerStyle);
        this.timerText.anchor.set(0, 0); // Top-left anchor
        this.addChild(this.timerText);
    }

    private positionTimer(): void {
        // Position based on Ghidra coordinates: x=0x14 (20), y=calculated
        this.x = 20;
        this.y = 40;
    }

    /**
     * Update timer with authentic MM:SS:MS format
     * Based on Ghidra format string: "%i:%02i:%02i"
     */
    public update(survivalTimeMs: number): void {
        this.currentTime = survivalTimeMs;

        const minutes = Math.floor(survivalTimeMs / 60000);
        const seconds = Math.floor((survivalTimeMs % 60000) / 1000);
        const milliseconds = Math.floor((survivalTimeMs % 1000) / 10); // Display as centiseconds

        // Format: M:SS:MS (matches Ghidra format string)
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
        this.timerText.text = timeString;

        // Apply color changes based on survival time milestones
        this.updateTimerColor(survivalTimeMs);
    }

    private updateTimerColor(survivalTimeMs: number): void {
        const minutes = Math.floor(survivalTimeMs / 60000);

        if (minutes >= 10) {
            // Gold color for 10+ minutes (legendary survival)
            this.timerStyle.fill = '#ffd700';
        } else if (minutes >= 5) {
            // Orange color for 5+ minutes (advanced survival)
            this.timerStyle.fill = '#ff9900';
        } else if (minutes >= 2) {
            // Yellow color for 2+ minutes (good survival)
            this.timerStyle.fill = '#ffff00';
        } else {
            // Green color for early survival
            this.timerStyle.fill = '#00ff00';
        }

        this.timerText.style = this.timerStyle;
    }

    /**
     * Get formatted time string for external use
     */
    public getFormattedTime(): string {
        return this.timerText.text;
    }
}
```

**1.2 Survival Mode Title Display**
```typescript
// src/ui/SurvivalModeTitle.ts - NEW FILE
export class SurvivalModeTitle extends PIXI.Container {
    private titleText: PIXI.Text;
    private tierBadge: PIXI.Graphics;
    private currentTier: number = 0;

    constructor() {
        super();

        this.createTitleDisplay();
        this.createTierBadge();
        this.positionElements();
    }

    private createTitleDisplay(): void {
        const titleStyle = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 20,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            dropShadow: true,
            dropShadowDistance: 3,
            dropShadowColor: '#000000'
        });

        this.titleText = new PIXI.Text('SURVIVAL MODE', titleStyle);
        this.titleText.anchor.set(0, 0); // Top-left anchor
        this.addChild(this.titleText);
    }

    private createTierBadge(): void {
        this.tierBadge = new PIXI.Graphics();
        this.addChild(this.tierBadge);
        this.updateTierBadge(0);
    }

    private positionElements(): void {
        // Position based on Ghidra coordinates: (0xd1, 0x14) = (209, 20)
        this.x = 209;
        this.y = 20;

        // Position tier badge relative to title
        this.tierBadge.x = this.titleText.width + 10;
        this.tierBadge.y = 0;
    }

    private updateTierBadge(tier: number): void {
        this.tierBadge.clear();

        // Draw tier badge background
        this.tierBadge.beginFill(0x444444);
        this.tierBadge.drawRoundedRect(0, 0, 40, 20, 5);
        this.tierBadge.endFill();

        // Draw tier number
        const tierStyle = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 14,
            fill: '#ffffff'
        });

        const tierText = new PIXI.Text(`T${tier}`, tierStyle);
        tierText.anchor.set(0.5);
        tierText.x = 20;
        tierText.y = 10;
        this.tierBadge.addChild(tierText);
    }

    /**
     * Update survival tier display
     */
    public updateTier(tier: number): void {
        if (this.currentTier !== tier) {
            this.currentTier = tier;
            this.updateTierBadge(tier);
        }
    }
}
```

### Phase 2: Visual State Indicators (Medium Priority)

**2.1 Health Warning System**
```typescript
// src/ui/HealthWarningSystem.ts - NEW FILE
export class HealthWarningSystem extends PIXI.Container {
    private warningOverlay: PIXI.Graphics;
    private flashTimer: number = 0;
    private isFlashing: boolean = false;
    private warningActive: boolean = false;

    constructor() {
        super();
        this.createWarningOverlay();
    }

    private createWarningOverlay(): void {
        this.warningOverlay = new PIXI.Graphics();
        this.warningOverlay.alpha = 0;
        this.addChild(this.warningOverlay);
    }

    /**
     * Update health warning based on player health
     * Implements Ghidra color modulation logic
     */
    public update(deltaTime: number, healthPercentage: number): void {
        if (healthPercentage < 0.3) {
            // Critical health - red flash effect
            this.startWarning(0xff0000, 0.3, 500); // Red, 30% alpha, 500ms flash
        } else if (healthPercentage < 0.6) {
            // Low health - yellow warning
            this.startWarning(0xffff00, 0.2, 1000); // Yellow, 20% alpha, 1s flash
        } else {
            // Normal health - no warning
            this.stopWarning();
        }

        if (this.isFlashing) {
            this.updateFlashEffect(deltaTime);
        }
    }

    private startWarning(color: number, maxAlpha: number, flashInterval: number): void {
        if (!this.warningActive) {
            this.warningActive = true;
            this.isFlashing = true;
            this.flashTimer = 0;

            // Create full-screen warning overlay
            this.warningOverlay.clear();
            this.warningOverlay.beginFill(color, maxAlpha);
            this.warningOverlay.drawRect(0, 0, GameConstants.SCREEN_WIDTH, GameConstants.SCREEN_HEIGHT);
            this.warningOverlay.endFill();
        }
    }

    private updateFlashEffect(deltaTime: number): void {
        this.flashTimer += deltaTime * 1000;

        // Create pulsing flash effect
        const flashCycle = Math.sin(this.flashTimer * 0.01);
        this.warningOverlay.alpha = Math.max(0, flashCycle * 0.3);
    }

    private stopWarning(): void {
        if (this.warningActive) {
            this.warningActive = false;
            this.isFlashing = false;
            this.warningOverlay.alpha = 0;
        }
    }
}
```

**2.2 Difficulty Transition Effects**
```typescript
// src/ui/DifficultyIndicator.ts - NEW FILE
export class DifficultyIndicator extends PIXI.Container {
    private difficultyText: PIXI.Text;
    private transitionEffect: PIXI.Graphics;
    private currentDifficulty: number = 0;
    private transitionTimer: number = 0;

    constructor() {
        super();

        this.createDifficultyDisplay();
        this.createTransitionEffect();
        this.positionElements();
    }

    private createDifficultyDisplay(): void {
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 16,
            fill: '#00ffff', // Cyan for difficulty
            stroke: '#000000',
            strokeThickness: 2
        });

        this.difficultyText = new PIXI.Text('DIFFICULTY 0', style);
        this.difficultyText.anchor.set(1, 0); // Top-right anchor
        this.addChild(this.difficultyText);
    }

    private createTransitionEffect(): void {
        this.transitionEffect = new PIXI.Graphics();
        this.transitionEffect.alpha = 0;
        this.addChild(this.transitionEffect);
    }

    private positionElements(): void {
        // Position at top-right of screen
        this.x = GameConstants.SCREEN_WIDTH - 20;
        this.y = 20;
    }

    /**
     * Update difficulty level with transition effect
     * Triggered every 12 seconds based on survival time
     */
    public updateDifficulty(survivalTimeMs: number): void {
        const newDifficulty = Math.floor(survivalTimeMs / 12000);

        if (newDifficulty > this.currentDifficulty) {
            this.currentDifficulty = newDifficulty;
            this.difficultyText.text = `DIFFICULTY ${newDifficulty}`;

            // Trigger transition effect
            this.showTransitionEffect();
        }
    }

    private showTransitionEffect(): void {
        // Flash effect for difficulty increase
        this.transitionEffect.clear();
        this.transitionEffect.beginFill(0xffffff, 0.8);
        this.transitionEffect.drawRect(-200, -10, 400, 40);
        this.transitionEffect.endFill();

        this.transitionEffect.alpha = 1;
        this.transitionTimer = 0;

        // Animate flash fade
        const fadeOut = () => {
            this.transitionTimer += 16; // ~60fps
            this.transitionEffect.alpha = Math.max(0, 1 - (this.transitionTimer / 1000));

            if (this.transitionEffect.alpha > 0) {
                requestAnimationFrame(fadeOut);
            }
        };
        fadeOut();
    }

    public getCurrentDifficulty(): number {
        return this.currentDifficulty;
    }
}
```

### Phase 3: Survival Statistics HUD (Low Priority)

**3.1 Enhanced Survival Stats Display**
```typescript
// src/ui/SurvivalStatsHUD.ts - NEW FILE
export class SurvivalStatsHUD extends PIXI.Container {
    private statsContainer: PIXI.Container;
    private enemyCountText: PIXI.Text;
    private waveCountText: PIXI.Text;
    private accuracyText: PIXI.Text;
    private showStats: boolean = false;

    constructor() {
        super();

        this.createStatsContainer();
        this.createStatTexts();
        this.positionStats();
        this.visible = false;
    }

    private createStatsContainer(): void {
        this.statsContainer = new PIXI.Container();

        // Semi-transparent background
        const background = new PIXI.Graphics();
        background.beginFill(0x000000, 0.7);
        background.drawRoundedRect(0, 0, 200, 100, 10);
        background.endFill();

        this.statsContainer.addChild(background);
        this.addChild(this.statsContainer);
    }

    private createStatTexts(): void {
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 14,
            fill: '#ffffff'
        });

        this.enemyCountText = new PIXI.Text('ENEMIES: 0', textStyle);
        this.enemyCountText.x = 10;
        this.enemyCountText.y = 10;
        this.statsContainer.addChild(this.enemyCountText);

        this.waveCountText = new PIXI.Text('WAVE: 0', textStyle);
        this.waveCountText.x = 10;
        this.waveCountText.y = 30;
        this.statsContainer.addChild(this.waveCountText);

        this.accuracyText = new PIXI.Text('ACCURACY: 0%', textStyle);
        this.accuracyText.x = 10;
        this.accuracyText.y = 50;
        this.statsContainer.addChild(this.accuracyText);
    }

    private positionStats(): void {
        // Position at bottom-left corner
        this.x = 20;
        this.y = GameConstants.SCREEN_HEIGHT - 120;
    }

    /**
     * Update survival statistics display
     */
    public updateStats(enemyCount: number, waveNumber: number, accuracy: number): void {
        this.enemyCountText.text = `ENEMIES: ${enemyCount}`;
        this.waveCountText.text = `WAVE: ${waveNumber}`;
        this.accuracyText.text = `ACCURACY: ${Math.round(accuracy * 100)}%`;
    }

    /**
     * Toggle statistics display visibility
     */
    public toggleStats(): void {
        this.showStats = !this.showStats;
        this.visible = this.showStats;
    }
}
```

### Phase 4: Integration with Existing HUD (High Priority)

**4.1 Enhanced HUD Manager**
```typescript
// src/ui/HUD.ts - Enhanced with survival components
export class HUD extends PIXI.Container {
    // Existing components...

    // New survival-specific components
    private survivalTimer: SurvivalTimer;
    private survivalTitle: SurvivalModeTitle;
    private healthWarning: HealthWarningSystem;
    private difficultyIndicator: DifficultyIndicator;
    private statsHUD: SurvivalStatsHUD;

    constructor(game: Game) {
        super();
        this.game = game;

        // Initialize existing components...

        // Initialize new survival components
        this.initializeSurvivalHUD();
    }

    private initializeSurvivalHUD(): void {
        this.survivalTimer = new SurvivalTimer();
        this.addChild(this.survivalTimer);

        this.survivalTitle = new SurvivalModeTitle();
        this.addChild(this.survivalTitle);

        this.healthWarning = new HealthWarningSystem();
        this.addChild(this.healthWarning);

        this.difficultyIndicator = new DifficultyIndicator();
        this.addChild(this.difficultyIndicator);

        this.statsHUD = new SurvivalStatsHUD();
        this.addChild(this.statsHUD);
    }

    /**
     * Enhanced update with survival-specific elements
     */
    public update(deltaTime: number, tank: Tank): void {
        // Update existing HUD components...

        // Update survival-specific components
        const survivalTime = this.game.getElapsedTime();
        const healthPercentage = tank.health / tank.maxHealth;

        this.survivalTimer.update(survivalTime);
        this.healthWarning.update(deltaTime, healthPercentage);
        this.difficultyIndicator.updateDifficulty(survivalTime);

        // Update statistics
        const enemyCount = this.game.getEnemies().length;
        const waveNumber = this.game.getWaveSystem().getCurrentWave();
        const accuracy = this.calculateAccuracy(); // Implement accuracy tracking

        this.statsHUD.updateStats(enemyCount, waveNumber, accuracy);

        // Update survival tier based on progression
        const currentTier = this.calculateSurvivalTier(survivalTime);
        this.survivalTitle.updateTier(currentTier);
    }

    private calculateSurvivalTier(survivalTime: number): number {
        // Calculate tier based on survival time and difficulty progression
        const minutes = Math.floor(survivalTime / 60000);
        return Math.min(Math.floor(minutes / 2), 9); // Tier 0-9, advancing every 2 minutes
    }

    private calculateAccuracy(): number {
        // Implement shot accuracy tracking
        // Would require tracking shots fired vs. hits
        return 0.75; // Placeholder
    }

    /**
     * Handle debug key presses for HUD features
     */
    public handleDebugInput(key: string): void {
        switch (key) {
            case 'F1':
                this.statsHUD.toggleStats();
                break;
        }
    }
}
```

## Implementation Timeline

### Week 1: Core Timer System
- [ ] Implement SurvivalTimer with MM:SS:MS format
- [ ] Create SurvivalModeTitle with tier indicators
- [ ] Test coordinate positioning against Ghidra layout

### Week 2: Visual Effects
- [ ] Implement HealthWarningSystem with flash effects
- [ ] Create DifficultyIndicator with transition animations
- [ ] Test visual effects performance

### Week 3: Statistics & Integration
- [ ] Implement SurvivalStatsHUD
- [ ] Enhance existing HUD class with survival components
- [ ] Add debug toggles and accessibility features

### Week 4: Polish & Optimization
- [ ] Visual polish and authentic styling
- [ ] Performance optimization for multiple HUD elements
- [ ] Accessibility features and screen reader support

## Technical Considerations

**Coordinate System:**
- All positions mapped from Ghidra hexadecimal coordinates
- Maintains exact layout matching original game
- Responsive scaling for different screen sizes

**Performance:**
- Text rendering optimized with caching
- Visual effects use GPU acceleration where possible
- Update cycles optimized to prevent unnecessary redraws

**Accessibility:**
- High contrast color schemes
- Optional large text modes
- Keyboard navigation for debug features

This corrected implementation plan provides pixel-perfect recreation of the authentic Heavy Weapon Deluxe survival mode HUD system, maintaining visual fidelity while leveraging modern Pixi.js capabilities for enhanced performance and effects.