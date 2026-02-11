import AsyncStorage from '@react-native-async-storage/async-storage';
import { Miniature } from '../models/Miniature';

const STORAGE_KEY = '@mesbg_inventory';

export const storageService = {
  async saveMiniatures(miniatures: Miniature[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(miniatures);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
      console.error('Error saving miniatures:', e);
      throw e;
    }
  },

  async loadMiniatures(): Promise<Miniature[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Error loading miniatures:', e);
      return [];
    }
  },

  async addMiniature(miniature: Miniature): Promise<void> {
    const miniatures = await this.loadMiniatures();
    miniatures.push(miniature);
    await this.saveMiniatures(miniatures);
  },

  async updateMiniature(id: string, updatedMiniature: Miniature): Promise<void> {
    const miniatures = await this.loadMiniatures();
    const index = miniatures.findIndex(m => m.id === id);
    if (index !== -1) {
      miniatures[index] = updatedMiniature;
      await this.saveMiniatures(miniatures);
    }
  },

  async deleteMiniature(id: string): Promise<void> {
    const miniatures = await this.loadMiniatures();
    const filtered = miniatures.filter(m => m.id !== id);
    await this.saveMiniatures(filtered);
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing storage:', e);
      throw e;
    }
  }
};
