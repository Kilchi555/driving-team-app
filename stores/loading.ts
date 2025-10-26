// stores/loading.ts
// Globaler Loading-State mit Tenant-Logo-Integration

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

interface LoadingState {
  id: string
  message: string
  submessage?: string
  showProgress: boolean
  progress: number
  showCancel: boolean
  onCancel?: () => void
  tenantId?: string
  startTime: number
}

export const useLoadingStore = defineStore('loading', () => {
  // State
  const loadingStates = ref<Map<string, LoadingState>>(new Map())
  const globalTenantId = ref<string | null>(null)
  
  // Computed
  const isLoading = computed(() => loadingStates.value.size > 0)
  const currentLoading = computed(() => {
    // Return the most recent loading state
    const states = Array.from(loadingStates.value.values())
    return states.sort((a, b) => b.startTime - a.startTime)[0] || null
  })
  
  // Actions
  const startLoading = (
    id: string,
    message: string = 'Lädt...',
    options: {
      submessage?: string
      showProgress?: boolean
      showCancel?: boolean
      onCancel?: () => void
      tenantId?: string
    } = {}
  ) => {
    const loadingState: LoadingState = {
      id,
      message,
      submessage: options.submessage,
      showProgress: options.showProgress || false,
      progress: 0,
      showCancel: options.showCancel || false,
      onCancel: options.onCancel,
      tenantId: options.tenantId || globalTenantId.value || undefined,
      startTime: Date.now()
    }
    
    loadingStates.value.set(id, loadingState)
    console.log('🔄 Loading started:', id, message)
  }
  
  const updateProgress = (id: string, progress: number, message?: string) => {
    const state = loadingStates.value.get(id)
    if (state) {
      state.progress = Math.max(0, Math.min(100, progress))
      if (message) state.message = message
      console.log('📊 Loading progress:', id, `${progress}%`)
    }
  }
  
  const updateMessage = (id: string, message: string, submessage?: string) => {
    const state = loadingStates.value.get(id)
    if (state) {
      state.message = message
      if (submessage !== undefined) state.submessage = submessage
      console.log('💬 Loading message updated:', id, message)
    }
  }
  
  const stopLoading = (id: string) => {
    const state = loadingStates.value.get(id)
    if (state) {
      const duration = Date.now() - state.startTime
      console.log('✅ Loading completed:', id, `${duration}ms`)
      loadingStates.value.delete(id)
    }
  }
  
  const stopAllLoading = () => {
    const count = loadingStates.value.size
    loadingStates.value.clear()
    console.log('🛑 All loading stopped:', count, 'states cleared')
  }
  
  // Set global tenant ID for loading states
  const setGlobalTenantId = (tenantId: string | null) => {
    globalTenantId.value = tenantId
    console.log('🏢 Global tenant ID set for loading:', tenantId)
  }
  
  // Convenience methods for common loading scenarios
  const showPageLoading = (message: string = 'Seite wird geladen...', tenantId?: string) => {
    startLoading('page-load', message, { tenantId })
  }
  
  const showDataLoading = (message: string = 'Daten werden geladen...', tenantId?: string) => {
    startLoading('data-load', message, { tenantId })
  }
  
  const showSaveLoading = (message: string = 'Speichern...', tenantId?: string) => {
    startLoading('save-operation', message, { tenantId })
  }
  
  const hidePageLoading = () => stopLoading('page-load')
  const hideDataLoading = () => stopLoading('data-load')
  const hideSaveLoading = () => stopLoading('save-operation')
  
  return {
    // State
    isLoading,
    currentLoading,
    globalTenantId: readonly(globalTenantId),
    
    // Actions
    startLoading,
    updateProgress,
    updateMessage,
    stopLoading,
    stopAllLoading,
    setGlobalTenantId,
    
    // Convenience methods
    showPageLoading,
    showDataLoading,
    showSaveLoading,
    hidePageLoading,
    hideDataLoading,
    hideSaveLoading
  }
})




















