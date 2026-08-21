// POST /api/tenant-admin/sessions/revoke
// Revoke one or all Auth sessions for a user. Super-admin only.
// Kicks refresh tokens; access JWTs stay valid until expiry.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import {
  actorDbUserId,
  closeOpenImpersonationsForUser,
  isUuid,
  listAuthSessions,
  normalizeEmail,
  revokeAuthSessions,
} from '~/server/utils/session-control'

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)
  const body = await readBody(event)
  const email = normalizeEmail(body?.email)
  const userId = body?.userId
  const confirm = body?.confirm === true
  const sessionId = body?.sessionId ? String(body.sessionId) : null

  if (!isUuid(userId)) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzer-ID ist erforderlich' })
  }
  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'E-Mail ist erforderlich' })
  }
  if (!confirm) {
    throw createError({ statusCode: 400, statusMessage: 'Bestätigung erforderlich' })
  }
  if (sessionId && !isUuid(sessionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Session-ID' })
  }

  const supabase = getSupabaseAdmin()
  const { data: target, error: userErr } = await supabase
    .from('users')
    .select('id, email, role, auth_user_id, tenant_id, first_name, last_name')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle()

  if (userErr) {
    throw createError({ statusCode: 500, statusMessage: userErr.message })
  }
  if (!target?.auth_user_id) {
    throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden oder ohne Auth-Konto' })
  }
  if (normalizeEmail(target.email) !== email) {
    throw createError({ statusCode: 400, statusMessage: 'E-Mail stimmt nicht mit diesem Benutzer überein' })
  }
  if (target.auth_user_id === (authUser as any).id) {
    throw createError({ statusCode: 400, statusMessage: 'Eigene Sessions können hier nicht widerrufen werden' })
  }

  const before = sessionId ? 1 : (await listAuthSessions(supabase, target.auth_user_id)).length
  const revoked = await revokeAuthSessions(supabase, target.auth_user_id, sessionId)

  if (!sessionId) {
    await closeOpenImpersonationsForUser(supabase, target.id)
  }

  await logAudit({
    user_id: actorDbUserId(authUser as any) || undefined,
    auth_user_id: (authUser as any).id,
    action: sessionId ? 'revoke_auth_session' : 'revoke_auth_sessions',
    resource_type: 'user',
    resource_id: target.id,
    status: 'success',
    tenant_id: target.tenant_id || undefined,
    ip_address: getClientIP(event),
    details: {
      target_email: target.email,
      target_role: target.role,
      session_id: sessionId,
      revoked,
      sessions_before: before,
    },
  }, event)

  return {
    ok: true,
    revoked,
    scope: sessionId ? 'one' : 'all',
    user: {
      id: target.id,
      email: target.email,
      role: target.role,
    },
  }
})
