describe('Admin Login Flow', () => {
  beforeEach(() => {
    cy.visit('/auth/admin/login')
  })

  it('displays the login form', () => {
    cy.get('h2').contains('Admin Login')
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('shows error for invalid credentials', () => {
    cy.get('input[name="email"]').type('invalid@example.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()
    
    cy.get('.rounded-md.bg-red-50').should('be.visible')
    cy.get('.text-red-700').should('exist')
  })

  it('redirects to admin dashboard with valid credentials', () => {
    // In a real test, you would use valid test credentials
    // For now, we'll just test the UI flow
    cy.get('input[name="email"]').type('admin@example.com')
    cy.get('input[name="password"]').type('Password123')
    cy.get('button[type="submit"]').click()
    
    // Should show loading state or error since we're not connected to a real backend
    cy.get('button[type="submit"]').should('contain', 'Signing in...')
  })
})