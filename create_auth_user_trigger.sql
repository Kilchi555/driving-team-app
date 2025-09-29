-- ========================================
-- AUTH USER TO PUBLIC USER TRIGGER
-- ========================================
-- This trigger automatically creates or updates a public.users record
-- when a new auth.users record is created or updated

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to handle new auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    tenant_uuid UUID;
    user_role TEXT;
BEGIN
    -- Extract tenant_id from raw_user_meta_data
    tenant_uuid := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    
    -- Determine user role (default to 'client' for registrations)
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
    
    -- Log the operation
    RAISE LOG 'Creating/updating public user for auth user: %, tenant: %, role: %', 
              NEW.id, tenant_uuid, user_role;
    
    -- Insert or update the public users record
    INSERT INTO public.users (
        id,
        auth_user_id,
        email,
        first_name,
        last_name,
        phone,
        birthdate,
        street,
        street_nr,
        zip,
        city,
        role,
        tenant_id,
        category,
        lernfahrausweis_nr,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.raw_user_meta_data->>'phone',
        (NEW.raw_user_meta_data->>'birthdate')::DATE,
        NEW.raw_user_meta_data->>'street',
        NEW.raw_user_meta_data->>'street_nr',
        NEW.raw_user_meta_data->>'zip',
        NEW.raw_user_meta_data->>'city',
        user_role,
        tenant_uuid,
        CASE 
            WHEN NEW.raw_user_meta_data->>'category' IS NOT NULL 
            THEN ARRAY[NEW.raw_user_meta_data->>'category']
            ELSE NULL
        END,
        NEW.raw_user_meta_data->>'lernfahrausweis_nr',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        birthdate = EXCLUDED.birthdate,
        street = EXCLUDED.street,
        street_nr = EXCLUDED.street_nr,
        zip = EXCLUDED.zip,
        city = EXCLUDED.city,
        role = EXCLUDED.role,
        tenant_id = EXCLUDED.tenant_id,
        category = EXCLUDED.category,
        lernfahrausweis_nr = EXCLUDED.lernfahrausweis_nr,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Test the trigger
DO $$
BEGIN
    RAISE NOTICE '✅ Auth user trigger created successfully';
    RAISE NOTICE 'This trigger will:';
    RAISE NOTICE '1. Create public.users records from auth.users';
    RAISE NOTICE '2. Extract tenant_id from raw_user_meta_data';
    RAISE NOTICE '3. Set appropriate user roles and data';
    RAISE NOTICE '4. Handle both INSERT and UPDATE operations';
END $$;
