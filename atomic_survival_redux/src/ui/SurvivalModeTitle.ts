/**
 * Survival Mode Title Component - Displays "SURVIVAL MODE" title and tier badge
 * Based on Ghidra analysis of SurvivalMode_DrawHUD @ 0x0042e220
 * Title coordinates: (0xd1, 0x14) = (209, 20)
 */

import * as PIXI from 'pixi.js';

export class SurvivalModeTitle extends PIXI.Container {
    private titleText: PIXI.Text;
    private tierBadge: PIXI.Graphics;
    private tierText: PIXI.Text;
    private currentTier: number = 0;

    constructor() {
        super();

        this.createTitleDisplay();
        this.createTierBadge();
        this.positionElements();
    }

    private createTitleDisplay(): void {
        const titleStyle = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 20,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            dropShadow: true,
            dropShadowDistance: 3,
            dropShadowColor: '#000000'
        });

        // Text from Ghidra: "SURVIVAL MODE"
        this.titleText = new PIXI.Text('SURVIVAL MODE', titleStyle);
        this.titleText.anchor.set(0, 0); // Top-left anchor
        this.addChild(this.titleText);
    }

    private createTierBadge(): void {
        this.tierBadge = new PIXI.Graphics();
        this.addChild(this.tierBadge);

        // Create tier text
        const tierStyle = new PIXI.TextStyle({
            fontFamily: 'Arial Black',
            fontSize: 14,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });

        this.tierText = new PIXI.Text('T0', tierStyle);
        this.tierText.anchor.set(0.5);
        this.tierBadge.addChild(this.tierText);

        this.updateTierBadge(0);
    }

    private positionElements(): void {
        // Position based on Ghidra coordinates: (0xd1, 0x14) = (209, 20)
        this.x = 209;
        this.y = 20;

        // Position tier badge relative to title
        this.tierBadge.x = this.titleText.width + 10;
        this.tierBadge.y = 0;

        // Center tier text within badge
        this.tierText.x = 20;
        this.tierText.y = 10;
    }

    private updateTierBadge(tier: number): void {
        this.tierBadge.clear();

        // Choose badge color based on tier
        let badgeColor = 0x444444; // Default gray
        if (tier >= 7) {
            badgeColor = 0xff0000; // Red for extreme tiers
        } else if (tier >= 4) {
            badgeColor = 0xff9900; // Orange for advanced tiers
        } else if (tier >= 2) {
            badgeColor = 0xffff00; // Yellow for intermediate tiers
        }

        // Draw tier badge background
        this.tierBadge.beginFill(badgeColor);
        this.tierBadge.drawRoundedRect(0, 0, 40, 20, 5);
        this.tierBadge.endFill();

        // Draw border
        this.tierBadge.lineStyle(2, 0xffffff, 1);
        this.tierBadge.drawRoundedRect(0, 0, 40, 20, 5);

        // Update tier text
        this.tierText.text = `T${tier}`;
    }

    /**
     * Update survival tier display
     */
    public updateTier(tier: number): void {
        // Clamp tier to valid range
        tier = Math.max(0, Math.min(9, tier));

        if (this.currentTier !== tier) {
            this.currentTier = tier;
            this.updateTierBadge(tier);

            // Reposition badge after text might have changed width
            this.tierBadge.x = this.titleText.width + 10;
        }
    }

    /**
     * Get current tier
     */
    public getCurrentTier(): number {
        return this.currentTier;
    }
}