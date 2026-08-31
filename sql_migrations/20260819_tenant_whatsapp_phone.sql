ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

COMMENT ON COLUMN tenants.whatsapp_phone IS
  'Mobile number registered in WhatsApp. Used for wa.me links; contact_phone stays the public call number.';
