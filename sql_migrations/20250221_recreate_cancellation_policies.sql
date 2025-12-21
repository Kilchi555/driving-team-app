-- Recreate cancellation policies that were deleted
-- Run this in Supabase SQL Editor

-- First, let's check if the tables exist
SELECT tablename FROM pg_tables WHERE tablename IN ('cancellation_policies', 'cancellation_rules');

-- If the tables don't exist, create them
CREATE TABLE IF NOT EXISTS public.cancellation_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cancellation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES public.cancellation_policies(id) ON DELETE CASCADE,
  hours_before_appointment INTEGER NOT NULL,
  charge_percentage INTEGER NOT NULL,
  refund_percentage INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_tenant_id ON public.cancellation_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_is_active ON public.cancellation_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_cancellation_rules_policy_id ON public.cancellation_rules(policy_id);

-- Enable RLS
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "cancellation_policies_select" ON public.cancellation_policies
FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "cancellation_policies_insert" ON public.cancellation_policies
FOR INSERT WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM users 
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'staff') AND is_active = true
  )
);

CREATE POLICY "cancellation_rules_select" ON public.cancellation_rules
FOR SELECT USING (
  policy_id IN (
    SELECT id FROM cancellation_policies
    WHERE tenant_id IN (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid() AND is_active = true
    )
  )
);

-- Now create the default policies for each tenant
INSERT INTO public.cancellation_policies (tenant_id, name, description, is_active, is_default)
SELECT 
  id,
  'Standard Stornierungsrichtlinie',
  'Kostenlose Stornierung bis 24h vorher, danach volle Gebühr',
  true,
  true
FROM public.tenants
WHERE NOT EXISTS (
  SELECT 1 FROM public.cancellation_policies cp
  WHERE cp.tenant_id = tenants.id
)
ON CONFLICT DO NOTHING;

-- Create the rules for each policy
INSERT INTO public.cancellation_rules (policy_id, hours_before_appointment, charge_percentage, refund_percentage)
SELECT 
  cp.id,
  24,
  0,
  100
FROM public.cancellation_policies cp
WHERE NOT EXISTS (
  SELECT 1 FROM public.cancellation_rules cr
  WHERE cr.policy_id = cp.id AND cr.charge_percentage = 0
)
ON CONFLICT DO NOTHING;

-- Insert the charged rule (less than 24h before)
INSERT INTO public.cancellation_rules (policy_id, hours_before_appointment, charge_percentage, refund_percentage)
SELECT 
  cp.id,
  0,
  100,
  0
FROM public.cancellation_policies cp
WHERE NOT EXISTS (
  SELECT 1 FROM public.cancellation_rules cr
  WHERE cr.policy_id = cp.id AND cr.hours_before_appointment = 0
)
ON CONFLICT DO NOTHING;

-- Verify it worked
SELECT cp.*, array_agg(json_build_object('hours', cr.hours_before_appointment, 'charge', cr.charge_percentage)) as rules
FROM public.cancellation_policies cp
LEFT JOIN public.cancellation_rules cr ON cp.id = cr.policy_id
GROUP BY cp.id;

