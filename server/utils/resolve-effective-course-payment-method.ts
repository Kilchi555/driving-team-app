import {
  applyCoursePaymentAvailability,
  resolveConfiguredCoursePaymentMethod,
  type CoursePaymentMethod,
  type CoursePaymentMethodSource,
} from '~/utils/courseLocationUtils'
import {
  getTenantDefaultPaymentMethod,
  parsePaymentSettings,
} from '~/server/utils/tenant-default-payment-method'

export type EffectiveCoursePaymentResolution = {
  configured: CoursePaymentMethod
  usable: CoursePaymentMethod
  source: CoursePaymentMethodSource
  walleeEnabled: boolean
  invoiceEnabled: boolean
}

export type CoursePaymentResolutionInput = {
  id?: string
  tenant_id: string
  payment_method?: unknown
  city?: string | null
  description?: string | null
  name?: string | null
  course_category_id?: string | null
}

/**
 * Authoritative server-side course payment configuration.
 * Loads category (tenant-scoped) + tenant default + availability flags.
 * Does not trust client-supplied paymentMethod / tenantId / category rows.
 */
export async function resolveEffectiveCoursePaymentMethod(
  supabase: { from: (table: string) => any },
  course: CoursePaymentResolutionInput
): Promise<EffectiveCoursePaymentResolution> {
  const tenantId = course.tenant_id
  const categoryId = course.course_category_id || null

  const [categoryResult, tenantResult, settingsResult, tenantDefault] = await Promise.all([
    categoryId
      ? supabase
          .from('course_categories')
          .select('payment_method')
          .eq('id', categoryId)
          .eq('tenant_id', tenantId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('tenants')
      .select('wallee_enabled')
      .eq('id', tenantId)
      .maybeSingle(),
    supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'payment')
      .eq('setting_key', 'payment_settings')
      .maybeSingle(),
    getTenantDefaultPaymentMethod(supabase, tenantId),
  ])

  const settings = parsePaymentSettings(settingsResult?.data?.setting_value)
  const walleeEnabled = tenantResult?.data?.wallee_enabled === true
  const invoiceEnabled = settings.invoice_payments_enabled === true

  const configured = resolveConfiguredCoursePaymentMethod({
    coursePaymentMethod: course.payment_method,
    categoryPaymentMethod: categoryResult?.data?.payment_method ?? null,
    tenantDefault,
  })

  const usable = applyCoursePaymentAvailability({
    configured: configured.paymentMethod,
    walleeEnabled,
    invoiceEnabled,
    city: course.city,
    description: course.description,
    name: course.name,
  })

  return {
    configured: configured.paymentMethod,
    usable,
    source: configured.source,
    walleeEnabled,
    invoiceEnabled,
  }
}
