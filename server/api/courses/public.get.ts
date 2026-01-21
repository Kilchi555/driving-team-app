/**
 * GET /api/courses/public
 * 
 * Public API to fetch courses for a tenant by slug
 * No authentication required - for public course pages
 * 
 * Query Params:
 * - slug: Tenant slug (required, e.g., "driving-team")
 * 
 * Security:
 * - ✅ Rate limiting (prevent scraping)
 * - ✅ Only returns public, active courses
 * - ✅ No sensitive data exposed
 */

import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'

// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)

  if (!entry || now > entry.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  entry.count++
  return entry.count <= limit
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)

  try {
    // ============ LAYER 1: RATE LIMITING ============
    if (!checkRateLimit(ipAddress, 60, 60000)) { // 60 req/min
      logger.warn('🔒 Rate limit exceeded for public courses:', ipAddress)
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests'
      })
    }

    // ============ LAYER 2: INPUT VALIDATION ============
    const query = getQuery(event)
    const slug = query.slug as string

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tenant slug is required'
      })
    }

    // Validate slug format (alphanumeric + hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid slug format'
      })
    }

    logger.debug('📚 Public courses request for slug:', slug)

    // ============ LAYER 3: DATABASE QUERIES ============
    const supabase = getSupabaseAdmin()

    // First, get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, primary_color, secondary_color, accent_color')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      logger.warn('⚠️ Tenant not found:', slug)
      throw createError({
        statusCode: 404,
        statusMessage: 'Fahrschule nicht gefunden'
      })
    }

    // Get public courses for this tenant
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        category,
        description,
        price_per_participant_rappen,
        max_participants,
        current_participants,
        is_public,
        status,
        course_sessions (
          id,
          start_time,
          end_time,
          session_number
        )
      `)
      .eq('tenant_id', tenant.id)
      .eq('is_public', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (coursesError) {
      logger.error('❌ Error fetching courses:', coursesError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error loading courses'
      })
    }

    const duration = Date.now() - startTime
    logger.debug(`✅ Public courses fetched in ${duration}ms:`, courses?.length || 0)

    return {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        accent_color: tenant.accent_color
      },
      courses: courses || [],
      count: courses?.length || 0,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime

    if (error.statusCode) {
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

