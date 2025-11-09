# Supabase Setup Guide

This guide explains how to set up your Supabase project for the SmartPOS application.

## Prerequisites

1. Create a Supabase account at https://supabase.io
2. Create a new Supabase project

## Database Schema Setup

Run the following SQL files in order in your Supabase SQL editor:

1. `supabase/schema.sql` - Creates the core database tables
2. `supabase/create_cashiers_table.sql` - Creates the cashiers table
3. `supabase/create_settings_table.sql` - Creates the settings table

## Security Policies

After setting up the schema, run the security policy files:

1. `supabase/security_policies.sql` - Applies Row Level Security policies
2. `supabase/cashiers_security_policies.sql` - Applies security policies for cashiers

## Authentication Setup

Run the following scripts to set up authentication:

1. `supabase/cashier_trigger.sql` - Creates the trigger for automatic user creation
2. `supabase/setup_cashier_auth_user.sql` - Sets up authentication for cashiers

## Environment Variables

Once your Supabase project is set up, you'll need to configure the following environment variables in your Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL` - Found in your Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Found in your Supabase project settings

## Testing the Connection

After setting up your Supabase project and configuring the environment variables, you can test the connection by running the development server locally.