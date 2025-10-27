/**
 * Formation Spawner - Authentic Heavy Weapon enemy spawning system
 * Based on Ghidra analysis:
 * - Survival_ProcessTimedEnemySpawns @ 0x00432250: Simple timed spawning
 * - Survival_ProcessEnemyFormations @ 0x0040adb0: Basic wave calculations only
 * - XML Analysis: waves.xml/survival0.xml show qty-based spawning, no formations
 *
 * AUTHENTIC: Original Heavy Weapon uses simple scattered/loose group spawning
 */

import * as PIXI from 'pixi.js';
import { Game } from '../core/Game';
import { Enemy, EnemyType } from '../entities/Enemy';
import { GameConstants } from '../config/GameConstants';

// Original Heavy Weapon uses simple timed spawning, not complex formations
// Based on Ghidra analysis: Survival_ProcessTimedEnemySpawns @ 0x00432250
// and XML wave data showing only qty-based spawning
export enum FormationType {
    SCATTERED = 'scattered',      // Simple scattered spawning (authentic)
    LOOSE_GROUP = 'loose_group'   // Loose grouping with timing variations (authentic)
}

export interface SpawnPattern {
    type: FormationType;
    spacing: number;
    basePosition: Vector2;
}

export interface EnemyFormation {
    id: string;
    enemies: Enemy[];
    formationType: FormationType;
    leaderIndex: number;
    cohesion: number; // How tightly formation stays together
    completed: boolean;
    spawnComplete: boolean;
}

export class Vector2 {
    constructor(public x: number, public y: number) {}
}

export class FormationSpawner {
    private game: Game;
    private activeFormations: Map<string, EnemyFormation> = new Map();
    private formationUpdateTimer: number = 0;
    private formationCounter: number = 0;

    constructor(game: Game) {
        this.game = game;
    }

    /**
     * Spawn coordinated enemy formation
     * Based on Ghidra: Survival_ProcessEnemyFormations
     */
    public spawnFormation(
        enemyType: EnemyType,
        count: number,
        formationType: FormationType,
        spawnSide: 'left' | 'right' = 'left'
    ): string {
        const formationId = this.generateFormationId();
        const enemies: Enemy[] = [];

        // Calculate formation positions
        const positions = this.calculateFormationPositions(count, formationType, spawnSide);

        console.log(`Spawning ${formationType} formation with ${count} ${enemyType} enemies`);

        // Create formation record first
        const formation: EnemyFormation = {
            id: formationId,
            enemies,
            formationType,
            leaderIndex: 0, // First enemy is leader
            cohesion: this.getFormationCohesion(formationType),
            completed: false,
            spawnComplete: false
        };

        this.activeFormations.set(formationId, formation);

        // Create enemies with coordinated spawning
        positions.forEach((position, index) => {
            setTimeout(() => {
                const enemy = new Enemy(this.game, enemyType, position.x, position.y);

                // Set formation behavior
                this.setFormationBehavior(enemy, formationId, index);

                enemies.push(enemy);
                this.game.addEnemy(enemy);

                // Check if all enemies spawned
                if (index === positions.length - 1) {
                    formation.spawnComplete = true;
                    console.log(`Formation ${formationId} spawn complete`);
                }
            }, index * 200); // 200ms delay between spawns
        });

        return formationId;
    }

    private calculateFormationPositions(
        count: number,
        formationType: FormationType,
        spawnSide: 'left' | 'right'
    ): Vector2[] {
        const positions: Vector2[] = [];
        const baseX = spawnSide === 'left' ? -100 : GameConstants.SCREEN_WIDTH + 100;
        const baseY = 100 + Math.random() * (GameConstants.SCREEN_HEIGHT - 300);

        switch (formationType) {
            case FormationType.SCATTERED:
                this.createScatteredPattern(positions, count, baseX, baseY);
                break;

            case FormationType.LOOSE_GROUP:
                this.createLooseGroup(positions, count, baseX, baseY);
                break;

            default:
                // Fallback to scattered
                this.createScatteredPattern(positions, count, baseX, baseY);
                break;
        }

        return positions;
    }

