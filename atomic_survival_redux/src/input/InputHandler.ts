/**
 * Input Handler - Manages keyboard and mouse input
 */

import * as PIXI from 'pixi.js';

export interface InputState {
    fire: boolean;
    special: boolean;
}

export class InputHandler {
    private keys: Map<string, boolean> = new Map();
    private mousePosition: PIXI.Point = new PIXI.Point();
    private mouseDown: boolean = false;
    private rightMouseDown: boolean = false;
    private canvas: HTMLCanvasElement;

    public enabled: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupTouchEvents();
    }

    /**
     * Setup keyboard event listeners
     */
    private setupKeyboardEvents(): void {
        window.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            this.keys.set(e.code, true);

            // Prevent default for game keys
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.set(e.code, false);
        });

        // Clear keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys.clear();
            this.mouseDown = false;
            this.rightMouseDown = false;
        });
    }

    /**
     * Setup mouse event listeners
     */
    private setupMouseEvents(): void {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            this.mousePosition.x = (e.clientX - rect.left) * scaleX;
            this.mousePosition.y = (e.clientY - rect.top) * scaleY;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.enabled) return;

            if (e.button === 0) {
                this.mouseDown = true;
            } else if (e.button === 2) {
                this.rightMouseDown = true;
            }
            e.preventDefault();
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
            } else if (e.button === 2) {
                this.rightMouseDown = false;
            }
        });

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Handle mouse leave
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseDown = false;
            this.rightMouseDown = false;
        });
    }

    /**
     * Setup touch event listeners for mobile
     */
    private setupTouchEvents(): void {
        let touchId: number | null = null;

        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.enabled) return;

            if (e.touches.length > 0) {
                const touch = e.touches[0];
                touchId = touch.identifier;

                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;

                this.mousePosition.x = (touch.clientX - rect.left) * scaleX;
                this.mousePosition.y = (touch.clientY - rect.top) * scaleY;
                this.mouseDown = true;
            }
            e.preventDefault();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (touchId !== null) {
                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (touch.identifier === touchId) {
                        const rect = this.canvas.getBoundingClientRect();
                        const scaleX = this.canvas.width / rect.width;
                        const scaleY = this.canvas.height / rect.height;

                        this.mousePosition.x = (touch.clientX - rect.left) * scaleX;
                        this.mousePosition.y = (touch.clientY - rect.top) * scaleY;
                        break;
                    }
                }
            }
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', (e) => {
            if (touchId !== null) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === touchId) {
                        touchId = null;
                        this.mouseDown = false;
                        break;
                    }
                }
            }
            e.preventDefault();
        });

        this.canvas.addEventListener('touchcancel', (e) => {
            touchId = null;
            this.mouseDown = false;
            e.preventDefault();
        });
    }

    /**
     * Get current input state - AUTHENTIC Heavy Weapon: MOUSE-ONLY control
     * Based on Ghidra Player_UpdateTank @ 0x00412dc0 - no keyboard movement
     */
    public getInput(): InputState {
        return {
            fire: this.mouseDown || this.keys.get('Space') || false,
            special: this.rightMouseDown || this.keys.get('ShiftLeft') || false
        };
    }

    /**
     * Get mouse position
     */
    public getMousePosition(): PIXI.Point {
        return this.mousePosition.clone();
    }

    /**
     * Check if a specific key is pressed
     */
    public isKeyPressed(keyCode: string): boolean {
        return this.keys.get(keyCode) || false;
    }

    /**
     * Clear all input
     */
    public clearInput(): void {
        this.keys.clear();
        this.mouseDown = false;
        this.rightMouseDown = false;
    }

    /**
     * Enable or disable input
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.clearInput();
        }
    }
}