/**
 * Composable: useSARISync
 * Manages SARI synchronization for the current tenant
 */

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

interface SyncLog {
  id: string
  operation: string
  status: 'success' | 'error' | 'partial'
  result: Record<string, any>
  error_message: string | null
  created_at: string
}

interface SyncConfig {
  sari_enabled: boolean
  sari_environment: 'test' | 'production'
  last_sync_at: string | null
}

export const useSARISync = () => {
  const supabase = getSupabase()

  // State
  const syncStatus = ref<'idle' | 'syncing' | 'error'>('idle')
  const syncProgress = ref<number>(0)
  const syncError = ref<string | null>(null)
  const syncLogs = ref<SyncLog[]>([])
  const config = ref<SyncConfig>({
    sari_enabled: false,
    sari_environment: 'test',
    last_sync_at: null
  })

  // Computed
  const isSyncing = computed(() => syncStatus.value === 'syncing')
  const lastSyncAt = computed(() =>
    config.value.last_sync_at
      ? new Date(config.value.last_sync_at)
      : null
  )

  /**
   * Test SARI connection with provided credentials
   */
  const testConnection = async (credentials: {
    environment: 'test' | 'production'
    clientId: string
    clientSecret: string
    username: string
    password: string
  }) => {
    try {
      syncError.value = null

      logger.debug('Testing SARI connection...', { environment: credentials.environment })

      const response = await fetch('/api/sari/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.statusMessage || 'Connection test failed')
      }

      const result = await response.json()
      logger.debug('✅ SARI connection successful')

      return {
        success: true,
        message: result.message
      }
    } catch (error: any) {
      syncError.value = error.message
      logger.error('SARI connection test failed', { error: error.message })
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Save SARI settings
   */
  const saveSettings = async (newConfig: Partial<SyncConfig> & {
    sari_client_id?: string
    sari_client_secret?: string
    sari_username?: string
    sari_password?: string
  }) => {
    try {
      syncError.value = null

      logger.debug('Saving SARI settings...', { sari_enabled: newConfig.sari_enabled })

      const response = await fetch('/api/sari/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.statusMessage || 'Failed to save settings')
      }

      const result = await response.json()

      // Update local config
      config.value.sari_enabled = newConfig.sari_enabled ?? config.value.sari_enabled
      config.value.sari_environment = newConfig.sari_environment ?? config.value.sari_environment

      logger.debug('✅ SARI settings saved')

      return {
        success: true,
        message: result.message
      }
    } catch (error: any) {
      syncError.value = error.message
      logger.error('Failed to save SARI settings', { error: error.message })
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Trigger course sync for a specific type
   */
  const syncCourses = async (courseType: 'VKU' | 'PGS') => {
    try {
      syncStatus.value = 'syncing'
      syncError.value = null
      syncProgress.value = 0

      logger.debug(`Starting ${courseType} course sync...`)

      const response = await fetch('/api/sari/sync-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseType })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.statusMessage || 'Sync failed')
      }

      const result = await response.json()

      syncProgress.value = 100
      syncStatus.value = 'idle'

      logger.debug('✅ Course sync completed', {
        synced_count: result.synced_count,
        error_count: result.error_count
      })

      // Refresh sync status
      await loadSyncStatus()

      return {
        success: result.success,
        message: result.message,
        synced_count: result.synced_count,
        error_count: result.error_count,
        errors: result.errors
      }
    } catch (error: any) {
      syncStatus.value = 'error'
      syncError.value = error.message
      logger.error('Course sync failed', { error: error.message })

      return {
        success: false,
        message: error.message,
        synced_count: 0,
        error_count: 0,
        errors: [error.message]
      }
    }
  }

  /**
   * Load sync status and history
   */
  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/sari/sync-status', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Failed to load sync status')
      }

      const result = await response.json()

      config.value = result.config
      syncLogs.value = result.sync_history || []

      logger.debug('Sync status loaded', {
        last_sync: result.latest_sync?.created_at
      })

      return result
    } catch (error: any) {
      logger.error('Failed to load sync status', { error: error.message })
      return null
    }
  }

  /**
   * Get formatted last sync time
   */
  const getLastSyncText = (): string => {
    if (!lastSyncAt.value) return 'Never'

    const now = new Date()
    const diff = now.getTime() - lastSyncAt.value.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return lastSyncAt.value.toLocaleDateString()
  }

  return {
    // State
    syncStatus,
    syncProgress,
    syncError,
    syncLogs,
    config,

    // Computed
    isSyncing,
    lastSyncAt,

    // Methods
    testConnection,
    saveSettings,
    syncCourses,
    loadSyncStatus,
    getLastSyncText
  }
}

