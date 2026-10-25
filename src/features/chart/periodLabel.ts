const SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const FULL = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

/** 'YYYY-MM' → 'янв 26', 'YYYY-Qn' → 'Q1 26', 'YYYY' → '2026'. */
export function periodLabelShort(period: string): string {
  if (/^\d{4}$/.test(period)) return period;
  const [year, rest] = period.split('-');
  const yy = (year ?? '').slice(2);
  if (rest?.startsWith('Q')) return `${rest} ${yy}`;
  return `${SHORT[Number(rest) - 1] ?? rest} ${yy}`;
}

export function periodLabelFull(period: string): string {
  if (/^\d{4}$/.test(period)) return `${period} год`;
  const [year, rest] = period.split('-');
  if (rest?.startsWith('Q')) return `${rest.slice(1)} квартал ${year}`;
  return `${FULL[Number(rest) - 1] ?? rest} ${year}`;
}
