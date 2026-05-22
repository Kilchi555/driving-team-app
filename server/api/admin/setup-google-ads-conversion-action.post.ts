/**
 * ONE-TIME SETUP: Create the "Server: Booking Completed" Conversion Action
 * directly via the Google Ads API (bypasses the broken Data-Manager UI flow).
 *
 * USAGE (after deploy to Vercel):
 *   curl -X POST https://app.simy.ch/api/admin/setup-google-ads-conversion-action \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * RESPONSE:
 *   { success: true, conversion_action_id: "123456789", resource_name: "customers/.../conversionActions/123456789" }
 *
 * NEXT STEP:
 *   1. Copy the conversion_action_id from the response.
 *   2. In Vercel → Project Settings → Environment Variables, add:
 *        GOOGLE_ADS_CONVERSION_ACTION_ID = <the_id>
 *   3. Redeploy.
 *
 * SAFETY:
 *   - Protected by CRON_SECRET (same auth as other admin/cron endpoints).
 *   - Idempotent: if an action with the same name already exists, returns it
 *     without creating a duplicate.
 */

import { defineEventHandler, getHeader, createError } from 'h3'
import { logger } from '~/utils/logger'

const GOOGLE_ADS_API_VERSION = 'v23'
const CONVERSION_ACTION_NAME = 'Server: Booking Completed'

export default defineEventHandler(async (event) => {
  // ============ AUTH ============
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ============ ENV CHECK ============
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return { success: false, reason: 'missing_credentials' }
  }

  try {
    // ============ ACCESS TOKEN ============
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const tokenData = await tokenRes.json() as any
    if (!tokenData.access_token) {
      return { success: false, reason: 'token_error', detail: tokenData }
    }
    const accessToken = tokenData.access_token

    // Probe both common header configurations to defeat MCC quirks.
    const tryHeaders = (loginCid: string | null): Record<string, string> => {
      const h: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      }
      if (loginCid) h['login-customer-id'] = loginCid
      return h
    }

    const probes = [
      { label: 'customerId',         loginCid: customerId },
      { label: 'managerCustomerId',  loginCid: '9509957201' },
      { label: 'no_login_header',    loginCid: null as string | null },
    ]

    let searchRes: Response | null = null
    let searchText = ''
    let usedLabel = ''
    let allProbeErrors: Array<{ label: string; status: number; detail: string }> = []

    for (const probe of probes) {
      const res = await fetch(
        `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: tryHeaders(probe.loginCid),
          body: JSON.stringify({
            query: `
              SELECT conversion_action.id, conversion_action.resource_name, conversion_action.name, conversion_action.status
              FROM conversion_action
              WHERE conversion_action.name = '${CONVERSION_ACTION_NAME.replace(/'/g, "\\'")}'
            `.trim(),
          }),
        }
      )
      const text = await res.text()
      if (res.ok) {
        searchRes = res
        searchText = text
        usedLabel = probe.label
        break
      }
      allProbeErrors.push({ label: probe.label, status: res.status, detail: text.slice(0, 300) })
    }

    if (!searchRes) {
      return { success: false, reason: 'all_probes_failed', probes: allProbeErrors }
    }
    logger.info(`setup-google-ads-conversion-action: search succeeded with login-customer-id = ${usedLabel}`)
    const loginCustomerIdToUse = usedLabel === 'managerCustomerId' ? '9509957201' : (usedLabel === 'customerId' ? customerId : null)

    const baseHeaders = tryHeaders(loginCustomerIdToUse)
    const searchText = await searchRes.text()
    let searchData: any = null
    try { searchData = JSON.parse(searchText) } catch { /* non-JSON */ }

    const existing = (searchData?.results ?? [])[0]
    if (existing) {
      const id = String(existing.conversionAction?.id ?? '')
      const resourceName = existing.conversionAction?.resourceName ?? ''
      logger.info(`setup-google-ads-conversion-action: action already exists (id=${id})`)
      return {
        success: true,
        already_exists: true,
        conversion_action_id: id,
        resource_name: resourceName,
        status: existing.conversionAction?.status,
        next_step: `Set GOOGLE_ADS_CONVERSION_ACTION_ID=${id} in Vercel env vars and redeploy.`,
      }
    }

    // ============ CREATE CONVERSION ACTION ============
    const createRes = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/conversionActions:mutate`,
      {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({
          operations: [
            {
              create: {
                name: CONVERSION_ACTION_NAME,
                category: 'BOOK_APPOINTMENT',
                type: 'UPLOAD_CLICKS',
                status: 'ENABLED',
                valueSettings: {
                  defaultValue: 95.0,
                  defaultCurrencyCode: 'CHF',
                  alwaysUseDefaultValue: false,
                },
                countingType: 'ONE_PER_CLICK',
                clickThroughLookbackWindowDays: 30,
                viewThroughLookbackWindowDays: 1,
                attributionModelSettings: {
                  attributionModel: 'GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN',
                },
                includeInConversionsMetric: true,
              },
            },
          ],
          partialFailure: false,
          validateOnly: false,
        }),
      }
    )

    const createText = await createRes.text()
    let createData: any = null
    try { createData = JSON.parse(createText) } catch { /* non-JSON */ }

    if (!createRes.ok) {
      logger.error('setup-google-ads-conversion-action: create failed', createData ?? createText.slice(0, 500))
      return {
        success: false,
        reason: 'create_failed',
        status: createRes.status,
        detail: createData ?? createText.slice(0, 500),
      }
    }

    const result = createData?.results?.[0]
    const resourceName = result?.resourceName ?? ''
    const id = resourceName.split('/').pop() ?? ''

    logger.info(`setup-google-ads-conversion-action: created action ${resourceName}`)

    return {
      success: true,
      already_exists: false,
      conversion_action_id: id,
      resource_name: resourceName,
      next_step: `Set GOOGLE_ADS_CONVERSION_ACTION_ID=${id} in Vercel env vars and redeploy.`,
    }
  } catch (err: any) {
    logger.error('setup-google-ads-conversion-action: unexpected error', err?.message ?? err)
    return { success: false, reason: 'unexpected_error', detail: err?.message ?? String(err) }
  }
})
