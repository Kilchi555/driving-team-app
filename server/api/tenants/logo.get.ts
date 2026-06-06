/**
 * GET /api/tenants/logo?id=<tenantId>&type=wide|square
 *
 * Serves the tenant logo as a real image response so that email clients
 * (which block data: URIs) can load the logo via a proper HTTPS URL.
 *
 * Cache-Control: 7 days — logos rarely change.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { id, type } = getQuery(event) as { id?: string; type?: string }

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('logo_wide_url, logo_square_url, logo_url')
    .eq('id', id)
    .single()

  if (!tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
  }

  const raw = type === 'square'
    ? (tenant.logo_square_url || tenant.logo_url)
    : (tenant.logo_wide_url || tenant.logo_url)

  if (!raw) {
    throw createError({ statusCode: 404, statusMessage: 'No logo found' })
  }

  // If already an HTTPS URL, redirect there
  if (raw.startsWith('https://') || raw.startsWith('http://')) {
    return sendRedirect(event, raw, 302)
  }

  // Parse data URI: data:<mime>;base64,<data>
  const match = raw.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw createError({ statusCode: 422, statusMessage: 'Unsupported logo format' })
  }

  const mimeType = match[1]
  const imageBuffer = Buffer.from(match[2], 'base64')

  setHeader(event, 'Content-Type', mimeType)
  setHeader(event, 'Cache-Control', 'public, max-age=604800, immutable')
  setHeader(event, 'Content-Length', imageBuffer.length.toString())

  return imageBuffer
})
