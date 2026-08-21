// GET /api/tenant-admin/sessions/lookup?email=
// Find a user and their Auth sessions. Super-admin only.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  findUsersByEmail,
  hydrateImpersonationRows,
  listAuthSessions,
  normalizeEmail,
} from '~/server/utils/session-control'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const email = normalizeEmail(getQuery(event).email)
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'E-Mail ist erforderlich' })
  }

  const supabase = getSupabaseAdmin()
  const matches = await findUsersByEmail(supabase, email)
  if (!matches.length) {
    return { users: [] }
  }

  const users = await Promise.all(matches.map(async (user) => {
    const [tenantRes, authSessions, impersonationRes, authUserRes] = await Promise.all([
      user.tenant_id
        ? supabase.from('tenants').select('id, name, slug').eq('id', user.tenant_id).maybeSingle()
        : Promise.resolve({ data: null }),
      user.auth_user_id ? listAuthSessions(supabase, user.auth_user_id) : Promise.resolve([]),
      supabase
        .from('impersonation_sessions')
        .select('*')
        .or(`actor_user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(20),
      user.auth_user_id
        ? supabase.auth.admin.getUserById(user.auth_user_id)
        : Promise.resolve({ data: { user: null } }),
    ])

    return {
      ...user,
      tenant: tenantRes.data || null,
      last_sign_in_at: authUserRes.data?.user?.last_sign_in_at || null,
      auth_sessions: authSessions,
      open_impersonations: await hydrateImpersonationRows(supabase, impersonationRes.data || []),
    }
  }))

  return { users }
})
