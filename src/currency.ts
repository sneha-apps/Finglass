/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CurrencyRate } from './types';

// Standard high-fidelity baseline exchange coefficients to USD (1 unit of currency = X USD)
// Base current rates as of June 2026
export const CURRENCIES: CurrencyRate[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToUsd: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToUsd: 1.08 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateToUsd: 1.27 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUsd: 0.0064 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToUsd: 0.73 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToUsd: 0.66 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUsd: 0.012 },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', rateToUsd: 1.11 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUsd: 0.14 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateToUsd: 0.19 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rateToUsd: 0.27 }
];

/**
 * Converts a given original amount and currency to USD
 */
export function convertToUsd(amount: number, fromCurrencyCode: string): number {
  const currency = CURRENCIES.find(c => c.code.toUpperCase() === fromCurrencyCode.toUpperCase());
  if (!currency) return amount; // default fallback
  return Number((amount * currency.rateToUsd).toFixed(2));
}

/**
 * Converts a USD amount back to any target currency code
 */
export function convertFromUsd(amountUsd: number, toCurrencyCode: string): number {
  const currency = CURRENCIES.find(c => c.code.toUpperCase() === toCurrencyCode.toUpperCase());
  if (!currency || currency.rateToUsd === 0) return amountUsd;
  return Number((amountUsd / currency.rateToUsd).toFixed(2));
}

/**
 * Cleanly formats any financial number with its proper currency symbol
 */
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const currency = CURRENCIES.find(c => c.code.toUpperCase() === currencyCode.toUpperCase());
  const symbol = currency ? currency.symbol : '$';
  
  // Format with thousands separator
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${symbol}${formattedAmount} ${currencyCode}`;
}

/**
 * Formats a converted amount to a secondary pane (showing the USD conversion right next to original input)
 */
export function formatWithUsdPane(originalAmount: number, originalCurrency: string): string {
  if (originalCurrency === 'USD') {
    return formatCurrency(originalAmount, 'USD');
  }
  const inUsd = convertToUsd(originalAmount, originalCurrency);
  return `${formatCurrency(originalAmount, originalCurrency)} (${formatCurrency(inUsd, 'USD')})`;
}
