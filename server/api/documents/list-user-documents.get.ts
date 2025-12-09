// server/api/documents/list-user-documents.get.ts
// Lists all documents for a user directly from Supabase Storage
// No database queries needed - single source of truth is Storage!

import { createClient } from '@supabase/supabase-js'

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
    const query = getQuery(event)
    const userId = query.userId as string
    const tenantId = query.tenantId as string

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'userId is required'
      })
    }

    logger.debug('📂 Listing documents for user:', userId)

    const supabaseUrl = process.env.SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // List all files in user-documents/{userId}/ folder
    const { data: files, error: listError } = await supabase.storage
      .from('user-documents')
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' }
      })

    if (listError) {
      console.error('❌ Storage list error:', listError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to list documents: ${listError.message}`
      })
    }

    logger.debug(`✅ Found ${files?.length || 0} files for user ${userId}`)

    if (!files || files.length === 0) {
      return {
        success: true,
        documents: [],
        count: 0
      }
    }

    // Parse file names to extract metadata
    // File format: {documentType}_{category}_{timestamp}.{ext}
    // Examples:
    //   lernfahrausweis_B_1234567890.jpg
    //   license_front_1234567890.jpg
    //   license_back_1234567890.jpg
    const documents: DocumentFile[] = files.map(file => {
      const parts = file.name.split('_')
      const name = parts.slice(0, -1).join('_') // Remove timestamp
      const fileType = file.metadata?.mimetype || 'unknown'
      const fileSize = file.metadata?.size || 0

      // Parse document type and category from filename
      let documentType = 'unknown'
      let category: string | undefined
      let side: string | undefined

      if (file.name.startsWith('lernfahrausweis_')) {
        documentType = 'lernfahrausweis'
        // lernfahrausweis_B_1234567890.jpg → category = 'B'
        const catMatch = file.name.match(/lernfahrausweis_([A-Z]+)_/)
        if (catMatch) category = catMatch[1]
        side = 'front' // Lernfahrausweis are typically front-side
      } else if (file.name.startsWith('license_')) {
        documentType = 'fuehrerschein'
        // license_front_1234567890.jpg → side = 'front'
        side = file.name.includes('_front_') ? 'front' : file.name.includes('_back_') ? 'back' : 'front'
      }

      const storagePath = `${userId}/${file.name}`
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/user-documents/${storagePath}`

      return {
        id: `${userId}-${file.name}`, // Unique ID based on path
        name: file.name,
        fileName: file.name,
        fileType: fileType,
        fileSize: fileSize,
        createdAt: file.created_at || new Date().toISOString(),
        documentType: documentType,
        category: category,
        side: side,
        storagePath: storagePath,
        publicUrl: publicUrl
      }
    })

    logger.debug(`📄 Parsed ${documents.length} documents:`, documents.map(d => ({
      type: d.documentType,
      category: d.category,
      side: d.side,
      name: d.name
    })))

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

