import { defineEventHandler, sendRedirect, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getAppUrl } from '~/server/utils/app-url'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
].join(' ')

/**
 * GET /api/gbp/auth/start
 * Initiates the Google OAuth flow for GBP access.
 * Redirects to Google's consent screen.
 *
 * Add ?debug=true to return the generated OAuth URL without redirecting.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const clientId = process.env.GOOGLE_GBP_CLIENT_ID?.trim()
  if (!clientId) throw createError({ statusCode: 500, statusMessage: 'GBP client ID not configured' })

  const appUrl = getAppUrl()
  const redirectUri = `${appUrl}/api/gbp/auth/callback`

  // Encode tenant_id in state to verify on callback
  const state = Buffer.from(JSON.stringify({ tenant_id: authUser.tenant_id })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const fullUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`

  // Debug mode: return URL info instead of redirecting
  const { debug } = getQuery(event)
  if (debug === 'true') {
    return {
      redirect_uri: redirectUri,
      client_id: clientId,
      appUrl,
      full_url: fullUrl,
    }
  }

  return sendRedirect(event, fullUrl)
})
