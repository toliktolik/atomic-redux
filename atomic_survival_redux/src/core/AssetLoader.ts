/**
 * Asset Loader - Manages loading and caching of game assets
 */

import * as PIXI from 'pixi.js';
import { Howl } from 'howler';
import { XMLDataLoader, CraftData, LevelWaves, BossData } from './XMLDataLoader';
import { AnimatedSprite } from './AnimatedSprite';
import { RotationSprite } from './RotationSprite';
import { DirectionalSprite } from './DirectionalSprite';
import { AnimationConfig } from '../config/AnimationConfig';

export class AssetLoader {
    private static textures: Map<string, PIXI.Texture> = new Map();
    private static sounds: Map<string, Howl> = new Map();
    private static loaded: boolean = false;

    // XML data storage
    private static craftData: Map<string, CraftData> = new Map();
    private static waveData: LevelWaves[] = [];
    private static bossData: Map<string, BossData> = new Map();
    private static survivalData: Map<number, LevelWaves[]> = new Map();

    /**
     * Initialize PIXI settings
     */
    public static initialize(): void {
        // Set default scale mode for pixel art
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
        PIXI.settings.ROUND_PIXELS = true;
        PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.OFF;
    }

    /**
     * Load all game assets
     */
    public static async loadAll(): Promise<void> {
        if (this.loaded) return;

        // Load XML data files first
        await this.loadXMLData();

        // Load textures (actual images or placeholders)
        await this.loadTextures();

        // Load sounds from XML mapping
        await this.loadSounds();

        this.loaded = true;
    }

    /**
     * Load XML data files
     */
    private static async loadXMLData(): Promise<void> {
        try {
            // Try to load from actual XML files if they exist
            // Use relative paths that work with the web server
            const basePath = '/HeavyWeapon/data/';

            // Load craft data - REQUIRED for game to function
            this.craftData = await XMLDataLoader.loadCraftData(basePath + 'craft.xml');
            console.log(`Loaded ${this.craftData.size} craft types from XML`);

            // Load wave data - REQUIRED for game to function
            this.waveData = await XMLDataLoader.loadWaveData(basePath + 'waves.xml');
            console.log(`Loaded ${this.waveData.length} levels of waves from XML`);

            // Load boss data
            try {
                this.bossData = await XMLDataLoader.loadBossData(basePath + 'bosses.xml');
                console.log(`Loaded ${this.bossData.size} boss types from XML`);
            } catch (error) {
                console.warn('Failed to load bosses.xml, continuing without boss data');
            }

            // Load survival mode data (0-9)
            for (let i = 0; i <= 9; i++) {
                try {
                    const survivalWaves = await XMLDataLoader.loadSurvivalData(
                        `${basePath}survival${i}.xml`
                    );
                    this.survivalData.set(i, survivalWaves);
                    console.log(`Loaded survival mode ${i} data`);
                } catch (error) {
                    console.warn(`Failed to load survival${i}.xml`);
                }
            }
        } catch (error) {
            console.error('Error loading XML data:', error);
            console.warn('Using fallback defaults - some features may not work correctly');
        }
    }

