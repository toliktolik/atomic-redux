/**
 * Score Manager - Handles scoring system and multipliers
 */

export class ScoreManager {
    private score: number = 0;
    private highScore: number = 0;
    private multiplier: number = 1;
    private comboCount: number = 0;
    private comboTimer: number = 0;
    private comboTimeout: number = 2000; // 2 seconds to maintain combo

    // Statistics
    private enemiesDestroyed: number = 0;
    private accuracy: number = 0;
    private shotsTotal: number = 0;
    private shotsHit: number = 0;

    constructor() {
        // Load high score from localStorage
        const saved = localStorage.getItem('atomicSurvivalHighScore');
        if (saved) {
            this.highScore = parseInt(saved, 10);
        }
    }

    /**
     * Update score manager
     */
    public update(deltaTime: number): void {
        // Update combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= deltaTime * 1000;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
    }

    /**
     * Add score
     */
    public addScore(points: number): void {
        const scoreToAdd = Math.floor(points * this.multiplier);
        this.score += scoreToAdd;

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('atomicSurvivalHighScore', this.highScore.toString());
        }
    }

    /**
     * Add enemy destroyed
     */
    public onEnemyDestroyed(basePoints: number): void {
        this.enemiesDestroyed++;
        this.comboCount++;
        this.comboTimer = this.comboTimeout;

        // Update multiplier based on combo
        if (this.comboCount >= 10) {
            this.multiplier = 3;
        } else if (this.comboCount >= 5) {
            this.multiplier = 2;
        } else if (this.comboCount >= 3) {
            this.multiplier = 1.5;
        }

        // Add score with multiplier
        this.addScore(basePoints);
    }

    /**
     * Record shot fired
     */
    public onShotFired(): void {
        this.shotsTotal++;
        this.updateAccuracy();
    }

    /**
     * Record shot hit
     */
    public onShotHit(): void {
        this.shotsHit++;
        this.updateAccuracy();
    }

    /**
     * Update accuracy
     */
    private updateAccuracy(): void {
        if (this.shotsTotal > 0) {
            this.accuracy = (this.shotsHit / this.shotsTotal) * 100;
        }
    }

    /**
     * Reset combo
     */
    private resetCombo(): void {
        this.comboCount = 0;
        this.multiplier = 1;
        this.comboTimer = 0;
    }

    /**
     * Award accuracy bonus
     */
    public awardAccuracyBonus(): void {
        if (this.accuracy >= 80) {
            this.addScore(500);
        }
    }

    /**
     * Award wave completion bonus
     */
    public awardWaveBonus(waveNumber: number, noDamage: boolean): void {
        let bonus = 1000 * waveNumber;
        if (noDamage) {
            bonus *= 2;
        }
        this.addScore(bonus);
    }

    /**
     * Get current score
     */
    public getScore(): number {
        return this.score;
    }

    /**
     * Get high score
     */
    public getHighScore(): number {
        return this.highScore;
    }

    /**
     * Get current multiplier
     */
    public getMultiplier(): number {
        return this.multiplier;
    }

    /**
     * Get combo count
     */
    public getComboCount(): number {
        return this.comboCount;
    }

    /**
     * Get accuracy
     */
    public getAccuracy(): number {
        return this.accuracy;
    }

    /**
     * Get enemies destroyed
     */
    public getEnemiesDestroyed(): number {
        return this.enemiesDestroyed;
    }

    /**
     * Reset score
     */
    public reset(): void {
        this.score = 0;
        this.multiplier = 1;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.enemiesDestroyed = 0;
        this.accuracy = 0;
        this.shotsTotal = 0;
        this.shotsHit = 0;
    }
}