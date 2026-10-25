import { describe, expect, it } from 'vitest';
import { parseScenarioFile, serializeScenarioFile } from './migrate';
import type { Scenario } from './types';

const scenario: Scenario = {
  id: 's1',
  name: 'Тест',
  currency: 'RUB',
  startingBalance: 1000,
  horizonYears: 5,
  items: [
    {
      id: 'a',
      name: 'Зарплата',
      kind: 'income',
      category: 'salary',
      enabled: true,
      type: 'flow',
      amount: 100,
      frequency: 'monthly',
      start: '2026-01',
    },
    {
      id: 'b',
      name: 'Вклад',
      kind: 'income',
      category: 'deposit',
      enabled: false,
      type: 'deposit',
      principal: 5000,
      ratePct: 10,
      capitalization: 'monthly',
      monthlyContribution: 300,
      start: '2026-02',
      termMonths: 12,
    },
  ],
};

describe('scenario file', () => {
  it('экспорт → импорт без потерь', () => {
    expect(parseScenarioFile(serializeScenarioFile(scenario))).toEqual(scenario);
  });

  it('отвергает мусор и файлы новой версии', () => {
    expect(() => parseScenarioFile('{')).toThrow();
    expect(() => parseScenarioFile('{"scenario":{"items":[{"kind":"x"}]}}')).toThrow(/kind/);
    expect(() => parseScenarioFile('{"schemaVersion":99,"scenario":{"items":[]}}')).toThrow(
      /новой версией/,
    );
  });

  it('подставляет значения по умолчанию', () => {
    const s = parseScenarioFile('{"items":[]}');
    expect(s.horizonYears).toBe(3);
    expect(s.startingBalance).toBe(0);
    expect(s.currency).toBe('RUB');
    expect(parseScenarioFile('{"items":[],"currency":"USD"}').currency).toBe('USD');
    expect(parseScenarioFile('{"items":[],"currency":"XXX"}').currency).toBe('RUB');
  });
});
