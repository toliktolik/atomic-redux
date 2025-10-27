# Heavy Weapon Deluxe - Core Engine Architecture Deep Analysis

## Overview

This document provides comprehensive technical analysis of the core engine architecture in Heavy Weapon Deluxe, revealing the sophisticated game state management, main loop mechanics, and player input systems that power the game.

## Game Engine Core Architecture

### Main Game Loop

#### GameEngine_MainLoop @ 00450fb0
```cpp
void GameEngine_MainLoop(int gameState) {
    // Exception handling setup
    void* exceptionHandler = ExceptionList;
    ExceptionList = &localHandler;

    // Process player weapon firing state
    Player_FireWeapon('\0');  // Reset fire state

    // Process all active game objects in linked list
    if (gameState->activeObjectsList != nullptr) {
        GameObject* current = gameState->activeObjectsList->first;

        while (current != gameState->activeObjectsList) {
            if (current->updateFunction != nullptr) {
                // Call virtual update function for each object
                (*current->vtable->Update)(1);
            }
            current = current->next;
        }
    }

    // Clear task queue for next frame
    System_ClearTaskQueue(
        gameState + 0x444,  // Task queue offset
        &localState,
        firstObject,
        lastObject
    );

    // Final weapon state update
    Player_FireWeapon('\x01');  // Enable fire state

    ExceptionList = exceptionHandler;
}
```

**Key Insights:**
1. **Object Management**: Linked list iteration for all active game objects
2. **Exception Safety**: Structured exception handling with stack unwinding
3. **Task Queue System**: Frame-based task processing with automatic cleanup
4. **Weapon State Bracketing**: Fire state management at loop boundaries

### Game Update Loop

#### GameEngine_UpdateLoop @ 00419e30
```cpp
void GameEngine_UpdateLoop(void* this, float deltaTime) {
    // Skip update if game is paused
    if (this->isPaused == false) {
        // Core subsystem updates in specific order
        Background_ScrollParallax(this, deltaTime);
        WeaponPowerUp_ManagementSystem(this, deltaTime);
        Physics_ProcessPixelPerfect(this, deltaTime);

        // Update all active entities
        this->currentEntity = this->entityListHead;

        while (this->currentEntity->next != nullptr) {
            Entity* entity = this->currentEntity;
            this->currentEntity = entity->next;

            if (this->updateCount == 0) {
                // Direct virtual function call
                (*entity->vtable->Update)(deltaTime);
            } else {
                // Indirect update through function pointer
                (*entity->updateFunction)(deltaTime);
            }
        }
    }
}
```

**Update Pipeline Order:**
1. **Background System**: Parallax scrolling for visual depth
2. **Weapon/PowerUp System**: Power-up management and weapon upgrades
3. **Physics System**: Pixel-perfect collision detection
4. **Entity Updates**: Individual entity logic processing

### Game State Transitions

#### GameEngine_ProcessStateTransitions @ 0040d020
```cpp
void GameEngine_ProcessStateTransitions(void* gameState, uint transitionType) {
    // Reset game state variables
    gameState->scoreMultiplier = 0;      // +0xb08
    gameState->comboCounter = 0;         // +0xb0c
    gameState->chainBonus = 0;           // +0xb10
    gameState->accuracyBonus = 0;        // +0xb14
    gameState->killStreakBonus = 0;      // +0xb18
    gameState->survivalBonus = 0;        // +0xb1c
    gameState->efficiencyBonus = 0;      // +0xb20

    // Set initial game flags
    gameState->isGameActive = 1;         // +0x964
    gameState->isPaused = 0;              // +0x95c

    // Load wave configuration
    WaveSystem_LoadWavesXML(gameState, transitionType, 1);

    // Initialize weapon systems (6 weapon slots)
    for (int i = 0; i < 6; i++) {
        gameState->weaponSlots[i] = 0;   // +0x968
        gameState->weaponAmmo[i] = 0;    // +0x980
    }
    gameState->primaryWeapon = 1;        // Default to first weapon

    // Create new game engine instance (872 bytes)
    GameEngine* engine = (GameEngine*)operator_new(0x368);
    if (engine != nullptr) {
        GameEngine_Constructor(engine, gameState, 1);
    }
    gameState->gameEngine = engine;      // +0x920

    // Initialize UI systems
    SexyWidget_GetColor(gameState->widgetManager, engine);
    UI_ValidateChildBinding(gameState->widgetManager, engine);
    UI_Widget_ApplyBlending(gameState->widgetManager, engine);

    // Load survival mode backgrounds
    if (transitionType == SURVIVAL_MODE) {
        LoadBackgroundImage(gameState->skyLayer, "images\\backgrounds\\survival_sky");
        LoadBackgroundImage(gameState->bgLayer1, "images\\backgrounds\\survival_bg");
        LoadBackgroundImage(gameState->bgLayer2, "images\\backgrounds\\survival_bg2");
        LoadBackgroundImage(gameState->groundLayer, "images\\backgrounds\\survival_ground");
    }
}
```

