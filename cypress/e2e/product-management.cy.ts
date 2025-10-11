describe('Product Management Flow', () => {
  beforeEach(() => {
    // In a real test, you would log in as admin first
    cy.visit('/admin/products')
  })

  it('displays the product management page', () => {
    cy.get('h1').contains('Product Management')
    cy.get('button').contains('Add Product').should('be.visible')
    cy.get('table').should('be.visible')
  })

  it('opens add product modal', () => {
    cy.get('button').contains('Add Product').click()
    cy.get('h3').contains('Add Product').should('be.visible')
    cy.get('input[name="name"]').should('be.visible')
    cy.get('input[name="price"]').should('be.visible')
    cy.get('input[name="stock_quantity"]').should('be.visible')
  })

  it('adds a new product', () => {
    cy.get('button').contains('Add Product').click()
    cy.get('input[name="name"]').type('Test Product')
    cy.get('input[name="price"]').type('29.99')
    cy.get('input[name="stock_quantity"]').type('10')
    cy.get('button').contains('Add Product').click()
    
    // Should show success or close modal
    cy.get('h3').contains('Add Product').should('not.exist')
  })

  it('edits an existing product', () => {
    // Click the first edit button in the table
    cy.get('table tbody tr:first-child button').contains('Edit').click()
    cy.get('h3').contains('Edit Product').should('be.visible')
    cy.get('input[name="name"]').should('be.visible')
    cy.get('button').contains('Update Product').should('be.visible')
  })

  it('deletes a product', () => {
    // Click the first delete button in the table
    cy.get('table tbody tr:first-child button').contains('Delete').click()
    
    // Should remove the row from the table
    // Note: In a real test with a backend, you would verify the product is actually deleted
  })
})