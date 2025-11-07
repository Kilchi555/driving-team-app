-- add_payment_scheduled_authorization.sql
-- Adds a column to schedule the earliest authorization (pre-auth) time before an appointment

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS scheduled_authorization_date TIMESTAMP WITH TIME ZONE NULL;
