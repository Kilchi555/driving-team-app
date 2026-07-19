// server/api/tenants/register.post.ts
// ✅ SECURITY HARDENED: Rate limiting, XSS protection, audit logging
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { sanitizeString, validateEmail } from '~/server/utils/validators'
import { syncFeatureFlags } from '~/server/utils/syncFeatureFlags'
import { generateRegistrationToken } from '~/server/utils/registration-token'
import { resolveBusinessType, applyCategoryAndEventTypeDefaults, applyEvaluationDefaults } from '~/server/utils/business-type-presets'

interface TenantRegistrationData {
  name: string
  legal_company_name?: string
  slug: string
  contact_person_first_name: string
  contact_person_last_name: string
  contact_email: string
  contact_phone: string
  street: string
  streetNr: string
  zip: string
  city: string
  business_type: string
  primary_color: string
  secondary_color: string
  logo_file?: File | null
  logo_square_file?: File | null
  // New optional fields
  uid_number?: string
  qr_iban?: string
  website_url?: string
  staff_count?: string
  language?: string
  timezone?: string
  accent_color?: string
  instagram_url?: string
  facebook_url?: string
  google_review_link?: string
  from_email?: string
  twilio_from_sender?: string    // Alphanumeric SMS sender ID (max 11 chars)
  selected_categories?: string   // comma-separated codes, e.g. "B,BE,A"
  selected_category_ids?: string // comma-separated UUIDs of template categories to copy
  working_days_template?: string // JSON string
  locations_json?: string        // JSON array of LocationEntry objects
  pricing_json?: string          // JSON array of PricingItem objects
}

interface RegistrationResponse {
  success: boolean
  tenant?: any
  error?: string
}

