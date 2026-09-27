import { defineEventHandler } from 'h3'
import { assertCronRequest } from '~/server/utils/cron-auth'
import { runCronWebsiteProspectDiscovery } from '~/server/utils/website-prospect-discover'

/**
 * GET /api/cron/discover-website-prospects
 * One Swiss city per day. Official Places API only.
 * Saves unpublished website shells for superadmin review. Never sends mail.
 * Schedule: 04:30 UTC daily.
 */
export default defineEventHandler(async (event) => {
  assertCronRequest(event)
  const summary = await runCronWebsiteProspectDiscovery()
  return { ok: true, ...summary, emailsSent: 0 }
})
