/**
 * DirectionalSprite - Handles multi-row grid sprites with directional frames
 * Based on Heavy Weapon's bullets.png system with 21 angles x 5 rows
 */

import * as PIXI from 'pixi.js';

export class DirectionalSprite extends PIXI.Sprite {
    private frameCount: number;
    private rowCount: number;
    private frameWidth: number;
    private frameHeight: number;
    private baseTexture: PIXI.BaseTexture;
    private currentAngle: number = 0;
    private currentRow: number = 0;

    constructor(
        baseTexture: PIXI.BaseTexture,
        frameCount: number,
        rowCount: number = 5
    ) {
        // Calculate frame dimensions - sprites are arranged in grid
        const frameWidth = Math.floor(baseTexture.width / frameCount);
        const frameHeight = Math.floor(baseTexture.height / rowCount);

        // Create initial texture from first frame
        const initialTexture = new PIXI.Texture(
            baseTexture,
            new PIXI.Rectangle(0, 0, frameWidth, frameHeight)
        );

        super(initialTexture);

        this.baseTexture = baseTexture;
        this.frameCount = frameCount;
        this.rowCount = rowCount;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        // Sprite dimensions: ${frameCount}x${rowCount} grid, ${frameWidth}x${frameHeight} per frame

        // Call initial frame update to show first frame
        this.updateTexture(0, 0);
    }

    /**
     * Set angle and row to display correct directional sprite
     * Following original Heavy Weapon bullets.png: 21 frames = 360° / 21 = ~17.14° per frame
     */
    public setAngleAndRow(angleRadians: number, row: number = 0): void {
        this.currentAngle = angleRadians;
        this.currentRow = Math.max(0, Math.min(row, this.rowCount - 1));

        // Convert radians to degrees
        let angleDegrees = (angleRadians * 180 / Math.PI);

        // Normalize angle to 0-360 range
        angleDegrees = ((angleDegrees % 360) + 360) % 360;

        // Calculate frame index: frames cover 360°
        const degreesPerFrame = 360 / this.frameCount;
        let frameIndex = Math.round(angleDegrees / degreesPerFrame) % this.frameCount;

        // Update texture to show the correct frame
        this.updateTexture(frameIndex, this.currentRow);

    }

    /**
     * Update texture to show specified frame and row
     */
    private updateTexture(frameIndex: number, row: number): void {
        const x = frameIndex * this.frameWidth;
        const y = row * this.frameHeight;

        // Ensure we don't go beyond texture bounds
        const clampedX = Math.min(x, this.baseTexture.width - this.frameWidth);
        const clampedY = Math.min(y, this.baseTexture.height - this.frameHeight);
        const rect = new PIXI.Rectangle(clampedX, clampedY, this.frameWidth, this.frameHeight);


        // Create new texture for this frame
        this.texture = new PIXI.Texture(this.baseTexture, rect);

        // Force texture update
        this.texture.updateUvs();
    }

    /**
     * Set bullet type/row (0 = standard bullets, 1-4 = other bullet types)
     */
    public setBulletType(type: number): void {
        const row = Math.max(0, Math.min(type, this.rowCount - 1));
        this.setAngleAndRow(this.currentAngle, row);
    }

    /**
     * Get current angle in radians
     */
    public getAngle(): number {
        return this.currentAngle;
    }

    /**
     * Get current row
     */
    public getRow(): number {
        return this.currentRow;
    }

    /**
     * Get frame count
     */
    public getFrameCount(): number {
        return this.frameCount;
    }

    /**
     * Get row count
     */
    public getRowCount(): number {
        return this.rowCount;
    }
}