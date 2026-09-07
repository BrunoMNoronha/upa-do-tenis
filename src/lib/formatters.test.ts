import { describe, expect, it } from 'vitest';
import { maskCurrency } from './formatters';

describe('maskCurrency', () => {
  it('returns R$ 0,00 when value is null or undefined', () => {
    expect(maskCurrency(null)).toBe('R$ 0,00');
    expect(maskCurrency(undefined)).toBe('R$ 0,00');
  });

  it('returns R$ 0,00 when value is empty string', () => {
    expect(maskCurrency('')).toBe('R$ 0,00');
  });

  it('returns R$ 0,00 when value has no digits', () => {
    expect(maskCurrency('abc')).toBe('R$ 0,00');
  });

  it('formats single digit as cents', () => {
    const result = maskCurrency('5');
    expect(result).toContain('0,05');
  });

  it('formats two digits as cents', () => {
    const result = maskCurrency('50');
    expect(result).toContain('0,50');
  });

  it('formats three digits as units and cents', () => {
    const result = maskCurrency('150');
    expect(result).toContain('1,50');
  });

  it('formats thousands correctly', () => {
    const result = maskCurrency('15050');
    expect(result).toContain('150,50');
  });

  it('formats millions correctly', () => {
    const result = maskCurrency('1500050');
    expect(result).toContain('15.000,50');
  });

  it('strips non-digits before formatting', () => {
    const result = maskCurrency('R$ 1.500,50');
    expect(result).toContain('1.500,50');

    const result2 = maskCurrency('abc150def50');
    expect(result2).toContain('150,50');
  });
});
