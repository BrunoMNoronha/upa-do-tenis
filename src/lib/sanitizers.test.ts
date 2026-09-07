import { describe, it, expect } from 'vitest';
import {
  sanitizePhone,
  sanitizeCPFCNPJ,
  sanitizeCEP,
  sanitizeCurrency,
  sanitizeText,
  sanitizeEmail
} from './sanitizers';

describe('sanitizePhone', () => {
  it('should return empty string for null, undefined, or empty', () => {
    expect(sanitizePhone(null)).toBe('');
    expect(sanitizePhone(undefined)).toBe('');
    expect(sanitizePhone('')).toBe('');
  });

  it('should strip non-digits', () => {
    expect(sanitizePhone('(69) 99999-9999')).toBe('69999999999');
    expect(sanitizePhone('+55 69 99999-9999')).toBe('5569999999999');
    expect(sanitizePhone('abc123def456')).toBe('123456');
  });
});

describe('sanitizeCPFCNPJ', () => {
  it('should return empty string for null, undefined, or empty', () => {
    expect(sanitizeCPFCNPJ(null)).toBe('');
    expect(sanitizeCPFCNPJ(undefined)).toBe('');
    expect(sanitizeCPFCNPJ('')).toBe('');
  });

  it('should strip non-digits', () => {
    expect(sanitizeCPFCNPJ('111.222.333-44')).toBe('11122233344');
    expect(sanitizeCPFCNPJ('11.222.333/0001-44')).toBe('11222333000144');
    expect(sanitizeCPFCNPJ('abc123def456')).toBe('123456');
  });
});

describe('sanitizeCEP', () => {
  it('should return empty string for null, undefined, or empty', () => {
    expect(sanitizeCEP(null)).toBe('');
    expect(sanitizeCEP(undefined)).toBe('');
    expect(sanitizeCEP('')).toBe('');
  });

  it('should strip non-digits', () => {
    expect(sanitizeCEP('12345-678')).toBe('12345678');
    expect(sanitizeCEP('abc12345-678def')).toBe('12345678');
  });
});

describe('sanitizeCurrency', () => {
  it('should return 0 for null, undefined, or empty', () => {
    expect(sanitizeCurrency(null)).toBe(0);
    expect(sanitizeCurrency(undefined)).toBe(0);
    expect(sanitizeCurrency('')).toBe(0);
  });

  it('should return the number if passed a number', () => {
    expect(sanitizeCurrency(15.90)).toBe(15.9);
    expect(sanitizeCurrency(100)).toBe(100);
  });

  it('should parse currency strings correctly', () => {
    expect(sanitizeCurrency('R$ 15,90')).toBe(15.9);
    expect(sanitizeCurrency('R$1.500,90')).toBe(1500.9);
    expect(sanitizeCurrency('1.500,90')).toBe(1500.9);
    expect(sanitizeCurrency('1500,90')).toBe(1500.9);
  });

  it('should parse strings with only dot correctly', () => {
    expect(sanitizeCurrency('15.90')).toBe(15.9);
    expect(sanitizeCurrency('15.9')).toBe(15.9);
    expect(sanitizeCurrency('1.500')).toBe(1500); // 1.500 becomes 1500
    expect(sanitizeCurrency('1.500.000')).toBe(1500000);
  });

  it('should return 0 for invalid string inputs', () => {
    expect(sanitizeCurrency('invalid')).toBe(0);
    expect(sanitizeCurrency('R$ invalid')).toBe(0);
  });
});

describe('sanitizeText', () => {
  it('should return empty string for null, undefined, or empty', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText('')).toBe('');
  });

  it('should trim and collapse multiple spaces', () => {
    expect(sanitizeText('  hello   world  ')).toBe('hello world');
    expect(sanitizeText('hello \n \t world')).toBe('hello world');
  });
});

describe('sanitizeEmail', () => {
  it('should return empty string for null, undefined, or empty', () => {
    expect(sanitizeEmail(null)).toBe('');
    expect(sanitizeEmail(undefined)).toBe('');
    expect(sanitizeEmail('')).toBe('');
  });

  it('should trim and convert to lowercase', () => {
    expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
  });
});
