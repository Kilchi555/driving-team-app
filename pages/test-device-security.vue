<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">🔒 Geräte-Sicherheit Test</h1>
      
      <!-- Device Fingerprint Test -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">📱 Geräte-Fingerprint</h2>
        <button 
          @click="generateFingerprint"
          :disabled="isGenerating"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {{ isGenerating ? 'Generiere...' : 'Fingerprint generieren' }}
        </button>
        
        <div v-if="fingerprint" class="mt-4 p-4 bg-gray-50 rounded-lg">
          <p class="text-sm text-gray-600">Geräte-Fingerprint:</p>
          <p class="font-mono text-sm break-all">{{ fingerprint }}</p>
        </div>
      </div>
      
      <!-- Device Info -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">ℹ️ Geräte-Informationen</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">User Agent:</p>
            <p class="text-sm font-mono break-all">{{ userAgent }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Geräte-Name:</p>
            <p class="text-sm">{{ deviceName }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Sprache:</p>
            <p class="text-sm">{{ language }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Plattform:</p>
            <p class="text-sm">{{ platform }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Bildschirmauflösung:</p>
            <p class="text-sm">{{ screenResolution }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Zeitzone:</p>
            <p class="text-sm">{{ timezone }}</p>
          </div>
        </div>
      </div>
      
      <!-- Test Login -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">🔑 Test Login</h2>
        <p class="text-gray-600 mb-4">Testen Sie die Geräte-Sicherheit beim Login:</p>
        <NuxtLink 
          to="/driving-team" 
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Zu Driving Team Login
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const fingerprint = ref<string | null>(null)
const isGenerating = ref(false)
const userAgent = ref('')
const deviceName = ref('')
const language = ref('')
const platform = ref('')
const screenResolution = ref('')
const timezone = ref('')

const generateDeviceFingerprint = async (): Promise<string | null> => {
  if (!process.client) return null
  
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Browser fingerprint', 2, 2)
    }
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    }
    
    // Create a hash-like identifier from the fingerprint
    const fingerprintString = JSON.stringify(fingerprint)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString))
    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return hashHex.substring(0, 17) // Format like MAC address
  } catch (error) {
    console.error('Error generating device fingerprint:', error)
    return null
  }
}

const getDeviceName = (userAgent: string): string => {
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'Mobile Device'
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    return 'Tablet'
  } else if (userAgent.includes('Chrome')) {
    return 'Chrome Browser'
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox Browser'
  } else if (userAgent.includes('Safari')) {
    return 'Safari Browser'
  } else if (userAgent.includes('Edge')) {
    return 'Edge Browser'
  } else {
    return 'Unknown Browser'
  }
}

const generateFingerprint = async () => {
  isGenerating.value = true
  try {
    fingerprint.value = await generateDeviceFingerprint()
  } catch (error) {
    console.error('Error generating fingerprint:', error)
  } finally {
    isGenerating.value = false
  }
}

onMounted(() => {
  if (process.client) {
    userAgent.value = navigator.userAgent
    deviceName.value = getDeviceName(navigator.userAgent)
    language.value = navigator.language
    platform.value = navigator.platform
    screenResolution.value = `${screen.width}x${screen.height}`
    timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
  }
})
</script>


