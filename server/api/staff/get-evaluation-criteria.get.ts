// server/api/staff/get-evaluation-criteria.get.ts
import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user with database ID
    const user = await getAuthenticatedUserWithDbId(event)
    
    if (!user || !user.id || !user.tenant_id) {
      console.log(`[${new Date().toLocaleTimeString()}] ⚠️ get-evaluation-criteria: No authenticated user found - returning empty`)
      return {
        success: true,
        criteria: [],
        tenantId: null
      }
    }
    
    const supabase = getSupabaseAdmin()
    const query = getQuery(event)
    const isTheoryLesson = query.isTheoryLesson === 'true'
    const studentCategory = (query.studentCategory || '') as string

    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', user.tenant_id)
      .maybeSingle()
    const isDrivingSchool = (tenantRow?.business_type || 'driving_school') === 'driving_school'
    
    console.log(`[${new Date().toLocaleTimeString()}] 📚 Loading evaluation criteria for user:`, user.id, 'isTheory:', isTheoryLesson, 'category:', studentCategory)
    
    let criteria: any[] = []
    
    if (isTheoryLesson) {
      // Load tenant-specific theory criteria AND (for driving schools) global criteria
      let theoryQuery = supabase
        .from('evaluation_criteria')
        .select(`
          id, 
          name, 
          description, 
          is_active,
          display_order,
          category_id,
          driving_categories,
          evaluation_categories!inner(tenant_id, is_theory, name, id, display_order)
        `)
        .eq('is_active', true)
        .eq('evaluation_categories.is_theory', true)

      if (isDrivingSchool) {
        theoryQuery = theoryQuery.or(`tenant_id.eq.${user.tenant_id},tenant_id.is.null`, { referencedTable: 'evaluation_categories' })
      } else {
        // Consulting etc.: only own Themen — no Fahrschul-Globalcurriculum
        theoryQuery = theoryQuery.eq('evaluation_categories.tenant_id', user.tenant_id)
      }

      const { data: tenantTheory, error: tenantError } = await theoryQuery
        .order('evaluation_categories(display_order), display_order', { ascending: true })
      
      if (tenantError) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Error loading tenant theory criteria:`, tenantError)
      }
      
      criteria = tenantTheory || []
      console.log(`[${new Date().toLocaleTimeString()}] ✅ Loaded theory criteria - tenant + global: ${criteria.length}`)
    } else {
      let practicalQuery = supabase
        .from('evaluation_criteria')
        .select(`
          id, 
          name, 
          description, 
          is_active,
          display_order,
          category_id,
          driving_categories,
          evaluation_categories!inner(tenant_id, is_theory, name, id, display_order)
        `)
        .eq('is_active', true)
        .eq('evaluation_categories.is_theory', false)

      if (isDrivingSchool) {
        practicalQuery = practicalQuery.or(`tenant_id.eq.${user.tenant_id},tenant_id.is.null`, { referencedTable: 'evaluation_categories' })
      } else {
        practicalQuery = practicalQuery.eq('evaluation_categories.tenant_id', user.tenant_id)
      }

      const { data: tenantPractical, error: tenantError } = await practicalQuery
        .order('evaluation_categories(display_order), display_order', { ascending: true })
      
      if (tenantError) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Error loading tenant practical criteria:`, tenantError)
      }
      
      criteria = tenantPractical || []
      console.log(`[${new Date().toLocaleTimeString()}] ✅ Loaded practical criteria - tenant + global: ${criteria.length}`)
    }
    
    // Sort by category display_order, then by criteria display_order
    criteria.sort((a, b) => {
      // Primary sort by category display_order
      const catOrderA = a.evaluation_categories?.[0]?.display_order ?? 999
      const catOrderB = b.evaluation_categories?.[0]?.display_order ?? 999
      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB
      }
      // Secondary sort by criteria display_order
      return (a.display_order ?? 999) - (b.display_order ?? 999)
    })
    
    // Don't filter here - let the frontend handle category filtering
    // This prevents double-filtering and allows flexibility
    // console.log(`[${new Date().toLocaleTimeString()}] 🚗 Filtered criteria by category ${studentCategory}: ${criteria.length}`)
    
    console.log(`[${new Date().toLocaleTimeString()}] 🎯 Returning ${criteria.length} criteria for tenant ${user.tenant_id}`)
    
    return {
      success: true,
      criteria,
      tenantId: user.tenant_id
    }
    
  } catch (error: any) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Error in get-evaluation-criteria API:`, error)
    return {
      success: false,
      criteria: [],
      error: error.message
    }
  }
})
