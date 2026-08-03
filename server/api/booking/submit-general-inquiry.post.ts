// server/api/booking/submit-general-inquiry.post.ts
// Submit a general inquiry or specific lesson request
// - General inquiry: only contact info + message (category_code, location_id, duration_minutes are NULL)
// - Specific request: contact info + category + location + duration + preferred_time_slots
// Contact field requirements follow tenant booking_policy.booking_required_fields

import { defineEventHandler, readBody, createError, getRequestIP } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { recordAndUploadInquiryConversion, sha256Hex } from '~/server/utils/google-ads-conversion'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { upsertMarketingLeadSafe } from '~/server/utils/upsert-marketing-lead'
import { DEFAULT_BOOKING_POLICY, normalizeLocationIntakeModes } from '~/server/api/admin/booking-policy.get'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { escapeLikePattern } from '~/server/utils/sql-helpers'

interface MarketingAttributionPayload {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  fbclid?: string | null
  fbc?: string | null
  fbp?: string | null
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'Vorname',
  last_name: 'Nachname',
  email: 'E-Mail',
  phone: 'Telefon',
  birthdate: 'Geburtsdatum',
  street: 'Strasse',
  street_nr: 'Hausnummer',
  zip: 'PLZ',
  city: 'Ort',
  profession: 'Beruf',
}

/**
 * Resolve or create a users row for an inquiry (1A + 2A):
 * - Prefer client-provided created_by_user_id when it belongs to the tenant
 * - Else link existing user by email/phone (do not overwrite completed profiles)
 * - Else reuse pending shadow account (merge contact fields)
 * - Else create pending client (no onboarding SMS)
 */
