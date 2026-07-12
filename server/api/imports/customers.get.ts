import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/utils/supabase'
import { escapeLikePattern, escapeOrFilterValue, sanitizeJsonColumnKey } from '~/server/utils/sql-helpers'
import { logger } from '~/utils/logger'

const SEARCH_COLUMNS = ['Id', 'Datum', 'Titel', 'E-Mail', 'Status', 'Schüler', 'Institution', 'Erstellt von', 'Auftragsnummer']

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)

  const query = getQuery(event)
  const { batchId, search, searchColumn } = query
  const limit = Math.min(parseInt(query.limit as string) || 50, 500)
  const offset = parseInt(query.offset as string) || 0

  const supabaseAdmin = getSupabaseAdmin()

  try {
    logger.debug('🔍 Search parameters:', { tenantId: profile.tenant_id, batchId, search, searchColumn, limit, offset })

    // First get the total count
    let countQuery = supabaseAdmin
      .from('imported_customers')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)

    if (batchId) {
      countQuery = countQuery.eq('batch_id', batchId)
    }

    let safeColumn: string | null = null
    if (search && searchColumn) {
      safeColumn = sanitizeJsonColumnKey(searchColumn as string)
      if (!safeColumn) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid searchColumn' })
      }
    }

    if (search) {
      const escapedTerm = `%${escapeLikePattern(search as string)}%`
      if (safeColumn) {
        countQuery = countQuery.ilike(`raw_json->>${safeColumn}`, escapedTerm)
      } else {
        const orTerm = escapeOrFilterValue(escapedTerm)
        countQuery = countQuery.or(SEARCH_COLUMNS.map(col => `raw_json->>${col}.ilike.${orTerm}`).join(','))
      }
    }

    const { count, error: countError } = await countQuery

    logger.debug('📊 Count result:', { count, error: countError })

    if (countError) {
      console.error('Error counting imported customers:', countError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to count imported customers'
      })
    }

    // Then get the actual data
    let dataQuery = supabaseAdmin
      .from('imported_customers')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)

    if (batchId) {
      dataQuery = dataQuery.eq('batch_id', batchId)
    }

    if (search) {
      const escapedTerm = `%${escapeLikePattern(search as string)}%`
      if (safeColumn) {
        dataQuery = dataQuery.ilike(`raw_json->>${safeColumn}`, escapedTerm)
      } else {
        const orTerm = escapeOrFilterValue(escapedTerm)
        dataQuery = dataQuery.or(SEARCH_COLUMNS.map(col => `raw_json->>${col}.ilike.${orTerm}`).join(','))
      }
    }

    const { data, error } = await dataQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    logger.debug('📋 Data result:', { dataLength: data?.length, error })

    if (error) {
      console.error('Error fetching imported customers:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch imported customers'
      })
    }

    return {
      success: true,
      customers: data,
      total: count,
      limit: limit,
      offset: offset
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Imported customers fetch failed:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch imported customers'
    })
  }
})
