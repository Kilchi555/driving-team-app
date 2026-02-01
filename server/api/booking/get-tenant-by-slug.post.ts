// server/api/booking/get-tenant-by-slug.post.ts
// Public API endpoint to fetch tenant data by slug or ID
// This is used by the public booking page

import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { slug, id } = body

  if (!slug && !id) {
    throw createError({
      statusCode: 400,
      message: 'Must provide either slug or id'
    })
  }

  const supabase = serverSupabaseClient(event)

  try {
    let tenantData = null
    let error = null

    // First try to find by slug
    if (slug) {
      const { data, error: slErr } = await supabase
        .from('tenants')
        .select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, description')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (!slErr && data) {
        tenantData = data
        error = null
      } else {
        error = slErr
      }
    }

    // If not found by slug and id provided, try by ID
    if (!tenantData && id) {
      const { data, error: idErr } = await supabase
        .from('tenants')
        .select('id, name, slug, business_type, primary_color, secondary_color, accent_color, logo_url, description')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (!idErr && data) {
        tenantData = data
        error = null
      } else {
        error = idErr
      }
    }

    if (error || !tenantData) {
      throw createError({
        statusCode: 404,
        message: `Tenant not found: ${slug || id}`
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
