/**
 * Background Layer System - Multi-layer parallax background rendering
 * Based on Ghidra analysis of Survival_RenderBackgroundLayer @ 0x00432030
 * Implements 4-plane background system with authentic parallax scrolling
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';

export enum BackgroundPlane {
    SKY = 4,           // Slowest parallax (0.1x)
    FAR_BG = 3,        // Slow parallax (0.3x)
    MID_BG = 2,        // Medium parallax (0.6x)
    GROUND = 1         // Normal speed (1.0x)
}

export interface BackgroundLayer {
    plane: BackgroundPlane;
    sprites: PIXI.TilingSprite[];
    parallaxFactor: number;
    scrollSpeed: number;
}

export abstract class InteractiveBackgroundElement extends PIXI.Container {
    protected game: Game;
    protected maxHealth: number;
    protected currentHealth: number;
    protected scoreValue: number;
    protected destructible: boolean;
    protected parallaxFactor: number = 1.0;
    protected baseX: number;

    constructor(game: Game, x: number, y: number, health: number, scoreValue: number) {
        super();

        this.game = game;
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.maxHealth = health;
        this.currentHealth = health;
        this.scoreValue = scoreValue;
        this.destructible = true;
    }

    /**
     * Apply parallax positioning based on camera movement
     */
    public setParallaxFactor(factor: number): void {
        this.parallaxFactor = factor;
    }

    /**
     * Update element position with parallax effect
     */
    public updateParallax(cameraX: number): void {
        if (this.destroyed || !this.position) return;
        this.x = this.baseX - (cameraX * this.parallaxFactor);
    }

    /**
     * Handle damage from projectiles (nuke-only for background elements)
     */
    public takeDamage(damage: number, isNukeAttack: boolean = false): boolean {
        if (!this.destructible || this.currentHealth <= 0) {
            return false;
        }

        // Background elements (with nuke="yes" in anims.xml) can only be destroyed by nukes
        // Regular projectile damage is ignored
        if (!isNukeAttack && damage < 50000) {
            console.log(`Background element ignoring regular projectile damage (${damage})`);
            return false;
        }

        this.currentHealth -= damage;
        this.updateVisualState();

        if (this.currentHealth <= 0) {
            this.destroyElement();
            return true; // Element destroyed
        }

        return false; // Element damaged but not destroyed
    }

    /**
     * Update visual appearance based on health
     */
    protected abstract updateVisualState(): void;

    /**
     * Handle element destruction
     */
    protected destroyElement(): void {
        // Mark as destroyed first to prevent further updates
        this.destructible = false;

        // Award score
        this.game.getScoreManager().addScore(this.scoreValue);

        // Create destruction effect
        this.game.getParticleSystem().createExplosion(this.x, this.y, 'medium');

        // Remove from scene
        if (this.parent) {
            this.parent.removeChild(this);
        }

        // Destroy the PIXI object
        this.destroy();
    }

    /**
     * Check collision with projectile
     */
    public checkCollision(projectile: any): boolean {
        const bounds = this.getBounds();
        const projectileBounds = projectile.getBounds();
        return bounds.intersects(projectileBounds);
    }
}

export class BackgroundLayerSystem {
    private game: Game;
    private layers: Map<BackgroundPlane, BackgroundLayer>;
    private cameraX: number = 0;
    private autoScrollEnabled: boolean = true;
    private autoScrollSpeed: number = 20; // pixels per second
    private interactiveElements: InteractiveBackgroundElement[] = [];

    constructor(game: Game) {
        console.log('DEBUG: BackgroundLayerSystem constructor called');
        this.game = game;
        this.layers = new Map();

        // Set up global PIXI error handling for texture loading
        PIXI.utils.skipHello();

        try {
            this.initializeLayers();
            console.log('DEBUG: BackgroundLayerSystem initialization completed');
        } catch (error) {
            console.error('ERROR: BackgroundLayerSystem initialization failed:', error);
        }
    }

