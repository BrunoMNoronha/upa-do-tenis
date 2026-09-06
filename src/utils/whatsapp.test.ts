import { describe, it, expect } from 'vitest';
import { gerarLinkWhatsApp } from './whatsapp';

describe('gerarLinkWhatsApp', () => {
  it('should throw Error for invalid phone number', () => {
    expect(() => {
      gerarLinkWhatsApp('123', 'Olá {{nome}}', { nome: 'Maria' });
    }).toThrow('Telefone inválido para WhatsApp: "123". Informe um número com DDD (10 ou 11 dígitos).');
  });
});
