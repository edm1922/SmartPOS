'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define currency types
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

// Default currency (PHP)
const DEFAULT_CURRENCY: Currency = {
  code: 'PHP',
  symbol: '₱',
  name: 'Philippine Peso',
  decimalPlaces: 2,
};

// Available currencies (PHP only)
export const AVAILABLE_CURRENCIES: Currency[] = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimalPlaces: 2 },
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
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces,
    }).format(amount);
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