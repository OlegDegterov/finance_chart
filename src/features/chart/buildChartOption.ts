import type { EChartsOption, LineSeriesOption } from 'echarts';
import { categoryColorVar, categoryOrder } from '@/domain/categories';
import type { CurrencyCode } from '@/domain/currency';
import { formatMoney } from '@/domain/money';
import type { SeriesSet } from '@/domain/projection';
import type { Kind } from '@/domain/types';
import { ru } from '@/i18n/ru';
import type { Grouping, ViewMode } from '@/store/scenarioStore';
import { categoryLabel } from '@/features/items/itemSummary';
import { periodLabelFull, periodLabelShort } from './periodLabel';

/** Цвета читаются из CSS-переменных при каждой сборке — так работает тёмная тема. */
export interface ChartColors {
  resolve(cssVar: string): string;
  text: string;
  textMuted: string;
  grid: string;
  surface: string;
  income: string;
  expense: string;
  balance: string;
  /** Валюта для подписей осей и тултипа. */
  currency: CurrencyCode;
}

interface Entry {
  id: string;
  name: string;
  kind: Kind;
  color: string;
  values: number[];
}

function entries(series: SeriesSet, grouping: Grouping, colors: ChartColors): Entry[] {
  if (grouping === 'items') {
    return [...series.perItem]
      .sort(
        (a, b) =>
          categoryOrder(a.item.category, a.item.kind) - categoryOrder(b.item.category, b.item.kind),
      )
      .map(({ item, values }) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        color: item.color ?? colors.resolve(categoryColorVar(item.category)),
        values,
      }));
  }
  if (grouping === 'categories') {
    return [...series.perCategory]
      .sort((a, b) => categoryOrder(a.category, a.kind) - categoryOrder(b.category, b.kind))
      .map((c) => ({
        id: `${c.kind}:${c.category}`,
        name: categoryLabel(c.category),
        kind: c.kind,
        color: colors.resolve(categoryColorVar(c.category)),
        values: c.values,
      }));
  }
  return [
    {
      id: 'income',
      name: ru.chart.income,
      kind: 'income',
      color: colors.income,
      values: series.totals.income,
    },
    {
      id: 'expense',
      name: ru.chart.expense,
      kind: 'expense',
      color: colors.expense,
      values: series.totals.expense,
    },
  ];
}

const HIDDEN = '__hidden__';

interface TooltipParam {
  seriesName?: string;
  seriesId?: string;
  marker?: string;
  color?: string;
  value?: number;
  dataIndex?: number;
  axisValue?: string;
}

function tooltipFormatter(colors: ChartColors, periods: string[]) {
  return (raw: unknown): string => {
    const params = (Array.isArray(raw) ? raw : [raw]) as TooltipParam[];
    const visible = params.filter(
      (p) => !String(p.seriesId ?? '').startsWith(HIDDEN) && typeof p.value === 'number',
    );
    if (visible.length === 0) return '';
    const period = periods[visible[0]?.dataIndex ?? 0] ?? '';
    const rows = [...visible]
      .sort((a, b) => Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0))
      .map(
        (p) =>
          `<div style="display:flex;justify-content:space-between;gap:16px;align-items:center">` +
          `<span style="display:flex;align-items:center;gap:6px;color:${colors.textMuted}">` +
          `<i style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></i>${p.seriesName ?? ''}</span>` +
          `<b style="color:${colors.text};font-weight:600">${formatMoney(Math.abs(p.value ?? 0), { currency: colors.currency })}</b></div>`,
      )
      .join('');
    return (
      `<div style="font:13px/1.5 inherit;min-width:180px">` +
      `<div style="color:${colors.textMuted};margin-bottom:4px">${periodLabelFull(period)}</div>${rows}</div>`
    );
  };
}

