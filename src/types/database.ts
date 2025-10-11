export interface User {
  id: string;
  email: string;
  role: 'admin' | 'cashier';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  stock_quantity: number;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'mobile';
  status: 'completed' | 'cancelled' | 'pending';
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description?: string;
  created_at: string;
}