**State Transition Components:**
1. **Score System Reset**: All bonus multipliers cleared
2. **Wave System Loading**: XML-based wave patterns loaded
3. **Weapon System Init**: 6-slot weapon system initialization
4. **Engine Instance Creation**: 872-byte engine object allocation
5. **Background Loading**: 4-layer parallax background system

## Game Engine Constructor

### GameEngine_Constructor @ 004191d0
```cpp
class GameEngine : public SexyWidget {
private:
    // Core engine data structures
    struct {
        void* gameState;              // +0x5c - Main game state reference
        LinkedList* entityLists[16];  // +0x1e4 to +0x2dc - Entity management
        ParticleSystem particles;      // +0x2e8 - Particle effects
        TextEffect* textEffects;       // +0x2fc - Score/combo text
        HUD* hudDisplay;              // +0x304 - HUD elements
        HHOOK keyboardHook;           // +0x348 - Input hook

        // Game parameters
        double tankSpeed;             // +0x194 = 478.0f (0x408f4000)
        int tankArmor;               // +0x184 - Based on difficulty
        int weaponCooldown;          // +0x178 = 1000ms
        float weaponSpread;          // +0x18c = 1.0f

        // Screen bounds
        Rectangle bounds;            // 640x480 (0x280 x 0x1e0)
    } engineData;

public:
    GameEngine(void* gameState, bool isCampaign) {
        // Initialize SexyWidget base
        SexyWidget_Constructor(this);

        // Set vtables
        this->vtable = &PTR_Particles_UpdateDebris_0052c888;
        this->updateVtable = &PTR_EmptyFunction_NoOp_0052c868;

        // Initialize 16 entity linked lists
        for (int i = 0; i < 16; i++) {
            LinkedList* list = (LinkedList*)operator_new(0xc);
            list->head = nullptr;
            list->tail = nullptr;
            list->count = 0;
            this->entityLists[i] = list;
        }

        // Initialize particle system
        ParticleEffects_Constructor(&this->particleSystem);

        // Set game parameters
        this->gameState = gameState;
        this->bounds = {0, 0, 640, 480};
        this->tankSpeed = 478.0;
        this->weaponCooldown = 1000;

        // Calculate difficulty-based armor
        int difficulty = gameState->currentLevel;
        if (difficulty > 8) difficulty = 8;

        // Armor scaling based on difficulty tier
        int armorTable = difficulty * 0x30 + gameState->armorLookupTable + 0x2c;
        this->tankArmor = armorTable;
        this->tankArmorSegments = tankArmor / 6;
        this->tankArmorQuarter = (tankArmor + (tankArmor >> 0x1f & 7)) >> 3;

        // Create HUD system (108 bytes)
        HUD* hud = (HUD*)operator_new(0x6c);
        if (hud != nullptr) {
            HUD_InitializeDisplayElements(hud, gameState);
        }
        this->hudDisplay = hud;

        // Create text effects system (24 bytes)
        TextEffect* textFx = (TextEffect*)operator_new(0x18);
        if (textFx != nullptr) {
            TextEffect_Constructor(textFx, this);
        }
        this->textEffects = textFx;

        // Install keyboard hook for input processing
        HHOOK hook = SetWindowsHookExA(
            WH_KEYBOARD_LL,    // Low-level keyboard events
            Input_KeyboardHook,  // Hook procedure
            GetModuleHandle(),   // Module handle
            0                   // All threads
        );
        this->keyboardHook = hook;

        // Global instance reference
        DAT_0056d08c = this;
    }
};
```

**Engine Components:**
1. **Entity Management**: 16 separate linked lists for different entity types
2. **Particle System**: Integrated particle effects engine
3. **HUD System**: 108-byte HUD with score, health, ammo displays
4. **Text Effects**: Dynamic text for scores and combos
5. **Input System**: Low-level keyboard hook for responsive controls
6. **Difficulty Scaling**: Armor values scaled by level (max level 8)

## Player Input System

