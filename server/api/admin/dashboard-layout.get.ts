import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  DEFAULT_DASHBOARD_LAYOUT,
  normalizeDashboardLayout,
} from '~/utils/admin-dashboard-widgets'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('users')
    .select('metadata')
    .eq('id', profile.id)
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const meta = (data?.metadata && typeof data.metadata === 'object') ? data.metadata as Record<string, any> : {}
  const saved = meta.dashboard_layout?.widgets
  const widgets = normalizeDashboardLayout(saved, { fillMissingDefaults: !Array.isArray(saved) })

  return {
    success: true,
    widgets,
    isCustom: Array.isArray(saved),
    defaultWidgets: DEFAULT_DASHBOARD_LAYOUT,
  }
})
