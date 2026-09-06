import { describe, it, expect } from 'vitest';
import { aplicarMascaraTelefone } from './phone';

describe('aplicarMascaraTelefone', () => {
  it('should return empty string for empty input', () => {
    expect(aplicarMascaraTelefone('')).toBe('');
  });

  it('should return empty string when input only contains non-digits', () => {
    expect(aplicarMascaraTelefone('abc')).toBe('');
    expect(aplicarMascaraTelefone('!@#')).toBe('');
  });

  it('should format partial input (1 digit)', () => {
    expect(aplicarMascaraTelefone('6')).toBe('(6');
  });

  it('should format partial input (2 digits)', () => {
    expect(aplicarMascaraTelefone('61')).toBe('(61');
  });

  it('should format partial input (3 digits)', () => {
    expect(aplicarMascaraTelefone('619')).toBe('(61) 9');
  });

  it('should format partial input (6 digits)', () => {
    expect(aplicarMascaraTelefone('619853')).toBe('(61) 9853');
  });

  it('should format partial input (7 digits)', () => {
    expect(aplicarMascaraTelefone('6198530')).toBe('(61) 98530');
  });

  it('should format partial input (8 digits)', () => {
    expect(aplicarMascaraTelefone('61985307')).toBe('(61) 9853-07');
  });

  it('should format partial input (10 digits) as landline', () => {
    expect(aplicarMascaraTelefone('6133334444')).toBe('(61) 3333-4444');
  });

  it('should format full input (11 digits) as mobile', () => {
    expect(aplicarMascaraTelefone('61985307168')).toBe('(61) 98530-7168');
  });

  it('should limit output to 11 digits even if input is longer', () => {
    expect(aplicarMascaraTelefone('61985307168999')).toBe('(61) 98530-7168');
  });

  it('should strip non-digits and apply mask correctly', () => {
    expect(aplicarMascaraTelefone('61 98530-7168 a')).toBe('(61) 98530-7168');
    expect(aplicarMascaraTelefone('(61)')).toBe('(61');
    expect(aplicarMascaraTelefone('+55 (61) 98')).toBe('(55) 6198'); // takes first digits
  });
});
