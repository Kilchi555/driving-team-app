// server/api/documents/list-user-documents.get.ts
// Lists all documents for a user directly from Supabase Storage
// No database queries needed - single source of truth is Storage!

import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'

interface DocumentFile {
  id: string
  name: string
  fileName: string
  fileType: string
  fileSize: number
  createdAt: string
  documentType: string
  category?: string
  side?: string
  storagePath: string
  publicUrl: string
}

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const userId = query.userId as string
    const tenantId = query.tenantId as string

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'userId is required'
      })
    }

    const role = authUser.role || ''
    const isPrivileged = (STAFF_ADMIN_ROLES as readonly string[]).includes(role)
    const callerDbId = authUser.db_user_id || authUser.profile?.id
    const callerTenant = authUser.tenant_id || authUser.profile?.tenant_id

    if (!isPrivileged && callerDbId !== userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden – can only list your own documents'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Staff may only list documents for users in their tenant
    if (isPrivileged && role !== 'super_admin') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('id, tenant_id')
        .eq('id', userId)
        .maybeSingle()
      if (!targetUser || targetUser.tenant_id !== callerTenant) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Forbidden – user not in your tenant'
        })
      }
    }

    logger.debug('📂 Listing documents for user:', userId)

    // List all files in user-documents/{userId}/ folder
    logger.debug(`📂 Listing files in bucket 'user-documents' folder '${userId}/'`)

    const { data: files, error: listError } = await supabase.storage
      .from('user-documents')
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' }
      })

    if (listError) {
      console.error('❌ Storage list error:', listError)
      logger.debug('❌ Storage list error details:', {
        message: listError.message,
        name: listError.name,
        cause: listError.cause
      })
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to list documents: ${listError.message}`
      })
    }

    logger.debug(`✅ Storage API returned: ${files?.length || 0} files`)
    if (files && files.length > 0) {
      logger.debug('📋 Files found:', files.map(f => ({ name: f.name, created_at: f.created_at })))
    } else {
      logger.debug('⚠️ No files found in folder - bucket might be empty or path incorrect')
    }

    if (!files || files.length === 0) {
      return {
        success: true,
        documents: [],
        count: 0
      }
    }

    // Simple parsing - just return all files with basic metadata
    // No category parsing needed
    const documents: DocumentFile[] = files.map(file => {
      const storagePath = `${userId}/${file.name}`
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/user-documents/${storagePath}`

      return {
        id: `${userId}-${file.name}`,
        name: file.name,
        fileName: file.name,
        fileType: file.metadata?.mimetype || 'unknown',
        fileSize: file.metadata?.size || 0,
        createdAt: file.created_at || new Date().toISOString(),
        documentType: 'document', // Generic type
        category: undefined,
        side: undefined,
        storagePath: storagePath,
        publicUrl: publicUrl
      }
    })

    // Sort by created_at (newest first)
    documents.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    logger.debug(`📄 Returning ${documents.length} documents (newest first)`)

    return {
      success: true,
      documents: documents,
      count: documents.length
    }

  } catch (error: any) {
    console.error('❌ Error listing documents:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to list documents'
    })
  }
})

