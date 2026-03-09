// server/api/booking/get-locations.get.ts
// Public endpoint to get available locations for a tenant

import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { tenant_id } = getQuery(event)

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
      .select('id, name, address, location_type, is_active')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('location_type', 'standard')

    if (error) throw error

    return {
      locations: locations || []
    }
  } catch (err: any) {
    console.error('❌ Error fetching locations:', err)
    return {
      locations: []
    }
  }
})
