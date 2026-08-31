// POST /api/tenant-admin/sessions/end-impersonation
// Marks an impersonation row as ended. Does not evict the browser session.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { actorDbUserId, isUuid } from '~/server/utils/session-control'

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)
  const body = await readBody(event)
  const id = body?.id

  if (!isUuid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Session-ID' })
  }

  const supabase = getSupabaseAdmin()
  const { data: row, error: loadErr } = await supabase
    .from('impersonation_sessions')
    .select('id, tenant_id, actor_user_id, target_user_id, ended_at, switch_type')
    .eq('id', id)
    .maybeSingle()

  if (loadErr) {
    throw createError({ statusCode: 500, statusMessage: loadErr.message })
  }
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Session nicht gefunden' })
  }
  if (row.ended_at) {
    return { ok: true, alreadyEnded: true }
  }

  const { error } = await supabase
    .from('impersonation_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id)
    .is('ended_at', null)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  await logAudit({
    user_id: actorDbUserId(authUser as any) || undefined,
    auth_user_id: (authUser as any).id,
    action: 'end_impersonation_session',
    resource_type: 'impersonation_session',
    resource_id: id,
    status: 'success',
    tenant_id: row.tenant_id,
    ip_address: getClientIP(event),
    details: {
      actor_user_id: row.actor_user_id,
      target_user_id: row.target_user_id,
      switch_type: row.switch_type,
    },
  }, event)

  return { ok: true, alreadyEnded: false }
})
