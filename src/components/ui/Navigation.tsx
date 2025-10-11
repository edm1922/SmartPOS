import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

interface NavigationProps {
  items: NavigationItem[];
  className?: string;
  variant?: 'default' | 'tabs' | 'pills';
}

export const Navigation: React.FC<NavigationProps> = ({ items, className = '', variant = 'default' }) => {
  const pathname = usePathname();
  
  // Variant styles
  const variantStyles = {
    default: {
      container: 'flex space-x-8',
      item: (isActive: boolean) => `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
        isActive
          ? 'border-primary-500 text-gray-900'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      }`,
    },
    tabs: {
      container: 'flex space-x-2 border-b border-gray-200',
      item: (isActive: boolean) => `inline-flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
        isActive
          ? 'bg-white text-primary-600 border-t border-l border-r border-gray-200'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`,
    },
    pills: {
      container: 'flex space-x-2',
      item: (isActive: boolean) => `inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`,
    },
  };
  
  const styles = variantStyles[variant];
  
  return (
    <nav className={className}>
      <ul className={styles.container}>
        {items.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                className={styles.item(isActive)}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};