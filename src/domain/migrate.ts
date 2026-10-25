import type { Capitalization, Frequency, HorizonYears, Item, Kind, Scenario } from './types';
import { isYearMonth } from './months';
import { defaultCategory } from './categories';
import { DEFAULT_CURRENCY, isCurrencyCode } from './currency';

export const SCHEMA_VERSION = 1;

/** Файл экспорта: сценарий плюс версия схемы для будущих миграций. */
export interface ScenarioFile {
  schemaVersion: number;
  exportedAt: string;
  scenario: Scenario;
}

const FREQUENCIES: Frequency[] = ['once', 'monthly', 'quarterly', 'yearly'];
const CAPITALIZATIONS: Capitalization[] = ['none', 'monthly', 'quarterly', 'yearly'];
const HORIZONS: HorizonYears[] = [1, 3, 5, 10];

class ValidationError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function str(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new ValidationError(`${field}: ожидалась строка`);
  return v;
}

function int(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new ValidationError(`${field}: ожидалось число`);
  }
  return Math.round(v);
}

function optional<T>(v: unknown, parse: (x: unknown) => T): T | undefined {
  return v === undefined || v === null ? undefined : parse(v);
}

function oneOf<T extends string | number>(v: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(v as T)) throw new ValidationError(`${field}: недопустимое значение`);
  return v as T;
}

function month(v: unknown, field: string): string {
  if (!isYearMonth(v)) throw new ValidationError(`${field}: ожидался месяц YYYY-MM`);
  return v;
}

function parseItem(raw: unknown, index: number): Item {
  if (!isRecord(raw)) throw new ValidationError(`items[${index}]: ожидался объект`);
  const kind = oneOf<Kind>(raw.kind, ['income', 'expense'], `items[${index}].kind`);
  const base = {
    id: str(raw.id, `items[${index}].id`),
    name: str(raw.name, `items[${index}].name`),
    kind,
    category: typeof raw.category === 'string' ? raw.category : defaultCategory(kind),
    color: optional(raw.color, (x) => str(x, `items[${index}].color`)),
    enabled: raw.enabled !== false,
  };
  if (raw.type === 'deposit') {
    return {
      ...base,
      kind: 'income',
      type: 'deposit',
      principal: int(raw.principal, `items[${index}].principal`),
      ratePct: Number(raw.ratePct) || 0,
      capitalization: oneOf(raw.capitalization, CAPITALIZATIONS, `items[${index}].capitalization`),
      monthlyContribution: optional(raw.monthlyContribution, (x) =>
        int(x, `items[${index}].monthlyContribution`),
      ),
      start: month(raw.start, `items[${index}].start`),
      termMonths: optional(raw.termMonths, (x) => int(x, `items[${index}].termMonths`)),
    };
  }
  return {
    ...base,
    type: 'flow',
    amount: int(raw.amount, `items[${index}].amount`),
    frequency: oneOf(raw.frequency, FREQUENCIES, `items[${index}].frequency`),
    start: month(raw.start, `items[${index}].start`),
    end: optional(raw.end, (x) => month(x, `items[${index}].end`)),
    indexationPct: optional(raw.indexationPct, (x) => Number(x) || 0),
  };
}

export function parseScenario(raw: unknown): Scenario {
  if (!isRecord(raw)) throw new ValidationError('Ожидался объект сценария');
  if (!Array.isArray(raw.items)) throw new ValidationError('items: ожидался массив');
  return {
    id: typeof raw.id === 'string' ? raw.id : crypto.randomUUID(),
    name: typeof raw.name === 'string' ? raw.name : 'Сценарий',
    currency: isCurrencyCode(raw.currency) ? raw.currency : DEFAULT_CURRENCY,
    startingBalance: typeof raw.startingBalance === 'number' ? Math.round(raw.startingBalance) : 0,
    horizonYears: HORIZONS.includes(raw.horizonYears as HorizonYears)
      ? (raw.horizonYears as HorizonYears)
      : 3,
    items: raw.items.map(parseItem),
  };
}

/** Разбор файла экспорта. Здесь же будут миграции со старых версий схемы. */
export function parseScenarioFile(json: string): Scenario {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ValidationError('Файл не является корректным JSON');
  }
  if (!isRecord(data)) throw new ValidationError('Ожидался объект');
  const version = typeof data.schemaVersion === 'number' ? data.schemaVersion : SCHEMA_VERSION;
  if (version > SCHEMA_VERSION) {
    throw new ValidationError('Файл создан более новой версией приложения');
  }
  return parseScenario(data.scenario ?? data);
}

export function serializeScenarioFile(scenario: Scenario): string {
  const file: ScenarioFile = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    scenario,
  };
  return JSON.stringify(file, null, 2);
}
