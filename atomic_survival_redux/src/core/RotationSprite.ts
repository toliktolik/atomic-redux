/**
 * RotationSprite - Handles angle-based frame selection for rotation sprites
 * Based on Heavy Weapon's gun.png system with 21 rotation frames
 */

import * as PIXI from 'pixi.js';

export class RotationSprite extends PIXI.Sprite {
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
        rowCount: number = 1
    ) {
        // Calculate frame dimensions - sprites are grid with rows and columns
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
     * Set rotation angle and update sprite frame
     * Following original Heavy Weapon system: 21 frames = 360° / 21 = ~17.14° per frame
     */
    public setAngle(angleRadians: number): void {
        this.currentAngle = angleRadians;

        // Convert radians to degrees
        let angleDegrees = (angleRadians * 180 / Math.PI);

        // Normalize angle to 0-360 range
        angleDegrees = ((angleDegrees % 360) + 360) % 360;

        // Calculate frame index: 21 frames cover 360°, so each frame = 360°/21 = ~17.14°
        const degreesPerFrame = 360 / this.frameCount;
        let frameIndex = Math.round(angleDegrees / degreesPerFrame) % this.frameCount;

        // Gun rotation working correctly - debug removed

        // Update texture to show the correct frame
        this.updateTexture(frameIndex, this.currentRow);

    }

    /**
     * Set weapon level (row in sprite sheet)
     */
    public setWeaponLevel(level: number): void {
        this.currentRow = Math.max(0, Math.min(level, this.rowCount - 1));
        // Re-update texture with current angle and new row
        this.setAngle(this.currentAngle);
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
     * Get current angle in radians
     */
    public getAngle(): number {
        return this.currentAngle;
    }

    /**
     * Get frame count
     */
    public getFrameCount(): number {
        return this.frameCount;
    }
}