    private initializeLayers(): void {
        // All background layers - using ground layer which we know works
        this.addLayer(BackgroundPlane.SKY, 'images/backgrounds/survival_sky.png', 0.1);
        this.addLayer(BackgroundPlane.FAR_BG, 'images/backgrounds/survival_bg.png', 0.3);
        this.addLayer(BackgroundPlane.MID_BG, 'images/backgrounds/survival_bg2.png', 0.6);
        this.addLayer(BackgroundPlane.GROUND, 'images/backgrounds/survival_ground.png', 1.0);
    }

    private createTestLayer(plane: BackgroundPlane, color: number, y: number, parallaxFactor: number): void {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(color);
        graphics.drawRect(0, 0, GameConstants.SCREEN_WIDTH * 3, 100); // Wide strip, 100px high
        graphics.endFill();

        const texture = this.game.getRenderer().generateTexture(graphics);
        const sprite = new PIXI.TilingSprite(texture, GameConstants.SCREEN_WIDTH * 3, 100);

        sprite.y = y;
        sprite.x = 0;
        sprite.visible = true;
        sprite.alpha = 1.0;
        sprite.zIndex = plane;

        // FIX: Use a working layer instead of 'background' which has rendering issues
        const backgroundContainer = this.game.layers.getLayer('ground');
        backgroundContainer.addChild(sprite);
        backgroundContainer.sortableChildren = true;

        // Store in layers map
        this.layers.set(plane, {
            plane,
            sprites: [sprite],
            parallaxFactor,
            scrollSpeed: this.autoScrollSpeed * parallaxFactor
        });
    }

    private addLayer(plane: BackgroundPlane, texturePath: string, parallaxFactor: number): void {
        // Create texture with error handling
        const texture = PIXI.Texture.from(texturePath);

        // Set up error handling for texture loading
        texture.baseTexture.on('error', () => {
            console.warn(`Failed to load background texture: ${texturePath}, using fallback`);
            this.createFallbackLayer(plane, parallaxFactor);
            return;
        });

        // Log successful texture loading for debugging
        texture.baseTexture.on('loaded', () => {
            console.log(`Successfully loaded background texture: ${texturePath} (${texture.width}x${texture.height})`);
            // Update sprite dimensions after texture loads
            if (sprite && texture.width > 0 && texture.height > 0) {
                sprite.height = texture.height || defaultLayerHeights[plane];
                console.log(`Updated sprite dimensions: ${sprite.width}x${sprite.height}`);
            }
        });

        // Default layer heights based on typical background layer sizes
        const defaultLayerHeights = {
            [BackgroundPlane.SKY]: 480,           // Sky layer height - full screen
            [BackgroundPlane.FAR_BG]: 300,        // Far background height - larger to be visible
            [BackgroundPlane.MID_BG]: 300,        // Mid layer height - larger to be visible
            [BackgroundPlane.GROUND]: 120         // Ground layer height - keep original
        };

        // Create tiling sprite for horizontal scrolling only
        const sprite = new PIXI.TilingSprite(
            texture,
            GameConstants.SCREEN_WIDTH * 3, // Wider for scrolling
            texture.height || defaultLayerHeights[plane] // Use texture height or sensible default
        );

        // Position layers to match original Heavy Weapon layout
        const layerPositions = {
            [BackgroundPlane.SKY]: 0,                                    // Top of screen (sky)
            [BackgroundPlane.FAR_BG]: GameConstants.SCREEN_HEIGHT - 300,  // Far BG hills - bottom aligned (480-300=180)
            [BackgroundPlane.MID_BG]: GameConstants.SCREEN_HEIGHT - 200,  // Mid BG buildings (480-200=280)
            [BackgroundPlane.GROUND]: GameConstants.SCREEN_HEIGHT - 60    // Ground strip - bottom (480-60=420)
        };

        sprite.y = layerPositions[plane];

        // Add slight horizontal offset for texture variation
        const horizontalOffsets = {
            [BackgroundPlane.SKY]: 0,
            [BackgroundPlane.FAR_BG]: -50,
            [BackgroundPlane.MID_BG]: -100,
            [BackgroundPlane.GROUND]: -25
        };

        sprite.x = horizontalOffsets[plane];

        const layer: BackgroundLayer = {
            plane,
            sprites: [sprite],
            parallaxFactor,
            scrollSpeed: this.autoScrollSpeed * parallaxFactor
        };

        // Ensure sprite is visible
        sprite.visible = true;
        sprite.alpha = 1.0;

        // Position layer in correct render order (higher plane = back layer)
        sprite.zIndex = plane;

        // FIX: Use different working layers for each background plane to avoid overlap
        // Keep background layers behind tank (zIndex 6) and other gameplay elements
        // CORRECTED: Swap middle layers to match original Heavy Weapon order
        const layerMapping = {
            [BackgroundPlane.SKY]: 'background',      // Sky works fine with background layer (zIndex 0)
            [BackgroundPlane.FAR_BG]: 'shadows',      // Use shadows layer for far BG hills (zIndex 2) - behind buildings
            [BackgroundPlane.MID_BG]: 'ground',       // Use ground layer for mid BG cityscape (zIndex 1) - in front of hills
            [BackgroundPlane.GROUND]: 'ground_enemies' // Use ground_enemies layer for ground (zIndex 3)
        };

        const backgroundContainer = this.game.layers.getLayer(layerMapping[plane] || 'ground');
        backgroundContainer.addChild(sprite);

        // Enable sorting by zIndex
        backgroundContainer.sortableChildren = true;

        this.layers.set(plane, layer);
        console.log(`Background layer ${plane} positioned at Y:${sprite.y} X:${sprite.x} size:${sprite.width}x${sprite.height} visible:${sprite.visible} alpha:${sprite.alpha}`);
    }

