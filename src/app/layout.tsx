import '@/styles/globals.css';
import type { Metadata } from 'next';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'AJ Softdrive',
  description: 'Modern Point of Sale System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}