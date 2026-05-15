import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Returns standard category templates (tenant_id IS NULL) and the codes already
// existing for the current tenant so the UI can pre-select existing ones.
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const [standardResult, existingResult] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .is('tenant_id', null)
      .order('code', { ascending: true }),
    supabase
      .from('categories')
      .select('code')
      .eq('tenant_id', profile.tenant_id)
  ])

  if (standardResult.error) {
    throw createError({ statusCode: 500, statusMessage: standardResult.error.message })
  }

  return {
    standardTemplates: standardResult.data ?? [],
    existingCodes: (existingResult.data ?? []).map((c: any) => c.code)
  }
})
