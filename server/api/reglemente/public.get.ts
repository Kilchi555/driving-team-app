/**
 * Public API to fetch regulations (AGB, Datenschutz, etc.) without authentication
 * Used for course enrollment and registration flows
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId, type } = query

  if (!tenantId || !type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameters: tenantId, type'
    })
  }

  // Validate type
  const validTypes = ['agb', 'datenschutz', 'nutzungsbedingungen', 'widerruf']
  if (!validTypes.includes(type as string)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid regulation type'
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    // Fetch the regulation from the database
    console.log('🔍 Fetching regulation:', { tenantId, type })
    
    const { data: regulation, error: regError } = await supabase
      .from('tenant_reglements')
      .select('content, updated_at, title')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .eq('is_active', true)
      .single()

    console.log('📋 Query result:', { regulation, error: regError?.message })
    
    if (regError || !regulation) {
      // Try to get a default/template regulation
      const { data: defaultReg } = await supabase
        .from('tenant_reglements')
        .select('content, updated_at, title')
        .is('tenant_id', null)
        .eq('type', type)
        .eq('is_active', true)
        .single()

      if (defaultReg) {
        console.log('✅ Using default regulation')
        return {
          content: defaultReg.content,
          updatedAt: defaultReg.updated_at,
          title: defaultReg.title,
          isDefault: true
        }
      }

      // Fallback: Return placeholder content instead of 404
      const placeholders: Record<string, string> = {
        agb: '<h1>Allgemeine Geschäftsbedingungen</h1><p>Die Allgemeinen Geschäftsbedingungen werden in Kürze bereitgestellt.</p>',
        datenschutz: '<h1>Datenschutz</h1><p>Unsere Datenschutzerklärung wird in Kürze bereitgestellt.</p>',
        nutzungsbedingungen: '<h1>Nutzungsbedingungen</h1><p>Die Nutzungsbedingungen werden in Kürze bereitgestellt.</p>',
        widerruf: '<h1>Widerrufsrecht</h1><p>Informationen zum Widerrufsrecht werden in Kürze bereitgestellt.</p>'
      }

      console.log('⚠️ Using placeholder for type:', type)
      return {
        content: placeholders[type as string] || '<p>Keine Inhalte verfügbar</p>',
        updatedAt: new Date().toISOString(),
        isDefault: true,
        isPlaceholder: true
      }
    }

    console.log('✅ Regulation found')
    return {
      content: regulation.content,
      updatedAt: regulation.updated_at,
      title: regulation.title,
      isDefault: false
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