export default defineEventHandler(async (event): Promise<RegistrationResponse> => {
  const startTime = Date.now()
  try {
    // ✅ LAYER 1: Get client IP for rate limiting
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                      getHeader(event, 'x-real-ip') || 
                      event.node.req.socket.remoteAddress || 
                      'unknown'

    // Nur POST erlaubt
    if (event.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed'
      })
    }

    // ✅ LAYER 2: Rate limiting (3 tenant registrations per hour per IP)
    const rateLimit = await checkRateLimit(ipAddress, 'tenant_register', 3, 3600)
    if (!rateLimit.allowed) {
      logger.warn('⚠️ Rate limit exceeded for tenant registration:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Registrierungen. Bitte warten Sie ${rateLimit.retryAfter} Sekunden.`
      })
    }
    logger.debug('✅ Rate limit check passed. Remaining:', rateLimit.remaining)

    // Multipart Form Data parsen
    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Keine Form-Daten empfangen'
      })
    }

    // Daten aus FormData extrahieren
    const data: TenantRegistrationData = {
      name: '',
      legal_company_name: '',
      slug: '',
      contact_person_first_name: '',
      contact_person_last_name: '',
      contact_email: '',
      contact_phone: '',
      street: '',
      streetNr: '',
      zip: '',
      city: '',
      business_type: 'driving_school',
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
      uid_number: '',
      qr_iban: '',
      website_url: '',
      staff_count: '',
      language: 'de',
      timezone: 'Europe/Zurich',
      accent_color: '',
      instagram_url: '',
      facebook_url: '',
      google_review_link: '',
      from_email: '',
      twilio_from_sender: '',
      selected_categories: '',
      selected_category_ids: '',
      working_days_template: '',
      locations_json: '',
      pricing_json: '',
      custom_categories_json: '',
      staff_json: ''
    }

    let logoFile: File | null = null
    let logoSquareFile: File | null = null

    // FormData-Felder verarbeiten
    logger.debug('🔍 Processing FormData fields:')
    for (const field of formData) {
      logger.debug(`  Field: ${field.name}, Type: ${field.type}, Filename: ${field.filename}`)
      
      if (field.name === 'logo_file' && field.filename) {
        logoFile = new File([field.data], field.filename, {
          type: field.type || 'image/jpeg'
        })
        logger.debug(`  ✅ Processed logo file: ${field.filename}`)
      } else if (field.name === 'logo_square_file' && field.filename) {
        logoSquareFile = new File([field.data], field.filename, {
          type: field.type || 'image/webp'
        })
        logger.debug(`  ✅ Processed square logo file: ${field.filename}`)
      } else if (field.name && field.data) {
        // Text-Felder
        const value = field.data.toString()
        if (field.name in data) {
          (data as any)[field.name] = value
          logger.debug(`  ✅ Set ${field.name} = ${value}`)
        } else {
          console.warn(`  ⚠️ Unknown field: ${field.name}`)
        }
      }
    }

    // Logo-Files zu data hinzufügen
    data.logo_file = logoFile
    data.logo_square_file = logoSquareFile

    logger.debug('🏢 Starting tenant registration for:', data.name)
    logger.debug('📊 Final data object:', JSON.stringify(data, null, 2))

    // ✅ LAYER 3: Email validation (format + disposable check)
    if (!validateEmail(data.contact_email).valid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige E-Mail-Adresse'
      })
    }

    const { validateRegistrationEmail } = await import('~/server/utils/email-validator')
    const emailValidation = validateRegistrationEmail(data.contact_email)
    if (!emailValidation.valid) {
      logger.warn('⚠️ Email validation failed for tenant registration:', emailValidation.reason)
      throw createError({
        statusCode: 400,
        statusMessage: emailValidation.reason || 'Ungültige E-Mail-Adresse'
      })
    }
    logger.debug('✅ Disposable email check passed')

    // Validierung
    const validationError = validateTenantData(data)
    if (validationError) {
      throw createError({
        statusCode: 400,
        statusMessage: validationError
      })
    }

    // ✅ LAYER 4: XSS Protection - Sanitize all string inputs
    const sanitizedName = sanitizeString(data.name, 100)
    const sanitizedLegalName = sanitizeString(data.legal_company_name || data.name, 100)
    const sanitizedFirstName = sanitizeString(data.contact_person_first_name, 100)
    const sanitizedLastName = sanitizeString(data.contact_person_last_name, 100)
    const sanitizedPhone = sanitizeString(data.contact_phone, 20)
    const sanitizedStreet = sanitizeString(data.street, 100)
    const sanitizedStreetNr = sanitizeString(data.streetNr, 10)
    const sanitizedCity = sanitizeString(data.city, 100)

    const supabase = getSupabaseAdmin()

    // 1. Prüfen ob Slug bereits existiert
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', data.slug)
      .single()

    if (existingTenant) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese URL-Kennung ist bereits vergeben. Bitte wählen Sie eine andere.'
      })
    }

    // 2. Prüfen ob E-Mail bereits existiert (für Tenant contact_email)
    const { data: existingEmail } = await supabase
      .from('tenants')
      .select('id')
      .eq('contact_email', data.contact_email.toLowerCase().trim())
      .single()

    if (existingEmail) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese E-Mail-Adresse ist bereits als Tenant-Kontakt registriert.'
      })
    }

    logger.debug('✅ No duplicate email found for admin')

    // 3. Logos hochladen (falls vorhanden)
    let logoUrl: string | null = null
    if (data.logo_file) {
      try {
        logoUrl = await uploadTenantLogo(data.logo_file, data.slug)
        logger.debug('✅ Logo uploaded successfully:', logoUrl)
      } catch (logoError) {
        console.warn('⚠️ Logo upload failed, continuing without logo:', logoError)
      }
    }

    let logoSquareUrl: string | null = null
    if (data.logo_square_file) {
      try {
        logoSquareUrl = await uploadTenantLogo(data.logo_square_file, data.slug, 'square')
        logger.debug('✅ Square logo uploaded successfully:', logoSquareUrl)
      } catch (logoError) {
        console.warn('⚠️ Square logo upload failed, continuing without:', logoError)
      }
    }

    // 4. Kundennummer generieren
    const customerNumber = await generateCustomerNumber(supabase)
    logger.debug('🔢 Generated customer number:', customerNumber)

    // 5. Tenant in Datenbank erstellen
    const tenantId = crypto.randomUUID()
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 60) // 60 Tage Trial

    // Default working hours template: Mo–Fr 07:00–19:00, Sa 08:00–16:00
    const defaultWorkingDaysTemplate = {
      days: [1, 2, 3, 4, 5, 6],
      start_time: '07:00',
      end_time: '19:00',
      schedule: {
        1: { start: '07:00', end: '19:00' }, // Montag
        2: { start: '07:00', end: '19:00' }, // Dienstag
        3: { start: '07:00', end: '19:00' }, // Mittwoch
        4: { start: '07:00', end: '19:00' }, // Donnerstag
        5: { start: '07:00', end: '19:00' }, // Freitag
        6: { start: '08:00', end: '16:00' }, // Samstag
      }
    }
    
    // Validate against the live business_types table (not a hardcoded list) so
    // new types added via the super-admin dashboard are usable immediately.
    const resolvedBusinessType = await resolveBusinessType(supabase, data.business_type)

    const { data: newTenant, error: insertError } = await supabase
      .from('tenants')
      .insert({
        id: tenantId,
        name: sanitizedName,
        legal_company_name: sanitizedLegalName,
        slug: data.slug, // Already validated with regex
        domain: `simy.ch/${data.slug}`, // Automatische Domain
        customer_number: customerNumber,
        contact_person_first_name: sanitizedFirstName,
        contact_person_last_name: sanitizedLastName,
        contact_email: data.contact_email.toLowerCase().trim(),
        contact_phone: sanitizedPhone,
        address: `${sanitizedStreet} ${sanitizedStreetNr}, ${data.zip} ${sanitizedCity}`,
        business_type: resolvedBusinessType,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        // Standard-Farben setzen
        accent_color: data.accent_color || data.primary_color,
        success_color: '#10B981',
        warning_color: '#F59E0B',
        error_color: '#EF4444',
        info_color: '#3B82F6',
        background_color: '#FFFFFF',
        surface_color: '#F9FAFB',
        text_color: '#111827',
        text_secondary_color: '#6B7280',
        // Branding
        brand_name: data.name, // Standard: Firmenname
        // Trial-Management
        logo_url: logoUrl,
        logo_square_url: logoSquareUrl,
        timezone: data.timezone || 'Europe/Zurich',
        currency: 'CHF',
        language: data.language || 'de',
        is_active: true,
        is_trial: true,
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_plan: 'trial',
        subscription_status: 'active',
        // Neue Felder
        uid_number:    data.uid_number?.trim()    || null,
        qr_iban:       data.qr_iban?.trim()       || null,
        // Pre-fill invoice address from company address so QR invoices work immediately
        invoice_street:    data.street?.trim()   || null,
        invoice_street_nr: data.streetNr?.trim() || null,
        invoice_zip:       data.zip?.trim()      || null,
        invoice_city:      data.city?.trim()     || null,
        website_url:   data.website_url?.trim()   || null,
        staff_count:   data.staff_count ? parseInt(data.staff_count) || null : null,
        instagram_url: data.instagram_url?.trim() || null,
        facebook_url:  data.facebook_url?.trim()  || null,
        google_review_places: data.google_review_link?.trim()
          ? JSON.stringify([{ url: data.google_review_link.trim() }])
          : '[]',
        from_email:          data.from_email?.trim()           || null,
        twilio_from_sender:  data.twilio_from_sender?.trim()   || null,
        selected_categories: data.selected_categories
          ? data.selected_categories.split(',').map(c => c.trim()).filter(Boolean)
          : null,
        working_days_template: data.working_days_template
          ? JSON.parse(data.working_days_template)
          : defaultWorkingDaysTemplate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Tenant insertion failed:', insertError)
      
      // Cleanup: Logo löschen falls Upload erfolgreich war
      if (logoUrl) {
        try {
          await deleteTenantLogo(logoUrl)
        } catch (cleanupError) {
          console.warn('⚠️ Logo cleanup failed:', cleanupError)
        }
      }
      
      throw createError({
        statusCode: 500,
        statusMessage: 'Tenant-Erstellung fehlgeschlagen. Bitte versuche es erneut.'
      })
    }

    // 6. Standard-Kategorien und Templates kopieren (optional)
    try {
      const selectedIds = data.selected_category_ids
        ? data.selected_category_ids.split(',').map(id => id.trim()).filter(Boolean)
        : undefined
      await copyDefaultDataToTenant(tenantId, resolvedBusinessType, selectedIds, data.pricing_json)
      logger.debug('✅ Default data copied to tenant')

      // Set all feature flags explicitly for trial plan
      await syncFeatureFlags(getSupabaseAdmin(), tenantId, 'trial', {})
      logger.debug('✅ Trial feature flags synced to tenant_settings')

      // Store selected category codes on the tenant so staff-register can filter by them
      if (selectedIds && selectedIds.length > 0) {
        const { data: templateCats } = await supabase
          .from('categories')
          .select('code')
          .is('tenant_id', null)
          .in('id', selectedIds)
        if (templateCats && templateCats.length > 0) {
          const codes = [...new Set(templateCats.map((c: any) => c.code))]
          await supabase.from('tenants').update({ selected_categories: codes }).eq('id', tenantId)
          logger.debug('✅ Stored selected category codes:', codes)
        }
      }
    } catch (defaultDataError) {
      console.warn('⚠️ Default data copy failed:', defaultDataError)
    }

    // 6b. Custom categories defined by the user during registration
    if (data.custom_categories_json?.trim()) {
      try {
        const customs: Array<{ name: string; code: string; color: string; parentCode: string | null }> =
          JSON.parse(data.custom_categories_json)
        if (Array.isArray(customs) && customs.length > 0) {
          const mains = customs.filter(c => !c.parentCode)
          const subs  = customs.filter(c => !!c.parentCode)

          // Build a code→id map of all tenant categories (after template copy)
          const { data: existingCats } = await supabase
            .from('categories').select('id, code').eq('tenant_id', tenantId)
          const codeToId: Record<string, number> = {}
          for (const ec of (existingCats || [])) if (ec.code) codeToId[ec.code] = ec.id

          // Insert custom main categories first
          if (mains.length > 0) {
            const { data: insertedMains } = await supabase.from('categories')
              .insert(mains.map(c => ({
                tenant_id: tenantId,
                name: c.name.trim(),
                code: (c.code?.trim().toUpperCase()) || c.name.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 10),
                color: c.color || '#6366f1',
                is_active: true,
              }))).select('id, code')
            for (const m of (insertedMains || [])) if (m.code) codeToId[m.code] = m.id
            logger.debug(`✅ Created ${mains.length} custom main categories`)
          }

          // Insert custom subcategories, resolving parent by code
          if (subs.length > 0) {
            await supabase.from('categories').insert(subs.map(c => ({
              tenant_id: tenantId,
              name: c.name.trim(),
              code: (c.code?.trim().toUpperCase()) || c.name.trim().toUpperCase().replace(/\s+/g, '_').slice(0, 10),
              color: c.color || '#6366f1',
              parent_category_id: c.parentCode ? (codeToId[c.parentCode] ?? null) : null,
              is_active: true,
            })))
            logger.debug(`✅ Created ${subs.length} custom subcategories`)
          }
        }
      } catch (custErr) {
        console.warn('⚠️ Custom category creation failed (non-critical):', custErr)
      }
    }

    // 7. Standorte erstellen (falls vorhanden)
    if (data.locations_json?.trim()) {
      try {
        const locations = JSON.parse(data.locations_json)
        if (Array.isArray(locations) && locations.length > 0) {
          const now = new Date().toISOString()
          const locationRows = locations
            .filter((l: any) => l.name?.trim())
            .map((l: any) => ({
              tenant_id: tenantId,
              name: l.name.trim(),
              address: l.address?.trim() || null,
              city: l.city?.trim() || null,
              postal_code: l.zip?.trim() || l.postal_code?.trim() || null,
              is_active: true,
              location_type: 'standard',
              created_at: now,
              updated_at: now,
            }))
          if (locationRows.length > 0) {
            const { error: locErr } = await supabase.from('locations').insert(locationRows)
            if (locErr) logger.warn('⚠️ Location creation failed (non-critical):', locErr)
            else logger.debug(`✅ Created ${locationRows.length} location(s)`)
          }
        }
      } catch (locParseErr) {
        logger.warn('⚠️ locations_json parse error (non-critical):', locParseErr)
      }
    }

    // 8. Preisregeln erstellen (falls vorhanden)
    if (data.pricing_json?.trim()) {
      try {
        const pricingItems = JSON.parse(data.pricing_json)
        if (Array.isArray(pricingItems) && pricingItems.length > 0) {
          const now = new Date().toISOString()
          const pricingRows = pricingItems
            .filter((p: any) => p.rule_type && p.price_chf > 0 && p.duration_minutes > 0)
            .map((p: any) => ({
              tenant_id: tenantId,
              rule_type: p.rule_type,
              rule_name: p.label,
              // event_price rows (business types priced per event type, e.g.
              // mental_coach) have no category – keep category_code NULL rather
              // than inventing one, and carry the event_type_code instead.
              category_code: p.rule_type === 'event_price' ? null : (p.category_code || p.rule_type.toUpperCase()),
              event_type_code: p.event_type_code || null,
              price_per_minute_rappen: (p.price_chf * 100) / p.duration_minutes,
              base_duration_minutes: p.duration_minutes,
              admin_fee_rappen: 0,
              admin_fee_applies_from: 999,
              is_active: true,
              valid_from: now,
              valid_until: null,
              created_at: now,
              updated_at: now,
            }))
          if (pricingRows.length > 0) {
            const { error: priceErr } = await supabase.from('pricing_rules').insert(pricingRows)
            if (priceErr) logger.warn('⚠️ Pricing rules creation failed (non-critical):', priceErr)
            else logger.debug(`✅ Created ${pricingRows.length} pricing rule(s)`)
          }

          // Custom services the tenant defined during registration (not part of
          // the business_type templates) need their own event_types row so
          // they're immediately selectable when creating appointments — the
          // template copy in applyCategoryAndEventTypeDefaults only knows about
          // tenant_id IS NULL rows, which these are not.
          const customEventTypeItems = pricingItems.filter((p: any) => p.is_custom && p.event_type_code)
          if (customEventTypeItems.length > 0) {
            const { data: existingEts } = await supabase.from('event_types').select('code').eq('tenant_id', tenantId)
            const existingCodes = new Set((existingEts || []).map((e: any) => e.code))
            const CUSTOM_EVENT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
            const customEtRows = customEventTypeItems
              .filter((p: any) => !existingCodes.has(p.event_type_code))
              .map((p: any, i: number) => ({
                id: crypto.randomUUID(),
                tenant_id: tenantId,
                code: p.event_type_code,
                name: p.label,
                emoji: '✨',
                description: null,
                default_duration_minutes: p.duration_minutes || 60,
                default_color: CUSTOM_EVENT_COLORS[i % CUSTOM_EVENT_COLORS.length],
                is_active: true,
                display_order: 10,
                allowed_roles: ['staff', 'admin'],
                requires_team_invite: false,
                auto_generate_title: true,
                require_payment: true,
                // Not exposed on the public booking page by default — the tenant
                // can opt in later once they've verified the flow.
                public_bookable: false,
                is_default: false,
                created_at: now,
                updated_at: now,
              }))
            if (customEtRows.length > 0) {
              const { error: etErr } = await supabase.from('event_types').insert(customEtRows)
              if (etErr) logger.warn('⚠️ Custom event type creation failed (non-critical):', etErr)
              else logger.debug(`✅ Created ${customEtRows.length} custom event type(s)`)
            }
          }
        }
      } catch (priceParseErr) {
        logger.warn('⚠️ pricing_json parse error (non-critical):', priceParseErr)
      }
    }

    logger.debug('🎉 Tenant registration completed successfully:', newTenant.slug)
    logger.debug('📊 New tenant data:', newTenant)
    logger.debug('🔢 Customer number in response:', newTenant.customer_number)

    // ✅ LAYER 6: Notify super admins about new tenant registration
    try {
      await $fetch('/api/admin/notify-new-tenant', {
        method: 'POST',
        headers: {
          'x-internal-secret': process.env.NUXT_INTERNAL_API_SECRET || ''
        },
        body: {
          tenantId: newTenant.id,
          tenantName: newTenant.name,
          contactEmail: newTenant.contact_email,
          customerNumber: newTenant.customer_number
        }
      })
      logger.debug('✅ Super admins notified about new tenant')
    } catch (notifyError) {
      // Non-critical - don't fail registration if notification fails
      logger.warn('⚠️ Failed to notify super admins (non-critical):', notifyError)
    }

    // NOTE: The welcome email is intentionally NOT sent here. It used to be
    // sent at this point (role: 'admin', via sendWelcomeEmail()) AND again by
    // the frontend after admin-user-creation/staff-invites via
    // POST /api/tenants/send-welcome-email — resulting in every new tenant
    // getting the welcome email twice with two different templates. That
    // second call has the richer, contextually-accurate content (mentions
    // the SMS invite / Wallee setup that only exist by then), so it's kept
    // as the single source and this earlier duplicate was removed.

    // ✅ LAYER 5: Audit logging - Success
    await logAudit({
      action: 'tenant_registration',
      tenant_id: newTenant.id,
      resource_type: 'tenant',
      resource_id: newTenant.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        tenant_name: newTenant.name,
        slug: newTenant.slug,
        customer_number: newTenant.customer_number,
        contact_email: newTenant.contact_email,
        business_type: newTenant.business_type,
        has_logo: !!logoUrl,
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    const response = {
      success: true,
      registration_token: generateRegistrationToken(newTenant.id),
      tenant: {
        id: newTenant.id,
        name: newTenant.name,
        slug: newTenant.slug,
        customer_number: newTenant.customer_number,
        contact_email: newTenant.contact_email,
        logo_url: newTenant.logo_url,
        primary_color: newTenant.primary_color,
        secondary_color: newTenant.secondary_color
      }
    }
    
    logger.debug('📤 Sending response:', JSON.stringify(response, null, 2))
    return response

  } catch (error: any) {
    console.error('❌ Tenant registration error:', error)

    // ✅ LAYER 5: Audit logging - Failure
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    await logAudit({
      action: 'tenant_registration',
      resource_type: 'tenant',
      ip_address: ipAddress,
      status: 'failed',
      error_message: error.statusMessage || error.message,
      details: {
        slug: (error as any).slug,
        contact_email: (error as any).contact_email,
        duration_ms: Date.now() - startTime
      }
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))
    
    return {
      success: false,
      error: error.statusMessage || error.message || 'Unbekannter Fehler bei der Registrierung'
    }
  }
})

