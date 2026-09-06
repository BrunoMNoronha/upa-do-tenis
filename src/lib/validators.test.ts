import { describe, it, expect } from 'vitest';
import { isValidPhone, isValidCPFCNPJ } from './validators';

describe('isValidPhone', () => {
  it('should return false for null, undefined, or empty string', () => {
    expect(isValidPhone(null)).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });

  it('should return true for valid 10-digit phone (landline)', () => {
    expect(isValidPhone('6933334444')).toBe(true);
    expect(isValidPhone('(69) 3333-4444')).toBe(true);
  });

  it('should return true for valid 11-digit phone (mobile)', () => {
    expect(isValidPhone('69999999999')).toBe(true);
    expect(isValidPhone('(69) 99999-9999')).toBe(true);
  });

  it('should return false for invalid digit lengths', () => {
    expect(isValidPhone('123456789')).toBe(false); // 9 digits
    expect(isValidPhone('123456789012')).toBe(false); // 12 digits
  });

  it('should return false for non-numeric strings without enough digits', () => {
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('phone-number')).toBe(false);
  });
});

describe('isValidCPFCNPJ', () => {
  it('should return true for null, undefined, or empty string (optional field)', () => {
    expect(isValidCPFCNPJ(null)).toBe(true);
    expect(isValidCPFCNPJ(undefined)).toBe(true);
    expect(isValidCPFCNPJ('')).toBe(true);
  });

  it('should return true for valid 11-digit CPF', () => {
    expect(isValidCPFCNPJ('11122233344')).toBe(true);
    expect(isValidCPFCNPJ('111.222.333-44')).toBe(true);
  });

  it('should return true for valid 14-digit CNPJ', () => {
    expect(isValidCPFCNPJ('11222333000144')).toBe(true);
    expect(isValidCPFCNPJ('11.222.333/0001-44')).toBe(true);
  });

  it('should return false for invalid digit lengths', () => {
    expect(isValidCPFCNPJ('1112223334')).toBe(false); // 10 digits
    expect(isValidCPFCNPJ('111222333445')).toBe(false); // 12 digits
    expect(isValidCPFCNPJ('1112223334455')).toBe(false); // 13 digits
    expect(isValidCPFCNPJ('112223330001445')).toBe(false); // 15 digits
  });

  it('should return false for non-numeric strings without valid digit counts', () => {
    expect(isValidCPFCNPJ('abc')).toBe(false);
    expect(isValidCPFCNPJ('invalid-cpf')).toBe(false);
  });
});
