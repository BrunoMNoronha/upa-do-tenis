import { describe, it, expect } from 'vitest';
import { formatCurrencyBRL } from './currency';

describe('formatCurrencyBRL', () => {
  it('should format positive cents into BRL currency format correctly', () => {
    // Note: \xa0 is the non-breaking space used by Intl.NumberFormat in pt-BR
    expect(formatCurrencyBRL(1000).replace(/\xa0/g, ' ')).toBe('R$ 10,00');
    expect(formatCurrencyBRL(12345).replace(/\xa0/g, ' ')).toBe('R$ 123,45');
    expect(formatCurrencyBRL(99).replace(/\xa0/g, ' ')).toBe('R$ 0,99');
  });

  it('should format zero correctly', () => {
    expect(formatCurrencyBRL(0).replace(/\xa0/g, ' ')).toBe('R$ 0,00');
  });

  it('should format negative cents into BRL currency format correctly', () => {
    expect(formatCurrencyBRL(-1000).replace(/\xa0/g, ' ')).toBe('-R$ 10,00');
    expect(formatCurrencyBRL(-50).replace(/\xa0/g, ' ')).toBe('-R$ 0,50');
  });

  it('should format large numbers with thousand separators', () => {
    expect(formatCurrencyBRL(123456789).replace(/\xa0/g, ' ')).toBe('R$ 1.234.567,89');
    expect(formatCurrencyBRL(999999999).replace(/\xa0/g, ' ')).toBe('R$ 9.999.999,99');
  });
});