async function resolveInquiryUserId(params: {
  tenantId: string
  createdByUserId?: string | null
  categoryCode?: string | null
  fields: Record<string, string>
}): Promise<string | null> {
  const { tenantId, createdByUserId, categoryCode, fields } = params
  const admin = getSupabaseAdmin()

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
  admin: ReturnType<typeof getSupabaseAdmin>,
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

export default defineEventHandler(async (event) => {
  try {
    const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
    const { allowed } = await checkRateLimit(ip, 'booking_inquiry')
    if (!allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    const body = await readBody(event)
    const {
      tenant_id,
      category_code,
      duration_minutes,
      location_id,
      staff_id,
      first_name,
      last_name,
      email,
      phone,
      street,
      house_number,
      street_nr,
      postal_code,
      zip,
      city,
      birthdate,
      profession,
      notes,
      created_by_user_id,
      preferred_time_slots = [],
      marketing_session_id,
      marketing_attribution,
      _hp,
    } = body

    const resolvedStreetNr = (house_number ?? street_nr ?? '').toString()
    const resolvedZip = (postal_code ?? zip ?? '').toString()

    if (_hp) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request' })
    }

    if (!tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenant_id is required'
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    )

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, booking_policy')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Tenant not found or invalid tenant_id'
      })
    }

    const rawPolicy = (tenant as any).booking_policy || {}
    const locationIntakeModes = normalizeLocationIntakeModes(rawPolicy)
    // Client may send the chosen mode when multiple are enabled
    const requestedMode = body.location_intake_mode
    const locationIntakeMode =
      locationIntakeModes.includes(requestedMode) ? requestedMode : locationIntakeModes[0]

    const requiredFields: string[] = [
      ...(Array.isArray(rawPolicy.booking_required_fields)
        ? rawPolicy.booking_required_fields
        : DEFAULT_BOOKING_POLICY.booking_required_fields),
    ]
    if (locationIntakeMode === 'pickup_address') {
      for (const key of ['street', 'zip', 'city']) {
        if (!requiredFields.includes(key)) requiredFields.push(key)
      }
    }
    if (locationIntakeMode === 'callback' && !requiredFields.includes('phone')) {
      requiredFields.push('phone')
    }

    const fieldValues: Record<string, string> = {
      first_name: (first_name ?? '').toString().trim(),
      last_name: (last_name ?? '').toString().trim(),
      email: (email ?? '').toString().trim(),
      phone: (phone ?? '').toString().trim(),
      birthdate: (birthdate ?? '').toString().trim(),
      street: (street ?? '').toString().trim(),
      street_nr: resolvedStreetNr.trim(),
      zip: resolvedZip.trim(),
      city: (city ?? '').toString().trim(),
      profession: (profession ?? '').toString().trim(),
    }

    const missingRequired = requiredFields.filter(key => !fieldValues[key])
    if (missingRequired.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: `Missing required fields: ${missingRequired.map(k => FIELD_LABELS[k] || k).join(', ')}`
      })
    }

    if (fieldValues.first_name.length > 100) throw createError({ statusCode: 400, statusMessage: 'First name too long (max 100 chars)' })
    if (fieldValues.last_name.length > 100) throw createError({ statusCode: 400, statusMessage: 'Last name too long (max 100 chars)' })
    if (fieldValues.email.length > 254) throw createError({ statusCode: 400, statusMessage: 'Email too long (max 254 chars)' })
    if (fieldValues.phone.length > 30) throw createError({ statusCode: 400, statusMessage: 'Phone too long (max 30 chars)' })
    if (notes && notes.trim().length > 1500) throw createError({ statusCode: 400, statusMessage: 'Message too long (max 1500 chars)' })

    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
    if (fieldValues.email && !emailRegex.test(fieldValues.email)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid email address format'
      })
    }

    const phoneRegex = /^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/
    if (fieldValues.phone && !phoneRegex.test(fieldValues.phone.replace(/\s/g, ''))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid phone number format (e.g. +41 79 123 45 67 or 079 123 45 67)'
      })
    }

    if (fieldValues.zip && !/^\d{4}$/.test(fieldValues.zip)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid postal code (expected 4 digits)'
      })
    }

    const hasPreferredSlots = Array.isArray(preferred_time_slots) && preferred_time_slots.length > 0
    // Specific booking inquiry: category present (location optional depending on intake mode)
    const isSpecificRequest = !!category_code

    if (!isSpecificRequest && !notes?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Message (notes) is required'
      })
    }

    if (isSpecificRequest && !hasPreferredSlots && !notes?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Please provide preferred time slots or a message'
      })
    }

    if (isSpecificRequest && locationIntakeMode === 'locations' && !location_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'location_id is required for this tenant'
      })
    }

    if (isSpecificRequest && locationIntakeMode === 'pickup_address') {
      if (!fieldValues.street || !fieldValues.zip || !fieldValues.city) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Pickup address (street, zip, city) is required'
        })
      }
    }

    if (isSpecificRequest && locationIntakeMode === 'callback' && !fieldValues.phone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Phone is required for callback requests'
      })
    }

    // Validate location/category only when a location was provided
    if (category_code && location_id) {
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id, name, available_categories, staff_ids')
        .eq('id', location_id)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .single()

      if (locationError || !location) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Location not found or invalid for this tenant'
        })
      }

      let categorySupported = Array.isArray(location.available_categories)
        && location.available_categories.includes(category_code)

      if (staff_id) {
        const { data: staffLoc } = await supabase
          .from('staff_locations')
          .select('available_categories')
          .eq('staff_id', staff_id)
          .eq('location_id', location_id)
          .maybeSingle()

        if (Array.isArray(staffLoc?.available_categories)) {
          categorySupported = staffLoc.available_categories.includes(category_code)
        }
      }

      if (!categorySupported) {
        throw createError({
          statusCode: 400,
          statusMessage: `Location does not support category: ${category_code}`
        })
      }
    }

    let resolvedAttribution: MarketingAttributionPayload | null = marketing_attribution ?? null
    if (!resolvedAttribution && marketing_session_id) {
      const { data: attrRow } = await supabase
        .from('marketing_attributions')
        .select('gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, fbc, fbp')
        .eq('session_id', marketing_session_id)
        .maybeSingle()
      if (attrRow) resolvedAttribution = attrRow as any
    }

    const resolvedUserId = await resolveInquiryUserId({
      tenantId: tenant_id,
      createdByUserId: created_by_user_id || null,
      categoryCode: category_code || null,
      fields: fieldValues,
    })

    // Admin client: anon has INSERT but no SELECT on booking_proposals, so
    // insert().select() fails RLS; also needed once created_by_user_id is set.
    const supabaseAdmin = getSupabaseAdmin()
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('booking_proposals')
      .insert({
        tenant_id,
        category_code: category_code || null,
        duration_minutes: duration_minutes || null,
        location_id: location_id || null,
        staff_id: staff_id || null,
        preferred_time_slots: hasPreferredSlots ? preferred_time_slots : [],
        first_name: fieldValues.first_name || null,
        last_name: fieldValues.last_name || null,
        email: fieldValues.email || null,
        phone: fieldValues.phone || null,
        street: fieldValues.street || null,
        house_number: fieldValues.street_nr || null,
        postal_code: fieldValues.zip || null,
        city: fieldValues.city || null,
        notes: notes?.trim() || null,
        created_by_user_id: resolvedUserId,
        status: 'pending',
        marketing_session_id: marketing_session_id || null,
        utm_source: resolvedAttribution?.utm_source ?? null,
        utm_medium: resolvedAttribution?.utm_medium ?? null,
        utm_campaign: resolvedAttribution?.utm_campaign ?? null,
        utm_content: resolvedAttribution?.utm_content ?? null,
        utm_term: resolvedAttribution?.utm_term ?? null,
        fbclid: resolvedAttribution?.fbclid ?? null,
        fbc: resolvedAttribution?.fbc ?? null,
        fbp: resolvedAttribution?.fbp ?? null,
      })
      .select()
      .single()

    if (proposalError) {
      console.error('❌ Error creating inquiry:', proposalError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create inquiry'
      })
    }

    console.log('✅ General inquiry created:', proposal.id)

    if (resolvedAttribution?.gclid || resolvedAttribution?.gbraid || resolvedAttribution?.wbraid) {
      ;(async () => {
        try {
          const normalizedEmail = fieldValues.email.toLowerCase()
          const normalizedPhone = fieldValues.phone.replace(/\s+/g, '').replace(/^00/, '+')
          const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
          const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

          await recordAndUploadInquiryConversion({
            proposal_id: proposal.id,
            gclid: resolvedAttribution!.gclid ?? null,
            gbraid: resolvedAttribution!.gbraid ?? null,
            wbraid: resolvedAttribution!.wbraid ?? null,
            conversion_date_time: new Date(),
            hashed_email: hashedEmail,
            hashed_phone: hashedPhone,
          })
        } catch (err: any) {
          console.warn('⚠️ Server-side Google Ads inquiry conversion upload failed (non-critical):', err?.message ?? err)
        }
      })()
    }

    try {
      const internalApiSecret = process.env.NUXT_INTERNAL_API_SECRET
      if (!internalApiSecret) {
        console.error('❌ NUXT_INTERNAL_API_SECRET is not configured. Skipping email sending.')
      } else {
        await fetch(`${process.env.NUXT_PUBLIC_BASE_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/emails/send-booking-proposal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Api-Secret': internalApiSecret
          },
          body: JSON.stringify({
            proposalId: proposal.id,
            tenant_id: tenant_id,
            skipCustomerEmail: !!body.skip_customer_email,
          })
        })
        console.log('✅ Inquiry emails sent')
      }
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to send inquiry emails:', emailErr.message)
    }

    upsertMarketingLeadSafe({
      tenantId: tenant_id,
      email: fieldValues.email || undefined,
      firstName: fieldValues.first_name || undefined,
      lastName: fieldValues.last_name || undefined,
      phone: fieldValues.phone || undefined,
      categories: category_code ? [String(category_code).trim()] : [],
      tags: ['inquiry'],
      source: 'booking_inquiry',
      sourceLabel: 'Buchungsanfrage',
    })

    return {
      success: true,
      proposal_id: proposal.id,
      message: category_code
        ? 'Fahrstundenanfrage eingereicht. Wir melden uns bald bei dir.'
        : 'Danke für deine Anfrage. Wir melden uns in Kürze.'
    }
  } catch (err: any) {
    console.error('❌ Error in submit-general-inquiry:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to submit inquiry'
    })
  }
})
