<template>
  <!-- Skip rendering for sub-routes -->
  <div v-if="isSubRoute" class="min-h-screen flex items-center justify-center p-4">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Lade...</p>
    </div>
  </div>
  
  <!-- Main login form -->
  <div v-else class="min-h-screen flex items-center justify-center p-4" 
       :style="{ 
         background: currentBranding?.colors ? 
           `linear-gradient(to bottom right, ${currentBranding.colors.primary}15, ${currentBranding.colors.secondary}15)` : 
           'linear-gradient(to bottom right, #1E40AF15, #64748B15)' 
       }">
    
    <!-- Loading State -->
    <div v-if="isLoadingBranding" class="text-center">
      <div class="w-16 h-16 mx-auto mb-4 animate-pulse bg-gray-200 rounded-lg"></div>
      <p class="text-gray-600">Lade...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="brandingError" class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
      <div class="text-red-500 mb-4">
        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">Firma nicht gefunden</h2>
      <p class="text-gray-600 mb-4">{{ brandingError }}</p>
      <button 
        @click="$router.push('/')" 
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Zurück zur Auswahl
      </button>
    </div>

    <!-- Login Form -->
    <div v-else class="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <!-- Header mit Tenant-Branding -->
      <div 
        class="text-white p-6 rounded-t-xl" 
        :style="{ backgroundColor: primaryColor }"
      >
        <div class="text-center">
          <!-- Logo -->
          <div class="mb-4">
            <img 
              v-if="headerLogo" 
              :src="headerLogo" 
              class="h-12 w-auto mx-auto" 
              :alt="`${brandName} Logo`"
            >
            <div 
              v-else 
              class="w-12 h-12 mx-auto bg-white bg-opacity-20 rounded-lg flex items-center justify-center"
            >
              <span class="text-2xl font-bold">{{ brandName.charAt(0).toUpperCase() }}</span>
            </div>
          </div>
          
          <h1 class="text-2xl font-bold">Willkommen</h1>
          <p class="text-white text-opacity-90 mt-1">
            Melden Sie sich in Ihrem {{ brandName }} Account an
          </p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="p-6">
        <!-- Session Check Loading -->
        <div v-if="isCheckingSession" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" :style="{ borderColor: primaryColor }"></div>
          <p class="text-gray-600">Überprüfe Session...</p>
        </div>

        <!-- Device Verification Required Modal -->
        <div v-if="requiresDeviceVerification" class="text-center py-8">
          <div class="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-4">
            <div class="text-yellow-600 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-yellow-800 mb-2">Geräte-Verifikation erforderlich</h3>
            <p class="text-yellow-700 mb-4">
              Ein neues Gerät wurde erkannt: <strong>{{ pendingDeviceName || 'Unbekanntes Gerät' }}</strong>
            </p>
            <p class="text-sm text-yellow-600 mb-4">
              Wir haben einen Verifikations-Link an <strong>{{ pendingVerificationEmail }}</strong> gesendet.
            </p>
            <p class="text-xs text-yellow-600 mb-4">
              Bitte klicken Sie auf den Link in Ihrer E-Mail, um das Gerät zu bestätigen. Der Link ist 24 Stunden gültig.
            </p>
            <p
              v-if="deviceVerificationWarning"
              class="text-xs text-red-600 mb-4"
            >
              {{ deviceVerificationWarning }}
            </p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                @click="requiresDeviceVerification = false"
                class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                Erneut versuchen
              </button>
              <button
                @click="resendVerificationEmail"
                :disabled="resendingVerification"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="resendingVerification">Sende...</span>
                <span v-else>Link erneut senden</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Login Form -->
        <form v-else @submit.prevent="handleLogin" class="space-y-4">
          <!-- Email Input -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              v-model="loginForm.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
              :style="{ '--focus-color': primaryColor }"
              placeholder="ihre@email.com"
              :disabled="isLoading"
            >
          </div>

          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                :style="{ '--focus-color': primaryColor }"
                placeholder="Ihr Passwort"
                :disabled="isLoading"
              >
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                :disabled="isLoading"
              >
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- Remember Me -->
          <div class="flex items-center justify-between">
            <label class="flex items-center">
              <input
                v-model="loginForm.rememberMe"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-2"
                :style="{ '--focus-color': primaryColor }"
                :disabled="isLoading"
              >
              <span class="ml-2 text-sm text-gray-600">Angemeldet bleiben</span>
            </label>
            
            <a href="#" class="text-sm hover:underline" :style="{ color: primaryColor }">
              Passwort vergessen?
            </a>
          </div>

          <!-- Error Message -->
          <div v-if="loginError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-700">{{ loginError }}</p>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            :style="{ backgroundColor: primaryColor }"
          >
            <span v-if="isLoading">Wird angemeldet...</span>
            <span v-else>Anmelden</span>
          </button>
        </form>

        <!-- Footer Links -->
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Noch kein Account? 
            <NuxtLink :to="`/services/${tenantSlug}`" class="font-medium hover:underline" :style="{ color: primaryColor }">
              Registrieren
            </NuxtLink>
          </p>
          
          <div class="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <button 
              @click="$router.push('/')" 
              class="block w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Andere Firma wählen
            </button>
            <button 
              v-if="isAuthenticated"
              @click="handleLogout" 
              class="block w-full text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Aktuellen Account abmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
