// server/utils/send-adjustment-notification.ts
// Email notifications for appointment price adjustments

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import type { PriceAdjustmentResult } from './appointment-price-adjustment'

interface AdjustmentEmailData {
  userId: string
  appointmentId: string
  adjustment: PriceAdjustmentResult
  oldDuration: number
  newDuration: number
}

/**
 * Send email notification for price adjustment
 */
export async function sendAdjustmentNotificationEmail(
  data: AdjustmentEmailData
): Promise<{ success: boolean; error?: string }> {
  const { userId, appointmentId, adjustment, oldDuration, newDuration } = data
  const supabase = getSupabaseAdmin()

  try {
    // 1. Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      logger.error('AdjustmentEmail', 'User not found:', userId)
      return { success: false, error: 'User not found' }
    }

    // 2. Get updated credit balance
    const { data: credits } = await supabase
      .from('student_credits')
      .select('credits_rappen')
      .eq('user_id', userId)
      .single()

    const creditBalance = credits?.credits_rappen || 0
    const creditBalanceCHF = (creditBalance / 100).toFixed(2)

    // 3. Format amounts
    const adjustmentAmountCHF = (Math.abs(adjustment.adjustmentAmount) / 100).toFixed(2)
    const oldPriceCHF = (adjustment.oldPrice / 100).toFixed(2)
    const newPriceCHF = (adjustment.newPrice / 100).toFixed(2)

    // 4. Build email content based on adjustment type
    let subject: string
    let emailHtml: string
    let emailText: string

    if (adjustment.adjustmentType === 'credit') {
      // GUTSCHRIFT - Zeit verringert
      subject = `Gutschrift für Terminänderung - CHF ${adjustmentAmountCHF}`

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">💰 Gutschrift erhalten</h2>
          
          <p>Hallo ${user.first_name || ''},</p>
          
          <p>Ihr Termin wurde von <strong>${oldDuration} Minuten</strong> auf <strong>${newDuration} Minuten</strong> angepasst.</p>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">
              <strong>Gutschrift: CHF ${adjustmentAmountCHF}</strong>
            </p>
            <p style="margin: 10px 0 0 0; color: #666;">
              Ursprünglicher Preis: CHF ${oldPriceCHF}<br>
              Neuer Preis: CHF ${newPriceCHF}
            </p>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              📊 <strong>Ihr neues Guthaben:</strong> CHF ${creditBalanceCHF}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
              Dieses Guthaben wird automatisch bei Ihrer nächsten Lektion verrechnet.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Bei Fragen stehen wir Ihnen gerne zur Verfügung.
          </p>
          
          <p style="margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Beste Grüsse<br>
            Ihr Fahrschul-Team
          </p>
        </div>
      `

      emailText = `
Gutschrift erhalten

Hallo ${user.first_name || ''},

Ihr Termin wurde von ${oldDuration} Minuten auf ${newDuration} Minuten angepasst.

Gutschrift: CHF ${adjustmentAmountCHF}
Ursprünglicher Preis: CHF ${oldPriceCHF}
Neuer Preis: CHF ${newPriceCHF}

Ihr neues Guthaben: CHF ${creditBalanceCHF}
Dieses Guthaben wird automatisch bei Ihrer nächsten Lektion verrechnet.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Beste Grüsse
Ihr Fahrschul-Team
      `
    } else {
      // BELASTUNG - Zeit erhöht
      const isNegative = creditBalance < 0
      const balanceEmoji = isNegative ? '⚠️' : '📊'

      subject = `Terminverlängerung - Aufpreis CHF ${adjustmentAmountCHF}`

      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">📝 Terminverlängerung</h2>
          
          <p>Hallo ${user.first_name || ''},</p>
          
          <p>Ihr Termin wurde von <strong>${oldDuration} Minuten</strong> auf <strong>${newDuration} Minuten</strong> verlängert.</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">
              <strong>Aufpreis: CHF ${adjustmentAmountCHF}</strong>
            </p>
            <p style="margin: 10px 0 0 0; color: #666;">
              Ursprünglicher Preis: CHF ${oldPriceCHF}<br>
              Neuer Preis: CHF ${newPriceCHF}
            </p>
          </div>
          
          <div style="background-color: ${isNegative ? '#fef2f2' : '#f9fafb'}; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              ${balanceEmoji} <strong>Ihr aktuelles Guthaben:</strong> CHF ${creditBalanceCHF}
            </p>
            ${isNegative ? `
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #dc2626;">
                Dieser Betrag wird bei Ihrer nächsten Zahlung automatisch verrechnet.
              </p>
            ` : `
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Der Betrag wurde von Ihrem Guthaben abgezogen.
              </p>
            `}
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Bei Fragen stehen wir Ihnen gerne zur Verfügung.
          </p>
          
          <p style="margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Beste Grüsse<br>
            Ihr Fahrschul-Team
          </p>
        </div>
      `

      emailText = `
Terminverlängerung

Hallo ${user.first_name || ''},

Ihr Termin wurde von ${oldDuration} Minuten auf ${newDuration} Minuten verlängert.

Aufpreis: CHF ${adjustmentAmountCHF}
Ursprünglicher Preis: CHF ${oldPriceCHF}
Neuer Preis: CHF ${newPriceCHF}

Ihr aktuelles Guthaben: CHF ${creditBalanceCHF}
${isNegative ? 'Dieser Betrag wird bei Ihrer nächsten Zahlung automatisch verrechnet.' : 'Der Betrag wurde von Ihrem Guthaben abgezogen.'}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Beste Grüsse
Ihr Fahrschul-Team
      `
    }

    // 5. Send email via Supabase Edge Function
    logger.debug('AdjustmentEmail', 'Sending email to:', user.email)

    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: user.email,
        subject,
        html: emailHtml,
        body: emailText
      },
      method: 'POST'
    })

    if (emailError) {
      logger.error('AdjustmentEmail', 'Failed to send email:', emailError)
      return { success: false, error: emailError.message }
    }

    logger.debug('AdjustmentEmail', 'Email sent successfully:', emailResult)

    return { success: true }
  } catch (error: any) {
    logger.error('AdjustmentEmail', 'Error sending adjustment email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send reminder email for negative credit balance
 */
export async function sendNegativeCreditsReminderEmail(
  userId: string,
  debtAmount: number // in Rappen
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()

  try {
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'User not found' }
    }

    const debtAmountCHF = (debtAmount / 100).toFixed(2)

    const subject = `Erinnerung: Offener Betrag CHF ${debtAmountCHF}`

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">💳 Offener Betrag</h2>
        
        <p>Hallo ${user.first_name || ''},</p>
        
        <p>Wir möchten Sie daran erinnern, dass Sie einen offenen Betrag haben:</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px;">
            <strong>CHF ${debtAmountCHF}</strong>
          </p>
        </div>
        
        <p style="color: #666;">
          Dieser Betrag wird automatisch bei Ihrer nächsten Zahlung verrechnet.
          Alternativ können Sie den Betrag auch vorab überweisen.
        </p>
        
        <p style="margin-top: 30px;">
          Bei Fragen stehen wir Ihnen gerne zur Verfügung.
        </p>
        
        <p style="margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Beste Grüsse<br>
          Ihr Fahrschul-Team
        </p>
      </div>
    `

    const emailText = `
Offener Betrag

Hallo ${user.first_name || ''},

Wir möchten Sie daran erinnern, dass Sie einen offenen Betrag haben:

CHF ${debtAmountCHF}

Dieser Betrag wird automatisch bei Ihrer nächsten Zahlung verrechnet.
Alternativ können Sie den Betrag auch vorab überweisen.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Beste Grüsse
Ihr Fahrschul-Team
    `

    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: user.email,
        subject,
        html: emailHtml,
        body: emailText
      },
      method: 'POST'
    })

    if (emailError) {
      logger.error('AdjustmentEmail', 'Failed to send reminder email:', emailError)
      return { success: false, error: emailError.message }
    }

    return { success: true }
  } catch (error: any) {
    logger.error('AdjustmentEmail', 'Error sending reminder email:', error)
    return { success: false, error: error.message }
  }
}

