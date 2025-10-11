describe('POS Terminal Flow', () => {
  beforeEach(() => {
    // In a real test, you would log in as cashier first
    cy.visit('/cashier/pos')
  })

  it('displays the POS terminal', () => {
    cy.get('span').contains('POS Terminal')
    cy.get('input[placeholder="Search products by name or barcode..."]').should('be.visible')
    cy.get('input[placeholder="Scan barcode..."]').should('be.visible')
    cy.get('.grid.grid-cols-1').should('exist')
  })

  it('adds product to cart via search', () => {
    cy.get('input[placeholder="Search products by name or barcode..."]').type('Wireless Headphones')
    cy.get('.grid.grid-cols-1 button').contains('Add to Cart').first().click()
    cy.get('.flex.items-center.border-b.pb-4').should('be.visible')
    cy.get('.flex.items-center.border-b.pb-4').should('contain', 'Wireless Headphones')
  })

  it('adds product to cart via barcode scan', () => {
    cy.get('input[placeholder="Scan barcode..."]').type('123456789012{enter}')
    cy.get('.flex.items-center.border-b.pb-4').should('be.visible')
    cy.get('.flex.items-center.border-b.pb-4').should('contain', 'Wireless Headphones')
  })

  it('updates product quantity in cart', () => {
    // Add a product to cart first
    cy.get('input[placeholder="Search products by name or barcode..."]').type('USB-C Cable')
    cy.get('.grid.grid-cols-1 button').contains('Add to Cart').first().click()
    
    // Increase quantity
    cy.get('.flex.items-center.border-b.pb-4 button').contains('+').click()
    cy.get('.flex.items-center.border-b.pb-4 .w-8.text-center').should('contain', '2')
    
    // Decrease quantity
    cy.get('.flex.items-center.border-b.pb-4 button').contains('-').click()
    cy.get('.flex.items-center.border-b.pb-4 .w-8.text-center').should('contain', '1')
  })

  it('removes product from cart', () => {
    // Add a product to cart first
    cy.get('input[placeholder="Search products by name or barcode..."]').type('Bluetooth Speaker')
    cy.get('.grid.grid-cols-1 button').contains('Add to Cart').first().click()
    
    // Remove product
    cy.get('.flex.items-center.border-b.pb-4 button.ml-2').click()
    cy.get('.flex.items-center.border-b.pb-4').should('not.contain', 'Bluetooth Speaker')
  })

  it('processes payment', () => {
    // Add a product to cart first
    cy.get('input[placeholder="Search products by name or barcode..."]').type('Laptop Stand')
    cy.get('.grid.grid-cols-1 button').contains('Add to Cart').first().click()
    
    // Process payment
    cy.get('button').contains('Process Payment').click()
    cy.get('h3').contains('Process Payment').should('be.visible')
    
    // Select cash payment
    cy.get('button').contains('Cash').click()
    
    // Enter amount received
    cy.get('input#amountReceived').type('50')
    
    // Complete transaction
    cy.get('button').contains('Complete Transaction').click()
    
    // Should show receipt
    cy.get('h3').contains('Receipt').should('be.visible')
  })
})