// server/api/admin/create-driving-team-tenant.post.ts
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    
    // Create the driving-team tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        id: '64259d68-195a-4c68-8875-f1b44d962830', // Use the same ID that was in the logs
        name: 'Driving Team',
        slug: 'driving-team',
        contact_email: 'info@drivingteam.ch',
        contact_phone: '+41444310033',
        address: 'Musterstrasse 123, 8001 Zürich',
        primary_color: '#059669',
        secondary_color: '#374151',
        accent_color: '#10B981',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating tenant:', error)
      return {
        success: false,
        error: error.message
      }
    }
    
    return {
      success: true,
      message: 'Driving Team tenant created successfully',
      tenant: tenant
    }
    
  } catch (error: any) {
    console.error('Error creating tenant:', error)
    return {
      success: false,
      error: error.message
    }
  }
})


