import { createError, getRouterParam, readBody, setHeader, defineEventHandler } from 'h3'
import { logAudit } from '~/server/utils/audit'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { findSalesProspect, profileForProspect } from '~/server/utils/sales-intelligence'
import { buildProfileWrite } from '~/server/utils/sales-profile-update'
import { isMissingSalesStore, loadSalesProfiles, loadSalesProspects, manualIndex } from '~/server/utils/sales-workspace'

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Prospect-ID' })
  }
  const body = await readBody(event)
  const prospects = await loadSalesProspects()
  const prospect = findSalesProspect(prospects, id)
  if (!prospect) throw createError({ statusCode: 404, statusMessage: 'Prospect nicht gefunden' })
  if (!prospect.eligible) {
    throw createError({ statusCode: 409, statusMessage: prospect.contactability_label })
  }
  const profiles = await loadSalesProfiles()
  if (!profiles.available) {
    throw createError({ statusCode: 503, statusMessage: 'Sales-Profilspeicher ist noch nicht migriert' })
  }
  const existing = profileForProspect(prospect, manualIndex(profiles.rows))
  const now = new Date().toISOString()
  const actorId = authUser.db_user_id || authUser.profile?.id || null
  const write = buildProfileWrite({
    body,
    existing,
    now,
    fallbackAssignee: actorId,
  })
  if (!write.ok) throw createError({ statusCode: 400, statusMessage: write.message })
  if (existing && Object.keys(write.fields).length === 0) {
    return { success: true, sends: 0, profile_id: existing.id }
  }
  const supabase = getSupabaseAdmin()
  const saved = existing
    ? await supabase.from('sales_pipeline_profiles').update(write.fields).eq('id', existing.id).select('id').single()
    : await supabase.from('sales_pipeline_profiles').insert({
      prospect_id: prospect.prospect_id,
      contact_attempts: 0,
      priority: prospect.priority,
      engagement_level: prospect.engagement_level,
      business_potential: prospect.business_potential,
      size_evidence_confidence: prospect.size_evidence_confidence,
      ...write.fields,
    }).select('id').single()
  if (saved.error) {
    if (isMissingSalesStore(saved.error)) {
      throw createError({ statusCode: 503, statusMessage: 'Sales-Profilspeicher ist noch nicht migriert' })
    }
    throw createError({ statusCode: 500, statusMessage: saved.error.message })
  }
  await logAudit({
    user_id: actorId || undefined,
    auth_user_id: authUser.id,
    action: 'sales_profile_updated',
    resource_type: 'sales_pipeline_profile',
    resource_id: saved.data.id,
    status: 'success',
    details: { prospect_id: existing?.prospect_id || prospect.prospect_id, sales_status: write.salesStatus, sends: 0 },
    ip_address: event.node.req.socket.remoteAddress,
  }, event)
  return { success: true, sends: 0, profile_id: saved.data.id }
})

