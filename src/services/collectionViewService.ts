import { CollectionItem } from '../models/Collection';
import { MesbgUnit } from '../types/mesbg-data.types';
import { mesbgDataService } from './mesbgDataService';

// Combined view of collection item + game data
export interface CollectionItemView extends CollectionItem {
  unit?: MesbgUnit;
  display_name: string;
  army_name: string;
  unit_type: string;
  base_points: number;
}

export const collectionViewService = {
  // Enrich collection item with game data
  enrichCollectionItem(item: CollectionItem): CollectionItemView {
    const unit = mesbgDataService.getUnit(item.model_id);

    return {
      ...item,
      unit,
      display_name: item.custom_name || unit?.name || 'Unknown Unit',
      army_name: unit?.army_list || 'Unknown Army',
      unit_type: unit?.unit_type || 'Unknown',
      base_points: unit?.base_points || 0
    };
  },

  // Enrich multiple collection items
  enrichCollection(items: CollectionItem[]): CollectionItemView[] {
    return items.map(item => this.enrichCollectionItem(item));
  },

  // Get collection statistics
  getStatistics(items: CollectionItem[]): {
    totalModels: number;
    paintedModels: number;
    totalArmies: number;
    totalPoints: number;
    byArmy: { [army: string]: number };
    byPaintStatus: { [status: string]: number };
  } {
    const enriched = this.enrichCollection(items);

    const byArmy: { [army: string]: number } = {};
    const byPaintStatus: { [status: string]: number } = {};

    let totalModels = 0;
    let paintedModels = 0;
    let totalPoints = 0;

    enriched.forEach(item => {
      totalModels += item.owned_quantity;
      paintedModels += item.painted_quantity;
      totalPoints += item.base_points * item.owned_quantity;

      byArmy[item.army_name] = (byArmy[item.army_name] || 0) + item.owned_quantity;
      byPaintStatus[item.paint_status] = (byPaintStatus[item.paint_status] || 0) + item.owned_quantity;
    });

    return {
      totalModels,
      paintedModels,
      totalArmies: Object.keys(byArmy).length,
      totalPoints,
      byArmy,
      byPaintStatus
    };
  },

  // Filter collection by army
  filterByArmy(items: CollectionItemView[], armyName: string): CollectionItemView[] {
    return items.filter(item => item.army_name === armyName);
  },

  // Filter collection by paint status
  filterByPaintStatus(items: CollectionItemView[], paintStatus: string): CollectionItemView[] {
    return items.filter(item => item.paint_status === paintStatus);
  },

  // Search collection
  searchCollection(items: CollectionItemView[], query: string): CollectionItemView[] {
    const lowerQuery = query.toLowerCase();
    return items.filter(item =>
      item.display_name.toLowerCase().includes(lowerQuery) ||
      item.army_name.toLowerCase().includes(lowerQuery) ||
      item.notes?.toLowerCase().includes(lowerQuery)
    );
  }
};
