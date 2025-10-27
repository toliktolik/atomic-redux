/**
 * Craft Data Loader - Loads enemy stats directly from Heavy Weapon's craft.xml
 * Maintains exact data integrity from original game files
 */

export interface CraftData {
    name: string;
    desc: string;
    arms: string;
    points: number;
    armor: number;
    speed: number;
    firerate: number;
    frames: number;
}

export interface CraftDatabase {
    [craftName: string]: CraftData;
}

export class CraftDataLoader {
    private static craftData: CraftDatabase | null = null;
    private static readonly CRAFT_XML_PATH = '/HeavyWeapon/data/craft.xml';

    /**
     * Load and parse craft.xml data
     */
    public static async loadCraftData(): Promise<CraftDatabase> {
        if (this.craftData !== null) {
            return this.craftData;
        }

        try {
            // Load and parse the XML file
            const response = await fetch(this.CRAFT_XML_PATH);
            const xmlText = await response.text();

            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const craftElements = xmlDoc.querySelectorAll('Craft');

            this.craftData = {};

            craftElements.forEach(craft => {
                const name = craft.getAttribute('name');
                const desc = craft.getAttribute('desc');
                const arms = craft.getAttribute('arms');
                const points = parseInt(craft.getAttribute('points') || '0');
                const armor = parseInt(craft.getAttribute('armor') || '1');
                const speed = parseInt(craft.getAttribute('speed') || '150');
                const firerate = parseInt(craft.getAttribute('firerate') || '1000');
                const frames = parseInt(craft.getAttribute('frames') || '1');

                if (name) {
                    this.craftData![name] = {
                        name,
                        desc: desc || '',
                        arms: arms || '',
                        points,
                        armor,
                        speed,
                        firerate,
                        frames
                    };
                }
            });

            console.log('✅ Craft data loaded from craft_enhanced.xml with', Object.keys(this.craftData).length, 'enemy types');
            return this.craftData;

        } catch (error) {
            console.error('❌ Failed to load craft_enhanced.xml data:', error);
            throw new Error('Could not load enemy craft data from craft_enhanced.xml');
        }
    }

    /**
     * Get craft data for specific enemy type
     */
    public static async getCraftData(craftName: string): Promise<CraftData | null> {
        const database = await this.loadCraftData();
        return database[craftName] || null;
    }

    /**
     * Get all craft names
     */
    public static async getAllCraftNames(): Promise<string[]> {
        const database = await this.loadCraftData();
        return Object.keys(database);
    }

    /**
     * Validate craft exists
     */
    public static async craftExists(craftName: string): Promise<boolean> {
        const database = await this.loadCraftData();
        return craftName in database;
    }
}