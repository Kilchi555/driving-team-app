// server/utils/audit.ts
// Utility for audit logging to the database

import { getSupabaseAdmin } from '~/utils/supabase'

export interface AuditLogEntry {
  user_id?: string  // users.id (can be null if user not found)
  auth_user_id?: string  // auth.uid() - always available
  action: string
  resource_type?: string
  resource_id?: string
  status: 'success' | 'error' | 'started' | 'failed' | 'partial' | 'skipped'
  details?: Record<string, any>
  error_message?: string
  ip_address?: string
  tenant_id?: string
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()

    // Only try to log if we have required fields
    if (!entry.action || !entry.status) {
      console.warn('Invalid audit log entry - missing required fields:', {
        has_action: !!entry.action,
        has_status: !!entry.status
      })
      return
    }

    // For anonymous actions (e.g., public tenant branding access after logout),
    // it's OK to have neither user_id nor auth_user_id
    // We'll rely on ip_address for tracking
    const isAnonymous = !entry.user_id && !entry.auth_user_id
    if (isAnonymous && !entry.ip_address) {
      // Silently skip anonymous actions without IP tracking (security measure)
      // This is not an error, just a data quality filter
      return
    }

    // Insert to audit_logs table
    const { error, data } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id || null,
        auth_user_id: entry.auth_user_id || null,
        action: entry.action,
        resource_type: entry.resource_type || null,
        resource_id: entry.resource_id || null,
        status: entry.status,
        details: entry.details || null,
        error_message: entry.error_message || null,
        ip_address: entry.ip_address || null,
        tenant_id: entry.tenant_id || null,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log audit entry - database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
    } else {
      console.debug('Audit entry logged successfully:', entry.action, entry.status)
    }
  } catch (err: any) {
    // Don't throw - audit logging shouldn't break the main operation
    console.error('Audit logging error:', {
      message: err.message,
      code: err.code,
      stack: err.stack?.split('\n')[0]
    })
  }
}