    /**
     * Load textures from actual game files or create placeholders
     */
    private static async loadTextures(): Promise<void> {
        // Try to load actual textures first
        const textureMap = {
            // Tank
            'tank': '/HeavyWeapon/Images/tank.png', // Main tank sprite
            'tank_body': '/HeavyWeapon/Images/tank.png',
            'gun': '/HeavyWeapon/Images/gun.png', // 21-frame gun rotation sprite
            'tank_turret': '/HeavyWeapon/Images/tank.png', // Fallback turret
            'tank_shadow': '/HeavyWeapon/Images/tankshadow.png',

            // Enemies - load from craft data if available
            'propfighter': '/HeavyWeapon/Images/propfighter.png',
            'smalljet': '/HeavyWeapon/Images/smalljet.png',
            'bomber': '/HeavyWeapon/Images/bomber.png',
            'jetfighter': '/HeavyWeapon/Images/jetfighter.png',
            'truck': '/HeavyWeapon/Images/truck.png',
            'smallcopter': '/HeavyWeapon/Images/smallcopter.png',
            'bigbomber': '/HeavyWeapon/Images/bigbomber.png',
            'medcopter': '/HeavyWeapon/Images/medcopter.png',
            'bigcopter': '/HeavyWeapon/Images/bigcopter.png',
            'fatbomber': '/HeavyWeapon/Images/fatbomber.png',
            'deltabomber': '/HeavyWeapon/Images/deltabomber.png',
            'deltajet': '/HeavyWeapon/Images/deltajet.png',
            'satellite': '/HeavyWeapon/Images/satellite.png',
            'blimp': '/HeavyWeapon/Images/blimp.png',
            'superbomber': '/HeavyWeapon/Images/superbomber.png',
            'bigmissile': '/HeavyWeapon/Images/bigmissile.png',
            'strafer': '/HeavyWeapon/Images/strafer.png',
            'enemytank': '/HeavyWeapon/Images/enemytank.png',
            'dozer': '/HeavyWeapon/Images/dozer.png',
            'deflector': '/HeavyWeapon/Images/deflector.png',
            'cruise': '/HeavyWeapon/Images/cruise.png',

            // Projectiles - using actual names from game binary (found via Ghidra)
            'bullets': '/HeavyWeapon/Images/bullets.png',  // Original game uses "bullets" not "bullet"
            'dumbbomb': '/HeavyWeapon/Images/dumbbomb.png',  // Original game uses "dumbbomb" not "bomb"
            'lgb': '/HeavyWeapon/Images/lgb.png',  // Laser-guided bombs (red)
            'fragbomb': '/HeavyWeapon/Images/fragbomb.png',  // Fragment bombs (yellow)
            'ironbomb': '/HeavyWeapon/Images/ironbomb.png',  // Armored bombs (dark grey)
            'bombfrag': '/HeavyWeapon/Images/bombfrag.png',  // Bomb fragments
            'missile': '/HeavyWeapon/Images/missile.png',
            'laser': '/HeavyWeapon/Images/beam.png',
            'rocket': '/HeavyWeapon/Images/rocket.png',

            // Effects
            'explosion': '/HeavyWeapon/Images/explosion.png',
            'smoke': '/HeavyWeapon/Images/smoke.png',
            'shield': '/HeavyWeapon/Images/shield.png',
            'muzzle_flash': '/HeavyWeapon/Images/tankflash.png',

            // Ally helicopter assets (from Ghidra pupcopter function mappings)
            'pupcopter': '/HeavyWeapon/Images/pupcopter.png',
            'puprotor': '/HeavyWeapon/Images/puprotor.png',

            // Power-up sprite sheet (13-frame sprite sheet from HeavyWeapon_Asset_Hints_v2.xml)
            'powerups': '/HeavyWeapon/Images/powerups.png'
        };

        // Try to load each texture
        for (const [name, path] of Object.entries(textureMap)) {
            try {
                const texture = await PIXI.Texture.fromURL(path);
                this.textures.set(name, texture);
                // Add to PIXI's global cache
                PIXI.Texture.addToCache(texture, name);
                // Texture loaded successfully
            } catch (error) {
                console.warn(`Failed to load texture ${name} from ${path}, creating placeholder`);
                // Will create placeholder below
            }
        }

        // Create placeholders for any missing textures
        this.createPlaceholderTextures();
    }

    /**
     * Create placeholder textures for missing assets
     */
    private static createPlaceholderTextures(): void {
        // Only create placeholders for textures that weren't loaded
        if (!this.textures.has('tank_body')) {
            this.createColorTexture('tank_body', 50, 40, 0x4a7c59);
        }
        if (!this.textures.has('tank_turret')) {
            this.createColorTexture('tank_turret', 8, 30, 0x2d4a37);
        }

        // Create enemy textures from XML craft data
        this.createTexturesFromCraftData();

        // Create projectile textures
        this.createProjectileTextures();

        // Power-up textures from 13-frame sprite sheet (HeavyWeapon_Asset_Hints_v2.xml)
        this.createPowerupTextures();

        // Create essential UI textures
        this.createUITextures();
    }

