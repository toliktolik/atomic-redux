/**
 * Wave System - Manages enemy wave spawning and difficulty progression
 */

import { Game } from '../core/Game';
import { Enemy, EnemyType } from '../entities/Enemy';
import { GameConstants } from '../config/GameConstants';
import { AssetLoader } from '../core/AssetLoader';
import { getSurvivalPosition, calculateEnemyHealth, CRAFT_SPECIFICATIONS } from '../data/SurvivalWaveData';
import { XMLDataLoader, SurvivalTierData, SurvivalWave, SurvivalLevel } from '../core/XMLDataLoader';
import { FormationSpawner, FormationType } from './FormationSpawner';
import { SurvivalConfigManager } from './SurvivalConfigManager';

// Use survival wave data structure
interface WaveDefinition {
    enemies: { type: EnemyType; count: number }[];
    spawnInterval: number;
    waveDelay: number;
    length: number; // Wave length from XML
}

export class WaveSystem {
    private game: Game;
    private formationSpawner: FormationSpawner;

    // XML data cache
    private static survivalDataCache: Map<number, SurvivalTierData> = new Map();

    // Wave state
    private currentWave: number = 0;
    private waveInProgress: boolean = false;
    private enemiesInWave: number = 0;
    private enemiesSpawned: number = 0;
    private enemiesDefeated: number = 0;
    private isWaveActive: boolean = false;
    private waveTimer: number = 0;
    private waveDelay: number = 1000; // Delay between waves
    private totalWaves: number = 0; // Track total waves completed

    // Difficulty
    private difficultyLevel: number = 0;
    private difficultyTimer: number = 0;
    private difficultyIncreaseInterval: number = 12000; // 12 seconds

    // Spawning
    private spawnTimer: number = 0;
    private currentSpawnInterval: number = 1500;
    private waveDelayTimer: number = 0;
    private currentWaveDelay: number = 1000;

    // Wave queue
    private enemyQueue: EnemyType[] = [];
    private spawnSide: 'left' | 'right' = 'left';

    // Statistics
    private totalEnemiesDefeated: number = 0;
    private wavesCompleted: number = 0;

    constructor(game: Game) {
        this.game = game;
        this.formationSpawner = new FormationSpawner(game);
    }

    /**
     * Update wave system each frame
     */
    public update(deltaTime: number): void {
        // Don't update if game is over
        if (this.game.getState() === 'GAME_OVER') {
            return;
        }

        // Update difficulty timer
        this.difficultyTimer += deltaTime * 1000;
        if (this.difficultyTimer >= this.difficultyIncreaseInterval) {
            this.increaseDifficulty();
            this.difficultyTimer = 0;
        }

        // Update formation spawner
        this.formationSpawner.update(deltaTime);

        // Handle wave progression
        if (!this.waveInProgress) {
            this.waveDelayTimer += deltaTime * 1000;
            if (this.waveDelayTimer >= this.currentWaveDelay) {
                this.startNextWave().catch(error => {
                    console.error('Failed to start next wave:', error);
                    // Fall back to procedural generation on error
                });
                this.waveDelayTimer = 0;
            }
        } else {
            // Update wave timer
            this.waveTimer += deltaTime * 1000;

            // Spawn enemies from queue
            this.updateSpawning(deltaTime);

            // Debug wave status every few seconds
            if (Math.floor(this.waveTimer / 1000) % 5 === 0 && this.waveTimer % 1000 < 50) {
                console.log(`Wave ${this.currentWave} status: spawned=${this.enemiesSpawned}/${this.enemiesInWave}, enemies alive=${this.game.getEnemies().length}, allDefeated=${this.areAllEnemiesDefeated()}`);
            }

            // Check wave completion
            if (this.enemiesSpawned >= this.enemiesInWave && this.areAllEnemiesDefeated()) {
                console.log(`Wave completion check: spawned=${this.enemiesSpawned}/${this.enemiesInWave}, allDefeated=${this.areAllEnemiesDefeated()}`);
                this.completeWave();
            }
        }
    }

