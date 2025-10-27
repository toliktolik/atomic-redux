/**
 * Game Constants - All configuration values in one place
 * Based on original Heavy Weapon Deluxe survival mode values
 */

export const GameConstants = {
    // Screen dimensions - VERIFIED FROM ORIGINAL HEAVY WEAPON: 640x480 (0x280 x 0x1e0)
    SCREEN_WIDTH: 640,
    SCREEN_HEIGHT: 480,

    // Tank configuration - AUTHENTIC Heavy Weapon dimensions from screenshot analysis
    TANK_Y_POSITION: 430, // CORRECTED: Tank sits ON ground level (480-50=430)
    TANK_MIN_X: 50,
    TANK_MAX_X: 590,
    TANK_SPEED: 300,
    TANK_ACCELERATION: 1000,
    TANK_DECELERATION: 2000,
    TANK_MAX_HEALTH: 100,
    TANK_WIDTH: 48,  // CORRECTED: Much smaller like original (was 60)
    TANK_HEIGHT: 32, // CORRECTED: Much smaller like original (was 40)

    // NOTE: Enemy armor, points, and speeds are now loaded directly from craft.xml via CraftDataLoader

    // Enemy weapons (damage values from original)
    ENEMY_WEAPONS: {
        DUMB_BOMB: { damage: 10, speed: 200 },
        LASER_GUIDED: { damage: 50, speed: 300, tracking: true },
        ARMORED_BOMB: { damage: 100, speed: 150, health: 3 },
        FRAG_BOMB: { damage: 75, speed: 200, fragments: 8 },
        ATOMIC_BOMB: { damage: 200, speed: 100, blastRadius: 150 },
        ENERGY_BALL: { damage: 25, speed: 400 },
        BURSTING_ROCKET: { damage: 150, speed: 250, burstCount: 5 }
    },

    // Player weapons
    PLAYER_WEAPONS: {
        STANDARD_GUN: {
            damage: 10,
            fireRate: 200, // ms
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

    // Wave system
    WAVE_TIMING: {
        MIN_LENGTH: 1000, // ms
        MAX_LENGTH: 2900, // ms
        SPAWN_INTERVAL_EARLY: 1500, // ms
        SPAWN_INTERVAL_MID: 1000, // ms
        SPAWN_INTERVAL_LATE: 500, // ms
        BETWEEN_WAVES: 2000 // ms
    },

    // Difficulty progression
    DIFFICULTY: {
        TIME_INTERVAL: 12000, // Difficulty increases every 12 seconds
        HEALTH_MULTIPLIER: 7, // health = (level + 1) * 7
        MAX_DIFFICULTY_LEVEL: 14,
        MAX_ENEMY_HEALTH: 40,
        SPEED_INCREASE_PER_WAVE: 0.02, // 2% per wave
        ENEMY_COUNT_INCREASE: 2, // Every 5 waves
        DAMAGE_INCREASE_PER_10_WAVES: 0.03 // 3%
    },

    // Power-ups
    POWERUPS: {
        DROP_INTERVAL: 15000, // ms
        DROP_CHANCE_BASE: 0.3,
        DROP_CHANCE_LOW_HEALTH: 0.5,
        DROP_CHANCE_NO_WEAPON: 0.4,
        DROP_CHANCE_LONG_SURVIVAL: 0.4,
        DROP_CHANCE_MAX: 0.7,

        // Power-up durations
        SHIELD_DURATION: 10000,
        SPEED_BOOST_DURATION: 10000,
        RAPID_FIRE_DURATION: 8000,
        SPREAD_SHOT_DURATION: 12000,
        MEGA_LASER_DURATION: 3000
    },

    // Special weapons
    MEGA_LASER: {
        DAMAGE_PER_TICK: 10,
        TICK_RATE: 100, // ms
        WIDTH: 80,
        DURATION: 3000
    },

    NUKE: {
        DAMAGE: 999,
        SCORE_MULTIPLIER: 0.5 // Half points for nuked enemies
    },

    // Scoring
    SCORING: {
        CHAIN_THRESHOLD: 3, // Kills within 1 second
        CHAIN_MULTIPLIER: 1.5,
        ACCURACY_THRESHOLD: 0.8,
        ACCURACY_BONUS: 500,
        NO_DAMAGE_WAVE_BONUS: 1000,
        SPEED_KILL_TIME: 500, // ms
        SPEED_KILL_MULTIPLIER: 2.0,
        COMBO_TIMEOUT: 2000, // ms
        COMBO_MULTIPLIERS: [1, 1.2, 1.5, 2.0, 2.5, 3.0]
    },

    // Particle limits
    MAX_PARTICLES: 500,
    MAX_PROJECTILES: 100,
    MAX_ENEMIES: 50,

    // Audio volumes
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.8,
        MUSIC_VOLUME: 0.5
    },

    // Enemy spawn zones - Adjusted for 640x480 resolution
    SPAWN_ZONES: {
        AIR_Y_MIN: 50,
        AIR_Y_MAX: 200, // Original: 300 for 720p → 200 for 480p
        GROUND_Y: 380   // Original: 550 for 720p → 380 for 480p
    },

    // Bounds for cleanup - Adjusted for 640x480 resolution
    BOUNDS: {
        LEFT: -100,
        RIGHT: 740,  // Original: 1380 for 1280w → 740 for 640w
        TOP: -100,
        BOTTOM: 580  // Original: 820 for 720p → 580 for 480p
    },

    // Physics constants
    PHYSICS: {
        GRAVITY: 500  // Pixels per second squared
    },

    // Ground level - Adjusted for 640x480 resolution
    GROUND_Y: 430 // Original: 650 for 720p → 430 for 480p
};