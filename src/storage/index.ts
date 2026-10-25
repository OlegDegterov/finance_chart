import { Capacitor } from '@capacitor/core';
import type { StorageAdapter } from './StorageAdapter';
import { indexedDbAdapter } from './indexedDbAdapter';
import { capacitorAdapter } from './capacitorAdapter';

/** Точка выбора хранилища: веб и PWA — IndexedDB, нативная сборка — Capacitor Preferences. */
export function createStorageAdapter(): StorageAdapter {
  return Capacitor.isNativePlatform() ? capacitorAdapter : indexedDbAdapter;
}
