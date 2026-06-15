/**
 * GET /api/gbp/debug
 * Public endpoint — shows GBP OAuth config without auth.
 * DELETE after debugging is done.
 */
import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch'
  const clientId = process.env.GOOGLE_GBP_CLIENT_ID || '(not set)'

  return {
    appUrl,
    redirect_uri: `${appUrl}/api/gbp/auth/callback`,
    client_id_prefix: clientId.substring(0, 20) + '...',
    nuxt_public_app_url_set: !!process.env.NUXT_PUBLIC_APP_URL,
  }
})
