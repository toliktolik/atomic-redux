/**
 * Layer Manager - Manages rendering layers for proper z-ordering
 */

import * as PIXI from 'pixi.js';

export class LayerManager {
    private layers: Map<string, PIXI.Container>;
    private parent: PIXI.Container;

    constructor(parent: PIXI.Container) {
        this.parent = parent;
        this.layers = new Map();

        // Create layers in z-order (back to front)
        const layerConfig = [
            { name: 'background', zIndex: 0 },
            { name: 'ground', zIndex: 1 },
            { name: 'shadows', zIndex: 2 },
            { name: 'ground_enemies', zIndex: 3 },
            { name: 'powerups', zIndex: 4 },
            { name: 'enemies', zIndex: 5 },
            { name: 'tank', zIndex: 6 },
            { name: 'allies', zIndex: 7 }, // Added allies layer for helicopters
            { name: 'projectiles', zIndex: 8 },
            { name: 'explosions', zIndex: 9 },
            { name: 'particles', zIndex: 10 },
            { name: 'effects', zIndex: 11 }
        ];

        // Create and add layers
        layerConfig.forEach(config => {
            const layer = new PIXI.Container();
            layer.zIndex = config.zIndex;
            layer.name = config.name;
            this.layers.set(config.name, layer);
            this.parent.addChild(layer);
        });

        // Enable sorting by zIndex
        this.parent.sortableChildren = true;
    }

    /**
     * Get a specific layer
     */
    public getLayer(name: string): PIXI.Container {
        const layer = this.layers.get(name);
        if (!layer) {
            throw new Error(`Layer '${name}' not found`);
        }
        return layer;
    }

    /**
     * Add child to specific layer
     */
    public addToLayer(layerName: string, child: PIXI.DisplayObject): void {
        const layer = this.getLayer(layerName);
        layer.addChild(child);
    }

    /**
     * Remove child from specific layer
     */
    public removeFromLayer(layerName: string, child: PIXI.DisplayObject): void {
        const layer = this.getLayer(layerName);
        layer.removeChild(child);
    }

    /**
     * Clear all objects from a layer
     */
    public clearLayer(layerName: string): void {
        const layer = this.getLayer(layerName);
        layer.removeChildren();
    }

    /**
     * Clear all layers
     */
    public clearAll(): void {
        this.layers.forEach(layer => {
            layer.removeChildren();
        });
    }

    /**
     * Get all children from a layer
     */
    public getLayerChildren(layerName: string): PIXI.DisplayObject[] {
        const layer = this.getLayer(layerName);
        return layer.children;
    }

    /**
     * Sort a layer's children by a custom function
     */
    public sortLayer(layerName: string, sortFn: (a: PIXI.DisplayObject, b: PIXI.DisplayObject) => number): void {
        const layer = this.getLayer(layerName);
        layer.children.sort(sortFn);
    }

    /**
     * Set layer visibility
     */
    public setLayerVisible(layerName: string, visible: boolean): void {
        const layer = this.getLayer(layerName);
        layer.visible = visible;
    }

    /**
     * Set layer alpha
     */
    public setLayerAlpha(layerName: string, alpha: number): void {
        const layer = this.getLayer(layerName);
        layer.alpha = alpha;
    }
}