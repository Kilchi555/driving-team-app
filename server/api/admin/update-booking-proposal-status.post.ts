import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildBookingProposalUpdate, type ProposalStatus } from '~/server/utils/proposal-followup'
import { logger } from '~/utils/logger'

type OutcomeType = 'booking_confirmed' | 'consultation_only' | 'potential_customer' | 'not_interested' | 'no_show'

const ALLOWED_OUTCOMES: OutcomeType[] = [
  'booking_confirmed', 'consultation_only', 'potential_customer', 'not_interested', 'no_show',
]

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

    const body = await readBody(event)
    const proposalId = body?.proposalId as string | undefined
    const status = body?.status as ProposalStatus | undefined
    const outcomeType = body?.outcomeType as OutcomeType | undefined

    if (!proposalId || !status) {
      throw createError({ statusCode: 400, statusMessage: 'proposalId and status are required' })
    }

    if (!['pending', 'contacted', 'accepted', 'rejected', 'expired'].includes(status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status value' })
    }

    if (outcomeType && !ALLOWED_OUTCOMES.includes(outcomeType)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid outcomeType value' })
    }

    const supabase = getSupabaseAdmin()

    // Ensure proposal belongs to this tenant and staff can only update own assigned proposals.
    let selectQuery = supabase
      .from('booking_proposals')
      .select(`
        id, tenant_id, staff_id, status, email, phone, category_code, created_by_user_id,
        gclid, gbraid, wbraid, fbclid, fbc, fbp, outcome_type
      `)
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)

    if (role === 'staff') {
      selectQuery = selectQuery.eq('staff_id', dbUserId)
    }

    const { data: existingProposal, error: selectError } = await selectQuery.maybeSingle()

    if (selectError) {
      logger.error('❌ Failed to validate booking proposal:', selectError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to validate proposal' })
    }

    if (!existingProposal) {
      throw createError({ statusCode: 404, statusMessage: 'Proposal not found' })
    }

    // potential_customer → one reminder in 30 days, including after status=accepted.
    // no_show → daily reminder until a different outcome replaces it.
    // accepted without a follow-up outcome clears any previously planned reminder.
    const { data: updatedProposal, error: updateError } = await supabase
      .from('booking_proposals')
      .update(buildBookingProposalUpdate({
        status,
        outcomeType: outcomeType ?? null,
        adminNotes: body?.adminNotes ?? null,
      }))
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .select('id, status, outcome_type, follow_up_at, follow_up_sent_at, updated_at')
      .single()

    if (updateError) {
      logger.error('❌ Failed to update booking proposal status:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to update proposal status' })
    }

    // Offline CRM outcome is a staff label only — never a Google Primary / Meta Purchase.
    // Binding booking conversion fires when a real appointment becomes confirmed.
    return {
      success: true,
      data: updatedProposal,
    }
  } catch (error: any) {
    logger.error('❌ Error in update-booking-proposal-status API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
