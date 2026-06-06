// Stores a temporary logo upload from the marketing site preview.
// No auth required — this is a public branding demo feature.
// Files are stored under temp-logos/{uuid}.webp and can be cleaned up periodically.

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'

const STORAGE_BUCKET = 'tenant-assets'
const MAX_SIZE_BYTES = 250 * 1024 // 250 KB

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { logoData } = body as { logoData?: string }

  if (!logoData || typeof logoData !== 'string' || !logoData.startsWith('data:image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid logoData' })
  }

  // Strip data-URL prefix and decode
  const base64 = logoData.split(',')[1]
  if (!base64) throw createError({ statusCode: 400, statusMessage: 'Invalid base64 data' })

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Logo too large (max 250 KB)' })
  }

  const token = crypto.randomUUID()
  const storagePath = `temp-logos/${token}.webp`

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: 'image/webp', upsert: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Storage upload failed' })
  }

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath)

  return { token, publicUrl }
})
