<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-900">
          {{ activeTab === 'login' ? 'Anmelden' : 'Registrieren' }}
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200">
        <button
          @click="activeTab = 'login'"
          class="flex-1 py-3 px-4 text-sm font-medium transition-colors"
          :class="activeTab === 'login' ? '' : 'text-gray-600 hover:text-gray-900'"
          :style="activeTab === 'login' ? { color: primaryColor, borderBottom: `2px solid ${primaryColor}` } : {}"
        >
          Anmelden
        </button>
        <button
          @click="activeTab = 'register'; showForgotPassword = false"
          class="flex-1 py-3 px-4 text-sm font-medium transition-colors"
          :class="activeTab === 'register' ? '' : 'text-gray-600 hover:text-gray-900'"
          :style="activeTab === 'register' ? { color: primaryColor, borderBottom: `2px solid ${primaryColor}` } : {}"
        >
          Registrieren
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Login Form -->
        <form v-if="activeTab === 'login' && !showForgotPassword" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail <span class="text-red-500">*</span>
            </label>
            <input
              v-model="loginForm.email"
              type="email"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-colors"
              :style="{ '--tw-ring-color': primaryColor }"
              style="focus-ring-color: var(--tw-ring-color)"
              placeholder="ihre@email.com"
            >
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">
                Passwort <span class="text-red-500">*</span>
              </label>
              <button
                type="button"
                class="text-xs font-medium underline text-gray-500 hover:text-gray-700"
                @click="openForgotPassword"
              >
                Passwort vergessen?
              </button>
            </div>
            <div class="relative">
              <input
                v-model="loginForm.password"
                :type="showLoginPassword ? 'text' : 'password'"
                required
                class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                placeholder="••••••••"
              >
              <button
                type="button"
                @click="showLoginPassword = !showLoginPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabindex="-1"
              >
                <svg v-if="!showLoginPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ backgroundColor: primaryColor }"
          >
            {{ isLoading ? 'Wird angemeldet...' : 'Anmelden' }}
          </button>
        </form>

        <!-- Forgot Password Form -->
        <form v-if="activeTab === 'login' && showForgotPassword" class="space-y-4" @submit.prevent="handleForgotPassword">
          <button
            type="button"
            class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            @click="showForgotPassword = false; forgotPasswordMessage = ''; forgotPasswordError = ''"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Zurück zum Login
          </button>

          <p class="text-sm text-gray-600">
            Gib deine E-Mail-Adresse ein — wir senden dir einen Link zum Zurücksetzen deines Passworts.
          </p>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              E-Mail <span class="text-red-500">*</span>
            </label>
            <input
              v-model="forgotPasswordEmail"
              type="email"
              required
              :disabled="forgotPasswordLoading || !!forgotPasswordMessage"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              :style="{ '--tw-ring-color': primaryColor }"
              placeholder="ihre@email.com"
            >
          </div>

          <div v-if="forgotPasswordError" class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-sm text-red-800">{{ forgotPasswordError }}</p>
          </div>

          <div v-if="forgotPasswordMessage" class="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-sm text-green-800">{{ forgotPasswordMessage }}</p>
          </div>

          <button
            v-if="!forgotPasswordMessage"
            type="submit"
            :disabled="forgotPasswordLoading"
            class="w-full py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            :style="{ backgroundColor: primaryColor }"
          >
            {{ forgotPasswordLoading ? 'Wird gesendet...' : 'Link senden' }}
          </button>
        </form>

        <!-- Register Form -->
        <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="space-y-4">
          <!-- Step indicator -->
          <div class="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span :style="registerStep === 1 ? { color: primaryColor } : {}">1. Konto</span>
            <span class="flex-1 h-px bg-gray-200"></span>
            <span :style="registerStep === 2 ? { color: primaryColor } : {}">2. Persönliche Angaben</span>
          </div>

          <!-- ============ STEP 1: Konto & Kontakt ============ -->
          <div v-show="registerStep === 1" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Vorname <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="registerForm.first_name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Max"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nachname <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="registerForm.last_name"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Mustermann"
                >
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.email"
                type="email"
                @input="checkEmailAvailability"
                @blur="checkEmailAvailability"
                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
                :class="emailCheckStatus === 'taken' || emailCheckStatus === 'invalid' ? 'border-red-400' : 'border-gray-300'"
                placeholder="ihre@email.com"
              >
              <!-- Email already registered → offer a login shortcut -->
              <div v-if="emailCheckStatus === 'taken'" class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p class="text-sm text-amber-800">
                  Diese E-Mail-Adresse ist bereits registriert.
                </p>
                <button
                  type="button"
                  @click="switchToLoginWithEmail"
                  class="mt-1 text-sm font-semibold underline"
                  :style="{ color: primaryColor }"
                >
                  Stattdessen anmelden →
                </button>
              </div>
              <p v-else-if="emailCheckStatus === 'invalid'" class="mt-1 text-xs text-red-600">
                {{ emailCheckMessage }}
              </p>
              <p v-else-if="emailCheckStatus === 'checking'" class="mt-1 text-xs text-gray-500">
                E-Mail wird geprüft…
              </p>
              <p v-else-if="emailCheckStatus === 'available'" class="mt-1 text-xs text-green-600">
                ✓ E-Mail verfügbar
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefon <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.phone"
                type="tel"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="+41 79 123 45 67"
              >
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">
                  Passwort <span class="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  @click="useGeneratedPassword"
                  class="text-xs font-semibold underline"
                  :style="{ color: primaryColor }"
                >
                  Sicheres Passwort vorschlagen
                </button>
              </div>
              <div class="relative">
                <input
                  v-model="registerForm.password"
                  :type="showRegisterPassword ? 'text' : 'password'"
                  minlength="12"
                  autocomplete="new-password"
                  class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Mindestens 12 Zeichen"
                >
                <button
                  type="button"
                  @click="showRegisterPassword = !showRegisterPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabindex="-1"
                >
                  <svg v-if="!showRegisterPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                </button>
              </div>

              <!-- Length hint -->
              <p class="mt-2 text-xs" :class="registerForm.password.length >= 12 ? 'text-green-600' : 'text-gray-500'">
                {{ registerForm.password.length >= 12 ? '✓' : '○' }} Mindestens 12 Zeichen
              </p>

              <!-- zxcvbn strength bar (once 12+ chars) -->
              <div v-if="zxcvbnScore !== null" class="mt-2">
                <div class="flex gap-1">
                  <div
                    v-for="i in 4"
                    :key="i"
                    class="h-1.5 flex-1 rounded-full"
                    :class="i <= zxcvbnScore
                      ? (zxcvbnScore <= 1 ? 'bg-red-500' : zxcvbnScore === 2 ? 'bg-yellow-400' : zxcvbnScore === 3 ? 'bg-blue-400' : 'bg-green-500')
                      : 'bg-gray-200'"
                  ></div>
                </div>
                <p class="mt-1 text-xs" :class="zxcvbnScore <= 1 ? 'text-red-500' : zxcvbnScore === 2 ? 'text-yellow-600' : zxcvbnScore === 3 ? 'text-blue-600' : 'text-green-600'">
                  {{ strengthLabel }}<span v-if="zxcvbnScore < 2"> – zu leicht erratbar</span>
                </p>
              </div>

              <!-- HIBP breach feedback -->
              <div v-if="hibpStatus !== 'idle'" class="mt-1 text-xs">
                <span v-if="hibpStatus === 'checking'" class="text-gray-400">⏳ Sicherheitsprüfung läuft…</span>
                <span v-else-if="hibpStatus === 'pwned'" class="text-red-600 font-medium">
                  ✗ Dieses Passwort taucht {{ hibpCount.toLocaleString('de-CH') }}× in Datenlecks auf – bitte ein anderes wählen.
                </span>
                <span v-else-if="hibpStatus === 'safe'" class="text-green-600">✓ Passwort sieht sicher aus</span>
              </div>

            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Passwort wiederholen <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="registerForm.password_confirm"
                  :type="showRegisterPassword ? 'text' : 'password'"
                  minlength="12"
                  class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  :class="{ 'border-red-500': registerForm.password_confirm && registerForm.password !== registerForm.password_confirm }"
                  placeholder="Passwort wiederholen"
                >
              </div>
              <p v-if="registerForm.password_confirm && registerForm.password !== registerForm.password_confirm" class="text-xs text-red-600 mt-1">
                ⚠️ Passwörter stimmen nicht überein
              </p>
            </div>

            <button
              type="button"
              :disabled="!canProceedStep1"
              @click="goToRegisterStep(2)"
              class="w-full py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: primaryColor }"
            >
              Weiter
            </button>
          </div>

          <!-- ============ STEP 2: Persönliche Angaben ============ -->
          <div v-show="registerStep === 2" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.birthdate"
                type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              >
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Straße <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="registerForm.street"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="Hauptstraße"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Nr. <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="registerForm.street_nr"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="42"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  PLZ <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="registerForm.zip"
                  type="text"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  placeholder="8000"
                >
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Stadt <span class="text-red-500">*</span>
              </label>
              <input
                v-model="registerForm.city"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="Zürich"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Beruf
              </label>
              <input
                v-model="registerForm.profession"
                type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                placeholder="z.B. Student/in, Software Engineer"
              >
            </div>

            <!-- Document Upload: Fahrausweis (optional) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Fahrausweis (Kopie)
                <span class="text-gray-400 font-normal">(optional)</span>
              </label>
              <p class="text-xs text-gray-600 mb-3">
                Du kannst eine Kopie deines Führer-/Lernfahrausweises hochladen (PDF, JPG, PNG) – oder das später bequem im Dashboard nachreichen.
              </p>
              
              <!-- File Upload Input -->
              <div class="relative">
                <input
                  ref="documentFileInput"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  @change="handleDocumentUpload"
                  class="sr-only"
                >
                <button
                  type="button"
                  @click="$refs.documentFileInput?.click()"
                  class="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg transition-colors"
                  :style="{ '--hover-border': primaryColor }"
                  @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.borderColor = primaryColor"
                  @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.borderColor = ''"
                >
                  <div class="flex flex-col items-center gap-2">
                    <svg v-if="!uploadedDocument" class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    <span v-if="!uploadedDocument" class="text-sm text-gray-600">Klicken zum Hochladen</span>
                    <span v-else class="text-sm text-green-600">✓ {{ uploadedDocument.name }}</span>
                  </div>
                </button>
              </div>
              
              <!-- Upload Status -->
              <div v-if="isUploadingDocument" class="mt-2 flex items-center gap-2 text-sm">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2" :style="{ borderColor: primaryColor }"></div>
                <span :style="{ color: primaryColor }">Wird hochgeladen...</span>
              </div>
              <div v-else-if="documentUploadError" class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {{ documentUploadError }}
              </div>
            </div>

            <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-800">{{ error }}</p>
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                @click="goToRegisterStep(1)"
                class="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Zurück
              </button>
              <button
                type="submit"
                :disabled="isLoading || !isPasswordValid || registerForm.password !== registerForm.password_confirm || emailCheckStatus === 'taken' || emailCheckStatus === 'invalid' || emailCheckStatus === 'checking'"
                class="flex-1 py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                :style="{ backgroundColor: primaryColor }"
              >
                {{ isLoading ? 'Wird registriert...' : 'Registrieren' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from '#app'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { usePasswordStrength, generateStrongPassword } from '~/composables/usePasswordStrength'

const { primaryColor: tenantPrimary } = useTenantBranding()

const emit = defineEmits(['close', 'success'])

interface Props {
  initialTab?: 'login' | 'register'
  initialLoginEmail?: string
  selectedStaffId?: string
  selectedCategory?: string
  tenantId?: string
  primaryColor?: string | undefined
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'login',
  initialLoginEmail: '',
  selectedStaffId: undefined,
  selectedCategory: undefined,
  tenantId: undefined,
  primaryColor: undefined
})

const primaryColor = computed(() => props.primaryColor || tenantPrimary.value || '#111827')

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>(props.initialTab)
const isLoading = ref(false)
const error = ref('')

// Password visibility toggles
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)

