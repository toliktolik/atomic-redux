/**
 * Sprite Grid System - Multi-row enemy sprite management with rotation
 * Based on Ghidra analysis of Math_FloatToUInt64 @ 0x004fb4c8
 * and Heavy Weapon's 4x4 grid sprite system
 */

import * as PIXI from 'pixi.js';

export interface SpriteGridConfig {
    rows: number;
    columns: number;
    frameWidth: number;
    frameHeight: number;
    totalFrames: number;
}

export class SpriteGrid {
    private texture: PIXI.Texture;
    private config: SpriteGridConfig;
    private frameTextures: PIXI.Texture[][] = [];

    constructor(texture: PIXI.Texture, config: SpriteGridConfig) {
        this.texture = texture;
        this.config = config;
        this.generateFrameTextures();
    }

    /**
     * Generate individual frame textures from the sprite grid
     */
    private generateFrameTextures(): void {
        // Validate texture dimensions before creating frames
        const textureWidth = this.texture.width;
        const textureHeight = this.texture.height;

        // Check if the frame size is compatible with texture
        const requiredWidth = this.config.columns * this.config.frameWidth;
        const requiredHeight = this.config.rows * this.config.frameHeight;

        if (requiredWidth > textureWidth || requiredHeight > textureHeight) {
            console.warn(`SpriteGrid: Texture too small (${textureWidth}x${textureHeight}) for grid config (${requiredWidth}x${requiredHeight}). Using single frame.`);

            // Use the entire texture as a single frame
            this.frameTextures[0] = [];
            this.frameTextures[0][0] = this.texture;
            return;
        }

        for (let row = 0; row < this.config.rows; row++) {
            this.frameTextures[row] = [];
            for (let col = 0; col < this.config.columns; col++) {
                const frameIndex = row * this.config.columns + col;
                if (frameIndex < this.config.totalFrames) {
                    const x = col * this.config.frameWidth;
                    const y = row * this.config.frameHeight;

                    // Ensure frame doesn't exceed texture bounds
                    if (x + this.config.frameWidth <= textureWidth &&
                        y + this.config.frameHeight <= textureHeight) {

                        const rect = new PIXI.Rectangle(x, y, this.config.frameWidth, this.config.frameHeight);
                        this.frameTextures[row][col] = new PIXI.Texture(this.texture.baseTexture, rect);
                    } else {
                        console.warn(`SpriteGrid: Frame ${frameIndex} at (${x},${y}) exceeds texture bounds, skipping`);
                    }
                }
            }
        }
    }

    /**
     * Get frame texture by row and column
     */
    public getFrame(row: number, column: number): PIXI.Texture | null {
        if (row >= 0 && row < this.config.rows &&
            column >= 0 && column < this.config.columns &&
            this.frameTextures[row] && this.frameTextures[row][column]) {
            return this.frameTextures[row][column];
        }
        return null;
    }

    /**
     * Get frame texture by absolute frame index
     */
    public getFrameByIndex(frameIndex: number): PIXI.Texture | null {
        const row = Math.floor(frameIndex / this.config.columns);
        const col = frameIndex % this.config.columns;
        return this.getFrame(row, col);
    }

    /**
     * Convert rotation angle to frame index using Math_FloatToUInt64-based logic
     * Based on Ghidra function: Math_FloatToUInt64 @ 0x004fb4c8
     */
    public static rotationToFrameIndex(rotationRadians: number, totalFrames: number): number {
        // Normalize rotation to 0-2π range
        let normalizedRotation = rotationRadians % (Math.PI * 2);
        if (normalizedRotation < 0) {
            normalizedRotation += Math.PI * 2;
        }

        // Convert to frame index (mimic Math_FloatToUInt64 behavior)
        const frameFloat = (normalizedRotation / (Math.PI * 2)) * totalFrames;
        const frameIndex = Math.floor(frameFloat + 0.5); // Round to nearest integer

        // Ensure frame index is within bounds
        return frameIndex % totalFrames;
    }

    /**
     * Convert angle to rotation frame for 16-frame rotation sprites
     * Based on Heavy Weapon's 16-frame rotation system (22.5° per frame)
     */
    public static angleToRotationFrame(angleRadians: number): number {
        return SpriteGrid.rotationToFrameIndex(angleRadians, 16);
    }

    /**
     * Convert angle to column for sprite grid lookup
     */
    public static angleToColumn(angleRadians: number, columns: number): number {
        return SpriteGrid.rotationToFrameIndex(angleRadians, columns);
    }

    /**
     * Get rotation frame texture for enemy sprite
     */
    public getRotationFrame(angleRadians: number, animationRow: number = 0): PIXI.Texture | null {
        const column = SpriteGrid.angleToColumn(angleRadians, this.config.columns);
        return this.getFrame(animationRow, column);
    }

    /**
     * Get config information
     */
    public getConfig(): SpriteGridConfig {
        return { ...this.config };
    }

    /**
     * Destroy all frame textures
     */
    public destroy(): void {
        for (let row = 0; row < this.frameTextures.length; row++) {
            for (let col = 0; col < this.frameTextures[row].length; col++) {
                if (this.frameTextures[row][col]) {
                    this.frameTextures[row][col].destroy();
                }
            }
        }
        this.frameTextures = [];
    }
}

/**
 * Multi-Row Enemy Sprite Manager - Manages enemy sprites with multiple animation rows
 * Based on Heavy Weapon's multi-row sprite system
 */
export class MultiRowEnemySprite extends PIXI.Sprite {
    private spriteGrid: SpriteGrid;
    private currentRow: number = 0;
    private rotationAngle: number = 0;

    constructor(spriteGrid: SpriteGrid) {
        super();
        this.spriteGrid = spriteGrid;
        this.updateTexture();
    }

    /**
     * Set the animation row (e.g., 0=normal, 1=damaged, 2=destroyed)
     */
    public setAnimationRow(row: number): void {
        if (row !== this.currentRow) {
            this.currentRow = row;
            this.updateTexture();
        }
    }

    /**
     * Set rotation angle and update sprite frame
     */
    public setRotationAngle(angleRadians: number): void {
        if (angleRadians !== this.rotationAngle) {
            this.rotationAngle = angleRadians;
            this.updateTexture();
        }
    }

    /**
     * Update sprite texture based on current row and rotation
     */
    private updateTexture(): void {
        const texture = this.spriteGrid.getRotationFrame(this.rotationAngle, this.currentRow);
        if (texture) {
            this.texture = texture;
        }
    }

    /**
     * Get current animation row
     */
    public getCurrentRow(): number {
        return this.currentRow;
    }

    /**
     * Get current rotation angle
     */
    public getRotationAngle(): number {
        return this.rotationAngle;
    }
}