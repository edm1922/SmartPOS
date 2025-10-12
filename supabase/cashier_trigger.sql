-- Create a trigger function for the cashiers table
-- This will handle automatic timestamp updates

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cashier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on cashier updates
DROP TRIGGER IF EXISTS update_cashiers_updated_at ON cashiers;
CREATE TRIGGER update_cashiers_updated_at
    BEFORE UPDATE ON cashiers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cashier_updated_at();

-- Create function to handle new cashier creation from auth
-- This is for integration with Supabase Auth if needed
CREATE OR REPLACE FUNCTION public.handle_new_cashier()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be used to sync with auth.users if needed
    -- For now, we'll handle cashier creation directly in the application
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;