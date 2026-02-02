// server/api/staff/get-document-requirements.post.ts
// Get document requirements for student categories

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { categoryCodes } = body

  if (!categoryCodes || !Array.isArray(categoryCodes) || categoryCodes.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'categoryCodes array is required and must not be empty'
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    // Load categories with their document requirements
    const { data: categories, error } = await supabase
      .from('categories')
      .select('code, name, document_requirements')
      .in('code', categoryCodes)
      .eq('is_active', true)

    if (error) throw error

    return {
      success: true,
      data: categories || []
    }
  } catch (err: any) {
    console.error('❌ Error loading document requirements:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load document requirements'
    })
  }
})
