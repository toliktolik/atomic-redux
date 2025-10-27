/**
 * XML Data Loader - Loads and parses game data from XML files
 * Handles XML files with proper <root> elements for browser compatibility
 */

export interface CraftData {
    name: string;
    desc: string;
    arms: string;
    points: number;
    armor: number;
}

export interface WaveData {
    length: number;
    enemies: Array<{
        id: string;
        qty: number;
    }>;
}

export interface LevelWaves {
    waves: WaveData[];
}

export interface BossComponent {
    armor: number;
    fire?: number;
    speed?: number;
    stationary?: boolean;
}

export interface BossLevel {
    armor: number;
    score: number;
    components: Map<string, BossComponent>;
}

export interface BossData {
    name: string;
    info: string;
    levels: Map<string, BossLevel>;
}

export interface SurvivalCraft {
    id: string;
    qty: number;
}

export interface SurvivalWave {
    length: number;
    enemies: SurvivalCraft[];
}

export interface SurvivalLevel {
    waves: SurvivalWave[];
}

export interface SurvivalTierData {
    tier: number;
    levels: SurvivalLevel[];
    totalWaves: number;
}

export class XMLDataLoader {
    private static parser = new DOMParser();

    /**
     * Load craft data from XML
     */
    public static async loadCraftData(url: string): Promise<Map<string, CraftData>> {
        const crafts = new Map<string, CraftData>();

        try {
            const response = await fetch(url);
            const xmlText = await response.text();
            const xmlDoc = this.parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error(`XML parsing error: ${parserError.textContent}`);
            }

            // Get root element
            const root = xmlDoc.querySelector('root');
            if (!root) {
                throw new Error('XML file missing <root> element');
            }

            // Parse craft elements
            const craftElements = root.querySelectorAll('Craft');
            craftElements.forEach(craft => {
                const name = craft.getAttribute('name');
                if (name) {
                    crafts.set(name, {
                        name,
                        desc: craft.getAttribute('desc') || '',
                        arms: craft.getAttribute('arms') || 'None',
                        points: parseInt(craft.getAttribute('points') || '0', 10),
                        armor: parseInt(craft.getAttribute('armor') || '1', 10)
                    });
                }
            });
        } catch (error) {
            console.error('Failed to load craft data:', error);
        }

