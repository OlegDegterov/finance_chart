import { useState } from 'react';
import { defaultCategory } from '@/domain/categories';
import { currencySymbol } from '@/domain/currency';
import { parseMoney, toRubles } from '@/domain/money';
import { currentYearMonth } from '@/domain/months';
import type { Capitalization, Frequency, Item, Kind, NewItem, YearMonth } from '@/domain/types';
import { ru } from '@/i18n/ru';
import { useScenarioStore } from '@/store/scenarioStore';
import { Select } from '@/components/Select';
import { CategoryPicker } from './CategoryPicker';
import { MonthField } from './MonthField';
import styles from './ItemForm.module.css';

interface Props {
  kind: Kind;
  initial?: Item;
  /** Тип новой статьи: кнопка «+ Вклад» открывает форму сразу в режиме депозита. */
  initialType?: 'flow' | 'deposit';
  onClose(): void;
}

interface Draft {
  type: 'flow' | 'deposit';
  name: string;
  category: string;
  amount: string;
  frequency: Frequency;
  start: YearMonth | '';
  end: YearMonth | '';
  indexationPct: string;
  principal: string;
  ratePct: string;
  capitalization: Capitalization;
  monthlyContribution: string;
  termMonths: string;
}

function toDraft(kind: Kind, item?: Item, type: 'flow' | 'deposit' = 'flow'): Draft {
  const base: Draft = {
    type,
    name: '',
    category: type === 'deposit' ? 'deposit' : defaultCategory(kind),
    amount: '',
    frequency: 'monthly',
    start: currentYearMonth(),
    end: '',
    indexationPct: '',
    principal: '',
    ratePct: '',
    capitalization: 'monthly',
    monthlyContribution: '',
    termMonths: '',
  };
  if (!item) return base;
  if (item.type === 'deposit') {
    return {
      ...base,
      type: 'deposit',
      name: item.name,
      category: item.category,
      principal: String(toRubles(item.principal)),
      ratePct: String(item.ratePct),
      capitalization: item.capitalization,
      monthlyContribution: item.monthlyContribution
        ? String(toRubles(item.monthlyContribution))
        : '',
      start: item.start,
      termMonths: item.termMonths ? String(item.termMonths) : '',
    };
  }
  return {
    ...base,
    name: item.name,
    category: item.category,
    amount: String(toRubles(item.amount)),
    frequency: item.frequency,
    start: item.start,
    end: item.end ?? '',
    indexationPct: item.indexationPct ? String(item.indexationPct) : '',
  };
}