/**
 * Validiert die Tenant-Registrierungsdaten
 */
function validateTenantData(data: TenantRegistrationData): string | null {
  if (!data.name?.trim()) {
    return 'Fahrschul-Name ist erforderlich'
  }

  if (!data.slug?.trim()) {
    return 'URL-Kennung ist erforderlich'
  }

  // Slug Validierung
  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    return 'URL-Kennung darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'
  }

  if (data.slug.length < 3) {
    return 'URL-Kennung muss mindestens 3 Zeichen lang sein'
  }

  if (data.slug.length > 50) {
    return 'URL-Kennung darf maximal 50 Zeichen lang sein'
  }

  // Reserved slugs that would conflict with app routes
  const RESERVED_SLUGS = new Set([
    'admin', 'api', 'login', 'logout', 'register', 'booking',
    'tenant-register', 'onboarding', 'billing', 'dashboard',
    'reset-password', 'password-reset', 'set-password',
    'staff', 'customers', 'calendar', 'settings', 'profile',
    'help', 'support', 'terms', 'privacy', 'agb', 'datenschutz',
    'static', 'assets', 'public', 'simy', 'app', 'www', 'mail',
  ])
  if (RESERVED_SLUGS.has(data.slug.toLowerCase())) {
    return 'Diese URL-Kennung ist reserviert. Bitte wähle eine andere.'
  }

  if (!data.contact_email?.trim()) {
    return 'Kontakt-E-Mail ist erforderlich'
  }

  // E-Mail Validierung
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.contact_email)) {
    return 'Ungültige E-Mail-Adresse'
  }

  if (!data.contact_person_first_name?.trim()) {
    return 'Kontaktperson Vorname ist erforderlich'
  }

  if (!data.contact_person_last_name?.trim()) {
    return 'Kontaktperson Nachname ist erforderlich'
  }

  if (!data.contact_phone?.trim()) {
    return 'Telefonnummer ist erforderlich'
  }

  if (!data.street?.trim()) {
    return 'Straße ist erforderlich'
  }

  if (!data.streetNr?.trim()) {
    return 'Hausnummer ist erforderlich'
  }

  if (!data.zip?.trim()) {
    return 'PLZ ist erforderlich'
  }

  // PLZ Validierung (4-stellige Schweizer PLZ)
  if (!/^[0-9]{4}$/.test(data.zip)) {
    return 'PLZ muss 4 Ziffern haben'
  }

  if (!data.city?.trim()) {
    return 'Ort ist erforderlich'
  }

  // Farben validieren
  const colorRegex = /^#[0-9A-Fa-f]{6}$/
  if (!colorRegex.test(data.primary_color)) {
    return 'Ungültige Hauptfarbe (Format: #RRGGBB)'
  }

  if (!colorRegex.test(data.secondary_color)) {
    return 'Ungültige Zweitfarbe (Format: #RRGGBB)'
  }

  return null // Alles OK
}

