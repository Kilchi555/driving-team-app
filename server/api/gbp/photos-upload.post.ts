import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { uploadGbpPhoto } from '~/server/utils/gbp'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET = 'tenant-assets'

/**
 * POST /api/gbp/photos-upload
 * Accepts multipart file upload, stores in Supabase Storage, then pushes to GBP.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })

  const filePart = parts.find(p => p.name === 'file')
  const categoryPart = parts.find(p => p.name === 'category')
  if (!filePart?.data) throw createError({ statusCode: 400, statusMessage: 'File required' })

  const mimeType = filePart.type ?? 'image/jpeg'
  if (!ALLOWED_TYPES.includes(mimeType)) throw createError({ statusCode: 400, statusMessage: 'Only JPEG, PNG, WebP allowed' })

  const ext = mimeType.split('/')[1]
  const storagePath = `gbp/${authUser.tenant_id}/${Date.now()}.${ext}`

  const supabase = getSupabaseAdmin()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, filePart.data, { contentType: mimeType, upsert: false })

  if (uploadError) throw createError({ statusCode: 500, statusMessage: `Storage upload failed: ${uploadError.message}` })

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData.publicUrl

  const category = (categoryPart?.data?.toString() ?? 'INTERIOR') as 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'
  const result = await uploadGbpPhoto(authUser.tenant_id, publicUrl, category)

  return { success: true, publicUrl, gbpMedia: result }
})
