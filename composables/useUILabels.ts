import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

type UILabels = Record<string, string>

const cache = {
  labels: ref<UILabels | null>(null),
  loadedForTenant: ref<string | null>(null),
  isLoading: ref(false)
}

export function useUILabels() {
  const get = (key: string, fallback: string) => {
    const map = cache.labels.value || {}
    return (map[key] ?? fallback)
  }

  const load = async (tenantId?: string) => {
    if (cache.isLoading.value) return
    const auth = useAuthStore()
    const supabase = getSupabase()

    const currentTenantId = tenantId || (auth.userProfile as any)?.tenant_id
    if (!currentTenantId) return

    if (cache.loadedForTenant.value === currentTenantId && cache.labels.value) return

    cache.isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('setting_key, setting_value')
        .eq('tenant_id', currentTenantId)
        .eq('category', 'ui_labels')

      if (error) return

      const map: UILabels = {}
      for (const row of data || []) {
        map[row.setting_key] = row.setting_value
      }
      cache.labels.value = map
      cache.loadedForTenant.value = currentTenantId
    } finally {
      cache.isLoading.value = false
    }
  }

  return { labels: cache.labels, isLoading: cache.isLoading, load, get }
}


