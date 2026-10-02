import { getQuery, setHeader, defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { filterSalesProspects, initialSprint, type SalesListQuery } from '~/server/utils/sales-intelligence'
import { loadSalesProfiles, loadSalesProspects, manualIndex } from '~/server/utils/sales-workspace'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const sprint = String(query.sprint ?? '1') !== '0'
  const listQuery: SalesListQuery = {
    sprint,
    priority: stringQuery(query.priority),
    engagement: stringQuery(query.engagement),
    evidence: stringQuery(query.evidence),
    contactability: stringQuery(query.contactability),
    salesStatus: stringQuery(query.sales_status),
    assignedTo: stringQuery(query.assigned_to),
    followUp: stringQuery(query.follow_up),
    quick: stringQuery(query.quick),
  }
  const [prospects, profiles] = await Promise.all([loadSalesProspects(), loadSalesProfiles()])
  const manual = manualIndex(profiles.rows)
  const filtered = filterSalesProspects(prospects, listQuery, manual)
  const limit = sprint ? 50 : filtered.length
  const rows = filtered.slice(0, limit).map((prospect) => ({
    ...prospect,
    sales_status: manual.get(prospect.prospect_id)?.sales_status || null,
    assigned_to: manual.get(prospect.prospect_id)?.assigned_to || null,
    last_contacted_at: manual.get(prospect.prospect_id)?.last_contacted_at || null,
    next_follow_up_at: manual.get(prospect.prospect_id)?.next_follow_up_at || null,
    last_contact_channel: manual.get(prospect.prospect_id)?.last_contact_channel || null,
    conversation_outcome: manual.get(prospect.prospect_id)?.conversation_outcome || null,
  }))
  const sprintMeta = initialSprint(prospects, 50)
  return {
    success: true,
    sends: 0,
    profile_store: profiles.available ? 'ready' : 'unavailable',
    sprint,
    sprint_total: sprintMeta.total,
    shown: rows.length,
    total: filtered.length,
    prospects: rows,
  }
})

function stringQuery(value: unknown): string | undefined {
  const text = Array.isArray(value) ? value[0] : value
  const cleaned = String(text || '').trim()
  return cleaned || undefined
}
