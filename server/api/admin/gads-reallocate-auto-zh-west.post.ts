/**
 * Pause Auto Lachen, enable Zürich West/Limmattal with the same Auto daily budget.
 * Lastwagen Google stays untouched.
 *
 *   curl -X POST https://app.simy.ch/api/admin/gads-reallocate-auto-zh-west \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */
import { defineEventHandler, readBody } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'
import { reallocateAutoZhWest } from '~/server/utils/gads-reallocate-auto-zh-west'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as { dry_run?: boolean }
  const dryRun = body?.dry_run !== false
  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  return await reallocateAutoZhWest({ customerId: gads.customerId, headers, dryRun })
})
