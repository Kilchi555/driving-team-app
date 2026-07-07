import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

const SIGNED_URL_EXPIRY = 60 * 60 // 1 hour

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'superadmin', 'super_admin'])
  const supabase = getSupabaseAdmin()

  const { data: docs, error } = await supabase
    .from('user_documents')
    .select('id, document_type, side, file_name, file_type, storage_path, title, is_verified, created_at')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Dokumente konnten nicht geladen werden' })

  // Generate signed URLs for each document
  const docsWithUrls = await Promise.all(
    (docs || []).map(async (doc) => {
      try {
        const { data: signed } = await supabase.storage
          .from('user-documents')
          .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY)
        return { ...doc, signedUrl: signed?.signedUrl ?? null }
      } catch {
        return { ...doc, signedUrl: null }
      }
    })
  )

  return { success: true, data: docsWithUrls }
})
