# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a reverse engineering analysis of the Heavy Weapon Deluxe game by PopCap Games. The project uses Ghidra for binary analysis with MCP (Model Context Protocol) integration to systematically rename and document the game's internal functions and structures.

## Key Components

### Ghidra Analysis Setup
- **Binary**: `heavy weapon deluxe.exe` (Windows PE executable, 32-bit)
- **MCP Integration**: GhidraMCP bridge in `GhidraMCP-release-1-4/` directory
- **Configuration**: `.mcp.json` configures the Ghidra server connection on port 8080

### Reference Materials
- **atomic_survival_redux/** is a reimplementation of the decompiled Heavy Weapon windows game into TypeScript/Pixi.js web version. this reimplementation is solely focused on the survival mode without bosses. this is our working directory to build anything.
- **osframework/**: SexyAppFramework source code (the game engine Heavy Weapon is built on)
- **HeavyWeapon/**: Complete game resource directory with full campaign data
  - `data/craft.xml`: Complete enemy unit database (20 craft types with armor, weapons, points)
  - `data/levels.xml`: Campaign regions with population data, exports, intel briefings (10 regions)
  - `data/waves.xml`: Enemy wave spawning patterns (19 campaign levels with 306 total waves)
  - `data/bosses.xml`: Boss specifications with Level1/Level2 difficulty scaling (10 boss types)
  - `data/survival*.xml`: Survival mode configurations (survival0.xml through survival9.xml)
  - `Images/Anims/Anims.xml`: Animation specifications for all 10 regional environments plus survival mode
- **res/**: Minimal survival-mode only assets (deprecated - use HeavyWeapon/ instead)
  - Key files: `GAME_DOCUMENTATION.md`, `ENHANCED_GAME_DOCUMENTATION.md`
                                        	
## Development Workflow

### Starting Ghidra Analysis
```bash                               	
# Ensure Ghidra MCP server is running first
python /Users/2lik/ghidra/GhidraMCP-release-1-4/bridge_mcp_ghidra.py --ghidra-server http://127.0.0.1:8080/
```
### PIXI.JS
This project is developed in pixi.js - always consult https://pixijs.com/llms-medium.txt when you are dealing with typescript codebase in pixi.js

### Function Naming Strategy
When analyzing and renaming functions, use this systematic approach:

1. **Reference SexyAppFramework patterns**: Study `osframework/source/SexyAppFramework/` for typical class structures and method signatures when reviewing decompiled code e.g. through Ghidra MCP
2. **Cross-reference game data**: Use `res/` XML files to understand game mechanics and map functions to features

### Already Identified Function Mappings
Key functions have been renamed following this pattern:

**Core Application Architecture:**
- `HeavyWeaponApp_Constructor` (0x0040f190): Main application class constructor following SexyAppBase pattern
- `CreateHeavyWeaponApp` (0x00401090): Application factory function
- `GameUpdate_ProcessFrame` (0x00401040): Main game loop update cycle

**Subsystem Constructors:**
- `WeaponSystem_Constructor` (0x0042ff80): Weapon management system
- `UIButton_Constructor` (0x0041cec0): UI element creation (handles "GO!", "MAIN" buttons)
- `AudioSystem_Constructor` (0x00423d90): Sound and music initialization

**Rendering Pipeline:**
- `RenderingSystem_DrawEffects` (0x004011b0): Complex particle and effect rendering
- `DrawSprite` (0x0042d6b0): High-level sprite drawing with positioning
- `Graphics_BlitImage` (0x00479210): Low-level image blitting operations

## Architecture Understanding

### Game Engine Structure
Heavy Weapon is built on PopCap's SexyAppFramework, following these patterns:
- Main application derives from `SexyAppBase`
- Uses widget-based UI system with `WidgetManager`
- Audio through `SoundManager` and `MusicInterface` abstractions
- Graphics via `DDInterface` (DirectDraw) with fallbacks

### Game-Specific Systems
Based on analysis of XML data:

**Complete Campaign Structure (Based on XML Analysis):**
- **19 Campaign Levels**: Full progression from Level 1-19 with escalating difficulty - ignore, not in scope
- **10 Regions**: FRIGISTAN, BLASTNYA, PETROVAKIA, DICTASTROIKA, ZAMBLAMIA, TANKYLVANIA, VODKAVANIA, ANTAGONISTAN, KILLINGRAD, RED STAR HQ - ignore, not in scope
- **306 Total Waves**: Distributed across 19 levels with varying wave lengths (1000-2900ms) - ignore, not in scope except SURVIVAL waves
- **10 Boss Types**: Helicopter (TWINBLADE), Battleship, Rainer (WAR BLIMP), Wrecker (WAR WRECKER), Head (BUSTCZAR), Ape (KOMMIE KONG), Eye (EYEBOT), Worm (MECHWORM), Robot (X-BOT), Final (SECRET WEAPON) - ignore, bosses not in scope

**Complete Enemy Classification System (craft.xml):**
- **20 Craft Types**: PROPFIGHTER through CRUISE with detailed specifications
- always refer to craft.xml for the full list of enemies

**Weapon Systems:**
- **Armory Upgrades**: 6 weapon types (Defense Orb, Homing Missiles, Laser, Rockets, Flak Cannon, Thunderstrike) each with 3 upgrade levels
- **Enemy Weapons**: 8 distinct types from basic Dumb Bombs (10 pts) to Atomic Bombs (200 pts)
- **Power-ups**: 7 types including Nukes, Shields, Mega-Laser, Speed Boost, Rapid Fire, Gun Power Up, Spread Shot

## Analysis Best Practices

1. **Function Identification**: Look for constructor patterns (vtable setup, member initialization) and cross-reference with SexyAppFramework class structures
2. **Game Logic Mapping**: Use enemy names from `craft.xml` and level data to identify game-specific functions
3. **Resource Loading**: Functions handling sprite loading often reference the `Images/` asset structure
4. **UI Systems**: Button and menu functions typically involve string literals like those seen in the constructor ("GO!", "MAIN")

## XML Structure Analysis

### Core Data Files Structure

**craft.xml**: Enemy definitions with critical function mapping hints
```xml
<Craft name="PROPFIGHTER" desc="R-44 Hominov prop plane" arms="None" points="50" armor="1" />
<!-- 20 total craft types with armor values 1-400, points 50-25000 -->
```

**bosses.xml**: Boss specifications with Level1/Level2 scaling - ignore bosses
```xml
<Helicopter info="ENCOUNTERED: TWINBLADE">
  <Level1 armor="300" score="10000">
    <Turret armor="80" fire="175" stationary="yes"/>
    <Launcher armor="100" fire="250" speed=".75"/>
  </Level1>
  <Level2 armor="4000" score="80000"><!-- Enhanced difficulty scaling -->
```

**waves.xml**: Enemy wave spawning patterns (19 levels, 306 waves total) - ignore except survival waves like survival0.xml
```xml
<Level><!-- Level 1 -->
  <Wave length="1000">
    <Craft id="SMALLJET" qty="6"/>
    <Craft id="PROPFIGHTER" qty="8"/>
  </Wave>
```

**levels.xml**: Regional campaign data with population/export metadata - ignore, not in scope as we are only focused on survival mode
```xml
<Level name="FRIGISTAN" length="10000">
  <Intel text="Population: 32,440&#13;Primary Export: Snowcones&#13;..."/>
</Level>
```

**Anims.xml**: Animation system with plane layering (4=Sky, 3=Far bg, 2=bg, 1=ground) - ignore everything except survival
```xml
<Anim name="frigistan\yetti" type="looping" frames="6" speed=".1" plane="1" offset="640" y="356" mx="0" nuke="no" rare="yes"/>
<!-- 10 regional environments + survival mode animations -->
```


### Survival Mode Structure
- **10 Survival Configurations**: survival0.xml through survival9.xml with escalating difficulty
- **20-Level Progression**: Each survival mode has 20 increasingly difficult levels
- **Specialized Wave Patterns**: Different enemy compositions per survival difficulty tier

## Function Search Strategies Based on Complete Resource Analysis

### Enemy Spawning Functions (craft.xml + waves.xml Analysis)
Search for functions managing enemy creation and wave spawning:
- **Craft ID Processing**: Functions handling PROPFIGHTER, SMALLJET, BOMBER, JETFIGHTER, TRUCK, BIGBOMBER, SMALLCOPTER, MEDCOPTER, BIGCOPTER, DELTABOMBER, DELTAJET, BIGMISSILE, SUPERBOMBER, FATBOMBER, BLIMP, SATELLITE, STRAFER, ENEMYTANK, DOZER, DEFLECTOR, CRUISE
- **Wave Management**: Functions processing 306 total waves across 19 levels with wave lengths 1000-2900ms
- **Quantity Scaling**: Systems handling enemy quantities from 1-50 per wave in late game
- **Armor Processing**: Functions applying armor values 1-400 to spawned enemies
- **Points System**: Score calculation for enemy destruction (50pts-25000pts range)

### Weapon System Functions
- **Armory System**: Functions handling upgrade points, 3-tier upgrade system
- **Player Weapons**: "DefenseOrb", "HomingMissiles", "LaserCannon", "RocketPods", "FlakCannon", "Thunderstrike"
- **Enemy Weapons**: "DumbBomb", "LaserGuidedBomb", "ArmoredBomb", "FragBomb", "AtomicBomb", "EnergyBall", "BurstingRocket"

### Power-up System Functions
- **Core Power-ups**: "Nuke", "Shield", "MegaLaser", "SpeedBoost", "RapidFire", "GunPowerUp", "SpreadShot"
- **Delivery System**: Functions handling ally white chopper drops

### Level/Animation System Functions (levels.xml + Anims.xml Analysis)
Search for level progression and environmental animation systems:
- **Region Handlers**: Functions processing FRIGISTAN, BLASTNYA, PETROVAKIA, DICTASTROIKA, ZAMBLAMIA, TANKYLVANIA, VODKAVANIA, ANTAGONISTAN, KILLINGRAD, "RED STAR HQ" - ignore everything except SURVIVAL
- **Intel System**: Functions displaying population data, primary exports, temperatures, political information
- **Animation System**: Functions managing 4-plane layering system (Sky=4, Far bg=3, bg=2, ground=1)
- **Regional Animations**: Systems handling rare/destructible animations (nuke="yes", rare="yes" parameters)
- **Animation Types**: "looping", "pingpong" animation processing with frame delays and speed controls
- **Survival Mode**: Functions managing 10 survival configurations with propaganda posters, markers, control towers

ALWAYS STUDY HeavyWeapon_Asset_Hints_v2.xml  HeavyWeapon_Sound_System_Mapping.xml when making any decisions about resources, image files and xml file review

## Working with MCP Tools

The repository includes Ghidra MCP integration allowing programmatic analysis:
- Use `mcp__ghidra__search_functions_by_name` to find function patterns
- Use `mcp__ghidra__decompile_function` to examine function implementations  
- Use `mcp__ghidra__rename_function` to apply systematic naming conventions
- Cross-reference findings with `res/` XML data for validation


ignore directories: Fonts, Music
