import AsyncStorage from '@react-native-async-storage/async-storage';
import { CollectionItem } from '../models/Collection';

const STORAGE_KEY = '@mesbg_collection';

export const collectionStorage = {
  async saveCollection(items: CollectionItem[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(items);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
      console.error('Error saving collection:', e);
      throw e;
    }
  },

  async loadCollection(): Promise<CollectionItem[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Error loading collection:', e);
      return [];
    }
  },

  async addItem(item: CollectionItem): Promise<void> {
    const items = await this.loadCollection();
    items.push(item);
    await this.saveCollection(items);
  },

  async updateItem(id: string, updatedItem: CollectionItem): Promise<void> {
    const items = await this.loadCollection();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = updatedItem;
      await this.saveCollection(items);
    }
  },

  async deleteItem(id: string): Promise<void> {
    const items = await this.loadCollection();
    const filtered = items.filter(item => item.id !== id);
    await this.saveCollection(filtered);
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
