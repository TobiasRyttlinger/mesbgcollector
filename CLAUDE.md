# MESBG Army Collector - Development Log

## Project Overview

A React Native mobile app for tracking Middle-earth Strategy Battle Game (MESBG) miniature collections with integrated game data from the community repository.

**Tech Stack:**
- React Native 0.81.5
- Expo SDK 54
- TypeScript 5.9.2
- AsyncStorage for local data persistence
- Expo Router for navigation

## Session 1: 2026-02-11 - Initial Setup & Data Integration

### What We Built

#### 1. Project Initialization ✅
- Set up React Native project with Expo SDK 54
- Configured TypeScript and Metro bundler
- Installed dependencies: expo-router, expo-linking, AsyncStorage
- Fixed SDK compatibility issues (started with SDK 52, upgraded to 54 for Expo Go compatibility)

#### 2. Full MESBG Data Integration ✅

**Data Source:** Downloaded from https://github.com/avcordaro/mesbg-list-builder-v2024

**Downloaded Files:**
- `src/data/mesbg_data.json` (~750KB) - Complete unit database with ~450+ units
- `src/data/army_list_data.json` (~144KB) - Army rules and restrictions

**What the data includes:**
- All MESBG units and heroes across Good/Evil factions
- Complete stat profiles (MWFW, points costs, wargear)
- Unit options and equipment
- Army-specific rules and bow/throw limits
- ~80+ different army lists

#### 3. Data Architecture

**Two-Layer System:**
1. **Game Data (Static)** - Official MESBG rules and units
   - Located in `src/data/`
   - TypeScript interfaces in `src/types/mesbg-data.types.ts`
   - Service layer in `src/services/mesbgDataService.ts`

2. **Collection Data (User)** - Personal inventory tracking
   - Model in `src/models/Collection.ts`
   - Storage in `src/services/collectionStorage.ts`
   - View service in `src/services/collectionViewService.ts`

**Key Design Decision:** Collection items reference game data by `model_id`, keeping user data separate from game rules.

#### 4. TypeScript Type System ✅

**Core Types:**
```typescript
// Game data types
- MesbgUnit: Full unit profile with stats, options, points
- ArmyListData: Army-specific rules and restrictions
- UnitOption: Equipment and upgrades
- CollectionItem: User's owned miniatures
- CollectionItemView: Combined view (collection + game data)
```

#### 5. Service Layer ✅

**mesbgDataService.ts** - Game data queries:
- `getAllUnits()` - Get all ~450 units
- `getUnit(model_id)` - Get specific unit
- `getUnitsByArmy(armyName)` - Filter by army
- `getArmyNames()` - List all armies
- `searchUnits(query)` - Search by name
- `calculateUnitPoints()` - Points with options

**collectionStorage.ts** - AsyncStorage operations:
- `loadCollection()` - Load user collection
- `addItem()` - Add to collection
- `updateItem()` - Update collection item
- `deleteItem()` - Remove from collection

**collectionViewService.ts** - Data enrichment:
- `enrichCollectionItem()` - Merge collection + game data
- `getStatistics()` - Calculate stats (total models, painted, etc.)
- `filterByArmy()` - Filter collection
- `searchCollection()` - Search user collection

#### 6. UI Screens ✅

**Inventory Screen** (`app/index.tsx`)
- Lists all owned miniatures
- Shows unit name, army, type, quantity
- Displays paint status with color coding
- Statistics dashboard (total models, painted, armies)
- Long-press to delete
- Tap to view details
- Uses `CollectionItemView` with enriched game data

**Add Miniature Screen** (`app/add-miniature.tsx`)
- Two-step flow: Select Army → Select Unit
- Searchable army list (all ~80 armies)
- Unit picker with search functionality
- Shows unit details (type, points)
- Quantity input
- Paint status selection
- Optional notes field
- Integrates real MESBG data - no manual entry needed!

**Layout** (`app/_layout.tsx`)
- Stack navigation with Expo Router
- Modal presentation for add screen
- Consistent header styling

**404 Handler** (`app/+not-found.tsx`)
- Error page for invalid routes

#### 7. Data Models

**Collection.ts:**
```typescript
interface CollectionItem {
  id: string;              // Unique collection entry ID
  model_id: string;        // Reference to MesbgUnit
  owned_quantity: number;  // How many owned
  painted_quantity: number; // How many painted
  paint_status: PaintStatus;
  notes?: string;
  date_added: string;
  purchase_date?: string;
  storage_location?: string;
  custom_name?: string;
}
```

