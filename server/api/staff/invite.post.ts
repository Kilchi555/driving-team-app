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

    // Generate invitation link
    // Priority: 1. Environment variable, 2. Production domain (simy.ch), 3. Request host
    const envBase = process.env.NUXT_PUBLIC_BASE_URL || process.env.BASE_URL
    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host')
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    
    // Prefer production URL over localhost
    let baseUrl: string
    if (envBase) {
      baseUrl = envBase
    } else if (host && !host.includes('localhost')) {
      // Use request host only if it's NOT localhost
      baseUrl = `${proto}://${host}`
    } else {
      // Default to production domain
      baseUrl = 'https://www.simy.ch'
    }
    
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
        
        // Professional HTML email with button
        const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                Willkommen im Team!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hallo <strong>${firstName} ${lastName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                wir freuen uns, Sie im Team von <strong>${tenantName}</strong> begrüssen zu dürfen! 
                Sie wurden als Fahrlehrer eingeladen.
              </p>
              
              <p style="margin: 0 0 30px; color: #555555; font-size: 16px; line-height: 1.6;">
                Um Ihre Registrierung abzuschliessen, klicken Sie bitte auf den folgenden Button:
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${inviteLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25);">
                      Jetzt registrieren
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.6;">
                Falls der Button nicht funktioniert, können Sie auch diesen Link kopieren und in Ihrem Browser öffnen:
              </p>
              
              <p style="margin: 0 0 30px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #2563eb; border-radius: 4px; word-break: break-all;">
                <a href="${inviteLink}" style="color: #2563eb; text-decoration: none; font-size: 14px;">${inviteLink}</a>
              </p>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      <strong>Wichtig:</strong> Diese Einladung ist 7 Tage gültig. Bitte schliessen Sie Ihre Registrierung zeitnah ab.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Bei Fragen stehen wir Ihnen gerne zur Verfügung.
              </p>
              
              <p style="margin: 20px 0 0; color: #555555; font-size: 16px; line-height: 1.6;">
                Freundliche Grüsse<br>
                <strong>${tenantName}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese Nachricht.
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} ${tenantName}. Alle Rechte vorbehalten.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
        
        const bodyText = `Hallo ${firstName} ${lastName},

wir freuen uns, Sie im Team von ${tenantName} begrüssen zu dürfen! Sie wurden als Fahrlehrer eingeladen.

Um Ihre Registrierung abzuschliessen, öffnen Sie bitte folgenden Link:

${inviteLink}

Wichtig: Diese Einladung ist 7 Tage gültig. Bitte schliessen Sie Ihre Registrierung zeitnah ab.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Freundliche Grüsse
${tenantName}`

        // Use service role for edge function invocation
        const { data: emailResult, error: emailError } = await serviceSupabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject,
            body: bodyText,
            html: bodyHtml
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