    /**
     * Start the next wave
     */
    private async startNextWave(): Promise<void> {
        this.currentWave++;
        this.waveInProgress = true;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;

        // Generate wave definition
        const waveDef = await this.generateWave(this.currentWave, this.difficultyLevel);

        // Set wave parameters
        this.enemiesInWave = waveDef.enemies.reduce((sum, e) => sum + e.count, 0);
        this.currentSpawnInterval = waveDef.spawnInterval;
        this.currentWaveDelay = waveDef.waveDelay;

        // Build enemy queue for authentic Heavy Weapon pacing
        // Based on Ghidra analysis: enemies spawn spread across wave duration
        this.enemyQueue = [];
        for (const enemyGroup of waveDef.enemies) {
            // All enemies go into the timed queue for proper pacing
            for (let i = 0; i < enemyGroup.count; i++) {
                this.enemyQueue.push(enemyGroup.type);
            }
        }

        // Shuffle enemy queue for authentic varied spawning
        this.shuffleArray(this.enemyQueue);

        console.log(`Wave ${this.currentWave} started! ${this.enemiesInWave} enemies incoming...`);
    }

    /**
     * Generate wave definition based on wave number and difficulty
     */
    private async generateWave(waveNumber: number, difficulty: number): Promise<WaveDefinition> {
        // Calculate survival position (tier, level, wave) from total wave count
        const { level, wave } = getSurvivalPosition(waveNumber);
        const tier = 0; // Start with survival0.xml, can be made configurable later

        // Try to load from XML survival data first
        const xmlWave = await this.generateWaveFromXMLSurvivalData(tier, level, wave);
        if (xmlWave) {
            console.log(`Generated wave from XML: tier=${tier}, level=${level}, wave=${wave}`);
            return xmlWave;
        }

        // Try to use campaign XML wave data as fallback
        const xmlWaveData = AssetLoader.getWaveData();
        if (xmlWaveData && xmlWaveData.length > 0) {
            return this.generateWaveFromXML(waveNumber, difficulty, xmlWaveData);
        }

        // Fall back to procedural generation
        // Base enemy count: starts at 6, +2 every 5 waves
        const baseCount = 6 + Math.floor(waveNumber / 5) * 2;

        // Spawn interval decreases with difficulty
        const spawnInterval = Math.max(500, 1500 - difficulty * 100);

        // Wave delay between waves
        const waveDelay = Math.max(2000, 3000 - difficulty * 50);

        // Enemy type distribution based on wave progression
        const enemies: { type: EnemyType; count: number }[] = [];

        if (waveNumber <= 3) {
            // Early waves: basic enemies
            enemies.push({ type: EnemyType.PROPFIGHTER, count: Math.floor(baseCount * 0.6) });
            enemies.push({ type: EnemyType.SMALLJET, count: Math.floor(baseCount * 0.4) });
        } else if (waveNumber <= 6) {
            // Add bombers
            enemies.push({ type: EnemyType.PROPFIGHTER, count: Math.floor(baseCount * 0.3) });
            enemies.push({ type: EnemyType.SMALLJET, count: Math.floor(baseCount * 0.3) });
            enemies.push({ type: EnemyType.BOMBER, count: Math.floor(baseCount * 0.3) });
            enemies.push({ type: EnemyType.TRUCK, count: Math.floor(baseCount * 0.1) });
        } else if (waveNumber <= 10) {
            // Add helicopters and jets
            enemies.push({ type: EnemyType.SMALLJET, count: Math.floor(baseCount * 0.2) });
            enemies.push({ type: EnemyType.BOMBER, count: Math.floor(baseCount * 0.2) });
            enemies.push({ type: EnemyType.JETFIGHTER, count: Math.floor(baseCount * 0.2) });
            enemies.push({ type: EnemyType.SMALLCOPTER, count: Math.floor(baseCount * 0.2) });
            enemies.push({ type: EnemyType.TRUCK, count: Math.floor(baseCount * 0.2) });
        } else if (waveNumber <= 15) {
            // Mid-game variety
            enemies.push({ type: EnemyType.BOMBER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.JETFIGHTER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.BIGBOMBER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.SMALLCOPTER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.MEDCOPTER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.TRUCK, count: Math.floor(baseCount * 0.25) });
        } else if (waveNumber <= 20) {
            // Late game: tougher enemies
            enemies.push({ type: EnemyType.JETFIGHTER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.BIGBOMBER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.MEDCOPTER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.BIGCOPTER, count: Math.floor(baseCount * 0.15) });
            enemies.push({ type: EnemyType.FATBOMBER, count: Math.floor(baseCount * 0.2) });
            enemies.push({ type: EnemyType.SATELLITE, count: Math.floor(baseCount * 0.1) });
            enemies.push({ type: EnemyType.CRUISE, count: Math.floor(baseCount * 0.1) });
        } else {
            // Endless mode: everything
            const allTypes = [
                EnemyType.JETFIGHTER,
                EnemyType.BIGBOMBER,
                EnemyType.BIGCOPTER,
                EnemyType.FATBOMBER,
                EnemyType.SATELLITE,
                EnemyType.BLIMP,
                EnemyType.CRUISE
            ];

            const countPerType = Math.max(1, Math.floor(baseCount / allTypes.length));
            for (const type of allTypes) {
                enemies.push({ type, count: countPerType });
            }
        }

        // Ensure at least one enemy
        if (enemies.length === 0 || enemies.reduce((sum, e) => sum + e.count, 0) === 0) {
            enemies.push({ type: EnemyType.PROPFIGHTER, count: baseCount });
        }

        return { enemies, spawnInterval, waveDelay, length: 2000 };
    }

