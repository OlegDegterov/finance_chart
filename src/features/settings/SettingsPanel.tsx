import { useRef, useState } from 'react';
import { CURRENCIES, currencySymbol, type CurrencyCode } from '@/domain/currency';
import { parseMoney, toRubles } from '@/domain/money';
import { ru } from '@/i18n/ru';
import { exportScenario, importScenarioFromFile } from '@/storage/exportImport';
import { useScenarioStore } from '@/store/scenarioStore';
import { Select } from '@/components/Select';
import styles from './SettingsPanel.module.css';

export function SettingsPanel() {
  const scenario = useScenarioStore((s) => s.scenario);
  const setStartingBalance = useScenarioStore((s) => s.setStartingBalance);
  const setCurrency = useScenarioStore((s) => s.setCurrency);
  const replaceScenario = useScenarioStore((s) => s.replaceScenario);
  const loadDemo = useScenarioStore((s) => s.loadDemo);
  const [balance, setBalance] = useState(() => String(toRubles(scenario.startingBalance)));
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const commitBalance = () => {
    const v = parseMoney(balance);
    if (v === null) {
      setBalance(String(toRubles(scenario.startingBalance)));
      return;
    }
    setStartingBalance(v);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = await importScenarioFromFile(file);
      if (scenario.items.length === 0 || window.confirm(ru.settings.importConfirm)) {
        replaceScenario(imported);
        setBalance(String(toRubles(imported.startingBalance)));
        setError(null);
      }
    } catch (e) {
      setError(`${ru.settings.importError}: ${e instanceof Error ? e.message : ''}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <label htmlFor="s-currency">{ru.settings.currency}</label>
        <Select<CurrencyCode>
          id="s-currency"
          value={scenario.currency}
          options={CURRENCIES.map((c) => ({
            value: c,
            label: ru.currency[c] ?? c,
            symbol: currencySymbol(c),
            hint: c,
          }))}
          onChange={setCurrency}
        />
        <div className={styles.hint}>{ru.settings.currencyHint}</div>
      </div>

      <div className={styles.field}>
        <label htmlFor="s-balance">
          {ru.settings.startingBalance}, {currencySymbol(scenario.currency)}
        </label>
        <input
          id="s-balance"
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          onBlur={commitBalance}
          onKeyDown={(e) => e.key === 'Enter' && commitBalance()}
        />
        <div className={styles.hint}>{ru.settings.startingBalanceHint}</div>
      </div>

      <div className={styles.warning}>{ru.settings.storageWarning}</div>

      <div className={styles.buttons}>
        <button onClick={() => exportScenario(scenario)}>{ru.settings.export}</button>
        <button onClick={() => fileRef.current?.click()}>{ru.settings.import}</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button
          onClick={() => {
            if (window.confirm(ru.settings.importConfirm)) loadDemo();
          }}
        >
          {ru.settings.resetDemo}
        </button>
      </div>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
