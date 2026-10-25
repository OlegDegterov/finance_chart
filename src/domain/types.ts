import type { CurrencyCode } from './currency';

/** Месяц в формате 'YYYY-MM'. */
export type YearMonth = string;

export type Kind = 'income' | 'expense';
export type Frequency = 'once' | 'monthly' | 'quarterly' | 'yearly';
export type Capitalization = 'none' | 'monthly' | 'quarterly' | 'yearly';
export type Granularity = 'month' | 'quarter' | 'year';
export type HorizonYears = 1 | 3 | 5 | 10;

interface BaseItem {
  id: string;
  name: string;
  kind: Kind;
  /** Идентификатор категории из `categories.ts` или произвольная своя. */
  category: string;
  color?: string;
  enabled: boolean;
}

/** Регулярный или разовый поток: зарплата, аренда, еда, жильё. */
export interface FlowItem extends BaseItem {
  type: 'flow';
  /** Сумма в копейках (целое). */
  amount: number;
  frequency: Frequency;
  start: YearMonth;
  end?: YearMonth;
  /** Годовая индексация в процентах, применяется на каждую годовщину `start`. */
  indexationPct?: number;
}

/** Депозит: в доход идут только проценты, тело вклада не учитывается. */
export interface DepositItem extends BaseItem {
  type: 'deposit';
  kind: 'income';
  /** Тело вклада в копейках. */
  principal: number;
  /** Годовая ставка в процентах. */
  ratePct: number;
  capitalization: Capitalization;
  /** Ежемесячное пополнение в копейках: увеличивает тело вклада с конца первого месяца. */
  monthlyContribution?: number;
  start: YearMonth;
  termMonths?: number;
}

export type Item = FlowItem | DepositItem;

export interface Scenario {
  id: string;
  name: string;
  /** Валюта сценария: только обозначение, суммы при смене не пересчитываются. */
  currency: CurrencyCode;
  /** Стартовый остаток в копейках — точка отсчёта накопительного баланса. */
  startingBalance: number;
  horizonYears: HorizonYears;
  items: Item[];
}

export interface MonthRange {
  start: YearMonth;
  months: number;
}

/** Статья без id — то, что приходит из формы. Распределённый Omit по членам union. */
export type NewItem = Omit<FlowItem, 'id'> | Omit<DepositItem, 'id'>;
