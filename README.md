# SmartPOS - Point of Sale System

SmartPOS is a modern Point of Sale system built with Next.js, TypeScript, and Supabase, featuring role-based access for administrators and cashiers.

## Deployment to Vercel

### Prerequisites
1. A Vercel account
2. A Supabase account with a configured project
3. Supabase URL and anonymous key

### Deployment Steps

1. **Fork this repository** to your GitHub account

2. **Configure Supabase:**
   - Create a new Supabase project
   - Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor
   - Note your Supabase URL and anonymous key from the project settings

3. **Deploy to Vercel:**
   - Go to your Vercel dashboard
   - Click "New Project" and import your forked repository
   - Configure environment variables in the Vercel project settings:
     - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - Click "Deploy"

4. **Set up authentication:**
   - In your Supabase project, go to Authentication > Settings
   - Disable "Enable email confirmations" if you want direct login
   - Configure any additional auth providers as needed

5. **Add initial data:**
   - Use the Supabase SQL editor to add initial products and admin users
   - Or implement admin user creation functionality in the app

### Environment Variables
The following environment variables must be set in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Supabase Setup
Run the following SQL files in order in your Supabase SQL editor:
1. `supabase/schema.sql` - Core database schema
2. `supabase/security_policies.sql` - Row Level Security policies
3. `supabase/cashier_trigger.sql` - Cashier user creation trigger
4. Other security policy files as needed

## Development

To run locally:
1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
3. Run `npm install`
4. Run `npm run dev`

## Project Structure

- `src/app` - Main application routes (admin, auth, cashier/POS)
- `src/components` - Shared UI components
- `src/lib` - Utilities, Supabase client, validation logic
- `supabase` - SQL scripts and utilities for DB schema, security, and data setup

## Tech Stack

- **Framework**: Next.js (App Router)
- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **State Management**: React Hook Form + Zod for validation
- **Backend**: Supabase (PostgreSQL), Supabase Auth, RLS policies
- **Testing**: Cypress (E2E), Jest (unit/integration)