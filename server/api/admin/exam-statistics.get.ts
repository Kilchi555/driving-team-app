import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  // Load exam results with related data
  const { data: examData, error: examError } = await supabase
    .from('exam_results')
    .select(`
      *,
      appointments (
        id,
        title,
        type,
        user_id,
        staff_id,
        users:user_id (
          first_name,
          last_name
        ),
        staff:staff_id (
          first_name,
          last_name
        )
      ),
      examiners (
        id,
        first_name,
        last_name
      )
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('exam_date', { ascending: false })

  if (examError) throw createError({ statusCode: 500, statusMessage: examError.message })

  // Load staff list
  const { data: staffData, error: staffError } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('tenant_id', profile.tenant_id)
    .eq('role', 'staff')
    .eq('is_active', true)

  if (staffError) throw createError({ statusCode: 500, statusMessage: staffError.message })

  // Load examiner list
  const { data: examinerData, error: examinerError } = await supabase
    .from('examiners')
    .select('id, first_name, last_name')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)

  if (examinerError) throw createError({ statusCode: 500, statusMessage: examinerError.message })

  // Get tenant business_type to decide whether to load categories
  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .select('business_type')
    .eq('id', profile.tenant_id)
    .single()

  if (tenantError) throw createError({ statusCode: 500, statusMessage: tenantError.message })

  let categoryData: any[] = []
  if (tenantData?.business_type === 'driving_school') {
    const { data: cats, error: categoryError } = await supabase
      .from('categories')
      .select('code, name')
      .eq('tenant_id', profile.tenant_id)
      .eq('is_active', true)

    if (categoryError) throw createError({ statusCode: 500, statusMessage: categoryError.message })
    categoryData = cats || []
  }

  return {
    examResults: examData || [],
    staffList: staffData || [],
    examinerList: examinerData || [],
    categoryList: categoryData,
  }
})
