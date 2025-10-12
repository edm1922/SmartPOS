'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define currency types
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

// Default currency (USD)
const DEFAULT_CURRENCY: Currency = {
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  decimalPlaces: 2,
};

// Available currencies
export const AVAILABLE_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimalPlaces: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2 },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  // Load currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('pos_currency');
    if (savedCurrency) {
      try {
        const parsed = JSON.parse(savedCurrency);
        // Validate that it's a supported currency
        const isValidCurrency = AVAILABLE_CURRENCIES.some(c => c.code === parsed.code);
        if (isValidCurrency) {
          setCurrency(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved currency', e);
      }
    }
  }, []);

  // Save currency to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('pos_currency', JSON.stringify(currency));
  }, [currency]);

  const formatPrice = (amount: number): string => {
    return `${currency.symbol}${amount.toFixed(currency.decimalPlaces)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}