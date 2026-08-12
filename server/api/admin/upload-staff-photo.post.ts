// POST /api/admin/upload-staff-photo
// Upload a staff/admin profile photo → storage + users.metadata.photo_url
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const BUCKET = 'tenant-logos'
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])

function extractPhotoUrl(meta: any): string | null {
  if (!meta || typeof meta !== 'object') return null
  if (typeof meta.photo_url === 'string' && meta.photo_url) return meta.photo_url
  if (typeof meta.avatar_url === 'string' && meta.avatar_url) return meta.avatar_url
  return null
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const { data: caller } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!caller?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }

  const adminRoles = new Set(['admin', 'tenant_admin', 'super_admin', 'superadmin'])
  if (!adminRoles.has(String(caller.role || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can upload staff photos' })
  }

  const form = await readMultipartFormData(event)
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: 'No form data' })
  }

  const userIdField = form.find((f) => f.name === 'user_id')
  const removeField = form.find((f) => f.name === 'remove')
  const fileField = form.find((f) => f.name === 'file')
  const targetUserId = String(userIdField?.data?.toString() || '').trim()
  const wantRemove = String(removeField?.data?.toString() || '') === '1'

  if (!targetUserId) {
    throw createError({ statusCode: 400, statusMessage: 'user_id required' })
  }

  const { data: target, error: targetErr } = await supabase
    .from('users')
    .select('id, tenant_id, role, metadata')
    .eq('id', targetUserId)
    .maybeSingle()

  if (targetErr || !target) {
    throw createError({ statusCode: 404, statusMessage: 'Staff user not found' })
  }
  if (caller.role !== 'super_admin' && caller.role !== 'superadmin' && target.tenant_id !== caller.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Tenant mismatch' })
  }
  if (!['staff', 'admin'].includes(String(target.role || ''))) {
    throw createError({ statusCode: 400, statusMessage: 'Photos only for staff/admin' })
  }

  const prevMeta =
    target.metadata && typeof target.metadata === 'object' && !Array.isArray(target.metadata)
      ? { ...(target.metadata as Record<string, any>) }
      : {}

  if (wantRemove) {
    const nextMeta = { ...prevMeta }
    delete nextMeta.photo_url
    delete nextMeta.avatar_url
    const { error: upErr } = await supabase
      .from('users')
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
    if (upErr) {
      throw createError({ statusCode: 500, statusMessage: upErr.message })
    }
    return { success: true, photo_url: null }
  }

  if (!fileField?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'file required' })
  }

  const mime = String(fileField.type || '').toLowerCase()
  if (!ALLOWED.has(mime)) {
    throw createError({ statusCode: 400, statusMessage: 'Nur JPEG, PNG, WebP oder GIF' })
  }
  if (fileField.data.length > MAX_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Datei zu gross (max. 8 MB)' })
  }

  let webp: Buffer
  try {
    webp = await sharp(Buffer.from(fileField.data), { animated: false, failOn: 'none' })
      .rotate()
      .resize(640, 640, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Bild konnte nicht verarbeitet werden' })
  }

  const hash = createHash('sha1').update(webp).digest('hex').slice(0, 10)
  const path = `${target.tenant_id}/staff/${targetUserId}-${hash}.webp`

  const { error: storageErr } = await supabase.storage.from(BUCKET).upload(path, webp, {
    contentType: 'image/webp',
    upsert: true,
  })
  if (storageErr) {
    throw createError({ statusCode: 500, statusMessage: 'Upload fehlgeschlagen: ' + storageErr.message })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const photoUrl = pub?.publicUrl || null
  if (!photoUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Public URL missing' })
  }

  const nextMeta = {
    ...prevMeta,
    photo_url: photoUrl,
    avatar_url: photoUrl,
  }

  const { data: updated, error: dbErr } = await supabase
    .from('users')
    .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)
    .select('id, metadata')
    .single()

  if (dbErr) {
    throw createError({ statusCode: 500, statusMessage: dbErr.message })
  }

  return {
    success: true,
    photo_url: extractPhotoUrl(updated?.metadata) || photoUrl,
  }
})