console.log('📄 [slug].vue script setup initializing...')

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, definePageMeta, useHead } from '#imports'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useTenant } from '~/composables/useTenant'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { getSupabase } from '~/utils/supabase'

console.log('📄 [slug].vue imports completed')

// Types
interface User {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  tenant_id: string | null
  is_active: boolean
  preferred_payment_method?: string
  auth_user_id?: string
}

interface DeviceSecurityResponse {
  success: boolean
  message?: string
  data?: any
  deviceExists?: boolean
  device?: {
    id: string
    is_trusted: boolean
    verified_at?: string | null
    device_name?: string
  }
  error?: string
}

interface VerificationResponse {
  success: boolean
  message?: string
  verificationLink?: string
  expiresAt?: string
  error?: string
  emailError?: string
}

// Reserved routes that should not be caught by the slug route
const reservedRoutes = [
  'admin', 'dashboard', 'customer-dashboard', 'login', 'register', 
  'tenant-register', 'auswahl', 'customer', 'courses', 'booking', 
  'payment', 'shop', 'upgrade', 'staff', 'tenant-admin', 'anonymous-sale',
  'reset-password', 'register-staff', 'mock-payment-page', 'pricing-test',
  'simple-test', 'sms-test', 'sms-direct-test', 'wallee-test', 'debug-pricing',
  'debug-other-events', 'optimized-workflow-test', 'accounto-test', 
  'tenant-test', 'tenant-demo', 'tenant-debug', 'tenant-start', 'customers',
  'AdminEventTypes', 'wallee-corrected-test'
]

// Meta
definePageMeta({
  layout: false,
  validate: async (route: any) => {
    const slug = route.params.slug as string
    
    // If it's a reserved route, let Nuxt's normal routing handle it
    if (reservedRoutes.includes(slug)) {
      return false
    }
    
    return true
  }
})

// Composables
const route = useRoute()
const router = useRouter()
const { 
  currentTenantBranding,
  isLoading: isLoadingBranding,
  error: brandingError,
  loadTenantBranding,
  brandName,
  primaryColor,
  getLogo
} = useTenantBranding()

const authStore = useAuthStore()
const { login, logout, isLoggedIn, loading } = authStore
const { showError, showSuccess } = useUIStore()
const { currentTenant } = useTenant()
const supabase = getSupabase()

