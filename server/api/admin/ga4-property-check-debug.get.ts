// Temporary debug endpoint: lists every GA4 property the analytics-sync service
// account can see, and (if given a `property` query param) runs a same-day
// report filtered to a UTM campaign to verify SMS/print click attribution.
// Protected by CRON_SECRET. Delete after use.
import { SignJWT, importPKCS8 } from 'jose'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKeyRaw) {
    return { error: 'missing_credentials', clientEmail: !!clientEmail, privateKey: !!privateKeyRaw }
  }

  const privateKey = await importPKCS8(privateKeyRaw, 'RS256')
  const now = Math.floor(Date.now() / 1000)
  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKey)

  const tokenRes = await $fetch<{ access_token?: string; error?: string }>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    }
  )

  if (!tokenRes.access_token) {
    return { error: 'token_exchange_failed', details: tokenRes }
  }
  const accessToken = tokenRes.access_token

  // 1) Which properties can this service account see at all?
  const accountSummaries = await $fetch<{ accountSummaries?: any[] }>(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  ).catch((err) => ({ error: err?.data ?? err?.message }))

  const properties =
    (accountSummaries as any).accountSummaries?.flatMap((acc: any) =>
      (acc.propertySummaries ?? []).map((p: any) => ({
        property: p.property,
        displayName: p.displayName,
        account: acc.displayName,
      }))
    ) ?? []

  // 2) Optional: run today's report for a given property, filtered by UTM campaign
  const query = getQuery(event)
  const propertyParam = typeof query.property === 'string' ? query.property : null
  const campaign = typeof query.campaign === 'string' ? query.campaign : 'fahrlehrer-empfehlung'

  let report: any = null
  if (propertyParam) {
    const cleanPropertyId = propertyParam.replace('properties/', '')
    report = await $fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
          dateRanges: [{ startDate: '3daysAgo', endDate: 'today' }],
          dimensions: [
            { name: 'date' },
            { name: 'sessionSource' },
            { name: 'sessionMedium' },
            { name: 'sessionCampaignName' },
            { name: 'pagePath' },
          ],
          metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionCampaignName',
              stringFilter: { value: campaign, matchType: 'EXACT' },
            },
          },
        },
      }
    ).catch((err) => ({ error: err?.data ?? err?.message }))
  }

  return {
    accessibleProperties: properties,
    reportForProperty: propertyParam,
    campaignFilter: campaign,
    report,
    rawAccountSummaries: accountSummaries,
  }
})