    /**
     * Generate wave from XML data
     */
    private generateWaveFromXML(
        waveNumber: number,
        difficulty: number,
        levelData: any[]
    ): WaveDefinition {
        // Calculate which level and wave to use
        const levelIndex = Math.floor((waveNumber - 1) / 20); // 20 waves per level
        const waveIndex = (waveNumber - 1) % 20;

        // Get the appropriate level data
        const level = levelData[Math.min(levelIndex, levelData.length - 1)];
        if (!level || !level.waves || level.waves.length === 0) {
            // Fall back to procedural generation
            return this.generateWave(waveNumber, difficulty);
        }

        // Get the appropriate wave
        const waveData = level.waves[Math.min(waveIndex, level.waves.length - 1)];

        // Convert XML enemy IDs to our EnemyType enum
        const enemies: { type: EnemyType; count: number }[] = [];
        for (const enemy of waveData.enemies) {
            const enemyType = this.xmlIdToEnemyType(enemy.id);
            if (enemyType) {
                // Scale enemy count based on difficulty
                const scaledCount = Math.ceil(enemy.qty * (1 + difficulty * 0.1));
                enemies.push({ type: enemyType, count: scaledCount });
            }
        }

        // If no valid enemies, fall back to defaults
        if (enemies.length === 0) {
            enemies.push({ type: EnemyType.PROPFIGHTER, count: 5 });
        }

        // Calculate spawn interval based on wave length and difficulty
        const baseInterval = waveData.length || 1000;
        const spawnInterval = Math.max(500, baseInterval - difficulty * 50);

        // Wave delay between waves
        const waveDelay = Math.max(2000, 3000 - difficulty * 50);

        return { enemies, spawnInterval, waveDelay, length: waveData.length || 2000 };
    }

    /**
     * Convert XML enemy ID to EnemyType enum
     */
    private xmlIdToEnemyType(id: string): EnemyType | null {
        // Map XML IDs to our EnemyType enum
        const mapping: { [key: string]: EnemyType } = {
            'PROPFIGHTER': EnemyType.PROPFIGHTER,
            'SMALLJET': EnemyType.SMALLJET,
            'BOMBER': EnemyType.BOMBER,
            'JETFIGHTER': EnemyType.JETFIGHTER,
            'TRUCK': EnemyType.TRUCK,
            'SMALLCOPTER': EnemyType.SMALLCOPTER,
            'BIGBOMBER': EnemyType.BIGBOMBER,
            'MEDCOPTER': EnemyType.MEDCOPTER,
            'BIGCOPTER': EnemyType.BIGCOPTER,
            'FATBOMBER': EnemyType.FATBOMBER,
            'SATELLITE': EnemyType.SATELLITE,
            'BLIMP': EnemyType.BLIMP,
            'CRUISE': EnemyType.CRUISE,
            'DEFLECTOR': EnemyType.DEFLECTOR,
            'DELTABOMBER': EnemyType.DELTABOMBER,
            'DELTAJET': EnemyType.DELTAJET,
            'BIGMISSILE': EnemyType.BIGMISSILE,
            'SUPERBOMBER': EnemyType.SUPERBOMBER,
            'STRAFER': EnemyType.STRAFER,
            'ENEMYTANK': EnemyType.ENEMYTANK,
            'DOZER': EnemyType.DOZER
        };

        return mapping[id] || null;
    }

