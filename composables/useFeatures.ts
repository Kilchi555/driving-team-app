import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

type FeatureFlags = Record<string, boolean>

type FeatureDefinition = {
  key: string
  displayName: string
  description: string
  icon: string
  isVisible: boolean
  sortOrder: number
  isEnabled: boolean
}

const cache = {
  flags: ref<FeatureFlags>({}),
  definitions: ref<FeatureDefinition[]>([]),
  loadedForTenant: ref<string | null>(null),
  isLoading: ref(false)
}

export function useFeatures() {
  const load = async (tenantId?: string) => {
    logger.debug('🔍 useFeatures.load() called with tenantId:', tenantId)
    if (cache.isLoading.value) {
      logger.debug('🔍 useFeatures.load() skipped - already loading')
      return
    }
    const auth = useAuthStore()
    const supabase = getSupabase()
    const currentTenantId = tenantId || (auth.userProfile as any)?.tenant_id
    logger.debug('🔍 useFeatures.load() currentTenantId:', currentTenantId)
    if (!currentTenantId) {
      logger.debug('🔍 useFeatures.load() skipped - no tenant ID')
      return
    }

    if (cache.loadedForTenant.value === currentTenantId && Object.keys(cache.flags.value).length > 0) {
      logger.debug('🔍 useFeatures.load() skipped - already loaded for tenant:', currentTenantId)
      return
    }

    logger.debug('🔍 useFeatures.load() starting to load features for tenant:', currentTenantId)
    cache.isLoading.value = true
    try {
      // Load feature definitions and tenant business_type in parallel
      const [{ data: definitionsData, error: definitionsError }, { data: tenantData }] = await Promise.all([
        supabase
          .from('tenant_settings')
          .select('setting_key, setting_value')
          .eq('tenant_id', currentTenantId)
          .eq('category', 'features')
          .order('created_at'),
        supabase
          .from('tenants')
          .select('business_type')
          .eq('id', currentTenantId)
          .single()
      ])

      if (definitionsError) throw definitionsError

      logger.debug('🔍 useFeatures.load() loaded definitionsData:', definitionsData?.length || 0, definitionsData)

      // Build feature definitions from the loaded data
      const definitions: FeatureDefinition[] = []
      const flags: FeatureFlags = {}

      definitionsData?.forEach(row => {
        try {
          // Parse JSON metadata from setting_value
          const metadata = JSON.parse(row.setting_value)
          
          // Resolve enabled state regardless of whether displayName/description exist
          // (syncFeatureFlags writes {enabled: bool} only; the definitions UI needs displayName)
          let isEnabled = false
          if (typeof metadata.enabled === 'boolean') {
            isEnabled = metadata.enabled
          } else if (metadata.displayName) {
            // Legacy: has displayName but no enabled field → assume enabled
            isEnabled = true
          }

          // Always populate the flags map so isEnabled() works for nav gating
          flags[row.setting_key] = isEnabled

          // Only add to definitions list when full metadata is present (for feature toggle UI)
          if (metadata.displayName && metadata.description) {
            // Check if this is a driving_school specific feature and filter by business_type
            const drivingSchoolOnlyFeatures = ['categories_enabled', 'exams_enabled', 'experts_enabled', 'examiners_enabled']
            if (drivingSchoolOnlyFeatures.includes(row.setting_key)) {
              if (tenantData?.business_type !== 'driving_school') {
                logger.debug('🚫 Hiding driving school feature', row.setting_key, 'for business_type:', tenantData?.business_type)
                return
              }
            }

            if (row.setting_key === 'courses_enabled') {
              logger.debug('✅ Processing courses_enabled feature:', {
                tenantBusinessType: tenantData?.business_type,
                metadata,
                isEnabled,
                settingValue: row.setting_value
              })
            }

            definitions.push({
              key: row.setting_key,
              displayName: metadata.displayName,
              description: metadata.description,
              icon: metadata.icon || '⚙️',
              isVisible: true,
              sortOrder: metadata.sortOrder || 0,
              isEnabled
            })
          }
        } catch (e) {
          // Skip invalid JSON entries completely
          console.warn(`Feature ${row.setting_key} has invalid JSON:`, row.setting_value)
        }
      })

      // Sort definitions by sortOrder
      definitions.sort((a, b) => a.sortOrder - b.sortOrder)

      logger.debug('🔍 useFeatures.load() final definitions:', definitions.length, definitions.map(d => d.key))
      logger.debug('🔍 useFeatures.load() final flags:', flags)

      cache.flags.value = flags
      cache.definitions.value = definitions
      cache.loadedForTenant.value = currentTenantId
    } catch (error) {
      console.error('Failed to load features:', error)
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
    if (!(auth.userProfile as any)?.tenant_id && !tenantIdOverride) return

    const prev = cache.flags.value[key]

    // Optimistic UI update
    cache.flags.value = { ...cache.flags.value, [key]: value }
    cache.definitions.value = cache.definitions.value.map(def =>
      def.key === key ? { ...def, isEnabled: value } : def
    )

    try {
      const featureDef = cache.definitions.value.find(def => def.key === key)
      const metadata = featureDef ? {
        displayName: featureDef.displayName,
        description: featureDef.description,
        icon: featureDef.icon,
        sortOrder: featureDef.sortOrder
      } : undefined

      // Use server-side API so service_role key is used (avoids RLS 401)
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      await $fetch('/api/admin/features/toggle', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: { key, value, metadata }
      })

      logger.debug(`✅ Feature ${key} ${value ? 'enabled' : 'disabled'} successfully`)
    } catch (e) {
      // Revert on failure
      cache.flags.value = { ...cache.flags.value, [key]: prev }
      cache.definitions.value = cache.definitions.value.map(def =>
        def.key === key ? { ...def, isEnabled: prev } : def
      )
      console.error(`❌ Failed to toggle feature ${key}:`, e)
      throw e
    }
  }

  return { flags: cache.flags, definitions: cache.definitions, isLoading: cache.isLoading, load, isEnabled, setEnabled }
}