    /**
     * Create enemy textures from craft XML data
     */
    private static createTexturesFromCraftData(): void {
        // Enemy color mapping based on craft types from XML
        const craftColorMap: Record<string, number> = {
            'PROPFIGHTER': 0xff4444,    // Red fighter
            'SMALLJET': 0xff6666,       // Light red jet
            'BOMBER': 0xcc2222,         // Dark red bomber
            'JETFIGHTER': 0xff8844,     // Orange jet fighter
            'TRUCK': 0x884444,          // Brown truck
            'BIGBOMBER': 0xaa2222,      // Dark bomber
            'SMALLCOPTER': 0xaa4444,    // Red helicopter
            'MEDCOPTER': 0x995555,      // Medium helicopter
            'BIGCOPTER': 0x883333,      // Large helicopter
            'DELTABOMBER': 0xcc4422,    // Delta wing bomber
            'DELTAJET': 0xff6644,       // Delta wing jet
            'BIGMISSILE': 0x666666,     // Gray missile
            'SUPERBOMBER': 0x882222,    // Super bomber
            'FATBOMBER': 0x994444,      // Fat bomber
            'BLIMP': 0xaaaaaa,          // Gray blimp
            'SATELLITE': 0xcccccc,      // Light gray satellite
            'STRAFER': 0xff5555,        // Strafing fighter
            'ENEMYTANK': 0x444488,      // Blue enemy tank
            'DOZER': 0x888844,          // Olive bulldozer
            'DEFLECTOR': 0x00ffff,      // Cyan deflector
            'CRUISE': 0x4444ff          // Blue cruise missile
        };

        // Default dimensions based on craft type
        const craftDimensions: Record<string, [number, number]> = {
            'PROPFIGHTER': [40, 30],
            'SMALLJET': [45, 25],
            'BOMBER': [60, 40],
            'JETFIGHTER': [50, 30],
            'TRUCK': [40, 30],
            'BIGBOMBER': [70, 50],
            'SMALLCOPTER': [45, 35],
            'MEDCOPTER': [50, 40],
            'BIGCOPTER': [60, 45],
            'DELTABOMBER': [65, 35],
            'DELTAJET': [55, 30],
            'BIGMISSILE': [20, 50],
            'SUPERBOMBER': [80, 60],
            'FATBOMBER': [75, 55],
            'BLIMP': [100, 60],
            'SATELLITE': [45, 45],
            'STRAFER': [50, 25],
            'ENEMYTANK': [50, 35],
            'DOZER': [60, 40],
            'DEFLECTOR': [55, 40],
            'CRUISE': [25, 60]
        };

        // Create textures for all craft types from loaded XML data
        this.craftData.forEach((craftData, craftName) => {
            const textureName = craftName.toLowerCase();
            if (!this.textures.has(textureName)) {
                const color = craftColorMap[craftName] || 0xff0000; // Default to red
                const [width, height] = craftDimensions[craftName] || [40, 30]; // Default size
                this.createColorTexture(textureName, width, height, color);
            }
        });
    }

    /**
     * Create projectile textures
     */
    private static createProjectileTextures(): void {
        const projectileData = [
            ['bullets', 4, 8, 0xffff00],     // Yellow bullets
            ['dumbbomb', 12, 16, 0x666666],  // Gray bomb
            ['lgb', 14, 18, 0xff0000],       // Red laser-guided bombs
            ['fragbomb', 13, 17, 0xffff00],  // Yellow fragment bombs
            ['ironbomb', 15, 19, 0x444444],  // Dark grey armored bombs
            ['bombfrag', 6, 6, 0xffa500],    // Orange bomb fragments
            ['missile', 6, 12, 0xff8800],    // Orange missile
            ['laser', 4, 20, 0x00ffff],      // Cyan laser
            ['rocket', 8, 16, 0xffaa00],     // Orange rocket
            ['energy_ball', 10, 10, 0x00ff00] // Green energy ball
        ];

        for (const [name, width, height, color] of projectileData) {
            if (!this.textures.has(name as string)) {
                this.createColorTexture(name as string, width as number, height as number, color as number);
            }
        }
    }

