import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

type AllowedProposalStatus = 'pending' | 'contacted' | 'accepted' | 'rejected' | 'expired'

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
    const status = body?.status as AllowedProposalStatus | undefined

    if (!proposalId || !status) {
      throw createError({ statusCode: 400, statusMessage: 'proposalId and status are required' })
    }

    if (!['pending', 'contacted', 'accepted', 'rejected', 'expired'].includes(status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status value' })
    }

    const supabase = getSupabaseAdmin()

    // Ensure proposal belongs to this tenant and staff can only update own assigned proposals.
    let selectQuery = supabase
      .from('booking_proposals')
      .select('id, tenant_id, staff_id, status')
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

    const { data: updatedProposal, error: updateError } = await supabase
      .from('booking_proposals')
      .update({
        status,
        admin_notes: body?.adminNotes ?? null
      })
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .select('id, status, updated_at')
      .single()

    if (updateError) {
      logger.error('❌ Failed to update booking proposal status:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to update proposal status' })
    }

    return {
      success: true,
      data: updatedProposal
    }
  } catch (error: any) {
    logger.error('❌ Error in update-booking-proposal-status API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
