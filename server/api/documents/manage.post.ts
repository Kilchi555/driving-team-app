import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { logger } from '~/utils/logger'

const ALLOWED_DOC_TYPES = ['lernfahrausweis', 'medical_certificate', 'license', 'id_card', 'passport', 'other']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const body = await readBody<{
      action: 'save' | 'delete' | 'verify'
      user_id: string
      document_id?: string
      document_data?: {
        document_type: string
        category_code?: string
        side?: 'front' | 'back'
        file_name: string
        file_size?: number
        file_type: string
        storage_path: string
        title?: string
        description?: string
        tenant_id: string
      }
    }>(event)

    const { action, user_id } = body
    if (!user_id) throw createError({ statusCode: 400, statusMessage: 'Missing user_id' })

    const supabase = getSupabaseAdmin()
    const clientIP = getClientIP(event)

    // Load caller profile
    const { data: callerUser } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!callerUser) throw createError({ statusCode: 403, statusMessage: 'Access denied' })

    // Verify access: user can only manage their own documents, admins/staff can manage any in tenant
    const isOwner = callerUser.id === user_id
    const isAdminOrStaff = ['admin', 'staff', 'super_admin'].includes(callerUser.role)

    if (!isOwner && !isAdminOrStaff) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    }

    // Verify target user belongs to same tenant
    if (!isOwner) {
      const { data: targetUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user_id)
        .single()

      if (!targetUser || targetUser.tenant_id !== callerUser.tenant_id) {
        throw createError({ statusCode: 404, statusMessage: 'User not found' })
      }
    }

    // ─── save ─────────────────────────────────────────────────────────────────
    if (action === 'save') {
      const { document_data } = body
      if (!document_data) throw createError({ statusCode: 400, statusMessage: 'Missing document_data' })

      // Validate document type
      if (!ALLOWED_DOC_TYPES.includes(document_data.document_type)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid document type' })
      }

      // Validate file size if provided
      if (document_data.file_size && document_data.file_size > MAX_FILE_SIZE_BYTES) {
        throw createError({ statusCode: 400, statusMessage: 'File too large (max 10MB)' })
      }

      // Validate storage_path belongs to the user (security: no path traversal)
      const expectedPrefix = `${user_id}/`
      if (!document_data.storage_path.startsWith(expectedPrefix)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid storage path' })
      }

      // Check for existing document of same type
      let existingQuery = supabase
        .from('user_documents')
        .select('id')
        .eq('user_id', user_id)
        .eq('document_type', document_data.document_type)
        .eq('side', document_data.side || 'front')
        .is('deleted_at', null)

      if (document_data.category_code) {
        existingQuery = existingQuery.eq('category_code', document_data.category_code)
      } else {
        existingQuery = existingQuery.is('category_code', null)
      }

      const { data: existing } = await existingQuery.maybeSingle()

      let result
      if (existing) {
        const { data, error: updateError } = await supabase
          .from('user_documents')
          .update({
            file_name: document_data.file_name,
            file_size: document_data.file_size,
            file_type: document_data.file_type,
            storage_path: document_data.storage_path,
            title: document_data.title,
            description: document_data.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) throw updateError
        result = data
      } else {
        const { data, error: insertError } = await supabase
          .from('user_documents')
          .insert({
            user_id,
            tenant_id: document_data.tenant_id || callerUser.tenant_id,
            document_type: document_data.document_type,
            category_code: document_data.category_code || null,
            side: document_data.side || 'front',
            file_name: document_data.file_name,
            file_size: document_data.file_size,
            file_type: document_data.file_type,
            storage_path: document_data.storage_path,
            title: document_data.title,
            description: document_data.description,
            created_by: callerUser.id
          })
          .select()
          .single()

        if (insertError) throw insertError
        result = data
      }

      await logAudit({
        user_id: authUser.id,
        action: 'save_user_document',
        resource_type: 'user_document',
        resource_id: result.id,
        status: 'success',
        ip_address: clientIP
      })

      return { success: true, data: result }
    }

    // ─── delete ───────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { document_id } = body
      if (!document_id) throw createError({ statusCode: 400, statusMessage: 'Missing document_id' })

      // Verify document belongs to user
      const { data: doc } = await supabase
        .from('user_documents')
        .select('id, user_id, tenant_id')
        .eq('id', document_id)
        .is('deleted_at', null)
        .single()

      if (!doc || doc.user_id !== user_id) {
        throw createError({ statusCode: 404, statusMessage: 'Document not found' })
      }

      const { error: deleteError } = await supabase
        .from('user_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', document_id)

      if (deleteError) throw deleteError

      await logAudit({
        user_id: authUser.id,
        action: 'delete_user_document',
        resource_type: 'user_document',
        resource_id: document_id,
        status: 'success',
        ip_address: clientIP
      })

      return { success: true }
    }

    // ─── verify ───────────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!isAdminOrStaff) {
        throw createError({ statusCode: 403, statusMessage: 'Only staff/admin can verify documents' })
      }

      const { document_id } = body
      if (!document_id) throw createError({ statusCode: 400, statusMessage: 'Missing document_id' })

      const { error: verifyError } = await supabase
        .from('user_documents')
        .update({
          is_verified: true,
          verification_date: new Date().toISOString(),
          verified_by: callerUser.id
        })
        .eq('id', document_id)

      if (verifyError) throw verifyError

      await logAudit({
        user_id: authUser.id,
        action: 'verify_user_document',
        resource_type: 'user_document',
        resource_id: document_id,
        status: 'success',
        ip_address: clientIP
      })

      return { success: true }
    }

    throw createError({ statusCode: 400, statusMessage: `Unknown action: ${action}` })

  } catch (err: any) {
    logger.error('❌ Error in documents manage:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, statusMessage: 'Document operation failed' })
  }
})
