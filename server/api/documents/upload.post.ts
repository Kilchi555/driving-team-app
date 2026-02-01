// api/documents/upload.post.ts
import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from '#auth'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UploadRequest {
  action: string
  document_type?: string
  side?: 'front' | 'back'
  file_data?: string // base64 encoded file
  file_name?: string
  user_id?: string
}

export default defineEventHandler(async (event) => {
  try {
    const session = await getServerSession(event)
    if (!session?.user?.id) {
      throw new Error('Unauthorized')
    }

    const body = await readBody<UploadRequest>(event)
    const { action } = body

    if (action === 'upload-document') {
      return await uploadDocument(body, session.user.id)
    } else if (action === 'get-upload-url') {
      return await getUploadUrl(body, session.user.id)
    }

    throw new Error('Invalid action')
  } catch (err: any) {
    console.error('Document upload error:', err)
    return {
      success: false,
      error: err.message || 'Upload failed'
    }
  }
})

async function uploadDocument(body: UploadRequest, userId: string) {
  const { document_type, side, file_data, file_name } = body

  if (!document_type || !side || !file_data || !file_name) {
    throw new Error('Missing required fields')
  }

  // Decode base64 file data
  const buffer = Buffer.from(file_data, 'base64')

  // Generate storage path
  const ext = file_name.split('.').pop()
  const timestamp = Date.now()
  const path = `${userId}/${document_type}/${document_type}_${side}_${timestamp}.${ext}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('user-documents')
    .upload(path, buffer, {
      contentType: getContentType(ext),
      upsert: false
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('user-documents')
    .getPublicUrl(path)

  // Optional: Create a document record in database
  const { error: dbError } = await supabase
    .from('user_documents')
    .insert({
      user_id: userId,
      document_type,
      side,
      file_path: path,
      file_name,
      file_size: buffer.length,
      status: 'uploaded',
      uploaded_at: new Date().toISOString()
    })

  if (dbError) {
    console.error('Failed to create document record:', dbError)
    // Don't fail the upload if DB insert fails - file is already uploaded
  }

  return {
    success: true,
    data: {
      path,
      url: urlData.publicUrl,
      file_name,
      size: buffer.length
    }
  }
}

async function getUploadUrl(body: UploadRequest, userId: string) {
  const { document_type, side, file_name } = body

  if (!document_type || !side || !file_name) {
    throw new Error('Missing required fields')
  }

  const ext = file_name.split('.').pop()
  const timestamp = Date.now()
  const path = `${userId}/${document_type}/${document_type}_${side}_${timestamp}.${ext}`

  // In a real app, you might generate a presigned URL here
  // For now, we'll return the path for client-side upload
  return {
    success: true,
    data: {
      path,
      bucket: 'user-documents'
    }
  }
}

function getContentType(ext?: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp'
  }
  return mimeTypes[ext?.toLowerCase() || ''] || 'application/octet-stream'
}