    /**
     * Update enemy spawning
     */
    private updateSpawning(deltaTime: number): void {
        if (this.enemyQueue.length === 0) return;

        this.spawnTimer += deltaTime * 1000;
        if (this.spawnTimer >= this.currentSpawnInterval) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
    }

    /**
     * Spawn an enemy from the queue
     */
    private spawnEnemy(): void {
        if (this.enemyQueue.length === 0) return;

        const enemyType = this.enemyQueue.shift()!;

        // Alternate spawn sides
        const x = this.spawnSide === 'left' ? -50 : GameConstants.SCREEN_WIDTH + 50;
        this.spawnSide = this.spawnSide === 'left' ? 'right' : 'left';

        // Random Y position in upper portion of screen
        const minY = 50;
        const maxY = GameConstants.SCREEN_HEIGHT * 0.6;
        const y = minY + Math.random() * (maxY - minY);

        // Create enemy with scaled health
        const enemy = new Enemy(this.game, enemyType, x, y);

        // Apply original Heavy Weapon difficulty scaling
        // Formula: health = (difficultyLevel + 1) * 7, capped at 40
        const originalHealth = enemy.health;
        const scaledHealth = calculateEnemyHealth(originalHealth, this.difficultyLevel);
        enemy.health = scaledHealth;
        enemy.maxHealth = scaledHealth;

        // Add to game
        this.game.addEnemy(enemy);
        this.enemiesSpawned++;
    }

    /**
     * Check if all enemies in wave are defeated
     */
    private areAllEnemiesDefeated(): boolean {
        const enemies = this.game.getEnemies();
        return enemies.length === 0;
    }

    /**
     * Complete the current wave
     */
    private completeWave(): void {
        this.waveInProgress = false;
        this.wavesCompleted++;

        // Award wave completion bonus
        const waveBonus = 1000 * this.currentWave;
        this.game.getScoreManager().addScore(waveBonus);

        console.log(`Wave ${this.currentWave} completed! Bonus: ${waveBonus}`);

        // Check for power-up drop chance
        this.checkPowerUpDrop();
    }

    /**
     * Increase difficulty level
     */
    private increaseDifficulty(): void {
        this.difficultyLevel++;
        console.log(`Difficulty increased to level ${this.difficultyLevel}`);
    }

    /**
     * Check if power-up should be dropped
     */
    private checkPowerUpDrop(): void {
        // Higher chance after completing waves
        const dropChance = 0.3 + (this.wavesCompleted * 0.05);
        if (Math.random() < dropChance) {
            // This will trigger helicopter drop when PowerUpSystem is implemented
            console.log('Power-up incoming!');
        }
    }

    /**
     * Shuffle array in place
     */
    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Handle enemy defeated
     */
    public onEnemyDefeated(): void {
        this.enemiesDefeated++;
        this.totalEnemiesDefeated++;
    }

    /**
     * Get current wave number
     */
    public getCurrentWave(): number {
        return this.currentWave;
    }

    /**
     * Advance to next wave (for debug/cheats)
     */
    public nextWave(): void {
        this.currentWave++;
        this.waveTimer = 0;
        this.isWaveActive = false;
        this.enemiesSpawned = 0;
        this.enemiesAlive = 0;
        this.waveDelay = 1000; // 1 second delay before next wave
        console.log(`[DEBUG] Advanced to wave ${this.currentWave}`);
    }

    /**
     * Get difficulty level
     */
    public getDifficultyLevel(): number {
        return this.difficultyLevel;
    }

    /**
     * Get wave progress
     */
    public getWaveProgress(): { spawned: number; total: number } {
        return {
            spawned: this.enemiesSpawned,
            total: this.enemiesInWave
        };
    }

    /**
     * Get total enemies defeated
     */
    public getTotalEnemiesDefeated(): number {
        return this.totalEnemiesDefeated;
    }