// Methods
const handleLogin = async () => {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = 'Bitte füllen Sie alle Felder aus.'
    return
  }

  isLoading.value = true
  loginError.value = null
  deviceVerificationWarning.value = null
  pendingDeviceId.value = null
  pendingAuthUserId.value = null

  try {
    console.log('🔑 Starting login attempt for:', loginForm.value.email)
    
    // 1. First validate that user belongs to this tenant
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_user_tenant_login', {
        user_email: loginForm.value.email,
        tenant_slug: tenantSlug.value
      })

    if (validationError) {
      console.error('Validation error:', validationError)
      loginError.value = 'Benutzer nicht vorhanden.'
      return
    }

    if (!validationResult) {
      loginError.value = 'Benutzer nicht vorhanden.'
      return
    }

    // 2. If validation passes, proceed with login
    const loginSuccess = await login(loginForm.value.email, loginForm.value.password)
    
    if (!loginSuccess) {
      console.error('❌ Login failed - no success returned')
      loginError.value = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      return
    }
    
    console.log('✅ Login successful, checking device security...')
    
    // Check device security after successful login
    try {
      // ✅ Skip device verification in development mode
      const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost'
      if (isDevelopment) {
        console.log('⚠️ Device verification skipped (development mode)')
        // Continue with normal login flow
        console.log('✅ Login completed, redirecting to dashboard...')
        showSuccess('Erfolgreich angemeldet', `Willkommen bei ${brandName.value}!`)
        
        // Check if there's a redirect parameter first
        const redirectUrl = route.query.redirect as string
        if (redirectUrl) {
          console.log('🔄 Redirecting to:', redirectUrl)
          const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'
          let relativeUrl = decodeURIComponent(redirectUrl)
          
          if (relativeUrl.startsWith(baseUrl)) {
            relativeUrl = relativeUrl.replace(baseUrl, '')
          }
          
          console.log('🔄 Relative redirect URL:', relativeUrl)
          router.push(relativeUrl)
          return
        }
        
        // Weiterleitung basierend auf Rolle (fallback)
        const user = authStore.userProfile
        if (user?.role === 'admin' || user?.role === 'tenant_admin') {
          router.push('/admin')
        } else if (user?.role === 'staff') {
          router.push('/dashboard')
        } else if (user?.role === 'client') {
          router.push('/customer-dashboard')
        } else {
          router.push('/')
        }
        return
      }
      
      const user = authStore.userProfile as User
      if (user?.id) {
        console.log('🔒 Checking device security for user:', user.id)
        console.log('🔍 User profile data:', user)
        
        // Use auth_user_id for device tracking (this is the auth.users.id)
        const authUserId = user.auth_user_id || user.id
        console.log('🔑 Using auth_user_id for device tracking:', authUserId)
        
        // Generate device fingerprint
        const deviceFingerprint = await generateDeviceFingerprint()
        if (!deviceFingerprint) {
          console.warn('Could not generate device fingerprint')
          return
        }
        
        // Use API route to handle device security (bypasses RLS)
        try {
          console.log('🔒 Checking device via API...')
          
          const checkResponse = await $fetch<DeviceSecurityResponse>('/api/admin/device-security-handler', {
            method: 'POST',
            body: {
              action: 'check',
              userId: authUserId,
              deviceFingerprint: deviceFingerprint
            }
          })
          
          if (!checkResponse.success) {
            console.error('Error checking device:', checkResponse.message)
            return
          }
          
          if (!checkResponse.deviceExists) {
            console.log('⚠️ Unknown device detected - requiring verification...')
            
            // ✅ NEU: Registriere Gerät (aber noch nicht verifiziert)
            const registerResponse = await $fetch<DeviceSecurityResponse>('/api/admin/device-security-handler', {
              method: 'POST',
              body: {
                action: 'register',
                userId: authUserId,
                deviceFingerprint: deviceFingerprint,
                userAgent: navigator.userAgent,
                ipAddress: '127.0.0.1' // TODO: Get real IP
              }
            })
            
            if (registerResponse.success && registerResponse.data) {
              const deviceId = registerResponse.data.id
              const deviceName = registerResponse.data.device_name || 'Unbekanntes Gerät'
              
              console.log('✅ New device registered (unverified):', deviceId)
              
              // ✅ 2FA: Sende Magic Link zur Verifikation
              try {
                const verificationResponse = await $fetch<VerificationResponse>('/api/admin/send-device-verification', {
                  method: 'POST',
                  body: {
                    userId: authUserId,
                    deviceId: deviceId,
                    userEmail: user.email,
                    deviceName: deviceName
                  }
                })
                
                if (verificationResponse.success) {
                  pendingDeviceId.value = deviceId
                  pendingAuthUserId.value = authUserId
                  pendingVerificationEmail.value = user.email
                  pendingDeviceName.value = deviceName
                  deviceVerificationWarning.value = verificationResponse.emailError
                    ? 'E-Mail konnte nicht zugestellt werden. Bitte prüfen Sie Ihren Spam-Ordner oder senden Sie den Link erneut.'
                    : null
                  
                  // ✅ LOGOUT: User muss Gerät erst verifizieren
                  console.log('🔒 Logging out user - device verification required')
                  await supabase.auth.signOut()
                  
                  // Zeige Verifikations-Seite statt weiterzuleiten
                  showError(
                    'Geräte-Verifikation erforderlich', 
                    `Ein neues Gerät wurde erkannt. Wir haben einen Verifikations-Link an ${user.email} gesendet. Bitte klicken Sie auf den Link in Ihrer E-Mail, um das Gerät zu bestätigen.`
                  )
                  
                  // Setze Flag für Verifikations-Pending Modal
                  requiresDeviceVerification.value = true
                  
                  // ✅ KRITISCH: Verhindere Login-Redirect - User muss warten
                  return // Exit early - Login nicht abschließen
                } else {
                  throw new Error('Failed to send verification email')
                }
              } catch (verificationError: any) {
                console.error('❌ Error sending verification email:', verificationError)
                pendingDeviceId.value = deviceId
                pendingAuthUserId.value = authUserId
                pendingVerificationEmail.value = user.email
                pendingDeviceName.value = deviceName
                deviceVerificationWarning.value = 'E-Mail konnte nicht versendet werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
                
                // Fallback: Zeige manuellen Link (für Testing)
                showError(
                  'Geräte-Verifikation erforderlich',
                  `Ein neues Gerät wurde erkannt. Bitte kontaktieren Sie den Administrator für die Verifikation.`
                )
                
                // Logout trotzdem
                await supabase.auth.signOut()
                requiresDeviceVerification.value = true
                return
              }
            } else {
              console.error('Error registering device:', registerResponse.message)
            }
          }
          
          // ✅ Prüfe ob Gerät existiert aber nicht verifiziert ist
          if (checkResponse.deviceExists && checkResponse.device) {
            const existingDevice = checkResponse.device as any
            if (existingDevice && !existingDevice.verified_at) {
              console.log('⚠️ Device exists but not verified - requiring verification...')
              
              // Gerät existiert aber ist nicht verifiziert - sende erneut Verifikations-Link
              try {
                pendingDeviceId.value = existingDevice.id
                pendingAuthUserId.value = authUserId
                pendingVerificationEmail.value = user.email
                pendingDeviceName.value = existingDevice.device_name || 'Unbekanntes Gerät'
                
                const verificationResponse = await $fetch<VerificationResponse>('/api/admin/send-device-verification', {
                  method: 'POST',
                  body: {
                    userId: authUserId,
                    deviceId: existingDevice.id,
                    userEmail: user.email,
                    deviceName: existingDevice.device_name || 'Unbekanntes Gerät'
                  }
                })
                
                if (verificationResponse.success) {
                  // Logout und zeige Verifikations-Modal
                  await supabase.auth.signOut()
                  showError(
                    'Geräte-Verifikation erforderlich',
                    `Ihr Gerät muss noch verifiziert werden. Wir haben einen Verifikations-Link an ${user.email} gesendet.`
                  )
                  requiresDeviceVerification.value = true
                  deviceVerificationWarning.value = verificationResponse.emailError
                    ? 'E-Mail konnte nicht zugestellt werden. Bitte prüfen Sie Ihren Spam-Ordner oder senden Sie den Link erneut.'
                    : null
                  return // Verhindere Login
                }
              } catch (verificationError) {
                console.error('Error re-sending verification:', verificationError)
                deviceVerificationWarning.value = 'E-Mail konnte nicht versendet werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
              }
            }
          } else {
            console.log('✅ Known device detected, updating last seen')
            
            const updateResponse = await $fetch<DeviceSecurityResponse>('/api/admin/device-security-handler', {
              method: 'POST',
              body: {
                action: 'update',
                userId: authUserId,
                deviceFingerprint: deviceFingerprint
              }
            })
            
            if (updateResponse.success) {
              const device = checkResponse.data
              
              // ✅ PRÜFUNG: Ist Gerät verifiziert?
              if (!device?.verified_at) {
                console.log('⚠️ Device not verified - requiring verification...')
                
                // Gerät existiert aber nicht verifiziert - sende Verifikations-Link
                try {
                  pendingDeviceId.value = device.id
                  pendingAuthUserId.value = authUserId
                  pendingVerificationEmail.value = user.email
                  pendingDeviceName.value = device.device_name || 'Unbekanntes Gerät'
                  
                  const verificationResponse = await $fetch<VerificationResponse>('/api/admin/send-device-verification', {
                    method: 'POST',
                    body: {
                      userId: authUserId,
                      deviceId: device.id,
                      userEmail: user.email,
                      deviceName: device.device_name || 'Unbekanntes Gerät'
                    }
                  })
                  
                  if (verificationResponse.success) {
                    // Logout und zeige Verifikations-Modal
                    await supabase.auth.signOut()
                    showError(
                      'Geräte-Verifikation erforderlich',
                      `Ihr Gerät muss noch verifiziert werden. Wir haben einen Verifikations-Link an ${user.email} gesendet.`
                    )
                    requiresDeviceVerification.value = true
                    deviceVerificationWarning.value = verificationResponse.emailError
                      ? 'E-Mail konnte nicht zugestellt werden. Bitte prüfen Sie Ihren Spam-Ordner oder senden Sie den Link erneut.'
                      : null
                    return // Verhindere Login
                  }
                } catch (verificationError) {
                  console.error('Error sending verification:', verificationError)
                  deviceVerificationWarning.value = 'E-Mail konnte nicht versendet werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
                }
              }
              
              if (device?.is_trusted && device?.verified_at) {
                console.log('✅ Trusted and verified device confirmed')
              } else if (device?.verified_at) {
                console.log('✅ Verified device (but not yet trusted)')
              } else {
                console.log('⚠️ Untrusted and unverified device')
              }
            } else {
              console.error('Error updating device:', updateResponse.message)
            }
          }
        } catch (apiError) {
          console.log('⚠️ Device tracking API not available:', apiError)
          // Continue without device tracking
        }
      }
    } catch (deviceError) {
      console.warn('⚠️ Device security check failed:', deviceError)
      // Don't block login for device security errors
    }
    
    // ✅ Erfolgsmeldung und sofortiger Redirect - Device-Check blockiert NICHT
    console.log('✅ Login completed, redirecting to dashboard...')
    showSuccess('Erfolgreich angemeldet', `Willkommen bei ${brandName.value}!`)
    
    // Check if there's a redirect parameter first
    const redirectUrl = route.query.redirect as string
    if (redirectUrl) {
      console.log('🔄 Redirecting to:', redirectUrl)
      // Remove base URL if present to make it relative
      const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://www.simy.ch'
      let relativeUrl = decodeURIComponent(redirectUrl)
      
      // If it's an absolute URL, extract the path
      if (relativeUrl.startsWith(baseUrl)) {
        relativeUrl = relativeUrl.replace(baseUrl, '')
      }
      
      console.log('🔄 Relative redirect URL:', relativeUrl)
      router.push(relativeUrl)
      return
    }
    
    // Weiterleitung basierend auf Rolle (fallback)
    const user = authStore.userProfile
    if (user?.role === 'admin' || user?.role === 'tenant_admin') {
      router.push('/admin')
    } else if (user?.role === 'staff') {
      router.push('/dashboard')
    } else {
      router.push('/customer-dashboard')
    }
    
  } catch (error: any) {
    console.error('Login error:', error)
    
    if (error.message?.includes('Invalid login credentials')) {
      loginError.value = 'Falsches Passwort.'
    } else if (error.message?.includes('Email not confirmed')) {
      loginError.value = 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.'
    } else {
      loginError.value = 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
    }
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout()
    showSuccess('Abgemeldet', 'Sie wurden erfolgreich abgemeldet.')
    // Zur tenant-spezifischen Login-Seite weiterleiten
    if (currentTenant.value?.slug) {
      router.push(`/${currentTenant.value.slug}`)
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error('Logout error:', error)
    showError('Fehler', 'Fehler beim Abmelden.')
  }
}

