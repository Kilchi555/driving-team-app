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

    console.log('Creating user_devices table...')

    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create user_devices table
        CREATE TABLE IF NOT EXISTS public.user_devices (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            mac_address VARCHAR(17) NOT NULL,
            user_agent TEXT,
            ip_address INET,
            device_name VARCHAR(255),
            first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_trusted BOOLEAN DEFAULT FALSE,
            trusted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_devices_mac_address ON public.user_devices(mac_address);
        CREATE INDEX IF NOT EXISTS idx_user_devices_user_mac ON public.user_devices(user_id, mac_address);

        -- Create unique constraint
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_devices_unique_user_mac 
        ON public.user_devices(user_id, mac_address);

        -- Enable RLS
        ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        DROP POLICY IF EXISTS "Users can view own devices" ON public.user_devices;
        CREATE POLICY "Users can view own devices" ON public.user_devices
            FOR SELECT 
            TO authenticated 
            USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own devices" ON public.user_devices;
        CREATE POLICY "Users can insert own devices" ON public.user_devices
            FOR INSERT 
            TO authenticated 
            WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update own devices" ON public.user_devices;
        CREATE POLICY "Users can update own devices" ON public.user_devices
            FOR UPDATE 
            TO authenticated 
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Service role full access" ON public.user_devices;
        CREATE POLICY "Service role full access" ON public.user_devices
            FOR ALL 
            TO service_role 
            USING (true)
            WITH CHECK (true);
      `
    })

    if (error) {
      console.error('Error creating user_devices table:', error)
      return {
        success: false,
        error: error.message,
        details: error
      }
    }

    return {
      success: true,
      message: 'user_devices table created successfully',
      data: data
    }

  } catch (error: any) {
    console.error('Error in create-user-devices-table API:', error)
    return {
      success: false,
      error: error.message
    }
  }
})




