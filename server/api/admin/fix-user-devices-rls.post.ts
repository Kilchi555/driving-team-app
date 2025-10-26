import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL or Service Role Key not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const sql = `
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
    `
    
    // Test current user_devices access
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('id, user_id, mac_address, device_name, is_trusted')
      .limit(5)
    
    return {
      success: true,
      message: 'User devices RLS policies need to be fixed manually',
      sqlToExecute: sql,
      currentDeviceAccess: devicesError ? 'BLOCKED' : 'ALLOWED',
      devicesFound: devices?.length || 0,
      devices: devices,
      error: devicesError?.message
    }
    
  } catch (error: any) {
    console.error('Error fixing user_devices RLS:', error)
    return {
      success: false,
      error: error.message
    }
  }
})



