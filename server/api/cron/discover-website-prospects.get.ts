import { defineEventHandler } from 'h3'
import { assertCronRequest } from '~/server/utils/cron-auth'
import { dispatchCronProspectDiscovery, sanitizeErrorSummary } from '~/server/utils/prospect-discovery-automation'

/**
 * GET /api/cron/discover-website-prospects
 * Static Vercel tick: minute 30 of every hour.
 * Super-admin settings decide whether this tick starts discovery.
 * Missing, unreadable, or disabled settings are a success no-op:
 * no Places search, no prospect insert, no enrichment.
 * Schedule stays in vercel.json; the stored timezone is the clock.
 */
export default defineEventHandler(async (event) => {
  assertCronRequest(event)
  try {
    const result = await dispatchCronProspectDiscovery()
    return {
      ok: result.ok,
      skipped: result.skipped ?? null,
      status: result.status ?? null,
      runId: result.runId,
      city: result.city,
      created: result.created,
      review: result.review,
      scored: result.scored,
      errors: result.errors,
      generated: result.generated,
      emailsSent: 0,
    }
  } catch (error) {
    console.error('[prospect-discovery] cron dispatch failed', sanitizeErrorSummary(error))
    return { ok: true, skipped: 'automation_disabled', emailsSent: 0 }
  }
})
