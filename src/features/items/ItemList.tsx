import { useState } from 'react';
import { categoryColorVar, categoryOrder } from '@/domain/categories';
import { formatMoney } from '@/domain/money';
import { addMonths, currentYearMonth } from '@/domain/months';
import { projectItem } from '@/domain/projection';
import type { Item, Kind } from '@/domain/types';
import { ru } from '@/i18n/ru';
import { useScenarioStore } from '@/store/scenarioStore';
import { ItemForm } from './ItemForm';
import { categoryLabel, depositOutcome, itemSummary } from './itemSummary';
import styles from './ItemList.module.css';

type Editing = { kind: Kind; item?: Item; type?: 'flow' | 'deposit' } | null;

export function ItemList() {
  const items = useScenarioStore((s) => s.scenario.items);
  const currency = useScenarioStore((s) => s.scenario.currency);
  const horizonYears = useScenarioStore((s) => s.scenario.horizonYears);
  const horizonEnd = addMonths(currentYearMonth(), horizonYears * 12 - 1);
  const toggleItem = useScenarioStore((s) => s.toggleItem);
  const [editing, setEditing] = useState<Editing>(null);

  const section = (kind: Kind) => {
    const list = items
      .filter((i) => i.kind === kind)
      .sort((a, b) => categoryOrder(a.category, a.kind) - categoryOrder(b.category, b.kind));
    // Сумма за текущий месяц по включённым статьям — быстрый ориентир в заголовке.
    const range = { start: currentYearMonth(), months: 1 };
    const monthTotal = list
      .filter((i) => i.enabled)
      .reduce((acc, i) => acc + (projectItem(i, range)[0] ?? 0), 0);
    return (
      <section className={styles.section} aria-label={ru.kind[kind]}>
        <div className={styles.header}>
          <div>
            <h2>{ru.kind[kind]}</h2>
            {list.length > 0 && (
              <div className={styles.total} data-kind={kind}>
                {formatMoney(monthTotal, { currency })} в этом месяце
              </div>
            )}
          </div>
          <div className={styles.addGroup}>
            <button className={styles.addBtn} onClick={() => setEditing({ kind, type: 'flow' })}>
              + {kind === 'income' ? ru.form.addIncome : ru.form.addExpense}
            </button>
            {kind === 'income' && (
              <button
                className={styles.addBtn}
                onClick={() => setEditing({ kind, type: 'deposit' })}
              >
                + {ru.form.addDeposit}
              </button>
            )}
          </div>
        </div>
        {list.length === 0 && <div className={styles.empty}>{ru.emptyList}</div>}
        {list.map((item) => (
          <div key={item.id} className={styles.row} data-disabled={!item.enabled}>
            <span
              className={styles.dot}
              data-kind={item.kind}
              style={{ background: `var(${categoryColorVar(item.category)})` }}
              aria-hidden
            />
            <button
              type="button"
              className={styles.text}
              onClick={() => setEditing({ kind, item })}
              aria-label={`${item.name}, ${itemSummary(item, currency)}`}
            >
              <span className={styles.name}>{item.name}</span>
              <span className={styles.meta}>
                {categoryLabel(item.category)} · {itemSummary(item, currency)}
              </span>
              {item.type === 'deposit' && (
                <span className={styles.outcome}>{depositOutcome(item, currency, horizonEnd)}</span>
              )}
            </button>
            <input
              type="checkbox"
              className={styles.switch}
              checked={item.enabled}
              onChange={() => toggleItem(item.id)}
              aria-label={`${item.enabled ? 'Выключить' : 'Включить'} ${item.name}`}
            />
          </div>
        ))}
      </section>
    );
  };

  return (
    <div className={styles.list}>
      {section('income')}
      {section('expense')}
      {editing && (
        <ItemForm
          kind={editing.kind}
          initial={editing.item}
          initialType={editing.type}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
