/**
 * Survival Wave Data - Interfaces and utilities for XML-based survival data
 * All hardcoded data removed - now reads from survival0.xml through survival9.xml
 */

export interface SurvivalCraft {
    id: string;  // SMALLJET, JETFIGHTER, BOMBER, etc.
    qty: number; // Exact quantities from XML
}

export interface SurvivalWave {
    length: number;  // Wave length in milliseconds
    enemies: SurvivalCraft[];
}

export interface SurvivalLevel {
    waves: SurvivalWave[];
}

/**
 * Calculate current survival level and wave from total wave number
 * Based on 4 waves per level structure from original survival XML files
 */
export function getSurvivalPosition(totalWaves: number): { level: number; wave: number; isComplete: boolean } {
    const level = Math.floor(totalWaves / 4);
    const wave = totalWaves % 4;
    // Assume 20 levels max per tier (80 waves total) - this should be made configurable
    const isComplete = level >= 20;

    return { level, wave, isComplete };
}

/**
 * DEPRECATED: Use XMLDataLoader.loadSurvivalTier() instead
 * This function is kept for compatibility only
 */
export function getSurvivalWave(level: number, wave: number): SurvivalWave | null {
    console.warn('getSurvivalWave() is deprecated. Use XMLDataLoader.loadSurvivalTier() instead.');
    return null;
}

/**
 * Calculate enemy health based on difficulty scaling
 * Based on original Heavy Weapon survival progression
 */
export function calculateEnemyHealth(baseHealth: number, difficulty: number): number {
    // Authentic Heavy Weapon health scaling
    return Math.floor(baseHealth * (1 + difficulty * 0.2));
}

/**
 * DEPRECATED: Use CraftDataLoader.getCraftData() to get craft specifications from XML
 * This constant is kept for compatibility only - all data now comes from craft.xml
 */
export const CRAFT_SPECIFICATIONS = {
    // Use CraftDataLoader.getCraftData(craftName) instead
};