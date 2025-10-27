/**
 * Particle System - Manages visual effects like explosions, smoke, and debris
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { GameConstants } from '../config/GameConstants';

interface Particle {
    sprite: PIXI.Sprite;
    velocity: PIXI.Point;
    lifeTime: number;
    maxLifeTime: number;
    fadeRate: number;
    scaleRate: number;
    gravity: boolean;
    rotation: number;
    rotationSpeed: number;
}

export class ParticleSystem {
    private game: Game;
    private container: PIXI.Container;
    private particles: Particle[] = [];
    private maxParticles: number = 500;
    private textures: Map<string, PIXI.Texture> = new Map();

    constructor(game: Game) {
        this.game = game;
        this.container = new PIXI.Container();
        this.createParticleTextures();
    }

    /**
     * Create reusable particle textures
     */
    private createParticleTextures(): void {
        // Create different colored circle textures
        const colors = [0xff8800, 0xffaa00, 0x666666, 0x444444, 0xffffff, 0xffff00, 0x888888, 0x999999, 0x00ffff];
        const sizes = [4, 8, 12, 16, 20];

        for (const color of colors) {
            for (const size of sizes) {
                const graphics = new PIXI.Graphics();
                graphics.beginFill(color);
                graphics.drawCircle(size/2, size/2, size/2);
                graphics.endFill();

                const texture = this.game.app.renderer.generateTexture(graphics);
                this.textures.set(`${color}_${size}`, texture);
                graphics.destroy();
            }
        }
    }

    /**
     * Get particle container
     */
    public getContainer(): PIXI.Container {
        return this.container;
    }

    /**
     * Update all particles
     */
    public update(deltaTime: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Update lifetime
            particle.lifeTime += deltaTime * 1000;

            if (particle.lifeTime >= particle.maxLifeTime) {
                // Remove expired particle
                this.container.removeChild(particle.sprite);
                particle.sprite.destroy();
                this.particles.splice(i, 1);
                continue;
            }

            // Update position
            particle.sprite.x += particle.velocity.x * deltaTime;
            particle.sprite.y += particle.velocity.y * deltaTime;

            // Apply gravity
            if (particle.gravity) {
                particle.velocity.y += GameConstants.PHYSICS.GRAVITY * deltaTime;
            }

            // Update rotation
            particle.sprite.rotation += particle.rotationSpeed * deltaTime;

            // Update alpha
            const lifeProgress = particle.lifeTime / particle.maxLifeTime;
            particle.sprite.alpha = Math.max(0, 1 - lifeProgress * particle.fadeRate);

            // Update scale
            if (particle.scaleRate !== 0) {
                const scale = 1 + lifeProgress * particle.scaleRate;
                particle.sprite.scale.set(scale);
            }
        }
    }

    /**
     * Create explosion effect
     */
    public createExplosion(x: number, y: number, size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'): void {
        const particleCount = size === 'tiny' ? 3 : size === 'small' ? 10 : size === 'medium' ? 20 : 30;
        const speedRange = size === 'tiny' ? 30 : size === 'small' ? 100 : size === 'medium' ? 200 : 300;
        const sizeMultiplier = size === 'tiny' ? 0.15 : size === 'small' ? 0.5 : size === 'medium' ? 1 : 1.5;

        // Create fire particles
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = speedRange * (0.5 + Math.random() * 0.5);

            this.createParticle({
                x,
                y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                color: Math.random() > 0.5 ? 0xff8800 : 0xffaa00,
                size: (10 + Math.random() * 10) * sizeMultiplier,
                lifeTime: 500 + Math.random() * 500,
                fadeRate: 1.5,
                scaleRate: 0.5,
                gravity: false,
                rotationSpeed: Math.random() * 5 - 2.5
            });
        }

        // Create smoke particles
        for (let i = 0; i < particleCount / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedRange * 0.3;

            this.createParticle({
                x,
                y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed - 50,
                color: 0x666666,
                size: (15 + Math.random() * 15) * sizeMultiplier,
                lifeTime: 1000 + Math.random() * 1000,
                fadeRate: 1,
                scaleRate: 1,
                gravity: false,
                rotationSpeed: Math.random() * 2 - 1
            });
        }

        // Create debris particles
        for (let i = 0; i < particleCount / 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = speedRange * 1.5;

            this.createParticle({
                x,
                y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed - 100,
                color: 0x444444,
                size: 3 + Math.random() * 5,
                lifeTime: 2000,
                fadeRate: 0.5,
                scaleRate: 0,
                gravity: true,
                rotationSpeed: Math.random() * 10 - 5
            });
        }
    }

    /**
     * Create smoke trail
     */
    public createSmoke(x: number, y: number): void {
        this.createParticle({
            x,
            y,
            velocityX: (Math.random() - 0.5) * 20,
            velocityY: -30 - Math.random() * 20,
            color: 0x888888,
            size: 10 + Math.random() * 10,
            lifeTime: 1500,
            fadeRate: 1,
            scaleRate: 0.5,
            gravity: false,
            rotationSpeed: Math.random() * 2 - 1
        });
    }

    /**
     * Create muzzle flash
     */
    public createMuzzleFlash(x: number, y: number, angle: number): void {
        const flashDistance = 20;
        const flashX = x + Math.cos(angle) * flashDistance;
        const flashY = y + Math.sin(angle) * flashDistance;

        // Create flash particle
        this.createParticle({
            x: flashX,
            y: flashY,
            velocityX: Math.cos(angle) * 50,
            velocityY: Math.sin(angle) * 50,
            color: 0xffff00,
            size: 15,
            lifeTime: 100,
            fadeRate: 2,
            scaleRate: -0.5,
            gravity: false,
            rotationSpeed: 0
        });

        // Create smoke puff
        for (let i = 0; i < 3; i++) {
            this.createParticle({
                x: flashX,
                y: flashY,
                velocityX: Math.cos(angle + (Math.random() - 0.5)) * 30,
                velocityY: Math.sin(angle + (Math.random() - 0.5)) * 30,
                color: 0x999999,
                size: 8,
                lifeTime: 300,
                fadeRate: 1.5,
                scaleRate: 0.5,
                gravity: false,
                rotationSpeed: Math.random() * 2 - 1
            });
        }
    }

    /**
     * Create bullet impact
     */
    public createImpact(x: number, y: number): void {
        // Create sparks
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100;

            this.createParticle({
                x,
                y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                color: 0xffff00,
                size: 2,
                lifeTime: 200,
                fadeRate: 2,
                scaleRate: 0,
                gravity: true,
                rotationSpeed: 0
            });
        }
    }

    /**
     * Create nuke flash effect
     */
    public createNukeFlash(): void {
        // Create full-screen flash
        const flash = new PIXI.Graphics();
        flash.beginFill(0xffffff);
        flash.drawRect(0, 0, GameConstants.SCREEN_WIDTH, GameConstants.SCREEN_HEIGHT);
        flash.endFill();
        flash.alpha = 1;

        this.container.addChild(flash);

        // Fade out flash
        const fadeOut = setInterval(() => {
            flash.alpha -= 0.05;
            if (flash.alpha <= 0) {
                this.container.removeChild(flash);
                flash.destroy();
                clearInterval(fadeOut);
            }
        }, 16);

        // Create shockwave ring
        const shockwave = new PIXI.Graphics();
        shockwave.lineStyle(5, 0xffffff, 0.8);
        shockwave.drawCircle(0, 0, 10);
        shockwave.x = GameConstants.SCREEN_WIDTH / 2;
        shockwave.y = GameConstants.SCREEN_HEIGHT / 2;

        this.container.addChild(shockwave);

        // Expand shockwave
        const expand = setInterval(() => {
            shockwave.scale.x += 0.5;
            shockwave.scale.y += 0.5;
            shockwave.alpha -= 0.02;

            if (shockwave.alpha <= 0) {
                this.container.removeChild(shockwave);
                shockwave.destroy();
                clearInterval(expand);
            }
        }, 16);
    }

    /**
     * Create shield hit effect
     */
    public createShieldHit(x: number, y: number): void {
        // Create ripple effect
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            const speed = 50;

            this.createParticle({
                x,
                y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                color: 0x00ffff,
                size: 5,
                lifeTime: 300,
                fadeRate: 2,
                scaleRate: 1,
                gravity: false,
                rotationSpeed: 0
            });
        }
    }

    /**
     * Create engine exhaust
     */
    public createExhaust(x: number, y: number, direction: number): void {
        this.createParticle({
            x: x - direction * 25,
            y: y + 10,
            velocityX: -direction * 20 + (Math.random() - 0.5) * 10,
            velocityY: 20 + Math.random() * 10,
            color: 0x444444,
            size: 5 + Math.random() * 5,
            lifeTime: 500,
            fadeRate: 1.5,
            scaleRate: 0.5,
            gravity: false,
            rotationSpeed: Math.random() * 2 - 1
        });
    }

    /**
     * Create a particle
     */
    private createParticle(params: {
        x: number;
        y: number;
        velocityX: number;
        velocityY: number;
        color: number;
        size: number;
        lifeTime: number;
        fadeRate: number;
        scaleRate: number;
        gravity: boolean;
        rotationSpeed: number;
    }): void {
        // Limit particle count
        if (this.particles.length >= this.maxParticles) {
            // Remove oldest particle
            const oldest = this.particles.shift();
            if (oldest) {
                this.container.removeChild(oldest.sprite);
                oldest.sprite.destroy();
            }
        }

        // Find the closest size and use pre-created texture
        const sizes = [4, 8, 12, 16, 20];
        const closestSize = sizes.reduce((prev, curr) =>
            Math.abs(curr - params.size) < Math.abs(prev - params.size) ? curr : prev
        );

        const textureKey = `${params.color}_${closestSize}`;
        let texture = this.textures.get(textureKey);

        // Fallback to white texture if color not found
        if (!texture) {
            texture = this.textures.get(`0xffffff_${closestSize}`) || this.textures.get('0xffffff_8');
        }

        // Create sprite using pre-made texture
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = params.x;
        sprite.y = params.y;
        sprite.tint = params.color; // Apply color tint to white texture if needed

        this.container.addChild(sprite);

        // Create particle object
        const particle: Particle = {
            sprite,
            velocity: new PIXI.Point(params.velocityX, params.velocityY),
            lifeTime: 0,
            maxLifeTime: params.lifeTime,
            fadeRate: params.fadeRate,
            scaleRate: params.scaleRate,
            gravity: params.gravity,
            rotation: 0,
            rotationSpeed: params.rotationSpeed
        };

        this.particles.push(particle);
    }

    /**
     * Clear all particles
     */
    public clear(): void {
        for (const particle of this.particles) {
            this.container.removeChild(particle.sprite);
            particle.sprite.destroy();
        }
        this.particles = [];
    }

    /**
     * Get particle count
     */
    public getParticleCount(): number {
        return this.particles.length;
    }
}