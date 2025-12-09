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
      // Load feature definitions for current tenant
      const { data: definitionsData, error: definitionsError } = await supabase
        .from('tenant_settings')
        .select('setting_key, setting_value')
        .eq('tenant_id', currentTenantId)
        .eq('category', 'features')
        .order('created_at')

      if (definitionsError) throw definitionsError

      logger.debug('🔍 useFeatures.load() loaded definitionsData:', definitionsData?.length || 0, definitionsData)

      // Build feature definitions from the loaded data
      const definitions: FeatureDefinition[] = []
      const flags: FeatureFlags = {}

      // Get tenant business_type first to filter features
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('business_type')
        .eq('id', currentTenantId)
        .single()

      definitionsData?.forEach(row => {
        try {
          // Parse JSON metadata from setting_value
          const metadata = JSON.parse(row.setting_value)
          
          // Only include features with valid metadata (displayName and description)
          if (metadata.displayName && metadata.description) {
            // Handle different JSON structures - some have 'enabled' field, others don't
            let isEnabled = false
            if (typeof metadata.enabled === 'boolean') {
              isEnabled = metadata.enabled
            } else if (metadata.displayName && !metadata.enabled) {
              // If displayName exists but no enabled field, assume it's enabled (for backwards compatibility)
              isEnabled = true
            }
            
            // Check if this is a driving_school specific feature and filter by business_type
            const drivingSchoolOnlyFeatures = ['categories_enabled', 'exams_enabled', 'experts_enabled', 'examiners_enabled']
            if (drivingSchoolOnlyFeatures.includes(row.setting_key)) {
              // Only show driving school specific features for driving_school business_type
              if (tenantData?.business_type !== 'driving_school') {
                logger.debug('🚫 Hiding driving school feature', row.setting_key, 'for business_type:', tenantData?.business_type)
                return // Skip this feature
              }
            }
            
            // courses_enabled is available for all business types
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

            flags[row.setting_key] = isEnabled
          } else {
            console.warn(`Feature ${row.setting_key} has incomplete metadata:`, metadata)
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
    const supabase = getSupabase()
    const tenantId = tenantIdOverride || (auth.userProfile as any)?.tenant_id
    if (!tenantId) return

    const prev = cache.flags.value[key]
    
    // Update cache immediately for responsive UI
    cache.flags.value = { ...cache.flags.value, [key]: value }
    
    // Update definitions cache as well
    const updatedDefinitions = cache.definitions.value.map(def => 
      def.key === key ? { ...def, isEnabled: value } : def
    )
    cache.definitions.value = updatedDefinitions
    
    try {
      // Find the feature definition to preserve metadata
      const featureDef = cache.definitions.value.find(def => def.key === key)
      
      if (featureDef) {
        // Update the JSON metadata with new enabled state
        const updatedMetadata = {
          displayName: featureDef.displayName,
          description: featureDef.description,
          icon: featureDef.icon,
          sortOrder: featureDef.sortOrder,
          enabled: value
        }
        
        const { error } = await supabase
          .from('tenant_settings')
          .upsert({
            tenant_id: tenantId,
            category: 'features',
            setting_key: key,
            setting_value: JSON.stringify(updatedMetadata),
            setting_type: 'json'
          }, { onConflict: 'tenant_id,category,setting_key' })
          
        if (error) throw error
      } else {
        // Fallback for legacy boolean features
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
      }
      
      logger.debug(`✅ Feature ${key} ${value ? 'enabled' : 'disabled'} successfully`)
    } catch (e) {
      // revert on failure
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


