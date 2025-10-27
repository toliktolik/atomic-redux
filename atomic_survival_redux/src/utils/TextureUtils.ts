/**
 * Texture Utilities - Safe texture loading for PIXI.js
 * Prevents uncaught promise errors from asset loading
 */

import * as PIXI from 'pixi.js';

export class TextureUtils {
    /**
     * Safely load a texture with error handling
     */
    public static async safeLoadTexture(path: string): Promise<PIXI.Texture | null> {
        try {
            const texture = PIXI.Texture.from(path);

            // Wait for texture to load or fail
            return new Promise((resolve) => {
                if (texture.baseTexture.valid) {
                    resolve(texture);
                    return;
                }

                const onLoad = () => {
                    texture.baseTexture.off('loaded', onLoad);
                    texture.baseTexture.off('error', onError);
                    resolve(texture);
                };

                const onError = () => {
                    texture.baseTexture.off('loaded', onLoad);
                    texture.baseTexture.off('error', onError);
                    console.warn(`Failed to load texture: ${path}`);
                    resolve(null);
                };

                texture.baseTexture.on('loaded', onLoad);
                texture.baseTexture.on('error', onError);
            });
        } catch (error) {
            console.warn(`Error loading texture ${path}:`, error);
            return null;
        }
    }

    /**
     * Create a simple colored texture as fallback
     */
    public static createColorTexture(color: number, width: number = 64, height: number = 64): PIXI.Texture {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(color);
        graphics.drawRect(0, 0, width, height);
        graphics.endFill();

        const renderer = PIXI.Renderer.create({ width, height });
        const texture = renderer.generateTexture(graphics);
        renderer.destroy();
        graphics.destroy();

        return texture;
    }
}