// Real-time email availability check (register tab)
type EmailCheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
const emailCheckStatus = ref<EmailCheckStatus>('idle')
const emailCheckMessage = ref('')
let emailCheckTimer: ReturnType<typeof setTimeout> | null = null
let emailCheckSeq = 0

// Multi-step register form (1 = Konto & Kontakt, 2 = Persönliche Angaben)
const registerStep = ref<1 | 2>(1)

// Document Upload state
const uploadedDocument = ref<File | null>(null)
const isUploadingDocument = ref(false)
const documentUploadError = ref('')

const loginForm = ref({
  email: props.initialLoginEmail || '',
  password: ''
})

// Forgot-password: kept entirely inside this modal (no navigation away) so
// it works from the booking flow too — the slot reservation behind this
// modal is completely untouched while this is open.
const showForgotPassword = ref(false)
const forgotPasswordEmail = ref('')
const forgotPasswordLoading = ref(false)
const forgotPasswordError = ref('')
const forgotPasswordMessage = ref('')

const openForgotPassword = () => {
  error.value = ''
  forgotPasswordError.value = ''
  forgotPasswordMessage.value = ''
  forgotPasswordEmail.value = loginForm.value.email.trim()
  showForgotPassword.value = true
}

const registerForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirm: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  profession: '',
  birthdate: '',
  assigned_staff_id: props.selectedStaffId || '',
  category: props.selectedCategory || ''
})