        return crafts;
    }

    /**
     * Load wave data from XML
     */
    public static async loadWaveData(url: string): Promise<LevelWaves[]> {
        const levels: LevelWaves[] = [];

        try {
            const response = await fetch(url);
            const xmlText = await response.text();
            const xmlDoc = this.parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error(`XML parsing error: ${parserError.textContent}`);
            }

            // Get root element
            const root = xmlDoc.querySelector('root');
            if (!root) {
                throw new Error('XML file missing <root> element');
            }

            // Parse level elements
            const levelElements = root.querySelectorAll('Level');
            levelElements.forEach(level => {
                const waves: WaveData[] = [];

                const waveElements = level.querySelectorAll('Wave');
                waveElements.forEach(wave => {
                    const length = parseInt(wave.getAttribute('length') || '1000', 10);
                    const enemies: Array<{id: string; qty: number}> = [];

                    const craftElements = wave.querySelectorAll('Craft');
                    craftElements.forEach(craft => {
                        const id = craft.getAttribute('id');
                        const qty = parseInt(craft.getAttribute('qty') || '1', 10);
                        if (id) {
                            enemies.push({ id, qty });
                        }
                    });

                    waves.push({ length, enemies });
                });

                levels.push({ waves });
            });
        } catch (error) {
            console.error('Failed to load wave data:', error);
        }

        return levels;
    }

    /**
     * Load boss data from XML
     */
    public static async loadBossData(url: string): Promise<Map<string, BossData>> {
        const bosses = new Map<string, BossData>();

        try {
            const response = await fetch(url);
            const xmlText = await response.text();
            const xmlDoc = this.parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error(`XML parsing error: ${parserError.textContent}`);
            }

            // Get root element
            const root = xmlDoc.querySelector('root');
            if (!root) {
                throw new Error('XML file missing <root> element');
            }

            // Parse boss elements (direct children of root)
            const bossElements = root.children;
            for (let i = 0; i < bossElements.length; i++) {
                const bossElement = bossElements[i];
                if (bossElement.nodeType !== Node.ELEMENT_NODE) continue;

                const bossName = bossElement.tagName;
                const info = bossElement.getAttribute('info') || '';
                const levels = new Map<string, BossLevel>();

                // Parse level data
                const levelElements = bossElement.querySelectorAll('[armor]');
                levelElements.forEach(levelElement => {
                    if (levelElement.tagName.startsWith('Level')) {
                        const levelName = levelElement.tagName;
                        const armor = parseInt(levelElement.getAttribute('armor') || '100', 10);
                        const score = parseInt(levelElement.getAttribute('score') || '1000', 10);
                        const components = new Map<string, BossComponent>();

                        // Parse component data
                        const componentElements = levelElement.children;
                        for (let j = 0; j < componentElements.length; j++) {
                            const comp = componentElements[j];
                            if (comp.nodeType !== Node.ELEMENT_NODE) continue;

                            const compName = comp.tagName;
                            components.set(compName, {
                                armor: parseInt(comp.getAttribute('armor') || '50', 10),
                                fire: comp.hasAttribute('fire') ?
                                    parseInt(comp.getAttribute('fire')!, 10) : undefined,
                                speed: comp.hasAttribute('speed') ?
                                    parseFloat(comp.getAttribute('speed')!) : undefined,
                                stationary: comp.getAttribute('stationary') === 'yes'
                            });
                        }

                        levels.set(levelName, { armor, score, components });
                    }
                });

                bosses.set(bossName, {
                    name: bossName,
                    info,
                    levels
                });
            }
        } catch (error) {
            console.error('Failed to load boss data:', error);
        }

        return bosses;
    }

    /**
     * Load survival mode data from XML
     */
    public static async loadSurvivalData(url: string): Promise<LevelWaves[]> {
        // Survival mode uses the same format as wave data
        return this.loadWaveData(url);
    }

    /**
     * Create default craft data if loading fails
     */

    /**
     * Load specific survival tier configuration (survival0.xml - survival9.xml)
     * Based on Ghidra: Survival_LoadConfiguration
     */
    public static async loadSurvivalTier(tier: number): Promise<SurvivalTierData> {
        const url = `/HeavyWeapon/data/survival${tier}.xml`;

        try {
            const response = await fetch(url);
            const xmlText = await response.text();
            const xmlDoc = this.parser.parseFromString(xmlText, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error(`XML parsing error: ${parserError.textContent}`);
            }

            // Get root element
            const root = xmlDoc.querySelector('root');
            if (!root) {
                throw new Error('XML file missing <root> element');
            }

            const levels: SurvivalLevel[] = [];
            const levelElements = root.querySelectorAll('Level');

            levelElements.forEach(level => {
                const waves: SurvivalWave[] = [];
                const waveElements = level.querySelectorAll('Wave');

                waveElements.forEach(wave => {
                    const length = parseInt(wave.getAttribute('length') || '1000', 10);
                    const enemies: SurvivalCraft[] = [];

                    const craftElements = wave.querySelectorAll('Craft');
                    craftElements.forEach(craft => {
                        const id = craft.getAttribute('id');
                        const qty = parseInt(craft.getAttribute('qty') || '1', 10);
                        if (id) {
                            enemies.push({ id, qty });
                        }
                    });

                    waves.push({ length, enemies });
                });

                levels.push({ waves });
            });

            return {
                tier,
                levels,
                totalWaves: levels.reduce((sum, level) => sum + level.waves.length, 0)
            };
        } catch (error) {
            console.error(`Failed to load survival tier ${tier}:`, error);
            throw error;
        }
    }


}