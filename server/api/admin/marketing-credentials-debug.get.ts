// TEMPORARY: returns non-secret marketing credential IDs for tenant backfill
// Protected by CRON_SECRET – delete this file after use
export default defineEventHandler((event) => {
  const auth = getHeader(event, 'authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return {
    ga4_property_id: process.env.GOOGLE_ANALYTICS_PROPERTY_ID ?? null,
    google_ads_customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID ?? null,
    gsc_site_url: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? null,
  }
})
