// stores/ui.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', () => {
  // State
  const sidebarOpen = ref(false)
  const theme = ref<'light' | 'dark'>('light')
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

  const isDark = computed(() => theme.value === 'dark')

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

  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme
    // Persist to localStorage
    if (process.client) {
      localStorage.setItem('theme', newTheme)
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
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

  // Initialize theme from localStorage
  const initializeTheme = () => {
    if (process.client) {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (savedTheme) {
        theme.value = savedTheme
      }
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

  return {
    // State
    sidebarOpen,
    theme,
    notifications,
    loadingStates,
    modals,

    // Computed
    unreadNotifications,
    unreadCount,
    isDark,

    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setTheme,
    toggleTheme,
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