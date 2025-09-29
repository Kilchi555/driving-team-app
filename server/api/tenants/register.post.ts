// server/api/tenants/register.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'

interface TenantRegistrationData {
  name: string
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
}

interface RegistrationResponse {
  success: boolean
  tenant?: any
  error?: string
}

export default defineEventHandler(async (event): Promise<RegistrationResponse> => {
  try {
    // Nur POST erlaubt
    if (event.method !== 'POST') {
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed'
      })
    }

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
      secondary_color: '#10B981'
    }

    let logoFile: File | null = null

    // FormData-Felder verarbeiten
    console.log('🔍 Processing FormData fields:')
    for (const field of formData) {
      console.log(`  Field: ${field.name}, Type: ${field.type}, Filename: ${field.filename}`)
      
      if (field.name === 'logo_file' && field.filename) {
        // Logo-Datei
        logoFile = new File([field.data], field.filename, {
          type: field.type || 'image/jpeg'
        })
        console.log(`  ✅ Processed logo file: ${field.filename}`)
      } else if (field.name && field.data) {
        // Text-Felder
        const value = field.data.toString()
        if (field.name in data) {
          (data as any)[field.name] = value
          console.log(`  ✅ Set ${field.name} = ${value}`)
        } else {
          console.warn(`  ⚠️ Unknown field: ${field.name}`)
        }
      }
    }

    // Logo-File zu data hinzufügen
    data.logo_file = logoFile

    console.log('🏢 Starting tenant registration for:', data.name)
    console.log('📊 Final data object:', JSON.stringify(data, null, 2))

    // Validierung
    const validationError = validateTenantData(data)
    if (validationError) {
      throw createError({
        statusCode: 400,
        statusMessage: validationError
      })
    }

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

    // 2. Prüfen ob E-Mail bereits existiert
    const { data: existingEmail } = await supabase
      .from('tenants')
      .select('id')
      .eq('contact_email', data.contact_email)
      .single()

    if (existingEmail) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese E-Mail-Adresse ist bereits registriert.'
      })
    }

    // 3. Logo hochladen (falls vorhanden)
    let logoUrl: string | null = null
    if (data.logo_file) {
      try {
        logoUrl = await uploadTenantLogo(data.logo_file, data.slug)
        console.log('✅ Logo uploaded successfully:', logoUrl)
      } catch (logoError) {
        console.warn('⚠️ Logo upload failed, continuing without logo:', logoError)
        // Weiter ohne Logo - nicht kritisch
      }
    }

    // 4. Kundennummer generieren
    const customerNumber = await generateCustomerNumber(supabase)
    console.log('🔢 Generated customer number:', customerNumber)

    // 5. Tenant in Datenbank erstellen
    const tenantId = crypto.randomUUID()
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 30) // 30 Tage Trial
    
    const { data: newTenant, error: insertError } = await supabase
      .from('tenants')
      .insert({
        id: tenantId,
        name: data.name,
        slug: data.slug,
        domain: `simy.ch/${data.slug}`, // Automatische Domain
        customer_number: customerNumber,
        contact_person_first_name: data.contact_person_first_name,
        contact_person_last_name: data.contact_person_last_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        address: `${data.street} ${data.streetNr}, ${data.zip} ${data.city}`,
        business_type: data.business_type,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        // Standard-Farben setzen
        accent_color: data.primary_color, // Gleiche wie primary
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
        timezone: 'Europe/Zurich',
        currency: 'CHF',
        language: 'de',
        is_active: true,
        is_trial: true,
        trial_ends_at: trialEndsAt.toISOString(),
        subscription_plan: 'trial',
        subscription_status: 'active',
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
        statusMessage: `Tenant-Erstellung fehlgeschlagen: ${insertError.message}`
      })
    }

    // 6. Standard-Kategorien und Templates kopieren (optional)
    try {
      await copyDefaultDataToTenant(tenantId)
      console.log('✅ Default data copied to tenant')
    } catch (defaultDataError) {
      console.warn('⚠️ Default data copy failed:', defaultDataError)
      // Nicht kritisch - Tenant ist bereits erstellt
    }

    console.log('🎉 Tenant registration completed successfully:', newTenant.slug)
    console.log('📊 New tenant data:', newTenant)
    console.log('🔢 Customer number in response:', newTenant.customer_number)

    const response = {
      success: true,
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
    
    console.log('📤 Sending response:', JSON.stringify(response, null, 2))
    return response

  } catch (error: any) {
    console.error('❌ Tenant registration error:', error)
    
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
 * Lädt ein Tenant-Logo hoch
 */
async function uploadTenantLogo(file: File, tenantSlug: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  
  // Dateiname generieren
  const timestamp = Date.now()
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${tenantSlug}-logo-${timestamp}.${fileExtension}`
  const filePath = `tenant-logos/${fileName}`

  console.log('🔄 Uploading tenant logo:', filePath)

  // File zu Buffer konvertieren (für Supabase Storage)
  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = new Uint8Array(arrayBuffer)

  // Upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('public')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) {
    throw new Error(`Logo-Upload fehlgeschlagen: ${uploadError.message}`)
  }

  // Öffentliche URL generieren
  const { data: urlData } = supabase.storage
    .from('public')
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
  
  // Pfad aus URL extrahieren
  const url = new URL(logoUrl)
  const pathParts = url.pathname.split('/storage/v1/object/public/public/')
  if (pathParts.length < 2) return
  
  const filePath = pathParts[1]
  
  const { error } = await supabase.storage
    .from('public')
    .remove([filePath])

  if (error) {
    throw new Error(`Logo-Löschung fehlgeschlagen: ${error.message}`)
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
    console.log('⚠️ SQL function not available, using manual generation')
    
    const now = new Date()
    const datePrefix = now.getFullYear().toString().slice(-2) +  // YY
                      (now.getMonth() + 1).toString().padStart(2, '0') +  // MM
                      now.getDate().toString().padStart(2, '0')  // DD
    
    const year = now.getFullYear().toString().slice(-2)
    
    // Finde die höchste Nummer für dieses Jahr (nicht nur heute!)
    const { data: existingNumbers } = await supabase
      .from('tenants')
      .select('customer_number')
      .not('customer_number', 'is', null)
      .like('customer_number', `SM-${year}%`)  // Alle Nummern dieses Jahres
      .order('customer_number', { ascending: false })
      .limit(1)
    
    let nextNumber = 1  // Beginne bei 1 für den ersten Kunden des Jahres
    if (existingNumbers && existingNumbers.length > 0) {
      const lastNumber = existingNumbers[0].customer_number
      // Parse: SM-YYMMDD-XXX und extrahiere XXX
      const match = lastNumber.match(new RegExp(`^SM-${year}\\d{4}-(\\d+)$`))
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }
    
    const customerNumber = `SM-${datePrefix}-${nextNumber}`
    console.log(`🔢 Generated customer number: ${customerNumber}`)
    
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
 * Kopiert Standard-Daten zu einem neuen Tenant
 */
async function copyDefaultDataToTenant(tenantId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  
  try {
    // Standard-Kategorien kopieren
    const { data: standardCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', '00000000-0000-0000-0000-000000000000') // Default Tenant
      .eq('is_active', true)

    if (standardCategories && standardCategories.length > 0) {
      const newCategories = standardCategories.map(cat => ({
        ...cat,
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      await supabase
        .from('categories')
        .insert(newCategories)

      console.log(`✅ Copied ${newCategories.length} categories to tenant`)
    }

    // Weitere Standard-Daten können hier kopiert werden:
    // - Evaluation-Templates
    // - Pricing-Rules
    // - etc.

  } catch (error) {
    console.warn('⚠️ Error copying default data:', error)
    // Nicht kritisch - Tenant funktioniert auch ohne Standard-Daten
  }
}