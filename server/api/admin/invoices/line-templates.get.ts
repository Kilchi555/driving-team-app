/**
 * GET /api/admin/invoices/line-templates
 *
 * Unified invoice/quote line suggestions: services (categories × event types),
 * course types / courses, and products — each with the current tenant price.
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildInvoiceLineTemplates } from '~/server/utils/invoice-line-templates'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])
  const supabase = getSupabaseAdmin()
  const tenantId = profile.tenant_id

  const [
    terms,
    categoriesRes,
    rulesRes,
    eventTypesRes,
    courseCategoriesRes,
    coursesRes,
    productsRes,
  ] = await Promise.all([
    getTenantTerminology(supabase, tenantId),
    supabase
      .from('categories')
      .select('id, code, name, parent_category_id, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('code', { ascending: true }),
    supabase
      .from('pricing_rules')
      .select('category_code, event_type_code, rule_type, price_per_minute_rappen, base_duration_minutes')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('event_types')
      .select('code, name, default_duration_minutes, default_price_rappen, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('course_categories')
      .select('id, name, default_price_rappen, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    supabase
      .from('courses')
      .select('id, name, description, course_start_date, price_per_participant_rappen, is_active, status, course_category_id, sessions:course_sessions(session_number, start_time, end_time)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('course_start_date', { ascending: true })
      .limit(40),
    supabase
      .from('products')
      .select('id, name, description, price_rappen, is_active, is_credit_product, credit_amount_rappen')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])

  if (categoriesRes.error) throw createError({ statusCode: 500, statusMessage: categoriesRes.error.message })
  if (rulesRes.error) throw createError({ statusCode: 500, statusMessage: rulesRes.error.message })
  if (eventTypesRes.error) throw createError({ statusCode: 500, statusMessage: eventTypesRes.error.message })
  if (courseCategoriesRes.error) throw createError({ statusCode: 500, statusMessage: courseCategoriesRes.error.message })
  if (coursesRes.error) throw createError({ statusCode: 500, statusMessage: coursesRes.error.message })
  if (productsRes.error) throw createError({ statusCode: 500, statusMessage: productsRes.error.message })

  const templates = buildInvoiceLineTemplates({
    terms,
    categories: categoriesRes.data || [],
    pricingRules: rulesRes.data || [],
    eventTypes: eventTypesRes.data || [],
    courseCategories: courseCategoriesRes.data || [],
    courses: coursesRes.data || [],
    products: productsRes.data || [],
  })

  return { success: true, templates }
})
