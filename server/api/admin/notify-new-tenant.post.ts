// server/api/admin/notify-new-tenant.post.ts
// Sends notification to super-admins when a new tenant registers
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenantId, tenantName, contactEmail, customerNumber } = body

    if (!tenantId || !tenantName || !contactEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    logger.debug('📧 Sending new tenant notification:', { tenantId, tenantName })

    const supabase = getSupabaseAdmin()

    // Get super admin users (role = 'super_admin')
    const { data: superAdmins, error: adminError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('role', 'super_admin')
      .eq('is_active', true)

    if (adminError) {
      console.error('❌ Error fetching super admins:', adminError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching super admins'
      })
    }

    if (!superAdmins || superAdmins.length === 0) {
      logger.warn('⚠️ No super admins found to notify')
      return {
        success: true,
        message: 'No super admins to notify',
        notified: 0
      }
    }

    logger.debug(`✅ Found ${superAdmins.length} super admin(s) to notify`)

    // Send email to each super admin
    const notifications = []
    for (const admin of superAdmins) {
      try {
        // Use Supabase Edge Function or your email service
        const emailResponse = await $fetch('/api/email/send', {
          method: 'POST',
          body: {
            to: admin.email,
            subject: `Neue Tenant-Registrierung: ${tenantName}`,
            template: 'new-tenant-notification',
            data: {
              adminName: admin.first_name || 'Admin',
              tenantName: tenantName,
              tenantId: tenantId,
              contactEmail: contactEmail,
              customerNumber: customerNumber || 'N/A',
              registeredAt: new Date().toISOString(),
              dashboardLink: `${process.env.NUXT_PUBLIC_BASE_URL}/admin/tenants/${tenantId}`
            }
          }
        }).catch(err => {
          logger.warn(`⚠️ Email send failed for ${admin.email}:`, err)
          return null
        })

        if (emailResponse) {
          notifications.push({
            admin_email: admin.email,
            status: 'sent'
          })
          logger.debug(`✅ Notification sent to ${admin.email}`)
        } else {
          notifications.push({
            admin_email: admin.email,
            status: 'failed'
          })
        }
      } catch (notifyError) {
        console.error(`❌ Error notifying ${admin.email}:`, notifyError)
        notifications.push({
          admin_email: admin.email,
          status: 'error'
        })
      }
    }

    // Log notification attempt
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          notification_type: 'new_tenant_registration',
          tenant_id: tenantId,
          recipients: notifications.map(n => n.admin_email),
          sent_at: new Date().toISOString(),
          details: {
            tenant_name: tenantName,
            contact_email: contactEmail,
            customer_number: customerNumber,
            notifications: notifications
          }
        })
    } catch (logErr) {
      logger.warn('⚠️ Could not log notification:', logErr)
    }

    const sentCount = notifications.filter(n => n.status === 'sent').length

    return {
      success: true,
      message: `Notification sent to ${sentCount} super admin(s)`,
      notified: sentCount,
      total: superAdmins.length,
      notifications: notifications
    }

  } catch (error: any) {
    console.error('❌ Error sending tenant notification:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to send notification'
    })
  }
})

