import { createError, getRouterParam, setHeader, defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { loadContactLogs, loadSalesProfiles, loadSalesProspects, SalesStoreUnavailable } from '~/server/utils/sales-workspace'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Prospect-ID' })
  }
  const prospects = await loadSalesProspects()
  const prospect = prospects.find((row) => row.prospect_id === id)
  if (!prospect) throw createError({ statusCode: 404, statusMessage: 'Prospect nicht gefunden' })
  const profiles = await loadSalesProfiles()
  const profile = profiles.rows.find((row) => row.prospect_id === id) || null
  let logs: unknown[] = []
  if (profiles.available && profile) {
    try {
      logs = await loadContactLogs(id)
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
