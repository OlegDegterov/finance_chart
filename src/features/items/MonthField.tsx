import type { YearMonth } from '@/domain/types';
import { Select } from '@/components/Select';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

interface Props {
  id: string;
  value: YearMonth | '';
  onChange(value: YearMonth | ''): void;
  allowEmpty?: boolean;
}

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 26 }, (_, i) => thisYear - 10 + i);

/** Два списка вместо `<input type="month">`: он не работает в десктопном Safari. */
export function MonthField({ id, value, onChange, allowEmpty }: Props) {
  const [year, month] = value ? value.split('-') : ['', ''];
  const update = (y: string, m: string) => {
    if (!y || !m) onChange('');
    else onChange(`${y}-${m}`);
  };
  const monthOptions = [
    ...(allowEmpty ? [{ value: '', label: '—' }] : []),
    ...MONTHS.map((name, i) => ({ value: String(i + 1).padStart(2, '0'), label: name })),
  ];
  const yearOptions = YEARS.map((y) => ({ value: String(y), label: String(y) }));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Select
        id={id}
        value={month ?? ''}
        options={monthOptions}
        onChange={(m) => update(year || String(thisYear), m)}
        aria-label="Месяц"
      />
      <Select
        value={year ?? ''}
        options={yearOptions}
        onChange={(y) => update(y, month || '01')}
        aria-label="Год"
        disabled={allowEmpty && !month}
        placeholder="—"
      />
    </div>
  );
}