**Miniature.ts (DEPRECATED):**
- Old simple model
- Replaced by Collection.ts + MESBG data integration
- Keep file for reference but no longer used

### File Structure

```
MESBG_ARMY_COLLECTOR/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root navigation
│   ├── index.tsx                # Inventory list (UPDATED)
│   ├── add-miniature.tsx        # Add unit screen (UPDATED)
│   ├── miniature-detail.tsx     # Detail view (needs update)
│   └── +not-found.tsx           # 404 handler
├── src/
│   ├── data/                    # MESBG game data
│   │   ├── mesbg_data.json     # ~450 units
│   │   └── army_list_data.json # Army rules
│   ├── models/
│   │   ├── Collection.ts       # User collection model (NEW)
│   │   └── Miniature.ts        # Old model (deprecated)
│   ├── services/
│   │   ├── mesbgDataService.ts      # Game data queries (NEW)
│   │   ├── collectionStorage.ts     # AsyncStorage ops (NEW)
│   │   ├── collectionViewService.ts # Data enrichment (NEW)
│   │   └── storage.ts              # Old service (deprecated)
│   └── types/
│       └── mesbg-data.types.ts # TypeScript interfaces (NEW)
├── package.json               # Dependencies
├── app.json                  # Expo config
├── tsconfig.json            # TypeScript config
├── metro.config.js          # Metro bundler config
└── CLAUDE.md               # This file
```

### Current Status

**Working Features:**
✅ Inventory tracking with real MESBG units
✅ Add units by selecting from complete database
✅ Paint status tracking
✅ Statistics dashboard
✅ Army-based unit selection
✅ Search functionality
✅ Local storage persistence

**Not Yet Implemented:**
❌ Miniature detail view (still uses old model)
❌ Edit collection item
❌ Army list builder
❌ Points calculator for lists
❌ War of the Ring formations (no data available)
❌ Scenario checker (no scenario data available)
❌ Image support
❌ Advanced filtering/sorting
❌ Export/import functionality

### Known Issues

1. **IDE JSX Errors:** VSCode shows "Cannot use JSX" errors - these are false positives from IDE caching. The code compiles fine with `npx tsc --noEmit`.

2. **Miniature Detail Screen:** Still uses old `Miniature` model. Needs update to use `CollectionItemView`.

3. **Node.js Version:** Using Node 20.17.0, but some packages recommend 20.19.4+. Works fine but shows warnings.

### Next Steps

**Priority 1 - Complete Current Features:**
1. Update `miniature-detail.tsx` to use new data structure
2. Add edit functionality for collection items
3. Implement filtering/sorting in inventory view

**Priority 2 - Army List Builder:**
1. Create army list data model
2. Build warband structure
3. Implement points calculator
4. Add bow limit validation
5. Hero constraint checking

**Priority 3 - Enhanced Features:**
1. War of the Ring formations (need to create data)
2. Scenario requirements (need to create data)
3. Image support for miniatures
4. Export/import collections
5. Share army lists

### Development Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web

# Type check
npx tsc --noEmit

# Install dependencies
npm install
```

### Important Notes

**Data Updates:**
- Game data is static and downloaded from external repo
- To update: Download new JSON files from https://github.com/avcordaro/mesbg-list-builder-v2024
- User collection data is separate and won't be affected

**Storage:**
- All user data in AsyncStorage under key `@mesbg_collection`
- Data persists across app restarts
- Stored on device only (no cloud sync)

**Performance:**
- JSON data (~900KB total) loaded once on app start
- Uses useMemo for filtered lists
- Limits search results to 50 items
- Should handle large collections efficiently

### User Preferences

- Local storage only (no backend/cloud)
- Mobile app (React Native)
- Modern, easy-to-use interface
- Real MESBG data integration
- Collection tracking focus

---

## Future Session Guidance

**When resuming:**
1. Check this file for current status
2. Review file structure above
3. Note which screens use new vs old data models
4. Continue from "Next Steps" section

**Code conventions:**
- TypeScript strict mode
- Expo Router file-based routing
- Service layer pattern
- Separation of game data and user data
- Descriptive variable names
- Comments for complex logic
