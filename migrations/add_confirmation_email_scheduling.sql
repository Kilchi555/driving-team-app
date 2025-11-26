-- Add confirmation_email_scheduled_for to appointments
-- This field tracks when the confirmation email should be sent (5 minutes after creation)

ALTER TABLE "public"."appointments"
ADD COLUMN "confirmation_email_scheduled_for" timestamp with time zone DEFAULT NULL,
ADD COLUMN "confirmation_email_sent" boolean DEFAULT false;

-- Create index for the cron job to find appointments needing emails
CREATE INDEX idx_appointments_confirmation_email_scheduled
ON "public"."appointments"("confirmation_email_scheduled_for")
WHERE confirmation_email_sent = false AND confirmation_email_scheduled_for IS NOT NULL;

