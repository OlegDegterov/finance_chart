import { useState } from 'react';
import { categoriesFor, categoryColorVar, isPresetCategory } from '@/domain/categories';
import type { Kind } from '@/domain/types';
import { ru } from '@/i18n/ru';
import { Select } from '@/components/Select';
import { categoryLabel } from './itemSummary';

const CUSTOM = '__custom__';

interface Props {
  id: string;
  kind: Kind;
  value: string;
  onChange(value: string): void;
}

export function CategoryPicker({ id, kind, value, onChange }: Props) {
  const [custom, setCustom] = useState(() => !isPresetCategory(value));
  const options = [
    ...categoriesFor(kind).map((c) => ({
      value: c.id,
      label: categoryLabel(c.id),
      symbol: '●',
      color: `var(${categoryColorVar(c.id)})`,
    })),
    { value: CUSTOM, label: `${ru.form.customCategory}…`, symbol: '＋' },
  ];
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Select
        id={id}
        value={custom ? CUSTOM : value}
        options={options}
        onChange={(v) => {
          if (v === CUSTOM) {
            setCustom(true);
            onChange('');
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      />
      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ru.form.customCategory}
          aria-label={ru.form.customCategory}
          autoFocus
        />
      )}
    </div>
  );
}
