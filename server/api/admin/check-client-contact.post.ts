// Live email/phone availability check for admin "add client" modal.
// Matches the same uniqueness rules as /api/admin/add-student.

import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function normalizeSwissPhone(raw: string): string {
  let phone = String(raw || '').trim()
  phone = phone.replace(/[\s\-\.\(\)]/g, '')
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)
  if (phone.startsWith('0')) phone = '+41' + phone.slice(1)
  if (!phone.startsWith('+') && /^\d{9,}$/.test(phone)) phone = '+41' + phone
  return phone.replace(/[^+\d]/g, '')
}

export default defineEventHandler(async (event) => {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile?.tenant_id || !['admin', 'staff', 'super_admin', 'superadmin'].includes(profile.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const rateLimitResult = await checkRateLimit(
    authUser.id,
    'check_client_contact',
    60,
    60 * 1000,
    undefined,
    profile.tenant_id,
  )
  if (!rateLimitResult.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  const body = await readBody(event)
  const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
  const phone = phoneRaw ? normalizeSwissPhone(phoneRaw) : ''

  const result: {
    email?: {
      status: 'idle' | 'invalid' | 'available' | 'taken'
      message?: string
      existingUser?: {
        id: string
        first_name: string | null
        last_name: string | null
        onboarding_status: string | null
        auth_user_id: string | null
        is_active: boolean | null
      }
    }
    phone?: {
      status: 'idle' | 'invalid' | 'available' | 'taken'
      message?: string
      existingUser?: {
        id: string
        first_name: string | null
        last_name: string | null
        onboarding_status: string | null
        auth_user_id: string | null
        is_active: boolean | null
      }
    }
  } = {}

  if (body.email !== undefined) {
    if (!emailRaw) {
      result.email = { status: 'idle' }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      result.email = { status: 'invalid', message: 'Ungültige E-Mail-Adresse' }
    } else {
      const { data: existing } = await supabase
        .from('users')
        .select('id, first_name, last_name, onboarding_status, auth_user_id, is_active')
        .eq('tenant_id', profile.tenant_id)
        .ilike('email', emailRaw)
        .maybeSingle()

      if (existing) {
        const name = [existing.first_name, existing.last_name].filter(Boolean).join(' ')
        result.email = {
          status: 'taken',
          message: name
            ? `Bereits vorhanden: ${name}`
            : 'E-Mail bereits registriert',
          existingUser: existing,
        }
      } else {
        result.email = { status: 'available', message: 'E-Mail verfügbar' }
      }
    }
  }

  if (body.phone !== undefined) {
    if (!phoneRaw) {
      result.phone = { status: 'idle' }
    } else if (phone.replace(/\D/g, '').length < 10) {
      result.phone = { status: 'invalid', message: 'Telefonnummer zu kurz' }
    } else {
      const { data: existing } = await supabase
        .from('users')
        .select('id, first_name, last_name, onboarding_status, auth_user_id, is_active')
        .eq('tenant_id', profile.tenant_id)
        .eq('phone', phone)
        .maybeSingle()

      if (existing) {
        const name = [existing.first_name, existing.last_name].filter(Boolean).join(' ')
        result.phone = {
          status: 'taken',
          message: name
            ? `Bereits vorhanden: ${name}`
            : 'Telefonnummer bereits registriert',
          existingUser: existing,
        }
      } else {
        result.phone = { status: 'available', message: 'Telefonnummer verfügbar' }
      }
    }
  }

  return result
})
