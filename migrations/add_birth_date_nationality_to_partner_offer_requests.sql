-- Add birth_date and nationality to partner_offer_requests
ALTER TABLE partner_offer_requests
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS nationality text;
