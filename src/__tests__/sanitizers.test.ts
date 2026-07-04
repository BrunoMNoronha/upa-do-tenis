import { describe, it, expect } from 'vitest';
import { sanitizePhone, sanitizeCPFCNPJ, sanitizeCEP, sanitizeCurrency, sanitizeEmail } from '../lib/sanitizers';

describe('Sanitizers', () => {
  it('should sanitize phone', () => {
    expect(sanitizePhone('(69) 99999-9999')).toBe('69999999999');
  });

  it('should sanitize CPF/CNPJ', () => {
    expect(sanitizeCPFCNPJ('111.222.333-44')).toBe('11122233344');
  });

  it('should sanitize CEP', () => {
    expect(sanitizeCEP('76800-000')).toBe('76800000');
  });

  it('should sanitize Currency from string', () => {
    expect(sanitizeCurrency('R$ 1.234,56')).toBe(1234.56);
    expect(sanitizeCurrency('1234,56')).toBe(1234.56);
    expect(sanitizeCurrency('100')).toBe(100);
  });

  it('should sanitize Email', () => {
    expect(sanitizeEmail(' Teste@Email.com ')).toBe('teste@email.com');
  });
});
