import { createError } from 'h3'
import { INTERNAL_EMAIL_SECRET_HEADER } from '../../supabase/functions/_shared/internal-email-auth'

/**
 * Header for server-side Supabase Edge Function invokes.
 * Reads SIMY_INTERNAL_EMAIL_SECRET from the Nitro/Vercel runtime only.
 * Never pass this value to a Vue composable, public runtimeConfig, or a log.
 */
export function internalEmailAuthHeaders(): Record<string, string> {
  const secret = process.env.SIMY_INTERNAL_EMAIL_SECRET?.trim()
  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'Unable to send email' })
  }
  return { [INTERNAL_EMAIL_SECRET_HEADER]: secret }
}
