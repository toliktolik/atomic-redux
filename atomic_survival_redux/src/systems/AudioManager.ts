/**
 * Audio Manager - Handles all game sounds and music
 */

import { Howl, Howler } from 'howler';
import { AssetLoader } from '../core/AssetLoader';

export class AudioManager {
    private static sounds: Map<string, Howl> = new Map();
    private static musicVolume: number = 0.5;
    private static effectsVolume: number = 0.7;
    private static muted: boolean = false;
    private static currentMusic?: Howl;

    /**
     * Initialize audio manager
     */
    public static initialize(): void {
        // Set global volume
        Howler.volume(1);

        // Load volume settings from localStorage
        const savedMusicVolume = localStorage.getItem('atomicSurvivalMusicVolume');
        const savedEffectsVolume = localStorage.getItem('atomicSurvivalEffectsVolume');
        const savedMuted = localStorage.getItem('atomicSurvivalMuted');

        if (savedMusicVolume) this.musicVolume = parseFloat(savedMusicVolume);
        if (savedEffectsVolume) this.effectsVolume = parseFloat(savedEffectsVolume);
        if (savedMuted) this.muted = savedMuted === 'true';

        // Resume AudioContext on first user interaction
        const resumeAudio = async () => {
            try {
                if (Howler.ctx && Howler.ctx.state === 'suspended') {
                    console.log('Attempting to resume AudioContext...');
                    await Howler.ctx.resume();
                    console.log('AudioContext resumed successfully');
                } else if (!Howler.ctx) {
                    console.log('AudioContext not initialized yet');
                }
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
                document.removeEventListener('touchstart', resumeAudio);
            } catch (error) {
                console.error('Failed to resume AudioContext:', error);
            }
        };

        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);

