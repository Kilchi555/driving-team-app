/**
 * Point LKW Meta ads at the Driving Team Lachen Page and Lachen-only geo.
 *
 *   curl -X POST https://app.simy.ch/api/admin/meta-fix-lkw-identity \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */
import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { fixLkwMetaIdentity } from '~/server/utils/meta-fix-lkw-identity'

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization') ?? ''
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const body = await readBody(event).catch(() => ({})) as { dry_run?: boolean }
  const dryRun = body?.dry_run !== false
  return await fixLkwMetaIdentity({ dryRun })
})
