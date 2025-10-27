/**
 * Animation Configuration - Defines frame counts and animation properties for sprites
 */

export interface SpriteAnimationConfig {
    frameCount: number;
    frameRate: number; // ms per frame
    loop: boolean;
    rowCount?: number; // for multi-row sprite grids
}

export const AnimationConfig: { [spriteName: string]: SpriteAnimationConfig } = {
    // Tank sprites - VERIFIED FROM ORIGINAL: 800x55px total, 80x55px per frame, 10 frames
    'tank': {
        frameCount: 10,
        frameRate: 80,
        loop: true
    },

    // Gun sprites - VERIFIED FROM ORIGINAL: 21 frames for rotation (0x15 from source code), 5 rows for weapon levels
    'gun': {
        frameCount: 21,
        rowCount: 5,     // 5 weapon upgrade levels as rows
        frameRate: 100,
        loop: false // Static frames for angles, not animated
    },

    // Enemy aircraft - VERIFIED FROM ORIGINAL SPRITE FILES
    'propfighter': {
        frameCount: 4, // 280x30px total, 70x30px per frame
        frameRate: 120,
        loop: true
    },
    'smalljet': {
        frameCount: 1, // 80x30px total, single frame
        frameRate: 200,
        loop: false
    },
    'jetfighter': {
        frameCount: 1, // 80x28px total, single frame
        frameRate: 150,
        loop: false
    },
    'bomber': {
        frameCount: 1, // 120x44px total, single frame
        frameRate: 180,
        loop: false
    },
    'bigbomber': {
        frameCount: 1, // 160x50px total, single frame
        frameRate: 200,
        loop: false
    },
    'fatbomber': {
        frameCount: 1, // 200x77px total, single frame
        frameRate: 220,
        loop: false
    },
    'superbomber': {
        frameCount: 1, // 160x43px total, single frame
        frameRate: 190,
        loop: false
    },
    'deltabomber': {
        frameCount: 1, // 110x36px total, single frame
        frameRate: 180,
        loop: false
    },

    // Helicopters - VERIFIED FROM ORIGINAL: rotor animations
    'smallcopter': {
        frameCount: 5, // 450x40px total, 90x40px per frame
        frameRate: 60,
        loop: true
    },
    'medcopter': {
        frameCount: 7, // 700x60px total, 100x60px per frame
        frameRate: 70,
        loop: true
    },
    'bigcopter': {
        frameCount: 9, // 900x60px total, 100x60px per frame
        frameRate: 50,
        loop: true
    },

    // Ground vehicles - VERIFIED FROM ORIGINAL
    'truck': {
        frameCount: 1, // Static sprite
        frameRate: 150,
        loop: false
    },
    'enemytank': {
        frameCount: 10, // 900x60px total, 90x60px per frame
        frameRate: 100,
        loop: true
    },
    'dozer': {
        frameCount: 1, // Static sprite
        frameRate: 140,
        loop: false
    },

    // Special units
    'satellite': {
        frameCount: 1, // Static sprite
        frameRate: 200,
        loop: false
    },
    'blimp': {
        frameCount: 1, // Static sprite
        frameRate: 300,
        loop: false
    },
    'cruise': {
        frameCount: 1, // Static sprite
        frameRate: 160,
        loop: false
    },
    'deflector': {
        frameCount: 1, // Static sprite
        frameRate: 120,
        loop: false
    },
    'strafer': {
        frameCount: 1, // Static sprite
        frameRate: 140,
        loop: false
    },

    // Projectiles - VERIFIED FROM ORIGINAL
    'bullets': {
        frameCount: 21, // 504x120px total, 24x24px per frame, 21x5 grid
        rowCount: 5,    // 5 rows of different bullet types
        frameRate: 100,
        loop: false
    },
    'dumbbomb': {
        frameCount: 10, // 260x26px total, 26x26px per frame
        frameRate: 100,
        loop: true
    },
    'missile': {
        frameCount: 20, // 600x30px total, 30x30px per frame
        frameRate: 80,
        loop: true
    },
    'rocket': {
        frameCount: 21, // 546x26px total, 26x26px per frame
        frameRate: 100,
        loop: true
    },
    'bigmissile': {
        frameCount: 10, // 300x200px total, 30x40px per frame (using first row)
        frameRate: 80,
        loop: true
    },

    // Effects
    'explosion': {
        frameCount: 12,
        frameRate: 40,
        loop: false
    },
    'muzzleflash': {
        frameCount: 4,
        frameRate: 30,
        loop: false
    },
    'smoke': {
        frameCount: 6,
        frameRate: 100,
        loop: true
    }
};