    private createFallbackLayer(plane: BackgroundPlane, parallaxFactor: number): void {
        // Create a simple colored fallback layer
        const graphics = new PIXI.Graphics();

        // Different colors and heights for each layer plane (more distinct for debugging)
        const colors = {
            [BackgroundPlane.SKY]: 0x87CEEB,      // Sky blue
            [BackgroundPlane.FAR_BG]: 0xFF0000,   // Bright red for visibility
            [BackgroundPlane.MID_BG]: 0x00FF00,   // Bright green for visibility
            [BackgroundPlane.GROUND]: 0x0000FF    // Bright blue for visibility
        };

        const layerHeights = {
            [BackgroundPlane.SKY]: 200,           // Sky layer height
            [BackgroundPlane.FAR_BG]: 150,        // Far background height
            [BackgroundPlane.MID_BG]: 100,        // Mid layer height
            [BackgroundPlane.GROUND]: 100         // Ground layer height
        };

        const layerPositions = {
            [BackgroundPlane.SKY]: 0,                                    // Top of screen (sky)
            [BackgroundPlane.FAR_BG]: GameConstants.SCREEN_HEIGHT - 300,  // Far BG hills - bottom aligned
            [BackgroundPlane.MID_BG]: GameConstants.SCREEN_HEIGHT - 200,  // Mid BG buildings
            [BackgroundPlane.GROUND]: GameConstants.SCREEN_HEIGHT - 60    // Ground strip - bottom
        };

        graphics.beginFill(colors[plane] || 0x333333);
        graphics.drawRect(0, 0, GameConstants.SCREEN_WIDTH * 3, layerHeights[plane]);
        graphics.endFill();

        const texture = this.game.getRenderer().generateTexture(graphics);
        const sprite = new PIXI.TilingSprite(texture, GameConstants.SCREEN_WIDTH * 3, layerHeights[plane]);

        sprite.y = layerPositions[plane];

        // Add slight horizontal offset for texture variation
        const horizontalOffsets = {
            [BackgroundPlane.SKY]: 0,
            [BackgroundPlane.FAR_BG]: -50,
            [BackgroundPlane.MID_BG]: -100,
            [BackgroundPlane.GROUND]: -25
        };

        sprite.x = horizontalOffsets[plane];

        const layer: BackgroundLayer = {
            plane,
            sprites: [sprite],
            parallaxFactor,
            scrollSpeed: this.autoScrollSpeed * parallaxFactor
        };

        // Ensure sprite is visible
        sprite.visible = true;
        sprite.alpha = 1.0;

        sprite.zIndex = plane;
        // FIX: Use same layer mapping for fallback layers
        // Keep background layers behind tank (zIndex 6) and other gameplay elements
        // CORRECTED: Swap middle layers to match original Heavy Weapon order
        const layerMapping = {
            [BackgroundPlane.SKY]: 'background',      // Sky works fine with background layer (zIndex 0)
            [BackgroundPlane.FAR_BG]: 'shadows',      // Use shadows layer for far BG hills (zIndex 2) - behind buildings
            [BackgroundPlane.MID_BG]: 'ground',       // Use ground layer for mid BG cityscape (zIndex 1) - in front of hills
            [BackgroundPlane.GROUND]: 'ground_enemies' // Use ground_enemies layer for ground (zIndex 3)
        };

        const backgroundContainer = this.game.layers.getLayer(layerMapping[plane] || 'ground');
        backgroundContainer.addChild(sprite);
        backgroundContainer.sortableChildren = true;

        this.layers.set(plane, layer);

        console.log(`Fallback background layer ${plane} created at Y:${sprite.y} X:${sprite.x} size:${sprite.width}x${sprite.height}`);
    }