### Player_ProcessInput @ 004899a0
```cpp
void Player_ProcessInput(void* player, bool isActive) {
    // Thread-safe input processing
    CRITICAL_SECTION* inputLock = &player->criticalSection;  // +0x3c
    EnterCriticalSection(inputLock);

    player->inputActive = isActive;  // +0xcac

    // Initialize DirectInput if needed
    if (player->directInput == nullptr) {  // +0x64
        DIDEVICEOBJECTDATA inputData[31];
        memset(inputData, 0, sizeof(inputData));

        inputData[0].dwData = 0x7c;
        inputData[1].dwData = 7;
        inputData[2].dwData = player->mouseX;  // +0x70
        inputData[3].dwData = player->mouseY;  // +0x6c
        inputData[4].dwData = 0x4000;  // Input flags

        int result = SexyWidget_ApplyRotation(
            player,
            inputData,
            &player->directInput  // +0x64
        );

        if (result < 0) {
            player->inputActive = false;
        }
    }

    // Process previous input handler
    bool wasActive = player->inputActive;
    if (player->inputHandler != nullptr) {  // +0xc9c
        (*player->inputHandler->vtable->Process)(1);
    }

    // Create new input handler (200 bytes)
    InputHandler* handler = (InputHandler*)operator_new(0xc8);
    if (handler != nullptr) {
        Game_UpdateParticles(handler, player);
    }
    player->inputHandler = handler;

    // Update input state
    if (wasActive) {
        (*handler->vtable->SetInputDevice)(player->directInput);
    } else {
        (*handler->vtable->SetInputDevice)(player->keyboardInput);  // +0x68
    }

    // Set input flags
    handler->isActive = player->inputActive;      // +0x50
    handler->isProcessing = player->inputActive;  // +0x51

    // Process input events
    (*handler->vtable->ProcessEvents)(0, 0);

    LeaveCriticalSection(inputLock);
}
```

**Input Processing Pipeline:**
1. **Thread Safety**: Critical section for multi-threaded safety
2. **DirectInput Integration**: DirectX input device management
3. **Handler Chaining**: Previous handler cleanup before new creation
4. **Device Switching**: Keyboard/DirectInput device selection
5. **Event Processing**: Immediate input event handling

## Game Flow Control

### GameFlow_HandleLevelProgression @ 00410690
```cpp
void GameFlow_HandleLevelProgression(void* gameFlow, int progressionType) {
    // Update game state
    (*gameFlow->gameState->vtable->UpdateState)(0x12, 0);

    if (progressionType == LEVEL_COMPLETE) {  // 0x29
        // Play victory sounds
        (*gameFlow->audioSystem->vtable->PlaySound)(
            1,                    // Sound type
            0xd2f1a9fc,          // Victory sound ID
            0x3f70624d           // Volume
        );

        // Trigger victory music
        (*gameFlow->audioSystem->vtable->PlayMusic)(
            3,                    // Music type
            0x3b,                // Track ID
            0xd2f1a9fc,          // Music parameters
            0x3f60624d,          // Volume
            0                    // Flags
        );

        // Update UI state
        (*gameFlow->gameState->vtable->SetUIState)(0x28);

        // Handle game flow transition
        GameWidget* widget = (GameWidget*)(gameFlow - 0x58);
        WidgetManager* manager = gameFlow->gameState->widgetManager;

        if (gameFlow->isSurvivalMode) {
            // Survival mode: restart with escalation
            UI_ProcessChildAnimation(manager, widget);
            (*gameFlow->gameState->vtable->CleanupWidget)(widget);
            gameFlow->gameState->gameEngine = nullptr;
            GameEngine_ProcessStateTransitions(gameFlow->gameState);
        } else {
            // Campaign mode: advance to next level
            UI_ProcessChildAnimation(manager, widget);
            (*gameFlow->gameState->vtable->CleanupWidget)(widget);
            gameFlow->gameState->gameEngine = nullptr;

            if (gameFlow->gameState->currentLevel > 0) {
                Level_InitializeWithEnemyData(
                    gameFlow->gameState,
                    gameFlow->gameState->currentLevel
                );
            } else {
                GameMenu_ProcessSurvivalSelect(gameFlow->gameState, false);
            }
        }
    } else if (progressionType == BOSS_DEFEATED) {  // 0x2a
        if (gameFlow->currentBoss == 10) {
            // Final boss defeated - game complete
            GameSystem_InitializeObject(gameFlow->gameState);
        } else {
            // Create boss defeat UI (140 bytes)
            BossDefeatUI* ui = (BossDefeatUI*)operator_new(0x8c);
            if (ui != nullptr) {
                Button_ClickHandler(
                    ui,
                    gameFlow->gameState,
                    gameFlow->isSurvivalMode,
                    gameFlow->currentBoss
                );
            }
            SexyWidget_GetColor(
                gameFlow->gameState->widgetManager,
                ui
            );
        }

        gameFlow->gameState->gameEngine = nullptr;
        (*gameFlow->gameState->vtable->SetUIState)(0x28);

        // Clean up current game widget
        UI_ProcessChildAnimation(
            gameFlow->gameState->widgetManager,
            (GameWidget*)(gameFlow - 0x58)
        );
        (*gameFlow->gameState->vtable->CleanupWidget)(
            (GameWidget*)(gameFlow - 0x58)
        );
    }
}
```

