-- Create cron_jobs audit table
CREATE TABLE IF NOT EXISTS cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  deleted_count INTEGER,
  processed_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_cron_jobs_name ON cron_jobs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_created_at ON cron_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_status ON cron_jobs(status);

-- Enable RLS
ALTER TABLE cron_jobs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view cron job logs
CREATE POLICY "Super admin can view cron jobs"
  ON cron_jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Service role (Vercel) can insert/update cron logs
CREATE POLICY "Service role can manage cron jobs"
  ON cron_jobs
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE cron_jobs IS 'Audit log for Vercel cron job executions';
COMMENT ON COLUMN cron_jobs.job_name IS 'Name of the cron job (e.g., cleanup-booking-reservations)';
COMMENT ON COLUMN cron_jobs.status IS 'Execution status: success or failed';

