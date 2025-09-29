-- Create SMS logs table for tracking sent messages
-- Run this directly in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  twilio_sid VARCHAR(100),
  status VARCHAR(20),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_to_phone ON sms_logs(to_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_twilio_sid ON sms_logs(twilio_sid);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view SMS logs
CREATE POLICY "Users can view SMS logs" ON sms_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for service role to insert SMS logs
CREATE POLICY "Service role can insert SMS logs" ON sms_logs
  FOR INSERT WITH CHECK (true);
