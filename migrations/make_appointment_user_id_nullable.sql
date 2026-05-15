-- Allow appointments without a student (e.g. vacation, meetings, admin blocks)
ALTER TABLE public.appointments ALTER COLUMN user_id DROP NOT NULL;