// Unified password policy: length ≥ 12 + zxcvbn strength + HIBP breach check.
// No mandatory composition rules (NIST SP 800-63B) — see usePasswordStrength.
const {
  zxcvbnScore,
  hibpStatus,
  hibpCount,
  strengthLabel,
  evaluate: evaluatePassword,
  isPasswordAcceptable,
} = usePasswordStrength()

watch(() => registerForm.value.password, (pw) => { evaluatePassword(pw) })

const isPasswordValid = computed(() => isPasswordAcceptable(registerForm.value.password))

// Fill both password fields with a generated strong password and reveal it.
const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  registerForm.value.password = pw
  registerForm.value.password_confirm = pw
  showRegisterPassword.value = true
  evaluatePassword(pw)
}

// Step 1 (account + contact) must be complete & valid before continuing.
const canProceedStep1 = computed(() => {
  const f = registerForm.value
  return Boolean(
    f.first_name.trim() &&
    f.last_name.trim() &&
    f.email.trim() &&
    f.phone.trim() &&
    isPasswordValid.value &&
    f.password === f.password_confirm &&
    emailCheckStatus.value !== 'taken' &&
    emailCheckStatus.value !== 'invalid' &&
    emailCheckStatus.value !== 'checking'
  )
})

const goToRegisterStep = (step: 1 | 2) => {
  error.value = ''
  registerStep.value = step
}