function numberOrNull(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toItem(kind: Kind, d: Draft): NewItem | string {
  const name = d.name.trim();
  if (!name) return `${ru.form.name}: ${ru.form.required}`;
  const category = d.category.trim() || defaultCategory(kind);
  if (!d.start) return `${ru.form.start}: ${ru.form.required}`;
  if (d.type === 'deposit') {
    const principal = parseMoney(d.principal);
    const ratePct = numberOrNull(d.ratePct);
    if (principal === null || principal <= 0)
      return `${ru.form.principal}: ${ru.form.invalidNumber}`;
    if (ratePct === null || ratePct < 0) return `${ru.form.rate}: ${ru.form.invalidNumber}`;
    const term = numberOrNull(d.termMonths);
    const contribution =
      d.monthlyContribution.trim() === '' ? null : parseMoney(d.monthlyContribution);
    if (contribution !== null && contribution < 0) {
      return `${ru.form.contribution}: ${ru.form.invalidNumber}`;
    }
    return {
      type: 'deposit',
      kind: 'income',
      name,
      category,
      enabled: true,
      principal,
      ratePct,
      capitalization: d.capitalization,
      monthlyContribution: contribution ? contribution : undefined,
      start: d.start,
      termMonths: term && term > 0 ? Math.round(term) : undefined,
    };
  }
  const amount = parseMoney(d.amount);
  if (amount === null || amount <= 0) return `${ru.form.amount}: ${ru.form.invalidNumber}`;
  const idx = numberOrNull(d.indexationPct);
  return {
    type: 'flow',
    kind,
    name,
    category,
    enabled: true,
    amount,
    frequency: d.frequency,
    start: d.start,
    end: d.end || undefined,
    indexationPct: idx ?? undefined,
  };
}

export function ItemForm({ kind, initial, initialType, onClose }: Props) {
  const [draft, setDraft] = useState(() => toDraft(kind, initial, initialType));
  const [error, setError] = useState<string | null>(null);
  const { addItem, updateItem, removeItem } = useScenarioStore();
  const symbol = currencySymbol(useScenarioStore((s) => s.scenario.currency));
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const submit = () => {
    const result = toItem(kind, draft);
    if (typeof result === 'string') {
      setError(result);
      return;
    }
    if (initial) updateItem(initial.id, { ...result, enabled: initial.enabled } as Partial<Item>);
    else addItem(result);
    onClose();
  };

  const title = initial
    ? initial.name
    : `${ru.form.add}: ${(draft.type === 'deposit' ? ru.form.addDeposit : ru.kindSingular[kind]).toLowerCase()}`;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <form
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-form-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 id="item-form-title" className={styles.title}>
          {title}
        </h2>

        {kind === 'income' && !initial && (
          <div className={styles.segmented} role="group" aria-label="Тип">
            {(['flow', 'deposit'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={draft.type === t}
                onClick={() =>
                  patch({ type: t, category: t === 'deposit' ? 'deposit' : defaultCategory(kind) })
                }
              >
                {ru.itemType[t]}
              </button>
            ))}
          </div>
        )}

        <div className={styles.field}>
          <label htmlFor="f-name">{ru.form.name}</label>
          <input
            id="f-name"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="f-category">{ru.form.category}</label>
          <CategoryPicker
            id="f-category"
            kind={kind}
            value={draft.category}
            onChange={(category) =>
              // Категория «Депозит» у нового дохода — это вклад: переключаем тип формы.
              patch(
                category === 'deposit' && !initial && draft.type === 'flow'
                  ? { category, type: 'deposit' }
                  : { category },
              )
            }
          />
        </div>

        {draft.type === 'flow' ? (
          <>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="f-amount">
                  {ru.form.amount}, {symbol}
                </label>
                <input
                  id="f-amount"
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={(e) => patch({ amount: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="f-frequency">{ru.form.frequency}</label>
                <Select
                  id="f-frequency"
                  value={draft.frequency}
                  options={(Object.keys(ru.frequency) as Frequency[]).map((f) => ({
                    value: f,
                    label: ru.frequency[f],
                  }))}
                  onChange={(frequency) => patch({ frequency })}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="f-start">{ru.form.start}</label>
              <MonthField id="f-start" value={draft.start} onChange={(start) => patch({ start })} />
            </div>
            {draft.frequency !== 'once' && (
              <>
                <div className={styles.field}>
                  <label htmlFor="f-end">{ru.form.endOptional}</label>
                  <MonthField
                    id="f-end"
                    value={draft.end}
                    onChange={(end) => patch({ end })}
                    allowEmpty
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="f-idx">{ru.form.indexation}</label>
                  <input
                    id="f-idx"
                    inputMode="decimal"
                    value={draft.indexationPct}
                    onChange={(e) => patch({ indexationPct: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="f-principal">
                  {ru.form.principal}, {symbol}
                </label>
                <input
                  id="f-principal"
                  inputMode="decimal"
                  value={draft.principal}
                  onChange={(e) => patch({ principal: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="f-rate">{ru.form.rate}</label>
                <input
                  id="f-rate"
                  inputMode="decimal"
                  value={draft.ratePct}
                  onChange={(e) => patch({ ratePct: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="f-contribution">
                  {ru.form.contribution}, {symbol}
                </label>
                <input
                  id="f-contribution"
                  inputMode="decimal"
                  value={draft.monthlyContribution}
                  onChange={(e) => patch({ monthlyContribution: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="f-cap">{ru.form.capitalization}</label>
                <Select
                  id="f-cap"
                  value={draft.capitalization}
                  options={(Object.keys(ru.capitalization) as Capitalization[]).map((c) => ({
                    value: c,
                    label: ru.capitalization[c],
                  }))}
                  onChange={(capitalization) => patch({ capitalization })}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="f-dstart">{ru.form.start}</label>
                <MonthField
                  id="f-dstart"
                  value={draft.start}
                  onChange={(start) => patch({ start })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="f-term">{ru.form.term}</label>
                <input
                  id="f-term"
                  inputMode="numeric"
                  value={draft.termMonths}
                  onChange={(e) => patch({ termMonths: e.target.value })}
                  placeholder="∞"
                />
              </div>
            </div>
          </>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          {initial && (
            <button
              type="button"
              className="danger"
              onClick={() => {
                removeItem(initial.id);
                onClose();
              }}
            >
              {ru.form.delete}
            </button>
          )}
          <span className={styles.spacer} />
          <button type="button" onClick={onClose}>
            {ru.form.cancel}
          </button>
          <button type="submit" className="primary">
            {ru.form.save}
          </button>
        </div>
      </form>
    </div>
  );
}
