/**
 * HUD - Heads-up display showing game information
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';
import { Tank } from '../entities/Tank';
import { SurvivalTimer } from './SurvivalTimer';
import { SurvivalModeTitle } from './SurvivalModeTitle';

export class HUD {
    private game: Game;
    private container: PIXI.Container;

    // Text elements
    private scoreText: PIXI.Text;
    private highScoreText: PIXI.Text;
    private waveText: PIXI.Text;
    private comboText: PIXI.Text;
    private multiplierText: PIXI.Text;
    private enemiesText: PIXI.Text;
    private accuracyText: PIXI.Text;
    private fpsText?: PIXI.Text;

    // Health bar
    private healthBar: PIXI.Graphics;
    private healthBarBg: PIXI.Graphics;
    private healthText: PIXI.Text;

    // Ammo display
    private ammoText: PIXI.Text;
    private weaponText: PIXI.Text;

    // Power-up indicators
    private powerUpContainer: PIXI.Container;
    private activePowerUps: Map<string, PIXI.Container> = new Map();

    // Survival-specific components
    private survivalTimer: SurvivalTimer;
    private survivalTitle: SurvivalModeTitle;

    // Style
    private textStyle: PIXI.TextStyle;
    private smallTextStyle: PIXI.TextStyle;
    private largeTextStyle: PIXI.TextStyle;

    constructor(game: Game) {
        this.game = game;
        this.container = new PIXI.Container();

        // Create text styles
        this.textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 3
        });

        this.smallTextStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 2
        });

        this.largeTextStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            stroke: 0x000000,
            strokeThickness: 4
        });

        // Initialize UI elements
        this.createScoreDisplay();
        this.createWaveDisplay();
        this.createHealthBar();
        this.createAmmoDisplay();
        this.createComboDisplay();
        this.createPowerUpIndicators();
        this.createStatsDisplay();

        // Initialize survival-specific components
        this.createSurvivalHUD();

        // Create FPS counter if debug mode
        if (this.game.isDebugMode()) {
            this.createFPSCounter();
        }
    }

    /**
     * Create score display
     */
    private createScoreDisplay(): void {
        // Current score
        this.scoreText = new PIXI.Text('SCORE: 0', this.textStyle);
        this.scoreText.x = 10;
        this.scoreText.y = 10;
        this.container.addChild(this.scoreText);

        // High score
        this.highScoreText = new PIXI.Text('HIGH: 0', this.smallTextStyle);
        this.highScoreText.x = 10;
        this.highScoreText.y = 35;
        this.container.addChild(this.highScoreText);
    }

    /**
     * Create wave display
     */
    private createWaveDisplay(): void {
        this.waveText = new PIXI.Text('WAVE 1', this.largeTextStyle);
        this.waveText.anchor.set(0.5, 0);
        this.waveText.x = GameConstants.SCREEN_WIDTH / 2;
        this.waveText.y = 10;
        this.container.addChild(this.waveText);

        // Enemy counter
        this.enemiesText = new PIXI.Text('Enemies: 0/0', this.smallTextStyle);
        this.enemiesText.anchor.set(0.5, 0);
        this.enemiesText.x = GameConstants.SCREEN_WIDTH / 2;
        this.enemiesText.y = 40;
        this.container.addChild(this.enemiesText);
    }

    /**
     * Create health bar
     */
    private createHealthBar(): void {
        const barWidth = 200;
        const barHeight = 20;
        const barX = 10;
        const barY = GameConstants.SCREEN_HEIGHT - 40;

        // Background
        this.healthBarBg = new PIXI.Graphics();
        this.healthBarBg.beginFill(0x333333);
        this.healthBarBg.drawRect(barX, barY, barWidth, barHeight);
        this.healthBarBg.endFill();
        this.container.addChild(this.healthBarBg);

        // Health bar
        this.healthBar = new PIXI.Graphics();
        this.container.addChild(this.healthBar);

        // Health text
        this.healthText = new PIXI.Text('100/100', this.smallTextStyle);
        this.healthText.anchor.set(0.5);
        this.healthText.x = barX + barWidth / 2;
        this.healthText.y = barY + barHeight / 2;
        this.container.addChild(this.healthText);
    }

    /**
     * Create ammo display
     */
    private createAmmoDisplay(): void {
        // Weapon name
        this.weaponText = new PIXI.Text('STANDARD GUN', this.textStyle);
        this.weaponText.anchor.set(1, 1);
        this.weaponText.x = GameConstants.SCREEN_WIDTH - 10;
        this.weaponText.y = GameConstants.SCREEN_HEIGHT - 40;
        this.container.addChild(this.weaponText);

        // Ammo count
        this.ammoText = new PIXI.Text('AMMO: ∞', this.smallTextStyle);
        this.ammoText.anchor.set(1, 1);
        this.ammoText.x = GameConstants.SCREEN_WIDTH - 10;
        this.ammoText.y = GameConstants.SCREEN_HEIGHT - 20;
        this.container.addChild(this.ammoText);
    }

    /**
     * Create combo display
     */
    private createComboDisplay(): void {
        // Combo counter
        this.comboText = new PIXI.Text('', this.largeTextStyle);
        this.comboText.anchor.set(1, 0);
        this.comboText.x = GameConstants.SCREEN_WIDTH - 10;
        this.comboText.y = 10;
        this.container.addChild(this.comboText);

        // Multiplier
        this.multiplierText = new PIXI.Text('', this.textStyle);
        this.multiplierText.anchor.set(1, 0);
        this.multiplierText.x = GameConstants.SCREEN_WIDTH - 10;
        this.multiplierText.y = 40;
        this.container.addChild(this.multiplierText);
    }

    /**
     * Create power-up indicators
     */
    private createPowerUpIndicators(): void {
        this.powerUpContainer = new PIXI.Container();
        this.powerUpContainer.x = GameConstants.SCREEN_WIDTH / 2 - 100;
        this.powerUpContainer.y = GameConstants.SCREEN_HEIGHT - 80;
        this.container.addChild(this.powerUpContainer);
    }

    /**
     * Create stats display
     */
    private createStatsDisplay(): void {
        this.accuracyText = new PIXI.Text('', this.smallTextStyle);
        this.accuracyText.x = 10;
        this.accuracyText.y = 60;
        this.container.addChild(this.accuracyText);
    }

    /**
     * Create survival-specific HUD components
     * Based on Ghidra analysis of SurvivalMode_DrawHUD
     */
    private createSurvivalHUD(): void {
        this.survivalTimer = new SurvivalTimer();
        this.container.addChild(this.survivalTimer);

        this.survivalTitle = new SurvivalModeTitle();
        this.container.addChild(this.survivalTitle);
    }

    /**
     * Create FPS counter
     */
    private createFPSCounter(): void {
        this.fpsText = new PIXI.Text('FPS: 0', this.smallTextStyle);
        this.fpsText.anchor.set(1, 0);
        this.fpsText.x = GameConstants.SCREEN_WIDTH - 10;
        this.fpsText.y = 70;
        this.container.addChild(this.fpsText);
    }

    /**
     * Update HUD
     */
    public update(deltaTime: number, tank: Tank): void {
        const scoreManager = this.game.getScoreManager();
        const waveSystem = this.game.getWaveSystem();

        // Update score
        this.scoreText.text = `SCORE: ${scoreManager.getScore().toLocaleString()}`;
        this.highScoreText.text = `HIGH: ${scoreManager.getHighScore().toLocaleString()}`;

        // Update wave info
        this.waveText.text = `WAVE ${waveSystem.getCurrentWave()}`;
        const waveProgress = waveSystem.getWaveProgress();
        this.enemiesText.text = `Enemies: ${waveProgress.spawned}/${waveProgress.total}`;

        // Update health bar
        const healthPercent = tank.health / tank.maxHealth;
        this.healthBar.clear();
        const healthColor = healthPercent > 0.5 ? 0x00ff00 :
                          healthPercent > 0.25 ? 0xffff00 : 0xff0000;
        this.healthBar.beginFill(healthColor);
        this.healthBar.drawRect(10, GameConstants.SCREEN_HEIGHT - 40, 200 * healthPercent, 20);
        this.healthBar.endFill();
        this.healthText.text = `${Math.ceil(tank.health)}/${tank.maxHealth}`;

        // Update weapon/ammo
        const weapon = tank.getCurrentWeapon();
        this.weaponText.text = weapon.getType().replace('_', ' ');
        const ammo = weapon.getAmmo();
        this.ammoText.text = ammo === Infinity ? 'AMMO: ∞' : `AMMO: ${ammo}/${weapon.getMaxAmmo()}`;

        // Update combo
        const combo = scoreManager.getComboCount();
        if (combo > 2) {
            this.comboText.text = `${combo}x COMBO!`;
            this.comboText.tint = combo >= 10 ? 0xff0000 : combo >= 5 ? 0xffaa00 : 0xffff00;
        } else {
            this.comboText.text = '';
        }

        // Update multiplier
        const multiplier = scoreManager.getMultiplier();
        if (multiplier > 1) {
            this.multiplierText.text = `x${multiplier.toFixed(1)}`;
            this.multiplierText.tint = 0x00ff00;
        } else {
            this.multiplierText.text = '';
        }

        // Update accuracy
        const accuracy = scoreManager.getAccuracy();
        if (accuracy > 0) {
            this.accuracyText.text = `Accuracy: ${accuracy.toFixed(1)}%`;
        }

        // Update FPS
        if (this.fpsText) {
            const fps = Math.round(1 / deltaTime);
            this.fpsText.text = `FPS: ${fps}`;
            this.fpsText.tint = fps >= 55 ? 0x00ff00 : fps >= 30 ? 0xffff00 : 0xff0000;
        }

        // Update power-up indicators
        this.updatePowerUpIndicators(tank);

        // Update survival-specific components
        this.updateSurvivalHUD(deltaTime);
    }

    /**
     * Update power-up indicators with timers
     */
    private updatePowerUpIndicators(tank: Tank): void {
        // Clear old indicators
        this.powerUpContainer.removeChildren();
        this.activePowerUps.clear();

        let offsetX = 0;

        // Shield indicator with timer
        if (tank.hasShield()) {
            const shieldTimeLeft = Math.ceil(tank.getShieldTimeLeft() / 1000);
            this.addPowerUpIndicatorWithTimer('SHIELD', 0x00ffff, offsetX, shieldTimeLeft);
            offsetX += 60;
        }

        // Speed boost indicator with timer
        if (tank.hasSpeedBoost()) {
            const speedTimeLeft = Math.ceil(tank.getSpeedBoostTimeLeft() / 1000);
            this.addPowerUpIndicatorWithTimer('SPEED', 0xffff00, offsetX, speedTimeLeft);
            offsetX += 60;
        }

        // Rapid fire indicator with timer
        if (tank.hasRapidFire()) {
            const rapidTimeLeft = Math.ceil(tank.getRapidFireTimeLeft() / 1000);
            this.addPowerUpIndicatorWithTimer('RAPID', 0xff8800, offsetX, rapidTimeLeft);
            offsetX += 60;
        }

        // Spread shot indicator with timer
        if (tank.hasSpreadShot()) {
            const spreadTimeLeft = Math.ceil(tank.getSpreadShotTimeLeft() / 1000);
            this.addPowerUpIndicatorWithTimer('SPREAD', 0x8800ff, offsetX, spreadTimeLeft);
            offsetX += 60;
        }
    }

    /**
     * Add power-up indicator with timer
     */
    private addPowerUpIndicatorWithTimer(name: string, color: number, offsetX: number, timeLeft: number): void {
        const indicator = new PIXI.Container();

        // Background with warning flash when low time
        const bg = new PIXI.Graphics();
        const bgColor = timeLeft <= 3 ? (Math.floor(Date.now() / 250) % 2 ? 0xff0000 : 0x000000) : 0x000000;
        bg.beginFill(bgColor, 0.7);
        bg.drawRoundedRect(0, 0, 55, 30, 5);
        bg.endFill();
        bg.lineStyle(2, color);
        bg.drawRoundedRect(0, 0, 55, 30, 5);
        indicator.addChild(bg);

        // Power-up name
        const nameText = new PIXI.Text(name, this.smallTextStyle);
        nameText.anchor.set(0.5);
        nameText.x = 27.5;
        nameText.y = 8;
        nameText.style.fontSize = 8;
        indicator.addChild(nameText);

        // Timer text
        const timerText = new PIXI.Text(timeLeft.toString() + 's', this.smallTextStyle);
        timerText.anchor.set(0.5);
        timerText.x = 27.5;
        timerText.y = 20;
        timerText.style.fontSize = 10;
        timerText.style.fill = timeLeft <= 3 ? 0xff4444 : 0xffffff;
        indicator.addChild(timerText);

        indicator.x = offsetX;
        this.powerUpContainer.addChild(indicator);
        this.activePowerUps.set(name, indicator);
    }

    /**
     * Add power-up indicator (legacy method)
     */
    private addPowerUpIndicator(name: string, color: number, offsetX: number): void {
        this.addPowerUpIndicatorWithTimer(name, color, offsetX, 0);
    }

    /**
     * Show message
     */
    public showMessage(text: string, duration: number = 2000): void {
        const message = new PIXI.Text(text, this.largeTextStyle);
        message.anchor.set(0.5);
        message.x = GameConstants.SCREEN_WIDTH / 2;
        message.y = GameConstants.SCREEN_HEIGHT / 2;
        this.container.addChild(message);

        // Animate message
        let elapsed = 0;
        const update = setInterval(() => {
            elapsed += 16;
            const progress = elapsed / duration;

            // Scale and fade
            message.scale.set(1 + progress * 0.5);
            message.alpha = 1 - progress;

            if (elapsed >= duration) {
                this.container.removeChild(message);
                message.destroy();
                clearInterval(update);
            }
        }, 16);
    }

    /**
     * Get container
     */
    public getContainer(): PIXI.Container {
        return this.container;
    }

    /**
     * Update survival-specific HUD components
     */
    private updateSurvivalHUD(deltaTime: number): void {
        const survivalTime = this.game.getElapsedTime();

        // Update survival timer
        this.survivalTimer.update(survivalTime);

        // Update survival tier (calculate based on time)
        const currentTier = this.calculateSurvivalTier(survivalTime);
        this.survivalTitle.updateTier(currentTier);
    }

    /**
     * Calculate survival tier based on elapsed time
     * Tiers advance every 2 minutes of survival
     */
    private calculateSurvivalTier(survivalTime: number): number {
        const minutes = Math.floor(survivalTime / 60000);
        return Math.min(Math.floor(minutes / 2), 9); // Tier 0-9, advancing every 2 minutes
    }

    /**
     * Reset HUD
     */
    public reset(): void {
        this.activePowerUps.clear();
        this.powerUpContainer.removeChildren();

        // Reset survival components
        if (this.survivalTimer) {
            this.survivalTimer.update(0);
        }
        if (this.survivalTitle) {
            this.survivalTitle.updateTier(0);
        }
    }
}