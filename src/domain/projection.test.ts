import { describe, expect, it } from 'vitest';
import { buildSeries, depositFinalBalance, projectDeposit, projectItem } from './projection';
import { aggregate } from './aggregate';
import { rub } from './money';
import type { DepositItem, FlowItem, Scenario } from './types';

const range = { start: '2026-01', months: 12 };

const flow = (over: Partial<FlowItem> = {}): FlowItem => ({
  id: 'f',
  name: 'Поток',
  kind: 'income',
  category: 'salary',
  enabled: true,
  type: 'flow',
  amount: rub(100_000),
  frequency: 'monthly',
  start: '2026-01',
  ...over,
});

const deposit = (over: Partial<DepositItem> = {}): DepositItem => ({
  id: 'd',
  name: 'Вклад',
  kind: 'income',
  category: 'deposit',
  enabled: true,
  type: 'deposit',
  principal: rub(1_000_000),
  ratePct: 12,
  capitalization: 'none',
  start: '2026-01',
  ...over,
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('flow', () => {
  it('ежемесячно — каждый месяц интервала', () => {
    expect(projectItem(flow(), range)).toEqual(Array(12).fill(rub(100_000)));
  });

  it('учитывает start и end включительно', () => {
    const v = projectItem(flow({ start: '2026-03', end: '2026-05' }), range);
    expect(v.map((x) => x / 100)).toEqual([0, 0, 100_000, 100_000, 100_000, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('разово — только в месяц start', () => {
    const v = projectItem(flow({ frequency: 'once', start: '2026-06' }), range);
    expect(v.filter(Boolean)).toHaveLength(1);
    expect(v[5]).toBe(rub(100_000));
  });

  it('ежеквартально и ежегодно — по шагу от start', () => {
    const q = projectItem(flow({ frequency: 'quarterly', start: '2026-02' }), range);
    expect(q.map((x) => (x ? 1 : 0))).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
    const y = projectItem(flow({ frequency: 'yearly', start: '2025-07' }), range);
    expect(y.map((x) => (x ? 1 : 0))).toEqual([0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
  });

  it('индексация применяется на годовщину start', () => {
    const v = projectItem(flow({ start: '2025-07', indexationPct: 10 }), range);
    expect(v[5]).toBe(rub(100_000)); // июнь 2026 — ещё первый год
    expect(v[6]).toBe(rub(110_000)); // июль 2026 — второй год
  });

  it('статья, начавшаяся до диапазона, попадает в него', () => {
    const v = projectItem(flow({ start: '2020-01' }), range);
    expect(sum(v)).toBe(rub(1_200_000));
  });
});

describe('deposit', () => {
  it('без капитализации — 1% в месяц от тела', () => {
    const v = projectItem(deposit(), range);
    expect(v).toEqual(Array(12).fill(rub(10_000)));
  });

  it('ежемесячная капитализация — ≈126 825 ₽ за год', () => {
    const v = projectItem(deposit({ capitalization: 'monthly' }), range);
    expect(Math.round(sum(v) / 100)).toBe(126_825);
    expect(v[1]).toBe(rub(10_100));
  });

  it('квартальная капитализация — тело растёт раз в квартал', () => {
    const v = projectItem(deposit({ capitalization: 'quarterly' }), range);
    expect(v[0]).toBe(v[2]);
    expect(v[3]).toBe(rub(10_300));
  });

  it('ежемесячное пополнение увеличивает тело со следующего месяца', () => {
    const plain = projectItem(deposit({ monthlyContribution: rub(100_000) }), range);
    expect(plain.slice(0, 3)).toEqual([rub(10_000), rub(11_000), rub(12_000)]);
    const cap = projectItem(
      deposit({ monthlyContribution: rub(100_000), capitalization: 'monthly' }),
      range,
    );
    expect(cap[1]).toBe(rub(11_100)); // (1 000 000 · 1,01 + 100 000) · 1 %
  });

  it('остаток на счёте: тело + пополнения + капитализированные проценты', () => {
    const cap = projectDeposit(
      deposit({ monthlyContribution: rub(100_000), capitalization: 'monthly' }),
      range,
    );
    expect(cap.balance[0]).toBe(rub(1_110_000)); // 1 000 000 · 1,01 + 100 000
    expect(cap.balance[1]).toBe(rub(1_221_100));
    const none = projectDeposit(deposit({ monthlyContribution: rub(100_000) }), range);
    expect(none.balance[0]).toBe(rub(1_100_000)); // проценты выплачены, на счёте не копятся
    expect(none.balance[11]).toBe(rub(2_200_000));
  });

  it('итог на конец срока и на конец горизонта', () => {
    expect(
      depositFinalBalance(deposit({ capitalization: 'monthly', termMonths: 12 }), '2030-12'),
    ).toBe(Math.round(rub(1_000_000) * 1.01 ** 12));
    expect(depositFinalBalance(deposit({ capitalization: 'none' }), '2026-06')).toBe(
      rub(1_000_000),
    );
  });

  it('по окончании срока проценты не начисляются', () => {
    const v = projectItem(deposit({ termMonths: 6 }), range);
    expect(v.filter(Boolean)).toHaveLength(6);
  });

  it('вклад, открытый до диапазона, продолжает капитализацию', () => {
    const v = projectItem(deposit({ capitalization: 'monthly', start: '2025-01' }), range);
    expect(v[0]).toBe(Math.round(rub(1_000_000) * 1.01 ** 12 * 0.01));
  });
});

describe('buildSeries', () => {
  const scenario: Scenario = {
    id: 's',
    name: 'Тест',
    currency: 'RUB',
    startingBalance: rub(100_000),
    horizonYears: 1,
    items: [
      flow({ id: 'a', amount: rub(50_000) }),
      flow({ id: 'b', kind: 'expense', category: 'food', amount: rub(30_000) }),
      flow({ id: 'c', kind: 'expense', category: 'food', amount: rub(10_000) }),
      flow({ id: 'd', kind: 'expense', category: 'housing', amount: rub(5_000), enabled: false }),
    ],
  };
  const s = buildSeries(scenario, range);

  it('итоги и накопительный баланс со стартовым остатком', () => {
    expect(s.totals.income[0]).toBe(rub(50_000));
    expect(s.totals.expense[0]).toBe(rub(40_000));
    expect(s.totals.net[0]).toBe(rub(10_000));
    expect(s.cumulative[11]).toBe(rub(220_000));
  });

  it('выключенные статьи не участвуют, категории схлопываются', () => {
    expect(s.perItem).toHaveLength(3);
    expect(s.perCategory.map((c) => c.category)).toEqual(['salary', 'food']);
    expect(s.perCategory[1]?.values[0]).toBe(rub(40_000));
  });

  it('ряды остатков на вкладах попадают в набор серий', () => {
    const withDeposit = buildSeries(
      { ...scenario, items: [...scenario.items, deposit({ id: 'dep', capitalization: 'none' })] },
      range,
    );
    expect(withDeposit.deposits).toHaveLength(1);
    expect(withDeposit.deposits[0]?.balance[5]).toBe(rub(1_000_000));
    expect(aggregate(withDeposit, 'year').deposits[0]?.balance).toEqual([rub(1_000_000)]);
  });

  it('агрегация по кварталам и годам', () => {
    const q = aggregate(s, 'quarter');
    expect(q.periods).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
    expect(q.totals.net[0]).toBe(rub(30_000));
    expect(q.cumulative[0]).toBe(rub(130_000));
    const y = aggregate(s, 'year');
    expect(y.periods).toEqual(['2026']);
    expect(y.cumulative[0]).toBe(rub(220_000));
  });
});
