import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  component: string
  message: string
  data?: any
  timestamp: string
  url?: string
  userAgent?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<LogEntry>(event)

    // Only accept error-level logs for server storage
    if (body.level !== 'error') {
      return { success: true, skipped: true }
    }

    // Get user/tenant from request headers (set by client, optional)
    const userId: string | null = (event.node.req.headers['x-user-id'] as string) || null
    const tenantId = (event.node.req.headers['x-tenant-id'] as string) || null

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Insert log entry
    const { error } = await supabase.from('error_logs').insert({
      level: body.level,
      component: body.component,
      message: body.message,
      data: body.data,
      url: body.url,
      user_agent: body.userAgent,
      user_id: userId, // Can be null if user not logged in
      tenant_id: tenantId,
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Failed to save log to Supabase:', error)
      // Don't throw - just return success to prevent cascading errors
      return { success: true, warning: 'Failed to persist log' }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in logs/save endpoint:', err)
    // Return success even on error to prevent cascading failures
    return { success: true, error: (err as Error).message }
  }
})
