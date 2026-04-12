import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ POST /api/exams/save-result
 * 
 * Secure API to save exam result and mark appointment as completed
 * 
 * Body:
 *   - appointment_id: string (UUID)
 *   - passed: boolean
 *   - examiner_id: string (UUID, optional)
 *   - examiner_behavior_rating: number (1-6, optional)
 *   - examiner_behavior_notes: string (optional)
 *   - exam_date: string (ISO datetime)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Input Validation
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Get user from users table to get tenant_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    const tenantId = user.tenant_id

    // ✅ 2. INPUT VALIDATION
    const body = await readBody(event)
    const {
      appointment_id,
      passed,
      examiner_id,
      examiner_behavior_rating,
      examiner_behavior_notes,
      exam_date
    } = body

    if (!appointment_id || typeof appointment_id !== 'string') {
      throw createError({
        statusCode: 400,
        message: 'appointment_id is required and must be a string'
      })
    }

    if (typeof passed !== 'boolean') {
      throw createError({
        statusCode: 400,
        message: 'passed must be a boolean'
      })
    }

    if (examiner_behavior_rating !== null && examiner_behavior_rating !== undefined) {
      if (typeof examiner_behavior_rating !== 'number' || examiner_behavior_rating < 1 || examiner_behavior_rating > 6) {
        throw createError({
          statusCode: 400,
          message: 'examiner_behavior_rating must be a number between 1 and 6'
        })
      }
    }

    // ✅ 3. VERIFY APPOINTMENT BELONGS TO TENANT + load customer & location for email
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, tenant_id, user_id, location_id')
      .eq('id', appointment_id)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      logger.error('❌ Appointment not found or unauthorized:', { appointment_id, tenantId })
      throw createError({
        statusCode: 403,
        message: 'Appointment not found or unauthorized'
      })
    }

    // ✅ 4. SAVE EXAM RESULT
    const examData = {
      appointment_id,
      examiner_id: examiner_id || null,
      passed,
      examiner_behavior_rating: examiner_behavior_rating || null,
      examiner_behavior_notes: examiner_behavior_notes || null,
      exam_date,
      tenant_id: tenantId
    }

    const { data: examResult, error: insertError } = await supabase
      .from('exam_results')
      .insert(examData)
      .select()
      .single()

    if (insertError) {
      logger.error('❌ Error inserting exam result:', insertError)
      throw createError({
        statusCode: 500,
        message: 'Failed to save exam result'
      })
    }

    // ✅ 5. MARK APPOINTMENT AS COMPLETED
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment_id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('❌ Error updating appointment:', updateError)
      throw createError({
        statusCode: 500,
        message: 'Failed to update appointment'
      })
    }

    logger.debug('✅ Exam result saved and appointment marked as completed:', {
      userId: user.id,
      appointmentId: appointment_id,
      examResultId: examResult.id
    })

    // ✅ 6. SEND CONGRATULATIONS EMAIL (only if passed)
    if (passed) {
      try {
        const [customerRes, locationRes, tenantRes] = await Promise.all([
          supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', appointment.user_id)
            .single(),
          appointment.location_id
            ? supabase.from('locations').select('name, google_place_id').eq('id', appointment.location_id).single()
            : Promise.resolve({ data: null }),
          supabase.from('tenants').select('name, slug, primary_color, logo_wide_url, logo_url, google_review_places').eq('id', tenantId).single()
        ])

        const customer = customerRes.data
        const location = locationRes.data
        const tenant = tenantRes.data

        if (customer?.email) {
          const { sendEmail } = await import('~/server/utils/email')

          const reviewPlaces: Array<{ name: string; place_id: string }> =
            Array.isArray((tenant as any)?.google_review_places) && (tenant as any).google_review_places.length > 0
              ? (tenant as any).google_review_places
              : []

          const primaryColor = tenant?.primary_color || '#2563eb'
          const tenantName   = tenant?.name || 'Driving Team'
          const tenantSlug   = (tenant as any)?.slug || ''
          const affiliateUrl = tenantSlug
            ? `https://simy.ch/affiliate-dashboard?tenant=${tenantSlug}`
            : 'https://simy.ch/affiliate-dashboard'
          const customerUrl  = tenantSlug ? `https://www.simy.ch/${tenantSlug}` : 'https://www.simy.ch/login'
          const firstName    = customer.first_name
          const logoHtml     = tenant?.logo_wide_url || tenant?.logo_url
            ? `<img src="${tenant?.logo_wide_url || tenant?.logo_url}" alt="${tenantName}" style="height:40px;max-width:180px;object-fit:contain;display:block;margin:0 auto 24px">`
            : `<div style="display:inline-block;width:44px;height:44px;border-radius:10px;background:${primaryColor};color:white;font-size:22px;font-weight:700;line-height:44px;text-align:center;margin:0 auto 24px">${tenantName.charAt(0).toUpperCase()}</div>`

          const reviewSection = reviewPlaces.length > 0 ? `
            <div style="margin:28px 0">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;text-align:center">
                Wir würden uns sehr freuen, wenn du dir kurz Zeit nimmst und uns eine Google-Bewertung hinterlässt –<br>das hilft anderen Fahrschüler:innen, uns zu finden. 🙏
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${reviewPlaces.map(p => `<tr><td style="padding:5px 0;text-align:center">
                  <a href="https://search.google.com/local/writereview?placeid=${p.place_id}"
                     style="display:inline-block;background:${primaryColor};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;min-width:200px;text-align:center">
                    ⭐ Bewertung schreiben – ${p.name}
                  </a>
                </td></tr>`).join('\n')}
              </table>
              <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;text-align:center">Dauert nur 1 Minute – wir sind dankbar für jedes Feedback!</p>
            </div>` : `
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
              Herzlichen Glückwunsch – wir freuen uns mit dir!
            </p>`

          const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="text-align:center;padding-bottom:8px">${logoHtml}</td></tr>
        <tr><td style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">

          <!-- Header -->
          <div style="background:${primaryColor};padding:32px 32px 24px;text-align:center">
            <div style="font-size:48px;margin-bottom:8px">🏆</div>
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff">Herzlichen Glückwunsch!</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${tenantName}</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6">
              Hallo ${firstName},
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
              du hast deine Führerprüfung <strong style="color:${primaryColor}">bestanden</strong>! 🎉<br>
              Wir von ${tenantName} gratulieren dir ganz herzlich – du hast es verdient!
            </p>
            ${reviewSection}
          </div>

          <!-- Footer -->
          <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a></p>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

          await sendEmail({
            to: customer.email,
            subject: `🏆 Herzlichen Glückwunsch – Prüfung bestanden!`,
            html,
            senderName: tenantName
          })

          logger.debug('✅ Congratulations email sent to:', customer.email)

          // ── Queue a follow-up review reminder for 7 days later ──
          try {
            const sendAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

            const followUpReviewSection = reviewPlaces.length > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0">
                ${reviewPlaces.map(p => `<tr><td style="padding:5px 0;text-align:center">
                  <a href="https://search.google.com/local/writereview?placeid=${p.place_id}"
                     style="display:inline-block;background:${primaryColor};color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;min-width:200px;text-align:center">
                    ⭐ Bewertung – ${p.name}
                  </a>
                </td></tr>`).join('\n')}
              </table>` : ''

            const followUpHtml = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="text-align:center;padding-bottom:8px">${logoHtml}</td></tr>
        <tr><td style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <div style="background:${primaryColor};padding:28px 32px 20px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">⭐</div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff">Wie war deine Erfahrung?</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">${tenantName}</p>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
              Hallo ${firstName},
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
              vor einer Woche hast du deine Prüfung bestanden – herzlichen Glückwunsch nochmal! 🎉
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
              Wenn du zufrieden warst und uns weiterempfehlen möchtest, würden wir uns über eine kurze Google-Bewertung sehr freuen. Das hilft anderen, uns zu finden und gibt uns wichtiges Feedback.
            </p>
            ${followUpReviewSection}
            <p style="margin:16px 0 24px;font-size:14px;color:#6b7280;line-height:1.6;text-align:center">
              Falls du bereits eine Bewertung hinterlassen hast – vielen herzlichen Dank! 🙏<br>
              Das bedeutet uns sehr viel und hilft anderen, den richtigen Weg zu uns zu finden.
            </p>
            <div style="margin:0 0 28px;background:#f9fafb;border-radius:10px;padding:20px 24px;border-top:3px solid ${primaryColor}">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Übrigens</p>
              <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#374151">Wusstest du schon, dass du bares Geld mit Weiterempfehlung verdienen kannst? 💸</p>
              <p style="margin:0 0 14px;font-size:14px;color:#6b7280;line-height:1.6">
                Mit unserem Empfehlungsprogramm erhältst du für jede Person, die du zu uns schickst, eine Gutschrift auf dein Konto – die du jederzeit auszahlen lassen kannst.
              </p>
              <a href="${affiliateUrl}"
                 style="display:inline-block;background:${primaryColor};color:#ffffff;padding:11px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">
                Empfehlungs-Dashboard →
              </a>
            </div>
            <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;text-align:center">
              Alles Gute auf deinen weiteren Fahrten! 🚗
            </p>
          </div>
          <div style="padding:16px 32px 24px;text-align:center;border-top:1px solid #f3f4f6">
            <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

            await supabase.from('outbound_messages_queue').insert({
              tenant_id:       tenantId,
              channel:         'email',
              recipient_email: customer.email,
              subject:         `⭐ Hinterlasse uns eine Bewertung – wir freuen uns auf dein Feedback!`,
              body:            followUpHtml,
              status:          'pending',
              send_at:         sendAt.toISOString(),
              context_data: {
                stage:      'exam_passed_review_followup',
                user_id:    appointment.user_id,
                tenant_name: tenantName,
              },
            })

            logger.debug('📅 Follow-up review email queued for:', sendAt.toISOString())

            // ── Mail 3: Affiliate-only, 30 days later ──────────────────
            const sendAt30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

            const affiliateHtml = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
        <tr><td style="text-align:center;padding-bottom:8px">${logoHtml}</td></tr>
        <tr><td style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
          <div style="background:${primaryColor};padding:28px 32px 20px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">💸</div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff">Geld verdienen mit Empfehlungen</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">${tenantName}</p>
          </div>
          <div style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
              Hallo ${firstName},
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
              du hast deinen Führerausweis jetzt seit einem Monat – herzlichen Glückwunsch nochmal! 🎉
            </p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
              Hast du Freunde oder Bekannte, die noch die Fahrschule vor sich haben? Mit unserem Empfehlungsprogramm verdienst du ganz einfach Geld:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr>
                <td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;margin-bottom:10px">
                  <p style="margin:0;font-size:14px;color:#374151;font-weight:600">① Link teilen</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Teile deinen persönlichen Link mit Freunden.</p>
                </td>
              </tr>
              <tr><td style="height:8px"></td></tr>
              <tr>
                <td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
                  <p style="margin:0;font-size:14px;color:#374151;font-weight:600">② Freund bucht</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Sobald dein Freund eine Fahrstunde bezahlt, wird der Betrag auf deinem Guthaben-Konto gutgeschrieben.</p>
                </td>
              </tr>
              <tr><td style="height:8px"></td></tr>
              <tr>
                <td style="padding:12px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e">
                  <p style="margin:0;font-size:14px;color:#374151;font-weight:600">③ Geld auszahlen</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#6b7280">Du kannst die Auszahlung deines Guthabens jederzeit per Banküberweisung beantragen.</p>
                </td>
              </tr>
            </table>  

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:5px 0;text-align:center">
                <a href="${affiliateUrl}"
                   style="display:inline-block;background:${primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;min-width:220px;text-align:center">
                  💸 Jetzt Geld verdienen
                </a>
              </td></tr>
              <tr><td style="padding:8px 0;text-align:center">
                <a href="${customerUrl}"
                   style="display:inline-block;color:${primaryColor};padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
                  Zum Kundenkonto →
                </a>
              </td></tr>
            </table>

          </div>
          <div style="padding:16px 32px 24px;text-align:center;border-top:1px solid #f3f4f6">
            <p style="margin:0;font-size:12px;color:#9ca3af">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af">Simy.ch</a></p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

            await supabase.from('outbound_messages_queue').insert({
              tenant_id:       tenantId,
              channel:         'email',
              recipient_email: customer.email,
              subject:         `💸 Freunde empfehlen &amp; Geld verdienen – so funktioniert's`,
              body:            affiliateHtml,
              status:          'pending',
              send_at:         sendAt30.toISOString(),
              context_data: {
                stage:       'exam_passed_affiliate_promo',
                user_id:     appointment.user_id,
                tenant_name: tenantName,
              },
            })

            logger.debug('📅 Affiliate promo email queued for:', sendAt30.toISOString())
          } catch (queueError: any) {
            logger.warn('⚠️ Could not queue follow-up review email (non-critical):', queueError.message)
          }
        }
      } catch (emailError: any) {
        logger.warn('⚠️ Could not send congratulations email (non-critical):', emailError.message)
      }
    }

    return {
      success: true,
      data: examResult
    }

  } catch (error: any) {
    logger.error('❌ Error in save-exam-result API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to save exam result'
    })
  }
})
