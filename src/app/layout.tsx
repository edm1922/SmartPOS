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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Apply theme immediately to prevent flash
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    // Check system preference
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                } catch (e) {
                  // Fallback to light theme if there's any error
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
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