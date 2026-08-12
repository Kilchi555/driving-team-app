// POST /api/push/send
// Admin/staff test + manual push to a single app user (public.users.id).

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendPushToUser } from '~/server/utils/push'

export default defineEventHandler(async (event) => {
  const actor = await requireAdminProfile(event, ['admin', 'super_admin', 'staff'])

  const body = await readBody(event) as {
    userId?: string
    title?: string
    body?: string
    path?: string
  }

  if (!body.userId || !body.body) {
    throw createError({ statusCode: 400, statusMessage: 'userId und body sind erforderlich' })
  }

  const admin = getSupabaseAdmin()

  // Tenant isolation for non-super-admins
  if (actor.role !== 'super_admin') {
    const { data: target } = await admin
      .from('users')
      .select('id, tenant_id')
      .eq('id', body.userId)
      .maybeSingle()
    if (!target || target.tenant_id !== actor.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User gehört nicht zu deinem Tenant' })
    }
  }

  const result = await sendPushToUser(body.userId, {
    title: body.title || 'Simy',
    body: body.body,
    data: { path: body.path || '/customer-dashboard' },
  })

  return {
    success: true,
    ...result,
  }
})
