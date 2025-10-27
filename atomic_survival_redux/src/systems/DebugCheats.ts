/**
 * Debug Cheats System - Testing utilities for development
 */

import { Game } from '../core/Game';
import { WeaponType } from '../weapons/Weapon';
import { PowerUpType } from '../entities/PowerUp';
import { GameConstants } from '../config/GameConstants';

export class DebugCheats {
    private game: Game;
    private enabled: boolean = false;
    private lastKeyPress: Map<string, number> = new Map();
    private keyDelay: number = 200; // Prevent rapid key repeat

    constructor(game: Game) {
        this.game = game;

        // Enable debug mode if in development
        this.enabled = this.isDebugMode();

        if (this.enabled) {
            this.printCheatSheet();
            this.setupCheatListeners();
        }
    }

    /**
     * Check if we're in debug/development mode
     */
    private isDebugMode(): boolean {
        // Check for development mode indicators
        return (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('192.168') ||
            window.location.port === '5173' || // Vite dev server
            process.env.NODE_ENV === 'development' ||
            (window as any).DEBUG_MODE === true
        );
    }

    /**
     * Print cheat sheet to console
     */
    private printCheatSheet(): void {
        console.log('%c🎮 DEBUG CHEATS ENABLED 🎮', 'color: #00ff00; font-size: 20px; font-weight: bold');
        console.log('%c═══════════════════════════════════════', 'color: #00ff00');
        console.log('%cWEAPON CHEATS (Number Keys):', 'color: #ffff00; font-weight: bold');
        console.log('%c1 - Standard Gun', 'color: #ffffff');
        console.log('%c2 - Homing Missiles', 'color: #ffffff');
        console.log('%c3 - Laser Cannon', 'color: #ffffff');
        console.log('%c4 - Rocket Pods', 'color: #ffffff');
        console.log('%c5 - Flak Cannon', 'color: #ffffff');
        console.log('%c6 - Thunderstrike', 'color: #ffffff');
        console.log('%c═══════════════════════════════════════', 'color: #00ff00');
        console.log('%cPOWER-UP CHEATS (Number Keys):', 'color: #ffff00; font-weight: bold');
        console.log('%c7 - Shield (10 seconds)', 'color: #ffffff');
        console.log('%c8 - Speed Boost (10 seconds)', 'color: #ffffff');
        console.log('%c9 - Rapid Fire (10 seconds)', 'color: #ffffff');
        console.log('%c0 - Nuke (Clear all enemies)', 'color: #ffffff');
        console.log('%c═══════════════════════════════════════', 'color: #00ff00');
        console.log('%cOTHER CHEATS:', 'color: #ffff00; font-weight: bold');
        console.log('%c- (minus) - Heal to full health', 'color: #ffffff');
        console.log('%c= (equals) - Spawn random power-up', 'color: #ffffff');
        console.log('%c[ - Previous wave', 'color: #ffffff');
        console.log('%c] - Next wave', 'color: #ffffff');
        console.log('%c\\ - Toggle invincibility', 'color: #ffffff');
        console.log('%cD - Spawn DEFLECTOR enemy (test bullet deflection)', 'color: #ffffff');
        console.log('%cS - Spawn SATELLITE enemy (test laser attack)', 'color: #ffffff');
        console.log('%cM - Activate Mega Laser (test full-screen effect)', 'color: #ffffff');
        console.log('%c═══════════════════════════════════════', 'color: #00ff00');
    }

