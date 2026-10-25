import { useEffect, useState } from 'react';

/** Счётчик, меняющийся при смене системной темы — чтобы перечитать цвета из CSS. */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const bump = () => setVersion((v) => v + 1);
    mq.addEventListener('change', bump);
    return () => mq.removeEventListener('change', bump);
  }, []);
  return version;
}