/**
 * Lädt ein Tenant-Logo hoch mit File Type & Size Validation
 */
async function uploadTenantLogo(file: File, tenantSlug: string, suffix = 'logo'): Promise<string> {
  const supabase = getSupabaseAdmin()
  
  // ✅ LAYER 1: File type validation
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Ungültiger Dateityp. Nur JPG, PNG und WebP erlaubt.')
  }
  
  // ✅ LAYER 2: File size validation (2MB max)
  const maxSize = 2 * 1024 * 1024 // 2MB
  if (file.size > maxSize) {
    throw new Error('Logo ist zu gross. Maximum 2MB erlaubt.')
  }
  
  // ✅ LAYER 3: Map content type based on extension (don't trust client)
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const contentTypeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp'
  }
  const contentType = contentTypeMap[fileExtension] || 'image/jpeg'
  
  // ✅ LAYER 4: Timestamped filename (no user input)
  const timestamp = Date.now()
  const fileName = `${tenantSlug}-${suffix}-${timestamp}.${fileExtension}`
  const filePath = fileName

  logger.debug('🔄 Uploading tenant logo:', filePath)

  // File zu Buffer konvertieren (für Supabase Storage)
  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = new Uint8Array(arrayBuffer)

  // Upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('tenant-logos')
    .upload(filePath, fileBuffer, {
      contentType: contentType, // Use mapped type, not client type
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    throw new Error(`Logo-Upload fehlgeschlagen: ${uploadError.message}`)
  }

  // Öffentliche URL generieren
  const { data: urlData } = supabase.storage
    .from('tenant-logos')
    .getPublicUrl(uploadData.path)

  if (!urlData.publicUrl) {
    throw new Error('Konnte keine öffentliche Logo-URL generieren')
  }

  return urlData.publicUrl
}

