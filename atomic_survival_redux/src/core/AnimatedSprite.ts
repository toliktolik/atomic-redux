/**
 * AnimatedSprite - Handles frame-based animation for sprite strips
 */

import * as PIXI from 'pixi.js';

export class AnimatedSprite extends PIXI.Sprite {
    private frameCount: number;
    private frameWidth: number;
    private frameHeight: number;
    private currentFrame: number = 0;
    private frameTimer: number = 0;
    private frameRate: number = 100; // ms per frame
    private isPlaying: boolean = true;
    private loop: boolean = true;
    private baseTexture: PIXI.BaseTexture;

    constructor(
        baseTexture: PIXI.BaseTexture,
        frameCount: number,
        frameRate: number = 100,
        loop: boolean = true
    ) {
        // Calculate frame dimensions - sprites are horizontal strips
        const frameWidth = Math.floor(baseTexture.width / frameCount);
        const frameHeight = baseTexture.height;

        // Ensure frame width is valid
        if (frameWidth <= 0) {
            console.error(`Invalid frame width for sprite: ${baseTexture.width} / ${frameCount} = ${frameWidth}`);
        }

        // Create initial texture from first frame
        const initialTexture = new PIXI.Texture(
            baseTexture,
            new PIXI.Rectangle(0, 0, frameWidth, frameHeight)
        );

        super(initialTexture);

        this.baseTexture = baseTexture;
        this.frameCount = frameCount;
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.frameRate = frameRate;
        this.loop = loop;

        // AnimatedSprite initialized with frames
    }

    /**
     * Update animation
     */
    public update(deltaTime: number): void {
        if (!this.isPlaying || this.frameCount <= 1) return;

        this.frameTimer += deltaTime * 1000; // Convert to ms

        if (this.frameTimer >= this.frameRate) {
            this.frameTimer = 0;
            this.nextFrame();
        }
    }

    /**
     * Go to next frame
     */
    private nextFrame(): void {
        this.currentFrame++;

        if (this.currentFrame >= this.frameCount) {
            if (this.loop) {
                this.currentFrame = 0;
            } else {
                this.currentFrame = this.frameCount - 1;
                this.isPlaying = false;
                return;
            }
        }

        this.updateTexture();
    }

    /**
     * Set current frame
     */
    public setFrame(frame: number): void {
        this.currentFrame = Math.max(0, Math.min(frame, this.frameCount - 1));
        this.updateTexture();
    }

    /**
     * Update texture to current frame
     */
    private updateTexture(): void {
        const x = this.currentFrame * this.frameWidth;

        // Ensure we don't go beyond the texture bounds
        const clampedX = Math.min(x, this.baseTexture.width - this.frameWidth);
        const rect = new PIXI.Rectangle(clampedX, 0, this.frameWidth, this.frameHeight);

        // Create new texture for this frame
        this.texture = new PIXI.Texture(this.baseTexture, rect);

        // Debug logging for first few frames
        if (this.currentFrame < 3) {
            // Frame updated
        }
    }

    /**
     * Play animation
     */
    public play(): void {
        this.isPlaying = true;
    }

    /**
     * Pause animation
     */
    public pause(): void {
        this.isPlaying = false;
    }

    /**
     * Stop and reset animation
     */
    public stop(): void {
        this.isPlaying = false;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.updateTexture();
    }

    /**
     * Set frame rate
     */
    public setFrameRate(rate: number): void {
        this.frameRate = rate;
    }

    /**
     * Get current frame
     */
    public getCurrentFrame(): number {
        return this.currentFrame;
    }

    /**
     * Get total frames
     */
    public getFrameCount(): number {
        return this.frameCount;
    }
}