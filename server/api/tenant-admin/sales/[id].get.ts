import { createError, getRouterParam, setHeader, defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { findSalesProspect, profileForProspect } from '~/server/utils/sales-intelligence'
import { loadContactLogs, loadSalesProfiles, loadSalesProspects, manualIndex, SalesStoreUnavailable } from '~/server/utils/sales-workspace'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Prospect-ID' })
  }
  const prospects = await loadSalesProspects()
  const prospect = findSalesProspect(prospects, id)
  if (!prospect) throw createError({ statusCode: 404, statusMessage: 'Prospect nicht gefunden' })
  const profiles = await loadSalesProfiles()
  const profile = profileForProspect(prospect, manualIndex(profiles.rows))
  let logs: unknown[] = []
  if (profiles.available) {
    try {
      logs = await loadContactLogs(prospect.source_ids)
    } catch (error) {
      if (!(error instanceof SalesStoreUnavailable)) throw error
    }
  }
  return {
    success: true,
    sends: 0,
    profile_store: profiles.available ? 'ready' : 'unavailable',
    prospect,
    profile,
    logs,
  }
})
