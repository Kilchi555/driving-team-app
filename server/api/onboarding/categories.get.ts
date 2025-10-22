// server/api/onboarding/categories.get.ts
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const token = getQuery(event).token as string | undefined

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let tenantId: string | null = null
    if (token) {
      const { data: user } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('onboarding_token', token)
        .single()
      tenantId = user?.tenant_id || null
    }

    // Try tenant-specific categories first
    let categories: any[] = []
    if (tenantId) {
      const { data } = await supabase
        .from('categories')
        .select('id, code, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name')
      categories = data || []
    }

    // Fallback to defaults if empty
    if (!categories || categories.length === 0) {
      const { data } = await supabase
        .from('categories')
        .select('id, code, name')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('name')
      categories = data || []
    }

    // Last fallback hardcoded minimal set
    if (!categories || categories.length === 0) {
      categories = [
        { code: 'B', name: 'B - Auto' },
        { code: 'A1', name: 'A1 - Motorrad 125cc' },
        { code: 'A', name: 'A - Motorrad' },
        { code: 'BE', name: 'BE - Anhänger' }
      ]
    }

    return { categories }
  } catch (error: any) {
    return { categories: [] }
  }
})


