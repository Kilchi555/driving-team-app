// server/api/reminders/manage.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'

interface ManageRemindersBody {
  action: 'log-sent' | 'log-failed' | 'schedule' | 'get-logs' | 'mark-sent'
  channel?: 'email' | 'sms' | 'push'
  recipient?: string
  subject?: string
  body?: string
  error_message?: string
  appointmentId?: string
  userId?: string
  reminderId?: string
  reminderData?: any
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<ManageRemindersBody>(event)
    const { action } = body

    logger.debug('🔔 Reminders action:', action)

    const supabaseAdmin = getSupabaseAdmin()
    const authorization = getHeader(event, 'authorization')
    const token = authorization?.replace('Bearer ', '')

    if (!token) {
      throw new Error('No authorization token')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // ========== LOG SENT ==========
    if (action === 'log-sent') {
      if (!body.channel || !body.recipient) {
        throw new Error('Channel and recipient required')
      }

      logger.debug('📋 Logging sent reminder')

      const { data, error } = await supabaseAdmin
        .from('reminder_logs')
        .insert({
          channel: body.channel,
          recipient: body.recipient,
          subject: body.subject || null,
          body: body.body || null,
          status: 'sent',
          error_message: null,
          sent_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Reminder logged')

      return {
        success: true,
        data
      }
    }

    // ========== LOG FAILED ==========
    if (action === 'log-failed') {
      if (!body.channel || !body.recipient) {
        throw new Error('Channel and recipient required')
      }

      logger.debug('📋 Logging failed reminder')

      const { data, error } = await supabaseAdmin
        .from('reminder_logs')
        .insert({
          channel: body.channel,
          recipient: body.recipient,
          subject: body.subject || null,
          body: body.body || null,
          status: 'failed',
          error_message: body.error_message || null,
          sent_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Failed reminder logged')

      return {
        success: true,
        data
      }
    }

    // ========== SCHEDULE REMINDER ==========
    if (action === 'schedule') {
      if (!body.appointmentId || !body.reminderData) {
        throw new Error('Appointment ID and reminder data required')
      }

      logger.debug('⏰ Scheduling reminder')

      const { data, error } = await supabaseAdmin
        .from('scheduled_reminders')
        .insert({
          appointment_id: body.appointmentId,
          user_id: user.id,
          ...body.reminderData,
          scheduled_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Reminder scheduled')

      return {
        success: true,
        data
      }
    }

    // ========== GET LOGS ==========
    if (action === 'get-logs') {
      if (!body.appointmentId && !body.userId) {
        throw new Error('Either appointment ID or user ID required')
      }

      logger.debug('📋 Getting reminder logs')

      let query = supabaseAdmin
        .from('reminder_logs')
        .select('*')

      if (body.appointmentId) {
        query = query.eq('appointment_id', body.appointmentId)
      } else if (body.userId) {
        query = query.eq('user_id', body.userId)
      }

      const { data, error } = await query.order('sent_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Logs retrieved:', data?.length || 0)

      return {
        success: true,
        data: data || []
      }
    }

    // ========== MARK SENT ==========
    if (action === 'mark-sent') {
      if (!body.reminderId) {
        throw new Error('Reminder ID required')
      }

      logger.debug('✅ Marking reminder as sent')

      const { data, error } = await supabaseAdmin
        .from('scheduled_reminders')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', body.reminderId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      logger.debug('✅ Reminder marked as sent')

      return {
        success: true,
        data
      }
    }

    throw new Error('Unknown action: ' + action)

  } catch (error: any) {
    logger.error('❌ Error managing reminders:', error)
    throw createError({
      statusCode: 400,
      statusMessage: error.message || 'Failed to manage reminders'
    })
  }
})
