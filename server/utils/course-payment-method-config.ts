import { createError } from 'h3'
import {
  parseCoursePaymentMethodOverride,
  type CoursePaymentMethod,
} from '~/utils/courseLocationUtils'

/**
 * Admin writes: NULL / '' / 'inherit' means inherit.
 * Anything else must be an explicit course payment method.
 */
export function parseWritableCoursePaymentMethod(value: unknown): CoursePaymentMethod | null {
  if (value == null || value === '' || value === 'inherit') return null
  const parsed = parseCoursePaymentMethodOverride(value)
  if (!parsed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid payment_method',
    })
  }
  return parsed
}

export async function assertCourseCategoryBelongsToTenant(
  supabase: { from: (table: string) => any },
  categoryId: unknown,
  tenantId: string
): Promise<void> {
  if (categoryId == null || categoryId === '') return
  const { data, error } = await supabase
    .from('course_categories')
    .select('id')
    .eq('id', categoryId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  if (!data) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Course category does not belong to this tenant',
    })
  }
}
