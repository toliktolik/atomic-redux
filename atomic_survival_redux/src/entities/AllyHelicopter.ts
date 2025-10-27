/**
 * Ally Helicopter - White helicopter that delivers power-ups via parachute drops
 * Based on WHATSNEXT.md analysis for authentic Heavy Weapon ally system
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { PowerUp, PowerUpType } from './PowerUp';
import { GameConstants } from '../config/GameConstants';
import { AudioManager } from '../systems/AudioManager';
import { AssetLoader } from '../core/AssetLoader';

export enum FlightPhase {
    ENTERING = 'enter',
    HOVERING = 'hover',
    DROPPING = 'drop',
    EXITING = 'exit',
    COMPLETE = 'complete'
}

export class AllyHelicopter extends PIXI.Container {
    private game: Game;
    private phase: FlightPhase;
    private powerUpType: PowerUpType;
    private speed: number = 2.0;
    private hoverTimer: number = 0;
    private hoverDuration: number = 2000; // 2 seconds hover time

    // Visual components - FIXED to use dual rotor system like original
    private helicopterSprite: PIXI.Sprite;
    private mainRotorSprite?: PIXI.Sprite;   // Top spinning rotor (puprotor.png)
    private tailRotorSprite?: PIXI.Sprite;   // Tail rotor (separate animation)

    // Main rotor animation (top)
    private mainRotorFrameIndex: number = 0;
    private mainRotorFrameTimer: number = 0;
    private readonly MAIN_ROTOR_FRAMES: number = 7;
    private readonly MAIN_ROTOR_FRAME_DELAY: number = 50; // ms between frames

    // Tail rotor animation (rear)
    private tailRotorFrameIndex: number = 0;
    private tailRotorFrameTimer: number = 0;
    private readonly TAIL_ROTOR_FRAMES: number = 4; // Smaller rotor, fewer frames
    private readonly TAIL_ROTOR_FRAME_DELAY: number = 30; // Faster rotation

    // Flight path
    private startX: number = -100;
    private targetX: number;
    private exitX: number = GameConstants.SCREEN_WIDTH + 100;
    private flightY: number = 100; // Fly at top of screen

    // Drop mechanics
    private dropX: number;
    private dropY: number;
    private hasDropped: boolean = false;

    constructor(game: Game, powerUpType: PowerUpType, dropX?: number) {
        super();

        this.game = game;
        this.powerUpType = powerUpType;
        this.phase = FlightPhase.ENTERING;

        // Set drop position (default to center screen)
        this.dropX = dropX ?? GameConstants.SCREEN_WIDTH / 2;
        this.dropY = GameConstants.SCREEN_HEIGHT * 0.7; // Drop in lower area

        // Calculate target hover position (above drop point)
        this.targetX = this.dropX;

        // Set initial position
        this.x = this.startX;
        this.y = this.flightY;

        this.createVisuals();
        this.playHelicopterSound();
    }

    /**
     * Create helicopter visual components using proper dual-rotor pupcopter system
     * Based on Ghidra function PowerUp_DeliverySystem_ProcessAllyChopper @ 0x0042eab0
     * FIXED: Original Heavy Weapon pupcopter has TWO rotors - main (top) + tail (rear)
     */
    private createVisuals(): void {
        // Main helicopter body using pupcopter.png (1 frame)
        // This sprite includes the visible tail rotor area
        const pupcopterTexture = AssetLoader.getTexture('pupcopter');
        this.helicopterSprite = new PIXI.Sprite(pupcopterTexture);
        this.helicopterSprite.anchor.set(0.5);
        this.addChild(this.helicopterSprite);

        // Main rotor blades using puprotor.png (7-frame animation)
        // This is the large top rotor that provides main lift
        const mainRotorTexture = AssetLoader.getTexture('puprotor');
        this.mainRotorSprite = new PIXI.Sprite(mainRotorTexture);
        this.mainRotorSprite.anchor.set(0.5);
        this.mainRotorSprite.y = -12; // Position above helicopter body
        this.addChild(this.mainRotorSprite);

        // Tail rotor - create from puprotor.png but smaller and positioned at tail
        // In original Heavy Weapon, tail rotor uses same texture but scaled down
        this.tailRotorSprite = new PIXI.Sprite(mainRotorTexture);
        this.tailRotorSprite.anchor.set(0.5);
        this.tailRotorSprite.scale.set(0.3); // Much smaller than main rotor
        this.tailRotorSprite.x = 25;  // Position at helicopter tail
        this.tailRotorSprite.y = 8;   // Slightly below center
        this.tailRotorSprite.rotation = Math.PI / 2; // Rotate 90° for vertical tail rotor
        this.addChild(this.tailRotorSprite);

        // Initialize both rotor animations
        this.mainRotorFrameIndex = 0;
        this.mainRotorFrameTimer = 0;
        this.tailRotorFrameIndex = 0;
        this.tailRotorFrameTimer = 0;

        this.updateMainRotorFrame();
        this.updateTailRotorFrame();
    }

    /**
     * Update helicopter flight pattern and drop sequence
     */
    public update(deltaTime: number): void {
        switch (this.phase) {
            case FlightPhase.ENTERING:
                this.updateEntering(deltaTime);
                break;

            case FlightPhase.HOVERING:
                this.updateHovering(deltaTime);
                break;

            case FlightPhase.DROPPING:
                this.updateDropping(deltaTime);
                break;

            case FlightPhase.EXITING:
                this.updateExiting(deltaTime);
                break;

            case FlightPhase.COMPLETE:
                // Helicopter has completed its mission
                break;
        }

        // Animate both rotor systems
        this.updateRotorAnimations(deltaTime);
    }

    /**
     * Phase 1: Helicopter enters from left side of screen
     */
    private updateEntering(deltaTime: number): void {
        // Move towards target position
        this.x += this.speed * deltaTime * 60; // 60 FPS normalization

        // Check if reached hover position
        if (this.x >= this.targetX) {
            this.x = this.targetX;
            this.phase = FlightPhase.HOVERING;
            this.hoverTimer = 0;
        }
    }

    /**
     * Phase 2: Helicopter hovers above drop point
     */
    private updateHovering(deltaTime: number): void {
        this.hoverTimer += deltaTime * 1000; // Convert to ms

        // Add slight bobbing motion while hovering
        this.y = this.flightY + Math.sin(this.hoverTimer * 0.005) * 3;

        // After hover duration, proceed to drop
        if (this.hoverTimer >= this.hoverDuration) {
            this.phase = FlightPhase.DROPPING;
        }
    }

    /**
     * Phase 3: Drop power-up with parachute
     */
    private updateDropping(deltaTime: number): void {
        if (!this.hasDropped) {
            this.dropPowerUp();
            this.hasDropped = true;

            // Wait a moment then start exiting
            setTimeout(() => {
                if (this.phase === FlightPhase.DROPPING) {
                    this.phase = FlightPhase.EXITING;
                }
            }, 500);
        }
    }

    /**
     * Phase 4: Helicopter exits to the right side
     */
    private updateExiting(deltaTime: number): void {
        // Move towards exit position
        this.x += this.speed * deltaTime * 60;

        // Check if off-screen
        if (this.x >= this.exitX) {
            this.phase = FlightPhase.COMPLETE;
            this.destroy();
        }
    }

    /**
     * Update both rotor blade animations - FIXED dual rotor system
     */
    private updateRotorAnimations(deltaTime: number): void {
        // Update main rotor (top)
        this.updateMainRotorAnimation(deltaTime);

        // Update tail rotor (rear) - spins independently
        this.updateTailRotorAnimation(deltaTime);
    }

    /**
     * Update main rotor blade animation (7-frame cycle)
     */
    private updateMainRotorAnimation(deltaTime: number): void {
        if (!this.mainRotorSprite || !this.mainRotorSprite.parent) return;

        this.mainRotorFrameTimer += deltaTime * 1000; // Convert to ms

        // Update frame when timer exceeds delay
        if (this.mainRotorFrameTimer >= this.MAIN_ROTOR_FRAME_DELAY) {
            this.mainRotorFrameTimer = 0;
            this.mainRotorFrameIndex = (this.mainRotorFrameIndex + 1) % this.MAIN_ROTOR_FRAMES;
            this.updateMainRotorFrame();
        }
    }

    /**
     * Update tail rotor animation (faster, independent cycle)
     */
    private updateTailRotorAnimation(deltaTime: number): void {
        if (!this.tailRotorSprite || !this.tailRotorSprite.parent) return;

        this.tailRotorFrameTimer += deltaTime * 1000; // Convert to ms

        // Update frame when timer exceeds delay (faster than main rotor)
        if (this.tailRotorFrameTimer >= this.TAIL_ROTOR_FRAME_DELAY) {
            this.tailRotorFrameTimer = 0;
            this.tailRotorFrameIndex = (this.tailRotorFrameIndex + 1) % this.TAIL_ROTOR_FRAMES;
            this.updateTailRotorFrame();
        }
    }

    /**
     * Update main rotor sprite to show current frame
     */
    private updateMainRotorFrame(): void {
        if (!this.mainRotorSprite) return;

        // Get the texture and set up frame rectangle
        const texture = AssetLoader.getTexture('puprotor');
        if (!texture || !texture.baseTexture) return;

        // Calculate frame rectangle (7-frame horizontal sprite sheet)
        const frameWidth = texture.baseTexture.width / this.MAIN_ROTOR_FRAMES;
        const frameHeight = texture.baseTexture.height;

        // Create new texture from the frame
        const frameTexture = new PIXI.Texture(
            texture.baseTexture,
            new PIXI.Rectangle(
                this.mainRotorFrameIndex * frameWidth,
                0,
                frameWidth,
                frameHeight
            )
        );

        this.mainRotorSprite.texture = frameTexture;
    }

    /**
     * Update tail rotor sprite to show current frame
     */
    private updateTailRotorFrame(): void {
        if (!this.tailRotorSprite) return;

        // Get the texture and set up frame rectangle
        const texture = AssetLoader.getTexture('puprotor');
        if (!texture || !texture.baseTexture) return;

        // Use only first 4 frames for tail rotor (smaller, faster animation)
        const frameWidth = texture.baseTexture.width / this.MAIN_ROTOR_FRAMES;
        const frameHeight = texture.baseTexture.height;

        // Create new texture from the frame (using subset of main rotor frames)
        const frameTexture = new PIXI.Texture(
            texture.baseTexture,
            new PIXI.Rectangle(
                this.tailRotorFrameIndex * frameWidth,
                0,
                frameWidth,
                frameHeight
            )
        );

        this.tailRotorSprite.texture = frameTexture;
    }

    /**
     * Drop power-up with parachute animation
     */
    private dropPowerUp(): void {
        // Create power-up at helicopter position
        const powerUp = new PowerUp(this.game, this.powerUpType, this.x, this.y);

        // Add parachute effect (set falling speed slower)
        (powerUp as any).fallSpeed = 60; // Slower fall with parachute
        (powerUp as any).hasParachute = true;

        this.game.addPowerUp(powerUp);

        // Play drop sound
        AudioManager.play('powerup_drop');

        console.log(`Ally helicopter dropped ${PowerUpType[this.powerUpType]} at (${Math.round(this.x)}, ${Math.round(this.y)})`);
    }

    /**
     * Play helicopter sound effects
     */
    private playHelicopterSound(): void {
        // Play pupcopter.ogg sound from HeavyWeapon sound system
        try {
            AudioManager.play('pupcopter');
        } catch (error) {
            console.log('🚁 Helicopter sound pupcopter.ogg not found');
        }
    }

    /**
     * Check if helicopter has completed its mission
     */
    public isComplete(): boolean {
        return this.phase === FlightPhase.COMPLETE;
    }

    /**
     * Force helicopter to complete mission (for cleanup)
     */
    public completeMission(): void {
        this.phase = FlightPhase.COMPLETE;
        this.destroy();
    }

    /**
     * Emergency evacuation when player dies - fly away quickly
     */
    public evacuate(): void {
        // Force immediate transition to high-speed exit phase
        this.phase = FlightPhase.EXITING;
        this.speed = 6.0; // Increase speed for quick evacuation
        console.log(`Ally helicopter evacuating at high speed from position ${Math.round(this.x)}`);
    }

    /**
     * Clean up helicopter resources - FIXED for dual rotor system
     */
    public destroy(): void {
        if (this.helicopterSprite) {
            this.helicopterSprite.destroy();
        }
        if (this.mainRotorSprite) {
            this.mainRotorSprite.destroy();
        }
        if (this.tailRotorSprite) {
            this.tailRotorSprite.destroy();
        }
        super.destroy();
    }
}