import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ✅ SECURITY: Requires authenticated staff/admin user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabase = getSupabaseAdmin()

    const { data: profile } = await supabase
      .from('users')
      .select('role, tenant_id, id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!profile || !['staff', 'admin', 'super_admin'].includes(profile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Staff/Admin access required' })
    }

    const body = await readBody<{
      action: 'upload-evaluation-content' | 'get-current-user-id'
      file?: {
        data: string // base64 encoded
        name: string
        type: string
      }
      fileName?: string
      filePath?: string
    }>(event)

    const { action } = body

    if (!action) {
      throw new Error('Missing required field: action')
    }

    logger.debug(`🔒 Processing secure action: ${action}`)

    let result

    if (action === 'upload-evaluation-content') {
      try {
        if (!body.file || !body.fileName) {
          throw new Error('Missing required fields: file, fileName')
        }

        const { data: file, name: fileName } = body.file
        const filePath = `evaluation-content/${fileName}`

        const buffer = Buffer.from(file, 'base64')

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evaluation-content')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: body.file.type
          })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('evaluation-content')
          .getPublicUrl(filePath)

        result = {
          success: true,
          data: {
            filePath: uploadData.path,
            publicUrl: urlData?.publicUrl,
            uploadedAt: new Date().toISOString()
          }
        }
      } catch (err: any) {
        throw new Error(`Failed to upload evaluation content: ${err.message}`)
      }
    } else if (action === 'get-current-user-id') {
      // Returns the DB user ID of the authenticated caller
      result = {
        success: true,
        data: {
          userId: profile.id,
          authUserId: authUser.id
        }
      }
    } else {
      throw new Error(`Invalid action: ${action}`)
    }

    logger.debug(`✅ Secure action successful: ${action}`)
    return result
  } catch (err: any) {
    logger.error('❌ Error in secure operations endpoint:', err)
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || `Failed to process secure request`
    })
  }
})