const resendVerificationEmail = async () => {
  if (!pendingVerificationEmail.value || !pendingDeviceId.value || !pendingAuthUserId.value) {
    showError('Fehler', 'Keine Geräteinformationen vorhanden. Bitte melden Sie sich erneut an.')
    return
  }
  
  try {
    resendingVerification.value = true
    
    const response = await $fetch<VerificationResponse>('/api/admin/send-device-verification', {
      method: 'POST',
      body: {
        userId: pendingAuthUserId.value,
        deviceId: pendingDeviceId.value,
        userEmail: pendingVerificationEmail.value,
        deviceName: pendingDeviceName.value || 'Unbekanntes Gerät'
      }
    })
    
    if (response.success) {
      showSuccess('E-Mail gesendet', `Verifikations-Link wurde erneut an ${pendingVerificationEmail.value} gesendet.`)
      deviceVerificationWarning.value = response.emailError
        ? 'E-Mail konnte nicht zugestellt werden. Bitte prüfen Sie Ihren Spam-Ordner oder versuchen Sie es erneut.'
        : null
    } else {
      showError('Fehler', response?.error || 'Link konnte nicht gesendet werden.')
    }
  } catch (error: any) {
    console.error('Error resending verification:', error)
    showError('Fehler', error?.message || 'Link konnte nicht gesendet werden.')
    deviceVerificationWarning.value = 'E-Mail konnte nicht versendet werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
  } finally {
    resendingVerification.value = false
  }
}

