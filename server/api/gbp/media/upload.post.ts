import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { listTenantGbpLocations, resolveGbpLocation } from '~/server/utils/gbp'
import { generateGbpPhotoCaptionFromBuffer } from '~/server/utils/gbp-automation'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET = 'tenant-assets'

function parseLocationIds(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return []
  const text = raw.trim()
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch { /* fall through */ }
  }
  return text.split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * POST /api/gbp/media/upload
 * Multipart upload into media pool (does NOT publish to GBP unless publishNow=true).
 * Optional:
 * - autoCaption=true: AI analyzes image with tenant context → SEO notes
 * - locationIds=[...] or allLocations=true: create one pool row per location (same file)
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const filePart = parts.find(p => p.name === 'file')
  const categoryPart = parts.find(p => p.name === 'category')
  const locationPart = parts.find(p => p.name === 'locationId')
  const locationIdsPart = parts.find(p => p.name === 'locationIds')
  const allLocationsPart = parts.find(p => p.name === 'allLocations')
  const approvedPart = parts.find(p => p.name === 'approved')
  const publishNowPart = parts.find(p => p.name === 'publishNow')
  const notesPart = parts.find(p => p.name === 'notes')
  const autoCaptionPart = parts.find(p => p.name === 'autoCaption')

  if (!filePart?.data) throw createError({ statusCode: 400, statusMessage: 'File required' })

  const mimeType = filePart.type ?? 'image/jpeg'
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw createError({ statusCode: 400, statusMessage: 'Only JPEG, PNG, WebP allowed' })
  }

  const allLocations = allLocationsPart?.data?.toString() === 'true'
  let locationUuids: string[] = []

  if (allLocations) {
    const locs = await listTenantGbpLocations(authUser.tenant_id)
    locationUuids = locs.map(l => l.id)
  } else {
    const fromList = parseLocationIds(locationIdsPart?.data?.toString())
    const single = locationPart?.data?.toString()?.trim()
    const requested = fromList.length ? fromList : (single ? [single] : [])
    for (const id of requested) {
      const loc = await resolveGbpLocation(authUser.tenant_id, id)
      if (!locationUuids.includes(loc.id)) locationUuids.push(loc.id)
    }
  }

  if (!locationUuids.length) {
    throw createError({ statusCode: 400, statusMessage: 'Mindestens einen Standort wählen' })
  }

  const ext = mimeType.split('/')[1]
  const storagePath = `gbp-pool/${authUser.tenant_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const supabase = getSupabaseAdmin()

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(filePart.data), { contentType: mimeType, upsert: false })

  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: `Storage upload failed: ${uploadError.message}` })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl
  const category = (categoryPart?.data?.toString() ?? 'INTERIOR') as 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'
  const approved = approvedPart?.data?.toString() === 'true'
  const publishNow = publishNowPart?.data?.toString() === 'true'
  const draftNotes = notesPart?.data?.toString()?.trim() || null
  const autoCaption = autoCaptionPart?.data?.toString() === 'true'

  let notes = draftNotes
  let captionGenerated = false
  if (autoCaption) {
    try {
      const caption = await generateGbpPhotoCaptionFromBuffer({
        tenantId: authUser.tenant_id,
        locationId: locationUuids[0],
        imageBuffer: Buffer.from(filePart.data),
        draftText: draftNotes,
      })
      if (caption?.trim()) {
        notes = caption.trim().slice(0, 250)
        captionGenerated = true
      }
    } catch (err: any) {
      console.warn('[gbp/media/upload] autoCaption failed:', err?.message || err)
    }
  }

  const rows = locationUuids.map(locationId => ({
    tenant_id: authUser.tenant_id,
    location_id: locationId,
    storage_path: storagePath,
    public_url: publicUrl,
    category,
    approved: approved || publishNow,
    source: 'upload' as const,
    notes,
  }))

  const { data: assets, error } = await supabase
    .from('gbp_media_assets')
    .insert(rows)
    .select('*')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  let gbpMedia = null
  if (publishNow && assets?.length) {
    const { uploadGbpPhoto } = await import('~/server/utils/gbp')
    // Immediate publish only for first selected location (avoid blasting all at once)
    const first = assets[0]
    gbpMedia = await uploadGbpPhoto(
      authUser.tenant_id,
      publicUrl,
      category,
      first.location_id,
      notes,
    )
    await supabase
      .from('gbp_media_assets')
      .update({
        last_published_at: new Date().toISOString(),
        publish_count: 1,
        approved: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', first.id)
  }

  return {
    ok: true,
    assets: assets ?? [],
    asset: assets?.[0] ?? null,
    publicUrl,
    gbpMedia,
    captionGenerated,
    locationCount: locationUuids.length,
  }
})
