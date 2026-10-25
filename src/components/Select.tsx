import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import styles from './Select.module.css';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  /** Короткий префикс слева: символ валюты, код. */
  symbol?: string;
  /** Пояснение под названием. */
  hint?: string;
  /** Цвет символа, например точка категории. */
  color?: string;
}

interface Props<T extends string | number> {
  id?: string;
  value: T;
  options: SelectOption<T>[];
  onChange(value: T): void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const MENU_GAP = 4;

/**
 * Выпадающий список вместо нативного `<select>`: его меню нельзя стилизовать.
 * Меню рендерится в portal с position: fixed, чтобы не обрезаться прокручиваемой формой.
 */
export function Select<T extends string | number>({
  id,
  value,
  options,
  onChange,
  placeholder = '—',
  disabled,
  'aria-label': ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const openMenu = () => {
    if (disabled) return;
    setActive(Math.max(selectedIndex, 0));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  // Позиция меню: под триггером, а если снизу не хватает места — над ним.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - MENU_GAP - 8;
    const above = rect.top - MENU_GAP - 8;
    const wanted = Math.min(320, options.length * 40 + 12);
    const flip = below < wanted && above > below;
    const maxHeight = Math.max(120, Math.min(wanted, flip ? above : below));
    setPos({
      top: flip ? rect.top - MENU_GAP - maxHeight : rect.bottom + MENU_GAP,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    // Прокрутка страницы сдвигает триггер — закрываем; прокрутка самого меню — нет.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', onResize);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  // Зависимость от pos: меню появляется в DOM только после расчёта позиции.
  useEffect(() => {
    if (!open || !pos) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, pos, active]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={styles.trigger}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        {selected?.symbol && (
          <span className={styles.symbol} style={{ color: selected.color }}>
            {selected.symbol}
          </span>
        )}
        <span className={styles.label} data-placeholder={!selected}>
          {selected?.label ?? placeholder}
        </span>
        <svg className={styles.chevron} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            id={listboxId}
            role="listbox"
            className={styles.menu}
            style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
            onKeyDown={onKeyDown}
          >
            {options.map((o, i) => (
              <li
                key={String(o.value)}
                role="option"
                aria-selected={o.value === value}
                data-index={i}
                data-active={i === active}
                className={styles.option}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {o.symbol !== undefined && (
                  <span className={styles.symbol} style={{ color: o.color }}>
                    {o.symbol}
                  </span>
                )}
                <span className={styles.optionText}>
                  <span>{o.label}</span>
                  {o.hint && <span className={styles.hint}>{o.hint}</span>}
                </span>
                {o.value === value && (
                  <svg
                    className={styles.check}
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    aria-hidden
                  >
                    <path
                      d="M3.5 9.5l3.5 3.5 7.5-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
