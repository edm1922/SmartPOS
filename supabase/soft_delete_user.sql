-- Function to soft delete a user
-- This function marks a user as inactive instead of actually deleting them
CREATE OR REPLACE FUNCTION public.soft_delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Update the user to mark them as inactive
  UPDATE public.users
  SET 
    is_active = FALSE,
    deleted_at = NOW()
  WHERE id = user_id;
  
  -- Check how many rows were affected
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  -- Return true if a row was updated, false otherwise
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
-- (In practice, you might want to restrict this to admins only)
GRANT EXECUTE ON FUNCTION public.soft_delete_user(UUID) TO authenticated;