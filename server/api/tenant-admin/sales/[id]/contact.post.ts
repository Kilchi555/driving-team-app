import { createError, getRouterParam, readBody, setHeader, defineEventHandler } from 'h3'
import { logAudit } from '~/server/utils/audit'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  CONTACT_CHANNELS,
  CONTACT_RESULTS,
  findSalesProspect,
  NEXT_ACTIONS,
  profileForProspect,
  SALES_STATUSES,
} from '~/server/utils/sales-intelligence'
import { resolveExplicitText, resolveStoredFollowUp } from '~/server/utils/sales-profile-update'
import {
  isMissingSalesStore,
  loadSalesProfiles,
  loadSalesProspects,
  manualIndex,
} from '~/server/utils/sales-workspace'

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const id = requireProspectId(event)
  const body = await readBody(event)
  const channel = oneOf(body?.channel, CONTACT_CHANNELS, 'channel')
  const result = oneOf(body?.result, CONTACT_RESULTS, 'result')
  const nextAction = body?.next_action ? oneOf(body.next_action, NEXT_ACTIONS, 'next_action') : null
  const salesStatus = body?.sales_status ? oneOf(body.sales_status, SALES_STATUSES, 'sales_status') : null
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
  const followUp = resolveStoredFollowUp(body, existing?.next_follow_up_at || null)
  if ('error' in followUp) throw createError({ statusCode: 400, statusMessage: 'Ungültiges Datum' })
  const status = salesStatus || existing?.sales_status || 'review_required'
  const now = new Date().toISOString()
  const actorId = authUser.db_user_id || authUser.profile?.id || null
  const currentSoftware = resolveExplicitText(body, 'current_software', existing?.current_software)
  const painPoints = resolveExplicitText(body, 'pain_points', existing?.pain_points)
  const interestedFeatures = resolveExplicitText(body, 'interested_features', existing?.interested_features)
  const objections = resolveExplicitText(body, 'objections', existing?.objections)
  const notes = resolveExplicitText(body, 'notes', existing?.notes)
  const textResult = [currentSoftware, painPoints, interestedFeatures, objections, notes].find((item) => !item.ok)
  if (textResult && !textResult.ok) throw createError({ statusCode: 400, statusMessage: textResult.message })
  if (!currentSoftware.ok || !painPoints.ok || !interestedFeatures.ok || !objections.ok || !notes.ok) {
    throw createError({ statusCode: 400, statusMessage: 'Text erwartet' })
  }
  const profilePatch = {
    sales_status: status,
    priority: prospect.priority,
    engagement_level: prospect.engagement_level,
    business_potential: prospect.business_potential,
    size_evidence_confidence: prospect.size_evidence_confidence,
    assigned_to: existing?.assigned_to || actorId,
    last_contacted_at: now,
    next_follow_up_at: followUp.value,
    last_contact_channel: channel,
    next_action: nextAction,
    contact_attempts: (existing?.contact_attempts || 0) + 1,
    conversation_outcome: result,
    current_software: currentSoftware.value,
    pain_points: painPoints.value,
    interested_features: interestedFeatures.value,
    objections: objections.value,
    notes: notes.value,
    demo_booked_at: existing?.demo_booked_at || (result === 'demo_booked' || status === 'demo_booked' ? now : null),
    demo_completed_at: existing?.demo_completed_at || (status === 'demo_completed' ? now : null),
    proposal_sent_at: existing?.proposal_sent_at || (status === 'proposal' ? now : null),
    won_at: existing?.won_at || (status === 'won' ? now : null),
    lost_at: existing?.lost_at || (status === 'lost' ? now : null),
    lost_reason: textField(body?.lost_reason, 500) ?? existing?.lost_reason ?? null,
  }
  const supabase = getSupabaseAdmin()
  const saved = existing
    ? await supabase.from('sales_pipeline_profiles').update(profilePatch).eq('id', existing.id).select('id').single()
    : await supabase.from('sales_pipeline_profiles').insert({ ...profilePatch, prospect_id: prospect.prospect_id }).select('id').single()
  if (saved.error) {
    if (isMissingSalesStore(saved.error)) {
      throw createError({ statusCode: 503, statusMessage: 'Sales-Profilspeicher ist noch nicht migriert' })
    }
    throw createError({ statusCode: 500, statusMessage: saved.error.message })
  }
  const storedProspectId = existing?.prospect_id || prospect.prospect_id
  const log = await supabase.from('sales_contact_logs').insert({
    profile_id: saved.data.id,
    prospect_id: storedProspectId,
    channel,
    result,
    notes: notes.present ? notes.value : null,
    next_follow_up_at: followUp.logged,
    next_action: nextAction,
    sales_status: status,
    created_by: actorId,
  }).select('id, created_at').single()
  if (log.error) throw createError({ statusCode: 500, statusMessage: log.error.message })
  await logAudit({
    user_id: actorId || undefined,
    auth_user_id: authUser.id,
    action: 'sales_contact_logged',
    resource_type: 'sales_pipeline_profile',
    resource_id: saved.data.id,
    status: 'success',
    details: {
      prospect_id: storedProspectId,
      channel,
      result,
      sales_status: status,
      sends: 0,
    },
    ip_address: event.node.req.socket.remoteAddress,
  }, event)
  return { success: true, sends: 0, profile_id: saved.data.id, log_id: log.data.id }
})

function requireProspectId(event: Parameters<typeof getRouterParam>[0]) {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Prospect-ID' })
  }
  return id
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw createError({ statusCode: 400, statusMessage: `Ungültiges Feld: ${field}` })
  }
  return value as T
}

function textField(value: unknown, max: number): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw createError({ statusCode: 400, statusMessage: 'Text erwartet' })
  const cleaned = value.trim()
  if (!cleaned) return null
  if (cleaned.length > max) throw createError({ statusCode: 400, statusMessage: 'Text ist zu lang' })
  return cleaned
}
