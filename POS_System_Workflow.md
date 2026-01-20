# AJ Softdrive POS System - Workflow Diagram

This document provides a comprehensive workflow diagram for the AJ Softdrive Point of Sale system, showing how different components and user roles interact within the system.

```mermaid
graph TD
    A[User] --> B{Select Login Type}
    B -->|Admin| C[Admin Login]
    B -->|Cashier| D[Cashier Login]
    
    C --> E{Authentication}
    E -->|Valid Admin| F[Admin Dashboard]
    E -->|Invalid| G[Error - Return to Login]
    
    D --> H{Authentication}
    H -->|Valid Cashier| I[Cashier POS Terminal]
    H -->|Invalid| J[Error - Return to Login]
    
    F --> K[Admin Functions]
    K --> L[Product Management]
    L --> L1[Add/Edit Products]
    L --> L2[View Product List]
    L --> L3[Delete Products]
    L --> L4[Generate Barcodes]
    
    K --> M[Cashier Management]
    M --> M1[Add Cashiers]
    M --> M2[View Cashier List]
    M --> M3[Delete Cashiers]
    
    K --> N[Reports]
    N --> N1[View Sales Reports]
    N --> N2[View Transaction History]
    N --> N3[Export Data]
    
    K --> O[Settings]
    O --> O1[System Configuration]
    O --> O2[User Preferences]
    
    I --> P[POS Functions]
    P --> Q[Product Search]
    Q --> Q1[Manual Search]
    Q --> Q2[Barcode Scanning]
    
    P --> R[Shopping Cart]
    R --> R1[Add Items]
    R --> R2[Remove Items]
    R --> R3[Update Quantities]
    
    P --> S[Payment Processing]
    S --> S1[Select Payment Method]
    S1 --> S11[Cash]
    S1 --> S12[Card]
    S1 --> S13[Mobile Payment]
    S --> S2[Calculate Total]
    S --> S3[Process Transaction]
    
    S3 --> T{Transaction Status}
    T -->|Success| U[Print Receipt]
    T -->|Failure| V[Show Error]
    
    U --> W[Update Inventory]
    W --> X[Log Transaction]
    X --> Y[Return to POS]
    
    subgraph "Database Layer"
        Z[(Supabase Database)]
        Z --> Z1[Products Table]
        Z --> Z2[Cashiers Table]
        Z --> Z3[Transactions Table]
        Z --> Z4[Users Table]
        Z --> Z5[Activity Logs Table]
    end
    
    L1 --> Z1
    L2 --> Z1
    L3 --> Z1
    
    M1 --> Z2
    M2 --> Z2
    M3 --> Z2
    
    Q1 --> Z1
    Q2 --> Z1
    
    R1 --> Z1
    R2 --> Z1
    R3 --> Z1
    
    S3 --> Z3
    S3 --> Z4
    
    W --> Z1
    X --> Z5
    
    N1 --> Z3
    N2 --> Z3
    N3 --> Z3
    
    style A fill:#e1f5fe
    style B fill:#fce4ec
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style F fill:#e8f5e8
    style I fill:#fff3e0
    style Z fill:#f3e5f5
    style T fill:#fce4ec
```

## System Components Overview

### 1. User Access Points
- **Public Landing Page**: Entry point for all users
- **Admin Login**: Secure authentication for administrative functions
- **Cashier Login**: Authentication for POS terminal access

### 2. Admin Dashboard
The admin dashboard provides comprehensive system management capabilities:
- **Product Management**: Add, edit, delete, and manage product inventory
- **Cashier Management**: Create and manage cashier accounts
- **Reports**: View sales data, transaction history, and performance metrics
- **Settings**: Configure system preferences and user settings

### 3. Cashier POS Terminal
The POS terminal is designed for efficient transaction processing:
- **Product Search**: Manual search or barcode scanning
- **Shopping Cart**: Add/remove items and adjust quantities
- **Payment Processing**: Multiple payment methods (cash, card, mobile)
- **Receipt Generation**: Print or email transaction receipts
- **Inventory Updates**: Real-time stock adjustments

### 4. Database Layer
All system data is managed through Supabase:
- **Products Table**: Product information, pricing, and inventory
- **Cashiers Table**: Cashier account information and credentials
- **Transactions Table**: Sales records and payment details
- **Users Table**: Admin user accounts and roles
- **Activity Logs Table**: System events and user actions

## Key Workflows

### Authentication Flow
1. User selects login type (Admin or Cashier)
2. System validates credentials against appropriate database table
3. Successful authentication grants access to respective dashboard
4. Failed authentication returns user to login with error message

### Product Management Flow
1. Admin navigates to Product Management section
2. Admin can add new products or edit existing ones
3. System updates Products table in database
4. Changes are immediately reflected in POS terminal

### Transaction Processing Flow
1. Cashier scans or searches for products
2. Items are added to shopping cart
3. Customer selects payment method
4. System processes payment and creates transaction record
5. Inventory is automatically updated
6. Receipt is generated and printed

### Reporting Flow
1. Admin navigates to Reports section
2. System queries Transactions table for relevant data
3. Data is aggregated and displayed in dashboard
4. Admin can filter by date range and export data

This workflow diagram provides a comprehensive overview of how the AJ Softdrive POS system operates, showing the relationships between different components and user roles.