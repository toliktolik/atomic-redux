/**
 * Survival Timer Component - Displays authentic MM:SS:MS timer
 * Based on Ghidra analysis of SurvivalMode_DrawHUD @ 0x0042e220
 * Timer format: "%i:%02i:%02i" at coordinates (0x14, timer_y) = (20, y)
 */

import * as PIXI from 'pixi.js';

export class SurvivalTimer extends PIXI.Container {
    private timerText: PIXI.Text;
    private timerStyle: PIXI.TextStyle;
    private currentTime: number = 0;

    constructor() {
        super();

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
        // Position based on Ghidra coordinates: x=0x14 (20), y=calculated for visibility
        this.x = 20;
        this.y = 40; // Below title area
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

        // Format: M:SS:MS (matches Ghidra format string exactly)
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
        this.timerText.text = timeString;

        // Apply color changes based on survival time milestones
        this.updateTimerColor(survivalTimeMs);
    }

    private updateTimerColor(survivalTimeMs: number): void {
        const minutes = Math.floor(survivalTimeMs / 60000);

        let newColor: string;
        if (minutes >= 10) {
            // Gold color for 10+ minutes (legendary survival)
            newColor = '#ffd700';
        } else if (minutes >= 5) {
            // Orange color for 5+ minutes (advanced survival)
            newColor = '#ff9900';
        } else if (minutes >= 2) {
            // Yellow color for 2+ minutes (good survival)
            newColor = '#ffff00';
        } else {
            // Green color for early survival
            newColor = '#00ff00';
        }

        // Only update if color changed (performance optimization)
        if (this.timerStyle.fill !== newColor) {
            this.timerStyle.fill = newColor;
            this.timerText.style = this.timerStyle;
        }
    }

    /**
     * Get formatted time string for external use
     */
    public getFormattedTime(): string {
        return this.timerText.text;
    }

    /**
     * Get current time in milliseconds
     */
    public getCurrentTime(): number {
        return this.currentTime;
    }
}