/**
 * Löscht ein Tenant-Logo
 */
async function deleteTenantLogo(logoUrl: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  
  try {
    // Pfad aus URL extrahieren
    const url = new URL(logoUrl)
    let filePath: string | null = null
    
    // Try different path patterns
    if (url.pathname.includes('/storage/v1/object/public/public/')) {
      const pathParts = url.pathname.split('/storage/v1/object/public/public/')
      if (pathParts.length >= 2) {
        filePath = pathParts[1]
      }
    } else if (url.pathname.includes('/public/tenant-logos/')) {
      const pathParts = url.pathname.split('/public/tenant-logos/')
      if (pathParts.length >= 2) {
        filePath = `tenant-logos/${pathParts[1]}`
      }
    }
    
    if (!filePath) {
      logger.warn('⚠️ Could not extract file path from logo URL:', logoUrl)
      return
    }
    
    const { error } = await supabase.storage
      .from('public')
      .remove([filePath])

    if (error) {
      throw new Error(`Logo-Löschung fehlgeschlagen: ${error.message}`)
    }
  } catch (err) {
    logger.warn('⚠️ Could not delete tenant logo:', err)
    // Non-critical, continue
  }
}

/**
 * Generiert die nächste verfügbare Kundennummer im Format SM-YYMMDD-XXX
 * - YY: Jahr (2 Ziffern)
 * - MM: Monat (2 Ziffern) 
 * - DD: Tag (2 Ziffern)
 * - XXX: Inkrementierende Nummer (läuft über das ganze Jahr, reset am 1. Januar)
 * 
 * Beispiele:
 * - SM-250123-1 (23.01.2025, 1. Kunde des Jahres)
 * - SM-250124-2 (24.01.2025, 2. Kunde des Jahres)
 * - SM-251223-965 (23.12.2025, 965. Kunde des Jahres)
 * - SM-260101-1 (01.01.2026, 1. Kunde des neuen Jahres) ← Reset!
 */
