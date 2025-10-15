import { getSupabaseAdmin } from '~/utils/supabase'
import { routeRequiresFeatureFlag, validateFeatureAccess } from '~/utils/featureFlags'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId, batchId, search, searchColumn } = query
  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'tenantId is required'
    })
  }

  // Check feature flag
  const url = event.node.req.url || ''
  if (routeRequiresFeatureFlag(url)) {
    const featureCheck = await validateFeatureAccess(tenantId, url)
    if (!featureCheck.enabled) {
      throw createError({
        statusCode: 403,
        statusMessage: `Feature access denied: ${featureCheck.message}`
      })
    }
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    console.log('🔍 Search parameters:', { tenantId, batchId, search, searchColumn, limit, offset })
    console.log('🔍 Decoded searchColumn:', decodeURIComponent(searchColumn || ''))
    
    // First get the total count
    let countQuery = supabaseAdmin
      .from('imported_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (batchId) {
      countQuery = countQuery.eq('batch_id', batchId)
    }

    if (search) {
      if (searchColumn) {
        console.log('🔎 invoices count - column specific search:', searchColumn, search)
        // Column-specific search
        countQuery = countQuery.ilike(`raw_json->>${searchColumn}`, `%${search}%`)
      } else {
        console.log('🔎 invoices count - general search:', search)
        // Search across all major columns dynamically
        const searchTerm = `%${search}%`
        countQuery = countQuery.or(`raw_json->>Id.ilike.${searchTerm},raw_json->>Datum.ilike.${searchTerm},raw_json->>Titel.ilike.${searchTerm},raw_json->>E-Mail.ilike.${searchTerm},raw_json->>Status.ilike.${searchTerm},raw_json->>Schüler.ilike.${searchTerm},raw_json->>Institution.ilike.${searchTerm},raw_json->>Erstellt von.ilike.${searchTerm},raw_json->>Auftragsnummer.ilike.${searchTerm}`)
      }
    }

    const { count, error: countError } = await countQuery

    console.log('📊 Invoice count result:', { count, error: countError })

    if (countError) {
      console.error('Error counting imported invoices:', countError)
      console.error('Full error details:', JSON.stringify(countError, null, 2))
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to count imported invoices: ${countError.message}`
      })
    }

    // Then get the actual data
    let dataQuery = supabaseAdmin
      .from('imported_invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (batchId) {
      dataQuery = dataQuery.eq('batch_id', batchId)
    }

    if (search) {
      if (searchColumn) {
        console.log('🔎 invoices data - column specific search:', searchColumn, search)
        // Column-specific search
        dataQuery = dataQuery.ilike(`raw_json->>${searchColumn}`, `%${search}%`)
      } else {
        console.log('🔎 invoices data - general search:', search)
        // Search across all major columns dynamically
        const searchTerm = `%${search}%`
        dataQuery = dataQuery.or(`raw_json->>Id.ilike.${searchTerm},raw_json->>Datum.ilike.${searchTerm},raw_json->>Titel.ilike.${searchTerm},raw_json->>E-Mail.ilike.${searchTerm},raw_json->>Status.ilike.${searchTerm},raw_json->>Schüler.ilike.${searchTerm},raw_json->>Institution.ilike.${searchTerm},raw_json->>Erstellt von.ilike.${searchTerm},raw_json->>Auftragsnummer.ilike.${searchTerm}`)
      }
    }

    const { data, error } = await dataQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    console.log('📋 Invoice data result:', { dataLength: data?.length, error })

    if (error) {
      console.error('Error fetching imported invoices:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to fetch imported invoices: ${error.message}`
      })
    }

    return {
      success: true,
      invoices: data,
      total: count,
      limit: limit,
      offset: offset
    }
  } catch (error: any) {
    console.error('Imported invoices fetch failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch imported invoices'
    })
  }
})
