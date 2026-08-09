import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  DEFAULT_DASHBOARD_LAYOUT,
  normalizeDashboardLayout,
} from '~/utils/admin-dashboard-widgets'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)

  // reset → defaults
  if (body?.reset === true) {
    const { data: row } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', profile.id)
      .single()

    const meta = { ...((row?.metadata && typeof row.metadata === 'object') ? row.metadata : {}) } as Record<string, any>
    delete meta.dashboard_layout

    const { error } = await supabase
      .from('users')
      .update({ metadata: meta })
      .eq('id', profile.id)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    return { success: true, widgets: DEFAULT_DASHBOARD_LAYOUT, isCustom: false }
  }

  // Empty array = hide all customizable widgets (allowed)
  const widgets = normalizeDashboardLayout(body?.widgets, { fillMissingDefaults: false })

  const { data: row, error: readError } = await supabase
    .from('users')
    .select('metadata')
    .eq('id', profile.id)
    .single()

  if (readError) throw createError({ statusCode: 500, statusMessage: readError.message })

  const meta = {
    ...((row?.metadata && typeof row.metadata === 'object') ? row.metadata : {}),
    dashboard_layout: {
      version: 1,
      widgets,
      updated_at: new Date().toISOString(),
    },
  }

  const { error } = await supabase
    .from('users')
    .update({ metadata: meta })
    .eq('id', profile.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, widgets, isCustom: true }
})