async function generateCustomerNumber(supabase: any): Promise<string> {
  try {
    // Versuche die SQL-Funktion zu verwenden (falls sie existiert)
    const { data: result, error } = await supabase.rpc('generate_next_customer_number')
    
    if (!error && result) {
      return result
    }
    
    // Fallback: Manuelle Generierung
    logger.debug('⚠️ SQL function not available, using manual generation')
    
    const now = new Date()
    const datePrefix = now.getFullYear().toString().slice(-2) +  // YY
                      (now.getMonth() + 1).toString().padStart(2, '0') +  // MM
                      now.getDate().toString().padStart(2, '0')  // DD
    
    // Finde die höchste Nummer für heute
    const { data: existingNumbers } = await supabase
      .from('tenants')
      .select('customer_number')
      .not('customer_number', 'is', null)
      .like('customer_number', `SM-${datePrefix}-%`)
      .order('customer_number', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (existingNumbers && existingNumbers.length > 0) {
      const lastNumber = existingNumbers[0].customer_number
      const match = lastNumber.match(/^SM-\d{6}-(\d+)$/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }
    
    const customerNumber = `SM-${datePrefix}-${String(nextNumber).padStart(3, '0')}`
    logger.debug(`🔢 Generated customer number: ${customerNumber}`)
    
    return customerNumber
    
  } catch (error) {
    console.error('❌ Error generating customer number:', error)
    // Fallback: Zeitstempel-basierte Nummer
    const now = new Date()
    const datePrefix = now.getFullYear().toString().slice(-2) +
                      (now.getMonth() + 1).toString().padStart(2, '0') +
                      now.getDate().toString().padStart(2, '0')
    const timestamp = Date.now().toString().slice(-3)
    return `SM-${datePrefix}-${timestamp}`
  }
}

/**
 * Kopiert alle branchenspezifischen Template-Daten in den neuen Tenant:
 * - Kategorien (gefiltert nach business_type + optional selectedCategoryIds)
 * - Event Types (gefiltert nach business_type)
 * - Evaluation Categories, Criteria, Scale
 * - Cancellation Policies + Reasons
 * - Payment Methods
 *
 * NICHT kopiert: Locations (Admin gibt manuell ein), Pricing Rules (Admin setzt frei)
 */
async function copyDefaultDataToTenant(
  tenantId: string,
  businessType = 'driving_school',
  selectedCategoryIds?: string[],
  pricingJson?: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // ── 1+2. Categories & Event Types ────────────────────────────────────────
  // Delegates to the shared business-type-presets util so registration and
  // any future admin "reseed tenant" action apply identical logic.
  let theoryEnabled = false
  let consultationEnabled = false
  try {
    if (pricingJson?.trim()) {
      const pricingItems = JSON.parse(pricingJson)
      theoryEnabled = Array.isArray(pricingItems) && pricingItems.some((p: any) => p.rule_type === 'theory')
      consultationEnabled = Array.isArray(pricingItems) && pricingItems.some((p: any) => p.rule_type === 'consultation')
    }
  } catch { /* non-critical — default to inactive */ }

  await applyCategoryAndEventTypeDefaults(supabase, tenantId, businessType, {
    selectedCategoryIds,
    theoryEnabled,
    consultationEnabled,
  })

  // ── 3. Evaluation Categories (+ Criteria + Scale) ────────────────────────
  await applyEvaluationDefaults(supabase, tenantId, businessType)

  // ── 4. Cancellation Policies ───────────────────────────────────────────────
  await copyGenericTemplates(supabase, tenantId, now)
}

/** Copies business-type-agnostic templates (cancellation policies/reasons, payment methods). */
async function copyGenericTemplates(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, now: string): Promise<void> {
  // ── Cancellation Policies ─────────────────────────────────────────────────
  try {
    const { data: policies, error: polErr } = await supabase
      .from('cancellation_policies')
      .select('*')
      .is('tenant_id', null)

    if (!polErr && policies?.length) {
      const polIdMap = new Map<string, string>()
      for (const p of policies) polIdMap.set(p.id, crypto.randomUUID())

      await supabase.from('cancellation_policies').insert(
        policies.map(p => ({ ...p, id: polIdMap.get(p.id)!, tenant_id: tenantId, created_at: now, updated_at: now }))
      )
      logger.debug(`✅ Copied ${policies.length} cancellation policies`)

      // ── 4a. Cancellation Reasons ───────────────────────────────────────
      const { data: reasons, error: reasErr } = await supabase
        .from('cancellation_reasons')
        .select('*')
        .is('tenant_id', null)

      if (!reasErr && reasons?.length) {
        await supabase.from('cancellation_reasons').insert(
          reasons.map(r => ({
            ...r,
            id: crypto.randomUUID(),
            tenant_id: tenantId,
            policy_id: r.policy_id ? (polIdMap.get(r.policy_id) ?? r.policy_id) : null,
            created_at: now,
            updated_at: now,
          }))
        )
        logger.debug(`✅ Copied ${reasons.length} cancellation reasons`)
      }
    }
  } catch (err) { logger.warn('⚠️ Cancellation copy failed:', err) }

  // ── 5. Payment Methods ─────────────────────────────────────────────────────
  try {
    const { data: payMethods, error: pmErr } = await supabase
      .from('payment_methods')
      .select('*')
      .is('tenant_id', null)

    if (!pmErr && payMethods?.length) {
      await supabase.from('payment_methods').insert(
        payMethods.map(pm => ({ ...pm, id: crypto.randomUUID(), tenant_id: tenantId, created_at: now, updated_at: now }))
      )
      logger.debug(`✅ Copied ${payMethods.length} payment methods`)
    }
  } catch (err) { logger.warn('⚠️ Payment methods copy failed:', err) }
}