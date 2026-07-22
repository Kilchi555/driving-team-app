// Temporary debug endpoint: checks GA4 Data API property access + metadata.
// Protected by CRON_SECRET. Delete after diagnosing the stale-sync issue.
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  if (!clientEmail || !privateKey || !propertyId) {
    return { error: 'missing_credentials', clientEmail: !!clientEmail, privateKey: !!privateKey, propertyId }
  }

  const client = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })

  const result: Record<string, unknown> = { service_account: clientEmail, property: propertyId }

  // 1. Metadata call — succeeds only if the service account has real access to this property.
  try {
    const [metadata] = await client.getMetadata({ name: `${propertyId}/metadata` })
    result.metadata_ok = true
    result.dimension_count = metadata.dimensions?.length ?? 0
    result.metric_count = metadata.metrics?.length ?? 0
  }
  catch (err: any) {
    result.metadata_ok = false
    result.metadata_error = err?.details ?? err?.message ?? String(err)
    result.metadata_error_code = err?.code
  }

  // 2. Wide-open report with a huge date range, no filters — checks if ANY data exists at all.
  try {
    const [response] = await client.runReport({
      property: propertyId,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      dateRanges: [{ startDate: '2026-01-01', endDate: 'today' }],
      limit: 5,
    })
    result.wide_report_ok = true
    result.wide_report_rows = response.rows?.length ?? 0
    result.wide_report_sample = response.rows?.slice(0, 5).map(r => ({
      date: r.dimensionValues?.[0]?.value,
      sessions: r.metricValues?.[0]?.value,
    }))
    result.row_count_meta = response.rowCount
  }
  catch (err: any) {
    result.wide_report_ok = false
    result.wide_report_error = err?.details ?? err?.message ?? String(err)
    result.wide_report_error_code = err?.code
  }

  return result
})
