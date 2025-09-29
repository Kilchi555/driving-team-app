// stores/ui.ts
import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', () => {
  // State
  const sidebarOpen = ref(false)
  const theme = ref<'light' | 'dark' | 'auto'>('light')
  
  // Tenant-spezifische Theme-Einstellungen
  const tenantThemeSettings = ref<{
    defaultTheme: 'light' | 'dark' | 'auto'
    allowThemeSwitch: boolean
    customThemeApplied: boolean
  }>({
    defaultTheme: 'light',
    allowThemeSwitch: true,
    customThemeApplied: false
  })
  const notifications = ref<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
    read: boolean
  }>>([])

  // Loading states for different operations
  const loadingStates = ref<Record<string, boolean>>({})

  // Modal states
  const modals = ref<Record<string, boolean>>({
    eventModal: false,
    paymentModal: false,
    confirmationModal: false,
    settingsModal: false
  })

  // Computed
  const unreadNotifications = computed(() => 
    notifications.value.filter(n => !n.read)
  )

  const unreadCount = computed(() => unreadNotifications.value.length)

  const isDark = computed(() => {
    if (theme.value === 'auto') {
      // Auto-Theme: Basiert auf System-Präferenz
      if (process.client) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return false
    }
    return theme.value === 'dark'
  })
  
  const effectiveTheme = computed(() => {
    if (theme.value === 'auto') {
      return isDark.value ? 'dark' : 'light'
    }
    return theme.value
  })
  
  const canSwitchTheme = computed(() => tenantThemeSettings.value.allowThemeSwitch)

  // Actions
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const openSidebar = () => {
    sidebarOpen.value = true
  }

  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  const setTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    // Prüfe ob Theme-Wechsel erlaubt ist
    if (!tenantThemeSettings.value.allowThemeSwitch) {
      console.warn('Theme switching is disabled for this tenant')
      return
    }
    
    theme.value = newTheme
    // Persist to localStorage
    if (process.client) {
      localStorage.setItem('theme', newTheme)
      // Dark/Light Mode CSS-Klasse auf HTML-Element setzen
      updateThemeClass()
    }
  }

  const toggleTheme = () => {
    if (!tenantThemeSettings.value.allowThemeSwitch) {
      return
    }
    
    const currentTheme = theme.value
    if (currentTheme === 'light') {
      setTheme('dark')
    } else if (currentTheme === 'dark') {
      setTheme('auto')
    } else {
      setTheme('light')
    }
  }
  
  // Tenant-Theme-Einstellungen aktualisieren
  const setTenantThemeSettings = (settings: {
    defaultTheme?: 'light' | 'dark' | 'auto'
    allowThemeSwitch?: boolean
  }) => {
    if (settings.defaultTheme) {
      tenantThemeSettings.value.defaultTheme = settings.defaultTheme
    }
    if (settings.allowThemeSwitch !== undefined) {
      tenantThemeSettings.value.allowThemeSwitch = settings.allowThemeSwitch
    }
    
    // Wenn Theme-Wechsel deaktiviert ist, auf Standard-Theme zurücksetzen
    if (!tenantThemeSettings.value.allowThemeSwitch) {
      theme.value = tenantThemeSettings.value.defaultTheme
    }
    
    tenantThemeSettings.value.customThemeApplied = true
  }
  
  // Theme-CSS-Klasse auf HTML-Element aktualisieren
  const updateThemeClass = () => {
    if (!process.client) return
    
    const html = document.documentElement
    const currentTheme = effectiveTheme.value
    
    // Entferne alle Theme-Klassen
    html.classList.remove('theme-light', 'theme-dark', 'theme-auto')
    
    // Füge aktuelle Theme-Klasse hinzu
    html.classList.add(`theme-${theme.value}`)
    
    // Setze data-theme Attribut für CSS-Selektoren
    html.setAttribute('data-theme', currentTheme)
    
    // Dark-Klasse für Kompatibilität mit anderen Libraries
    if (currentTheme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  const addNotification = (notification: {
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
  }) => {
    const id = Date.now().toString()
    notifications.value.unshift({
      id,
      ...notification,
      timestamp: new Date(),
      read: false
    })

    // Auto-remove success notifications after 5 seconds
    if (notification.type === 'success') {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const markNotificationAsRead = (id: string) => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  const markAllNotificationsAsRead = () => {
    notifications.value.forEach(n => {
      n.read = true
    })
  }

  const clearAllNotifications = () => {
    notifications.value = []
  }

  // Loading state management
  const setLoading = (key: string, loading: boolean) => {
    loadingStates.value[key] = loading
  }

  const isLoading = (key: string) => {
    return loadingStates.value[key] || false
  }

  const clearLoading = () => {
    loadingStates.value = {}
  }

  // Modal management
  const openModal = (modalName: string) => {
    modals.value[modalName] = true
  }

  const closeModal = (modalName: string) => {
    modals.value[modalName] = false
  }

  const isModalOpen = (modalName: string) => {
    return modals.value[modalName] || false
  }

  const closeAllModals = () => {
    Object.keys(modals.value).forEach(key => {
      modals.value[key] = false
    })
  }

  // Initialize theme from localStorage and tenant settings
  const initializeTheme = () => {
    if (process.client) {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
      
      // Wenn ein Theme gespeichert ist und Theme-Wechsel erlaubt ist
      if (savedTheme && tenantThemeSettings.value.allowThemeSwitch) {
        theme.value = savedTheme
      } else {
        // Verwende Tenant-Standard-Theme
        theme.value = tenantThemeSettings.value.defaultTheme
      }
      
      // CSS-Klassen initial setzen
      updateThemeClass()
      
      // System-Theme-Änderungen überwachen (für auto-mode)
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleSystemThemeChange = () => {
        if (theme.value === 'auto') {
          updateThemeClass()
        }
      }
      
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    }
  }

  // Helper methods for common notification types
  const showSuccess = (title: string, message: string = '') => {
    return addNotification({ type: 'success', title, message })
  }

  const showError = (title: string, message: string = '') => {
    return addNotification({ type: 'error', title, message })
  }

  const showWarning = (title: string, message: string = '') => {
    return addNotification({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message: string = '') => {
    return addNotification({ type: 'info', title, message })
  }

  // Watch für automatische Theme-Updates
  watch(effectiveTheme, () => {
    if (process.client) {
      updateThemeClass()
    }
  })

  return {
    // State
    sidebarOpen,
    theme,
    tenantThemeSettings,
    notifications,
    loadingStates,
    modals,

    // Computed
    unreadNotifications,
    unreadCount,
    isDark,
    effectiveTheme,
    canSwitchTheme,

    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setTheme,
    toggleTheme,
    setTenantThemeSettings,
    updateThemeClass,
    initializeTheme,

    // Notifications
    addNotification,
    removeNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Loading
    setLoading,
    isLoading,
    clearLoading,

    // Modals
    openModal,
    closeModal,
    isModalOpen,
    closeAllModals
  }
})