// Device fingerprinting functions
// ✅ VERBESSERT: Nur stabile Eigenschaften verwenden (ohne Canvas, der sich ändern kann)
const generateDeviceFingerprint = async (): Promise<string | null> => {
  if (!process.client) return null
  
  try {
    // ✅ NUR STABILE EIGENSCHAFTEN: Diese ändern sich nicht bei Browser-Updates
    const fingerprint = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      // ✅ ENTFERNT: canvas, language, timezone, doNotTrack - diese können sich ändern
    }
    
    // Create a hash-like identifier from the fingerprint
    const fingerprintString = JSON.stringify(fingerprint)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString))
    const hashArray = Array.from(new Uint8Array(hash))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    console.log('🔐 Generated device fingerprint:', {
      hash: hashHex.substring(0, 16),
      components: fingerprint
    })
    
    return hashHex.substring(0, 16) // Ensure it fits in VARCHAR(17)
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

// State für Session-Check
const isCheckingSession = ref(true) // Start mit true, wird nach Prüfung auf false gesetzt

// Computed
const isAuthenticated = computed<boolean>(() => Boolean((isLoggedIn as any).value ?? isLoggedIn))

// State
const isLoading = ref(false)
const loginError = ref<string | null>(null)
const showPassword = ref(false)
const requiresDeviceVerification = ref(false)
const pendingVerificationEmail = ref<string | null>(null)
const pendingDeviceName = ref<string | null>(null)
const pendingDeviceId = ref<string | null>(null)
const pendingAuthUserId = ref<string | null>(null)
const resendingVerification = ref(false)
const deviceVerificationWarning = ref<string | null>(null)

