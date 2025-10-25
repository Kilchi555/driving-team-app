-- Fix RLS policies for user_devices table
-- Execute this in Supabase SQL Editor

-- 1. Enable RLS on user_devices table (if not already enabled)
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can insert own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can update own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Service role full access" ON public.user_devices;
DROP POLICY IF EXISTS "Allow authenticated users to select user_devices" ON public.user_devices;
DROP POLICY IF EXISTS "Allow authenticated users to insert user_devices" ON public.user_devices;
DROP POLICY IF EXISTS "Allow authenticated users to update user_devices" ON public.user_devices;
DROP POLICY IF EXISTS "Allow authenticated users to delete user_devices" ON public.user_devices;

-- 3. Create comprehensive policies for user_devices table

-- Policy 1: Allow authenticated users to view their own devices
CREATE POLICY "Allow authenticated users to select user_devices" ON public.user_devices
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy 2: Allow authenticated users to insert their own devices
CREATE POLICY "Allow authenticated users to insert user_devices" ON public.user_devices
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow authenticated users to update their own devices
CREATE POLICY "Allow authenticated users to update user_devices" ON public.user_devices
    FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow authenticated users to delete their own devices
CREATE POLICY "Allow authenticated users to delete user_devices" ON public.user_devices
    FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy 5: Allow service role full access (for admin operations)
CREATE POLICY "Service role full access" ON public.user_devices
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);


