import { defineEventHandler, readBody, createError } from 'h3'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { phone, tenantId } = body

    if (!phone || !tenantId) {
      throw createError({ statusCode: 400, statusMessage: 'phone und tenantId erforderlich' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return { exists: false, isPending: false }
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Normalize phone to multiple possible formats for flexible matching
    const normalized = phone.trim()
    const withoutPlus = normalized.startsWith('+') ? normalized.slice(1) : normalized
    const withLeadingZero = normalized.startsWith('+41')
      ? '0' + normalized.slice(3)
      : normalized.startsWith('41')
        ? '0' + normalized.slice(2)
        : normalized

    // Check ALL roles (client, staff, admin, tenant_admin) — no role filter
    const { data: users, error } = await supabase
      .from('users')
      .select('id, auth_user_id, first_name, onboarding_token, role')
      .eq('tenant_id', tenantId)
      .or(`phone.eq.${normalized},phone.eq.+${withoutPlus},phone.eq.${withLeadingZero}`)

    if (error) {
      logger.warn('check-phone-exists DB error:', error)
      return { exists: false, isPending: false }
    }

    if (!users || users.length === 0) {
      return { exists: false, isPending: false }
    }

    const user = users[0]

    // Pending = client role, no auth_user_id, has onboarding token
    const isPending = user.role === 'client' && !user.auth_user_id && !!user.onboarding_token
    // Active = has auth_user_id (any role)
    const isActive = !!user.auth_user_id
    // Staff/admin = non-client role
    const isStaffOrAdmin = ['staff', 'admin', 'tenant_admin', 'superadmin'].includes(user.role)

    return {
      exists: true,
      isPending,
      isActive,
      isStaffOrAdmin,
      firstName: user.first_name || null,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Prüfen der Telefonnummer' })
  }
})