function baseOption(series: SeriesSet, colors: ChartColors, legend: boolean): EChartsOption {
  return {
    backgroundColor: 'transparent',
    animationDuration: 300,
    textStyle: { fontFamily: 'inherit', color: colors.text },
    grid: { left: 12, right: 16, top: legend ? 48 : 16, bottom: 64, containLabel: true },
    xAxis: {
      type: 'category',
      data: series.periods,
      boundaryGap: false,
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false },
      axisLabel: { color: colors.textMuted, formatter: periodLabelShort, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: colors.textMuted,
        formatter: (v: number) => formatMoney(v, { compact: true, currency: colors.currency }),
      },
      splitLine: { lineStyle: { color: colors.grid } },
    },
    legend: legend
      ? {
          top: 4,
          type: 'scroll',
          textStyle: { color: colors.text },
          icon: 'roundRect',
          itemWidth: 14,
          itemHeight: 4,
        }
      : { show: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: colors.textMuted, width: 1 } },
      backgroundColor: colors.surface,
      borderColor: colors.grid,
      textStyle: { color: colors.text },
      formatter: tooltipFormatter(colors, series.periods),
      confine: true,
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        bottom: 8,
        height: 28,
        borderColor: colors.grid,
        fillerColor: `${colors.balance}22`,
        handleStyle: { color: colors.surface, borderColor: colors.textMuted },
        moveHandleSize: 8,
        textStyle: { color: colors.textMuted },
        labelFormatter: (_: number, label: string) => periodLabelShort(label),
        dataBackground: {
          lineStyle: { color: colors.grid },
          areaStyle: { color: colors.grid, opacity: 0.4 },
        },
        selectedDataBackground: {
          lineStyle: { color: colors.balance },
          areaStyle: { color: colors.balance, opacity: 0.2 },
        },
      },
    ],
  };
}

function lineSeries(e: Entry, extra: Partial<LineSeriesOption> = {}): LineSeriesOption {
  return {
    id: e.id,
    name: e.name,
    type: 'line',
    data: e.values,
    color: e.color,
    showSymbol: false,
    symbol: 'circle',
    symbolSize: 8,
    lineStyle: { width: 2, type: e.kind === 'expense' ? 'dashed' : 'solid' },
    emphasis: { focus: 'series' },
    ...extra,
  };
}

export function buildChartOption(
  series: SeriesSet,
  viewMode: ViewMode,
  grouping: Grouping,
  colors: ChartColors,
): EChartsOption {
  if (viewMode === 'cumulative') {
    const min = Math.min(...series.cumulative);
    const depositLines: LineSeriesOption[] = series.deposits.map((d) => ({
      id: `deposit:${d.item.id}`,
      name: `${d.item.name} — ${ru.chart.depositBalance}`,
      type: 'line',
      data: d.balance.map((v) => (v === 0 ? null : v)),
      color: d.item.color ?? colors.resolve(categoryColorVar(d.item.category)),
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 2, type: 'dashed' },
      emphasis: { focus: 'series' },
    }));
    return {
      ...baseOption(series, colors, depositLines.length > 0),
      series: [
        {
          id: 'balance',
          name: ru.chart.balance,
          type: 'line',
          data: series.cumulative,
          color: colors.balance,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.12 },
          markLine:
            min < 0
              ? {
                  silent: true,
                  symbol: 'none',
                  label: { show: false },
                  lineStyle: { color: colors.textMuted, type: 'solid', width: 1 },
                  data: [{ yAxis: 0 }],
                }
              : undefined,
        },
        ...depositLines,
      ],
    };
  }

  if (viewMode === 'incomeVsExpense') {
    const { income, expense, net } = series.totals;
    const base = income.map((v, i) => Math.min(v, expense[i] ?? 0));
    const surplus = net.map((v) => Math.max(v, 0));
    const deficit = net.map((v) => Math.max(-v, 0));
    const hidden = (
      id: string,
      data: number[],
      color: string,
      opacity: number,
    ): LineSeriesOption => ({
      id: `${HIDDEN}${id}`,
      name: `${HIDDEN}${id}`,
      type: 'line',
      data,
      stack: 'band',
      silent: true,
      showSymbol: false,
      lineStyle: { opacity: 0 },
      areaStyle: { color, opacity },
      tooltip: { show: false },
      emphasis: { disabled: true },
    });
    const [inc, exp] = entries(series, 'totals', colors);
    return {
      ...baseOption(series, colors, true),
      legend: {
        ...(baseOption(series, colors, true).legend as object),
        data: [inc!.name, exp!.name],
      },
      series: [
        hidden('base', base, colors.surface, 0),
        hidden('surplus', surplus, colors.income, 0.2),
        hidden('deficit', deficit, colors.expense, 0.2),
        lineSeries(inc!),
        lineSeries(exp!),
      ],
    };
  }

  const list = entries(series, grouping, colors);

  if (viewMode === 'stacked') {
    return {
      ...baseOption(series, colors, list.length >= 2),
      series: list.map((e) =>
        lineSeries(e, {
          data: e.kind === 'expense' ? e.values.map((v) => -v) : e.values,
          stack: e.kind,
          areaStyle: { opacity: 0.85 },
          lineStyle: { width: 2, color: colors.surface },
          emphasis: { focus: 'series' },
        }),
      ),
    };
  }

  return {
    ...baseOption(series, colors, list.length >= 2),
    series: list.map((e) => lineSeries(e)),
  };
}
