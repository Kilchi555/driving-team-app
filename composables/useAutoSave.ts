// composables/useAutoSave.ts
import { ref, watch, onMounted, onUnmounted, computed, readonly, type Ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useRoute } from '#app'

export interface AutoSaveConfig {
  // Eindeutige Kennzeichnung
  formId: string
  tableName: string
  
  // LocalStorage Einstellungen
  localStorageKey?: string
  localStorageExpiry?: number // Stunden, default: 24
  
  // Database Einstellungen  
  databaseSaveDelay?: number // ms nach vollständigem Formular, default: 2000
  autoSaveInterval?: number // ms für regelmäßiges Speichern, default: 30000
  draftExpiry?: number // Tage, default: 7
  
  // Callbacks
  onSave?: (data: any) => void
  onRestore?: (data: any) => void
  onError?: (error: any) => void
  
  // Validierungen
  isValidForDatabaseSave?: () => boolean
  transformForSave?: (data: any) => any
  transformForRestore?: (data: any) => any
}

export interface RecoveryData {
  localData?: any
  databaseData?: any
  source: 'localStorage' | 'database' | 'url'
  timestamp: string
}

export const useAutoSave = <T>(
  formData: Ref<T>, 
  config: AutoSaveConfig
) => {
  // State
  const draftId = ref<string | null>(null)
  const isAutoSaving = ref(false)
  const lastSaved = ref<Date | null>(null)
  const showRecoveryModal = ref(false)
  const recoveryData = ref<RecoveryData | null>(null)
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const showSaveMessage = ref(false)
  
  // Message display timeout
  let messageTimeout: NodeJS.Timeout | null = null
  let showMessageTimeout: NodeJS.Timeout | null = null
  let lastMessageUpdate = 0
  let inputActivityTimeout: NodeJS.Timeout | null = null
  
  // Config with defaults
  const finalConfig = {
    localStorageKey: `autosave-${config.formId}`,
    localStorageExpiry: 24,
    databaseSaveDelay: 2000,
    autoSaveInterval: 30000,
    draftExpiry: 7,
    ...config
  }
  
  // Auto-save intervals
  let databaseSaveTimeout: NodeJS.Timeout | null = null
  let autoSaveInterval: NodeJS.Timeout | null = null
  
  // Computed
  const canSaveToDatabase = computed(() => {
    return finalConfig.isValidForDatabaseSave ? finalConfig.isValidForDatabaseSave() : true
  })
  
  const statusMessage = computed(() => {
    if (isAutoSaving.value) return 'Speichere...'
    if (showSaveMessage.value && saveStatus.value === 'saved') return 'Gespeichert'
    return null
  })

  // Helper function to show save message temporarily
  const showTemporarySaveMessage = () => {
    const now = Date.now()
    
    // Only update message every 5 seconds
    if (now - lastMessageUpdate < 5000) return
    
    lastMessageUpdate = now
    
    // Clear existing timeouts
    if (messageTimeout) clearTimeout(messageTimeout)
    if (showMessageTimeout) clearTimeout(showMessageTimeout)
    
    // Show message immediately (but will be hidden by input activity)
    showSaveMessage.value = false
    
    // Set timer to show message after 1 second
    showMessageTimeout = setTimeout(() => {
      showSaveMessage.value = true
      
      // Hide message after 3 seconds
      messageTimeout = setTimeout(() => {
        showSaveMessage.value = false
      }, 3000)
    }, 1000)
  }

  // Track input activity
  const onInputActivity = () => {
    // Hide message immediately on new input
    showSaveMessage.value = false
    
    // Clear existing activity timeout
    if (inputActivityTimeout) {
      clearTimeout(inputActivityTimeout)
    }
    
    // Clear show message timeout
    if (showMessageTimeout) {
      clearTimeout(showMessageTimeout)
    }
    
    // Start new activity timeout
    inputActivityTimeout = setTimeout(() => {
      // Only show if we recently saved
      if (saveStatus.value === 'saved') {
        const now = Date.now()
        if (now - lastMessageUpdate < 5000) {
          showSaveMessage.value = true
          
          // Hide after 3 seconds
          messageTimeout = setTimeout(() => {
            showSaveMessage.value = false
          }, 3000)
        }
      }
    }, 1000)
  }

  // === SAVE FUNCTIONS ===
  
  const saveToLocalStorage = () => {
    try {
      const data = {
        formData: formData.value,
        timestamp: new Date().toISOString(),
        draftId: draftId.value,
        formId: config.formId
      }
      
      localStorage.setItem(finalConfig.localStorageKey, JSON.stringify(data))
      lastSaved.value = new Date()
      saveStatus.value = 'saved'
      
      // Don't show message immediately - let input activity handle it
      const now = Date.now()
      lastMessageUpdate = now
      
      finalConfig.onSave?.(data)
      console.log(`💾 LocalStorage saved: ${config.formId}`)
      
    } catch (error) {
      saveStatus.value = 'error'
      finalConfig.onError?.(error)
      console.error('❌ LocalStorage save failed:', error)
    }
  }
  
  const saveDraftToDatabase = async () => {
    if (!canSaveToDatabase.value || isAutoSaving.value) return
    
    try {
      isAutoSaving.value = true
      saveStatus.value = 'saving'
      
      const supabase = getSupabase()
      
      // Transform data for database
      const transformedData = finalConfig.transformForSave 
        ? finalConfig.transformForSave(formData.value)
        : formData.value
      
      const draftData = {
        ...transformedData,
        status: 'draft',
        expires_at: new Date(Date.now() + finalConfig.draftExpiry * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          ...transformedData.metadata,
          form_id: config.formId,
          last_saved: new Date().toISOString(),
          auto_save_version: '1.0'
        }
      }
      
      let result
      if (draftId.value) {
        // Update existing draft
        result = await supabase
          .from(config.tableName)
          .update(draftData)
          .eq('id', draftId.value)
          .select()
          .single()
      } else {
        // Create new draft
        result = await supabase
          .from(config.tableName)
          .insert(draftData)
          .select()
          .single()
      }
      
      if (result.error) throw result.error
      
      draftId.value = result.data.id
      lastSaved.value = new Date()
      saveStatus.value = 'saved'
      
      // Update localStorage with draft ID
      saveToLocalStorage()
      
      finalConfig.onSave?.(result.data)
      console.log(`✅ Database draft saved: ${config.formId} -> ${draftId.value}`)
      
    } catch (error) {
      saveStatus.value = 'error'
      finalConfig.onError?.(error)
      console.error('❌ Database save failed:', error)
    } finally {
      isAutoSaving.value = false
    }
  }
  
  // === RECOVERY FUNCTIONS ===
  
  const loadFromLocalStorage = (): any | null => {
    try {
      const saved = localStorage.getItem(finalConfig.localStorageKey)
      if (!saved) return null
      
      const data = JSON.parse(saved)
      const savedDate = new Date(data.timestamp)
      const expiryMs = finalConfig.localStorageExpiry * 60 * 60 * 1000
      const isValid = (Date.now() - savedDate.getTime()) < expiryMs
      
      if (!isValid) {
        localStorage.removeItem(finalConfig.localStorageKey)
        return null
      }
      
      return data
    } catch (error) {
      console.error('❌ LocalStorage recovery failed:', error)
      return null
    }
  }
  
  const loadDraftFromDatabase = async (id: string): Promise<any | null> => {
    try {
      const supabase = getSupabase()
      
      const { data, error } = await supabase
        .from(config.tableName)
        .select('*')
        .eq('id', id)
        .eq('status', 'draft')
        .single()
      
      if (error || !data) return null
      
      // Transform data for restoration
      return finalConfig.transformForRestore 
        ? finalConfig.transformForRestore(data)
        : data
        
    } catch (error) {
      console.error('❌ Database recovery failed:', error)
      return null
    }
  }
  
  const checkForRecoveryData = async (): Promise<RecoveryData | null> => {
    // 1. Check URL parameters
    const route = useRoute()
    if (route.query.recover) {
      const dbData = await loadDraftFromDatabase(route.query.recover as string)
      if (dbData) {
        return {
          databaseData: dbData,
          source: 'url',
          timestamp: dbData.metadata?.last_saved || new Date().toISOString()
        }
      }
    }
    
    // 2. Check LocalStorage
    const localData = loadFromLocalStorage()
    if (localData) {
      // If we have a draft ID, also try to load from database
      if (localData.draftId) {
        const dbData = await loadDraftFromDatabase(localData.draftId)
        if (dbData) {
          return {
            localData,
            databaseData: dbData,
            source: 'database',
            timestamp: dbData.metadata?.last_saved || localData.timestamp
          }
        }
      }
      
      return {
        localData,
        source: 'localStorage',
        timestamp: localData.timestamp
      }
    }
    
    return null
  }
  
  // === RESTORE FUNCTIONS ===
  
  const restoreFromRecovery = (recovery: RecoveryData) => {
    try {
      // Prefer database data over localStorage
      const dataToRestore = recovery.databaseData || recovery.localData
      
      if (recovery.databaseData) {
        formData.value = dataToRestore.formData || dataToRestore
        draftId.value = dataToRestore.id
      } else if (recovery.localData) {
        formData.value = recovery.localData.formData
        draftId.value = recovery.localData.draftId
      }
      
      showRecoveryModal.value = false
      recoveryData.value = null
      
      finalConfig.onRestore?.(dataToRestore)
      console.log(`✅ Data restored from ${recovery.source}`)
      
    } catch (error) {
      finalConfig.onError?.(error)
      console.error('❌ Restore failed:', error)
    }
  }
  
  const clearDraft = () => {
    localStorage.removeItem(finalConfig.localStorageKey)
    draftId.value = null
    showRecoveryModal.value = false
    recoveryData.value = null
    lastSaved.value = null
    saveStatus.value = 'idle'
    
    console.log(`🗑️ Draft cleared: ${config.formId}`)
  }
  
  // === FINALIZE FUNCTIONS ===
  
  const finalizeDraft = async (finalStatus = 'completed') => {
    if (!draftId.value) return null
    
    try {
      const supabase = getSupabase()
      
      const finalData = finalConfig.transformForSave 
        ? finalConfig.transformForSave(formData.value)
        : formData.value
      
      const { data, error } = await supabase
        .from(config.tableName)
        .update({
          ...finalData,
          status: finalStatus,
          completed_at: new Date().toISOString()
        })
        .eq('id', draftId.value)
        .select()
        .single()
      
      if (error) throw error
      
      // Clear draft after successful finalization
      clearDraft()
      
      return data
      
    } catch (error) {
      finalConfig.onError?.(error)
      throw error
    }
  }
  
  // === WATCHERS & LIFECYCLE ===
  
  // Watch for form changes -> LocalStorage
  watch(formData, () => {
    // Track input activity
    onInputActivity()
    
    // Save to localStorage
    saveToLocalStorage()
    
    // Debounced database save
    if (databaseSaveTimeout) {
      clearTimeout(databaseSaveTimeout)
    }
    
    if (canSaveToDatabase.value) {
      databaseSaveTimeout = setTimeout(() => {
        saveDraftToDatabase()
      }, finalConfig.databaseSaveDelay)
    }
  }, { deep: true })
  
  // Setup auto-save interval
  onMounted(async () => {
    // Check for recovery data
    const recovery = await checkForRecoveryData()
    if (recovery) {
      recoveryData.value = recovery
      showRecoveryModal.value = true
    }
    
    // Setup periodic auto-save
    autoSaveInterval = setInterval(() => {
      if (canSaveToDatabase.value && !isAutoSaving.value) {
        saveDraftToDatabase()
      }
    }, finalConfig.autoSaveInterval)
  })
  
  // Cleanup
  onUnmounted(() => {
    if (databaseSaveTimeout) clearTimeout(databaseSaveTimeout)
    if (autoSaveInterval) clearInterval(autoSaveInterval)
    if (messageTimeout) clearTimeout(messageTimeout)
    if (showMessageTimeout) clearTimeout(showMessageTimeout)
    if (inputActivityTimeout) clearTimeout(inputActivityTimeout)
  })
  
  // === RETURN API ===
  
  return {
    // State
    draftId: readonly(draftId),
    isAutoSaving: readonly(isAutoSaving),
    lastSaved: readonly(lastSaved),
    saveStatus: readonly(saveStatus),
    showRecoveryModal,
    recoveryData: readonly(recoveryData),
    statusMessage,
    showSaveMessage: readonly(showSaveMessage),
    
    // Actions
    saveToLocalStorage,
    saveDraftToDatabase,
    restoreFromRecovery,
    clearDraft,
    finalizeDraft,
    
    // Manual triggers
    forceSave: saveDraftToDatabase,
    checkRecovery: checkForRecoveryData
  }
}

// Expliziter Export für bessere Kompatibilität
export default useAutoSave
