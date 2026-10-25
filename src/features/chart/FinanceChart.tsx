import { useMemo } from 'react';
import ReactEChartsCore from 'echarts-for-react/esm/core';
import { echarts } from './echarts';
import type { SeriesSet } from '@/domain/projection';
import type { CurrencyCode } from '@/domain/currency';
import { cssVar } from '@/app/useMediaQuery';
import { useThemeVersion } from '@/app/useTheme';
import { ru } from '@/i18n/ru';
import type { Grouping, ViewMode } from '@/store/scenarioStore';
import { buildChartOption, type ChartColors } from './buildChartOption';

interface Props {
  series: SeriesSet;
  viewMode: ViewMode;
  grouping: Grouping;
  currency: CurrencyCode;
}

function readColors(currency: CurrencyCode): ChartColors {
  return {
    currency,
    resolve: cssVar,
    text: cssVar('--fg'),
    textMuted: cssVar('--fg-muted'),
    grid: cssVar('--grid'),
    surface: cssVar('--surface-chart'),
    income: cssVar('--series-income'),
    expense: cssVar('--series-expense'),
    balance: cssVar('--series-balance'),
  };
}

export function FinanceChart({ series, viewMode, grouping, currency }: Props) {
  const themeVersion = useThemeVersion();
  const option = useMemo(
    () => buildChartOption(series, viewMode, grouping, readColors(currency)),
    // themeVersion пересобирает опцию при смене системной темы
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, viewMode, grouping, currency, themeVersion],
  );

  if (series.perItem.length === 0) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          height: '100%',
          color: 'var(--fg-muted)',
          padding: 24,
          textAlign: 'center',
        }}
      >
        {ru.chart.empty}
      </div>
    );
  }

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      lazyUpdate
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
