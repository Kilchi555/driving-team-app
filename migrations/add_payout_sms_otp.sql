-- Add SMS OTP columns to affiliate_payout_requests for 2-factor payout confirmation
ALTER TABLE affiliate_payout_requests
  ADD COLUMN IF NOT EXISTS sms_otp         VARCHAR(6),
  ADD COLUMN IF NOT EXISTS sms_otp_expires_at TIMESTAMPTZ;

-- pending_sms = waiting for SMS confirmation by partner
-- pending     = confirmed, waiting for admin approval
-- (existing: approved, paid, rejected)
COMMENT ON COLUMN affiliate_payout_requests.sms_otp IS '6-digit OTP sent via SMS to confirm payout request';
COMMENT ON COLUMN affiliate_payout_requests.sms_otp_expires_at IS 'OTP expiry (10 minutes)';
