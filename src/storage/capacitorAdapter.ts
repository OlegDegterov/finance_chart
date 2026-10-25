import { Preferences } from '@capacitor/preferences';
import type { StorageAdapter } from './StorageAdapter';

/** В нативной сборке данные живут в Preferences (UserDefaults / SharedPreferences). */
export const capacitorAdapter: StorageAdapter = {
  async getItem(key) {
    return (await Preferences.get({ key })).value;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  },
};
