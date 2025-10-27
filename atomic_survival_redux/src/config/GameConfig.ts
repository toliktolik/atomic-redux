/**
 * Game Configuration System
 * Flexible config loader that can load from multiple sources
 */

export interface GameConfig {
    // Core game settings
    display: DisplayConfig;
    physics: PhysicsConfig;
    audio: AudioConfig;

    // Gameplay systems
    difficulty: DifficultyConfig;
    weapons: WeaponConfig;
    powerups: PowerupConfig;
    scoring: ScoringConfig;

    // Wave system
    waves: WaveConfig;

    // Visual settings
    particles: ParticleConfig;

    // Technical limits
    limits: LimitsConfig;
}

export interface DisplayConfig {
    screenWidth: number;
    screenHeight: number;
    tankYPosition: number;
    tankMinX: number;
    tankMaxX: number;
    groundY: number;
    spawnZones: {
        airYMin: number;
        airYMax: number;
        groundY: number;
    };
    bounds: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
}

export interface PhysicsConfig {
    gravity: number;
    tankSpeed: number;
    tankAcceleration: number;
    tankDeceleration: number;
}

export interface AudioConfig {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
}

export interface DifficultyConfig {
    timeInterval: number;
    healthMultiplier: number;
    maxDifficultyLevel: number;
    maxEnemyHealth: number;
    speedIncreasePerWave: number;
    enemyCountIncrease: number;
    damageIncreasePerTenWaves: number;
}

export interface WeaponConfig {
    player: {
        [weaponName: string]: {
            damage: number;
            fireRate: number;
            projectileSpeed: number;
            ammo: number;
            spread: number;
            tracking?: boolean;
            piercing?: boolean;
            explosive?: boolean;
            projectileCount?: number;
            chainLightning?: boolean;
        };
    };
    enemy: {
        [weaponName: string]: {
            damage: number;
            speed: number;
            tracking?: boolean;
            health?: number;
            fragments?: number;
            blastRadius?: number;
            burstCount?: number;
        };
    };
}

export interface PowerupConfig {
    dropInterval: number;
    dropChances: {
        base: number;
        lowHealth: number;
        noWeapon: number;
        longSurvival: number;
        max: number;
    };
    durations: {
        shield: number;
        speedBoost: number;
        rapidFire: number;
        spreadShot: number;
        megaLaser: number;
    };
    megaLaser: {
        damagePerTick: number;
        tickRate: number;
        width: number;
        duration: number;
    };
    nuke: {
        damage: number;
        scoreMultiplier: number;
    };
}

export interface ScoringConfig {
    chainThreshold: number;
    chainMultiplier: number;
    accuracyThreshold: number;
    accuracyBonus: number;
    noDamageWaveBonus: number;
    speedKillTime: number;
    speedKillMultiplier: number;
    comboTimeout: number;
    comboMultipliers: number[];
}

export interface WaveConfig {
    timing: {
        minLength: number;
        maxLength: number;
        spawnIntervalEarly: number;
        spawnIntervalMid: number;
        spawnIntervalLate: number;
        betweenWaves: number;
    };
}

export interface ParticleConfig {
    maxParticles: number;
    maxProjectiles: number;
}

export interface LimitsConfig {
    maxEnemies: number;
    maxParticles: number;
    maxProjectiles: number;
}

export class GameConfigLoader {
    private static config: GameConfig | null = null;

