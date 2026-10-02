import { setHeader, defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { initialSprint } from '~/server/utils/sales-intelligence'
import { loadSalesProfiles, loadSalesProspects } from '~/server/utils/sales-workspace'

const RANK: Record<string, number> = {
  new: 0,
  review_required: 0,
  contact_1: 1,
  contacted: 1,
  conversation: 2,
  demo_booked: 3,
  demo_completed: 3,
  proposal: 4,
  won: 5,
}

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const [prospects, profiles] = await Promise.all([loadSalesProspects(), loadSalesProfiles()])
  const sprint = initialSprint(prospects, 50)
  const today = new Date().toISOString().slice(0, 10)
  const ranked = profiles.rows.map((row) => RANK[row.sales_status] ?? -1)
  const contacted = ranked.filter((rank) => rank >= 1).length
  const conversations = ranked.filter((rank) => rank >= 2).length
  const demos = ranked.filter((rank) => rank >= 3).length
  const proposals = ranked.filter((rank) => rank >= 4).length
  const won = ranked.filter((rank) => rank === 5).length
  const lost = profiles.rows.filter((row) => row.sales_status === 'lost').length
  const followupsToday = profiles.rows.filter((row) => row.next_follow_up_at && row.next_follow_up_at.slice(0, 10) <= today).length
  const rate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null)
  return {
    success: true,
    sends: 0,
    profile_store: profiles.available ? 'ready' : 'unavailable',
    basis: 'Aktuelle manuell gesetzte Status. Kein Branchenbenchmark.',
    counts: {
      eligible: prospects.filter((row) => row.eligible).length,
      sprint: sprint.total,
      sprint_visible: sprint.rows.length,
      profiles: profiles.rows.length,
      contacted,
      conversations,
      demos,
      proposals,
      won,
      lost,
      followups_today: followupsToday,
    },
    rates: {
      conversation_to_demo: rate(demos, conversations),
      demo_to_proposal: rate(proposals, demos),
      proposal_to_won: rate(won, proposals),
    },
  }
})
