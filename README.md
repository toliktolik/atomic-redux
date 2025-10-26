# Heavy Weapon Redux: AI-Powered Reverse Engineering

<div align="center">

**From Win32 Binary to Browser Game in 48 Hours**

A functional recreation of PopCap's Heavy Weapon by reverse engineering the original executable using AI-assisted decompilation.

*Built for Supercell AI Game Hack, October 2025*

</div>

---

## 🎮 What Is This?

This project demonstrates an experimental workflow for game preservation and remake development by combining traditional reverse engineering tools (Ghidra) with AI assistance (Claude Code + MCP) to accelerate the decompilation-to-implementation pipeline.

**The Challenge:** Take a closed-source Win32 game executable and recreate it as a modern browser game.

**The Innovation:** Use Ghidra's MCP (Model Context Protocol) integration to enable real-time AI queries against decompiled code, allowing questions like "How does the powerup system work?" to instantly return relevant decompiled functions for analysis and reimplementation.

**The Result:** ~70% feature-complete remake in TypeScript/Pixi.js with core game systems functional.

## 🎯 Project Status

**Implemented (~70% Complete):**
- ✅ Enemy spawning and wave management (12+ enemy types including PROPFIGHTER, TWINBLADE, etc.)
- ✅ Tank physics with realistic movement and inertia
- ✅ Weapon systems (standard gun, mega laser, atomic bomb)
- ✅ Dynamic powerup system (shields, weapon upgrades, health)
- ✅ Parallax background rendering with proper scrolling
- ✅ Audio integration (SFX + background music)
- ✅ Health/ammo management systems
- ✅ Score tracking and combo mechanics
- ✅ Data-driven architecture (zero hardcoded values)

**Intentionally Scoped Out:**
- ⏸️ Boss mechanics and encounters
- ⏸️ Complete upgrade trees and progression systems
- ⏸️ Full UI/HUD implementation (basics only)
- ⏸️ Advanced particle effects (using Pixi.js native system instead)

## 🛠️ Technical Stack

### Core Technologies
- **Reverse Engineering:** Ghidra 10.x with GhidraMCP plugin
- **AI Integration:** Claude Code (Sonnet 4) with MCP support
- **Game Engine:** TypeScript + Pixi.js 7.x
- **Build System:** Vite
- **Asset Pipeline:** Custom tools for PopCap format conversion

### Why This Stack?

**Ghidra + MCP:** Enables AI to query decompiled code in real-time rather than copying entire decompilation outputs into context.

**Pixi.js 7.x:** Used older stable version instead of Pixi.js 8.x because LLM training data predates the v8 refactor. Attempting to use newer versions caused the AI to hallucinate hybrid solutions that failed.

**TypeScript:** Provides type safety while maintaining familiarity for AI code generation.

## 🔬 The Development Process

