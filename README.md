# MESBG Army Collector

A React Native mobile app for tracking your Middle-earth Strategy Battle Game (MESBG) miniature collection and checking scenario playability against what you own.

## Features

### Collection Management
- **Inventory Tracking**: Add any of ~450 MESBG units from the complete community database
- **Paint Status**: Track each unit across 5 stages — Unpainted, Primed, In Progress, Painted, Painted & Based
- **Equipment Options**: Select wargear per unit (options pulled from official data)
- **Metadata**: Notes, custom name overrides, storage location, purchase date
- **Duplicate Detection**: Warns if a unit is already in your collection, offers merge or separate entry
- **Edit & Delete**: Full CRUD for all collection items

### Inventory View
- Statistics dashboard: total models, painted count, army count
- Painting progress bar (overall percentage)
- Two view modes: card view (with unit images) and compact list view
- Color-coded paint status badges
- Quick action panel for fast status updates

### Scenario Browser
- Browse 500+ MESBG scenarios with search and multi-filter support
- Filter by sourcebook, historical age (FA/SA/TA), location, and legacy status
- **Playability Check**: Compares your collection against scenario faction requirements and shows:
  - Green: Can play (all roles covered for that side)
  - Orange: Partial (some roles covered)
  - Red: Missing required models
- Show only playable scenarios toggle
- **Quick-Add from Scenarios**: Click missing roles to add those units directly to your collection — role requirements auto-match to database units with equipment pre-selected

### Settings
- Light / Dark mode (persisted)
- Clear entire collection (with confirmation)

## Tech Stack

- **React Native 0.81.5** / **React 19**
- **Expo SDK 54**
- **Expo Router** — file-based navigation
- **TypeScript 5.9** — strict mode
- **AsyncStorage** — local device persistence (no backend, no cloud)

## Project Structure

```
MESBG_ARMY_COLLECTOR/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root navigation + theme provider
│   ├── index.tsx                # Inventory list screen
│   ├── add-miniature.tsx        # Add unit to collection
│   ├── edit-miniature.tsx       # Edit collection item
│   ├── miniature-detail.tsx     # Unit detail view
│   ├── scenarios.tsx            # Scenario browser
│   ├── scenario-detail.tsx      # Scenario detail + playability check
│   ├── settings.tsx             # App settings
│   └── +not-found.tsx           # 404 handler
├── src/
│   ├── contexts/
│   │   └── ThemeContext.tsx     # Light/dark theme with AsyncStorage
│   ├── data/
│   │   ├── mesbg_data.json     # ~450 units with stats, options, costs
│   │   ├── army_list_data.json # ~80 armies with rules and limits
│   │   └── scenarios_*.json    # Scenario definitions + role mappings
│   ├── models/
│   │   └── Collection.ts       # CollectionItem interface + helpers
│   ├── services/
│   │   ├── mesbgDataService.ts      # Query game data (units, armies, search)
│   │   ├── collectionStorage.ts     # AsyncStorage CRUD
│   │   ├── collectionViewService.ts # Enrich collection with game data
│   │   ├── scenarioService.ts       # Query and normalize scenario data
│   │   └── imageService.ts          # Unit image URL generation
│   ├── types/
│   │   ├── mesbg-data.types.ts # Game data interfaces
│   │   └── scenario.types.ts   # Scenario interfaces
│   └── utils/
│       ├── scenarioRoleMatching.ts # Role ↔ unit matching logic
│       └── unitNameAliases.ts      # Unit name normalization
├── app.json
├── package.json
└── tsconfig.json
```

## Data Model

```typescript
interface CollectionItem {
  id: string;                    // Unique entry ID
  model_id: string;              // Reference to MesbgUnit in game data
  owned_quantity: number;
  painted_quantity: number;
  paint_status: PaintStatus;     // UNPAINTED | PRIMED | IN_PROGRESS | PAINTED | BASED
  selected_options: string[];    // Wargear option IDs
  notes?: string;
  custom_name?: string;
  storage_location?: string;
  purchase_date?: string;
  date_added: string;
}
```

Game data (units, armies, scenarios) is static JSON sourced from [mesbg-list-builder-v2024](https://github.com/avcordaro/mesbg-list-builder-v2024). User collection data is stored separately on-device and never affected by data updates.

## Getting Started

### Prerequisites
- Node.js v20+
- Expo Go app on your mobile device

### Install & Run

```bash
npm install
npm start
```

Scan the QR code with the Camera app (iOS) or Expo Go (Android).

```bash
npm run android   # Android emulator
npm run ios       # iOS simulator
npm run web       # Web browser
```

### Type Check

```bash
npx tsc --noEmit
```

## Not Yet Implemented

- Army list builder (warband structure + points calculator)
- War of the Ring formation checker
- Export / import collection
- Advanced inventory filtering and sorting
- Cloud sync

## License

Personal use project. Middle-earth Strategy Battle Game is a trademark of Games Workshop Ltd.
