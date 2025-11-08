# Simple POS System Workflow

This diagram shows the basic workflow of the POS system with interactions between customers, cashiers, and administrators.

```mermaid
graph LR
    A[Customer] --> B[Cashier]
    B --> C[POS System]
    C --> D[Database]
    D --> E[Admin]
    E --> C
    
    style A fill:#FFE4B5,stroke:#333
    style B fill:#87CEEB,stroke:#333
    style C fill:#98FB98,stroke:#333
    style D fill:#FFA07A,stroke:#333
    style E fill:#DDA0DD,stroke:#333
```

## Workflow Steps

1. **Customer → Cashier**: Customer brings items for purchase
2. **Cashier → POS System**: Cashier processes items and payments
3. **POS System → Database**: Sales data is stored in database
4. **Database → Admin**: Admin views reports and analytics
5. **Admin → POS System**: Admin manages products and cashiers

This simple flow shows how data moves through the system from customer purchase to administrative oversight.