    /**
     * Authentic Heavy Weapon scattered spawning pattern
     * Based on XML analysis: enemies spawn individually with random Y positions
     */
    private createScatteredPattern(positions: Vector2[], count: number, baseX: number, baseY: number): void {
        // Original Heavy Weapon spawns enemies scattered vertically
        // Each enemy gets a random Y position within flight zone
        const minY = 50;
        const maxY = GameConstants.SCREEN_HEIGHT * 0.7;

        for (let i = 0; i < count; i++) {
            positions.push(new Vector2(
                baseX,
                minY + Math.random() * (maxY - minY)
            ));
        }
    }

    /**
     * Authentic Heavy Weapon loose group pattern
     * Based on Ghidra analysis: small groups spawn with slight Y clustering
     */
    private createLooseGroup(positions: Vector2[], count: number, baseX: number, baseY: number): void {
        // Small groups spawn in loose vertical clusters
        const clusterSpread = 80; // Vertical spread within group
        const groupCenterY = baseY;

        for (let i = 0; i < count; i++) {
            positions.push(new Vector2(
                baseX,
                groupCenterY + (Math.random() - 0.5) * clusterSpread
            ));
        }
    }

    private setFormationBehavior(enemy: Enemy, formationId: string, index: number): void {
        // Original Heavy Weapon: enemies don't have complex formation AI
        // They just move in straight lines towards the player area
        (enemy as any).formationId = formationId;
        (enemy as any).formationIndex = index;
        (enemy as any).isSimpleSpawn = true; // Mark as authentic simple spawn

        // No complex formation behavior - enemies move independently
        // This matches the original game's simple movement patterns
    }

    /**
     * Update all active formations
     */
    public update(deltaTime: number): void {
        this.formationUpdateTimer += deltaTime * 1000;

        // Update formations every 100ms for performance
        if (this.formationUpdateTimer >= 100) {
            this.activeFormations.forEach(formation => {
                if (formation.spawnComplete) {
                    this.updateFormation(formation, deltaTime);
                }
            });

            // Clean up completed formations
            this.cleanupCompletedFormations();

            this.formationUpdateTimer = 0;
        }
    }

    private updateFormation(formation: EnemyFormation, deltaTime: number): void {
        const aliveEnemies = formation.enemies.filter(enemy => !enemy.isDestroyed);

        if (aliveEnemies.length === 0) {
            formation.completed = true;
            return;
        }

        // Update formation cohesion
        if (aliveEnemies.length > 1 && formation.cohesion > 0) {
            const leader = this.findFormationLeader(aliveEnemies, formation);
            this.maintainFormation(aliveEnemies, leader, formation);
        }
    }

    private findFormationLeader(enemies: Enemy[], formation: EnemyFormation): Enemy {
        // Use the first alive enemy as leader, or the one furthest ahead
        let leader = enemies[0];
        let furthestX = leader.x;

        enemies.forEach(enemy => {
            if (enemy.x < furthestX) { // Assuming left-to-right movement
                furthestX = enemy.x;
                leader = enemy;
            }
        });

        return leader;
    }

