<template>
  <div class="min-h-screen py-12 px-4 sm:px-6 lg:px-8" :style="{ backgroundColor: getTenantBackgroundColor() }">
    <div class="max-w-2xl mx-auto">
      <!-- Header Card with Tenant Colors -->
      <div class="rounded-lg shadow-lg p-8 mb-6" :style="{ backgroundColor: '#ffffff' }">
        <!-- Tenant Accent Bar -->
        <div class="h-1 rounded-full mb-6" :style="{ backgroundColor: getTenantPrimaryColor() }"></div>
        
        <!-- Course Info -->
        <div v-if="course" class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-3xl font-bold" :style="{ color: getTenantPrimaryColor() }">{{ course.name }}</h1>
            <span v-if="course.sari_managed" class="px-3 py-1 text-xs font-semibold rounded-full" :style="{ backgroundColor: getTenantPrimaryColor() + '20', color: getTenantPrimaryColor() }">
              SARI-verwalteter Kurs
            </span>
          </div>
          
          <!-- Course Details Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-600 font-semibold uppercase">Kategorie</p>
              <p class="text-lg font-bold" :style="{ color: getTenantPrimaryColor() }">{{ course.category || 'VKU' }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-600 font-semibold uppercase">Plätze</p>
              <p class="text-lg font-bold">{{ course.max_participants - course.current_participants }}/{{ course.max_participants }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-600 font-semibold uppercase">Preis</p>
              <p class="text-lg font-bold">{{ coursePrice > 0 ? 'CHF ' + coursePrice.toFixed(2) : 'Gratis' }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <p class="text-xs text-gray-600 font-semibold uppercase">Status</p>
              <p class="text-lg font-bold text-green-600">Verfügbar</p>
            </div>
          </div>
        </div>
        
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <div class="text-gray-600">Lade Kursinformationen...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-12">
          <div class="mb-6">
            <div class="inline-block p-3 rounded-lg" style="background-color: #fee2e2;">
              <svg class="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Fehler</h3>
          <p class="text-red-600 mb-6 text-lg">{{ error }}</p>
          <button
            @click="goBack"
            class="px-6 py-3 font-semibold text-white rounded-lg transition-colors"
            :style="{ backgroundColor: getTenantPrimaryColor() }"
          >
            Zurück
          </button>
        </div>

        <!-- Course Full -->
        <div v-else-if="course && isCourseFull" class="text-center py-12">
          <div class="mb-6">
            <div class="inline-block p-3 rounded-lg" style="background-color: #fef3c7;">
              <svg class="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Kurs ist ausgebucht</h3>
          <p class="text-gray-600 mb-6 text-lg">Dieser Kurs hat bereits die maximale Anzahl an Teilnehmern erreicht.</p>
          <button
            @click="goBack"
            class="px-6 py-3 font-semibold text-white rounded-lg transition-colors"
            :style="{ backgroundColor: getTenantPrimaryColor() }"
          >
            Zurück
          </button>
        </div>

        <!-- ========== SARI COURSE FLOW ========== -->

        <!-- SARI Lookup Form (FABERID + Birthdate) -->
        <div v-else-if="course && course.sari_managed && !showSARIRegistration && !showPayment" class="space-y-6">
          <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Anmeldung</h3>
            <p class="text-gray-600">Geben Sie Ihre Ausweisnummer (FABERID) und Geburtsdatum ein, um sich anzumelden</p>
          </div>

          <div class="space-y-4">
            <!-- FABERID Input -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Ausweisnummer (FABERID) *</label>
              <input
                v-model="sariLookupData.faberid"
                type="text"
                placeholder="z.B. 5401234567890"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-2 transition-colors"
                :style="{ 'focus:border-color': getTenantPrimaryColor() }"
              />
            </div>

            <!-- Birthdate Input -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Geburtsdatum *</label>
              <input
                v-model="sariLookupData.birthdate"
                type="date"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-2 transition-colors"
                :style="{ 'focus:border-color': getTenantPrimaryColor() }"
              />
            </div>

            <!-- Error Message -->
            <div v-if="sariLookupError" class="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <p class="text-red-700 text-sm font-semibold">{{ sariLookupError }}</p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="goBack"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              @click="sariLookupFunction"
              :disabled="!sariLookupData.faberid || !sariLookupData.birthdate || isSARILoading"
              class="flex-1 px-4 py-3 font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: getTenantPrimaryColor() }"
            >
              {{ isSARILoading ? 'Daten werden geladen...' : 'Weiter' }}
            </button>
          </div>
        </div>

        <!-- SARI Registration Form (Pre-filled from SARI) -->
        <form v-else-if="course && course.sari_managed && showSARIRegistration && !showPayment" @submit.prevent="enrollInSARI" class="space-y-6">
          <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Bestätigen Sie Ihre Daten</h3>
            <p class="text-gray-600">Diese Daten wurden aus SARI geladen</p>
          </div>

          <!-- SARI Data Display (Read-only) -->
          <div class="rounded-lg p-6" :style="{ backgroundColor: getTenantPrimaryColor() + '10', border: '2px solid ' + getTenantPrimaryColor() }">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-600 font-semibold uppercase mb-1">Ausweisnummer</p>
                <p class="text-lg font-bold text-gray-900 font-mono">{{ sariLookupData.faberid }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-semibold uppercase mb-1">Vorname</p>
                <p class="text-lg font-bold text-gray-900">{{ sariParticipant.first_name }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-semibold uppercase mb-1">Nachname</p>
                <p class="text-lg font-bold text-gray-900">{{ sariParticipant.last_name }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-semibold uppercase mb-1">Geburtsdatum</p>
                <p class="text-lg font-bold text-gray-900">{{ formatDate(sariParticipant.birthdate) }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs text-gray-600 font-semibold uppercase mb-1">Adresse</p>
                <p class="text-lg font-bold text-gray-900">{{ sariParticipant.street }}, {{ sariParticipant.zip }} {{ sariParticipant.city }}</p>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="sariEnrollmentError" class="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <p class="text-red-700 text-sm font-semibold">{{ sariEnrollmentError }}</p>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showSARIRegistration = false; sariEnrollmentError = ''"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="submit"
              :disabled="isEnrollingInSARI"
              class="flex-1 px-4 py-3 font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: getTenantPrimaryColor() }"
            >
              {{ isEnrollingInSARI ? 'Wird verarbeitet...' : 'Weiter zur Zahlung' }}
            </button>
          </div>
        </form>

        <!-- ========== PAYMENT FLOW (SARI & NON-SARI) ========== -->

        <!-- Payment Form (Wallee) -->
        <div v-else-if="course && showPayment" class="space-y-6">
          <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Zahlung</h3>
            <p class="text-gray-600">Sie werden zu Wallee weitergeleitet</p>
          </div>

          <!-- Course Summary -->
          <div class="rounded-lg p-6" :style="{ backgroundColor: getTenantPrimaryColor() + '10', border: '2px solid ' + getTenantPrimaryColor() }">
            <p class="text-xs text-gray-600 font-semibold uppercase mb-2">Kursprogramm</p>
            <h4 class="text-xl font-bold text-gray-900 mb-4">{{ course.name }}</h4>
            
            <div class="space-y-2 mb-4">
              <div class="flex justify-between">
                <span class="text-gray-700">Kategorie:</span>
                <span class="font-bold">{{ course.category }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-700">Max. Teilnehmer:</span>
                <span class="font-bold">{{ course.max_participants }}</span>
              </div>
            </div>

            <div class="border-t border-gray-200 pt-4">
              <div class="flex justify-between items-center">
                <span class="text-lg font-semibold text-gray-900">Gesamtpreis:</span>
                <span class="text-2xl font-bold" :style="{ color: getTenantPrimaryColor() }">
                  {{ coursePrice > 0 ? 'CHF ' + coursePrice.toFixed(2) : 'Gratis' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="paymentError" class="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
            <p class="text-red-700 text-sm font-semibold">{{ paymentError }}</p>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showPayment = false"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              @click="processWalleePayment"
              :disabled="isProcessingPayment"
              class="flex-1 px-4 py-3 font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: getTenantPrimaryColor() }"
            >
              {{ isProcessingPayment ? 'Wird verarbeitet...' : `${coursePrice > 0 ? 'CHF ' + coursePrice.toFixed(2) : 'Kostenlos'} zahlen` }}
            </button>
          </div>
        </div>

        <!-- ========== NON-SARI COURSE FLOW ========== -->

        <!-- Email Check Form (Non-SARI) -->
        <div v-else-if="course && !course.sari_managed && !showLoginForm && !showRegistrationForm" class="space-y-6">
          <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Anmeldung</h3>
            <p class="text-gray-600">Geben Sie Ihre E-Mail-Adresse ein, um fortzufahren</p>
          </div>
          
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">E-Mail-Adresse *</label>
            <input
              v-model="emailCheck.email"
              type="email"
              required
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
              placeholder="ihre@email.ch"
              :style="{ 'focus:border-color': getTenantPrimaryColor() }"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="goBack"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              @click="checkEmail"
              :disabled="!emailCheck.email || isCheckingEmail"
              class="flex-1 px-4 py-3 font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: getTenantPrimaryColor() }"
            >
              {{ isCheckingEmail ? 'Prüfen...' : 'Weiter' }}
            </button>
          </div>
        </div>

        <!-- Login Form for Existing Users (Non-SARI) -->
        <form v-else-if="course && !course.sari_managed && showLoginForm" @submit.prevent="loginAndEnroll" class="space-y-6">
          <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Anmelden</h3>
            <p class="text-gray-600">Sie haben bereits ein Konto</p>
            <p class="text-sm text-gray-500 mt-2">E-Mail: <span class="font-semibold">{{ emailCheck.email }}</span></p>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Passwort *</label>
            <input
              v-model="loginForm.password"
              type="password"
              required
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
              placeholder="Ihr Passwort"
              :style="{ 'focus:border-color': getTenantPrimaryColor() }"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="goBackToEmailCheck"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="submit"
              :disabled="!loginForm.password || isSubmitting"
              class="flex-1 px-4 py-3 font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: getTenantPrimaryColor() }"
            >
              {{ isSubmitting ? 'Anmelden...' : 'Anmelden & Kursanmeldung' }}
            </button>
          </div>

          <div class="text-center">
            <button
              type="button"
              @click="forgotPassword"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Passwort vergessen?
            </button>
          </div>
        </form>

        <!-- Registration Form for New Users (Non-SARI) -->
        <form v-else-if="course && !course.sari_managed && showRegistrationForm" @submit.prevent="registerAndEnroll" class="space-y-6">
          <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">Neues Konto erstellen</h3>
            <p class="text-gray-600">Erstellen Sie ein Konto und melden Sie sich für den Kurs an</p>
          </div>

          <!-- Registration Form -->
          <div class="space-y-4">
            <!-- Personal Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Vorname *</label>
                <input
                  v-model="registrationForm.first_name"
                  type="text"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                  :style="{ 'focus:border-color': getTenantPrimaryColor() }"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Nachname *</label>
                <input
                  v-model="registrationForm.last_name"
                  type="text"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                  :style="{ 'focus:border-color': getTenantPrimaryColor() }"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">E-Mail *</label>
              <input
                v-model="registrationForm.email"
                type="email"
                required
                readonly
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <!-- Password -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Passwort *</label>
                <input
                  v-model="registrationForm.password"
                  type="password"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                  :style="{ 'focus:border-color': getTenantPrimaryColor() }"
                />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Passwort bestätigen *</label>
                <input
                  v-model="registrationForm.confirmPassword"
                  type="password"
                  required
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                  :style="{ 'focus:border-color': getTenantPrimaryColor() }"
                />
              </div>
            </div>

            <!-- Contact Info -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Telefon</label>
              <input
                v-model="registrationForm.phone"
                type="tel"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                :style="{ 'focus:border-color': getTenantPrimaryColor() }"
                placeholder="+41 79 123 45 67"
              />
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Geburtsdatum</label>
              <input
                v-model="registrationForm.birthdate"
                type="date"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                :style="{ 'focus:border-color': getTenantPrimaryColor() }"
              />
            </div>

            <!-- Address -->
            <div class="space-y-3">
              <h4 class="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">Adresse</h4>
              
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
                  <input
                    v-model="registrationForm.street"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Musterstrasse"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                  <input
                    v-model="registrationForm.street_nr"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <input
                    v-model="registrationForm.zip"
                    type="text"
                    pattern="[0-9]{4}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="8000"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-semibold text-gray-700 mb-1">Ort</label>
                  <input
                    v-model="registrationForm.city"
                    type="text"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                    :style="{ 'focus:border-color': getTenantPrimaryColor() }"
                    placeholder="Zürich"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Nachricht (optional)</label>
              <textarea
                v-model="registrationForm.message"
                rows="3"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-colors"
                :style="{ 'focus:border-color': getTenantPrimaryColor() }"
                placeholder="Zusätzliche Informationen oder Fragen..."
              ></textarea>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="goBackToEmailCheck"
              class="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Zurück
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || !registrationForm.first_name || !registrationForm.last_name || !registrationForm.password || !registrationForm.confirmPassword"
              class="flex-1 px-4 py-3 font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :style="{ backgroundColor: getTenantPrimaryColor() }"
            >
              {{ isSubmitting ? 'Registrieren...' : 'Registrieren & Anmelden' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDateTime, formatDate } from '~/utils/dateUtils'

const route = useRoute()
const router = useRouter()
const supabase = getSupabase()

// Course State
const course = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Non-SARI Flow States
const showLoginForm = ref(false)
const showRegistrationForm = ref(false)
const isCheckingEmail = ref(false)
const isSubmitting = ref(false)

// SARI Flow States
const showSARIRegistration = ref(false)
const showPayment = ref(false)
const isSARILoading = ref(false)
const isEnrolling = ref(false)
const isProcessingPayment = ref(false)

// SARI Lookup
const sariLookupData = ref({
  faberid: '',
  birthdate: ''
})
const sariLookupError = ref<string | null>(null)
const enrollmentError = ref<string | null>(null)
const sariParticipant = ref<any>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  birthdate: '',
  street: '',
  zip: '',
  city: ''
})

// Email Check (Non-SARI)
const emailCheck = ref({
  email: ''
})

// Login Form
const loginForm = ref({
  password: ''
})

// Registration Form (Both SARI & Non-SARI)
const registrationForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  birthdate: '',
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  message: ''
})

// Payment State
const coursePrice = ref(0)
const paymentError = ref<string | null>(null)

// Computed
const isCourseFull = computed(() => {
  if (!course.value) return false
  return (course.value.current_participants || 0) >= (course.value.max_participants || 0)
})

// Tenant Color Helpers
const getTenantPrimaryColor = () => {
  return '#2563eb' // Default blue, could be enhanced with actual tenant data
}

const getTenantBackgroundColor = () => {
  return '#f0f9ff' // Light blue background
}

// Methods
const loadCourse = async () => {
  try {
    const courseId = route.params.id as string
    
    const { data, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        course_category:course_categories(name, icon, color),
        instructor:users!courses_instructor_id_fkey(first_name, last_name),
        next_session:course_sessions(start_time),
        registrations:course_registrations(status)
      `)
      .eq('id', courseId)
      .eq('status', 'active')
      .single()

    if (courseError) throw courseError

    // Calculate current participants
    const confirmedRegistrations = data?.registrations?.filter((r: any) => r.status === 'confirmed') || []
    const currentParticipants = confirmedRegistrations.length
    
    course.value = {
      ...data,
      current_participants: currentParticipants
    }

    // Set default course price (can be customized per tenant) - convert from Rappen to CHF
    const priceInRappen = course.value.price_per_participant_rappen || 0
    coursePrice.value = priceInRappen / 100
  } catch (err: any) {
    console.error('Error loading course:', err)
    error.value = 'Kurs nicht gefunden oder nicht verfügbar'
  } finally {
    isLoading.value = false
  }
}

// SARI Lookup
const sariLookupFunction = async () => {
  try {
    isSARILoading.value = true
    sariLookupError.value = null

    console.log('🔍 SARI Lookup - Input:', {
      faberid: sariLookupData.value.faberid,
      birthdate: sariLookupData.value.birthdate,
      tenantId: course.value.tenant_id
    })

    const response = await $fetch('/api/sari/lookup-customer', {
      method: 'POST',
      body: {
        faberid: sariLookupData.value.faberid.trim(),
        birthdate: sariLookupData.value.birthdate,
        tenantId: course.value.tenant_id
      }
    })

    console.log('📥 SARI Lookup - Response:', response)

    if (!response.success) {
      throw new Error(response.message || 'SARI-Daten konnten nicht geladen werden')
    }

    // Pre-fill participant data
    sariParticipant.value = {
      first_name: response.data.first_name || '',
      last_name: response.data.last_name || '',
      email: response.data.email || '',
      phone: response.data.phone || '',
      birthdate: response.data.birthdate || sariLookupData.value.birthdate,
      street: response.data.street || '',
      zip: response.data.zip || '',
      city: response.data.city || ''
    }

    console.log('✅ Participant data pre-filled:', sariParticipant.value)

    // Pre-fill registration form
    registrationForm.value.first_name = sariParticipant.value.first_name
    registrationForm.value.last_name = sariParticipant.value.last_name
    registrationForm.value.email = sariParticipant.value.email
    registrationForm.value.phone = sariParticipant.value.phone
    registrationForm.value.birthdate = sariParticipant.value.birthdate
    registrationForm.value.street = sariParticipant.value.street
    registrationForm.value.zip = sariParticipant.value.zip
    registrationForm.value.city = sariParticipant.value.city

    showSARIRegistration.value = true
  } catch (err: any) {
    console.error('❌ Error during SARI lookup:', err)
    sariLookupError.value = err.message || 'Fehler beim Laden der SARI-Daten'
  } finally {
    isSARILoading.value = false
  }
}

// Enroll in SARI (called when user clicks "Weiter zur Zahlung")
const enrollInSARI = async () => {
  try {
    isEnrolling.value = true
    enrollmentError.value = null

    console.log('🧪 Validating enrollment with SARI...')
    const validationResponse = await $fetch('/api/sari/validate-enrollment', {
      method: 'POST',
      body: {
        faberid: sariLookupData.value.faberid,
        birthdate: sariLookupData.value.birthdate,
        courseId: course.value.id,
        tenantId: course.value.tenant_id
      }
    })

    if (!validationResponse.success) {
      console.error('❌ Enrollment validation failed:', validationResponse.message)
      enrollmentError.value = validationResponse.message || 'Anmeldung ist nicht möglich'
      return
    }

    console.log('✅ Enrollment validation passed, proceeding to payment')
    // Get email from sari participant
    registrationForm.value.email = sariParticipant.value.email || ''
    showPayment.value = true
  } catch (err: any) {
    console.error('Enrollment error:', err)
    enrollmentError.value = err.message || 'Fehler bei der Anmeldung'
  } finally {
    isEnrolling.value = false
  }
}

// Process Wallee Payment (for SARI)
const processWalleePayment = async () => {
  try {
    isProcessingPayment.value = true
    paymentError.value = null

    const emailForPayment = registrationForm.value.email || sariParticipant.value.email

    console.log('💳 Payment - Input data:', {
      courseId: course.value.id,
      tenantId: course.value.tenant_id,
      coursePrice: coursePrice.value,
      emailForPayment,
      participantName: `${sariParticipant.value.first_name} ${sariParticipant.value.last_name}`
    })

    // Create transaction via Wallee
    const response = await $fetch('/api/payment-gateway/create-transaction', {
      method: 'POST',
      body: {
        orderId: `SARI-${course.value.id}-${Date.now()}`,
        amount: coursePrice.value,
        currency: 'CHF',
        customerEmail: emailForPayment,
        customerName: `${sariParticipant.value.first_name} ${sariParticipant.value.last_name}`,
        description: `Kurs: ${course.value.name}`,
        successUrl: `${window.location.origin}/courses/enrollment-success?courseId=${course.value.id}&sari=true`,
        failedUrl: window.location.href,
        userId: 'anonymous',
        tenantId: course.value.tenant_id,
        metadata: {
          type: 'SARI_COURSE_ENROLLMENT',
          course_id: course.value.id,
          sari_course_id: course.value.sari_course_id,
          faberid: sariLookupData.value.faberid,
          birthdate: sariLookupData.value.birthdate,
          participant_data: sariParticipant.value
        },
        lineItems: [
          {
            uniqueId: `sari-${course.value.id}`,
            name: course.value.name,
            quantity: 1,
            amountIncludingTax: coursePrice.value,
            type: 'PRODUCT'
          }
        ]
      }
    })

    console.log('📥 Payment response:', response)

    if (!response.success) {
      throw new Error(response.error || 'Payment creation failed')
    }

    // Redirect to Wallee payment page
    if (response.paymentUrl) {
      window.location.href = response.paymentUrl
    }
  } catch (err: any) {
    console.error('Error processing payment:', err)
    paymentError.value = err.message || 'Zahlungsverarbeitung fehlgeschlagen'
  } finally {
    isProcessingPayment.value = false
  }
}

// Non-SARI Email Check
const checkEmail = async () => {
  try {
    isCheckingEmail.value = true

    const { data: existingUser, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', emailCheck.value.email)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (existingUser) {
      showLoginForm.value = true
      registrationForm.value.email = emailCheck.value.email
    } else {
      showRegistrationForm.value = true
      registrationForm.value.email = emailCheck.value.email
    }
  } catch (err: any) {
    console.error('Error checking email:', err)
    alert('Fehler beim Prüfen der E-Mail-Adresse. Bitte versuchen Sie es erneut.')
  } finally {
    isCheckingEmail.value = false
  }
}

// Non-SARI Login & Enroll
const loginAndEnroll = async () => {
  try {
    isSubmitting.value = true

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailCheck.value.email,
      password: loginForm.value.password
    })

    if (authError) throw authError

    await createEnrollment()

    alert('Anmeldung erfolgreich! Sie erhalten eine Bestätigungs-E-Mail.')
    goBack()
  } catch (err: any) {
    console.error('Error logging in and enrolling:', err)
    alert('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.')
  } finally {
    isSubmitting.value = false
  }
}

// Non-SARI Register & Enroll
const registerAndEnroll = async () => {
  try {
    isSubmitting.value = true

    if (registrationForm.value.password !== registrationForm.value.confirmPassword) {
      alert('Passwörter stimmen nicht überein.')
      return
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registrationForm.value.email,
      password: registrationForm.value.password,
      options: {
        data: {
          first_name: registrationForm.value.first_name,
          last_name: registrationForm.value.last_name,
          phone: registrationForm.value.phone,
          birthdate: registrationForm.value.birthdate,
          street: registrationForm.value.street,
          street_nr: registrationForm.value.street_nr,
          zip: registrationForm.value.zip,
          city: registrationForm.value.city
        }
      }
    })

    if (authError) throw authError

    await new Promise(resolve => setTimeout(resolve, 1000))

    await createEnrollment()

    alert('Registrierung und Kursanmeldung erfolgreich! Sie erhalten eine Bestätigungs-E-Mail.')
    goBack()
  } catch (err: any) {
    console.error('Error registering and enrolling:', err)
    alert('Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.')
  } finally {
    isSubmitting.value = false
  }
}

// Create Enrollment (Non-SARI only)
const createEnrollment = async () => {
  const { data, error } = await $fetch('/api/courses/enroll', {
    method: 'POST',
    body: {
      courseId: course.value.id,
      participant: {
        first_name: registrationForm.value.first_name,
        last_name: registrationForm.value.last_name,
        email: registrationForm.value.email,
        phone: registrationForm.value.phone,
        birthdate: registrationForm.value.birthdate,
        street: registrationForm.value.street,
        street_nr: registrationForm.value.street_nr,
        zip: registrationForm.value.zip,
        city: registrationForm.value.city,
        message: registrationForm.value.message
      }
    }
  })

  if (error) throw new Error(error)
  return data
}

// Helpers
const goBackToEmailCheck = () => {
  showLoginForm.value = false
  showRegistrationForm.value = false
  loginForm.value.password = ''
  registrationForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthdate: '',
    street: '',
    street_nr: '',
    zip: '',
    city: '',
    message: ''
  }
}

const forgotPassword = async () => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(emailCheck.value.email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) throw error
    
    alert('Passwort-Reset E-Mail wurde gesendet!')
  } catch (err: any) {
    console.error('Error sending password reset:', err)
    alert('Fehler beim Senden der Passwort-Reset E-Mail.')
  }
}

const getInstructorName = (courseData: any) => {
  if (courseData.external_instructor_name) {
    return courseData.external_instructor_name
  }
  if (courseData.instructor) {
    return `${courseData.instructor.first_name} ${courseData.instructor.last_name}`
  }
  return 'Nicht zugewiesen'
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  loadCourse()
})
</script>

<style scoped>
/* Additional styling if needed */
</style>
