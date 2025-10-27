# Heavy Weapon Mouse Aiming System Documentation

## Overview
The game implements a sophisticated mouse-to-tank aiming system where:
1. The gun follows the mouse cursor position
2. Bullets fly directly towards the cursor location
3. The gun sprite rotates to point at the cursor

## Key Functions and Addresses

### 1. Player_UpdateTank (0x00412dc0)
**Purpose:** Main tank update function that calculates gun angle from mouse position

#### Critical Mouse-to-Gun Angle Calculation (Lines 66-73):
```c
// Get mouse position relative to tank
iVar14 = *(int *)((int)param_1 + 100);  // Tank Y position (0x64)
iVar7 = *(int *)((int)param_1 + 0x98);   // Mouse Y position

// Calculate angle using arctangent
fVar17 = fpatan(
    (float10)(*(int *)((int)param_1 + 0x60) + -0x140) - *(double *)((int)param_1 + 0x90),  // X difference
    (float10)((iVar7 - iVar14) + -0xc)                                                      // Y difference
);

// Convert radians to game rotation units
fVar17 = fVar17 * (float10)_DAT_0052c698;
local_24 = (double)fVar17;
```

**Key Memory Offsets:**
- `0x60`: Tank X position (screen coordinates)
- `0x64`: Tank Y position (100 decimal)
- `0x90`: Tank X velocity/offset
- `0x98`: Mouse Y position
- `0x118`: Current gun rotation angle
- `0x120`: Target gun rotation angle

**Angle Constraints:**
```c
// Clamp angle between -180 and +180 degrees
if (fVar17 < (float10)_DAT_0052c690) {
    local_24._4_4_ = 0xc0568000;  // -180 degrees
} else if (local_24 > _DAT_0052c688) {
    local_24._4_4_ = 0x40568000;  // +180 degrees
}
```

### 2. Projectile Creation System

#### Projectile_CreateAndFire (0x00411d40)
Creates a new projectile when player fires:
```c
void Projectile_CreateAndFire(int param_1) {
    if (player_can_fire) {
        this = operator_new(0x5c);  // Allocate projectile
        piVar1 = Projectile_Constructor(this, param_1);
        // Add to projectile list
    }
}
```

#### Projectile_CreateWithVelocity (0x00411850)
**Purpose:** Creates projectile with velocity towards mouse cursor

**Critical Velocity Calculation:**
```c
// Calculate velocity components from angle
fVar6 = fcos((float10)param_3);  // param_3 is the gun angle
pdVar3[2] = (double)-(fVar6 * fVar5);  // X velocity (negative for left)

fVar6 = fsin((float10)param_3);
pdVar3[3] = (double)(fVar6 * fVar5);   // Y velocity
```

**Memory Layout:**
```c
Projectile Object:
+0x00: X position (double)
+0x08: Y position (double)
+0x10: X velocity (double)
+0x18: Y velocity (double)
+0x34: Sprite pointer
```

### 3. Mouse Input Processing

#### Input_ProcessMouse (0x0043c510)
Processes raw mouse input and updates game state:
```c
void Input_ProcessMouse(int param_1) {
    // Updates mouse position at offsets 0x08, 0x0c, 0x10, 0x14
    SexyAppFramework_HandleActivation(
        *(void **)(param_1 + 0x4c),
        *(int *)(param_1 + 8),    // Mouse X
        *(int *)(param_1 + 0xc),   // Mouse Y
        *(int *)(param_1 + 0x10),  // Mouse delta X
        *(int *)(param_1 + 0x14)   // Mouse delta Y
    );
}
```

## Complete Aiming Pipeline

### Step 1: Mouse Position Capture
```
Input_ProcessMouse() → Updates mouse X/Y at offsets 0x08/0x0c
```

### Step 2: Angle Calculation
```
Player_UpdateTank() → atan2(mouseY - tankY, mouseX - tankX)
                   → Stores angle at offset 0x120
```

### Step 3: Gun Rotation
```
Tank_RenderWithPowerUps() → Uses angle from 0x120
                         → Selects gun.png frame based on angle
                         → DrawSprite with rotation frame
```

### Step 4: Bullet Trajectory
```
Projectile_CreateWithVelocity() → Uses same angle from 0x120
                               → velocity.x = -cos(angle) * speed
                               → velocity.y = sin(angle) * speed
```

## Coordinate System

### Screen Coordinates
- Origin: Top-left (0, 0)
- Screen width: 640 pixels (0x280)
- Screen height: 480 pixels (0x1e0)
- Tank center X: 320 pixels (0x140)

### Angle System
- 0° = Right (3 o'clock)
- 90° = Down (6 o'clock)
- ±180° = Left (9 o'clock)
- -90° = Up (12 o'clock)

### Important Constants
```c
_DAT_0052c698: Radians to degrees conversion factor
_DAT_0052c690: Minimum angle constraint
_DAT_0052c688: Maximum angle constraint
_DAT_0052c5c0: Default bullet speed
_DAT_0052c628: Gun offset adjustment
```

## Gun-Following-Mouse Algorithm

```c
// Simplified algorithm
float CalculateGunAngle(int mouseX, int mouseY, int tankX, int tankY) {
    float deltaX = mouseX - tankX;
    float deltaY = mouseY - tankY - 12;  // -12 pixel adjustment

    float angle = atan2(deltaX, deltaY);
    angle = angle * RADIANS_TO_GAME_UNITS;

    // Clamp to valid range
    if (angle < -180) angle = -180;
    if (angle > 180) angle = 180;

    return angle;
}

void FireBullet(float gunAngle, int tankX, int tankY) {
    Bullet bullet;
    bullet.x = tankX;
    bullet.y = tankY - 10;  // Spawn above tank

    bullet.velocityX = -cos(gunAngle) * BULLET_SPEED;
    bullet.velocityY = sin(gunAngle) * BULLET_SPEED;

    AddToProjectileList(bullet);
}
```

## Sprite Rotation Mapping

The gun.png sprite sheet uses columns for rotation angles:
- Column 0: 0° (pointing right)
- Column 1-9: Incremental rotations
- Total: ~10 rotation frames for smooth aiming

The exact frame is calculated:
```c
int rotationFrame = (int)((angle + 180) / 36);  // 360° / 10 frames = 36° per frame
DrawSprite(gun_sprite, x, y, centered, rotationFrame, weaponLevel, alpha);
```

## Critical Bug: Gun Offset
As documented in Tank_Gun_Offset_Documentation.md, the gun sprite is misaligned:
- Current offset: X=-40, Y=-52 pixels from tank center
- This offset affects visual alignment but NOT the aiming calculation
- Bullets still fly correctly towards cursor despite visual misalignment

## Summary
The mouse aiming system uses standard trigonometry (atan2) to calculate the angle between tank and cursor, then applies this angle to both:
1. Gun sprite rotation (visual feedback)
2. Bullet velocity vector (gameplay mechanics)

This ensures bullets always fly directly towards where the player is aiming, regardless of the gun's visual position.