import { describe, it, expect } from 'vitest';
import { formatPhone, formatCPFCNPJ, formatCEP, formatCurrency, whatsappLink } from '../lib/formatters';

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
