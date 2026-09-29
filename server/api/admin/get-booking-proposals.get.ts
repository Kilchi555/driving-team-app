import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { mergeHighlightedProposal } from '~/server/utils/proposal-followup'
import { logger } from '~/utils/logger'

const HIGHLIGHT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PROPOSAL_COLUMNS = `
        id,
        category_code,
        duration_minutes,
        preferred_time_slots,
        first_name,
        last_name,
        email,
        phone,
        notes,
        status,
        created_at,
        street,
        house_number,
        postal_code,
        city,
        location:locations(id, name),
        staff:users!staff_id(id, first_name, last_name)
      `

export default defineEventHandler(async (event) => {
  try {
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const tenantId = authUser.tenant_id
    const dbUserId = authUser.db_user_id
    const role = authUser.role

    if (!tenantId || !dbUserId || !role) {
      throw createError({ statusCode: 403, statusMessage: 'User profile incomplete' })
    }

    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(role)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' })
    }

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('booking_proposals')
      .select(PROPOSAL_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Staff should only see their own assigned proposals.
    if (role === 'staff') {
      query = query.eq('staff_id', dbUserId)
    }

    const { data, error } = await query

    if (error) {
      logger.error('❌ Error fetching booking proposals:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch booking proposals' })
    }

    const pending = data || []
    const rawHighlight = getQuery(event).highlight
    const highlightId = typeof rawHighlight === 'string' && HIGHLIGHT_ID.test(rawHighlight)
      ? rawHighlight
      : null

    // Deep link from a follow-up mail. The row may already be accepted.
    // Same tenant (and staff assignment) filters as the open list. Not a second queue.
    let highlighted: (typeof pending)[number] | null = null
    if (highlightId && !pending.some((row: { id: string }) => row.id === highlightId)) {
      let highlightQuery = supabase
        .from('booking_proposals')
        .select(PROPOSAL_COLUMNS)
        .eq('id', highlightId)
        .eq('tenant_id', tenantId)
      if (role === 'staff') {
        highlightQuery = highlightQuery.eq('staff_id', dbUserId)
      }
      const { data: extra, error: highlightError } = await highlightQuery.maybeSingle()
      if (highlightError) {
        logger.warn('⚠️ Failed to load highlighted booking proposal:', highlightError.message)
      } else {
        highlighted = extra
      }
    }

    return {
      success: true,
      data: mergeHighlightedProposal(pending, highlighted)
    }
  } catch (error: unknown) {
    logger.error('❌ Error in get-booking-proposals API:', error)
    const known = error as { statusCode?: number; statusMessage?: string }
    throw createError({
      statusCode: known.statusCode || 500,
      statusMessage: known.statusMessage || 'Internal server error'
    })
  }
})
