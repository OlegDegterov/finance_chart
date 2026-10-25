import { useState } from 'react';
import type { Granularity, HorizonYears } from '@/domain/types';
import { ru } from '@/i18n/ru';
import { useScenarioStore, type Grouping, type ViewMode } from '@/store/scenarioStore';
import { Segmented } from '@/features/controls/Segmented';
import { FinanceChart } from './FinanceChart';
import { SeriesTable } from './SeriesTable';
import { useSeries } from './useSeries';
import styles from './ChartPanel.module.css';

const VIEW_MODES: ViewMode[] = ['lines', 'incomeVsExpense', 'cumulative', 'stacked'];
const GROUPINGS: Grouping[] = ['items', 'categories', 'totals'];
const GRANULARITIES: Granularity[] = ['month', 'quarter', 'year'];
const HORIZONS: HorizonYears[] = [1, 3, 5, 10];

export function ChartPanel() {
  const series = useSeries();
  const view = useScenarioStore((s) => s.view);
  const setView = useScenarioStore((s) => s.setView);
  const horizon = useScenarioStore((s) => s.scenario.horizonYears);
  const currency = useScenarioStore((s) => s.scenario.currency);
  const setHorizon = useScenarioStore((s) => s.setHorizon);
  const [table, setTable] = useState(false);

  const groupingApplies = view.viewMode === 'lines' || view.viewMode === 'stacked';

  return (
    <div className={styles.panel}>
      <div className={styles.controls}>
        <Segmented
          label="Вид"
          compact
          value={view.viewMode}
          options={VIEW_MODES.map((v) => ({ value: v, label: ru.viewMode[v] }))}
          onChange={(viewMode) => setView({ viewMode })}
        />
        {groupingApplies && (
          <Segmented
            label="Группировка"
            compact
            value={view.grouping}
            options={GROUPINGS.map((g) => ({ value: g, label: ru.grouping[g] }))}
            onChange={(grouping) => setView({ grouping })}
          />
        )}
        <Segmented
          label="Шаг"
          compact
          value={view.granularity}
          options={GRANULARITIES.map((g) => ({ value: g, label: ru.granularity[g] }))}
          onChange={(granularity) => setView({ granularity })}
        />
        <Segmented
          label="Горизонт"
          compact
          value={horizon}
          options={HORIZONS.map((h) => ({ value: h, label: ru.horizon(h) }))}
          onChange={setHorizon}
        />
        <button
          type="button"
          aria-pressed={table}
          onClick={() => setTable((t) => !t)}
          className={styles.tableToggle}
        >
          {ru.chart.table}
        </button>
      </div>
      <div className={styles.chart}>
        {table ? (
          <SeriesTable series={series} currency={currency} />
        ) : (
          <FinanceChart
            series={series}
            viewMode={view.viewMode}
            grouping={view.grouping}
            currency={currency}
          />
        )}
      </div>
    </div>
  );
}
