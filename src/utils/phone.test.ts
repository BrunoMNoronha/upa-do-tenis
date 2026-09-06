import { describe, it, expect } from 'vitest';
import { formatarTelefone } from './phone';

describe('formatarTelefone', () => {
  it('should return "-" for null, undefined, or empty string', () => {
    expect(formatarTelefone(null)).toBe('-');
    expect(formatarTelefone(undefined)).toBe('-');
    expect(formatarTelefone('')).toBe('-');
  });

  it('should format a 10-digit number correctly', () => {
    expect(formatarTelefone('6133334444')).toBe('(61) 3333-4444');
  });

  it('should format an 11-digit number correctly', () => {
    expect(formatarTelefone('61988889999')).toBe('(61) 98888-9999');
  });

  it('should return digits if length is not 10 or 11', () => {
    expect(formatarTelefone('123')).toBe('123');
    expect(formatarTelefone('123456789012')).toBe('123456789012');
  });

  it('should return "-" if input contains only non-digits', () => {
    expect(formatarTelefone('abc')).toBe('-');
    expect(formatarTelefone('!@#')).toBe('-');
  });

  it('should handle inputs with mixed digits and non-digits', () => {
    expect(formatarTelefone('(61) 3333-4444')).toBe('(61) 3333-4444');
    expect(formatarTelefone('a6b1c3d3e3f3g4h4i4j4')).toBe('(61) 3333-4444');
    expect(formatarTelefone('+55 (61) 98888-9999')).toBe('5561988889999'); // Length is 13 now, so it just returns digits
  });
});
