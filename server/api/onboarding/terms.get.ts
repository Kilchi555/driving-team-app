// server/api/onboarding/terms.get.ts
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

    // Try tenant-specific policies table first
    let terms: string | null = null
    if (tenantId) {
      const { data } = await supabase
        .from('policies')
        .select('content')
        .eq('tenant_id', tenantId)
        .eq('type', 'terms')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      terms = (data as any)?.content || null
    }

    // Fallback to default terms
    if (!terms) {
      const { data } = await supabase
        .from('policies')
        .select('content')
        .is('tenant_id', null)
        .eq('type', 'terms')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      terms = (data as any)?.content || null
    }

    // Last fallback placeholder
    if (!terms) {
      terms = 'Bitte bestätige die Allgemeinen Geschäftsbedingungen deiner Fahrschule.'
    }

    return { terms }
  } catch (error: any) {
    return { terms: 'AGB aktuell nicht verfügbar' }
  }
})


