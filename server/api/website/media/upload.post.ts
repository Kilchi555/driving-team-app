// POST /api/website/media/upload
// Images: sharp → WebP (+ AVIF). Video (hero_video): accept MP4/WebM as-is (no transcode yet).

import { createHash } from 'node:crypto'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  acceptWebsiteVideo,
  isAllowedWebsiteMediaMime,
  isWebsiteImageSlot,
  isWebsiteVideoSlot,
  normalizeWebsiteMedia,
  WEBSITE_HERO_VIDEO_MAX_BYTES,
  type WebsiteUploadSlot,
} from '~/server/utils/website-media-normalize'

const IMAGE_BUCKET = 'tenant-logos'
const VIDEO_BUCKET = 'website-media'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }
  const adminRoles = new Set(['admin', 'tenant_admin', 'super_admin', 'superadmin'])
  if (!adminRoles.has(String(user.role || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can upload website media' })
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No form data' })
  }

  const slotField = form.find((f) => f.name === 'slot')
  const fileField = form.find((f) => f.name === 'file')
  const slot = (slotField?.data?.toString() || '') as WebsiteUploadSlot
  if (!isWebsiteImageSlot(slot) && !isWebsiteVideoSlot(slot)) {
    throw createError({ statusCode: 400, statusMessage: 'slot must be logo, hero, or hero_video' })
  }
  if (!fileField?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'file required' })
  }

  const fileBuf = Buffer.from(fileField.data)
  const mime = (fileField.type || '').toLowerCase()
  const filename = fileField.filename || ''

  // ── Video path (Stage 1: store as-is) ──────────────────────────────────────
  if (isWebsiteVideoSlot(slot)) {
    let video
    try {
      video = acceptWebsiteVideo(fileBuf, mime, filename)
    } catch (err: any) {
      throw createError({
        statusCode: err?.statusCode || 400,
        statusMessage: err?.message || 'Video ungültig',
      })
    }

    const hash = createHash('sha1').update(video.buffer).digest('hex').slice(0, 10)
    const path = `${user.tenant_id}/website/hero-video-${hash}.${video.ext}`

    const { error: upErr } = await supabase.storage.from(VIDEO_BUCKET).upload(path, video.buffer, {
      contentType: video.mime,
      upsert: true,
    })
    if (upErr) {
      throw createError({ statusCode: 500, statusMessage: 'Upload fehlgeschlagen: ' + upErr.message })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path)

    return {
      success: true,
      slot,
      url: publicUrl,
      mime: video.mime,
      bytes: video.bytes,
      max_bytes: WEBSITE_HERO_VIDEO_MAX_BYTES,
      note: 'Kein Server-Transcode — bitte ≤720p hochladen.',
    }
  }

  // ── Image path ─────────────────────────────────────────────────────────────
  const maxBytes = slot === 'hero' ? 12 * 1024 * 1024 : 6 * 1024 * 1024
  if (fileBuf.length > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: `Datei zu gross (max ${maxBytes / 1024 / 1024}MB)`,
    })
  }

  if (mime && !isAllowedWebsiteMediaMime(mime)) {
    // HEIC may arrive without reliable mime — still try sharp
    if (!mime.startsWith('image/')) {
      throw createError({ statusCode: 400, statusMessage: `Unsupported type: ${mime || 'unknown'}` })
    }
  }

  let normalized
  try {
    normalized = await normalizeWebsiteMedia(fileBuf, slot)
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 400,
      statusMessage: err?.message || 'Bild konnte nicht verarbeitet werden',
    })
  }

  const hash = createHash('sha1').update(normalized.primary).digest('hex').slice(0, 10)
  const webpPath = `${user.tenant_id}/website/${slot}-${hash}.webp`
  const avifPath = `${user.tenant_id}/website/${slot}-${hash}.avif`

  const { error: webpErr } = await supabase.storage.from(IMAGE_BUCKET).upload(webpPath, normalized.webp, {
    contentType: 'image/webp',
    upsert: true,
  })
  if (webpErr) {
    throw createError({ statusCode: 500, statusMessage: 'Upload fehlgeschlagen: ' + webpErr.message })
  }

  // AVIF best-effort
  await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(avifPath, normalized.avif, { contentType: 'image/avif', upsert: true })
    .catch(() => null)

  const {
    data: { publicUrl: webpUrl },
  } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(webpPath)
  const {
    data: { publicUrl: avifUrl },
  } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(avifPath)

  // Keep website_tenants columns in sync for convenience
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (website?.id) {
    const patch =
      slot === 'logo'
        ? { logo_url: webpUrl, updated_at: new Date().toISOString() }
        : { hero_image_url: webpUrl, updated_at: new Date().toISOString() }
    await supabase.from('website_tenants').update(patch).eq('id', website.id)
  }

  if (slot === 'logo') {
    await supabase
      .from('tenants')
      .update({
        logo_url: webpUrl,
        logo_square_url: webpUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.tenant_id)
  }

  return {
    success: true,
    slot,
    url: webpUrl,
    webp_url: webpUrl,
    avif_url: avifUrl,
    width: normalized.width,
    height: normalized.height,
  }
})
