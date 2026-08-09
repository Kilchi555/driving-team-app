/**
 * Public API to fetch regulations (AGB, Datenschutz, etc.) without authentication
 * Used for course enrollment and registration flows
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  loadReglementTenantData,
  resolveReglementContent,
} from '~/server/utils/reglement-tenant-data'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId, type } = query

  if (!tenantId || !type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters: tenantId, type'
    })
  }

  const validTypes = ['agb', 'datenschutz', 'nutzungsbedingungen', 'widerruf', 'haftung', 'rueckerstattung']
  if (!validTypes.includes(type as string)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid regulation type'
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    const tenantData = await loadReglementTenantData(supabase, String(tenantId))

    const { data: regulation, error: regError } = await supabase
      .from('tenant_reglements')
      .select('content, updated_at, title')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle()

    let rawContent: string | null = regulation?.content ?? null
    let title = regulation?.title ?? null
    let updatedAt = regulation?.updated_at ?? null
    let isDefault = false
    let isPlaceholder = false

    if (regError || !rawContent) {
      const { data: defaultReg } = await supabase
        .from('tenant_reglements')
        .select('content, updated_at, title')
        .is('tenant_id', null)
        .eq('type', type)
        .eq('is_active', true)
        .maybeSingle()

      if (defaultReg?.content) {
        rawContent = defaultReg.content
        title = defaultReg.title
        updatedAt = defaultReg.updated_at
        isDefault = true
      } else {
        const placeholders: Record<string, string> = {
          agb: '<h1>Allgemeine Geschäftsbedingungen</h1><p>Die Allgemeinen Geschäftsbedingungen werden in Kürze bereitgestellt.</p>',
          datenschutz: '<h1>Datenschutz</h1><p>Unsere Datenschutzerklärung wird in Kürze bereitgestellt.</p>',
          nutzungsbedingungen: '<h1>Nutzungsbedingungen</h1><p>Die Nutzungsbedingungen werden in Kürze bereitgestellt.</p>',
          widerruf: '<h1>Widerrufsrecht</h1><p>Informationen zum Widerrufsrecht werden in Kürze bereitgestellt.</p>',
          haftung: '<h1>Haftung</h1><p>Der Haftungsausschluss wird in Kürze bereitgestellt.</p>',
          rueckerstattung: '<h1>Rückerstattung</h1><p>Die Rückerstattungsrichtlinien werden in Kürze bereitgestellt.</p>',
        }
        rawContent = placeholders[type as string] || '<p>Keine Inhalte verfügbar</p>'
        updatedAt = new Date().toISOString()
        isDefault = true
        isPlaceholder = true
      }
    }

    const content = resolveReglementContent(rawContent, tenantData)

    return {
      content,
      updatedAt,
      title,
      isDefault,
      isPlaceholder,
      tenant: {
        name: tenantData.name || '',
        address: tenantData.address || '',
        email: tenantData.email || '',
        phone: tenantData.phone || '',
        website: tenantData.website || '',
        cancellationHoursBefore: tenantData.cancellationHoursBefore ?? 24,
      },
    }
  } catch (err: any) {
    if (err.statusCode) throw err

    console.error('Error fetching regulation:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching regulation'
    })
  }
})
