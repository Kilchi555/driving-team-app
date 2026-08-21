// GET /api/tenant-admin/sessions
// Open impersonation sessions + recent history. Super-admin only.

import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { loadImpersonationOverview } from '~/server/utils/session-control'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const supabase = getSupabaseAdmin()
  return await loadImpersonationOverview(supabase)
})
