import { setHeader, defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { primaryGroupedPhone, profileForProspect } from '~/server/utils/sales-intelligence'
import { loadSalesProfiles, loadSalesProspects, manualIndex } from '~/server/utils/sales-workspace'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const [prospects, profiles] = await Promise.all([loadSalesProspects(), loadSalesProfiles()])
  const manual = manualIndex(profiles.rows)
  const today = new Date().toISOString().slice(0, 10)
  const rows = prospects
    .map((prospect) => {
      const profile = profileForProspect(prospect, manual)
      return { prospect, profile }
    })
    .filter((row) => row.profile?.next_follow_up_at)
    .map((row) => {
      const due = row.profile!.next_follow_up_at!.slice(0, 10)
      const bucket = due < today ? 'overdue' : due === today ? 'today' : 'upcoming'
      return {
        prospect_id: row.prospect.prospect_id,
        name: row.prospect.name,
        person: row.prospect.person,
        phone: primaryGroupedPhone(row.prospect.phone, row.prospect.additional_phones),
        contactability: row.prospect.contactability,
        contactability_label: row.prospect.contactability_label,
        last_contacted_at: row.profile!.last_contacted_at,
        last_result: row.profile!.conversation_outcome,
        next_action: row.profile!.next_action,
        next_follow_up_at: row.profile!.next_follow_up_at,
        notes: row.profile!.notes,
        bucket,
      }
    })
    .sort((a, b) => {
      const rank = { overdue: 0, today: 1, upcoming: 2 }
      const bucket = rank[a.bucket as keyof typeof rank] - rank[b.bucket as keyof typeof rank]
      if (bucket) return bucket
      return (a.next_follow_up_at || '').localeCompare(b.next_follow_up_at || '')
    })
  return {
    success: true,
    sends: 0,
    profile_store: profiles.available ? 'ready' : 'unavailable',
    follow_ups: rows,
  }
})
