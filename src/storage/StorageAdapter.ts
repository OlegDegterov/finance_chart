/**
 * Минимальный интерфейс key-value хранилища. Совпадает с `StateStorage` из zustand,
 * чтобы адаптер можно было передать в `persist` напрямую. Под этот же интерфейс
 * позже встанет синхронизация с бэкендом.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
