# Cron API Security - Deployment Checklist

**Status:** Ready for production deployment  
**Target:** Vercel + Supabase production

---

## Pre-Deployment Steps

### 1. Local Testing ✅
- [x] All Cron APIs upgraded with 7-layer security
- [x] Testing scripts created (bash + TypeScript)
- [x] Code committed locally

### 2. Database Migration

Run this in Supabase SQL Editor to create the `cron_jobs` table:

```sql
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
```

### 3. Generate & Configure CRON_SECRET

**Generate secure token:**
```bash
openssl rand -base64 32
# Output example: aBcD1234efGH5678ijKL9012mnOP3456qrST7890uvWX==
```

**In Vercel Dashboard:**
1. Go to: Project Settings → Environment Variables
2. Add new variable:
   - Name: `CRON_SECRET`
   - Value: `aBcD1234efGH5678ijKL9012mnOP3456qrST7890uvWX==`
   - Select: Production, Preview, Development

**Verify in Vercel:**
```bash
vercel env pull
# Should show CRON_SECRET in .env.local
```

---

## Deployment Steps

### Step 1: Push to GitHub
```bash
cd /Users/pascalkilchenmann/driving-team-app
git status  # Verify all changes committed
git push origin main
```

Expected output:
```
✅ 4 commits pushed
✅ vercel.json updated with cron routes
✅ All tests scripts included
```

### Step 2: Vercel Auto-Deployment
- Vercel should automatically detect push
- Check: https://vercel.com/pascalkilchenmann/driving-team-app/deployments
- Wait for build to complete (usually 2-3 minutes)

### Step 3: Run Database Migration

In Supabase Dashboard → SQL Editor:

1. Create new query
2. Copy & paste the migration SQL above
3. Execute query
4. Verify success: Check in `cron_jobs` table schema

### Step 4: Verify CRON_SECRET

In Vercel Cron Dashboard:

1. Go to: Project → Cron Jobs
2. Should show 4 jobs:
   - ✅ cleanup-booking-reservations (every minute)
   - ✅ cleanup-expired-reservations (every hour)
   - ✅ process-automatic-payments (every 5 minutes)
   - ✅ sync-sari-courses (every 4 hours)

3. Check if `Authorization: Bearer {CRON_SECRET}` is being sent

### Step 5: Monitor First Runs

After deployment, cron jobs will start automatically:

**Check in Supabase:**
```sql
SELECT job_name, status, COUNT(*) as runs
FROM cron_jobs
WHERE created_at > NOW() - INTERVAL '30 minutes'
GROUP BY job_name, status;
```

**Expected for first run:**
- Status: `success` (green checkmark)
- Runs: 1 per job (or more if scheduler called them multiple times)
- No `error_message` values

---

## Post-Deployment Verification

### 1. Check Cron Execution Logs
```sql
-- Last 10 executions of all cron jobs
SELECT 
  job_name,
  status,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_sec,
  COALESCE(deleted_count, processed_count, 0) as count,
  error_message
FROM cron_jobs
ORDER BY created_at DESC
LIMIT 10;
```

### 2. Check for Failures
```sql
-- Alert: Any failed executions
SELECT job_name, COUNT(*) as recent_failures
FROM cron_jobs
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_name;
```

### 3. Performance Check
```sql
-- Average duration by job
SELECT 
  job_name,
  COUNT(*) as runs,
  ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::numeric, 2) as avg_duration_sec,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_duration_sec
FROM cron_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_name;
```

### 4. Verify Authentication
```sql
-- Check if any requests came without Authorization header
-- (These would appear as failed in the logs with 401 status)
SELECT job_name, error_message, COUNT(*) as count
FROM cron_jobs
WHERE error_message LIKE '%401%' OR error_message LIKE '%Unauthorized%'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_name, error_message;
```

---

## Rollback Plan (if needed)

### If Cron Jobs Break Production

**Option 1: Disable in vercel.json (Quick)**
```json
// In vercel.json, remove or comment out problematic cron
{
  "crons": [
    // Temporarily disabled:
    // {
    //   "path": "/api/cron/process-automatic-payments",
    //   "schedule": "*/5 * * * *"
    // }
  ]
}
```

Then: `git push origin main` (auto-redeploys)

**Option 2: Full Rollback (Safe)**
```bash
git revert <commit-hash>  # Revert the cron security commits
git push origin main
# Vercel auto-redeploys with old code
```

**Option 3: Edit Environment Variable (Emergency)**
If CRON_SECRET is wrong:
1. Go to Vercel → Settings → Environment Variables
2. Update `CRON_SECRET` value
3. Redeploy: `git push --force` or click "Redeploy"

---

## Troubleshooting

### Issue: "401 Unauthorized" in cron logs

**Cause:** CRON_SECRET not set or wrong value

**Fix:**
```bash
# 1. Verify in Vercel
vercel env pull

# 2. Check if CRON_SECRET is in .env
cat .env | grep CRON_SECRET

# 3. Regenerate if needed
openssl rand -base64 32

# 4. Update in Vercel Dashboard
# 5. Redeploy: git push origin main
```

### Issue: Cron jobs not running at all

**Cause:** vercel.json syntax error or cron path wrong

**Fix:**
```bash
# 1. Validate JSON
cat vercel.json | jq .

# 2. Check if paths exist
ls server/api/cron/cleanup-booking-reservations.post.ts
ls server/api/cron/process-automatic-payments.post.ts

# 3. Check Vercel logs
# Go to: Deployments → Cron Executions tab
```

### Issue: "Rate limited: ran too recently"

**Cause:** Cron triggered multiple times within 30 seconds (normal!)

**Fix:** No fix needed - this is by design. The 30-second rate limit prevents:
- Accidental double-triggers
- DDoS attacks
- Resource exhaustion

Rate-limited runs log `success` with `error_message: 'Skipped due to rate limit'`

### Issue: Database connection errors in cron logs

**Cause:** Supabase connection pool exhausted or network issue

**Fix:**
```sql
-- Check if cron_jobs table is accessible
SELECT COUNT(*) FROM cron_jobs;

-- If table doesn't exist, run migration again
-- (See "Step 3: Run Database Migration" above)
```

---

## Monitoring & Alerts (Optional)

### Set Up Slack Alerts for Failures

1. Create Slack webhook URL
2. Add to Vercel environment: `SLACK_WEBHOOK_URL`
3. Modify cron error logging to send to Slack

```typescript
// In each cron API, after catching errors:
if (process.env.SLACK_WEBHOOK_URL) {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `❌ Cron failed: ${jobName}\nError: ${error.message}`
    })
  })
}
```

---

## Success Criteria

After deployment, verify:

- [ ] `cron_jobs` table exists in Supabase
- [ ] All 4 cron jobs appear in Vercel Cron Dashboard
- [ ] First execution logs appear in `cron_jobs` table
- [ ] No `401 Unauthorized` errors
- [ ] No `error_message` values in logs (unless legitimate DB errors)
- [ ] Performance metrics reasonable (< 5s for most jobs)
- [ ] Repeat runs don't increase numbers (rate limiting works)

---

## Timeline

- Deploy to Vercel: Immediate (git push)
- First cron runs: Within 1 minute
- Database populated: Immediately after first successful run
- Verification complete: 5-10 minutes

---

## Contact & Support

If deployment fails:

1. Check Vercel Deployment Logs
2. Verify CRON_SECRET is set in Vercel
3. Check Supabase SQL Editor for connection errors
4. Review `CRON_API_SECURITY_COMPLETE.md` for detailed info


