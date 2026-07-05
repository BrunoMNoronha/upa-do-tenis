import { describe, it, expect } from 'vitest';
import { formatPhone, formatCPFCNPJ, formatCEP, formatCurrency, whatsappLink, maskPhone, maskCPFCNPJ, maskCurrency } from '../lib/formatters';
import { sanitizeCurrency } from '../lib/sanitizers';

describe('Formatters', () => {
  it('should format 11-digit phone', () => {
    expect(formatPhone('69999999999')).toBe('(69) 99999-9999');
  });
  
  it('should format 10-digit phone', () => {
    expect(formatPhone('6933334444')).toBe('(69) 3333-4444');
  });
  
  it('should format CPF', () => {
    expect(formatCPFCNPJ('11122233344')).toBe('111.222.333-44');
  });

  it('should format CNPJ', () => {
    expect(formatCPFCNPJ('11222333000144')).toBe('11.222.333/0001-44');
  });

  it('should format CEP', () => {
    expect(formatCEP('76800000')).toBe('76800-000');
  });

  it('should format Currency', () => {
    const formatted = formatCurrency(120.5);
    // \xa0 is non-breaking space used by Intl
    expect(formatted.replace(/\xa0/g, ' ')).toBe('R$ 120,50');
  });

  it('should build WhatsApp link for 11-digit phone (masked input)', () => {
    expect(whatsappLink('(61) 98530-7168')).toBe('https://wa.me/5561985307168');
  });

  it('should build WhatsApp link for 11-digit phone (unmasked input)', () => {
    expect(whatsappLink('61985307168')).toBe('https://wa.me/5561985307168');
  });

  it('should build WhatsApp link for 10-digit phone', () => {
    expect(whatsappLink('6133334444')).toBe('https://wa.me/556133334444');
  });

  it('should return empty string for invalid or empty phone', () => {
    expect(whatsappLink('')).toBe('');
    expect(whatsappLink(null)).toBe('');
    expect(whatsappLink('123')).toBe('');
  });
});

describe('maskPhone (máscara de digitação)', () => {
  it('should strip letters during typing', () => {
    expect(maskPhone('61985fyt')).toBe('(61) 985');
  });

  it('should return empty string when only invalid chars', () => {
    expect(maskPhone('abc')).toBe('');
    expect(maskPhone('')).toBe('');
    expect(maskPhone(null)).toBe('');
  });

  it('should apply partial mask while typing', () => {
    expect(maskPhone('6')).toBe('(6');
    expect(maskPhone('61')).toBe('(61');
    expect(maskPhone('619')).toBe('(61) 9');
    expect(maskPhone('619853')).toBe('(61) 9853');
    expect(maskPhone('6198530716')).toBe('(61) 9853-0716');
  });

  it('should mask 11-digit mobile phone', () => {
    expect(maskPhone('61985307168')).toBe('(61) 98530-7168');
  });

  it('should mask 10-digit landline phone', () => {
    expect(maskPhone('6133334444')).toBe('(61) 3333-4444');
  });

  it('should limit to 11 digits', () => {
    expect(maskPhone('619853071689999')).toBe('(61) 98530-7168');
  });
});

describe('maskCPFCNPJ (máscara de digitação)', () => {
  it('should strip letters during typing', () => {
    expect(maskCPFCNPJ('ewe')).toBe('');
    expect(maskCPFCNPJ('111ewe222')).toBe('111.222');
  });

  it('should apply partial CPF mask while typing', () => {
    expect(maskCPFCNPJ('111')).toBe('111');
    expect(maskCPFCNPJ('1112')).toBe('111.2');
    expect(maskCPFCNPJ('1112223')).toBe('111.222.3');
    expect(maskCPFCNPJ('1112223334')).toBe('111.222.333-4');
  });

  it('should mask full CPF (11 digits)', () => {
    expect(maskCPFCNPJ('11122233344')).toBe('111.222.333-44');
  });

  it('should switch to CNPJ mask above 11 digits', () => {
    expect(maskCPFCNPJ('112223330001')).toBe('11.222.333/0001');
    expect(maskCPFCNPJ('11222333000144')).toBe('11.222.333/0001-44');
  });

  it('should limit to 14 digits', () => {
    expect(maskCPFCNPJ('112223330001449999')).toBe('11.222.333/0001-44');
  });
});

describe('maskCurrency (máscara monetária por centavos)', () => {
  const mask = (v: string | null) => maskCurrency(v).replace(/\xa0/g, ' ');

  it('should format progressively treating last 2 digits as cents', () => {
    expect(mask('1')).toBe('R$ 0,01');
    expect(mask('12')).toBe('R$ 0,12');
    expect(mask('123')).toBe('R$ 1,23');
    expect(mask('1234')).toBe('R$ 12,34');
    expect(mask('12345')).toBe('R$ 123,45');
    expect(mask('15050')).toBe('R$ 150,50');
  });

  it('should strip letters and symbols', () => {
    expect(mask('15050abc')).toBe('R$ 150,50');
    expect(mask('R$ 150,50')).toBe('R$ 150,50');
    expect(mask('abc')).toBe('');
  });

  it('should keep empty field empty', () => {
    expect(mask('')).toBe('');
    expect(mask(null)).toBe('');
  });

  it('should apply thousand separators for large values', () => {
    expect(mask('150050')).toBe('R$ 1.500,50');
    expect(mask('12345678')).toBe('R$ 123.456,78');
  });

  it('should limit to 10 digits to avoid absurd values', () => {
    expect(mask('999999999999999')).toBe('R$ 99.999.999,99');
  });

  it('should be idempotent (re-masking formatted output keeps the value)', () => {
    expect(mask(maskCurrency('15050'))).toBe('R$ 150,50');
  });

  it('should round-trip with sanitizeCurrency at submit', () => {
    expect(sanitizeCurrency(maskCurrency('15050'))).toBe(150.5);
    expect(sanitizeCurrency(maskCurrency('25000'))).toBe(250);
    expect(sanitizeCurrency(maskCurrency('1250'))).toBe(12.5);
    expect(formatCurrency(maskCurrency('150050')).replace(/\xa0/g, ' ')).toBe('R$ 1.500,50');
  });
});
