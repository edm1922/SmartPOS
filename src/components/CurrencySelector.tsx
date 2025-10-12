'use client';

import { useCurrency, AVAILABLE_CURRENCIES } from '@/context/CurrencyContext';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/Button';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/Card';
import { useState } from 'react';

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const handleCurrencyChange = (currencyCode: string) => {
    const selectedCurrency = AVAILABLE_CURRENCIES.find(c => c.code === currencyCode);
    if (selectedCurrency) {
      setCurrency(selectedCurrency);
      setIsOpen(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900">Currency Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Select Currency
            </label>
            <Select onValueChange={handleCurrencyChange} value={currency.code}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.name} ({curr.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-500">
              Current: <span className="font-medium">{currency.symbol}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>Selected currency will be used for all price displays in the POS system.</p>
        </div>
      </CardContent>
    </Card>
  );
}