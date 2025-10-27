# Atomic Survival Redux 🎮

A streamlined, web-based recreation of Heavy Weapon Deluxe's survival mode using PixiJS. Pure arcade action with no menus - just launch and survive!

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The game will automatically open at `http://localhost:3000` and start immediately - no menus, just action!

## 📁 XML Data Integration

The game now loads enemy stats and wave patterns from Heavy Weapon's original XML files:
- **Authentic Values**: Uses actual armor, points, and wave data from the original game
- **Browser Compatible**: All XML files include proper `<root>` elements for browser parsing
- **Automatic Fallback**: Works even if XML files are unavailable
- See `XML_INTEGRATION.md` for details

## 🎯 Features

### Core Gameplay
- **Instant Start**: Tank rolls in, waves begin immediately
- **20 Enemy Types**: From basic fighters to massive blimps
- **6 Weapon Tiers**: Progressive upgrades via helicopter drops
- **7 Power-ups**: Shield, nuke, mega laser, and more
- **Endless Waves**: Difficulty scales every 12 seconds
- **Pure Survival**: No campaign, no bosses, just waves

### Technical Features
- **Modern Web Tech**: PixiJS v7 with WebGL rendering
- **60 FPS Target**: Optimized for smooth gameplay
- **Responsive Controls**: Keyboard + mouse with mobile touch support
- **No Installation**: Runs directly in browser
- **Quick Restart**: Press space to instantly restart

## 🎮 Controls

### Keyboard
- **A/D** or **Arrow Keys**: Move tank left/right
- **Mouse**: Aim turret
- **Left Click** or **Space**: Fire weapon
- **Right Click** or **Shift**: Special weapon (Mega Laser)

### Mobile
- **Touch & Drag**: Move and aim
- **Tap**: Fire weapon

## 🏗️ Project Structure

```
atomic_survival_redux/
├── src/
│   ├── core/           # Core game systems
│   │   ├── Game.ts     # Main game class
│   │   ├── AssetLoader.ts
│   │   └── LayerManager.ts
│   ├── entities/       # Game entities
│   │   ├── Tank.ts     # Player tank
│   │   ├── Enemy.ts    # Enemy base class
│   │   ├── Projectile.ts
│   │   └── PowerUp.ts
│   ├── systems/        # Game systems
│   │   ├── WaveSystem.ts
│   │   ├── CollisionSystem.ts
│   │   ├── ParticleSystem.ts
│   │   └── ScoreManager.ts
│   ├── weapons/        # Weapon implementations
│   ├── ui/            # HUD and UI
│   ├── input/         # Input handling
│   └── config/        # Game constants
├── assets/            # Sprites and sounds
├── docs/              # Documentation
└── dist/              # Build output
```

## 📊 Game Systems

### Wave System
- Waves start at 6 enemies, +2 every 5 waves
- Enemy spawn interval decreases: 1500ms → 500ms
- Enemy health scales: `(difficulty_level + 1) * 7`
- Difficulty increases every 12 seconds

### Scoring System
- Base points per enemy: 50 - 25,000
- Chain kills: 1.5x multiplier
- Accuracy bonus: 500 points at 80% hit rate
- No damage wave: 1000 bonus points
- Combo multipliers: up to 3x

### Power-Up System
- Helicopter drops every 15 seconds (30% base chance)
- Higher chance when: low health, no upgrades, long survival
- 7 power-up types with various durations

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Development Mode
```bash
npm run dev
```
- Hot module replacement
- Source maps enabled
- Debug mode with FPS counter: `http://localhost:3000?debug`

### Production Build
```bash
npm run build
npm run preview
```

### Type Checking
```bash
npm run type-check
```

## 📈 Performance Targets

- **Frame Rate**: 60 FPS constant
- **Load Time**: < 3 seconds
- **Memory Usage**: < 100MB
- **Resolution**: 1280×720 (16:9)
- **Min Requirements**: Any device from 2015+

## 🎯 Implementation Status

### ✅ Completed
- [x] Core game loop
- [x] Tank movement and controls
- [x] Basic projectile system
- [x] Input handling (keyboard/mouse/touch)
- [x] Asset loading system
- [x] Layer management
- [x] Game state management
- [x] Instant restart system

### 🚧 In Progress
- [ ] All enemy types implementation
- [ ] Complete weapon system
- [ ] Wave spawning patterns
- [ ] Collision detection
- [ ] Power-up system
- [ ] Particle effects
- [ ] Sound effects
- [ ] HUD/UI

### 📋 TODO
- [ ] Enemy AI patterns
- [ ] Helicopter drop animations
- [ ] Mega laser special weapon
- [ ] Score persistence (localStorage)
- [ ] Performance optimizations
- [ ] Mobile UI adjustments
- [ ] Fullscreen support

## 🎨 Asset Requirements

### Sprites Needed
- Tank body and turret
- 20 enemy types
- 7 projectile types
- 7 power-up icons
- Explosion animations
- Background layers

### Audio Needed
- Weapon fire sounds
- Explosion effects
- Power-up pickups
- Background music
- Warning sounds

## 🔧 Configuration

All game constants are centralized in `src/config/GameConstants.ts`:
- Enemy stats (armor, points, speed)
- Weapon parameters
- Wave timing
- Difficulty progression
- Power-up durations
- Scoring values

## 📝 Notes

This is a focused recreation that removes ~60% of the original's complexity:
- No menus or save system
- No campaign mode or bosses
- No persistent progression
- Direct gameplay focus

The goal is pure arcade survival action that loads instantly and provides immediate gameplay.

## 🙏 Credits

- **Original Game**: Heavy Weapon Deluxe by PopCap Games
- **Engine**: PixiJS v7
- **Build Tool**: Vite
- **Audio**: Howler.js

## 📄 License

This is a fan recreation for educational purposes. Heavy Weapon Deluxe is property of PopCap Games/Electronic Arts.

---

**Ready to survive?** Run `npm run dev` and jump straight into the action! 🚀