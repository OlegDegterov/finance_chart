/** RUB, USD, EUR, BYN и пять самых торгуемых валют по данным BIS: JPY, GBP, CNY, AUD, CAD. */
export const CURRENCIES = ['RUB', 'USD', 'EUR', 'BYN', 'JPY', 'GBP', 'CNY', 'AUD', 'CAD'] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'RUB';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

/** Символы заданы явно: Intl в Node и Safari даёт для BYN/CNY разные варианты. */
const SYMBOLS: Record<CurrencyCode, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  BYN: 'Br',
  JPY: '¥',
  GBP: '£',
  CNY: 'CN¥',
  AUD: 'A$',
  CAD: 'CA$',
};

export function currencySymbol(code: CurrencyCode): string {
  return SYMBOLS[code];
}
