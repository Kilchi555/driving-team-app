// server/api/customer/update-withdrawal-iban.post.ts
// Allows customers to save/update their payout IBAN (encrypted)
// 24h lockout enforced after change before withdrawals are allowed

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { validateIBAN, encryptIBAN } from '~/server/utils/iban-utils'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)
  const supabase = getSupabaseAdmin()

  try {
    // ── Auth ──────────────────────────────────────────────
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

    const userId = authUser.db_user_id || authUser.id

    // ── Rate limiting: max 3 IBAN changes per day ─────────
    const rateLimitResult = await checkRateLimit(userId, 'update_withdrawal_iban', 3, 86400000)
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Zu viele IBAN-Änderungen. Bitte morgen erneut versuchen.' })
    }

    // ── Get user profile ──────────────────────────────────
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, tenant_id, first_name, last_name, email')
      .eq('id', userId)
      .single()
    if (!userProfile) throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })

    // ── Body ──────────────────────────────────────────────
    const body = await readBody(event)
    const { iban, accountHolder, street, streetNr, zip, city } = body

    logger.info('📥 update-withdrawal-iban body received:', {
      hasIban: !!iban,
      ibanLength: iban?.replace(/\s/g, '').length,
      hasAccountHolder: !!accountHolder,
      hasStreet: !!street,
      hasZip: !!zip,
      hasCity: !!city
    })

    if (!iban || !accountHolder) {
      throw createError({ statusCode: 400, statusMessage: 'IBAN und Kontoinhaber sind erforderlich' })
    }
    if (!street || !zip || !city) {
      throw createError({ statusCode: 400, statusMessage: 'Adresse (Strasse, PLZ, Ort) ist erforderlich' })
    }

    // ── Validate IBAN ─────────────────────────────────────
    const cleanedIban = iban.replace(/\s/g, '').toUpperCase()
    logger.info('🔍 IBAN validation:', { cleanedLength: cleanedIban.length, startsWithCH: cleanedIban.startsWith('CH') })
    const ibanValidation = validateIBAN(cleanedIban)
    logger.info('🔍 IBAN validation result:', ibanValidation)
    if (!ibanValidation.valid) {
      throw createError({ statusCode: 400, statusMessage: ibanValidation.error || 'Ungültige IBAN' })
    }

    // ── Encrypt IBAN ──────────────────────────────────────
    const ibanEncrypted = encryptIBAN(cleanedIban)
    const ibanLast4 = cleanedIban.slice(-4)
    const now = new Date()
    const unlockAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24h

    // ── Upsert withdrawal preferences ────────────────────
    const { error: upsertError } = await supabase
      .from('student_withdrawal_preferences')
      .upsert({
        user_id: userProfile.id,
        tenant_id: userProfile.tenant_id,
        iban_encrypted: ibanEncrypted,
        iban_last4: ibanLast4,
        account_holder: accountHolder.trim(),
        street: street.trim(),
        street_nr: streetNr?.trim() || null,
        zip: zip.trim(),
        city: city.trim(),
        iban_changed_at: now.toISOString(),
        iban_verified_at: now.toISOString(),
        withdrawal_unlocked_at: unlockAt.toISOString(),
        updated_at: now.toISOString()
      }, { onConflict: 'user_id' })

    if (upsertError) {
      logger.error('❌ Error saving IBAN:', upsertError)
      throw createError({ statusCode: 500, statusMessage: 'Fehler beim Speichern der IBAN' })
    }

    logger.debug('✅ IBAN saved for user:', { userId: userProfile.id, ibanLast4 })

    // ── Send confirmation email to customer ───────────────
    try {
      await $fetch('/api/email/send-withdrawal-notification', {
        method: 'POST',
        body: {
          type: 'iban_changed',
          email: userProfile.email,
          studentName: `${userProfile.first_name} ${userProfile.last_name}`.trim(),
          ibanLast4,
          accountHolder: accountHolder.trim(),
          unlockAt: unlockAt.toISOString()
        }
      })
    } catch (emailError) {
      logger.warn('⚠️ Could not send IBAN change email:', emailError)
    }

    return {
      success: true,
      message: 'IBAN erfolgreich gespeichert. Auszahlungen sind ab morgen möglich.',
      ibanLast4,
      withdrawalUnlockedAt: unlockAt.toISOString()
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ update-withdrawal-iban error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Interner Fehler' })
  }
})
