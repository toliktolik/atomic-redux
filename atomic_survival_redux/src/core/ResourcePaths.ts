/**
 * Resource Paths - Centralized paths for all game resources
 * Maps to actual Heavy Weapon assets via symbolic links in public/
 */

export const ResourcePaths = {
    // Base paths
    BASE_PATH: '/HeavyWeapon/',
    DATA_PATH: '/HeavyWeapon/data/',
    IMAGES_PATH: '/HeavyWeapon/Images/',
    SOUNDS_PATH: '/HeavyWeapon/Sounds/',
    MUSIC_PATH: '/HeavyWeapon/Music/',
    FONTS_PATH: '/HeavyWeapon/Fonts/',

    // XML data files
    XML: {
        CRAFT: '/HeavyWeapon/data/craft.xml',
        WAVES: '/HeavyWeapon/data/waves.xml',
        BOSSES: '/HeavyWeapon/data/bosses.xml',
        LEVELS: '/HeavyWeapon/data/levels.xml',
        CREDITS: '/HeavyWeapon/data/credits.xml',
        SURVIVAL: (level: number) => `/HeavyWeapon/data/survival${level}.xml`
    },

    // Image assets
    IMAGES: {
        // Tank sprites
        TANK_BODY: '/HeavyWeapon/Images/TankBody.png',
        TANK_TURRET: '/HeavyWeapon/Images/TankTurret.png',
        TANK_TRACKS: '/HeavyWeapon/Images/TankTracks.png',

        // Enemy sprites (from Images directory)
        ENEMIES: {
            PROPFIGHTER: '/HeavyWeapon/Images/PropFighter.png',
            SMALLJET: '/HeavyWeapon/Images/SmallJet.png',
            BOMBER: '/HeavyWeapon/Images/Bomber.png',
            JETFIGHTER: '/HeavyWeapon/Images/JetFighter.png',
            TRUCK: '/HeavyWeapon/Images/Truck.png',
            SMALLCOPTER: '/HeavyWeapon/Images/SmallCopter.png',
            BIGBOMBER: '/HeavyWeapon/Images/BigBomber.png',
            MEDCOPTER: '/HeavyWeapon/Images/MedCopter.png',
            BIGCOPTER: '/HeavyWeapon/Images/BigCopter.png',
            FATBOMBER: '/HeavyWeapon/Images/FatBomber.png',
            SATELLITE: '/HeavyWeapon/Images/Satellite.png',
            BLIMP: '/HeavyWeapon/Images/Blimp.png',
            CRUISE: '/HeavyWeapon/Images/Cruise.png'
        },

        // Projectile sprites
        PROJECTILES: {
            BULLET: '/HeavyWeapon/Images/Bullet.png',
            MISSILE: '/HeavyWeapon/Images/Missile.png',
            LASER: '/HeavyWeapon/Images/Laser.png',
            ROCKET: '/HeavyWeapon/Images/Rocket.png',
            BOMB: '/HeavyWeapon/Images/Bomb.png',
            ENERGY_BALL: '/HeavyWeapon/Images/EnergyBall.png'
        },

        // Power-up sprites
        POWERUPS: {
            WEAPON: '/HeavyWeapon/Images/PowerUpWeapon.png',
            SHIELD: '/HeavyWeapon/Images/PowerUpShield.png',
            NUKE: '/HeavyWeapon/Images/PowerUpNuke.png',
            HEALTH: '/HeavyWeapon/Images/PowerUpHealth.png',
            SPEED: '/HeavyWeapon/Images/PowerUpSpeed.png',
            RAPID: '/HeavyWeapon/Images/PowerUpRapid.png',
            SPREAD: '/HeavyWeapon/Images/PowerUpSpread.png'
        },

        // Effects
        EFFECTS: {
            EXPLOSION1: '/HeavyWeapon/Images/Explosion1.png',
            EXPLOSION2: '/HeavyWeapon/Images/Explosion2.png',
            SMOKE: '/HeavyWeapon/Images/Smoke.png',
            MUZZLE_FLASH: '/HeavyWeapon/Images/MuzzleFlash.png'
        },

        // UI elements
        UI: {
            HEALTH_BAR: '/HeavyWeapon/Images/HealthBar.png',
            AMMO_ICON: '/HeavyWeapon/Images/AmmoIcon.png'
        },

        // Background layers (from survival directory)
        BACKGROUNDS: {
            SKY: '/HeavyWeapon/Images/survival/sky.jpg',
            FAR_BG: '/HeavyWeapon/Images/survival/farbg.jpg',
            BG: '/HeavyWeapon/Images/survival/bg.jpg',
            GROUND: '/HeavyWeapon/Images/survival/ground.jpg'
        }
    },

    // Sound effects
    SOUNDS: {
        // Tank sounds
        TANK_FIRE: '/HeavyWeapon/Sounds/TankFire.ogg',
        TANK_HIT: '/HeavyWeapon/Sounds/TankHit.ogg',
        TANK_DESTROYED: '/HeavyWeapon/Sounds/TankDestroyed.ogg',
        TANK_ENGINE: '/HeavyWeapon/Sounds/TankEngine.ogg',

        // Enemy sounds
        ENEMY_DESTROYED: '/HeavyWeapon/Sounds/EnemyDestroyed.ogg',
        ENEMY_HIT: '/HeavyWeapon/Sounds/EnemyHit.ogg',

        // Weapon sounds
        MISSILE_LAUNCH: '/HeavyWeapon/Sounds/MissileLaunch.ogg',
        LASER_FIRE: '/HeavyWeapon/Sounds/LaserFire.ogg',
        ROCKET_LAUNCH: '/HeavyWeapon/Sounds/RocketLaunch.ogg',
        FLAK_FIRE: '/HeavyWeapon/Sounds/FlakFire.ogg',
        THUNDER_STRIKE: '/HeavyWeapon/Sounds/ThunderStrike.ogg',

        // Explosion sounds
        EXPLOSION_SMALL: '/HeavyWeapon/Sounds/ExplosionSmall.ogg',
        EXPLOSION_MEDIUM: '/HeavyWeapon/Sounds/ExplosionMedium.ogg',
        EXPLOSION_LARGE: '/HeavyWeapon/Sounds/ExplosionLarge.ogg',

        // Power-up sounds
        POWERUP_COLLECT: '/HeavyWeapon/Sounds/PowerUp.ogg',
        SHIELD_ACTIVATE: '/HeavyWeapon/Sounds/ShieldActivate.ogg',
        NUKE: '/HeavyWeapon/Sounds/Nuke.ogg',
        MEGA_LASER: '/HeavyWeapon/Sounds/MegaLaser.ogg',

        // UI sounds
        WARNING: '/HeavyWeapon/Sounds/Warning.ogg',
        WAVE_COMPLETE: '/HeavyWeapon/Sounds/WaveComplete.ogg'
    },

    // Music tracks
    MUSIC: {
        MENU: '/HeavyWeapon/Music/Menu.ogg',
        BATTLE: '/HeavyWeapon/Music/Battle.ogg',
        BOSS: '/HeavyWeapon/Music/Boss.ogg',
        VICTORY: '/HeavyWeapon/Music/Victory.ogg',
        DEFEAT: '/HeavyWeapon/Music/Defeat.ogg'
    },

    // Font files
    FONTS: {
        MAIN: '/HeavyWeapon/Fonts/HeavyWeapon.ttf'
    }
};

/**
 * Helper to check if a resource exists
 */
export async function resourceExists(path: string): Promise<boolean> {
    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get the correct resource path with fallback
 */
export async function getResourcePath(primaryPath: string, fallbackPath?: string): Promise<string> {
    if (await resourceExists(primaryPath)) {
        return primaryPath;
    }
    if (fallbackPath && await resourceExists(fallbackPath)) {
        console.warn(`Primary resource not found: ${primaryPath}, using fallback`);
        return fallbackPath;
    }
    console.warn(`Resource not found: ${primaryPath}`);
    return primaryPath; // Return primary path anyway, let caller handle the error
}