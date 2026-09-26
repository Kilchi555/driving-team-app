/**
 * Resolve or create a users row for an inquiry (general inquiry and booking proposal).
 * - Prefer client-provided created_by_user_id only when it belongs to the tenant
 * - Else link existing user by email/phone inside that tenant (do not overwrite completed profiles)
 * - Else reuse pending shadow account (merge contact fields)
 * - Else create pending client (no auth user, no onboarding SMS)
 */
import { createError } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { escapeLikePattern } from '~/server/utils/sql-helpers'

export type InquiryUserAdmin = {
  from: (table: string) => any
}

export async function resolveInquiryUserId(params: {
  tenantId: string
  createdByUserId?: string | null
  categoryCode?: string | null
  fields: Record<string, string>
  admin?: InquiryUserAdmin
}): Promise<string | null> {
  const { tenantId, createdByUserId, categoryCode, fields } = params
  const admin = params.admin || getSupabaseAdmin()

  if (createdByUserId) {
    const { data: authUser, error: authErr } = await admin
      .from('users')
      .select('id')
      .eq('id', createdByUserId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (authErr) {
      console.warn('⚠️ Inquiry user lookup by created_by_user_id failed:', authErr.message)
    } else if (authUser?.id) {
      return authUser.id
    }
  }

  const email = fields.email || null
  const phoneRaw = fields.phone || null
  if (!email && !phoneRaw) {
    return null
  }

  type MatchRow = { id: string; onboarding_status: string | null; category: string[] | null }
  let existing: MatchRow | null = null

  if (email) {
    const { data, error } = await admin
      .from('users')
      .select('id, onboarding_status, category')
      .ilike('email', escapeLikePattern(email.toLowerCase()))
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()
    if (error) {
      console.warn('⚠️ Inquiry user email lookup failed:', error.message)
    } else if (data) {
      existing = data as MatchRow
    }
  }

  if (!existing && phoneRaw) {
    const normalizedPhone = normalizePhoneNumber(phoneRaw)
    const localFormat = normalizedPhone ? normalizedPhone.replace(/^\+41/, '0') : null
    const candidates = [...new Set(
      [normalizedPhone, localFormat, phoneRaw.replace(/\s/g, ''), phoneRaw.trim()].filter(Boolean) as string[]
    )]
    if (candidates.length > 0) {
      const { data, error } = await admin
        .from('users')
        .select('id, onboarding_status, category')
        .in('phone', candidates)
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle()
      if (error) {
        console.warn('⚠️ Inquiry user phone lookup failed:', error.message)
      } else if (data) {
        existing = data as MatchRow
      }
    }
  }

  if (existing) {
    if (existing.onboarding_status === 'pending') {
      const onboardingToken = uuidv4()
      const tokenExpiry = new Date()
      tokenExpiry.setDate(tokenExpiry.getDate() + 30)

      const mergedCategories = Array.from(new Set([
        ...(Array.isArray(existing.category) ? existing.category : []),
        ...(categoryCode ? [String(categoryCode).trim()] : []),
      ].filter(Boolean)))

      const updatePayload: Record<string, any> = {
        onboarding_token: onboardingToken,
        onboarding_token_expires: tokenExpiry.toISOString(),
      }
      if (mergedCategories.length) updatePayload.category = mergedCategories
      if (fields.first_name) updatePayload.first_name = fields.first_name
      if (fields.last_name) updatePayload.last_name = fields.last_name
      if (phoneRaw) updatePayload.phone = normalizePhoneNumber(phoneRaw) || phoneRaw
      if (email) updatePayload.email = email
      if (fields.birthdate) updatePayload.birthdate = fields.birthdate
      if (fields.street) updatePayload.street = fields.street
      if (fields.street_nr) updatePayload.street_nr = fields.street_nr
      if (fields.zip) updatePayload.zip = fields.zip
      if (fields.city) updatePayload.city = fields.city
      if (fields.profession) updatePayload.profession = fields.profession

      const { error: updateErr } = await admin
        .from('users')
        .update(updatePayload)
        .eq('id', existing.id)

      if (updateErr) {
        console.error('❌ Inquiry pending user merge failed:', updateErr)
        throw createError({ statusCode: 500, statusMessage: 'Failed to update inquiry contact' })
      }
    }
    // completed / other: link only, do not overwrite profile
    return existing.id
  }

  const newUserId = uuidv4()
  const onboardingToken = uuidv4()
  const tokenExpiry = new Date()
  tokenExpiry.setDate(tokenExpiry.getDate() + 30)
  const categories = categoryCode ? [String(categoryCode).trim()] : []

  const { error: insertErr } = await admin
    .from('users')
    .insert({
      id: newUserId,
      first_name: fields.first_name || '',
      last_name: fields.last_name || '',
      phone: phoneRaw ? (normalizePhoneNumber(phoneRaw) || phoneRaw) : null,
      email: email || null,
      birthdate: fields.birthdate || null,
      street: fields.street || null,
      street_nr: fields.street_nr || null,
      zip: fields.zip || null,
      city: fields.city || null,
      profession: fields.profession || null,
      category: categories,
      role: 'client',
      tenant_id: tenantId,
      is_active: true,
      onboarding_status: 'pending',
      onboarding_token: onboardingToken,
      onboarding_token_expires: tokenExpiry.toISOString(),
    })

  if (insertErr) {
    // Race: another request created the same email/phone — re-lookup and link
    if (insertErr.code === '23505') {
      const raced = await findExistingUserByContactFallback(admin, tenantId, email, phoneRaw)
      if (raced) return raced
    }
    console.error('❌ Inquiry user creation failed:', insertErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create inquiry contact' })
  }

  return newUserId
}

async function findExistingUserByContactFallback(
  admin: InquiryUserAdmin,
  tenantId: string,
  email: string | null,
  phoneRaw: string | null
): Promise<string | null> {
  if (email) {
    const { data } = await admin
      .from('users')
      .select('id')
      .ilike('email', escapeLikePattern(email.toLowerCase()))
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()
    if (data?.id) return data.id
  }
  if (phoneRaw) {
    const normalizedPhone = normalizePhoneNumber(phoneRaw)
    const localFormat = normalizedPhone ? normalizedPhone.replace(/^\+41/, '0') : null
    const candidates = [...new Set(
      [normalizedPhone, localFormat, phoneRaw.replace(/\s/g, ''), phoneRaw.trim()].filter(Boolean) as string[]
    )]
    if (candidates.length > 0) {
      const { data } = await admin
        .from('users')
        .select('id')
        .in('phone', candidates)
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle()
      if (data?.id) return data.id
    }
  }
  return null
}
