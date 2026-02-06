-- Restore SARI columns as fallback for legacy data
-- This is for backward compatibility during migration to tenant_secrets table

-- Check if columns still exist, if not recreate them
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS sari_client_id TEXT,
ADD COLUMN IF NOT EXISTS sari_client_secret TEXT,
ADD COLUMN IF NOT EXISTS sari_username TEXT,
ADD COLUMN IF NOT EXISTS sari_password TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_sari_client_id ON public.tenants(sari_client_id) WHERE sari_client_id IS NOT NULL;

-- Comment on columns to indicate they're for fallback only
COMMENT ON COLUMN public.tenants.sari_client_id IS '[FALLBACK ONLY] Use tenant_secrets table for new data. This column kept for backward compatibility.';
COMMENT ON COLUMN public.tenants.sari_client_secret IS '[FALLBACK ONLY] Use tenant_secrets table for new data. This column kept for backward compatibility.';
COMMENT ON COLUMN public.tenants.sari_username IS '[FALLBACK ONLY] Use tenant_secrets table for new data. This column kept for backward compatibility.';
COMMENT ON COLUMN public.tenants.sari_password IS '[FALLBACK ONLY] Use tenant_secrets table for new data. This column kept for backward compatibility.';
