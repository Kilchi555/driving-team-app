import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { uploadProposalDerivedBookingConversion } from '~/server/utils/proposal-booking-conversion'

type AllowedProposalStatus = 'pending' | 'contacted' | 'accepted' | 'rejected' | 'expired'
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
    const status = body?.status as AllowedProposalStatus | undefined
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
        gclid, gbraid, wbraid, outcome_type
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

    // Determine follow-up schedule based on outcome
    // potential_customer → one-time reminder in 30 days
    // no_show → daily reminder until another outcome is chosen
    const followUpAt =
      outcomeType === 'potential_customer' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : outcomeType === 'no_show' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data: updatedProposal, error: updateError } = await supabase
      .from('booking_proposals')
      .update({
        status,
        admin_notes: body?.adminNotes ?? null,
        ...(outcomeType ? { outcome_type: outcomeType } : {}),
        ...(outcomeType === 'potential_customer' || outcomeType === 'no_show'
          ? { follow_up_at: followUpAt, follow_up_sent_at: null }
          : outcomeType ? { follow_up_at: null, follow_up_sent_at: null }
          : {}),
      })
      .eq('id', proposalId)
      .eq('tenant_id', tenantId)
      .select('id, status, outcome_type, follow_up_at, updated_at')
      .single()

    if (updateError) {
      logger.error('❌ Failed to update booking proposal status:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to update proposal status' })
    }

    // Offline close: Ads inquiry → staff confirms booking without online checkout.
    // Upload Booking Completed once (deduped via proposal-booking-<id>).
    let adsUpload: string | null = null
    if (
      outcomeType === 'booking_confirmed'
      && existingProposal.outcome_type !== 'booking_confirmed'
      && (existingProposal.gclid || existingProposal.gbraid || existingProposal.wbraid)
    ) {
      try {
        adsUpload = await uploadProposalDerivedBookingConversion({
          proposal: {
            id: existingProposal.id,
            tenant_id: existingProposal.tenant_id,
            gclid: existingProposal.gclid,
            gbraid: existingProposal.gbraid,
            wbraid: existingProposal.wbraid,
            email: existingProposal.email,
            phone: existingProposal.phone,
          },
        })
      } catch (err: any) {
        logger.warn('⚠️ Proposal booking_confirmed Ads upload failed (non-critical):', err?.message ?? err)
        adsUpload = 'failed'
      }
    }

    return {
      success: true,
      data: updatedProposal,
      ...(adsUpload ? { google_ads_upload: adsUpload } : {}),
    }
  } catch (error: any) {
    logger.error('❌ Error in update-booking-proposal-status API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})