// Format phone number to +41 format
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return phone
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // If already starts with 41, just add +
  if (digits.startsWith('41')) {
    return '+' + digits
  }
  
  // If starts with 0, replace with 41
  if (digits.startsWith('0')) {
    return '+41' + digits.substring(1)
  }
  
  // Otherwise, assume Switzerland and add +41
  return '+41' + digits
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Debounced check whether the entered email is already registered. Lets the
// customer find out BEFORE filling the whole form (and offer a login shortcut)
// instead of only hitting a 409 error on submit.
const checkEmailAvailability = () => {
  if (emailCheckTimer) clearTimeout(emailCheckTimer)
  const email = registerForm.value.email.trim().toLowerCase()

  if (!email) {
    emailCheckStatus.value = 'idle'
    emailCheckMessage.value = ''
    return
  }
  if (!EMAIL_REGEX.test(email)) {
    emailCheckStatus.value = 'invalid'
    emailCheckMessage.value = 'Bitte eine gültige E-Mail-Adresse eingeben.'
    return
  }
  // Without a tenant we cannot check tenant-scoped availability — skip silently.
  if (!props.tenantId) {
    emailCheckStatus.value = 'idle'
    emailCheckMessage.value = ''
    return
  }

  emailCheckStatus.value = 'checking'
  emailCheckMessage.value = ''
  const seq = ++emailCheckSeq

  emailCheckTimer = setTimeout(async () => {
    try {
      const res = await $fetch('/api/students/check-email', {
        method: 'POST',
        body: { email, tenantId: props.tenantId }
      }) as { available: boolean; message?: string }

      // Ignore stale responses (user kept typing)
      if (seq !== emailCheckSeq) return

      if (res.available) {
        emailCheckStatus.value = 'available'
        emailCheckMessage.value = ''
      } else {
        emailCheckStatus.value = 'taken'
        emailCheckMessage.value = 'Diese E-Mail-Adresse ist bereits registriert.'
      }
    } catch {
      // Network/server hiccup must never block registration — fail open.
      if (seq !== emailCheckSeq) return
      emailCheckStatus.value = 'idle'
      emailCheckMessage.value = ''
    }
  }, 500)
}