        // Handle tab focus/blur events
        window.addEventListener('focus', async () => {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                try {
                    await Howler.ctx.resume();
                    console.log('AudioContext resumed on focus');
                } catch (error) {
                    console.error('Failed to resume AudioContext on focus:', error);
                }
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && Howler.ctx && Howler.ctx.state === 'suspended') {
                try {
                    await Howler.ctx.resume();
                    console.log('AudioContext resumed on visibility change');
                } catch (error) {
                    console.error('Failed to resume AudioContext on visibility change:', error);
                }
            }
        });
    }

    /**
     * Play a sound effect
     */
    public static play(soundName: string, volume?: number): number | undefined {
        if (this.muted) return;

        // Check if AudioContext is suspended
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
            console.warn(`AudioContext suspended, cannot play sound '${soundName}'`);
            return;
        }

        const sound = AssetLoader.getSound(soundName);
        if (!sound) {
            console.warn(`Sound '${soundName}' not found`);
            return;
        }

        // Set volume
        const finalVolume = (volume ?? 1) * this.effectsVolume;
        sound.volume(finalVolume);

        // Play and return ID for later control
        return sound.play();
    }

    /**
     * Play a sound at position (for spatial audio)
     */
    public static playAt(soundName: string, x: number, y: number): void {
        if (this.muted) return;

        const sound = AssetLoader.getSound(soundName);
        if (!sound) return;

        // Calculate volume based on distance from center
        const centerX = 640;
        const centerY = 360;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const maxDistance = 500;
        const volumeFactor = Math.max(0, 1 - (distance / maxDistance));

        // Calculate stereo pan (-1 to 1)
        const pan = (x - centerX) / centerX;

        // Configure and play
        sound.volume(volumeFactor * this.effectsVolume);
        sound.stereo(pan);
        sound.play();
    }

    /**
     * Play looping sound
     */
    public static playLoop(soundName: string, volume?: number): number | undefined {
        if (this.muted) return;

        const sound = AssetLoader.getSound(soundName);
        if (!sound) return;

        sound.loop(true);
        sound.volume((volume ?? 1) * this.effectsVolume);
        return sound.play();
    }

    /**
     * Stop a specific sound
     */
    public static stop(soundName: string, id?: number): void {
        const sound = AssetLoader.getSound(soundName);
        if (!sound) return;

        if (id !== undefined) {
            sound.stop(id);
        } else {
            sound.stop();
        }
    }

    /**
     * Fade out a sound
     */
    public static fadeOut(soundName: string, duration: number = 1000, id?: number): void {
        const sound = AssetLoader.getSound(soundName);
        if (!sound) return;

        sound.fade(sound.volume(), 0, duration, id);
        setTimeout(() => {
            if (id !== undefined) {
                sound.stop(id);
            } else {
                sound.stop();
            }
        }, duration);
    }

    /**
     * Play background music
     */
    public static playMusic(musicName: string): void {
        if (this.muted) return;

        // Stop current music
        if (this.currentMusic) {
            this.currentMusic.stop();
        }

        const music = AssetLoader.getSound(musicName);
        if (!music) return;

        music.loop(true);
        music.volume(this.musicVolume);
        music.play();
        this.currentMusic = music;
    }

    /**
     * Stop music
     */
    public static stopMusic(): void {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic = undefined;
        }
    }

    /**
     * Set music volume
     */
    public static setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('atomicSurvivalMusicVolume', this.musicVolume.toString());

        if (this.currentMusic) {
            this.currentMusic.volume(this.musicVolume);
        }
    }

    /**
     * Set effects volume
     */
    public static setEffectsVolume(volume: number): void {
        this.effectsVolume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('atomicSurvivalEffectsVolume', this.effectsVolume.toString());
    }

    /**
     * Toggle mute
     */
    public static toggleMute(): void {
        this.muted = !this.muted;
        localStorage.setItem('atomicSurvivalMuted', this.muted.toString());

        if (this.muted) {
            Howler.volume(0);
        } else {
            Howler.volume(1);
        }
    }

    /**
     * Set mute state
     */
    public static setMuted(muted: boolean): void {
        this.muted = muted;
        localStorage.setItem('atomicSurvivalMuted', this.muted.toString());

        if (this.muted) {
            Howler.volume(0);
        } else {
            Howler.volume(1);
        }
    }

    /**
     * Get mute state
     */
    public static isMuted(): boolean {
        return this.muted;
    }

    /**
     * Play random sound from list
     */
    public static playRandom(soundNames: string[], volume?: number): void {
        if (soundNames.length === 0) return;

        const randomIndex = Math.floor(Math.random() * soundNames.length);
        this.play(soundNames[randomIndex], volume);
    }

    /**
     * Play permanent weapon upgrade sound (different from temporary powerups)
     * Based on Ghidra analysis: permanent upgrades have different audio cues
     */
    public static playWeaponUpgrade(weaponLevel: number): void {
        if (weaponLevel <= 3) {
            this.play('weapon_upgrade_permanent', 0.8);
        } else {
            this.play('weapon_upgrade_permanent_high', 0.9);
        }
    }

    /**
     * Play temporary powerup sound (different from permanent upgrades)
     */
    public static playTempPowerup(powerupType: string): void {
        // Use original Heavy Weapon sound naming conventions
        const soundMap: { [key: string]: string } = {
            'gun_power': 'gunpowerup',
            'laser': 'laserpowerup',
            'shield': 'shieldup',
            'speed': 'speedup',
            'rapid': 'powerup',      // Generic powerup sound
            'spread': 'powerup',     // Generic powerup sound
            'nuke': 'nukeblast'
        };

        const soundName = soundMap[powerupType] || 'powerup';
        this.play(soundName, 0.7);
    }

    /**
     * Play shield activation sound (original Heavy Weapon naming)
     */
    public static playShieldUp(): void {
        this.play('shieldup', 0.8);
    }

    /**
     * Play shield deactivation sound (original Heavy Weapon naming)
     */
    public static playShieldDown(): void {
        this.play('shielddown', 0.8);
    }

    /**
     * Play shield deflection sound (bullet bouncing off shield)
     */
    public static playShieldDeflect(): void {
        // Play with slight pitch variation for dynamic feel
        const pitchVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const sound = AssetLoader.getSound('shield_deflect');
        if (sound) {
            sound.rate(pitchVariation);
            sound.volume(0.6 * this.effectsVolume);
            sound.play();
        }
    }

    /**
     * Preload sounds
     */
    public static preload(soundNames: string[]): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const soundName of soundNames) {
            const sound = AssetLoader.getSound(soundName);
            if (sound && sound.state() === 'unloaded') {
                promises.push(new Promise((resolve) => {
                    sound.once('load', () => resolve());
                    sound.load();
                }));
            }
        }

        return Promise.all(promises).then(() => {});
    }

    /**
     * Clean up all sounds
     */
    public static cleanup(): void {
        // Stop all sounds
        Howler.stop();

        // Clear references
        this.sounds.clear();
        this.currentMusic = undefined;
    }
}