const loginForm = ref({
  email: '',
  password: '',
  rememberMe: false
})

// Computed
const tenantSlug = computed(() => route.params.slug as string)
const currentBranding = computed(() => currentTenantBranding.value)
const headerLogo = computed(() => getLogo('header'))

// Check if this is a sub-route that should be handled by other pages
const isSubRoute = computed(() => {
  const currentPath = route.path
  return currentPath.includes('/services') || currentPath.includes('/register')
})

// Check if this is specifically a register route
const isRegisterRoute = computed(() => {
  const currentPath = route.path
  return currentPath.includes('/register')
})


// Lifecycle
onMounted(async () => {
  // Skip für bestimmte Unterpfade (services, register)
  const currentPath = route.path
  if (currentPath.includes('/services') || currentPath.includes('/register')) {
    console.log('🔓 Skipping login page for sub-route:', currentPath)
    return
  }
  
  // Lade Tenant-Branding
  try {
    await loadTenantBranding(tenantSlug.value)
    if (!currentTenantBranding.value && brandingError.value) {
      // Unbekannter Slug -> zurück zur Auswahl
      router.push('/')
      return
    }
  } catch (error) {
    console.error('Failed to load tenant branding:', error)
  }
  
  // ✅ PRÜFUNG: Session-Check mit Timeout - verhindert hängen bleiben
  try {
    // Setze Timeout für Session-Check (max 2 Sekunden)
    const sessionCheckTimeout = setTimeout(() => {
      console.log('⏱️ Session check timeout - showing login form')
      isCheckingSession.value = false
    }, 2000)
    
    const { data: { session } } = await supabase.auth.getSession()
    clearTimeout(sessionCheckTimeout)
    
    if (!session) {
      console.log('✅ No session found - user is logged out, showing login form')
      isCheckingSession.value = false
      return
    }
    
    // Session existiert - prüfe ob User authentifiziert ist
    console.log('✅ Session found, checking authentication status')
    
    // Warte kurz auf Auth-Store Initialisierung
    let attempts = 0
    while ((loading as any).value && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    isCheckingSession.value = false
    
    // Warte kurz damit Auth-State nach Logout vollständig gelöscht ist
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Prüfe ob bereits angemeldet
    if (isAuthenticated.value && !isLoading.value) {
      console.log('🔄 User already authenticated, redirecting...')
      const authStore = useAuthStore()
      const user = authStore.userProfile
      if (user?.role === 'admin' || user?.role === 'tenant_admin') {
        router.push('/admin')
      } else if (user?.role === 'staff') {
        router.push('/dashboard')
      } else {
        router.push('/customer-dashboard')
      }
    }
  } catch (sessionError) {
    console.log('✅ Session check failed (user logged out):', sessionError)
    isCheckingSession.value = false
    // Session-Check ist abgeschlossen - Login-Formular anzeigen
  }
})

// SEO
useHead(() => ({
  title: `Anmelden - ${brandName.value}`,
  meta: [
    { name: 'description', content: `Melden Sie sich in Ihrem ${brandName.value} Account an.` },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
}))
</script>

<style scoped>
/* Focus styles mit dynamischen Farben */
input:focus {
  outline: none;
  border-color: var(--focus-color, #3b82f6);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--focus-color, #3b82f6) 20%, transparent);
}

input[type="checkbox"]:checked {
  background-color: var(--focus-color, #3b82f6);
  border-color: var(--focus-color, #3b82f6);
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Loading animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Pulse animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

