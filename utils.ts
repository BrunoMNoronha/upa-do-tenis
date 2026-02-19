
import { PaymentMethod } from './types';

export const formatCurrency = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const parseCurrency = (value: string): number => {
  const cleanedValue = value.replace(/[^0-9,.]+/g, '').replace('.', '').replace(',', '.');
  return Math.round(parseFloat(cleanedValue || '0') * 100);
};

export const formatCurrencyForInput = (cents: number): string => {
  return (cents / 100).toFixed(2).replace('.', ',');
};

export const getWhatsAppLink = (contact: string, message: string = '', osNumber?: string): string => {
  const digitsOnly = contact.replace(/\D/g, '');

  let formattedNumber = digitsOnly;
  if (!formattedNumber.startsWith('55') && (formattedNumber.length === 10 || formattedNumber.length === 11)) {
    formattedNumber = `55${digitsOnly}`;
  } else if (formattedNumber.length < 10) {
    // If it's too short, it's likely not a full number.
  }

  const defaultMessage = osNumber ? `Olá, referente à OS #${osNumber}.` : 'Olá!';
  const encodedMessage = encodeURIComponent(message || defaultMessage);
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
};
