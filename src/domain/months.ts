import type { MonthRange, YearMonth } from './types';

/** Порядковый номер месяца от начала эры: удобен для целочисленной арифметики. */
export function monthIndex(ym: YearMonth): number {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) throw new Error(`Некорректный месяц: ${ym}`);
  return y * 12 + (m - 1);
}

export function yearMonthFromIndex(index: number): YearMonth {
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  return yearMonthFromIndex(monthIndex(ym) + delta);
}

export function currentYearMonth(now: Date = new Date()): YearMonth {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function rangeMonths(range: MonthRange): YearMonth[] {
  const startIdx = monthIndex(range.start);
  return Array.from({ length: range.months }, (_, i) => yearMonthFromIndex(startIdx + i));
}

export function isYearMonth(value: unknown): value is YearMonth {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
