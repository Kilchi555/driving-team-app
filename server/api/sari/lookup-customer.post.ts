import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { checkRateLimit } from '~/server/utils/rate-limiter'

const GENERIC_LOOKUP_FAILURE =
  'Die Angaben konnten nicht bestätigt werden. Bitte prüfe Fahrausweisnummer und Geburtsdatum.'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/i
const FABER_PATTERN = /^[a-zA-Z0-9]{4,32}$/
const BIRTHDATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const lookupWindows = new Map<string, number[]>()
const LOOKUP_MAX = 5
const LOOKUP_WINDOW_MS = 60 * 1000

function assertPublicLookupRateLimit(event: Parameters<typeof getClientIP>[0]) {
  const ip = getClientIP(event)
  const now = Date.now()
  const key = `sari-public-lookup:${ip}`
  const stamps = (lookupWindows.get(key) || []).filter((ts) => ts > now - LOOKUP_WINDOW_MS)
  if (stamps.length >= LOOKUP_MAX) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
  stamps.push(now)
  lookupWindows.set(key, stamps)
}

function lookupFailed() {
  return { success: false, message: GENERIC_LOOKUP_FAILURE }
}

export default defineEventHandler(async (event) => {
  assertPublicLookupRateLimit(event)

  try {
    const measured = await checkRateLimit(
      getClientIP(event),
      'sari_public_lookup',
      LOOKUP_MAX,
      LOOKUP_WINDOW_MS,
    )
    if (!measured.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }
  } catch (error: any) {
    if (error?.statusCode === 429) throw error
    logger.warn('SARI public lookup rate log failed')
  }

  const body = await readBody(event)
  const tenantSlug = typeof body?.tenantSlug === 'string' ? body.tenantSlug.trim() : ''
  const faberid = typeof body?.faberid === 'string' ? body.faberid.replace(/\./g, '').trim() : ''
  const birthdate = typeof body?.birthdate === 'string' ? body.birthdate.trim() : ''

  if (!tenantSlug || !SLUG_PATTERN.test(tenantSlug) || !faberid || !birthdate) {
    throw createError({
      statusCode: 400,
      message: 'tenantSlug, faberid, and birthdate are required',
    })
  }

  if (!BIRTHDATE_PATTERN.test(birthdate) || !FABER_PATTERN.test(faberid)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid lookup input',
    })
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, sari_environment, is_active')
    .eq('slug', tenantSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (tenantError || !tenant?.id) {
    throw createError({
      statusCode: 404,
      message: 'Tenant not found',
    })
  }

  try {
    const sariSecrets = await getTenantSecretsSecure(
      tenant.id,
      ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
      'SARI_LOOKUP',
    )

    const sari = new SARIClient({
      environment: tenant.sari_environment || 'production',
      clientId: sariSecrets.SARI_CLIENT_ID,
      clientSecret: sariSecrets.SARI_CLIENT_SECRET,
      username: sariSecrets.SARI_USERNAME || '',
      password: sariSecrets.SARI_PASSWORD || '',
    })

    const customer = await sari.getCustomer(faberid, birthdate)

    return {
      success: true,
      customer: {
        firstname: customer.firstname || '',
        lastname: customer.lastname || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        zip: customer.zip || '',
        city: customer.city || '',
      },
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.warn('SARI public lookup failed')
    return lookupFailed()
  }
})
