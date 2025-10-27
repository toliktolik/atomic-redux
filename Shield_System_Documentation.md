# Heavy Weapon Shield System Documentation

## Critical Discovery: Shield.png is a 10-Frame Animated Alpha Mask

### Shield Sprite Analysis
**File:** `HeavyWeapon/Images/shield.png`
**Format:** 10-frame horizontal sprite sheet with alpha channel
**Frame Count:** 10 frames (0-9)
**Usage:** Animated shield bubble effect with dynamic colorization

## Shield Rendering System

### Memory Layout
```c
Tank Object:
+0x414: Animation counter (used for frame selection)
+0x708: Shield sprite pointer (shield.png)
+0x920: Shield state object pointer
+0x96c: Shield color state (1=green, 2=yellow, 3=red)

Game System:
+0x844: Shield sprite loaded in sprite manager
```

### Core Rendering Function: Tank_RenderWithPowerUps (0x00401b80)

#### Frame Selection Algorithm (Lines 84-85)
```c
DrawSprite(*(void **)((int)this + 0x708),    // Shield sprite at offset 0x708
           param_1,                           // Graphics context
           param_2,                           // X position
           param_3 + 2,                       // Y position (+2 pixels)
           '\x01',                            // Centered
           (*(int *)((int)this + 0x414) % 100) / 10,  // Frame index (0-9)
           0,                                 // Row (single row sprite)
           '\0');                            // Alpha
```

**Frame Calculation:** `(counter % 100) / 10` produces values 0-9, cycling through all 10 frames

### Shield Colorization System

The shield uses a sophisticated color state system based on shield strength/status:

#### State 1: Strong Shield (Green Tint)
```c
if (iVar1 == 1) {
    CreateColor(this_00, 0xFF, 0x40, 0, 0x80);  // Red=255, Green=64, Blue=0, Alpha=128
}
```

#### State 2: Medium Shield (Yellow/White Tint)
```c
if (iVar1 == 2) {
    CreateColor(this_00, 0xFF, 0xFF, 0, 0x80);  // Red=255, Green=255, Blue=0, Alpha=128
}
```

#### State 3: Weak Shield (Red Tint)
```c
if (iVar1 == 3) {
    CreateColor(this_00, 0x00, 0xFF, 0, 0x80);  // Red=0, Green=255, Blue=0, Alpha=128
}
```

### Rendering Pipeline

1. **Check Shield State** (Line 56-61)
   ```c
   if (*(int *)((int)this + 0x96c) == 0) return;  // No shield active
   if (*(int *)((int)this + 0x920) == 0) return;  // No shield object
   ```

2. **Set Color Based on State** (Lines 62-78)
   - Determines RGB values based on shield strength
   - Creates color matrix with `CreateColor()`

3. **Enable Special Rendering Modes** (Lines 82-83)
   ```c
   SexyWidget_SetColorizeFlag2(param_1, 1);  // Enable colorization
   SexyWidget_SetDrawMode(param_1, 1);       // Enable additive blending
   ```

4. **Draw Shield Sprite** (Lines 84-85)
   - Renders current animation frame
   - Position offset: Y+2 pixels from tank

5. **Apply Alpha Effects** (Lines 86-108)
   - Additional alpha blending for fade effects
   - Uses `Graphics_SetImageAlpha()` for transparency

6. **Reset Rendering Modes** (Lines 109-110)
   ```c
   SexyWidget_SetDrawMode(param_1, 0);       // Disable special modes
   SexyWidget_SetColorizeFlag2(param_1, 0);  // Disable colorization
   ```

## Shield Animation Cycle

The 10 frames create a pulsing bubble effect:
- **Frames 0-2:** Shield expanding (fade in)
- **Frames 3-6:** Shield at full strength (solid)
- **Frames 7-9:** Shield contracting (fade out)

The animation counter at offset 0x414 continuously increments, creating smooth animation.

## Alpha Channel Masking

Shield.png uses grayscale values as an alpha mask:
- **White pixels:** Fully opaque shield areas
- **Gray pixels:** Semi-transparent areas
- **Black pixels:** Fully transparent (no shield)

This creates the bubble/energy field appearance with soft edges.

## Related Shield Files

### Additional Shield Sprites
- `deflectshield.png`: Used for deflector enemies
- `shieldzap.png`: Shield impact/damage effect

### Shield Functions
```c
PowerUp_ProcessShield (0x0042e900)     // Shield power-up logic
PowerUp_SpawnShield (0x00488540)       // Shield spawn function
Powerup_ShieldUpdate (0x00447a30)      // Shield state updates
Boss_RainerRenderShield (0x00434f70)   // Boss shield rendering
```

## Shield Loading Process

From `Powerup_ShieldUpdate` (Line 34):
```c
*(undefined4 *)((int)this + 0x5c) =
    *(undefined4 *)(*(int *)(*(int *)((int)this + 0x58) + 0x5c) + 0x844);
```

The shield sprite is loaded from offset 0x844 in the main sprite manager.

## Implementation Details

### Why This Was Missed
1. The sprite appears as a simple circle, but is actually 10 frames
2. The alpha channel masking wasn't immediately obvious
3. The colorization system obscures the original grayscale nature
4. The frame selection formula `(counter % 100) / 10` wasn't recognized as animation

### Correct XML Entry
```xml
<image name="shield.png" frames="10" type="animated_alpha_mask" usage="player_shield">
    <sprite_offset>0x708</sprite_offset>
    <animation_counter_offset>0x414</animation_counter_offset>
    <color_state_offset>0x96c</color_state_offset>
    <frame_formula>(counter % 100) / 10</frame_formula>
    <rendering_modes>
        <colorization>true</colorization>
        <additive_blending>true</additive_blending>
        <alpha_masking>true</alpha_masking>
    </rendering_modes>
    <color_states>
        <state value="1" name="strong" color="green" rgb="255,64,0" />
        <state value="2" name="medium" color="yellow" rgb="255,255,0" />
        <state value="3" name="weak" color="red" rgb="0,255,0" />
    </color_states>
</image>
```

## Summary

The shield system is far more sophisticated than initially documented:
- **10-frame animation** creating a pulsing effect
- **Alpha channel masking** for transparency
- **Dynamic colorization** based on shield strength
- **Additive blending** for energy field appearance
- **Centered rendering** with +2 pixel Y offset

This creates the iconic shield bubble effect that changes color as it weakens, providing visual feedback to the player about their protection status.