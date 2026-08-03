// server/api/booking/get-locations.get.ts
// Public endpoint to get available locations for a tenant.
// Optional category_code filters to locations that offer that category.

import { defineEventHandler, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { tenant_id, category_code } = getQuery(event)

  if (!tenant_id || typeof tenant_id !== 'string') {
    return {
      locations: []
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  )

  try {
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, address, location_type, is_active, available_categories')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('location_type', 'standard')
      .order('name', { ascending: true })

    if (error) throw error

    let result = locations || []

    if (category_code && typeof category_code === 'string') {
      result = result.filter((location: any) => {
        const cats = location.available_categories
        if (!Array.isArray(cats) || cats.length === 0) {
          // Empty = no category restriction stored → exclude for safety
          // (booking page also requires explicit category match)
          return false
        }
        return cats.includes(category_code)
      })
    }

    return {
      locations: result.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        location_type: loc.location_type,
        available_categories: loc.available_categories || [],
      }))
    }
  } catch (err: any) {
    console.error('❌ Error fetching locations:', err)
    return {
      locations: []
    }
  }
})