**Level Progression States:**
1. **LEVEL_COMPLETE (0x29)**: Victory handling with sound/music
2. **BOSS_DEFEATED (0x2a)**: Boss defeat UI and progression
3. **Campaign Progression**: Automatic level advancement
4. **Survival Escalation**: Difficulty increase without level change
5. **Game Completion**: Special handling for final boss (boss 10)

## Game State Management

### GameState_AdvanceLevel @ 0043c080
```cpp
void GameState_AdvanceLevel(int gameState) {
    // Process boss cleanup if needed
    Boss_ProcessWreckerWarWrecker(gameState);

    // Calculate level data offset
    int levelData = gameState->currentLevel * 0x80 + gameState->levelDataBase;

    // Copy level configuration
    gameState->levelConfig1 = levelData->config1;  // +0x138
    gameState->levelConfig2 = levelData->config2;  // +0x13c
    gameState->levelConfig3 = levelData->config3;  // +0x140
    gameState->levelConfig4 = levelData->config4;  // +0x144

    // Check for special level flags
    if (gameState->levelDataBase->hasSpecialFlag != 0) {  // +0x48
        gameState->specialLevelActive = 1;  // +0x48
    }
}
```

### GameEngine_ProcessGameLogic @ 00402860
```cpp
void GameEngine_ProcessGameLogic(int gameState) {
    // Calculate save data offset (96-byte records)
    int saveOffset = gameState->saveSlot * 0x60 + gameState->saveDataBase;

    // Update high score if needed
    ushort* highScore = (ushort*)(saveOffset + 0x1e);
    if (*highScore < gameState->currentScore) {
        *highScore = gameState->currentScore;
        // Store score timestamp
        *(uint*)(saveOffset + 0x18) = gameState->scoreTimestamp;
    }

    // Update current score record
    *(uint*)(saveOffset + 0x24) = gameState->scoreTimestamp;

    // Store bonus values (7 different bonus types)
    *(uint*)(saveOffset + 0x44) = gameState->scoreMultiplier;    // +0xb08
    *(uint*)(saveOffset + 0x48) = gameState->comboCounter;       // +0xb0c
    *(uint*)(saveOffset + 0x4c) = gameState->chainBonus;         // +0xb10
    *(uint*)(saveOffset + 0x50) = gameState->accuracyBonus;      // +0xb14
    *(uint*)(saveOffset + 0x54) = gameState->killStreakBonus;    // +0xb18
    *(uint*)(saveOffset + 0x58) = gameState->survivalBonus;      // +0xb1c
    *(uint*)(saveOffset + 0x5c) = gameState->efficiencyBonus;    // +0xb20

    // Store weapon configuration (6 weapons × 2 bytes each)
    *(ushort*)(saveOffset + 0x1c) = gameState->primaryWeapon;
    *(ushort*)(saveOffset + 0x28) = gameState->weaponSlots[0];   // +0x968
    *(ushort*)(saveOffset + 0x2a) = gameState->weaponSlots[1];   // +0x96c
    *(ushort*)(saveOffset + 0x2c) = gameState->weaponSlots[2];   // +0x970
    *(ushort*)(saveOffset + 0x2e) = gameState->weaponSlots[3];   // +0x974
    *(ushort*)(saveOffset + 0x30) = gameState->weaponSlots[4];   // +0x978
    *(ushort*)(saveOffset + 0x32) = gameState->weaponSlots[5];   // +0x97c

    // Store ammunition counts
    *(ushort*)(saveOffset + 0x34) = gameState->weaponAmmo[0];    // +0x980
    *(ushort*)(saveOffset + 0x36) = gameState->weaponAmmo[1];    // +0x984
    *(ushort*)(saveOffset + 0x38) = gameState->weaponAmmo[2];    // +0x988
    *(ushort*)(saveOffset + 0x3a) = gameState->weaponAmmo[3];    // +0x98c
    *(ushort*)(saveOffset + 0x3c) = gameState->weaponAmmo[4];    // +0x990
    *(ushort*)(saveOffset + 0x3e) = gameState->weaponAmmo[5];    // +0x994
}
```

