// Resolves or creates a guest customer for shop checkout.
// Public, but email is not proof of identity — never return PII or onboarding tokens.

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sanitizeString, validateEmail } from '~/server/utils/validators'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import crypto from 'crypto'

const lookupWindows = new Map<string, number[]>()
const LOOKUP_MAX = 10
const LOOKUP_WINDOW_MS = 60 * 1000

function assertResolveRateLimit(event: Parameters<typeof getClientIP>[0]) {
  const ip = getClientIP(event)
  const now = Date.now()
  const key = `shop-resolve-customer:${ip}`
  const stamps = (lookupWindows.get(key) || []).filter((ts) => ts > now - LOOKUP_WINDOW_MS)
  if (stamps.length >= LOOKUP_MAX) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
  stamps.push(now)
  lookupWindows.set(key, stamps)
}

function publicCustomer(id: string) {
  return {
    customer: { id },
  }
}

export default defineEventHandler(async (event) => {
  try {
    assertResolveRateLimit(event)
    const body = await readBody(event)
    if (!body || typeof body !== 'object') {
      throw createError({ statusCode: 400, message: 'Invalid request body' })
    }

    const { tenant_id: tenantId, email } = body

    if (!tenantId || !email) {
      throw createError({ statusCode: 400, message: 'Missing tenant_id or email' })
    }

    if (!validateEmail(email).valid) {
      throw createError({ statusCode: 400, message: 'Invalid email format' })
    }

    const normalizedEmail = sanitizeString(email, 255).toLowerCase().trim()
    const sanitizedTenantId = sanitizeString(tenantId, 64)

    const supabase = getSupabaseAdmin()

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, is_active')
      .eq('id', sanitizedTenantId)
      .maybeSingle()

    if (tenantError || !tenant || tenant.is_active === false) {
      throw createError({ statusCode: 400, message: 'Invalid or inactive tenant' })
    }

    const { data: existingUser, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', sanitizedTenantId)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (lookupError && lookupError.code !== 'PGRST116') {
      logger.error('❌ User lookup failed:', lookupError)
      throw createError({ statusCode: 500, message: 'Database error during lookup' })
    }

    if (existingUser?.id) {
      return publicCustomer(existingUser.id)
    }

    const userId = crypto.randomUUID()
    const onboardingToken = crypto.randomUUID()

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        auth_user_id: null,
        tenant_id: sanitizedTenantId,
        email: normalizedEmail,
        first_name: '',
        last_name: '',
        phone: '',
        street: null,
        street_nr: null,
        zip: null,
        city: null,
        role: 'client',
        is_active: false,
        onboarding_status: 'pending',
        onboarding_token: onboardingToken,
        onboarding_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: retryUser, error: retryError } = await supabase
          .from('users')
          .select('id')
          .eq('tenant_id', sanitizedTenantId)
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (retryError || !retryUser?.id) {
          throw createError({ statusCode: 500, message: 'Failed to resolve concurrent user creation' })
        }

        return publicCustomer(retryUser.id)
      }

      logger.error('❌ Failed to create guest user:', insertError)
      throw createError({ statusCode: 500, message: 'Failed to create guest user' })
    }

    return publicCustomer(userId)
  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ resolve-customer error:', error)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
})