// Switch to the login tab, carrying over the already-typed email.
const switchToLoginWithEmail = () => {
  loginForm.value.email = registerForm.value.email.trim()
  error.value = ''
  activeTab.value = 'login'
}

const handleLogin = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: loginForm.value.email,
        password: loginForm.value.password
      },
      // IMPORTANT: Mark this as an auth endpoint so the interceptor doesn't redirect
      headers: {
        'X-Auth-Request': 'true'
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Login failed')
    }

    logger.debug('✅ Login successful')
    
    // Restore auth state from session
    const sessionRestored = await authStore.restoreSession()
    
    if (sessionRestored) {
      logger.debug('✅ Session restored successfully')
      emit('success')
    } else {
      throw new Error('Failed to restore session after login')
    }
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.message || 'Fehler beim Anmelden. Bitte überprüfen Sie Ihre Zugangsdaten.'
  } finally {
    isLoading.value = false
  }
}

const handleForgotPassword = async () => {
  forgotPasswordError.value = ''
  forgotPasswordMessage.value = ''

  const email = forgotPasswordEmail.value.trim()
  if (!email) {
    forgotPasswordError.value = 'Bitte gib deine E-Mail-Adresse ein.'
    return
  }

  forgotPasswordLoading.value = true
  try {
    const response = await $fetch('/api/auth/password-reset-request', {
      method: 'POST',
      body: {
        contact: email,
        method: 'email',
        tenantId: props.tenantId || null
      }
    }) as any

    if (response?.success) {
      if (response?.code === 'ACCOUNT_PENDING') {
        forgotPasswordMessage.value = response.hasSms
          ? 'Dein Konto ist noch nicht aktiviert. Wir haben dir einen Registrierungslink per SMS gesendet.'
          : 'Dein Konto ist noch nicht aktiviert. Bitte kontaktiere deine Fahrschule für einen Registrierungslink.'
      } else if (response?.warning) {
        forgotPasswordError.value = response.message
      } else {
        forgotPasswordMessage.value = `Ein Link zum Zurücksetzen wurde an ${email} gesendet. Bitte überprüfe deinen Posteingang.`
      }
    } else if (response?.code === 'NOT_FOUND') {
      // Deliberately vague — avoid confirming/denying whether an email exists in the system.
      forgotPasswordMessage.value = `Falls ein Konto mit ${email} existiert, wurde ein Link zum Zurücksetzen gesendet.`
    } else if (response?.code === 'NO_EMAIL') {
      forgotPasswordError.value = 'Dein Konto hat keine E-Mail-Adresse hinterlegt. Bitte kontaktiere deine Fahrschule.'
    } else {
      forgotPasswordError.value = response?.message || 'Fehler beim Senden des Links. Bitte versuche es später erneut.'
    }
  } catch (err: any) {
    logger.error('❌ Forgot-password error:', err)
    forgotPasswordError.value = err?.data?.statusMessage || err?.message || 'Fehler beim Senden des Links. Bitte versuche es später erneut.'
  } finally {
    forgotPasswordLoading.value = false
  }
}

