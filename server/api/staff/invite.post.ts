import { getSupabase } from '~/utils/supabase'
import { defineEventHandler, readBody, createError, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { firstName, lastName, email, phone, sendVia } = body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Vorname, Nachname und E-Mail sind erforderlich'
      })
    }

    // Get current user and tenant
    const supabase = getSupabase()
    
    // Get auth token from header
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Extract token from "Bearer <token>"
    const authToken = authHeader.replace('Bearer ', '')
    
    // Get user info from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    console.log('✅ User authenticated:', user.email, 'User ID:', user.id)

    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }
    
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user's tenant_id using service role
    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    console.log('👤 User profile query result:', { userProfile, profileError })

    if (profileError || !userProfile?.tenant_id) {
      console.error('❌ Profile error:', profileError)
      console.error('❌ User profile data:', userProfile)
      throw createError({
        statusCode: 403,
        statusMessage: `Kein Tenant gefunden für User: ${user.email}`
      })
    }

    console.log('✅ User profile found:', userProfile)

    // Check if user is admin
    if (userProfile.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Nur Admins können Einladungen versenden'
      })
    }

    // Generate invitation token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

    console.log('🎫 Creating invitation with token:', token.substring(0, 10) + '...')

    // Create invitation in database using service role to bypass RLS
    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('staff_invitations')
      .insert({
        tenant_id: userProfile.tenant_id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        invitation_token: token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creating invitation:', inviteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Erstellen der Einladung'
      })
    }

    console.log('✅ Invitation created:', invitation.id)

    // Generate invitation link (prefer deployment host, fallback to env/domain)
    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host')
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    const envBase = process.env.NUXT_PUBLIC_BASE_URL || process.env.BASE_URL
    const baseUrl = envBase || (host ? `${proto}://${host}` : 'https://www.simy.ch')
    // Use canonical register route
    const inviteLink = `${baseUrl}/register-staff?token=${token}`

    // Get tenant info for branding using service role
    const { data: tenant } = await serviceSupabase
      .from('tenants')
      .select('name, contact_email')
      .eq('id', userProfile.tenant_id)
      .single()

    const tenantName = tenant?.name || 'Driving Team'

    // Send invitation
    if (sendVia === 'email') {
      // Send email via existing Supabase Edge Function 'send-email' (same as reminders)
      console.log(`📧 Sending email to ${email} with link: ${inviteLink}`)
      
      try {
        const subject = `Einladung als Fahrlehrer - ${tenantName}`
        const bodyText = `Hallo ${firstName} ${lastName},\n\nSie wurden eingeladen, dem Team von ${tenantName} als Fahrlehrer beizutreten.\n\nRegistrierung: ${inviteLink}\n\nHinweis: Diese Einladung ist 7 Tage gültig.`

        // Use service role for edge function invocation
        const { data: emailResult, error: emailError } = await serviceSupabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject,
            body: bodyText
          },
          method: 'POST'
        })

        if (emailError) {
          console.error('❌ Email sending via send-email failed:', emailError)
          throw emailError
        }

        console.log('✅ Email sent via send-email:', emailResult)
        
        return {
          success: true,
          sentVia: 'email',
          email,
          inviteLink,
          emailId: emailResult?.messageId || emailResult?.id,
          message: 'Einladung per E-Mail gesendet'
        }

      } catch (emailError: any) {
        console.error('❌ Email sending failed:', emailError)
        // Return invitation data only; no other email fallback
        return {
          success: true,
          sentVia: 'email_failed',
          email,
          inviteLink,
          message: 'Einladung erstellt, aber E-Mail konnte nicht gesendet werden. Link: ' + inviteLink
        }
      }
      
    } else if (sendVia === 'sms' && phone) {
      // Send SMS via Twilio (using Edge Function)
      console.log(`📱 Sending SMS to ${phone} with link: ${inviteLink}`)
      
      try {
        const smsMessage = `Hallo ${firstName}! Sie wurden als Fahrlehrer bei ${tenantName} eingeladen. Registrierung: ${inviteLink}`

        // Use service role for edge function invocation
        const { data: smsResult, error: smsError } = await serviceSupabase.functions.invoke('send-twilio-sms', {
          body: {
            to: phone,
            message: smsMessage
          }
        })

        if (smsError) {
          console.error('❌ SMS sending failed:', smsError)
          throw smsError
        }

        console.log('✅ SMS sent via Twilio:', smsResult)

        // Log SMS using service role
        await serviceSupabase
          .from('sms_logs')
          .insert({
            to_phone: phone,
            message: smsMessage,
            twilio_sid: smsResult?.sid || 'unknown',
            status: 'sent',
            sent_at: new Date().toISOString(),
            tenant_id: userProfile.tenant_id
          })
        
        return {
          success: true,
          sentVia: 'sms',
          phone,
          inviteLink,
          smsId: smsResult?.sid,
          message: 'Einladung per SMS gesendet'
        }

      } catch (smsError: any) {
        console.error('❌ SMS sending failed:', smsError)
        // Return invitation data even if SMS fails
        return {
          success: true,
          sentVia: 'sms_failed',
          phone,
          inviteLink,
          message: 'Einladung erstellt, aber SMS konnte nicht gesendet werden. Link: ' + inviteLink
        }
      }
      
    } else {
      return {
        success: true,
        inviteLink,
        message: 'Einladung erstellt (kein Versand konfiguriert)'
      }
    }

  } catch (error: any) {
    console.error('Error in staff invitation:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Interner Serverfehler'
    })
  }
})

// Helper function to generate a secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

