// server/api/cron/cleanup-expired-invitations.post.ts
// Cleans up expired and old staff invitations
// Run this daily via cron job or scheduled task
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  try {
    // ✅ Verify cron secret (security)
    const authHeader = getHeader(event, 'authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('⚠️ Unauthorized cron job attempt')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    logger.debug('🧹 Starting cleanup of expired staff invitations')

    const supabase = getSupabaseAdmin()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get expired invitations to delete
    const { data: expiredInvitations, error: fetchError } = await supabase
      .from('staff_invitations')
      .select('id, tenant_id, email, expires_at, created_at, status')
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString())

    if (fetchError) {
      console.error('❌ Error fetching expired invitations:', fetchError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching expired invitations'
      })
    }

    if (!expiredInvitations || expiredInvitations.length === 0) {
      logger.debug('✅ No expired invitations to clean up')
      return {
        success: true,
        message: 'No expired invitations found',
        deleted: 0,
        archived: 0
      }
    }

    logger.debug(`📋 Found ${expiredInvitations.length} expired invitation(s)`)

    // Separate by age: < 30 days = archive, >= 30 days = delete
    const toArchive = expiredInvitations.filter(inv => 
      new Date(inv.created_at) > thirtyDaysAgo
    )
    const toDelete = expiredInvitations.filter(inv => 
      new Date(inv.created_at) <= thirtyDaysAgo
    )

    let archivedCount = 0
    let deletedCount = 0

    // Archive recent expired invitations (mark as 'expired' instead of deleting)
    if (toArchive.length > 0) {
      const { error: archiveError } = await supabase
        .from('staff_invitations')
        .update({ 
          status: 'expired',
          updated_at: now.toISOString()
        })
        .in('id', toArchive.map(inv => inv.id))

      if (archiveError) {
        console.error('❌ Error archiving invitations:', archiveError)
      } else {
        archivedCount = toArchive.length
        logger.debug(`✅ Archived ${archivedCount} expired invitation(s)`)
      }
    }

    // Delete old expired invitations (>30 days)
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('staff_invitations')
        .delete()
        .in('id', toDelete.map(inv => inv.id))

      if (deleteError) {
        console.error('❌ Error deleting old invitations:', deleteError)
      } else {
        deletedCount = toDelete.length
        logger.debug(`🗑️ Deleted ${deletedCount} old invitation(s)`)
      }
    }

    // Log cleanup activity
    await logAudit({
      action: 'invitations_cleanup',
      resource_type: 'staff_invitation',
      status: 'success',
      details: {
        total_expired: expiredInvitations.length,
        archived_count: archivedCount,
        deleted_count: deletedCount,
        archived_ids: toArchive.map(inv => inv.id),
        deleted_ids: toDelete.map(inv => inv.id),
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    logger.debug(`✅ Cleanup completed: ${archivedCount} archived, ${deletedCount} deleted`)

    return {
      success: true,
      message: `Cleanup completed successfully`,
      total_expired: expiredInvitations.length,
      archived: archivedCount,
      deleted: deletedCount,
      duration_ms: Date.now() - startTime
    }

  } catch (error: any) {
    console.error('❌ Error in invitations cleanup:', error)

    // Log failed cleanup
    await logAudit({
      action: 'invitations_cleanup',
      resource_type: 'staff_invitation',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      details: {
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Cleanup failed'
    })
  }
})

