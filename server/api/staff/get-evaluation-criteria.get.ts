// server/api/staff/get-evaluation-criteria.get.ts
import { defineEventHandler, getQuery } from 'h3'
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
    
    console.log(`[${new Date().toLocaleTimeString()}] 📚 Loading evaluation criteria for user:`, user.id, 'isTheory:', isTheoryLesson, 'category:', studentCategory)
    
    // Only tenant-owned categories/criteria — never global templates
    const { data: criteriaRows, error: criteriaError } = await supabase
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
      .eq('tenant_id', user.tenant_id)
      .eq('evaluation_categories.is_theory', isTheoryLesson)
      .eq('evaluation_categories.tenant_id', user.tenant_id)
      .order('evaluation_categories(display_order), display_order', { ascending: true })

    if (criteriaError) {
      console.error(`[${new Date().toLocaleTimeString()}] ❌ Error loading evaluation criteria:`, criteriaError)
    }

    const criteria = criteriaRows || []
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Loaded ${isTheoryLesson ? 'theory' : 'practical'} criteria (tenant only): ${criteria.length}`)
    
    // Sort by category display_order, then by criteria display_order
    criteria.sort((a, b) => {
      const catOrderA = a.evaluation_categories?.[0]?.display_order ?? 999
      const catOrderB = b.evaluation_categories?.[0]?.display_order ?? 999
      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB
      }
      return (a.display_order ?? 999) - (b.display_order ?? 999)
    })
    
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
