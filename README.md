# MESBG Army Collector

A React Native mobile app for tracking your Middle-earth Strategy Battle Game (MESBG) miniature inventory and building army lists.

## Features

### Current Features (v1.0)
- **Inventory Tracking**: Track all your MESBG miniatures with details like:
  - Miniature name
  - Army affiliation (Gondor, Rohan, Mordor, etc.)
  - Unit type (Hero, Warrior, Cavalry, etc.)
  - Quantity owned
  - Paint status (Unpainted, Primed, In Progress, Painted, Based)
  - Points value
  - Personal notes
- **Statistics Dashboard**: See at a glance:
  - Total number of models
  - Number of painted models
  - Number of different armies
- **Add/Edit/Delete**: Full CRUD operations for your inventory
- **Local Storage**: All data stored locally on your device using AsyncStorage

### Planned Features
- Army List Builder with points calculator
- War of the Ring formation checker
- Scenario requirement validator
- Export/Import functionality
- Image support for miniatures
- Filtering and search capabilities
- Paint progress tracking

## Getting Started

### Prerequisites
- Node.js (v20+)
- npm or yarn
- Expo Go app on your mobile device (iOS or Android)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

### Running on Specific Platforms

```bash
# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

## Project Structure

```
MESBG_ARMY_COLLECTOR/
├── app/                      # App screens (using Expo Router)
│   ├── _layout.tsx          # Root layout and navigation
│   ├── index.tsx            # Main inventory list screen
│   ├── add-miniature.tsx    # Add new miniature form
│   └── miniature-detail.tsx # Miniature detail view
├── src/
│   ├── models/              # Data models
│   │   └── Miniature.ts     # Miniature type definitions
│   └── services/            # Business logic
│       └── storage.ts       # AsyncStorage service
├── assets/                  # Images and static assets
├── app.json                 # Expo configuration
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript configuration
```

## Data Model

The app uses the following data structure for miniatures:

```typescript
interface Miniature {
  id: string;
  name: string;
  army: Army;
  unitType: UnitType;
  quantity: number;
  paintStatus: PaintStatus;
  points?: number;
  notes?: string;
  dateAdded: string;
  imageUri?: string;
}
```

## Tech Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development tooling and managed workflow
- **Expo Router**: File-based routing
- **TypeScript**: Type safety
- **AsyncStorage**: Local data persistence

## Contributing

This is a personal project, but suggestions and feedback are welcome.

## Future Enhancements

- Integration with official MESBG rules and profiles
- Cloud sync across devices
- Army list sharing with friends
- Battle tracker for recording game results
- Points calculator for custom scenarios
- Community features (share paint jobs, army lists)

## License

This project is for personal use. Middle-earth Strategy Battle Game is a trademark of Games Workshop Ltd.
