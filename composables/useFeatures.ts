import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

type FeatureFlags = Record<string, boolean>

const cache = {
  flags: ref<FeatureFlags>({}),
  loadedForTenant: ref<string | null>(null),
  isLoading: ref(false)
}

export function useFeatures() {
  const load = async (tenantId?: string) => {
    if (cache.isLoading.value) return
    const auth = useAuthStore()
    const supabase = getSupabase()
    const currentTenantId = tenantId || (auth.userProfile as any)?.tenant_id
    if (!currentTenantId) return

    if (cache.loadedForTenant.value === currentTenantId && Object.keys(cache.flags.value).length > 0) return

    cache.isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('setting_key, setting_value')
        .eq('tenant_id', currentTenantId)
        .eq('category', 'features')

      if (error) return

      const flags: FeatureFlags = {}
      for (const row of data || []) {
        flags[row.setting_key] = row.setting_value === 'true'
      }
      cache.flags.value = flags
      cache.loadedForTenant.value = currentTenantId
    } finally {
      cache.isLoading.value = false
    }
  }

  const isEnabled = (key: string, fallback = false) => {
    const flags = cache.flags.value
    if (Object.prototype.hasOwnProperty.call(flags, key)) return !!flags[key]
    return fallback
  }

  const setEnabled = async (key: string, value: boolean, tenantIdOverride?: string) => {
    const auth = useAuthStore()
    const supabase = getSupabase()
    const tenantId = tenantIdOverride || (auth.userProfile as any)?.tenant_id
    if (!tenantId) return

    const prev = cache.flags.value[key]
    cache.flags.value = { ...cache.flags.value, [key]: value }
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .upsert({
          tenant_id: tenantId,
          category: 'features',
          setting_key: key,
          setting_value: value ? 'true' : 'false',
          setting_type: 'boolean'
        }, { onConflict: 'tenant_id,category,setting_key' })
      if (error) throw error
    } catch (e) {
      // revert on failure
      cache.flags.value = { ...cache.flags.value, [key]: prev }
      throw e
    }
  }

  return { flags: cache.flags, isLoading: cache.isLoading, load, isEnabled, setEnabled }
}


