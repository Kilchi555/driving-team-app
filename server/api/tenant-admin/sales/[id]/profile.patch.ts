import { createError, getRouterParam, readBody, setHeader, defineEventHandler } from 'h3'
import { logAudit } from '~/server/utils/audit'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SALES_STATUSES } from '~/server/utils/sales-intelligence'
import { isMissingSalesStore, loadSalesProfiles, loadSalesProspects } from '~/server/utils/sales-workspace'

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Prospect-ID' })
  }
  const body = await readBody(event)
  const prospects = await loadSalesProspects()
  const prospect = prospects.find((row) => row.prospect_id === id)
  if (!prospect) throw createError({ statusCode: 404, statusMessage: 'Prospect nicht gefunden' })
  if (!prospect.eligible) {
    throw createError({ statusCode: 409, statusMessage: prospect.contactability_label })
  }
  const profiles = await loadSalesProfiles()
  if (!profiles.available) {
    throw createError({ statusCode: 503, statusMessage: 'Sales-Profilspeicher ist noch nicht migriert' })
  }
  const existing = profiles.rows.find((row) => row.prospect_id === id) || null
  const status = body?.sales_status
    ? oneOf(body.sales_status, SALES_STATUSES, 'sales_status')
    : existing?.sales_status || 'review_required'
  const now = new Date().toISOString()
  const actorId = authUser.db_user_id || authUser.profile?.id || null
  const assignedTo = body?.assigned_to
    ? uuidField(body.assigned_to)
    : existing?.assigned_to || actorId
  const patch = {
    prospect_id: id,
    sales_status: status,
    priority: prospect.priority,
    engagement_level: prospect.engagement_level,
    business_potential: prospect.business_potential,
    size_evidence_confidence: prospect.size_evidence_confidence,
    assigned_to: assignedTo,
    current_software: textField(body?.current_software, 500),
    pain_points: textField(body?.pain_points, 2000),
    interested_features: textField(body?.interested_features, 2000),
    objections: textField(body?.objections, 2000),
    notes: textField(body?.notes, 4000),
    lost_reason: textField(body?.lost_reason, 500),
    demo_booked_at: existing?.demo_booked_at || (status === 'demo_booked' ? now : null),
    demo_completed_at: existing?.demo_completed_at || (status === 'demo_completed' ? now : null),
    proposal_sent_at: existing?.proposal_sent_at || (status === 'proposal' ? now : null),
    won_at: existing?.won_at || (status === 'won' ? now : null),
    lost_at: existing?.lost_at || (status === 'lost' ? now : null),
  }
  const supabase = getSupabaseAdmin()
  const saved = existing
    ? await supabase.from('sales_pipeline_profiles').update(patch).eq('id', existing.id).select('id').single()
    : await supabase.from('sales_pipeline_profiles').insert({ ...patch, contact_attempts: 0 }).select('id').single()
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
    details: { prospect_id: id, sales_status: status, sends: 0 },
    ip_address: event.node.req.socket.remoteAddress,
  }, event)
  return { success: true, sends: 0, profile_id: saved.data.id }
})

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw createError({ statusCode: 400, statusMessage: `Ungültiges Feld: ${field}` })
  }
  return value as T
}

function uuidField(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Zuordnung' })
  }
  return value
}

function textField(value: unknown, max: number): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw createError({ statusCode: 400, statusMessage: 'Text erwartet' })
  const cleaned = value.trim()
  if (!cleaned) return null
  if (cleaned.length > max) throw createError({ statusCode: 400, statusMessage: 'Text ist zu lang' })
  return cleaned
}