    /**
     * Load game configuration from default values
     * Can be extended to load from JSON files, environment variables, etc.
     */
    public static async loadConfig(): Promise<GameConfig> {
        if (this.config !== null) {
            return this.config;
        }

        // Load default configuration
        // In the future, this could be loaded from JSON files or environment variables
        this.config = {
            display: {
                screenWidth: 640,
                screenHeight: 480,
                tankYPosition: 400,
                tankMinX: 50,
                tankMaxX: 590,
                groundY: 430,
                spawnZones: {
                    airYMin: 50,
                    airYMax: 200,
                    groundY: 380
                },
                bounds: {
                    left: -100,
                    right: 740,
                    top: -100,
                    bottom: 580
                }
            },

            physics: {
                gravity: 500,
                tankSpeed: 300,
                tankAcceleration: 1000,
                tankDeceleration: 2000
            },

            audio: {
                masterVolume: 0.7,
                sfxVolume: 0.8,
                musicVolume: 0.5
            },

            difficulty: {
                timeInterval: 12000,
                healthMultiplier: 7,
                maxDifficultyLevel: 14,
                maxEnemyHealth: 40,
                speedIncreasePerWave: 0.02,
                enemyCountIncrease: 2,
                damageIncreasePerTenWaves: 0.03
            },

            weapons: {
                player: {
                    STANDARD_GUN: {
                        damage: 10,
                        fireRate: 200,
                        projectileSpeed: 800,
                        ammo: Infinity,
                        spread: 0
                    },
                    HOMING_MISSILES: {
                        damage: 30,
                        fireRate: 400,
                        projectileSpeed: 600,
                        ammo: 40,
                        spread: 0,
                        tracking: true
                    },
                    LASER_CANNON: {
                        damage: 50,
                        fireRate: 100,
                        projectileSpeed: 1200,
                        ammo: 60,
                        spread: 0,
                        piercing: true
                    },
                    ROCKETS: {
                        damage: 75,
                        fireRate: 500,
                        projectileSpeed: 700,
                        ammo: 30,
                        spread: 15,
                        explosive: true
                    },
                    FLAK_CANNON: {
                        damage: 20,
                        fireRate: 150,
                        projectileSpeed: 900,
                        ammo: 50,
                        spread: 30,
                        projectileCount: 5
                    },
                    THUNDERSTRIKE: {
                        damage: 100,
                        fireRate: 600,
                        projectileSpeed: 1000,
                        ammo: 20,
                        spread: 0,
                        chainLightning: true
                    }
                },
                enemy: {
                    DUMB_BOMB: { damage: 10, speed: 200 },
                    LASER_GUIDED: { damage: 50, speed: 300, tracking: true },
                    ARMORED_BOMB: { damage: 100, speed: 150, health: 3 },
                    FRAG_BOMB: { damage: 75, speed: 200, fragments: 8 },
                    ATOMIC_BOMB: { damage: 200, speed: 100, blastRadius: 150 },
                    ENERGY_BALL: { damage: 25, speed: 400 },
                    BURSTING_ROCKET: { damage: 150, speed: 250, burstCount: 5 }
                }
            },

            powerups: {
                dropInterval: 15000,
                dropChances: {
                    base: 0.3,
                    lowHealth: 0.5,
                    noWeapon: 0.4,
                    longSurvival: 0.4,
                    max: 0.7
                },
                durations: {
                    shield: 10000,
                    speedBoost: 10000,
                    rapidFire: 8000,
                    spreadShot: 12000,
                    megaLaser: 3000
                },
                megaLaser: {
                    damagePerTick: 10,
                    tickRate: 100,
                    width: 80,
                    duration: 3000
                },
                nuke: {
                    damage: 999,
                    scoreMultiplier: 0.5
                }
            },

            scoring: {
                chainThreshold: 3,
                chainMultiplier: 1.5,
                accuracyThreshold: 0.8,
                accuracyBonus: 500,
                noDamageWaveBonus: 1000,
                speedKillTime: 500,
                speedKillMultiplier: 2.0,
                comboTimeout: 2000,
                comboMultipliers: [1, 1.2, 1.5, 2.0, 2.5, 3.0]
            },

            waves: {
                timing: {
                    minLength: 1000,
                    maxLength: 2900,
                    spawnIntervalEarly: 1500,
                    spawnIntervalMid: 1000,
                    spawnIntervalLate: 500,
                    betweenWaves: 2000
                }
            },

            particles: {
                maxParticles: 500,
                maxProjectiles: 100
            },

            limits: {
                maxEnemies: 50,
                maxParticles: 500,
                maxProjectiles: 100
            }
        };

        console.log('✅ Game configuration loaded with', Object.keys(this.config).length, 'sections');
        return this.config;
    }

    /**
     * Get a specific config section
     */
    public static async getDisplayConfig(): Promise<DisplayConfig> {
        const config = await this.loadConfig();
        return config.display;
    }

    public static async getPhysicsConfig(): Promise<PhysicsConfig> {
        const config = await this.loadConfig();
        return config.physics;
    }

    public static async getWeaponConfig(): Promise<WeaponConfig> {
        const config = await this.loadConfig();
        return config.weapons;
    }

    public static async getDifficultyConfig(): Promise<DifficultyConfig> {
        const config = await this.loadConfig();
        return config.difficulty;
    }

    // Add more getters as needed...

    /**
     * Future enhancement: Load config from external files
     */
    public static async loadFromFile(configPath: string): Promise<GameConfig> {
        // TODO: Implement JSON config file loading
        // This would allow runtime configuration changes without recompilation
        throw new Error('File-based config loading not yet implemented');
    }

    /**
     * Future enhancement: Save current config to file
     */
    public static async saveToFile(configPath: string): Promise<void> {
        // TODO: Implement config saving
        throw new Error('Config saving not yet implemented');
    }
}