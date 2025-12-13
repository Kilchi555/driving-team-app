-- Create blocked_ip_addresses table for IP blocking
CREATE TABLE IF NOT EXISTS public.blocked_ip_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT,
  unblocked_at TIMESTAMPTZ,
  unblocked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS blocked_ip_addresses_ip_idx ON public.blocked_ip_addresses(ip_address);
CREATE INDEX IF NOT EXISTS blocked_ip_addresses_blocked_at_idx ON public.blocked_ip_addresses(blocked_at);
CREATE INDEX IF NOT EXISTS blocked_ip_addresses_unblocked_at_idx ON public.blocked_ip_addresses(unblocked_at);

-- Enable RLS
ALTER TABLE public.blocked_ip_addresses ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert/update
CREATE POLICY "service_role_manage_blocked_ips"
ON public.blocked_ip_addresses
FOR ALL
WITH CHECK (true); -- Service role bypasses RLS

-- Create policy for super_admin to view blocked IPs
CREATE POLICY "superadmin_view_blocked_ips"
ON public.blocked_ip_addresses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Comment for documentation
COMMENT ON TABLE public.blocked_ip_addresses IS 'Tracks IP addresses that have been blocked due to brute force or suspicious activity';
COMMENT ON COLUMN public.blocked_ip_addresses.ip_address IS 'IPv4 or IPv6 address that is blocked';
COMMENT ON COLUMN public.blocked_ip_addresses.reason IS 'Reason for blocking (e.g., brute force detection)';
COMMENT ON COLUMN public.blocked_ip_addresses.unblocked_at IS 'When the IP was unblocked (null if still blocked)';

