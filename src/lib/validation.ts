// Validation and sanitization utilities

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Phone number validation
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Price validation
export const validatePrice = (price: number): boolean => {
  return !isNaN(price) && price >= 0 && price <= 999999.99;
};

// Stock quantity validation
export const validateStockQuantity = (quantity: number): boolean => {
  return Number.isInteger(quantity) && quantity >= 0 && quantity <= 999999;
};

// Barcode validation
export const validateBarcode = (barcode: string): boolean => {
  // Basic barcode validation (12-13 digits for EAN/UPC)
  const barcodeRegex = /^(\d{12}|\d{13})$/;
  return barcodeRegex.test(barcode);
};

// Sanitize string input
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

// Sanitize number input
export const sanitizeNumber = (input: string | number): number => {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  return isNaN(num) ? 0 : Math.max(0, num);
};

// Sanitize integer input
export const sanitizeInteger = (input: string | number): number => {
  const num = typeof input === 'string' ? parseInt(input, 10) : Math.floor(input);
  return isNaN(num) ? 0 : Math.max(0, num);
};

// Validate and sanitize product data
export const validateProductData = (data: any) => {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Product name is required');
  } else {
    sanitizedData.name = sanitizeString(data.name);
    if (sanitizedData.name.length > 100) {
      errors.push('Product name must be less than 100 characters');
    }
  }
  
  // Description validation
  if (data.description) {
    sanitizedData.description = sanitizeString(data.description);
    if (sanitizedData.description.length > 500) {
      errors.push('Product description must be less than 500 characters');
    }
  }
  
  // Price validation
  if (typeof data.price === 'undefined') {
    errors.push('Price is required');
  } else {
    const price = typeof data.price === 'string' ? sanitizeNumber(data.price) : data.price;
    if (!validatePrice(price)) {
      errors.push('Invalid price format');
    } else {
      sanitizedData.price = parseFloat(price.toFixed(2));
    }
  }
  
  // Category validation
  if (data.category) {
    sanitizedData.category = sanitizeString(data.category);
    if (sanitizedData.category.length > 50) {
      errors.push('Category must be less than 50 characters');
    }
  }
  
  // Stock quantity validation
  if (typeof data.stock_quantity === 'undefined') {
    errors.push('Stock quantity is required');
  } else {
    const stock = typeof data.stock_quantity === 'string' ? sanitizeInteger(data.stock_quantity) : data.stock_quantity;
    if (!validateStockQuantity(stock)) {
      errors.push('Invalid stock quantity');
    } else {
      sanitizedData.stock_quantity = stock;
    }
  }
  
  // Barcode validation
  if (data.barcode) {
    sanitizedData.barcode = sanitizeString(data.barcode);
    if (!validateBarcode(sanitizedData.barcode)) {
      errors.push('Invalid barcode format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedData
  };
};

// Validate and sanitize user data
export const validateUserData = (data: any) => {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else {
    sanitizedData.email = sanitizeString(data.email);
    if (!validateEmail(sanitizedData.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Password validation (only for creation)
  if (data.password) {
    sanitizedData.password = sanitizeString(data.password);
    if (!validatePassword(sanitizedData.password)) {
      errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
    }
  }
  
  // Role validation
  if (!data.role || typeof data.role !== 'string') {
    errors.push('Role is required');
  } else {
    sanitizedData.role = sanitizeString(data.role);
    if (!['admin', 'cashier'].includes(sanitizedData.role)) {
      errors.push('Invalid role');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedData
  };
};

// Validate and sanitize transaction data
export const validateTransactionData = (data: any) => {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // Cashier ID validation
  if (!data.cashier_id || typeof data.cashier_id !== 'string') {
    errors.push('Cashier ID is required');
  } else {
    sanitizedData.cashier_id = sanitizeString(data.cashier_id);
  }
  
  // Total amount validation
  if (typeof data.total_amount === 'undefined') {
    errors.push('Total amount is required');
  } else {
    const amount = typeof data.total_amount === 'string' ? sanitizeNumber(data.total_amount) : data.total_amount;
    if (!validatePrice(amount)) {
      errors.push('Invalid amount format');
    } else {
      sanitizedData.total_amount = parseFloat(amount.toFixed(2));
    }
  }
  
  // Payment method validation
  if (!data.payment_method || typeof data.payment_method !== 'string') {
    errors.push('Payment method is required');
  } else {
    sanitizedData.payment_method = sanitizeString(data.payment_method);
    if (!['cash', 'card', 'mobile'].includes(sanitizedData.payment_method)) {
      errors.push('Invalid payment method');
    }
  }
  
  // Status validation
  if (data.status) {
    sanitizedData.status = sanitizeString(data.status);
    if (!['completed', 'cancelled', 'pending'].includes(sanitizedData.status)) {
      errors.push('Invalid status');
    }
  } else {
    sanitizedData.status = 'completed';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedData
  };
};