const handleRegister = async () => {
  isLoading.value = true
  error.value = ''

  try {
    // Step 1 must be valid (also guards against submitting while on step 1)
    if (!canProceedStep1.value) {
      registerStep.value = 1
      error.value = 'Bitte fülle die Konto-Angaben vollständig aus.'
      isLoading.value = false
      return
    }

    // Step 2 required fields (validated here since hidden v-show fields can't use native `required`)
    const f = registerForm.value
    if (!f.birthdate || !f.street.trim() || !f.street_nr.trim() || !f.zip.trim() || !f.city.trim()) {
      registerStep.value = 2
      error.value = 'Bitte fülle Geburtsdatum und Adresse vollständig aus.'
      isLoading.value = false
      return
    }

    const slug = route.params.slug as string

    const response = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        action: 'register-customer',
        email: registerForm.value.email,
        password: registerForm.value.password,
        first_name: registerForm.value.first_name,
        last_name: registerForm.value.last_name,
        phone: formatPhoneNumber(registerForm.value.phone),
        ...(registerForm.value.birthdate && { birthdate: registerForm.value.birthdate }),
        ...(registerForm.value.street && { street: registerForm.value.street }),
        ...(registerForm.value.street_nr && { street_nr: registerForm.value.street_nr }),
        ...(registerForm.value.zip && { zip: registerForm.value.zip }),
        ...(registerForm.value.city && { city: registerForm.value.city }),
        ...(registerForm.value.profession && { profession: registerForm.value.profession }),
        ...(registerForm.value.assigned_staff_id && { assigned_staff_id: registerForm.value.assigned_staff_id }),
        ...(registerForm.value.assigned_staff_id && { assigned_staff_ids: [registerForm.value.assigned_staff_id] }),
        ...(registerForm.value.category && { category: registerForm.value.category }),
        slug
      },
      headers: {
        'X-Auth-Request': 'true'
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Registration failed')
    }

    logger.debug('✅ Registration successful')

    // Upload document if selected (uses existing /api/auth/upload-document endpoint)
    if (uploadedDocument.value && response.user?.id) {
      try {
        const file = uploadedDocument.value
        const reader = new FileReader()
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const categoryCode = registerForm.value.category || 'B'
        await $fetch('/api/auth/upload-document', {
          method: 'POST',
          body: {
            userId: response.user.id,
            tenantId: response.user.tenant_id || null,
            fileData: base64,
            fileName: file.name,
            bucket: 'user-documents',
            path: categoryCode
          }
        })
        logger.debug('✅ Document uploaded successfully after registration')
      } catch (docErr: any) {
        logger.warn('⚠️ Document upload failed (registration still successful):', docErr.message)
        // Show non-blocking warning — registration and booking proceed, but document wasn't saved
        documentUploadError.value = 'Fahrausweis konnte nicht hochgeladen werden (Datei zu gross oder Fehler). Bitte lade ihn später im Dashboard nach.'
        // Give the user a moment to read the warning before the modal closes
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    
    // Wait for cookies to be set on server
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Restore auth state from session (cookies should now have new tokens)
    const sessionRestored = await authStore.restoreSession()
    
    if (sessionRestored) {
      logger.debug('✅ Session restored successfully after registration')
      emit('success')
    } else {
      throw new Error('Failed to restore session after registration')
    }
  } catch (err: any) {
    console.error('Registration error:', err)
    const msg = err?.statusMessage || err?.data?.statusMessage || err?.message || ''
    // Server-side duplicate-email or duplicate-phone → surface the login shortcut.
    if (err?.statusCode === 409 || /bereits registriert|already registered/i.test(msg)) {
      if (/telefon|phone|nummer/i.test(msg)) {
        // Phone number conflict — show as general error since email field isn't the issue
        error.value = msg || 'Diese Telefonnummer ist bereits registriert. Bitte melde dich an oder nutze eine andere Nummer.'
        activeTab.value = 'login'
      } else {
        emailCheckStatus.value = 'taken'
        emailCheckMessage.value = 'Diese E-Mail-Adresse ist bereits registriert.'
        error.value = ''
      }
    } else {
      error.value = msg || 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.'
    }
  } finally {
    isLoading.value = false
  }
}

// Handle document upload
const handleDocumentUpload = async (event: Event) => {
  try {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    
    if (!file) return
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      documentUploadError.value = 'Nur PDF, JPG und PNG Dateien werden akzeptiert'
      uploadedDocument.value = null
      return
    }
    
    // 3MB client-side limit accounts for base64 overhead (~33%) staying under Vercel's 4.5MB body limit
    const maxSize = 3 * 1024 * 1024
    if (file.size > maxSize) {
      documentUploadError.value = 'Datei muss kleiner als 3MB sein. Bitte komprimiere das Bild oder wähle ein kleineres File.'
      uploadedDocument.value = null
      return
    }
    
    documentUploadError.value = ''
    isUploadingDocument.value = true
    
    // Store the file (will be uploaded during registration)
    uploadedDocument.value = file
    
    logger.debug('✅ Document selected:', file.name)
    
  } catch (err: any) {
    logger.error('❌ Error handling document upload:', err)
    documentUploadError.value = 'Fehler beim Hochladen der Datei'
    uploadedDocument.value = null
  } finally {
    isUploadingDocument.value = false
  }
}
</script>
