import { createStore, del, get, set } from 'idb-keyval';
import type { StorageAdapter } from './StorageAdapter';

const store = createStore('finance-chart', 'state');

export const indexedDbAdapter: StorageAdapter = {
  async getItem(key) {
    return (await get<string>(key, store)) ?? null;
  },
  async setItem(key, value) {
    await set(key, value, store);
  },
  async removeItem(key) {
    await del(key, store);
  },
};
