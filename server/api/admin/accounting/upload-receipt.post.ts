import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event, { write: true })
  const supabase = getSupabaseAdmin()

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'Keine Datei übermittelt' })

  const file = formData.find(f => f.name === 'file')
  if (!file?.data) throw createError({ statusCode: 400, statusMessage: 'Kein file-Feld gefunden' })

  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (file.type && !allowed.includes(file.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Nur PDF, PNG, JPEG oder WEBP unterstützt' })
  }

  const ext = file.filename?.split('.').pop()?.toLowerCase() ?? 'pdf'
  const fileName = `beleg_${Date.now()}.${ext}`
  const storagePath = `${profile.tenant_id}/accounting/${fileName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('tenant-documents')
    .upload(storagePath, file.data, {
      contentType: file.type ?? 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    // Fallback: user-documents bucket
    const { data: fallback, error: fallbackError } = await supabase.storage
      .from('user-documents')
      .upload(`accounting/${profile.tenant_id}/${fileName}`, file.data, {
        contentType: file.type ?? 'application/pdf',
        upsert: false,
      })

    if (fallbackError) throw createError({ statusCode: 500, statusMessage: fallbackError.message })

    return {
      success: true,
      path: fallback.path || `accounting/${profile.tenant_id}/${fileName}`,
      filename: file.filename ?? fileName,
    }
  }

  return { success: true, path: uploadData.path || storagePath, filename: file.filename ?? fileName }
})