    /**
     * Update parallax scrolling for all background layers
     * Based on Ghidra: Survival_RenderBackgroundLayer
     */
    public update(deltaTime: number): void {
        if (this.autoScrollEnabled) {
            this.cameraX += this.autoScrollSpeed * deltaTime;
        }

        // Update each layer's parallax offset
        this.layers.forEach((layer, plane) => {
            const parallaxOffset = this.cameraX * layer.parallaxFactor;
            layer.sprites.forEach(sprite => {
                (sprite as PIXI.TilingSprite).tilePosition.x = -parallaxOffset;
            });
        });

        // Update interactive elements (filter out destroyed elements)
        this.interactiveElements = this.interactiveElements.filter(element => {
            if (!element || element.destroyed) {
                return false;
            }
            element.updateParallax(this.cameraX);
            return true;
        });
    }

    /**
     * Add interactive element to specific background plane
     */
    public addInteractiveElement(element: InteractiveBackgroundElement, plane: BackgroundPlane): void {
        const layer = this.layers.get(plane);
        if (layer) {
            // Apply parallax positioning
            element.setParallaxFactor(layer.parallaxFactor);
            this.game.layers.getLayer('background').addChild(element);
            this.interactiveElements.push(element);

            console.log(`Interactive element added to background plane ${plane}`);
        }
    }

    /**
     * Remove interactive element
     */
    public removeInteractiveElement(element: InteractiveBackgroundElement): void {
        const index = this.interactiveElements.indexOf(element);
        if (index > -1) {
            this.interactiveElements.splice(index, 1);
            element.parent?.removeChild(element);
        }
    }

    /**
     * Get all interactive elements for collision detection
     */
    public getInteractiveElements(): InteractiveBackgroundElement[] {
        return [...this.interactiveElements];
    }

    /**
     * Set auto-scroll speed
     */
    public setScrollSpeed(speed: number): void {
        this.autoScrollSpeed = speed;

        // Update layer scroll speeds
        this.layers.forEach(layer => {
            layer.scrollSpeed = speed * layer.parallaxFactor;
        });
    }

    /**
     * Enable/disable auto-scrolling
     */
    public setAutoScroll(enabled: boolean): void {
        this.autoScrollEnabled = enabled;
    }

    /**
     * Get current camera position
     */
    public getCameraX(): number {
        return this.cameraX;
    }

    /**
     * Set camera position (for manual control)
     */
    public setCameraX(x: number): void {
        this.cameraX = x;
    }

    /**
     * Clean up all layers
     */
    public destroy(): void {
        this.layers.forEach(layer => {
            layer.sprites.forEach(sprite => sprite.destroy());
        });
        this.layers.clear();

        this.interactiveElements.forEach(element => element.destroy());
        this.interactiveElements = [];
    }
}