<template>
  <div class="device-manager">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200">
      <!-- Header -->
      <div class="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">Angemeldete Geräte</h3>
            <p class="text-sm text-gray-600 mt-1">
              Verwalten Sie Ihre angemeldeten Geräte für zusätzliche Sicherheit
            </p>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <button
              @click="refreshDevices"
              :disabled="isLoading"
              class="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span v-if="isLoading">⏳</span>
              <span v-else>🔄</span>
              <span class="hidden sm:inline">{{ isLoading ? 'Lädt...' : 'Aktualisieren' }}</span>
              <span class="sm:hidden">{{ isLoading ? 'Lädt...' : 'Aktualisieren' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Devices List -->
      <div class="p-4 sm:p-6">
        <div v-if="isLoading && devices.length === 0" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Geräte werden geladen...</p>
        </div>

        <div v-else-if="devices.length === 0" class="text-center py-8">
          <div class="text-4xl mb-4">📱</div>
          <p class="text-gray-600">Keine Geräte gefunden</p>
          <p class="text-sm text-gray-500 mt-1">Ihre Geräte werden hier angezeigt, sobald Sie sich anmelden</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="device in devices"
            :key="device.id"
            class="p-4 bg-gray-50 rounded-lg border"
            :class="device.is_trusted ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'"
          >
            <!-- Mobile Layout -->
            <div class="block sm:hidden">
              <div class="flex items-start gap-3 mb-3">
                <div class="text-2xl">
                  {{ getDeviceIcon(device.user_agent) }}
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="font-medium text-gray-900 text-sm">
                      {{ device.device_name || 'Unbekanntes Gerät' }}
                    </h4>
                    <span
                      class="px-2 py-1 text-xs rounded-full"
                      :class="device.is_trusted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'"
                    >
                      {{ device.is_trusted ? '✅ Vertraut' : '⚠️ Nicht vertraut' }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-600 space-y-1">
                    <p><strong>ID:</strong> {{ device.mac_address }}</p>
                    <p><strong>IP:</strong> {{ device.ip_address }}</p>
                    <p><strong>Letzte Anmeldung:</strong> {{ formatDate(device.last_seen) }}</p>
                    <p><strong>Browser:</strong> {{ getBrowserInfo(device.user_agent) }}</p>
                  </div>
                </div>
              </div>
              
              <div class="flex gap-2">
                <button
                  v-if="!device.is_trusted"
                  @click="trustDevice(device.id)"
                  :disabled="isLoading"
                  class="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  ✅ Vertrauen
                </button>
                <button
                  @click="removeDevice(device.id)"
                  :disabled="isLoading"
                  class="flex-1 px-3 py-2 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  🗑️ Entfernen
                </button>
              </div>
            </div>

            <!-- Desktop Layout -->
            <div class="hidden sm:flex sm:items-center sm:justify-between">
              <!-- Device Info -->
              <div class="flex items-center space-x-4">
                <div class="text-2xl">
                  {{ getDeviceIcon(device.user_agent) }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-medium text-gray-900">
                      {{ device.device_name || 'Unbekanntes Gerät' }}
                    </h4>
                    <span
                      class="px-2 py-1 text-xs rounded-full"
                      :class="device.is_trusted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'"
                    >
                      {{ device.is_trusted ? '✅ Vertrauenswürdig' : '⚠️ Nicht vertrauenswürdig' }}
                    </span>
                  </div>
                  <div class="text-sm text-gray-600 mt-1">
                    <p><strong>Geräte-ID:</strong> {{ device.mac_address }}</p>
                    <p><strong>IP-Adresse:</strong> {{ device.ip_address }}</p>
                    <p><strong>Letzte Anmeldung:</strong> {{ formatDate(device.last_seen) }}</p>
                    <p><strong>Erste Anmeldung:</strong> {{ formatDate(device.first_seen) }}</p>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <p><strong>Browser:</strong> {{ getBrowserInfo(device.user_agent) }}</p>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <button
                  v-if="!device.is_trusted"
                  @click="trustDevice(device.id)"
                  :disabled="isLoading"
                  class="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  ✅ Vertrauen
                </button>
                <button
                  @click="removeDevice(device.id)"
                  :disabled="isLoading"
                  class="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  🗑️ Entfernen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 sm:px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600 gap-2">
          <div>
            <p><strong>{{ devices.length }}</strong> Gerät(e) angemeldet</p>
            <p class="text-xs text-gray-500 mt-1">
              Vertrauenswürdige Geräte werden automatisch erkannt
            </p>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-xs text-gray-500">
              Aktualisiert: {{ lastUpdated ? formatDate(lastUpdated) : 'Nie' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'

interface Device {
  id: string
  user_id: string
  mac_address: string
  user_agent: string
  ip_address: string
  device_name: string
  first_seen: string
  last_seen: string
  is_trusted: boolean
  trusted_at?: string
}

const authStore = useAuthStore()
const { showSuccess, showError } = useUIStore()
const devices = ref<Device[]>([])
const isLoading = ref(false)
const lastUpdated = ref<Date | null>(null)


const loadDevices = async () => {
  try {
    isLoading.value = true
    const supabase = getSupabase()
    
    // Get current user ID
    const currentUser = authStore.userProfile || authStore.user
    if (!currentUser?.id) {
      console.warn('No current user found')
      devices.value = []
      return
    }
    
    // Get the auth user ID from the auth store (this is the auth.users.id)
    const authUserId = authStore.user?.id || currentUser.auth_user_id || currentUser.id
    logger.debug('Loading devices for user:', currentUser.id, 'auth_user_id:', authUserId)
    
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', authUserId)
      .order('last_seen', { ascending: false })
    
    if (error) {
      console.error('Error loading devices:', error)
      return
    }
    
    logger.debug('Loaded devices:', data)
    devices.value = data || []
    lastUpdated.value = new Date()
    
  } catch (error) {
    console.error('Error loading devices:', error)
  } finally {
    isLoading.value = false
  }
}

const refreshDevices = () => {
  loadDevices()
}


const trustDevice = async (deviceId: string) => {
  try {
    isLoading.value = true
    
    const currentUser = authStore.userProfile || authStore.user
    if (!currentUser?.id) {
      console.warn('No current user found')
      return
    }
    
    const authUserId = authStore.user?.id || currentUser.auth_user_id || currentUser.id
    logger.debug('Trusting device with ID:', deviceId, 'for user:', currentUser.id, 'auth_user_id:', authUserId)
    
    // Use API route with service role to bypass RLS
    const response = await $fetch('/api/admin/update-user-device', {
      method: 'POST',
      body: {
        deviceId: deviceId,
        userId: authUserId,
        isTrusted: true
      }
    })
    
    if (!response.success) {
      console.error('Error trusting device:', response.error)
      showError('Fehler beim Vertrauen des Geräts', response.error)
      return
    }
    
    logger.debug('Device trusted successfully:', response.data)
    showSuccess('Gerät vertrauenswürdig', 'Das Gerät wurde als vertrauenswürdig markiert.')
    
    // Reload devices
    await loadDevices()
    
  } catch (error) {
    console.error('Error trusting device:', error)
    showError('Fehler beim Vertrauen des Geräts', String(error))
  } finally {
    isLoading.value = false
  }
}

const removeDevice = async (deviceId: string) => {
  // Direct removal without confirmation for better UX
  
  try {
    isLoading.value = true
    
    const currentUser = authStore.userProfile || authStore.user
    if (!currentUser?.id) {
      console.warn('No current user found')
      showError('Benutzer nicht gefunden', 'Bitte melden Sie sich erneut an.')
      return
    }
    
    const authUserId = authStore.user?.id || currentUser.auth_user_id || currentUser.id
    logger.debug('Removing device with ID:', deviceId, 'for user:', currentUser.id, 'auth_user_id:', authUserId)
    
    // Use API route with service role to bypass RLS
    const response = await $fetch('/api/admin/remove-user-device', {
      method: 'POST',
      body: {
        deviceId: deviceId,
        userId: authUserId
      }
    })
    
    if (!response.success) {
      console.error('Error removing device:', response.error)
      showError('Fehler beim Entfernen des Geräts', response.error)
      return
    }
    
    logger.debug('Device removed successfully:', response.data)
    showSuccess('Gerät entfernt', 'Das Gerät wurde erfolgreich entfernt.')
    
    // Reload devices
    await loadDevices()
    
  } catch (error) {
    console.error('Error removing device:', error)
    showError('Fehler beim Entfernen des Geräts', String(error))
  } finally {
    isLoading.value = false
  }
}

const getDeviceIcon = (userAgent: string): string => {
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return '📱'
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    return '📱'
  } else if (userAgent.includes('Windows')) {
    return '💻'
  } else if (userAgent.includes('Mac')) {
    return '💻'
  } else if (userAgent.includes('Linux')) {
    return '🖥️'
  }
  return '💻'
}

const getBrowserInfo = (userAgent: string): string => {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  return 'Unbekannt'
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadDevices()
})
</script>
