import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logger } from '~/utils/logger'
import { sendEmail } from '~/server/utils/email'

/**
 * POST /api/affiliate/register-partner
 *
 * Public endpoint for external people who want to become affiliates.
 * Creates (or looks up) a user with role='affiliate' and sends a Magic Link
 * (password-reset-style token) via email so they can access their dashboard.
 *
 * Body: { firstName: string, lastName: string, email: string }
 *
 * Does NOT require authentication – this is the entry point for externals.
 * Rate limited by IP.
 */

const DEFAULT_TENANT_SLUG = 'driving-team'

function generateAffiliateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const ipAddress = getClientIP(event)

  const rateLimit = await checkRateLimit(ipAddress, 'register', undefined, undefined)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warte kurz.' })
  }

  const body = await readBody(event)
  const { firstName, lastName, email, tenantSlug } = body

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    throw createError({ statusCode: 400, message: 'Vorname, Nachname und E-Mail sind erforderlich.' })
  }

  const emailLower = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailLower)) {
    throw createError({ statusCode: 400, message: 'Bitte gib eine gültige E-Mail-Adresse ein.' })
  }
  const normalizedTenantSlug = typeof tenantSlug === 'string' && tenantSlug.trim()
    ? tenantSlug.trim().toLowerCase()
    : DEFAULT_TENANT_SLUG

  // Lookup tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, domain, slug, is_active')
    .eq('slug', normalizedTenantSlug)
    .maybeSingle()

  if (!tenant || tenant.is_active === false) {
    throw createError({ statusCode: 500, message: 'Tenant nicht gefunden.' })
  }

  const ensureAffiliateCode = async (tenantId: string, userId: string) => {
    const { data: existingCode } = await supabase
      .from('affiliate_codes')
      .select('id, code')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingCode) {
      return { codeRow: existingCode, created: false }
    }

    let generatedCode = ''
    let attempts = 0
    while (attempts < 10) {
      const candidate = generateAffiliateCode()
      const { data: clash } = await supabase
        .from('affiliate_codes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('code', candidate)
        .maybeSingle()
      if (!clash) {
        generatedCode = candidate
        break
      }
      attempts++
    }

    if (!generatedCode) {
      throw createError({ statusCode: 500, message: 'Affiliate-Code konnte nicht erstellt werden.' })
    }

    const { data: insertedCode, error: insertCodeError } = await supabase
      .from('affiliate_codes')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        code: generatedCode,
        is_active: true,
      })
      .select('id, code')
      .single()

    if (insertCodeError || !insertedCode) {
      throw createError({ statusCode: 500, message: 'Affiliate-Code konnte nicht erstellt werden.' })
    }

    return { codeRow: insertedCode, created: true }
  }

  // Check if user already exists
  let userId: string | null = null
  let authUserId: string | null = null
  let existingUser = false

  const { data: existingUserRow } = await supabase
    .from('users')
    .select('id, role, auth_user_id')
    .eq('email', emailLower)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (existingUserRow) {
    existingUser = true
    userId = existingUserRow.id
    authUserId = existingUserRow.auth_user_id
    // If they already have a higher-permission role, don't downgrade
  } else {
    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: emailLower,
      email_confirm: true,
    })

    if (authError) {
      if (authError.message?.includes('already registered')) {
        // Auth user exists but no users row – look up by auth
        const { data: byAuth } = await supabase
          .from('users')
          .select('id, auth_user_id')
          .eq('email', emailLower)
          .eq('tenant_id', tenant.id)
          .maybeSingle()
        userId = byAuth?.id ?? null
        authUserId = byAuth?.auth_user_id ?? null
      } else {
        throw createError({ statusCode: 500, message: 'Registrierung fehlgeschlagen.' })
      }
    } else if (authData?.user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          tenant_id: tenant.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: emailLower,
          role: 'affiliate',
          is_active: true,
        })
        .select('id')
        .single()
      userId = newUser?.id ?? null
      authUserId = authData.user.id

      // Create empty student_credits row (for potential payouts)
      if (userId) {
        await supabase.from('student_credits').insert({
          user_id: userId,
          tenant_id: tenant.id,
          balance_rappen: 0,
          notes: 'Automatisch erstellt bei Affiliate-Registrierung',
        })
      }
    }
  }

  if (!userId) {
    throw createError({ statusCode: 500, message: 'Benutzer konnte nicht erstellt werden.' })
  }

  // If existing users row has no authUserId, try to create the missing Supabase auth user now
  if (!authUserId) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: emailLower,
        email_confirm: true,
      })
      if (!authError && authData?.user) {
        authUserId = authData.user.id
        await supabase
          .from('users')
          .update({ auth_user_id: authUserId })
          .eq('id', userId)
      }
    } catch {
      // Non-critical — continue and attempt magic link with what we have
    }
  }

  const affiliateCodeResult = await ensureAffiliateCode(tenant.id, userId)
  const affiliateShareLink = `https://simy.ch/ref/${tenant.slug}?ref=${affiliateCodeResult.codeRow.code}`

  if (!authUserId) {
    // Still no auth user — cannot send magic link
    return {
      success: false,
      emailSent: false,
      message: 'Zugang konnte nicht erstellt werden. Bitte versuche es mit einer anderen E-Mail-Adresse.',
      status: 'error_no_auth_user',
    }
  }

  // Generate magic link token (password-reset style)
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  await supabase.from('password_reset_tokens').insert({
    user_id: userId,
    email: emailLower,
    token,
    reset_method: 'email',
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    ip_address: ipAddress,
  })

  // Build dashboard link
  // Keep tenant URL construction aligned with app conventions (simy.ch).
  const tenantDomain = String(tenant.domain || '').trim()
  const baseUrl = tenantDomain
    ? (tenantDomain.startsWith('http://') || tenantDomain.startsWith('https://')
      ? tenantDomain
      : `https://${tenantDomain}`)
    : 'https://simy.ch'
  const dashboardLink = `${baseUrl}/affiliate-dashboard?token=${token}`

  // Send email via central sendEmail utility (uses RESEND_FROM_EMAIL env var)
  let emailSent = false
  try {
    await sendEmail({
      to: emailLower,
      subject: 'Dein Affiliate-Zugang – Driving Team',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#111;font-size:22px;margin-bottom:8px">Willkommen, ${firstName.trim()}!</h2>
          <p style="color:#555;font-size:15px;line-height:1.6;margin-bottom:24px">
            Klicke auf den Button unten um dein Affiliate-Dashboard zu öffnen und deinen persönlichen Empfehlungslink zu aktivieren.
          </p>
          <a href="${dashboardLink}"
             style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;margin-bottom:24px">
            Affiliate-Dashboard öffnen →
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            Dieser Link ist 1 Stunde gültig und kann nur einmal verwendet werden.<br>
            Falls du keine Anfrage gestellt hast, kannst du diese E-Mail ignorieren.
          </p>
        </div>
      `,
    })
    emailSent = true
  } catch (emailError: any) {
    logger.warn('⚠️ affiliate/register-partner: Failed to send email', {
      message: emailError?.message,
      email: emailLower,
    })
  }

  const isProd = process.env.NODE_ENV === 'production'
  return {
    success: true,
    message: emailSent
      ? 'Zugangslink wurde gesendet.'
      : 'Partner erstellt. E-Mail-Versand aktuell nicht möglich.',
    status: existingUser
      ? (affiliateCodeResult.created ? 'existing_user_code_created' : 'existing_user_code_exists')
      : 'new_user_created',
    emailSent,
    affiliateCode: {
      code: affiliateCodeResult.codeRow.code,
      link: affiliateShareLink,
      createdNow: affiliateCodeResult.created,
    },
    // Dev fallback for local testing when email delivery is unavailable.
    ...(isProd ? {} : { debugDashboardLink: dashboardLink }),
  }
})
