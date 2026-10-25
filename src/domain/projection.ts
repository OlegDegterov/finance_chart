import type { DepositItem, FlowItem, Item, Kind, MonthRange, Scenario, YearMonth } from './types';
import { monthIndex, rangeMonths } from './months';

export interface ItemSeries {
  item: Item;
  values: number[];
}

export interface CategorySeries {
  category: string;
  kind: Kind;
  values: number[];
}

export interface Totals {
  income: number[];
  expense: number[];
  /** income − expense */
  net: number[];
}

export interface DepositSeries {
  item: DepositItem;
  /** Остаток на счёте вклада на конец месяца: тело + пополнения + капитализированные проценты. */
  balance: number[];
}

export interface DepositProjection {
  /** Проценты за месяц — это доход статьи. */
  interest: number[];
  balance: number[];
}

export interface SeriesSet {
  /** Подписи периодов: 'YYYY-MM', а после агрегации — 'YYYY-Qn' или 'YYYY'. */
  periods: string[];
  perItem: ItemSeries[];
  perCategory: CategorySeries[];
  deposits: DepositSeries[];
  totals: Totals;
  /** startingBalance + накопленная сумма net. */
  cumulative: number[];
}

const FREQUENCY_STEP: Record<FlowItem['frequency'], number | null> = {
  once: null,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const CAPITALIZATION_STEP: Record<DepositItem['capitalization'], number | null> = {
  none: null,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

function projectFlow(item: FlowItem, range: MonthRange): number[] {
  const start = monthIndex(item.start);
  const end = item.end ? monthIndex(item.end) : Infinity;
  const first = monthIndex(range.start);
  const step = FREQUENCY_STEP[item.frequency];
  const growth = 1 + (item.indexationPct ?? 0) / 100;

  return Array.from({ length: range.months }, (_, i) => {
    const idx = first + i;
    if (idx < start || idx > end) return 0;
    const elapsed = idx - start;
    const hits = step === null ? elapsed === 0 : elapsed % step === 0;
    if (!hits) return 0;
    const years = Math.floor(elapsed / 12);
    return Math.round(item.amount * growth ** years);
  });
}

/**
 * Проценты начисляются ежемесячно на текущее тело вклада. При капитализации
 * накопленные проценты присоединяются к телу в конце каждого периода капитализации.
 * Ежемесячное пополнение добавляется к телу в конце каждого месяца, поэтому проценты
 * на него идут со следующего месяца. Пополнение — перевод, а не доход: в ряд не попадает.
 * Остаток на счёте: при капитализации — тело плюс ещё не присоединённые проценты,
 * без капитализации проценты выплачиваются и на счёте не копятся.
 */
export function projectDeposit(item: DepositItem, range: MonthRange): DepositProjection {
  const start = monthIndex(item.start);
  const end = item.termMonths ? start + item.termMonths - 1 : Infinity;
  const first = monthIndex(range.start);
  const last = first + range.months - 1;
  const monthlyRate = item.ratePct / 100 / 12;
  const step = CAPITALIZATION_STEP[item.capitalization];

  const interestSeries = new Array<number>(range.months).fill(0);
  const balanceSeries = new Array<number>(range.months).fill(0);
  if (start > last) return { interest: interestSeries, balance: balanceSeries };

  let body = item.principal;
  let accrued = 0;
  const simulateUntil = Math.min(end, last);
  for (let idx = start; idx <= simulateUntil; idx++) {
    const interest = body * monthlyRate;
    accrued += interest;
    const offset = idx - first;
    if (offset >= 0) interestSeries[offset] = Math.round(interest);
    if (step !== null && (idx - start + 1) % step === 0) {
      body += accrued;
      accrued = 0;
    }
    body += item.monthlyContribution ?? 0;
    if (offset >= 0) balanceSeries[offset] = Math.round(step === null ? body : body + accrued);
  }
  // После окончания срока счёт закрыт — остаток не показываем.
  return { interest: interestSeries, balance: balanceSeries };
}

/** Остаток на счёте вклада на конец срока (или на конец горизонта, если вклад бессрочный). */
export function depositFinalBalance(item: DepositItem, horizonEnd: YearMonth): number {
  const start = monthIndex(item.start);
  const end = item.termMonths
    ? start + item.termMonths - 1
    : Math.max(monthIndex(horizonEnd), start);
  const months = end - start + 1;
  const { balance } = projectDeposit(item, { start: item.start, months });
  return balance[months - 1] ?? 0;
}

export function projectItem(item: Item, range: MonthRange): number[] {
  return item.type === 'flow' ? projectFlow(item, range) : projectDeposit(item, range).interest;
}

function sumSeries(series: number[][], length: number): number[] {
  const out = new Array<number>(length).fill(0);
  for (const s of series) for (let i = 0; i < length; i++) out[i] = (out[i] ?? 0) + (s[i] ?? 0);
  return out;
}

export function buildSeries(scenario: Scenario, range: MonthRange): SeriesSet {
  const periods: YearMonth[] = rangeMonths(range);
  const perItem: ItemSeries[] = scenario.items
    .filter((item) => item.enabled)
    .map((item) => ({ item, values: projectItem(item, range) }));

  const byCategory = new Map<string, CategorySeries>();
  for (const { item, values } of perItem) {
    const key = `${item.kind}:${item.category}`;
    const existing = byCategory.get(key);
    if (existing) {
      existing.values = sumSeries([existing.values, values], range.months);
    } else {
      byCategory.set(key, { category: item.category, kind: item.kind, values: [...values] });
    }
  }

  const income = sumSeries(
    perItem.filter((s) => s.item.kind === 'income').map((s) => s.values),
    range.months,
  );
  const expense = sumSeries(
    perItem.filter((s) => s.item.kind === 'expense').map((s) => s.values),
    range.months,
  );
  const net = income.map((v, i) => v - (expense[i] ?? 0));

  let balance = scenario.startingBalance;
  const cumulative = net.map((v) => (balance += v));

  const deposits: DepositSeries[] = perItem
    .map((s) => s.item)
    .filter((item): item is DepositItem => item.type === 'deposit')
    .map((item) => ({ item, balance: projectDeposit(item, range).balance }));

  return {
    periods,
    perItem,
    perCategory: [...byCategory.values()],
    deposits,
    totals: { income, expense, net },
    cumulative,
  };
}

export function scenarioRange(scenario: Scenario, start: YearMonth): MonthRange {
  return { start, months: scenario.horizonYears * 12 };
}
