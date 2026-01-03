// server/utils/audit.ts
// Utility for audit logging to the database

import { getSupabase } from '~/utils/supabase'

export interface AuditLogEntry {
  user_id: string
  action: string
  resource_type?: string
  resource_id?: string
  status: 'success' | 'error' | 'started' | 'failed' | 'partial' | 'skipped'
  details?: Record<string, any>
  error_message?: string
  ip_address?: string
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getSupabase()

    // Only try to log if we have required fields
    if (!entry.user_id || !entry.action || !entry.status) {
      console.warn('Invalid audit log entry:', entry)
      return
    }

    // Insert to audit_logs table
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type || null,
        resource_id: entry.resource_id || null,
        status: entry.status,
        details: entry.details || null,
        error_message: entry.error_message || null,
        ip_address: entry.ip_address || null,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Failed to log audit entry:', error)
    }
  } catch (err) {
    // Don't throw - audit logging shouldn't break the main operation
    console.error('Audit logging error:', err)
  }
}

