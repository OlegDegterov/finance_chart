import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, rub } from './money';
import { currencySymbol } from './currency';

const plain = (s: string) => s.replace(/\s/g, ' ');

describe('money', () => {
  it('формат полный и компактный', () => {
    expect(plain(formatMoney(rub(1_234_567)))).toBe('1 234 567 ₽');
    expect(plain(formatMoney(rub(1_200_000), { compact: true }))).toBe('1,2 млн ₽');
  });

  it('формат в других валютах', () => {
    expect(plain(formatMoney(rub(1_500), { currency: 'USD' }))).toBe('1 500 $');
    expect(plain(formatMoney(rub(99), { currency: 'EUR' }))).toBe('99 €');
    expect(plain(formatMoney(rub(2_500_000), { currency: 'JPY', compact: true }))).toBe(
      '2,5 млн ¥',
    );
    expect(currencySymbol('BYN')).toBe('Br');
    expect(currencySymbol('GBP')).toBe('£');
  });

  it('парсит разные написания', () => {
    expect(parseMoney('12 345,67')).toBe(1_234_567);
    expect(parseMoney('12345.5 ₽')).toBe(1_234_550);
    expect(parseMoney('$1500')).toBe(150_000);
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
  });
});
