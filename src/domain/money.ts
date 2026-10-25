import { currencySymbol, DEFAULT_CURRENCY, type CurrencyCode } from './currency';

/** Все суммы хранятся в сотых долях (копейки, центы) целыми числами — независимо от валюты. */

export function rub(rubles: number): number {
  return Math.round(rubles * 100);
}

export function toRubles(kopecks: number): number {
  return kopecks / 100;
}

const full = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });

export interface MoneyFormat {
  compact?: boolean;
  currency?: CurrencyCode;
}

export function formatMoney(kopecks: number, options: MoneyFormat = {}): string {
  const rubles = Math.round(toRubles(kopecks));
  const text = options.compact ? compact.format(rubles) : full.format(rubles);
  // Символ после числа через неразрывный пробел — как принято в русской локали.
  return `${text}\u00a0${currencySymbol(options.currency ?? DEFAULT_CURRENCY)}`;
}

/** Принимает '12 345,67', '12345.67', '12 345 ₽', '$1,000' — возвращает сотые доли или null. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(',', '.');
  if (cleaned === '' || cleaned === '-') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return rub(value);
}
