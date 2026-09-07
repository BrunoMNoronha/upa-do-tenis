import { describe, it, expect } from 'vitest';
import { formatCPFCNPJ } from './formatters';

describe('formatCPFCNPJ', () => {
  it('should return empty string for null, undefined, or empty string', () => {
    expect(formatCPFCNPJ(null)).toBe('');
    expect(formatCPFCNPJ(undefined)).toBe('');
    expect(formatCPFCNPJ('')).toBe('');
  });

  it('should format 11-digit string as CPF', () => {
    expect(formatCPFCNPJ('12345678901')).toBe('123.456.789-01');
  });

  it('should format 14-digit string as CNPJ', () => {
    expect(formatCPFCNPJ('12345678000199')).toBe('12.345.678/0001-99');
  });

  it('should return the original value if it does not have exactly 11 or 14 digits', () => {
    expect(formatCPFCNPJ('123')).toBe('123');
    expect(formatCPFCNPJ('1234567890')).toBe('1234567890');
    expect(formatCPFCNPJ('123456789012')).toBe('123456789012');
    expect(formatCPFCNPJ('123456780001999')).toBe('123456780001999');
  });

  it('should strip non-digit characters before formatting', () => {
    expect(formatCPFCNPJ('abc12345678901')).toBe('123.456.789-01');
    expect(formatCPFCNPJ('12.345.678-901')).toBe('123.456.789-01');
    expect(formatCPFCNPJ('12.345.678/0001-99')).toBe('12.345.678/0001-99');
    expect(formatCPFCNPJ('12.345.678/0001-99abc')).toBe('12.345.678/0001-99');
  });
});
