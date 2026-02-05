// server/api/booking/get-tenant-by-slug.post.ts
// Public API endpoint to fetch tenant data by slug or ID
// This is used by the public booking page

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { slug, id } = body

  if (!slug && !id) {
    throw createError({
      statusCode: 400,
      message: 'Must provide either slug or id'
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    let tenantData = null
    let error = null

    console.log('🔍 Looking up tenant by slug/id:', { slug, id })

    // First try to find by slug
    if (slug) {
      console.log('📋 Querying by slug:', slug)
      const { data, error: slErr } = await supabase
        .from('tenants')
        .select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, description')
        .eq('slug', slug)
        .single()

      if (slErr) {
        console.warn('⚠️ Slug lookup error:', slErr)
        error = slErr
      } else if (data) {
        console.log('✅ Tenant found by slug:', data.id)
        tenantData = data
        error = null
      }
    }

    // If not found by slug and id provided, try by ID
    if (!tenantData && id) {
      console.log('📋 Querying by id:', id)
      const { data, error: idErr } = await supabase
        .from('tenants')
        .select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, description')
        .eq('id', id)
        .single()

      if (idErr) {
        console.warn('⚠️ ID lookup error:', idErr)
        error = idErr
      } else if (data) {
        console.log('✅ Tenant found by id:', data.id)
        tenantData = data
        error = null
      }
    }

    if (error || !tenantData) {
      const errorMsg = `Tenant not found: ${slug || id}`
      console.error('❌ ' + errorMsg, error)
      throw createError({
        statusCode: 404,
        message: errorMsg
      })
    }

    return {
      success: true,
      data: tenantData
    }
  } catch (err: any) {
    console.error('❌ Error fetching tenant:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch tenant'
    })
  }
})
