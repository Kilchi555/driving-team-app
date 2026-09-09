import { assertCronRequest } from '~/server/utils/cron-auth'

/**
 * Verify that request is from Vercel Cron.
 * Fail-closed via assertCronRequest (Bearer CRON_SECRET required).
 */
export function verifyCronToken(event: any): boolean {
  try {
    assertCronRequest(event)
    return true
  } catch {
    return false
  }
}

/**
 * Check if cron job ran recently to prevent spam
 */
export async function checkCronRateLimit(
  supabaseAdmin: any,
  jobName: string,
  minSecondsBetweenRuns: number = 30
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('cron_jobs')
      .select('completed_at')
      .eq('job_name', jobName)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) {
      // No previous run, allow it
      return true
    }
    
    const lastRun = new Date(data.completed_at).getTime()
    const now = new Date().getTime()
    const secondsSinceLastRun = (now - lastRun) / 1000
    
    if (secondsSinceLastRun < minSecondsBetweenRuns) {
      console.warn(`⚠️ Rate limited: ${jobName} ran ${secondsSinceLastRun}s ago`)
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking rate limit:', error)
    // Allow if we can't check
    return true
  }
}

/**
 * Log cron job execution to audit table
 */
export async function logCronExecution(
  supabaseAdmin: any,
  jobName: string,
  status: 'success' | 'failed',
  data: {
    deletedCount?: number
    processedCount?: number
    errorMessage?: string
    startedAt: Date
    completedAt: Date
  }
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('cron_jobs')
      .insert({
        job_name: jobName,
        started_at: data.startedAt.toISOString(),
        completed_at: data.completedAt.toISOString(),
        status,
        deleted_count: data.deletedCount || null,
        processed_count: data.processedCount || null,
        error_message: data.errorMessage || null,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('❌ Error logging cron execution:', error)
    }
  } catch (error) {
    console.error('❌ Unexpected error logging cron:', error)
  }
}

