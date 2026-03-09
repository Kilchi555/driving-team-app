// server/api/booking/get-categories.get.ts
// Public endpoint to get available categories for a tenant

import { defineEventHandler } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const { tenant_id } = getQuery(event)

  if (!tenant_id || typeof tenant_id !== 'string') {
    return {
      categories: []
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  )

  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, code, name, lesson_duration_minutes, is_active, parent_category_id')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .not('parent_category_id', 'is', null) // Only subcategories

    if (error) throw error

    return {
      categories: categories || []
    }
  } catch (err: any) {
    console.error('❌ Error fetching categories:', err)
    return {
      categories: []
    }
  }
})
