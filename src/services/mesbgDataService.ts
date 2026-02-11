import mesbgDataJson from '../data/mesbg_data.json';
import armyListDataJson from '../data/army_list_data.json';
import { MesbgData, MesbgUnit, ArmyListDataCollection } from '../types/mesbg-data.types';

const mesbgData: MesbgData = mesbgDataJson as MesbgData;
const armyListData: ArmyListDataCollection = armyListDataJson as ArmyListDataCollection;

export const mesbgDataService = {
  // Get all units
  getAllUnits(): MesbgUnit[] {
    return Object.values(mesbgData);
  },

  // Get unit by model_id
  getUnit(model_id: string): MesbgUnit | undefined {
    return mesbgData[model_id];
  },

  // Get units by army
  getUnitsByArmy(armyName: string): MesbgUnit[] {
    return Object.values(mesbgData).filter(unit => unit.army_list === armyName);
  },

  // Get all unique army names
  getArmyNames(): string[] {
    const armies = new Set(Object.values(mesbgData).map(unit => unit.army_list));
    return Array.from(armies).sort();
  },

  // Get army names by type (Good/Evil)
  getArmyNamesByType(armyType: 'Good' | 'Evil'): string[] {
    const armies = new Set(
      Object.values(mesbgData)
        .filter(unit => unit.army_type === armyType || unit.army_type === `${armyType} (Legacy)`)
        .map(unit => unit.army_list)
    );
    return Array.from(armies).sort();
  },

  // Get army list data (rules, bow limits, etc.)
  getArmyListData(armyName: string) {
    return armyListData[armyName];
  },

  // Search units by name
  searchUnits(query: string): MesbgUnit[] {
    const lowerQuery = query.toLowerCase();
    return Object.values(mesbgData).filter(unit =>
      unit.name.toLowerCase().includes(lowerQuery)
    );
  },

  // Get units by type
  getUnitsByType(unitType: string): MesbgUnit[] {
    return Object.values(mesbgData).filter(unit => unit.unit_type === unitType);
  },

  // Get heroes only
  getHeroes(): MesbgUnit[] {
    return Object.values(mesbgData).filter(unit =>
      unit.unit_type.includes('Hero')
    );
  },

  // Get warriors only
  getWarriors(): MesbgUnit[] {
    return Object.values(mesbgData).filter(unit =>
      unit.unit_type === 'Warrior'
    );
  },

  // Calculate total points for a unit with options
  calculateUnitPoints(unit: MesbgUnit, selectedOptions: string[] = []): number {
    let total = unit.base_points;

    selectedOptions.forEach(optionId => {
      const option = unit.options.find(opt => opt.id === optionId);
      if (option) {
        total += option.points;
      }
    });

    return total;
  },

  // Parse MWFW stats
  parseMWFW(mwfw: string): { might: number; will: number; fate: number; wounds: number } | null {
    if (!mwfw || mwfw === '') return null;
    const parts = mwfw.split(':').map(n => parseInt(n) || 0);
    if (parts.length !== 4) return null;
    return {
      might: parts[0],
      will: parts[1],
      fate: parts[2],
      wounds: parts[3]
    };
  }
};
