/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';
import Settings from './page';
import { supabase, supabaseDB } from '@/lib/supabaseClient';

// Mock the Supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
  supabaseDB: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the form components
jest.mock('@/components/ui/Form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  FormField: ({ name, render }: { name: string; render: any }) => 
    render({ field: { name, value: '', onChange: jest.fn() } }),
}));

// Mock other components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, type }: { children: React.ReactNode; onClick: any; type: any }) => 
    <button type={type} onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

describe('Settings Page', () => {
  const mockGetSession = supabase.auth.getSession as jest.Mock;
  const mockGetSettings = supabaseDB.getSettings as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    
    // Just render the component to ensure it doesn't crash
    render(<Settings />);
  });
});