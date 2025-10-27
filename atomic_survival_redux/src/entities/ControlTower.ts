/**
 * Control Tower - Strategic destructible background element
 * Based on Ghidra analysis of Survival_UpdateControlTowerHealth @ 0x00432c20
 * Uses 5-frame damage progression: 100%, 75%, 50%, 25%, destroyed
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { InteractiveBackgroundElement, BackgroundLayerSystem, BackgroundPlane } from '../systems/BackgroundLayerSystem';

export class ControlTower extends InteractiveBackgroundElement {
    private frames: PIXI.Texture[] = [];
    private currentFrame: number = 0;
    private sprite!: PIXI.Sprite;
    private defenseRadius: number;

    constructor(game: Game, x: number, y: number) {
        super(game, x, y, 500, 5000); // 500 health, 5000 points

        this.defenseRadius = 150;
        this.loadFrames();
        this.createSprite();
    }

    private loadFrames(): void {
        try {
            // Based on original HeavyWeapon assets: Images/Anims/survival/controltower1.png
            // Original has only 1 frame (static structure), so we'll use it for all states
            const towerTexture = PIXI.Texture.from('images/anims/survival/controltower1.png');

            // Use same texture for all damage states for now
            this.frames = [
                towerTexture, // 100%
                towerTexture, // 75%
                towerTexture, // 50%
                towerTexture, // 25%
                towerTexture  // Destroyed
            ];
        } catch (error) {
            console.warn('Failed to load control tower frames, using fallback');
            this.createFallbackFrames();
        }
    }

    private createFallbackFrames(): void {
        // Create fallback tower textures
        this.frames = [];
        const colors = [0x666666, 0x555555, 0x444444, 0x333333, 0x222222];

        for (let i = 0; i < 5; i++) {
            const graphics = new PIXI.Graphics();

            // Tower base
            graphics.beginFill(colors[i]);
            graphics.drawRect(0, 60, 80, 60);
            graphics.endFill();

            // Tower structure
            graphics.beginFill(colors[i]);
            graphics.drawRect(20, 20, 40, 80);
            graphics.endFill();

            // Add damage effects for later frames
            if (i > 0) {
                graphics.beginFill(0xff4400, 0.7);
                for (let j = 0; j < i; j++) {
                    graphics.drawRect(Math.random() * 70, Math.random() * 100, 10, 10);
                }
                graphics.endFill();
            }

            // Add outline
            graphics.lineStyle(2, 0x000000);
            graphics.drawRect(0, 60, 80, 60);
            graphics.drawRect(20, 20, 40, 80);

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

        if (healthPercentage > 0.8) {
            this.currentFrame = 0; // 100%
        } else if (healthPercentage > 0.6) {
            this.currentFrame = 1; // 75%
        } else if (healthPercentage > 0.4) {
            this.currentFrame = 2; // 50%
        } else if (healthPercentage > 0.2) {
            this.currentFrame = 3; // 25%
        } else if (healthPercentage > 0) {
            this.currentFrame = 4; // Destroyed state (still has minimal health)
        }

        this.sprite.texture = this.frames[this.currentFrame];

        // Add screen shake effect when damaged
        if (healthPercentage < 0.5 && Math.random() < 0.1) {
            this.sprite.x = (Math.random() - 0.5) * 4;
            this.sprite.y = (Math.random() - 0.5) * 2;

            // Reset position after short delay
            setTimeout(() => {
                this.sprite.x = 0;
                this.sprite.y = 0;
            }, 100);
        }
    }

    protected destroyElement(): void {
        // Create large explosion for tower destruction
        this.game.getParticleSystem().createExplosion(this.x, this.y, 'large');

        // Award bonus score for strategic target
        const bonusScore = this.scoreValue + 2000;
        this.game.getScoreManager().addScore(bonusScore);

        // Screen shake effect for major destruction
        this.createScreenShake();

        console.log(`Control tower destroyed at (${Math.round(this.x)}, ${Math.round(this.y)}) - ${bonusScore} points!`);

        // Remove from scene
        this.parent?.removeChild(this);
        this.destroy();
    }

    private createScreenShake(): void {
        // Create screen shake effect for dramatic tower destruction
        const gameContainer = this.game.layers.getLayer('background').parent;
        if (!gameContainer) return;

        const originalX = gameContainer.x;
        const originalY = gameContainer.y;
        const intensity = 15;
        const duration = 500; // 500ms shake
        let elapsed = 0;

        const shake = () => {
            elapsed += 16; // ~60fps
            const progress = elapsed / duration;
            const decay = 1 - progress;

            if (progress < 1) {
                gameContainer.x = originalX + (Math.random() - 0.5) * intensity * decay;
                gameContainer.y = originalY + (Math.random() - 0.5) * intensity * decay;
                requestAnimationFrame(shake);
            } else {
                gameContainer.x = originalX;
                gameContainer.y = originalY;
            }
        };

        shake();
    }

    /**
     * Spawn control towers at strategic positions
     * Based on original Anims.xml: plane="3" offset="200" y="120"
     */
    public static spawnTowers(game: Game, backgroundSystem: BackgroundLayerSystem): ControlTower[] {
        const towers: ControlTower[] = [];

        // Original positions from HeavyWeapon/Images/Anims/Anims.xml survival section
        // Adjusted Y position to align with new far-background layer at Y:120
        const towerConfigs = [
            { x: 200, y: 170 }   // survival\controltower1, plane="3" (far-layer + offset)
        ];

        towerConfigs.forEach(config => {
            const tower = new ControlTower(game, config.x, config.y);
            backgroundSystem.addInteractiveElement(tower, BackgroundPlane.FAR_BG); // plane="3"
            towers.push(tower);
        });

        console.log(`Spawned ${towers.length} control towers at original positions`);
        return towers;
    }

    /**
     * Get defense radius for strategic gameplay
     */
    public getDefenseRadius(): number {
        return this.defenseRadius;
    }

    /**
     * Check if tower is heavily damaged (for AI behavior changes)
     */
    public isHeavilyDamaged(): boolean {
        return this.currentHealth / this.maxHealth < 0.3;
    }
}