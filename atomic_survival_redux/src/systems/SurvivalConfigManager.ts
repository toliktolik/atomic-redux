/**
 * Survival Configuration Manager - Manages survival tier configurations and wave selection
 * Based on Ghidra analysis of survival mode XML loading and timing systems
 */

import { XMLDataLoader, SurvivalTierData, SurvivalWave } from '../core/XMLDataLoader';

export class SurvivalConfigManager {
    private static tierConfigs: Map<number, SurvivalTierData> = new Map();
    private static currentTier: number = 0;

    /**
     * Load survival configuration for specified tier
     * Based on Ghidra: Survival_LoadConfiguration
     */
    public static async loadTier(tier: number): Promise<SurvivalTierData> {
        // Clamp tier to valid range (0-9)
        tier = Math.max(0, Math.min(9, tier));

        if (this.tierConfigs.has(tier)) {
            return this.tierConfigs.get(tier)!;
        }

        try {
            console.log(`Loading survival tier ${tier} configuration...`);
            const config = await XMLDataLoader.loadSurvivalTier(tier);
            this.tierConfigs.set(tier, config);
            console.log(`Loaded survival tier ${tier}: ${config.levels.length} levels, ${config.totalWaves} total waves`);
            return config;
        } catch (error) {
            console.warn(`Failed to load survival tier ${tier}, using fallback:`, error);
            const fallbackConfig = await XMLDataLoader.loadSurvivalTier(tier); // This will use fallback internally
            this.tierConfigs.set(tier, fallbackConfig);
            return fallbackConfig;
        }
    }

    /**
     * Get wave configuration by survival time
     * Every 12 seconds = difficulty increase (based on Ghidra: Survival_CalculateWaveTiming)
     */
    public static getWaveForTime(survivalTimeMs: number, tier: number): SurvivalWave | null {
        const config = this.tierConfigs.get(tier);
        if (!config) return null;

        // Calculate level and wave based on survival time
        // Every 12 seconds increases difficulty (Ghidra-verified)
        const difficultyLevel = Math.floor(survivalTimeMs / 12000);
        const levelIndex = Math.floor(difficultyLevel / 4); // 4 waves per level
        const waveIndex = difficultyLevel % 4;

        if (levelIndex >= config.levels.length) {
            // Loop back to highest level for extended survival
            const lastLevelIndex = config.levels.length - 1;
            const lastLevel = config.levels[lastLevelIndex];
            const waveInLevel = waveIndex % lastLevel.waves.length;

            console.log(`Extended survival: Using level ${lastLevelIndex}, wave ${waveInLevel} (difficulty ${difficultyLevel})`);
            return lastLevel.waves[waveInLevel];
        }

        const level = config.levels[levelIndex];
        if (waveIndex >= level.waves.length) {
            // Fallback to last wave in level
            return level.waves[level.waves.length - 1];
        }

        const selectedWave = level.waves[waveIndex];
        console.log(`Wave selected: Level ${levelIndex + 1}, Wave ${waveIndex + 1}, Duration: ${selectedWave.length}ms, Enemies: ${selectedWave.enemies.length} types`);

        return selectedWave;
    }

    /**
     * Calculate current difficulty level based on survival time
     * Based on Ghidra: Survival_ProcessDifficultyScaling
     */
    public static getDifficultyLevel(survivalTimeMs: number): number {
        return Math.floor(survivalTimeMs / 12000);
    }

    /**
     * Get wave progression info for HUD display
     */
    public static getWaveProgressInfo(survivalTimeMs: number, tier: number): {
        currentLevel: number;
        currentWave: number;
        difficultyLevel: number;
        totalWaves: number;
    } {
        const difficultyLevel = this.getDifficultyLevel(survivalTimeMs);
        const levelIndex = Math.floor(difficultyLevel / 4);
        const waveIndex = difficultyLevel % 4;

        const config = this.tierConfigs.get(tier);
        const totalWaves = config ? config.totalWaves : 0;

        return {
            currentLevel: levelIndex + 1,
            currentWave: waveIndex + 1,
            difficultyLevel,
            totalWaves
        };
    }

    /**
     * Pre-load multiple survival tiers for performance
     */
    public static async preloadTiers(startTier: number = 0, endTier: number = 2): Promise<void> {
        console.log(`Pre-loading survival tiers ${startTier}-${endTier}...`);

        const loadPromises: Promise<SurvivalTierData>[] = [];
        for (let tier = startTier; tier <= endTier && tier <= 9; tier++) {
            loadPromises.push(this.loadTier(tier));
        }

        await Promise.all(loadPromises);
        console.log(`Successfully pre-loaded ${loadPromises.length} survival tier configurations`);
    }

    /**
     * Get current tier configuration
     */
    public static getCurrentTierConfig(): SurvivalTierData | null {
        return this.tierConfigs.get(this.currentTier) || null;
    }

    /**
     * Set current active tier
     */
    public static setCurrentTier(tier: number): void {
        this.currentTier = Math.max(0, Math.min(9, tier));
    }

    /**
     * Get loaded tier count for debugging
     */
    public static getLoadedTierCount(): number {
        return this.tierConfigs.size;
    }

    /**
     * Clear cached configurations (for memory management)
     */
    public static clearCache(): void {
        this.tierConfigs.clear();
        console.log('Survival configuration cache cleared');
    }
}