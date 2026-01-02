import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { errorId, status, notes, assignedTo, resolvedBy } = body

    if (!errorId || !status) {
      throw createError({
        statusCode: 400,
        statusMessage: 'errorId and status are required'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Update error status
    const updateData: any = {
      status,
      ...(notes && { resolution_notes: notes }),
      ...(assignedTo && { assigned_to: assignedTo }),
      ...(status === 'fixed' && { resolved_at: new Date().toISOString() }),
      ...(status === 'fixed' && resolvedBy && { resolved_by: resolvedBy })
    }

    const { error: updateError } = await adminSupabase
      .from('error_logs')
      .update(updateData)
      .eq('id', errorId)

    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update error status'
      })
    }

    logger.debug('Error status updated:', { errorId, status })

    return {
      success: true,
      message: 'Error status updated'
    }
  } catch (err) {
    console.error('Error in error-update-status endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Internal server error'
    })
  }
})