    private maintainFormation(enemies: Enemy[], leader: Enemy, formation: EnemyFormation): void {
        enemies.forEach((enemy, index) => {
            if (enemy === leader) return;

            // Calculate desired position relative to leader
            const desiredOffset = this.getFormationOffset(index, formation.formationType, formation.enemies.length);
            const desiredX = leader.x + desiredOffset.x;
            const desiredY = leader.y + desiredOffset.y;

            // Apply cohesion force
            const dx = desiredX - enemy.x;
            const dy = desiredY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 80) { // Only adjust if too far from formation
                const cohesionForce = formation.cohesion * 0.02;
                (enemy as any).formationForceX = dx * cohesionForce;
                (enemy as any).formationForceY = dy * cohesionForce;

                // Apply the force to enemy movement (if enemy supports it)
                if ((enemy as any).applyFormationForce) {
                    (enemy as any).applyFormationForce(
                        (enemy as any).formationForceX,
                        (enemy as any).formationForceY
                    );
                }
            }
        });
    }

    private getFormationOffset(index: number, formationType: FormationType, totalCount: number): Vector2 {
        const spacing = 70;

        switch (formationType) {
            case FormationType.V_FORMATION:
                const center = Math.floor(totalCount / 2);
                const vOffset = Math.abs(index - center);
                const side = index < center ? -1 : 1;
                return new Vector2(vOffset * spacing * 0.5, side * vOffset * spacing);

            case FormationType.LINE_FORMATION:
                return new Vector2(0, (index - totalCount/2) * spacing);

            case FormationType.DIAMOND_FORMATION:
                // Simplified diamond offset
                const angle = (index / totalCount) * Math.PI * 2;
                return new Vector2(
                    Math.cos(angle) * spacing,
                    Math.sin(angle) * spacing * 0.7
                );

            case FormationType.WEDGE_FORMATION:
                if (index === 0) return new Vector2(0, 0); // Leader
                const row = Math.floor((index - 1) / 2) + 1;
                const wingSide = (index - 1) % 2 === 0 ? -1 : 1;
                return new Vector2(row * spacing * 0.3, wingSide * row * spacing * 0.7);

            default:
                return new Vector2(0, 0);
        }
    }

    private generateFormationId(): string {
        return `formation_${++this.formationCounter}_${Date.now()}`;
    }

    private getFormationCohesion(formationType: FormationType): number {
        const cohesionValues = {
            [FormationType.V_FORMATION]: 0.8,
            [FormationType.LINE_FORMATION]: 0.9,
            [FormationType.DIAMOND_FORMATION]: 0.7,
            [FormationType.SWARM_FORMATION]: 0.3,
            [FormationType.WEDGE_FORMATION]: 0.85
        };
        return cohesionValues[formationType] || 0.5;
    }

    private cleanupCompletedFormations(): void {
        const toRemove: string[] = [];
        this.activeFormations.forEach((formation, id) => {
            if (formation.completed) {
                toRemove.push(id);
            }
        });
        toRemove.forEach(id => {
            this.activeFormations.delete(id);
            console.log(`Formation ${id} cleaned up`);
        });
    }

    /**
     * Select formation type based on original Heavy Weapon spawning patterns
     * Based on Ghidra analysis: enemies spawn in timed intervals, not rigid formations
     */
    public selectFormationType(enemyType: EnemyType, count: number): FormationType {
        // Original Heavy Weapon XML shows qty-based spawning only
        // Large groups spawn scattered over time intervals
        if (count >= 5) {
            return FormationType.SCATTERED;
        }

        // Smaller groups spawn in loose timing clusters
        return FormationType.LOOSE_GROUP;
    }

    /**
     * Get active formation count
     */
    public getActiveFormationCount(): number {
        return this.activeFormations.size;
    }

    /**
     * Get formation statistics for debugging
     */
    public getFormationStats(): {
        active: number;
        totalSpawned: number;
        formations: Array<{ id: string; type: FormationType; enemies: number }>;
    } {
        const formations: Array<{ id: string; type: FormationType; enemies: number }> = [];

        this.activeFormations.forEach((formation, id) => {
            formations.push({
                id,
                type: formation.formationType,
                enemies: formation.enemies.filter(e => !e.isDestroyed).length
            });
        });

        return {
            active: this.activeFormations.size,
            totalSpawned: this.formationCounter,
            formations
        };
    }

    /**
     * Clear all formations
     */
    public clear(): void {
        this.activeFormations.clear();
        this.formationCounter = 0;
        console.log('All formations cleared');
    }
}