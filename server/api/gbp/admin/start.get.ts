import { defineEventHandler, sendRedirect, createError } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = ['https://www.googleapis.com/auth/business.manage', 'openid', 'email'].join(' ')

/**
 * GET /api/gbp/admin/start
 * Super-admin only: starts the GBP OAuth flow for simy.ch's own profile.
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const clientId = process.env.GOOGLE_GBP_CLIENT_ID
  if (!clientId) throw createError({ statusCode: 500, statusMessage: 'GBP client ID not configured' })

  const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch'
  const redirectUri = `${appUrl}/api/gbp/admin/callback`
  const tenantId = getSimyGbpTenantId()

  const state = Buffer.from(JSON.stringify({ tenant_id: tenantId, is_simy_admin: true })).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return sendRedirect(event, `${GOOGLE_AUTH_URL}?${params.toString()}`)
})