    /**
     * Setup keyboard listeners for cheats
     */
    private setupCheatListeners(): void {
        window.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Check if game is active
            const gameState = this.game.getGameState();
            if (!gameState || gameState.getState() !== 'playing') return;

            // Prevent rapid key repeat
            const now = Date.now();
            const lastPress = this.lastKeyPress.get(e.code) || 0;
            if (now - lastPress < this.keyDelay) return;
            this.lastKeyPress.set(e.code, now);

            // Get tank reference
            const tank = gameState.getTank();
            if (!tank || tank.isDestroyed) return;

            // Process cheat codes
            switch (e.code) {
                // Weapon cheats (1-6)
                case 'Digit1':
                    this.setWeapon(WeaponType.STANDARD_GUN);
                    break;
                case 'Digit2':
                    this.setWeapon(WeaponType.HOMING_MISSILES);
                    break;
                case 'Digit3':
                    this.setWeapon(WeaponType.LASER_CANNON);
                    break;
                case 'Digit4':
                    this.setWeapon(WeaponType.ROCKETS);
                    break;
                case 'Digit5':
                    this.setWeapon(WeaponType.FLAK_CANNON);
                    break;
                case 'Digit6':
                    this.setWeapon(WeaponType.THUNDERSTRIKE);
                    break;

                // Power-up cheats (7-0)
                case 'Digit7':
                    this.activateShield();
                    break;
                case 'Digit8':
                    this.activateSpeedBoost();
                    break;
                case 'Digit9':
                    this.activateRapidFire();
                    break;
                case 'Digit0':
                    this.activateNuke();
                    break;

                // Other cheats
                case 'Minus':
                    this.healToFull();
                    break;
                case 'Equal':
                    this.spawnRandomPowerUp();
                    break;
                case 'BracketLeft':
                    this.previousWave();
                    break;
                case 'BracketRight':
                    this.nextWave();
                    break;
                case 'Backslash':
                    this.toggleInvincibility();
                    break;

                // Enemy spawn cheats
                case 'KeyT':
                    this.spawnDeflectorEnemy();
                    break;
                case 'KeyY':
                    this.spawnSatelliteEnemy();
                    break;
                case 'KeyM':
                    this.activateMegaLaser();
                    break;
            }
        });
    }

    /**
     * Add weapon type to active weapons (cheat)
     */
    private setWeapon(weaponType: WeaponType): void {
        const gameState = this.game.getGameState();
        const tank = gameState?.getTank();
        if (!tank) return;

        // Add weapon to active weapons if not already present
        const activeWeapons = (tank as any).activeWeapons as WeaponType[];
        if (!activeWeapons.includes(weaponType)) {
            activeWeapons.push(weaponType);

            // Refill ammo for the new weapon
            const weapon = (tank as any).weapons.get(weaponType);
            if (weapon) {
                weapon.refillAmmo();
            }

            console.log(`%c[CHEAT] Weapon added: ${WeaponType[weaponType]}`, 'color: #00ff00');
            console.log(`%c[CHEAT] Active weapons: ${activeWeapons.map(w => WeaponType[w]).join(', ')}`, 'color: #00ff00');
        } else {
            console.log(`%c[CHEAT] Weapon already active: ${WeaponType[weaponType]}`, 'color: #ffaa00');
        }
    }

    /**
     * Activate shield
     */
    private activateShield(): void {
        const gameState = this.game.getGameState();
        const tank = gameState?.getTank();
        if (!tank) return;

        tank.activateShield(10000); // 10 seconds
        console.log('%c[CHEAT] Shield activated for 10 seconds', 'color: #00ff00');
    }

    /**
     * Activate speed boost
     */
    private activateSpeedBoost(): void {
        const gameState = this.game.getGameState();
        const tank = gameState?.getTank();
        if (!tank) return;

        tank.activateSpeedBoost(10000); // 10 seconds
        console.log('%c[CHEAT] Speed boost activated for 10 seconds', 'color: #00ff00');
    }

    /**
     * Activate rapid fire
     */
    private activateRapidFire(): void {
        const gameState = this.game.getGameState();
        const tank = gameState?.getTank();
        if (!tank) return;

        tank.activateRapidFire(10000); // 10 seconds
        console.log('%c[CHEAT] Rapid fire activated for 10 seconds', 'color: #00ff00');
    }

    /**
     * Activate nuke
     */
    private activateNuke(): void {
        const gameState = this.game.getGameState();
        if (!gameState) return;

        // Clear all enemies
        const enemies = gameState.getEnemies();
        enemies.forEach(enemy => {
            if (!enemy.isDestroyed) {
                enemy.takeDamage(99999);
            }
        });

        console.log('%c[CHEAT] NUKE! All enemies destroyed', 'color: #ff0000; font-weight: bold');
    }

    /**
     * Heal tank to full health
     */
    private healToFull(): void {
        const gameState = this.game.getGameState();
        const tank = gameState?.getTank();
        if (!tank) return;

        tank.heal(GameConstants.TANK_MAX_HEALTH);
        console.log('%c[CHEAT] Tank healed to full health', 'color: #00ff00');
    }

    /**
     * Spawn random power-up
     */
    private spawnRandomPowerUp(): void {
        const gameState = this.game.getGameState();
        if (!gameState) return;

        const powerUpTypes = [
            PowerUpType.SHIELD,
            PowerUpType.MEGA_LASER,
            PowerUpType.SPEED_BOOST,
            PowerUpType.RAPID_FIRE,
            PowerUpType.SPREAD_SHOT,
            PowerUpType.HEALTH
        ];

        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const x = 100 + Math.random() * (GameConstants.SCREEN_WIDTH - 200);
        const y = 100;

        gameState.spawnPowerUp(randomType, x, y);
        console.log(`%c[CHEAT] Spawned power-up: ${PowerUpType[randomType]}`, 'color: #00ff00');
    }

    /**
     * Go to previous wave
     */
    private previousWave(): void {
        const waveSystem = this.game.getWaveSystem();
        if (!waveSystem) return;

        const currentWave = waveSystem.getCurrentWave();
        if (currentWave > 1) {
            (waveSystem as any).currentWave = currentWave - 2; // Will advance to -1
            waveSystem.nextWave();
            console.log(`%c[CHEAT] Moved to wave ${currentWave - 1}`, 'color: #00ff00');
        }
    }

    /**
     * Go to next wave
     */
    private nextWave(): void {
        const waveSystem = this.game.getWaveSystem();
        if (!waveSystem) return;

        waveSystem.nextWave();
        const newWave = waveSystem.getCurrentWave();
        console.log(`%c[CHEAT] Moved to wave ${newWave}`, 'color: #00ff00');
    }

    /**
     * Toggle invincibility
     */
    private toggleInvincibility(): void {
        const gameState = this.game.getGameState();
        const tank = gameState?.getTank();
        if (!tank) return;

        // Toggle invincibility by setting a flag
        const isInvincible = (tank as any).__invincible || false;
        (tank as any).__invincible = !isInvincible;

        // Override takeDamage method if enabling invincibility
        if (!isInvincible) {
            const originalTakeDamage = tank.takeDamage.bind(tank);
            (tank as any).__originalTakeDamage = originalTakeDamage;
            tank.takeDamage = () => {}; // No-op
            console.log('%c[CHEAT] INVINCIBILITY ON', 'color: #ffff00; font-weight: bold');
        } else {
            // Restore original method
            if ((tank as any).__originalTakeDamage) {
                tank.takeDamage = (tank as any).__originalTakeDamage;
            }
            console.log('%c[CHEAT] Invincibility OFF', 'color: #808080');
        }
    }

    /**
     * Spawn DEFLECTOR enemy for testing
     */
    private spawnDeflectorEnemy(): void {
        // Spawn DEFLECTOR enemy at random position
        const x = Math.random() < 0.5 ? -50 : GameConstants.SCREEN_WIDTH + 50; // From left or right
        const y = 100 + Math.random() * 200; // Random height

        // Import EnemyType enum and spawn enemy
        import('../entities/Enemy').then(({ Enemy, EnemyType }) => {
            const deflector = new Enemy(this.game, EnemyType.DEFLECTOR, x, y);
            this.game.addEnemy(deflector);
            console.log(`%c[CHEAT] Spawned DEFLECTOR enemy at (${Math.round(x)}, ${Math.round(y)})`, 'color: #00ffff; font-weight: bold');
            console.log('%cShoot at it to test bullet deflection!', 'color: #ffff00');
        });
    }

    /**
     * Spawn SATELLITE enemy for testing
     */
    private spawnSatelliteEnemy(): void {
        // Spawn SATELLITE at top of screen - satellites hover high
        const x = 200 + Math.random() * (GameConstants.SCREEN_WIDTH - 400); // Random X but away from edges
        const y = 50; // High in sky

        // Import EnemyType enum and spawn enemy
        import('../entities/Enemy').then(({ Enemy, EnemyType }) => {
            const satellite = new Enemy(this.game, EnemyType.SATELLITE, x, y);
            this.game.addEnemy(satellite);
            console.log(`%c[CHEAT] Spawned SATELLITE enemy at (${Math.round(x)}, ${Math.round(y)})`, 'color: #ff00ff; font-weight: bold');
            console.log('%cWarning: SATELLITE will charge and fire laser beam!', 'color: #ff4444');
        });
    }

    /**
     * Activate Mega Laser for testing
     */
    private activateMegaLaser(): void {
        const tank = this.game.getTank();
        if (!tank) return;

        // Activate mega laser power-up
        tank.activateMegaLaser(3000); // 3 second duration (though effect is self-managed)

        console.log('%c[CHEAT] MEGA LASER activated!', 'color: #ff0000; font-weight: bold; font-size: 16px');
        console.log('%cSpectacular full-screen laser show incoming!', 'color: #ffff00');
    }

    /**
     * Disable cheats
     */
    public disable(): void {
        this.enabled = false;
        console.log('%c[DEBUG] Cheats disabled', 'color: #ff0000');
    }

    /**
     * Enable cheats
     */
    public enable(): void {
        this.enabled = true;
        this.printCheatSheet();
        console.log('%c[DEBUG] Cheats enabled', 'color: #00ff00');
    }
}