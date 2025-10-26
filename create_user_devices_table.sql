-- create_user_devices_table.sql
-- Create table for tracking user devices and MAC addresses

-- 1. Create user_devices table
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mac_address VARCHAR(17) NOT NULL, -- MAC address format: XX:XX:XX:XX:XX:XX
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

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_mac_address ON public.user_devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_mac ON public.user_devices(user_id, mac_address);

-- 3. Create unique constraint (one device per user per MAC)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_devices_unique_user_mac 
ON public.user_devices(user_id, mac_address);

-- 4. Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Policy 1: Users can view their own devices
CREATE POLICY "Users can view own devices" ON public.user_devices
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own devices
CREATE POLICY "Users can insert own devices" ON public.user_devices
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own devices
CREATE POLICY "Users can update own devices" ON public.user_devices
    FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Service role can do everything (for admin operations)
CREATE POLICY "Service role full access" ON public.user_devices
    FOR ALL 
    TO service_role 
    USING (true)
    WITH CHECK (true);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for updated_at
CREATE TRIGGER trigger_update_user_devices_updated_at
    BEFORE UPDATE ON public.user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_user_devices_updated_at();

-- 8. Add comments
COMMENT ON TABLE public.user_devices IS 'Tracks user devices for security and authentication';
COMMENT ON COLUMN public.user_devices.mac_address IS 'MAC address of the device (format: XX:XX:XX:XX:XX:XX)';
COMMENT ON COLUMN public.user_devices.is_trusted IS 'Whether this device is trusted by the user';
COMMENT ON COLUMN public.user_devices.user_agent IS 'Browser/device user agent string';
COMMENT ON COLUMN public.user_devices.ip_address IS 'IP address of the device';



