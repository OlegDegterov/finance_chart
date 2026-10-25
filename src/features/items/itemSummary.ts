import type { CurrencyCode } from '@/domain/currency';
import { formatMoney } from '@/domain/money';
import { depositFinalBalance } from '@/domain/projection';
import type { Item, YearMonth } from '@/domain/types';
import { ru } from '@/i18n/ru';

const FREQ_SHORT: Record<string, string> = {
  once: 'разово',
  monthly: '/ мес',
  quarterly: '/ кв',
  yearly: '/ год',
};

export function itemSummary(item: Item, currency: CurrencyCode): string {
  if (item.type === 'deposit') {
    const term = item.termMonths ? `, ${item.termMonths} мес` : '';
    const top = item.monthlyContribution
      ? ` · +${formatMoney(item.monthlyContribution, { currency })}/мес`
      : '';
    return `${formatMoney(item.principal, { currency })} · ${item.ratePct}%${term}${top}`;
  }
  const idx = item.indexationPct ? ` · +${item.indexationPct}%/год` : '';
  return `${formatMoney(item.amount, { currency })} ${FREQ_SHORT[item.frequency] ?? ''}${idx}`;
}

export function categoryLabel(id: string): string {
  return ru.category[id] ?? id;
}

/** «На счёте к концу срока: …» — для бессрочного вклада считается к концу горизонта. */
export function depositOutcome(
  item: Item,
  currency: CurrencyCode,
  horizonEnd: YearMonth,
): string | null {
  if (item.type !== 'deposit') return null;
  const when = item.termMonths ? 'к концу срока' : 'к концу горизонта';
  return `на счёте ${when}: ${formatMoney(depositFinalBalance(item, horizonEnd), { currency })}`;
}
