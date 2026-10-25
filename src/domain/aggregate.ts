import type { Granularity } from './types';
import type { SeriesSet } from './projection';

function periodKey(ym: string, granularity: Granularity): string {
  const [year, month] = ym.split('-');
  if (granularity === 'month') return ym;
  if (granularity === 'year') return year ?? ym;
  const quarter = Math.ceil(Number(month) / 3);
  return `${year}-Q${quarter}`;
}

/** Индексы границ: для каждого периода — позиции месяцев, которые в него попадают. */
function groupIndices(
  periods: string[],
  granularity: Granularity,
): { key: string; idx: number[] }[] {
  const groups: { key: string; idx: number[] }[] = [];
  periods.forEach((ym, i) => {
    const key = periodKey(ym, granularity);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.idx.push(i);
    else groups.push({ key, idx: [i] });
  });
  return groups;
}

function sumBy(values: number[], groups: { idx: number[] }[]): number[] {
  return groups.map((g) => g.idx.reduce((acc, i) => acc + (values[i] ?? 0), 0));
}

function lastBy(values: number[], groups: { idx: number[] }[]): number[] {
  return groups.map((g) => values[g.idx[g.idx.length - 1] ?? 0] ?? 0);
}

/**
 * Перегруппировка помесячных рядов: потоки суммируются за период,
 * накопительный баланс берётся на конец периода. Периоды привязаны к календарю,
 * поэтому первый и последний могут быть неполными.
 */
export function aggregate(series: SeriesSet, granularity: Granularity): SeriesSet {
  if (granularity === 'month') return series;
  const groups = groupIndices(series.periods, granularity);
  return {
    periods: groups.map((g) => g.key),
    perItem: series.perItem.map((s) => ({ item: s.item, values: sumBy(s.values, groups) })),
    perCategory: series.perCategory.map((s) => ({ ...s, values: sumBy(s.values, groups) })),
    deposits: series.deposits.map((d) => ({ item: d.item, balance: lastBy(d.balance, groups) })),
    totals: {
      income: sumBy(series.totals.income, groups),
      expense: sumBy(series.totals.expense, groups),
      net: sumBy(series.totals.net, groups),
    },
    cumulative: lastBy(series.cumulative, groups),
  };
}
