import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['staff', 'admin', 'superadmin'])
  const supabase = getSupabaseAdmin()

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'Keine Datei übermittelt' })

  const file = formData.find(f => f.name === 'file')
  if (!file?.data) throw createError({ statusCode: 400, statusMessage: 'Kein file-Feld gefunden' })

  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (file.type && !allowed.includes(file.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Nur PDF, PNG, JPEG oder WEBP erlaubt' })
  }

  const ext = file.filename?.split('.').pop()?.toLowerCase() ?? 'jpg'
  const fileName = `spesen_${profile.id}_${Date.now()}.${ext}`
  const storagePath = `${profile.tenant_id}/accounting/staff/${fileName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('tenant-documents')
    .upload(storagePath, file.data, { contentType: file.type ?? 'image/jpeg', upsert: false })

  if (uploadError) {
    const { data: fallback, error: fallbackError } = await supabase.storage
      .from('user-documents')
      .upload(`accounting/staff/${profile.tenant_id}/${fileName}`, file.data, {
        contentType: file.type ?? 'image/jpeg', upsert: false,
      })
    if (fallbackError) throw createError({ statusCode: 500, statusMessage: fallbackError.message })

    const { data: signed } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(`accounting/staff/${profile.tenant_id}/${fileName}`, 60 * 60 * 24 * 365)

    return { success: true, url: signed?.signedUrl, filename: file.filename ?? fileName }
  }

  const { data: publicUrl } = supabase.storage
    .from('tenant-documents')
    .getPublicUrl(uploadData.path)

  return { success: true, url: publicUrl.publicUrl, filename: file.filename ?? fileName }
})