### Phase 0: Dead Ends (Hour 0)
Explored multiple approaches before finding the winning strategy:
- ❌ Zero-shot "vibe coding" from wiki descriptions (playable but structurally unsound)
- ❌ J2ME version decompilation (too compact, didn't match PC version)
- ❌ Xbox 360 version with XenonRecomp (PPC complexity, Xbox Live dependencies)

### Phase 1: Discovery (Hour 1-24)
**The Breakthrough:** GhidraMCP integration

1. **Function Mapping via String Literals**
   - Searched binary for game-specific strings ("PROPFIGHTER", "TWINBLADE")
   - Traced strings back to their containing functions
   - Used as breadcrumbs to identify subsystems

2. **Context-Aware Batch Analysis**
   - Critical finding: Analyzing functions individually → poor naming ("LastCall")
   - Analyzing functions in batches of 10 → accurate identification ("GameMode_ReturnToMainMenu")
   - Tuned batch sizes for optimal context utilization

3. **Cross-Reference with Framework Patterns**
   - PopCap's SexyAppFramework patterns provided structure hints
   - XML data files revealed game configuration architecture
   - Combined with decompiled code for complete understanding

4. **Systematic Renaming**
   - MCP-guided function renaming based on behavior and context
   - Result: `HeavyWeaponApp_Constructor`, `WeaponSystem_Constructor`, `RenderingSystem_DrawEffects`
   - Functions emerged with high readability matching original intent

## 🎬 Demo Video Phase 0
IMGUR: [[https://imgur.com/wNzfHSq]]



### Phase 2: Multi-Instance Development (Day 2)

**The Reality:** 200k token context limits insufficient for complex game systems.

**The Solution:** Parallel development architecture

- **Setup:** 5-7 terminal instances running Claude Code simultaneously
- **Organization:** Each instance focused on specific subsystem
- **Coordination:** Shared markdown documents for high-level goals and architecture
- **Workflow:** Plan → Ghidra MCP query → Decompile → Rebuild → Cross-reference with XML

**Critical Process Innovation:**
1. Ghidra MCP: "Look up how powerup system works"
2. Receive decompiled relevant functions
3. "Rebuild powerup system based on original logic"
4. Cross-reference with game data XML files
5. Extract hardcoded values → migrate to unified XML configuration

### Phase 3: The Reality Check

**When It Broke (~70% completion):**
- Context management began failing catastrophically
- Mid-operation context compaction lost critical information
- Tool call limits (5 queries when needing 20+) created bottlenecks
- Server load caused model switching → bizarre behavior:
  - One instance switched from TypeScript to JavaScript
  - Another started editing Ghidra's C codebase instead of TypeScript
  - Random hallucinated values appeared as "fallbacks"
  - Project rules and conventions randomly ignored
 
## 🎬 Demo Video

[![Heavy Weapon Redux - AI-Assisted Reverse Engineering](https://img.youtube.com/vi/99UkiQiEeCw/maxresdefault.jpg)](https://www.youtube.com/watch?v=99UkiQiEeCw)

*Click above to watch the full demo and development walkthrough*

**The Lesson:** Context engineering must happen upfront, not reactively.

## 📊 Key Learnings

### What Actually Worked

#### 1. MCP + Ghidra Integration
Real-time decompilation queries felt like 10x acceleration:
```
Human: "How does tank movement work?"
→ MCP Query to Ghidra
→ Instant decompiled C code
→ Clean TypeScript implementation
```

This workflow proved the concept: AI-assisted reverse engineering is viable and powerful for game preservation.

#### 2. Multi-Instance Parallel Development
Essential for projects exceeding single-context capacity (8-12+ subsystems):
- Different instances work on independent subsystems
- Reduces context pollution
- Enables parallel progress
- Requires strong coordination through documentation

#### 3. Context Engineering Is King
The most important investment is upfront planning:
- **PRD (Project Requirements Document):** Holy grail of AI development
- **Architecture Documentation:** Must be maintained continuously
- **Batch Size Tuning:** Critical for analysis quality
- **Rule Definition:** Strict, comprehensive, continuously refined

#### 4. Data Extraction Strategy
Should have done immediately:
1. Extract every hardcoded value from decompiled code
2. Extend XML files with complete game configuration
3. Build pure data-driven engine from start

Instead, did this late → created confusion between hardcoded values and XML-loaded values → wasted tokens on refactoring.

### What Didn't Work

#### 1. Reactive Context Management
- Attempting to fix context issues mid-project = failure
- Need proactive architecture from start
- 200k tokens disappear faster than expected with complex systems

#### 2. Insufficient Planning Documentation
- Half-baked subsystem overview caused problems
- Should have invested hours in comprehensive markdown structure
- Auto-documentation after each commit is essential (tools: Graphiti, repoprompt.com)

#### 3. Wrong Model Choice
- Used regular Sonnet 4 throughout
- **Should have used Sonnet extended thinking [1m] model** for complex reasoning tasks
- Extended thinking particularly valuable for:
  - Architecture decisions
  - Function analysis in batches
  - Resolving ambiguities in decompiled code
  - Planning refactoring strategies

#### 4. Tool Limitations
- MCP call limits too restrictive for comprehensive analysis
- Context compaction mid-operation = catastrophic
- No recovery mechanism when model switches/fails
- AST-based tooling needed for better code understanding

## 🎯 Recommendations for Future Projects

### For Reverse Engineering Projects

1. **Use Extended Thinking Models**
   - Claude Sonnet [1m] for complex architectural decisions
   - Regular Sonnet for implementation tasks
   - Don't skimp on compute for critical reasoning steps

2. **Invest in Context Engineering Upfront**
   - Spend first 20% of time on documentation architecture
   - Build comprehensive PRD from all available sources
   - Create detailed subsystem mapping before coding

3. **Extract Configuration Early**
   - Identify hardcoded values immediately
   - Create unified data files before implementation
   - Maintain strict separation: engine vs. data

4. **Use AST-Based Tooling**
   - ast-grep for precise code analysis
   - Reduces hallucination from fuzzy pattern matching
   - Enables better "needle search" in large codebases

5. **Multi-Instance Architecture**
   - Plan subsystem boundaries clearly
   - Assign one instance per major subsystem
   - Use git branches aggressively
   - Review and merge carefully

### For "Vibe Coding" (Rapid Prototyping)

Reference workflow that worked for 30-minute prototypes:

1. **Gather Context** (10 pages max)
   - Game wiki/FAQ pages (CTRL+A → Google Docs)
   - YouTube video transcripts (via SRT extraction)
   - Single gameplay screenshot

2. **Generate PRD**
   - "Build exact remake of game X in genre Y with tech Z"
   - Attach context materials
   - Let AI synthesize requirements

3. **Tech Stack Choice Critical**
   - Use versions AI was trained on (e.g., Pixi.js 7.x not 8.x)
   - Avoid cutting-edge libraries with recent refactors
   - Can provide LLM-specific docs but costs context tokens

4. **Execute in "YOLO Mode"**
   - Switch to plan mode: "Build a plan to execute this PRD"
   - Switch to code mode: "Proceed"
   - Accept everything by default
   - Say "keep going" until playable
   - If stuck: "Review issues and fix"

5. **Expect Multiple Attempts**
   - Try 2-3 clean runs
   - Use different tools (Cursor, Claude Code)
   - Try different models (Claude, Grok, Gemini)
   - Patience: 1-2 monthly experiments reveal progress

### For Complex Projects

**Context Architecture:**
- Models cap at ~200k tokens practically
- Don't need entire codebase in context
- Need navigation map (~10k tokens) showing where features live
- This enables model to find and work on right code

**Essential Tools:**
- Graphiti for knowledge graphs
- repoprompt.com for context optimization
- AST tools for code understanding
- Auto-documentation pipeline

## 🏗️ Project Architecture

### Core Systems Implemented

```
heavy-weapon-redux/
├── src/
│   ├── core/
│   │   ├── HeavyWeaponApp.ts          # Main game application
│   │   ├── GameMode.ts                # Game mode management
│   │   └── InputManager.ts            # Control handling
│   ├── systems/
│   │   ├── WeaponSystem.ts            # Weapon logic and firing
│   │   ├── PowerUpSystem.ts           # Powerup spawning and collection
│   │   ├── WaveSystem.ts              # Enemy wave management
│   │   ├── RenderingSystem.ts         # Background and effects rendering
│   │   └── AudioSystem.ts             # Sound and music
│   ├── entities/
│   │   ├── Tank.ts                    # Player tank with physics
│   │   ├── Enemy.ts                   # Base enemy class
│   │   ├── EnemyTypes/                # Specific enemy implementations
│   │   └── Projectile.ts              # Bullets and missiles
│   ├── config/
│   │   ├── enemies.xml                # Enemy definitions and stats
│   │   ├── weapons.xml                # Weapon parameters
│   │   ├── powerups.xml               # Powerup configurations
│   │   └── gameplay.xml               # Game balance parameters
│   └── assets/
│       ├── images/                    # Converted from PopCap format
│       ├── audio/
│       └── data/
└── tools/
    ├── xml-converter/                 # PopCap XML format converter
    └── asset-pipeline/                # RGB+A → standard format
```

### Data-Driven Design

**Philosophy:** Zero hardcoded values in game engine

All game parameters extracted to XML:
- Enemy health, speed, scoring, behaviors
- Weapon damage, fire rates, upgrade paths
- Animation timings and effect parameters
- Spawn patterns and wave configurations
- Powerup probabilities and effects

**Benefits:**
- Easy gameplay tuning without code changes
- Clear separation of concerns
- Matches original game's architecture
- AI could focus on engine logic, not balance

## 🎓 Technical Insights

### Decompilation Quality

Ghidra produced surprisingly readable C code from the Win32 binary:
- Function boundaries correctly identified
- Most data structures recovered accurately
- Control flow preserved
- Some type information retained

**Challenges:**
- Compiler optimizations obscured some logic
- Lost variable names (replaced with generic identifiers)
- Some pointer arithmetic ambiguous
- STL library calls needed manual identification

### AI-Assisted Analysis

**What AI Excelled At:**
- Pattern recognition in decompiled code
- Function purpose identification from context
- Translating C idioms to TypeScript equivalents
- Extracting numerical parameters systematically

**What Required Human Oversight:**
- Disambiguating similar-named functions (multiple helicopter types)
- Verifying extracted formulas made gameplay sense
- Catching hallucinated "fallback" values
- Architecture decisions and subsystem boundaries

### PopCap's SexyAppFramework

Understanding the framework patterns was crucial:
- Update/Draw loop structure
- Entity management systems
- Resource loading patterns
- XML-driven configuration approach

Providing framework documentation to AI significantly improved code generation quality.

## 📈 Metrics and Stats

- **Development Time:** 48 hours (one weekend)
- **Completion:** ~70% of core gameplay
- **Code Quality:** Clean and readable (before hallucination phase)
- **Function Names:** ~200+ systematically renamed in Ghidra
- **Configuration Values:** 500+ extracted to XML
- **Terminal Instances:** 5-7 running simultaneously
- **Token Usage:** Significant (200k context limit consistently hit)
- **Tools Used:** Ghidra, Claude Code, MCP, custom asset converters

## 🚀 Future Improvements

### Technical Debt
- [ ] Implement proper state machine for game modes
- [ ] Add comprehensive error handling
- [ ] Optimize rendering pipeline
- [ ] Complete particle system implementation
- [ ] Add proper asset preloading

### Missing Features
- [ ] Boss encounters and mechanics
- [ ] Complete upgrade progression system
- [ ] Full UI/menu system
- [ ] Multiplayer support (if implementing Xbox 360 version features)
- [ ] Achievement system

### Tooling Enhancements
- [ ] Build AST-based code navigation for AI
- [ ] Implement auto-documentation pipeline
- [ ] Create better MCP integration with retry logic
- [ ] Add automated testing for game systems
- [ ] Develop visual debugging tools

## 🎮 How to Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open browser to `localhost:3000` and start playing!

**Controls:**
- Arrow Keys: Move tank
- Space/Mouse: Fire weapon
- (Check in-game for additional controls)

## 🤝 Contributing

This project is primarily a proof-of-concept for AI-assisted reverse engineering. However, contributions are welcome:

- Bug fixes and optimizations
- Implementing missing features
- Improving documentation
- Sharing insights on AI-assisted development workflows

## ⚖️ Legal Notice

This project is for educational and research purposes, demonstrating AI-assisted reverse engineering techniques. The original Heavy Weapon game is owned by PopCap Games / Electronic Arts. This remake is not affiliated with or endorsed by PopCap or EA.

If you own Heavy Weapon and want to study its implementation, please purchase the original game.

## 🙏 Acknowledgments

- **PopCap Games** for the original Heavy Weapon
- **National Security Agency** for Ghidra
- **Anthropic** for Claude and MCP technology
- **Dreamcast homebrew community** for reverse engineering inspiration
- **Supercell** for hosting the AI Game Hack

## 📚 References and Resources

- [Ghidra](https://ghidra-sre.org/) - NSA's reverse engineering tool
- [MCP (Model Context Protocol)](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo/image) - Anthropic's tool integration standard
- [Pixi.js](https://pixijs.com/) - 2D WebGL renderer
- [SexyAppFramework](https://github.com/popcap-framework) - PopCap's game framework
- [Dreamcast Homebrew](https://www.dreamcast-talk.com/) - Inspiration for AI-assisted game preservation

---

<div align="center">

**Built with Claude Code + Ghidra + Determination**

*"From binary to browser in a weekend"*

</div>
