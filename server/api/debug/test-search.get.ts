import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { tenantId, batchId, search, searchColumn } = query

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'tenantId is required'
    })
  }

  const supabaseAdmin = getSupabaseAdmin()

  try {
    console.log('🔍 Testing search with parameters:', { tenantId, batchId, search, searchColumn })
    
    // Test 1: Get all records first
    const { data: allRecords, error: allError } = await supabaseAdmin
      .from('imported_invoices')
      .select('id, raw_json')
      .eq('tenant_id', tenantId)
      .eq('batch_id', batchId)
      .limit(5)

    if (allError) {
      console.error('Error fetching all records:', allError)
    }

    console.log('📊 All records count:', allRecords?.length || 0)
    
    // Test 2: Search in Institution column
    const { data: institutionResults, error: institutionError } = await supabaseAdmin
      .from('imported_invoices')
      .select('id, raw_json')
      .eq('tenant_id', tenantId)
      .eq('batch_id', batchId)
      .ilike('raw_json->>Institution', `%${search || 'Peter'}%`)

    if (institutionError) {
      console.error('Error searching Institution:', institutionError)
    }

    console.log('📊 Institution search results:', institutionResults?.length || 0)

    // Test 3: Search in Schüler column
    const { data: schulerResults, error: schulerError } = await supabaseAdmin
      .from('imported_invoices')
      .select('id, raw_json')
      .eq('tenant_id', tenantId)
      .eq('batch_id', batchId)
      .ilike('raw_json->>Schüler', `%${search || 'Peter'}%`)

    if (schulerError) {
      console.error('Error searching Schüler:', schulerError)
    }

    console.log('📊 Schüler search results:', schulerResults?.length || 0)

    return {
      success: true,
      allRecordsCount: allRecords?.length || 0,
      institutionResultsCount: institutionResults?.length || 0,
      schulerResultsCount: schulerResults?.length || 0,
      sampleAllRecords: allRecords?.slice(0, 2) || [],
      institutionResults: institutionResults || [],
      schulerResults: schulerResults || [],
      errors: {
        all: allError?.message,
        institution: institutionError?.message,
        schuler: schulerError?.message
      }
    }
  } catch (error: any) {
    console.error('Debug search test failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to test search'
    })
  }
})
