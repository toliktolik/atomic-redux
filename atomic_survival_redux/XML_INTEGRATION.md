# XML Data Integration

## Overview

The game now supports loading data from Heavy Weapon's original XML files. All XML files have been verified to contain proper `<root>` elements for browser XML parser compatibility.

## XML Files Structure

All XML files follow this structure for browser compatibility:
```xml
<?xml version="1.0"?>
<root>
    <!-- Content here -->
</root>
```

## Integrated XML Files

### 1. **craft.xml** - Enemy Definitions
- Contains all 20+ enemy types with armor and point values
- Loaded automatically on game start
- Falls back to hardcoded defaults if loading fails

### 2. **waves.xml** - Campaign Wave Patterns
- 19 levels with 306 total waves
- Each wave specifies enemy types and quantities
- Used as templates for wave generation

### 3. **bosses.xml** - Boss Configurations
- 10 boss types with Level1/Level2/Level3 scaling
- Component-based boss architecture
- Not yet fully integrated (future enhancement)

### 4. **survival0-9.xml** - Survival Mode Waves
- 10 difficulty tiers
- 20 waves per survival mode
- Currently loads survival0.xml as default

## Implementation Details

### XMLDataLoader Class (`src/core/XMLDataLoader.ts`)
Handles all XML parsing with proper error handling:
- Uses browser's native DOMParser
- Validates for `<root>` element
- Provides TypeScript interfaces for data structures
- Falls back to defaults on parse errors

### Data Flow
1. **AssetLoader** loads XML files on game start
2. **XMLDataLoader** parses files and validates structure
3. **WaveSystem** uses XML data for enemy spawning
4. **Enemy** class uses XML craft data for stats

### File Serving Setup
The Vite dev server is configured to serve XML files:
- Symbolic link: `public/HeavyWeapon/data` → actual XML files
- CORS enabled for local development
- Parent directory access allowed in `vite.config.ts`

## Usage Examples

### Accessing Craft Data
```typescript
const craftData = AssetLoader.getCraft('BOMBER');
if (craftData) {
    console.log(`Bomber has ${craftData.armor} armor and gives ${craftData.points} points`);
}
```

### Using Wave Data
```typescript
const waveData = AssetLoader.getWaveData();
// WaveSystem automatically uses this data when available
```

## Benefits of XML Integration

1. **Authentic Gameplay**: Uses original Heavy Weapon balance values
2. **Easy Modding**: Players can modify XML files to customize difficulty
3. **Data-Driven Design**: No need to recompile to adjust game balance
4. **Fallback Support**: Game works even if XML files are missing

## Fallback Behavior

If XML files fail to load:
1. Console warning is displayed
2. Hardcoded defaults from `GameConstants.ts` are used
3. Game remains fully playable

## Future Enhancements

1. **Boss Integration**: Fully integrate boss spawning from `bosses.xml`
2. **Level Progression**: Use `levels.xml` for campaign mode
3. **Animation Data**: Load animation specs from `Anims.xml`
4. **Credits Display**: Show credits from `credits.xml`

## Debugging

Enable console to see XML loading status:
```
Loaded 20 craft types from XML
Loaded 19 levels of waves from XML
Loaded 10 boss types from XML
Loaded survival mode 0 data
Using XML data for BOMBER: armor=10, points=250
```

## XML Validation

All XML files have been validated to ensure:
- Proper `<?xml version="1.0"?>` declaration
- `<root>` element wrapping all content
- Valid XML syntax (no parsing errors)
- Browser DOMParser compatibility

## Performance

- XML files are loaded once at game start
- Parsed data is cached in memory
- No runtime XML parsing during gameplay
- Minimal impact on load time (~100ms total)