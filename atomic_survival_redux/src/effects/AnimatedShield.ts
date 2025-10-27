/**
 * AnimatedShield - 10-frame animated shield bubble with dynamic colorization
 * Based on Heavy Weapon shield.png sprite sheet analysis
 */

import * as PIXI from 'pixi.js';

export enum ShieldStrength {
    STRONG = 1,  // Green tint
    MEDIUM = 2,  // Yellow tint
    WEAK = 3     // Red tint
}

export class AnimatedShield extends PIXI.Container {
    private frames: PIXI.Texture[] = [];
    private currentFrame: number = 0;
    private animationCounter: number = 0;
    private shieldSprite: PIXI.Sprite;
    private strength: ShieldStrength = ShieldStrength.STRONG;
    private baseAlpha: number = 0.5;

    constructor(baseTexture: PIXI.BaseTexture) {
        super();

        // Create 10 frames from sprite sheet
        const frameWidth = baseTexture.width / 10;
        const frameHeight = baseTexture.height;

        for (let i = 0; i < 10; i++) {
            const rect = new PIXI.Rectangle(
                i * frameWidth,
                0,
                frameWidth,
                frameHeight
            );
            const texture = new PIXI.Texture(baseTexture, rect);
            this.frames.push(texture);
        }

        // Create sprite with first frame
        this.shieldSprite = new PIXI.Sprite(this.frames[0]);
        this.shieldSprite.anchor.set(0.5);
        this.shieldSprite.blendMode = PIXI.BLEND_MODES.ADD; // Additive blending for energy effect
        this.addChild(this.shieldSprite);

        // Apply initial color tint
        this.updateColorization();
    }

    /**
     * Update shield animation and strength
     */
    public update(deltaTime: number, remainingDuration: number, maxDuration: number): void {
        // Update animation counter (matches Heavy Weapon's counter % 100 / 10 logic)
        this.animationCounter += deltaTime * 60; // 60 FPS base

        // Calculate frame index (0-9)
        this.currentFrame = Math.floor((this.animationCounter % 100) / 10);
        this.shieldSprite.texture = this.frames[this.currentFrame];

        // Update strength based on remaining duration
        const healthPercent = remainingDuration / maxDuration;
        if (healthPercent > 0.66) {
            this.strength = ShieldStrength.STRONG;
        } else if (healthPercent > 0.33) {
            this.strength = ShieldStrength.MEDIUM;
        } else {
            this.strength = ShieldStrength.WEAK;
        }

        this.updateColorization();

        // Pulsing alpha effect based on frame
        // Frames 0-2: expanding (fade in)
        // Frames 3-6: full strength
        // Frames 7-9: contracting (fade out)
        if (this.currentFrame <= 2) {
            this.alpha = this.baseAlpha * (0.7 + 0.3 * (this.currentFrame / 2));
        } else if (this.currentFrame <= 6) {
            this.alpha = this.baseAlpha;
        } else {
            this.alpha = this.baseAlpha * (1.0 - 0.3 * ((this.currentFrame - 6) / 3));
        }

        // Additional fade when shield is about to expire
        if (healthPercent < 0.2) {
            this.alpha *= 0.5 + 0.5 * Math.sin(this.animationCounter * 0.1);
        }
    }

    /**
     * Update shield colorization based on strength
     */
    private updateColorization(): void {
        // Apply color tint based on shield strength
        // Matching Heavy Weapon's CreateColor values
        switch (this.strength) {
            case ShieldStrength.STRONG:
                // Green tint (RGB: 64, 255, 64)
                this.shieldSprite.tint = 0x40FF40;
                break;
            case ShieldStrength.MEDIUM:
                // Yellow tint (RGB: 255, 255, 0)
                this.shieldSprite.tint = 0xFFFF00;
                break;
            case ShieldStrength.WEAK:
                // Red tint (RGB: 255, 64, 64)
                this.shieldSprite.tint = 0xFF4040;
                break;
        }
    }

    /**
     * Set shield visibility with fade effect
     */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (visible) {
            // Reset animation on activation
            this.animationCounter = 0;
            this.currentFrame = 0;
            this.alpha = 0;
        }
    }

    /**
     * Get current shield strength
     */
    public getStrength(): ShieldStrength {
        return this.strength;
    }

    /**
     * Create shield impact effect
     */
    public onImpact(): void {
        // Flash white briefly on impact
        const originalTint = this.shieldSprite.tint;
        this.shieldSprite.tint = 0xFFFFFF;

        setTimeout(() => {
            this.shieldSprite.tint = originalTint;
        }, 100);
    }
}