    /**
     * Create essential UI textures
     */
    private static createUITextures(): void {
        const uiData = [
            ['explosion', 64, 64, 0xff8800],
            ['smoke', 32, 32, 0x666666],
            ['shield', 80, 80, 0x00ffff],
            ['ally_helicopter', 60, 40, 0x00aa00],
            ['health_bar', 100, 10, 0x00ff00],
            ['ammo_icon', 20, 20, 0xffff00],
            ['pupcopter', 60, 40, 0xffffff],     // White ally helicopter
            ['puprotor', 30, 30, 0xcccccc]      // Gray rotor blades
        ];

        for (const [name, width, height, color] of uiData) {
            if (!this.textures.has(name as string)) {
                this.createColorTexture(name as string, width as number, height as number, color as number);
            }
        }
    }

    /**
     * Create a simple colored rectangle texture
     */
    private static createColorTexture(name: string, width: number, height: number, color: number): void {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d')!;
        // Convert hex color to rgb
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, width, height);

        const texture = PIXI.Texture.from(canvas);
        this.textures.set(name, texture);

        // Also add to PIXI's global cache
        PIXI.Texture.addToCache(texture, name);
    }

    /**
     * Load sound effects from Heavy Weapon sound files using XML mapping
     */
    private static async loadSounds(): Promise<void> {
        try {
            console.log('🔊 Loading sounds from XML...');
            const soundMap = await this.loadSoundMappingFromXML();
            console.log(`🔊 Loaded ${Object.keys(soundMap).length} sounds from XML`);
            this.loadSoundsFromMap(soundMap);
        } catch (error) {
            console.error('🔊 CRITICAL ERROR: Failed to load sound mapping from XML - game requires proper XML mapping!', error);
            throw new Error('Sound system requires HeavyWeapon_Sound_System_Mapping.xml - fallback maps have been removed');
        }
    }

    /**
     * Load sound mapping from HeavyWeapon_Sound_System_Mapping.xml
     */
    private static async loadSoundMappingFromXML(): Promise<Record<string, string>> {
        const response = await fetch('/HeavyWeapon_Sound_System_Mapping.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const soundMap: Record<string, string> = {};
        const basePath = '/HeavyWeapon/Sounds/';

        // Extract metadata for base path
        const metadataBasePath = xmlDoc.querySelector('Metadata BasePath')?.textContent;
        const finalBasePath = metadataBasePath ? `/${metadataBasePath}` : basePath;

        // Parse all sound elements
        const soundElements = xmlDoc.querySelectorAll('Sound');

        soundElements.forEach(soundEl => {
            const file = soundEl.getAttribute('file');
            const event = soundEl.getAttribute('event');

            if (file && event) {
                // Convert event names to our code's sound names
                const soundName = this.convertEventToSoundName(event);
                soundMap[soundName] = finalBasePath + file;
            }
        });

        // Add essential sounds that our code needs but may not be explicitly in XML events
        const additionalSounds = {
            'tank_fire_0': finalBasePath + 'tankfire.ogg',  // Alias for base tank fire
            'powerup_drop': finalBasePath + 'powerup.ogg',
            'spread_shot': finalBasePath + 'powerup.ogg',
            'rapid_fire': finalBasePath + 'upgrade.ogg',
            'powerup_land': finalBasePath + 'powerup.ogg',
            'shield_deflect': finalBasePath + 'deflect.ogg',  // Shield deflecting bullets
            'weapon_upgrade_permanent': finalBasePath + 'upgrade.ogg',
            'weapon_upgrade_permanent_high': finalBasePath + 'upgrade.ogg'
        };

        // Add missing sounds
        Object.entries(additionalSounds).forEach(([name, path]) => {
            if (!soundMap[name]) {
                soundMap[name] = path;
            }
        });

        console.log(`Loaded ${Object.keys(soundMap).length} sounds from XML mapping`);
        return soundMap;
    }

    /**
     * Convert XML event names to our code's sound names
     */
    private static convertEventToSoundName(event: string): string {
        // Map XML events to the sound names expected by the game code
        const eventMappings: Record<string, string> = {
            // Tank weapon sounds
            'StandardGun': 'tank_fire',
            'GunLevel1': 'tank_fire_1',
            'GunLevel2': 'tank_fire_2',
            'GunLevel3': 'tank_fire_3',
            'GunLevel4': 'tank_fire_4',

            // Explosions
            'SmallExplosion': 'enemy_destroyed',
            'TankExplosion': 'tank_destroyed',
            'LargeExplosion': 'explosion',
            'NukeExplosion': 'nuke',

            // Impacts
            'BulletHit': 'tank_hit',
            'OrbHit': 'orbhit',

            // Power-ups
            'GenericPowerUp': 'powerup',
            'GunPowerUp': 'gunpowerup',
            'LaserPowerUp': 'laserpowerup',
            'ShieldActivate': 'shieldup',
            'ShieldDeactivate': 'shielddown',
            'SpeedBoost': 'speedup',
            'MegaLaserActive': 'megalaser',
            'WeaponUpgrade': 'upgrade',

            // Weapons
            'LaserWeapon': 'laser',
            'TankLaser': 'tanklaser',
            'HomingMissile': 'missile',
            'SmallMissile': 'smallmissile',
            'FlakCannon': 'flak',
            'Thunderstrike': 'thunder',

            // Enemy sounds
            'EnemyShoot': 'enemyfire',
            'EnemyTankFire': 'enemytankgun',
            'BombDrop': 'bombfall',
            'JetDive': 'jetdive',
            'TankEngine': 'diesel',
            'BulletDeflect': 'deflect',
            'SatelliteLaser': 'satlaser',

            // Helicopter
            'AllyHelicopter': 'pupcopter',

            // Voice
            'GetReady': 'v_getready',
            'Prepare': 'v_prepare',
            'Danger': 'v_danger',
            'LevelComplete': 'v_levelcomplete',
            'GameOver': 'v_gameover',
            'MegaLaserVoice': 'v_megalaser',
            'AtomicTank': 'v_atomictank',

            // UI
            'ButtonPress': 'buttondown',
            'ButtonRelease': 'buttonup',
            'ActionDenied': 'denied',
            'StatUpdate': 'statbeep',
            'StatsScreen': 'stats',
            'MapHover': 'mapover',

            // Environmental
            'AirRaidSiren': 'airraid',
            'DangerAlert': 'alert',
            'ElectricalSpark': 'sparking',
            'ElectricalShort': 'shorting',
            'MeteorFall': 'meteor'
        };

        return eventMappings[event] || event.toLowerCase();
    }


    /**
     * Load sounds from a sound mapping
     */
    private static loadSoundsFromMap(soundMap: Record<string, string>): void {
        // Load each sound file
        Object.entries(soundMap).forEach(([name, path]) => {
            try {
                this.sounds.set(name, new Howl({
                    src: [path],
                    volume: 0.5,
                    onloaderror: (id, error) => {
                        console.warn(`Failed to load sound ${name} from ${path}:`, error);
                    },
                    onload: () => {
                        // Sound loaded successfully
                    }
                }));
            } catch (error) {
                console.error(`Error creating sound ${name}:`, error);
            }
        });
    }

    /**
     * Get a texture by name
     */
    public static getTexture(name: string): PIXI.Texture {
        // Map our code's texture names to original game's texture names
        const nameMapping: { [key: string]: string } = {
            'bullet': 'bullets',      // Our code uses 'bullet', game uses 'bullets'
            'bomb': 'dumbbomb',       // Our code uses 'bomb', game uses 'dumbbomb'
        };

        const actualName = nameMapping[name] || name;
        const texture = this.textures.get(actualName);

        if (!texture) {
            console.warn(`Texture '${actualName}' not found, using placeholder`);
            // Return a default error texture
            if (!this.textures.has('error')) {
                this.createColorTexture('error', 32, 32, 0xff00ff);
            }
            return this.textures.get('error')!;
        }
        return texture;
    }

    /**
     * Create animated sprite from sprite strip
     */
    public static createAnimatedSprite(name: string): AnimatedSprite | null {
        const texture = this.getTexture(name);
        if (!texture || !texture.baseTexture) {
            console.error(`Failed to get texture for: ${name}`);
            return null;
        }

        const config = AnimationConfig[name];
        if (!config) {
            console.warn(`No animation config found for: ${name}, using single frame`);
            return new AnimatedSprite(texture.baseTexture, 1, 100, false);
        }

        return new AnimatedSprite(
            texture.baseTexture,
            config.frameCount,
            config.frameRate,
            config.loop
        );
    }

    /**
     * Create rotation sprite for angle-based frame selection (like gun.png)
     */
    public static createRotationSprite(name: string): RotationSprite | null {
        const texture = this.getTexture(name);
        if (!texture || !texture.baseTexture) {
            console.error(`Failed to get texture for: ${name}`);
            return null;
        }

        const config = AnimationConfig[name];
        if (!config) {
            console.warn(`No animation config found for: ${name}, assuming single frame`);
            return new RotationSprite(texture.baseTexture, 1, 1);
        }

        return new RotationSprite(texture.baseTexture, config.frameCount, config.rowCount || 1);
    }

    /**
     * Create directional sprite for multi-row grids (like bullets.png)
     */
    public static createDirectionalSprite(name: string): DirectionalSprite | null {
        const texture = this.getTexture(name);
        if (!texture || !texture.baseTexture) {
            console.error(`Failed to get texture for: ${name}`);
            return null;
        }

        const config = AnimationConfig[name];
        if (!config) {
            console.warn(`No animation config found for: ${name}, assuming single frame grid`);
            return new DirectionalSprite(texture.baseTexture, 1, 1);
        }

        return new DirectionalSprite(
            texture.baseTexture,
            config.frameCount,
            config.rowCount || 1
        );
    }

    /**
     * Get a sound by name
     */
    public static getSound(name: string): Howl | null {
        return this.sounds.get(name) || null;
    }

    /**
     * Check if all assets are loaded
     */
    public static isLoaded(): boolean {
        return this.loaded;
    }

    /**
     * Get loading progress (0-1)
     */
    public static getProgress(): number {
        return this.loaded ? 1 : 0;
    }

    /**
     * Get craft data
     */
    public static getCraftData(): Map<string, CraftData> {
        return this.craftData;
    }

    /**
     * Get specific craft data
     */
    public static getCraft(name: string): CraftData | undefined {
        return this.craftData.get(name);
    }

    /**
     * Get wave data
     */
    public static getWaveData(): LevelWaves[] {
        return this.waveData;
    }

    /**
     * Get boss data
     */
    public static getBossData(): Map<string, BossData> {
        return this.bossData;
    }

    /**
     * Get survival mode data
     */
    public static getSurvivalData(level: number): LevelWaves[] | undefined {
        return this.survivalData.get(level);
    }

    /**
     * Create individual powerup textures from 12-frame sprite sheet
     */
    private static createPowerupTextures(): void {
        const powerupsTexture = this.getTexture('powerups');
        if (!powerupsTexture || !powerupsTexture.baseTexture) {
            console.warn('powerups.png not loaded, falling back to placeholder powerup textures');
            // Create placeholder textures if powerups.png fails to load
            const powerupDefaults = [
                ['powerup_weapon', 30, 30, 0x00ff00],
                ['powerup_shield', 30, 30, 0x00ffff],
                ['powerup_nuke', 30, 30, 0xff0000],
                ['powerup_health', 30, 30, 0xff00ff],
                ['powerup_speed', 30, 30, 0xffff00],
                ['powerup_rapid', 30, 30, 0xff8800],
                ['powerup_spread', 30, 30, 0x8800ff]
            ];

            for (const [name, width, height, color] of powerupDefaults) {
                if (!this.textures.has(name as string)) {
                    this.createColorTexture(name as string, width as number, height as number, color as number);
                }
            }
            return;
        }

        // powerups.png is a 12-frame horizontal sprite sheet
        const frameWidth = 32;
        const frameHeight = powerupsTexture.baseTexture.height;

        // Map frame indices to powerup texture names
        const powerupTypes = ['powerup_nuke', 'powerup_shield', 'powerup_speed', 'powerup_rapid', 'powerup_weapon', 'powerup_spread'];

        powerupTypes.forEach((name, index) => {
            if (!this.textures.has(name)) {
                const frameTexture = new PIXI.Texture(
                    powerupsTexture.baseTexture,
                    new PIXI.Rectangle(index * frameWidth, 0, frameWidth, frameHeight)
                );
                this.textures.set(name, frameTexture);
            }
        });

        console.log('Created powerup textures from sprite sheet');
    }
}