**Save Data Structure (96 bytes per slot):**
- **Score Data**: High score, timestamps (offsets 0x18-0x24)
- **Bonus Values**: 7 different bonus types (offsets 0x44-0x5c)
- **Weapon Config**: 6 weapon slots (offsets 0x28-0x32)
- **Ammunition**: 6 ammo counts (offsets 0x34-0x3e)

## Level Initialization

### Game_InitializeLevel @ 004184b0
```cpp
void Game_InitializeLevel(void* gameEngine, void* levelData) {
    // Setup level parameters
    Algorithm_CountIf(gameEngine, levelData);
    SexyWidget_GetColor(levelData, gameEngine->hudDisplay);

    // Initialize audio system
    (*gameEngine->audioSystem->vtable->InitializeLevel)();
    (*gameEngine->audioSystem->vtable->LoadLevelMusic)();

    if (!gameEngine->isSurvivalMode) {
        // Campaign mode initialization
        StringBuffer missionText;
        ComplexObject_VirtualTableConstructor(missionText, 3, 1);

        // Create mission banner "MISSION X"
        Memory_GarbageCollection(&buffer, "MISSION ");
        Stream_LocaleAwareProcessor(buffer);

        // Create mission UI (120 bytes)
        MissionUI* missionUI = (MissionUI*)operator_new(0x78);
        if (missionUI != nullptr) {
            StringBuffer_ExtractionWrapper(missionText);
            DataStructure_InitializeBinaryTree(
                missionUI,
                gameEngine,
                gameEngine->gameState->missionDisplay,
                missionText,
                missionParams
            );
        }

        // Get boss for current level
        int bossIndex = GetBossIndex(
            gameEngine->gameState,
            gameEngine->gameState->currentLevel
        );

        // Load boss data
        Memory_HeapManager(
            &buffer,
            bossIndex * 0x30 + gameEngine->gameState->bossDataTable
        );

        // Create boss intro UI
        BossIntroUI* bossUI = (BossIntroUI*)operator_new(0x78);
        if (bossUI != nullptr) {
            StringBuffer_ExtractionWrapper(missionText);
            DataStructure_InitializeBinaryTree(
                bossUI,
                gameEngine,
                gameEngine->gameState->bossDisplay,
                bossText,
                bossParams
            );
        }
    } else {
        // Survival mode initialization
        SurvivalUI* survivalUI = (SurvivalUI*)operator_new(0x78);
        if (survivalUI != nullptr) {
            String_Assign(&text, "SURVIVAL MODE", 13);
            DataStructure_InitializeBinaryTree(
                survivalUI,
                gameEngine,
                gameEngine->gameState->survivalDisplay,
                text,
                params
            );
        }
    }

    // Start projectile system if not already active
    if (!gameEngine->isActive && !gameEngine->isPaused) {
        gameEngine->isPaused = true;
        if (!gameEngine->gameState->skipIntro) {
            Projectile_CreateAndFire(gameEngine);
        }
    }
}
```

## Technical Specifications

### Memory Layout
- **GameEngine Object**: 872 bytes (0x368)
- **GameState Save Slot**: 96 bytes per slot
- **InputHandler**: 200 bytes (0xc8)
- **HUD System**: 108 bytes (0x6c)
- **TextEffect**: 24 bytes (0x18)
- **MissionUI**: 120 bytes (0x78)

### Performance Characteristics
- **Main Loop**: O(n) entity updates per frame
- **State Transitions**: Constant time state changes
- **Input Processing**: Thread-safe with critical sections
- **Save System**: Direct memory mapping for fast access

### System Integration Points
- **SexyAppFramework**: Widget-based UI inheritance
- **DirectInput**: Low-level keyboard and mouse input
- **Exception Handling**: SEH for crash protection
- **Memory Management**: Custom allocators with operator new
- **Threading**: Critical sections for input synchronization

## Core Engine Hierarchy

```
Game Engine Core:
├── MainLoop System
│   ├── Object iteration and updates
│   ├── Task queue processing
│   └── Exception handling
├── UpdateLoop System
│   ├── Background parallax
│   ├── Weapon/PowerUp management
│   ├── Physics processing
│   └── Entity updates
├── State Management
│   ├── State transitions
│   ├── Level progression
│   ├── Save/Load system
│   └── Score persistence
├── Input System
│   ├── DirectInput integration
│   ├── Keyboard hook
│   ├── Thread-safe processing
│   └── Event handling
└── Level System
    ├── Mission initialization
    ├── Boss introduction
    ├── Survival mode setup
    └── UI creation
```

This analysis reveals Heavy Weapon Deluxe's sophisticated game engine with robust state management, efficient update loops, thread-safe input processing, and comprehensive save system integration.