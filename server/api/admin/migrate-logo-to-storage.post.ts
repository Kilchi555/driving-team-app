/**
 * POST /api/admin/migrate-logo-to-storage
 * One-time utility: reads the base64 logo_square_url from the tenant record,
 * uploads it to Supabase Storage, and saves the public https:// URL back.
 *
 * Safe to call multiple times — skips if already an https:// URL.
 */
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const tenantId = profile.tenant_id
  const supabase = getSupabaseAdmin()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, slug, logo_square_url, logo_url')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })

  const results: Record<string, string> = {}

  for (const field of ['logo_square_url', 'logo_url'] as const) {
    const value: string | null = (tenant as any)[field]
    if (!value) { results[field] = 'empty'; continue }
    if (value.startsWith('https://')) { results[field] = 'already_url'; continue }
    if (!value.startsWith('data:image/')) { results[field] = 'unknown_format'; continue }

    // Parse "data:image/png;base64,<data>"
    const [meta, base64] = value.split(',')
    const mimeMatch = meta.match(/data:([^;]+)/)
    const mimeType = mimeMatch?.[1] || 'image/png'
    const ext = mimeType.split('/')[1] || 'png'

    const buffer = Buffer.from(base64, 'base64')
    const fileName = `${tenantId}/${field}.${ext}`
    const bucket = 'tenant-logos'

    // Upload to storage (upsert)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      results[field] = `upload_error: ${uploadError.message}`
      continue
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
    const publicUrl = publicUrlData.publicUrl

    // Update tenant record
    await supabase.from('tenants').update({ [field]: publicUrl }).eq('id', tenantId)

    results[field] = publicUrl
  }

  return { success: true, results }
})
