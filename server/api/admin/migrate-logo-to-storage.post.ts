/**
 * POST /api/admin/migrate-logo-to-storage
 * Migrates base64 data-URI logos on the tenant record to Supabase Storage
 * and writes public https:// URLs back into tenants.*.
 *
 * Safe to call multiple times — skips fields that are already https:// URLs.
 *
 * Body (optional):
 *   { tenant_id?: string } — super_admin only; defaults to caller's tenant
 */
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const LOGO_FIELDS = [
  'logo_url',
  'logo_square_url',
  'logo_wide_url',
  'logo_dark_url',
  'favicon_url',
] as const

const STORAGE_BUCKET = 'tenant-logos'

type LogoField = (typeof LOGO_FIELDS)[number]

function parseDataUri(value: string): { mimeType: string; ext: string; buffer: Buffer } | null {
  if (!value.startsWith('data:image/')) return null
  const comma = value.indexOf(',')
  if (comma < 0) return null
  const meta = value.slice(0, comma)
  const base64 = value.slice(comma + 1)
  const mimeMatch = meta.match(/data:([^;]+)/)
  const mimeType = mimeMatch?.[1] || 'image/png'
  // data:image/svg+xml;base64 → svg, image/webp → webp
  let ext = mimeType.split('/')[1] || 'png'
  if (ext.includes('+')) ext = ext.split('+')[0] // svg+xml → svg
  if (ext === 'jpeg') ext = 'jpg'
  return { mimeType, ext, buffer: Buffer.from(base64, 'base64') }
}

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const body = await readBody(event).catch(() => ({} as any))

  let tenantId = profile.tenant_id
  if (body?.tenant_id && body.tenant_id !== profile.tenant_id) {
    if (!['super_admin', 'superadmin'].includes(profile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Only super_admin can migrate another tenant' })
    }
    tenantId = body.tenant_id
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select(`id, slug, ${LOGO_FIELDS.join(', ')}`)
    .eq('id', tenantId)
    .single()

  if (error || !tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })

  const results: Record<string, string> = {}
  const updates: Partial<Record<LogoField, string>> = {}

  for (const field of LOGO_FIELDS) {
    const value: string | null = (tenant as any)[field]
    if (!value) {
      results[field] = 'empty'
      continue
    }
    if (value.startsWith('https://') || value.startsWith('http://')) {
      results[field] = 'already_url'
      continue
    }

    const parsed = parseDataUri(value)
    if (!parsed) {
      results[field] = 'unknown_format'
      continue
    }

    const fileName = `${tenantId}/${field}.${parsed.ext}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, parsed.buffer, {
        contentType: parsed.mimeType,
        upsert: true,
      })

    if (uploadError) {
      results[field] = `upload_error: ${uploadError.message}`
      continue
    }

    const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
    const publicUrl = publicUrlData.publicUrl
    updates[field] = publicUrl
    results[field] = publicUrl
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Storage upload ok, but tenants update failed: ${updateError.message}`,
      })
    }
  }

  // Also set logo_url from square/wide if still empty (common fallback column)
  const effectiveSquare = updates.logo_square_url || (typeof tenant.logo_square_url === 'string' && tenant.logo_square_url.startsWith('http') ? tenant.logo_square_url : null)
  const effectiveWide = updates.logo_wide_url || (typeof tenant.logo_wide_url === 'string' && tenant.logo_wide_url.startsWith('http') ? tenant.logo_wide_url : null)
  if (!tenant.logo_url && !updates.logo_url && (effectiveSquare || effectiveWide)) {
    const fallback = effectiveSquare || effectiveWide
    await supabase.from('tenants').update({ logo_url: fallback }).eq('id', tenantId)
    results.logo_url = `set_from_fallback: ${fallback}`
  }

  return { success: true, tenant_id: tenantId, results }
})
