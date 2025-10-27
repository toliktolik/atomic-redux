/**
 * Propaganda Poster - Destructible background element
 * Based on Ghidra analysis and HeavyWeapon_Asset_Hints_v2.xml
 * Uses 3-frame sprite system: intact, damaged, destroyed
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { InteractiveBackgroundElement, BackgroundLayerSystem, BackgroundPlane } from '../systems/BackgroundLayerSystem';

export class PropagandaPoster extends InteractiveBackgroundElement {
    private posterType: number;
    private frames: PIXI.Texture[];
    private currentFrame: number = 0;
    private sprite: PIXI.Sprite;

    constructor(game: Game, x: number, y: number, posterType: number = 1) {
        super(game, x, y, 100, 1000); // 100 health, 1000 points

        this.posterType = posterType;
        this.loadFrames();
        this.createSprite();
    }

    private loadFrames(): void {
        try {
            // Based on original HeavyWeapon assets: Images/Anims/survival/Propaganda1.png etc.
            // Original files contain multi-frame sprites, but we'll use single frame for now
            const posterFile = this.posterType === 5 ?
                `images/anims/survival/propaganda${this.posterType}.png` :  // propaganda5.png (lowercase)
                `images/anims/survival/Propaganda${this.posterType}.png`;   // Propaganda1-4.png (uppercase)

            this.frames = [
                PIXI.Texture.from(posterFile)  // Use same texture for both states for now
            ];

            // Add destroyed version (darkened version of original)
            this.frames.push(this.frames[0]); // Duplicate for now, will create proper destroyed texture
        } catch (error) {
            console.warn(`Failed to load poster frames for type ${this.posterType}, using fallback`);
            this.createFallbackFrames();
        }
    }

    private createFallbackFrames(): void {
        // Create simple fallback textures (2 frames: intact/destroyed)
        this.frames = [];
        const colors = [0xff0000, 0x333333]; // Red for intact, dark gray for destroyed

        for (let i = 0; i < 2; i++) {
            const graphics = new PIXI.Graphics();
            graphics.beginFill(colors[i]);
            graphics.drawRect(0, 0, 64, 96); // Poster dimensions
            graphics.endFill();

            // Add some details
            graphics.lineStyle(2, 0x000000);
            graphics.drawRect(8, 8, 48, 80);

            const texture = this.game.getRenderer().generateTexture(graphics);
            this.frames.push(texture);
        }
    }

    private createSprite(): void {
        this.sprite = new PIXI.Sprite(this.frames[0]);
        this.sprite.anchor.set(0.5, 1.0); // Bottom center anchor
        this.addChild(this.sprite);
    }

    protected updateVisualState(): void {
        const healthPercentage = this.currentHealth / this.maxHealth;

        // Original has 2 frames: intact/destroyed (nuke="yes")
        if (healthPercentage > 0) {
            this.currentFrame = 0; // Intact
        } else {
            this.currentFrame = 1; // Destroyed
        }

        this.sprite.texture = this.frames[this.currentFrame];
    }

    /**
     * Override destruction to add poster-specific effects
     */
    protected destroyElement(): void {
        // Create poster destruction particles
        this.game.getParticleSystem().createExplosion(this.x, this.y, 'medium');

        // Award score with poster bonus
        this.game.getScoreManager().addScore(this.scoreValue);

        console.log(`Propaganda poster destroyed at (${Math.round(this.x)}, ${Math.round(this.y)}) - ${this.scoreValue} points`);

        // Remove from scene
        this.parent?.removeChild(this);
        this.destroy();
    }

    /**
     * Spawn multiple posters across survival background
     * Based on original Anims.xml positions: offset="70" y="150", etc.
     */
    public static spawnPosters(game: Game, backgroundSystem: BackgroundLayerSystem): PropagandaPoster[] {
        const posters: PropagandaPoster[] = [];

        // Original positions from HeavyWeapon/Images/Anims/Anims.xml survival section
        // Adjusted Y positions to align with new mid-background layer at Y:280
        const posterConfigs = [
            { x: 70, y: 330, type: 1 },   // survival\propaganda1 (mid-layer + offset)
            { x: 200, y: 330, type: 2 },  // survival\propaganda2
            { x: 300, y: 330, type: 3 },  // survival\propaganda3
            { x: 400, y: 330, type: 4 },  // survival\propaganda4
            { x: 500, y: 330, type: 5 }   // survival\propaganda5
        ];

        posterConfigs.forEach(config => {
            const poster = new PropagandaPoster(game, config.x, config.y, config.type);
            backgroundSystem.addInteractiveElement(poster, BackgroundPlane.MID_BG); // plane="2"
            posters.push(poster);
        });

        console.log(`Spawned ${posters.length} propaganda posters at original positions`);
        return posters;
    }

    /**
     * Get poster type for identification
     */
    public getPosterType(): number {
        return this.posterType;
    }
}