'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to get the current theme
const getTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    
    // Check system preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  } catch {
    // Fallback to light theme if there's any error
    return 'light';
  }
};

// Helper function to apply theme to document
const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMounted, setIsMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initialTheme = getTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setIsMounted(true);
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (!isMounted) return;
    
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    
    // Dispatch custom event for other instances
    window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
  }, [theme, isMounted]);

  // Listen for theme changes from other tabs/pages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue as 'light' | 'dark');
        applyTheme(e.newValue as 'light' | 'dark');
      }
    };
    
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && (customEvent.detail === 'light' || customEvent.detail === 'dark')) {
        setTheme(customEvent.detail);
        applyTheme(customEvent.detail);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-change', handleThemeChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Don't render children until theme is properly initialized to avoid flash
  if (!isMounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}