/**
 * GET /api/gbp/debug
 * Public endpoint — shows GBP OAuth config without auth.
 * DELETE after debugging is done.
 */
import { defineEventHandler } from 'h3'
import { getAppUrl } from '~/server/utils/app-url'

export default defineEventHandler(() => {
  const appUrl = getAppUrl()
  const rawAppUrl = process.env.NUXT_PUBLIC_APP_URL || '(not set)'
  const clientIdRaw = process.env.GOOGLE_GBP_CLIENT_ID || '(not set)'
  const clientId = clientIdRaw.trim()

  return {
    appUrl,
    redirect_uri: `${appUrl}/api/gbp/auth/callback`,
    raw_env_value: JSON.stringify(rawAppUrl),
    client_id_prefix: clientId.substring(0, 30) + '...',
    client_id_has_newline: clientIdRaw !== clientId,
    nuxt_public_app_url_set: !!process.env.NUXT_PUBLIC_APP_URL,
  }
})
