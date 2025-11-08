# POS System Workflow

This document provides a comprehensive overview of the POS system workflow, showing how different components interact with each other.

## System Architecture Overview

```mermaid
graph TB
    A[User] --> B[Next.js Frontend]
    B --> C[Supabase Backend]
    C --> D[(PostgreSQL Database)]
    
    subgraph "Frontend Components"
        B --> E[Admin Panel]
        B --> F[Cashier POS Terminal]
        B --> G[Authentication System]
    end
    
    subgraph "Backend Services"
        C --> H[Authentication Service]
        C --> I[Database Service]
        C --> J[Real-time Service]
    end
    
    subgraph "Database Tables"
        D --> K[Users Table]
        D --> L[Products Table]
        D --> M[Transactions Table]
        D --> N[Transaction Items Table]
        D --> O[Activity Logs Table]
    end
```

## User Authentication Flow

```mermaid
graph TD
    A[User Accesses System] --> B{User Role?}
    B -->|Admin| C[Admin Login Page]
    B -->|Cashier| D[Cashier Login Page]
    C --> E[Enter Admin Credentials]
    D --> F[Enter Cashier Credentials]
    E --> G[Supabase Auth Verification]
    F --> H[Cashiers Table Verification]
    G --> I{Authentication Success?}
    H --> I
    I -->|Yes| J[Redirect to Dashboard/POS]
    I -->|No| K[Show Error Message]
```

## Admin Panel Workflow

```mermaid
graph TD
    A[Admin Dashboard] --> B{Navigation}
    B --> C[Product Management]
    B --> D[Cashier Management]
    B --> E[Reports]
    B --> F[Settings]
    
    C --> G[View Products]
    C --> H[Add Product]
    C --> I[Edit Product]
    C --> J[Delete Product]
    
    D --> K[View Cashiers]
    D --> L[Add Cashier]
    D --> M[Edit Cashier]
    D --> N[Delete Cashier]
    
    E --> O[Sales Reports]
    E --> P[Activity Logs]
```

## Cashier POS Terminal Workflow

```mermaid
graph TD
    A[Cashier POS Terminal] --> B[Product Search/Scan]
    B --> C{Product Found?}
    C -->|Yes| D[Add to Cart]
    C -->|No| E[Show Error]
    D --> F[Update Cart]
    F --> G{Checkout?}
    G -->|Yes| H[Payment Processing]
    G -->|No| B
    H --> I[Select Payment Method]
    I --> J[Process Payment]
    J --> K{Payment Successful?}
    K -->|Yes| L[Update Inventory]
    K -->|No| M[Show Payment Error]
    L --> N[Generate Receipt]
    N --> O[Complete Transaction]
```

## Database Schema Relationships

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : places
    USERS ||--o{ ACTIVITY_LOGS : generates
    PRODUCTS ||--o{ TRANSACTION_ITEMS : contains
    TRANSACTIONS ||--o{ TRANSACTION_ITEMS : includes
    
    USERS {
        string id PK
        string email
        string role
        string password
        datetime created_at
        datetime updated_at
    }
    
    PRODUCTS {
        string id PK
        string name
        string description
        decimal price
        string category
        int stock_quantity
        string barcode
        datetime created_at
        datetime updated_at
    }
    
    TRANSACTIONS {
        string id PK
        string cashier_id FK
        decimal total_amount
        string payment_method
        string status
        datetime created_at
    }
    
    TRANSACTION_ITEMS {
        string id PK
        string transaction_id FK
        string product_id FK
        int quantity
        decimal price
        datetime created_at
    }
    
    ACTIVITY_LOGS {
        string id PK
        string user_id FK
        string action
        string description
        datetime created_at
    }
```

## Key System Features

### Authentication & Authorization
- Role-based access control (Admin/Cashier)
- Secure authentication with Supabase Auth
- Session management for both user types

### Admin Features
- Dashboard with analytics overview
- Product Management (CRUD operations)
- Cashier Management (view/add/edit/delete)
- Reports section (sales reports, activity logs)
- Settings panel

### Cashier Features
- Main POS interface with product grid/search
- Shopping cart functionality
- Barcode scanning integration
- Payment processing workflow
- Receipt generation and printing
- Real-time inventory updates

### Data Management
- PostgreSQL database with proper schema
- Row Level Security (RLS) policies
- Real-time data synchronization
- Activity logging for audit trails

## Data Flow Process

1. **User Authentication**
   - Users access login pages based on their role
   - Credentials verified against database
   - Session created upon successful authentication

2. **Admin Operations**
   - Admins can manage products, cashiers, and view reports
   - All changes are logged in activity logs
   - Real-time updates propagate to all connected clients

3. **POS Operations**
   - Cashiers search for products or scan barcodes
   - Items added to cart with quantity selection
   - Payment processed through selected method
   - Inventory automatically updated after transaction
   - Transaction recorded in database with timestamp

4. **Reporting & Analytics**
   - Sales data aggregated from transactions
   - Activity logs track all user actions
   - Reports generated based on date ranges
   - Real-time dashboard updates for admin overview

This workflow ensures a smooth, secure, and efficient operation of the POS system for both administrators and cashiers.