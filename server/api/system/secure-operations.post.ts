import { defineEventHandler, readBody } from 'h3'
import { getServerSession } from '#auth'
import { useSupabaseAdmin } from '~/composables/useSupabaseAdmin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const session = await getServerSession(event)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Get Supabase admin
    const supabase = useSupabaseAdmin()

    // Parse request body
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
      // Upload evaluation content images to storage
      try {
        if (!body.file || !body.fileName) {
          throw new Error('Missing required fields: file, fileName')
        }

        const { data: file, name: fileName } = body.file
        const filePath = `evaluation-content/${fileName}`

        // Decode base64 file data
        const buffer = Buffer.from(file, 'base64')

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evaluation-content')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: body.file.type
          })

        if (uploadError) throw uploadError

        // Get public URL
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
      // Get current authenticated user ID (from session)
      try {
        const userId = session?.user?.id

        if (!userId) {
          throw new Error('No authenticated user found in session')
        }

        result = {
          success: true,
          data: {
            userId,
            email: session?.user?.email
          }
        }
      } catch (err: any) {
        throw new Error(`Failed to get user ID: ${err.message}`)
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
