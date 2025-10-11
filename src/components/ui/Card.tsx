import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  withShadow?: boolean;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Content: React.FC<CardContentProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ children, className = '', withShadow = true, ...props }) => {
  const shadowClass = withShadow ? 'shadow-lg' : 'shadow';
  
  return (
    <div className={`bg-white rounded-xl ${shadowClass} overflow-hidden transition-all duration-200 hover:shadow-xl ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', title, subtitle, ...props }) => {
  return (
    <div className={`px-6 py-5 border-b border-gray-100 ${className}`} {...props}>
      {title && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      {!title && children}
    </div>
  );
};

const CardContent: React.FC<CardContentProps> = ({ children, className = '', padding = 'md', ...props }) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div className={`${paddingClasses[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
};

const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`px-6 py-4 bg-gray-50 rounded-b-xl ${className}`} {...props}>
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card };