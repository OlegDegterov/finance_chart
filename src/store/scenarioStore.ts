import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CurrencyCode } from '@/domain/currency';
import type { Granularity, HorizonYears, Item, NewItem, Scenario } from '@/domain/types';
import { parseScenario } from '@/domain/migrate';
import { createStorageAdapter } from '@/storage';
import { createDemoScenario } from './demo';

export type ViewMode = 'lines' | 'incomeVsExpense' | 'cumulative' | 'stacked';
export type Grouping = 'items' | 'categories' | 'totals';

export interface ViewSettings {
  viewMode: ViewMode;
  grouping: Grouping;
  granularity: Granularity;
}

export interface ScenarioState {
  scenario: Scenario;
  view: ViewSettings;
  /** true, когда состояние прочитано из хранилища. */
  hydrated: boolean;

  addItem(item: NewItem): string;
  updateItem(id: string, patch: Partial<Item>): void;
  removeItem(id: string): void;
  toggleItem(id: string): void;
  setStartingBalance(kopecks: number): void;
  setHorizon(years: HorizonYears): void;
  setCurrency(currency: CurrencyCode): void;
  setView(patch: Partial<ViewSettings>): void;
  replaceScenario(scenario: Scenario): void;
  loadDemo(): void;
  setHydrated(): void;
}

const STORAGE_KEY = 'finance-chart';
const STORE_VERSION = 1;

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set) => ({
      scenario: createDemoScenario(),
      view: { viewMode: 'incomeVsExpense', grouping: 'totals', granularity: 'month' },
      hydrated: false,

      addItem(item) {
        const id = crypto.randomUUID();
        set((s) => ({
          scenario: { ...s.scenario, items: [...s.scenario.items, { ...item, id } as Item] },
        }));
        return id;
      },
      updateItem(id, patch) {
        set((s) => ({
          scenario: {
            ...s.scenario,
            items: s.scenario.items.map((it) =>
              it.id === id ? ({ ...it, ...patch } as Item) : it,
            ),
          },
        }));
      },
      removeItem(id) {
        set((s) => ({
          scenario: { ...s.scenario, items: s.scenario.items.filter((it) => it.id !== id) },
        }));
      },
      toggleItem(id) {
        set((s) => ({
          scenario: {
            ...s.scenario,
            items: s.scenario.items.map((it) =>
              it.id === id ? { ...it, enabled: !it.enabled } : it,
            ),
          },
        }));
      },
      setStartingBalance(kopecks) {
        set((s) => ({ scenario: { ...s.scenario, startingBalance: Math.round(kopecks) } }));
      },
      setHorizon(years) {
        set((s) => ({ scenario: { ...s.scenario, horizonYears: years } }));
      },
      setCurrency(currency) {
        set((s) => ({ scenario: { ...s.scenario, currency } }));
      },
      setView(patch) {
        set((s) => ({ view: { ...s.view, ...patch } }));
      },
      replaceScenario(scenario) {
        set({ scenario });
      },
      loadDemo() {
        set({ scenario: createDemoScenario() });
      },
      setHydrated() {
        set({ hydrated: true });
      },
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => createStorageAdapter()),
      partialize: (s) => ({ scenario: s.scenario, view: s.view }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<ScenarioState, 'scenario' | 'view'>> | undefined;
        return {
          ...current,
          view: { ...current.view, ...p?.view },
          scenario: p?.scenario ? safeParse(p.scenario, current.scenario) : current.scenario,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

function safeParse(raw: unknown, fallback: Scenario): Scenario {
  try {
    return parseScenario(raw);
  } catch {
    return fallback;
  }
}
