import type { Kind } from './types';

/**
 * Категории привязаны к слотам категориальной палитры (порядок слотов проверен
 * валидатором на различимость при дальтонизме в обеих темах). Порядок `slot`
 * задаёт и порядок серий на графике, поэтому соседние цвета остаются безопасными.
 * Категории «прочее» — нейтральный серый, как «Other» в палитре.
 */
export interface CategoryDef {
  id: string;
  kind: Kind;
  /** Номер слота палитры; 0 — нейтральный серый. */
  slot: number;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'salary', kind: 'income', slot: 1 },
  { id: 'deposit', kind: 'income', slot: 2 },
  { id: 'rent', kind: 'income', slot: 3 },
  { id: 'other-income', kind: 'income', slot: 0 },
  { id: 'housing', kind: 'expense', slot: 4 },
  { id: 'food', kind: 'expense', slot: 5 },
  { id: 'education', kind: 'expense', slot: 6 },
  { id: 'transport', kind: 'expense', slot: 7 },
  { id: 'health', kind: 'expense', slot: 8 },
  { id: 'other-expense', kind: 'expense', slot: 0 },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoriesFor(kind: Kind): CategoryDef[] {
  return CATEGORIES.filter((c) => c.kind === kind);
}

export function defaultCategory(kind: Kind): string {
  return kind === 'income' ? 'other-income' : 'other-expense';
}

export function isPresetCategory(id: string): boolean {
  return CATEGORY_BY_ID.has(id);
}

/** Имя CSS-переменной с цветом категории; своя категория — серый. */
export function categoryColorVar(id: string): string {
  const slot = CATEGORY_BY_ID.get(id)?.slot ?? 0;
  return slot === 0 ? '--series-other' : `--series-${slot}`;
}

/** Порядок сортировки серий: доходы, затем расходы, внутри — по слоту палитры. */
export function categoryOrder(id: string, kind: Kind): number {
  const slot = CATEGORY_BY_ID.get(id)?.slot ?? 0;
  return (kind === 'income' ? 0 : 100) + (slot === 0 ? 50 : slot);
}
