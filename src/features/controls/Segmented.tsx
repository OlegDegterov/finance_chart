import styles from './Segmented.module.css';

interface Props<T extends string | number> {
  value: T;
  options: { value: T; label: string }[];
  onChange(value: T): void;
  label: string;
  compact?: boolean;
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  compact,
}: Props<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label} data-compact={compact}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
