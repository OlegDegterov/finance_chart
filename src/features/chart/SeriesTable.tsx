import type { CurrencyCode } from '@/domain/currency';
import { formatMoney } from '@/domain/money';
import type { SeriesSet } from '@/domain/projection';
import { ru } from '@/i18n/ru';
import { periodLabelShort } from './periodLabel';
import styles from './SeriesTable.module.css';

/** Табличный вид тех же данных — доступная альтернатива графику. */
export function SeriesTable({ series, currency }: { series: SeriesSet; currency: CurrencyCode }) {
  const money = (v: number | undefined) => formatMoney(v ?? 0, { currency });
  const hasDeposits = series.deposits.length > 0;
  const depositsAt = (i: number) =>
    series.deposits.reduce((acc, d) => acc + (d.balance[i] ?? 0), 0);
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Период</th>
            <th>{ru.chart.income}</th>
            <th>{ru.chart.expense}</th>
            <th>{ru.chart.net}</th>
            <th>{ru.chart.balance}</th>
            {hasDeposits && <th>{ru.chart.depositsTotal}</th>}
          </tr>
        </thead>
        <tbody>
          {series.periods.map((p, i) => (
            <tr key={p}>
              <th scope="row">{periodLabelShort(p)}</th>
              <td>{money(series.totals.income[i])}</td>
              <td>{money(series.totals.expense[i])}</td>
              <td data-negative={(series.totals.net[i] ?? 0) < 0}>{money(series.totals.net[i])}</td>
              <td data-negative={(series.cumulative[i] ?? 0) < 0}>{money(series.cumulative[i])}</td>
              {hasDeposits && <td>{money(depositsAt(i))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
