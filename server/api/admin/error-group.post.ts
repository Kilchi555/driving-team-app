import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch all errors without group_hash
    const { data: errors, error: fetchError } = await adminSupabase
      .from('error_logs')
      .select('id, message, component')
      .is('group_hash', null)

    if (fetchError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch errors'
      })
    }

    // Group errors and update with hash
    let updated = 0
    for (const error of errors || []) {
      // Create hash from message + component
      const hashInput = `${error.message}|${error.component}`
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16)

      const { error: updateError } = await adminSupabase
        .from('error_logs')
        .update({ group_hash: hash })
        .eq('id', error.id)

      if (!updateError) {
        updated++
      }
    }

    logger.debug('Error grouping completed:', { total: errors?.length, updated })

    return {
      success: true,
      total: errors?.length || 0,
      updated
    }
  } catch (err) {
    console.error('Error in error-group endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Internal server error'
    })
  }
})

