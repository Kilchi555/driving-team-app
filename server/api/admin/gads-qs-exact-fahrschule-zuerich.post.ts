/**
 * Exact ad group + negatives for QS on «fahrschule zürich».
 * Campaign: Fahrschule Zürich / Altstetten only. Budget unchanged.
 *
 *   curl -X POST https://app.simy.ch/api/admin/gads-qs-exact-fahrschule-zuerich \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */
import { defineEventHandler, readBody } from 'h3'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'
import { applyQsExactFahrschuleZuerich } from '~/server/utils/gads-qs-exact-fahrschule-zuerich'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as { dry_run?: boolean }
  const dryRun = body?.dry_run !== false
  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  return await applyQsExactFahrschuleZuerich({ customerId: gads.customerId, headers, dryRun })
})
