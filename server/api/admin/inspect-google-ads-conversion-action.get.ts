/**
 * Diagnostic: read the current configuration of the "Server: Booking Completed"
 * conversion action from Google Ads. Used to verify defaults applied by Google
 * after the minimal-body create and to plan UI adjustments.
 *
 * USAGE:
 *   curl https://app.simy.ch/api/admin/inspect-google-ads-conversion-action \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { defineEventHandler, getHeader, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN!
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID

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
  const accessToken = tokenData.access_token
  if (!accessToken) return { success: false, reason: 'token_error', detail: tokenData }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }

  const query = conversionActionId
    ? `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type,
        conversion_action.status,
        conversion_action.primary_for_goal,
        conversion_action.counting_type,
        conversion_action.click_through_lookback_window_days,
        conversion_action.view_through_lookback_window_days,
        conversion_action.include_in_conversions_metric,
        conversion_action.attribution_model_settings.attribution_model,
        conversion_action.value_settings.default_value,
        conversion_action.value_settings.default_currency_code,
        conversion_action.value_settings.always_use_default_value
      FROM conversion_action
      WHERE conversion_action.id = ${conversionActionId}
    `
    : `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.category,
        conversion_action.type,
        conversion_action.status,
        conversion_action.primary_for_goal,
        conversion_action.counting_type,
        conversion_action.click_through_lookback_window_days,
        conversion_action.view_through_lookback_window_days,
        conversion_action.include_in_conversions_metric,
        conversion_action.attribution_model_settings.attribution_model,
        conversion_action.value_settings.default_value,
        conversion_action.value_settings.default_currency_code,
        conversion_action.value_settings.always_use_default_value
      FROM conversion_action
      WHERE conversion_action.name = 'Server: Booking Completed'
    `

  const res = await fetch(
    `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
    { method: 'POST', headers, body: JSON.stringify({ query: query.trim() }) }
  )
  const text = await res.text()
  let data: any = null
  try { data = JSON.parse(text) } catch { /* */ }

  if (!res.ok) {
    return { success: false, status: res.status, detail: data ?? text.slice(0, 500) }
  }

  return {
    success: true,
    env_conversion_action_id: conversionActionId ?? null,
    results: data?.results ?? [],
  }
})