    /**
     * Reset wave system
     */
    public reset(): void {
        this.currentWave = 0;
        this.waveInProgress = false;
        this.enemiesInWave = 0;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.difficultyLevel = 0;
        this.difficultyTimer = 0;
        this.spawnTimer = 0;
        this.waveDelayTimer = 0;
        this.enemyQueue = [];
        this.totalEnemiesDefeated = 0;
        this.wavesCompleted = 0;
        this.formationSpawner.clear();
    }

    /**
     * Start the wave system
     */
    public start(): void {
        // Reset and start fresh
        this.reset();
        // Waves will start spawning after the initial delay
    }

    /**
     * Generate wave definition from exact survival0.xml data
     */
    private generateWaveFromSurvivalData(survivalWave: SurvivalWave, difficulty: number): WaveDefinition {
        const enemies: { type: EnemyType; count: number }[] = [];

        // Convert survival enemy IDs to EnemyType
        for (const craft of survivalWave.enemies) {
            const enemyType = this.xmlIdToEnemyType(craft.id);
            if (enemyType) {
                enemies.push({ type: enemyType, count: craft.qty });
            } else {
                console.warn(`Unknown enemy type in survival data: ${craft.id}`);
            }
        }

        // Calculate spawn interval based on wave length and total enemies
        const totalEnemies = enemies.reduce((sum, e) => sum + e.count, 0);
        const spawnInterval = totalEnemies > 0 ? survivalWave.length / totalEnemies : 1000;

        return {
            enemies,
            spawnInterval: Math.max(300, spawnInterval), // Minimum 300ms for authentic pacing
            waveDelay: 1000, // 1 second delay between waves
            length: survivalWave.length
        };
    }

    /**
     * Update total waves counter and reset variables for new wave
     */
    private startSurvivalWave(): void {
        this.totalWaves++;
        this.isWaveActive = false;
        this.waveTimer = 0;
        this.enemiesSpawned = 0;
        this.enemiesAlive = 0;

        console.log(`Starting survival wave ${this.totalWaves}`);

        // Calculate current level and wave for logging
        const { level, wave } = getSurvivalPosition(this.totalWaves - 1);
        console.log(`Level ${level + 1}, Wave ${wave + 1}`);
    }

    /**
     * Get survival wave data from XML files (replaces hardcoded SURVIVAL_DATA)
     */
    private static async getSurvivalWaveFromXML(tier: number, level: number, wave: number): Promise<SurvivalWave | null> {
        try {
            // Check cache first
            if (!this.survivalDataCache.has(tier)) {
                // Load survival tier data from XML
                const tierData = await XMLDataLoader.loadSurvivalTier(tier);
                this.survivalDataCache.set(tier, tierData);
            }

            const tierData = this.survivalDataCache.get(tier);
            if (!tierData || level >= tierData.levels.length) {
                return null;
            }

            const levelData = tierData.levels[level];
            if (wave >= levelData.waves.length) {
                return null;
            }

            return levelData.waves[wave];
        } catch (error) {
            console.error(`Failed to load survival wave tier=${tier}, level=${level}, wave=${wave}:`, error);
            return null;
        }
    }

    /**
     * Generate wave definition from XML survival data (replaces hardcoded data)
     */
    private async generateWaveFromXMLSurvivalData(tier: number, level: number, wave: number): Promise<WaveDefinition | null> {
        const survivalWave = await WaveSystem.getSurvivalWaveFromXML(tier, level, wave);

        if (!survivalWave) {
            return null;
        }

        const enemies: { type: EnemyType; count: number }[] = [];

        // Convert survival XML craft IDs to EnemyTypes
        for (const craft of survivalWave.enemies) {
            const enemyType = this.xmlIdToEnemyType(craft.id);
            if (enemyType) {
                enemies.push({ type: enemyType, count: craft.qty });
            }
        }

        return {
            enemies,
            spawnInterval: this.calculateSpawnInterval(survivalWave, enemies.length),
            waveDelay: 1000, // 1 second delay from XML
            length: survivalWave.length
        };
    }

    /**
     * Calculate spawn interval based on wave length and enemy count
     */
    private calculateSpawnInterval(wave: SurvivalWave, enemyCount: number): number {
        if (enemyCount <= 0) return 1000;
        return Math.max(100, wave.length / enemyCount); // Spread spawns across wave length
    }
}