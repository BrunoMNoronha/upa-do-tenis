import { describe, it, expect } from 'vitest';
import { sanitizePhone } from './sanitizers';

describe('sanitizePhone', () => {
  it('should return empty string for null, undefined, or empty string', () => {
    expect(sanitizePhone(null)).toBe('');
    expect(sanitizePhone(undefined)).toBe('');
    expect(sanitizePhone('')).toBe('');
  });

  it('should remove non-numeric characters from a formatted phone number', () => {
    expect(sanitizePhone('(69) 99999-9999')).toBe('69999999999');
    expect(sanitizePhone('+55 69 3333-4444')).toBe('556933334444');
    expect(sanitizePhone('69 3333 4444')).toBe('6933334444');
    expect(sanitizePhone('69-99999-9999')).toBe('69999999999');
  });

  it('should keep only numeric characters when there are letters mixed in', () => {
    expect(sanitizePhone('Phone: 69999999999')).toBe('69999999999');
    expect(sanitizePhone('123abc456')).toBe('123456');
  });

  it('should return the exact same string if it contains only numbers', () => {
    expect(sanitizePhone('69999999999')).toBe('69999999999');
    expect(sanitizePhone('1234567890')).toBe('1234567890');
  });

  it('should return empty string if it contains no numbers', () => {
    expect(sanitizePhone('abcdef')).toBe('');
    expect(sanitizePhone('  -  ')).toBe('');
  });
});
