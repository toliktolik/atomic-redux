# Tank Gun Attachment Offset Documentation

## Problem Identified
The gun sprite is not properly attached to the tank in the game. The gun appears misaligned with the tank body.

## Primary Function: Tank_RenderWithPowerUps
**Address:** `0x00401b80`
**Source:** `hwdecompiled/powerups/Tank_RenderWithPowerUps.c`

## Critical Sprite Rendering Order and Offsets

### 1. Tank Shadow (Line 28)
```c
DrawSprite(*(void **)((int)this + 0x6d0), param_1, param_2, param_3 + 0x16, '\x01', 0, 0, '\0');
```
- **Sprite Offset:** `0x6d0`
- **X Position:** `param_2` (no offset)
- **Y Position:** `param_3 + 0x16` (22 pixels down)
- **Centered:** Yes (`'\x01'`)

### 2. Tank Body (Line 29)
```c
DrawSprite(*(void **)((int)this + 0x6cc), param_1, param_2, param_3, '\x01', param_4, 0, '\0');
```
- **Sprite Offset:** `0x6cc`
- **X Position:** `param_2` (no offset)
- **Y Position:** `param_3` (no offset)
- **Centered:** Yes (`'\x01'`)
- **Rotation Frame:** `param_4`

### 3. Main Gun (Line 32-33) - **MISALIGNED COMPONENT**
```c
DrawSprite(*(void **)((int)this + 0x6d4), param_1, param_2 + -0x28, param_3 + -0x34, '\0', iVar1, *(int *)((int)this + 0x97c), '\0');
```
- **Sprite Offset:** `0x6d4`
- **X Position:** `param_2 - 0x28` (-40 pixels left)
- **Y Position:** `param_3 - 0x34` (-52 pixels up)
- **Centered:** No (`'\0'`)
- **Column (Rotation):** `iVar1` (calculated from Math_FloatToUInt64)
- **Row (Weapon Level):** `*(int *)((int)this + 0x97c)`

## Offset Analysis

### Current Gun Offsets (Hexadecimal → Decimal)
- **X Offset:** `-0x28` = **-40 pixels** (shifts gun left)
- **Y Offset:** `-0x34` = **-52 pixels** (shifts gun up)
- **Centering:** Disabled (uses top-left corner positioning)

### Weapon System Offsets
Additional weapon systems are rendered with different offsets:

1. **Weapon System 1** (Lines 38-39)
   - Sprite: `0x860`, Level: `0x988`
   - X: `param_2 - 0x28` (-40 pixels)
   - Y: `param_3 - 0x2a` (-42 pixels)

2. **Weapon System 2** (Lines 42-43)
   - Sprite: `0x85c`, Level: `0x990`
   - X: `param_2 - 0x28` (-40 pixels)
   - Y: `param_3 - 0x34` (-52 pixels)

3. **Weapon System 3** (Lines 46-47)
   - Sprite: `0x868`, Level: `0x984`
   - X: `param_2` (no offset)
   - Y: `param_3 - 2` (-2 pixels)
   - Centered: Yes

4. **Weapon System 4** (Lines 50-51)
   - Sprite: `0x864`, Level: `0x994`
   - X: `param_2` (no offset)
   - Y: `param_3 + 4` (+4 pixels)
   - Centered: Yes

## Memory Layout
```
Tank Object Memory Layout:
+0x6cc: Tank body sprite pointer
+0x6d0: Tank shadow sprite pointer
+0x6d4: Main gun sprite pointer (gun.png)
+0x708: Shield/effect sprite pointer
+0x85c: Weapon system 2 sprite
+0x860: Weapon system 1 sprite
+0x864: Weapon system 4 sprite
+0x868: Weapon system 3 sprite
+0x97c: Main gun upgrade level (row selector)
+0x984: Weapon 3 upgrade level
+0x988: Weapon 1 upgrade level
+0x990: Weapon 2 upgrade level
+0x994: Weapon 4 upgrade level
```

## Potential Fix for Gun Alignment

The gun appears misaligned because:
1. The gun uses **non-centered positioning** (`'\0'` instead of `'\x01'`)
2. The offsets `-0x28` (X) and `-0x34` (Y) may need adjustment

### Recommended Adjustments
To properly center the gun on the tank, consider:
- Adjusting X offset from `-0x28` to a value that centers the gun horizontally
- Adjusting Y offset from `-0x34` to a value that aligns with the tank turret
- Potentially enabling centered rendering (change last `'\0'` to `'\x01'`)

## DrawSprite Function Signature
```c
DrawSprite(sprite_ptr, graphics_context, x_pos, y_pos, centered_flag, column_index, row_index, alpha)
```
- `centered_flag`: `'\x01'` = centered, `'\0'` = top-left corner
- `column_index`: For multi-frame sprites (rotation angle)
- `row_index`: For multi-row sprites (upgrade level)

## Usage in Game
The function is called from:
1. `Game_MainRenderingSystem.c:498` - Main game rendering loop
2. `IntroScreen_Destructor.c:231` - Intro screen tank display
3. `WeaponUpgradeScreen_Draw.c:220` - Weapon upgrade screen (X=320, Y=400)

## Notes
- The main gun's row selection (`0x97c`) determines which weapon level sprite row to use
- The column selection (`iVar1`) is calculated from rotation angle using `Math_FloatToUInt64()`
- The misalignment visible in the screenshot is due to these hardcoded offset values