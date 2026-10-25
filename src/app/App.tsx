import { useState } from 'react';
import { ru } from '@/i18n/ru';
import { useScenarioStore } from '@/store/scenarioStore';
import { ItemList } from '@/features/items/ItemList';
import { ChartPanel } from '@/features/chart/ChartPanel';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { useMediaQuery } from './useMediaQuery';
import styles from './App.module.css';

type Tab = 'items' | 'chart' | 'settings';

export function App() {
  const wide = useMediaQuery('(min-width: 900px)');
  const hydrated = useScenarioStore((s) => s.hydrated);
  const [tab, setTab] = useState<Tab>('chart');

  if (!hydrated) return <div className={styles.loading}>…</div>;

  if (wide) {
    const sideTab = tab === 'settings' ? 'settings' : 'items';
    return (
      <div className={`${styles.app} ${styles.wide}`}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTabs} role="tablist">
            {(['items', 'settings'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={sideTab === t} onClick={() => setTab(t)}>
                {ru.tabs[t]}
              </button>
            ))}
          </div>
          <div className={styles.content}>
            {sideTab === 'items' ? <ItemList /> : <SettingsPanel />}
          </div>
        </aside>
        <main className={styles.main}>
          <ChartPanel />
        </main>
      </div>
    );
  }

  return (
    <div className={`${styles.app} ${styles.narrow}`}>
      <main className={styles.content}>
        {tab === 'items' && <ItemList />}
        {tab === 'chart' && <ChartPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </main>
      <nav className={styles.tabbar} role="tablist">
        {(['items', 'chart', 'settings'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {ru.tabs[t]}
          </button>
        ))}
      </nav>
    </div>
  );
}
