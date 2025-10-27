# Resource Access Setup

## ✅ Complete Resource Access Configured

The game now has full access to all Heavy Weapon resources including:
- **XML Data Files** (craft, waves, bosses, levels, survival modes)
- **Images** (sprites, backgrounds, effects)
- **Sounds** (effects, weapon sounds, explosions)
- **Music** (background tracks)
- **Fonts** (game fonts)

## 📁 Directory Structure

```
atomic_survival_redux/
├── public/
│   └── HeavyWeapon/          # Symbolic links to actual resources
│       ├── data/             → /Users/2lik/ghidra/HeavyWeapon/data
│       ├── Images/           → /Users/2lik/ghidra/HeavyWeapon/Images
│       ├── Sounds/           → /Users/2lik/ghidra/HeavyWeapon/Sounds
│       ├── Music/            → /Users/2lik/ghidra/HeavyWeapon/Music
│       └── Fonts/            → /Users/2lik/ghidra/HeavyWeapon/Fonts
└── src/
    └── core/
        ├── AssetLoader.ts     # Loads all resources
        ├── XMLDataLoader.ts   # Parses XML files
        └── ResourcePaths.ts   # Centralized resource paths
```

## 🔧 Configuration

### Vite Server Configuration (`vite.config.ts`)
```typescript
server: {
    cors: true,
    fs: {
        allow: ['..']  // Allows serving from parent directories
    }
}
```

### Symbolic Links Created
All resources are accessible via symbolic links in the `public/HeavyWeapon/` directory:
```bash
data -> /Users/2lik/ghidra/HeavyWeapon/data
Images -> /Users/2lik/ghidra/HeavyWeapon/Images
Sounds -> /Users/2lik/ghidra/HeavyWeapon/Sounds
Music -> /Users/2lik/ghidra/HeavyWeapon/Music
Fonts -> /Users/2lik/ghidra/HeavyWeapon/Fonts
```

## 🎮 Resource Loading Flow

1. **Game Start**: `AssetLoader.loadAll()` is called
2. **Texture Loading**: Attempts to load actual sprites from `/HeavyWeapon/Images/`
3. **XML Loading**: Loads game data from `/HeavyWeapon/data/`
4. **Fallback**: Creates placeholder textures for any missing images
5. **Caching**: All loaded resources are cached in memory

## 📊 Available Resources

### Images (Confirmed Present)
- **Tank**: tank.png, tankshadow.png, tankflash.png
- **Enemies**: bomber.png, jetfighter.png, smalljet.png, smallcopter.png, bigbomber.png, etc.
- **Effects**: explode1.png, smoke.png, shield.png
- **Projectiles**: bullet.png, missile.png, rocket.png, bomb.png
- **UI**: Various UI elements and backgrounds

### XML Data Files (All with `<root>` elements)
- craft.xml - Enemy definitions
- waves.xml - Wave patterns
- bosses.xml - Boss configurations
- levels.xml - Campaign levels
- survival0-9.xml - Survival mode waves

### Sounds & Music
- Full sound effect library
- Background music tracks
- Weapon and explosion sounds

## 🚀 Usage in Code

### Loading Textures
```typescript
// AssetLoader automatically tries to load actual images
const texture = AssetLoader.getTexture('bomber');
// Falls back to placeholder if image not found
```

### Accessing XML Data
```typescript
// Get enemy stats from XML
const bomberData = AssetLoader.getCraft('BOMBER');
console.log(`Bomber armor: ${bomberData.armor}`);
```

### Resource Paths Helper
```typescript
import { ResourcePaths } from './core/ResourcePaths';

// Use centralized paths
const tankImage = ResourcePaths.IMAGES.TANK_BODY;
const missileSound = ResourcePaths.SOUNDS.MISSILE_LAUNCH;
```

## 🔍 Verification

To verify resources are loading correctly:

1. Run the game: `npm run dev`
2. Open browser console (F12)
3. Look for messages like:
   - "Loaded texture: bomber from /HeavyWeapon/Images/bomber.png"
   - "Loaded 20 craft types from XML"
   - "Using XML data for BOMBER: armor=10, points=250"

## ⚡ Performance

- **Lazy Loading**: Textures load on demand
- **Caching**: All resources cached after first load
- **Fallbacks**: Placeholder assets ensure game always runs
- **Optimized**: Only loads what's needed

## 🎨 Fallback System

If actual resources fail to load:
1. **Textures**: Colored rectangles are generated
2. **XML Data**: Hardcoded defaults from GameConstants
3. **Sounds**: Silent placeholders
4. **Game remains fully playable**

## 🔄 Future Enhancements

1. **Sprite Atlas**: Pack sprites for better performance
2. **Audio Sprites**: Combine sounds into single file
3. **Progressive Loading**: Load resources as needed
4. **Compression**: Use compressed texture formats
5. **CDN Support**: Host resources on CDN for production

## ✨ Summary

The game now has complete access to all Heavy Weapon resources. It will automatically:
- Load actual sprites when available
- Use authentic XML data for game balance
- Fall back to placeholders if resources are missing
- Maintain full playability regardless of resource availability

The setup ensures the game can run both with full Heavy Weapon assets for authentic gameplay, or with minimal placeholders for development/testing.