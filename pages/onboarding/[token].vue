<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h1 class="text-center text-3xl font-bold text-gray-900">
        Willkommen bei {{ tenantName }}
      </h1>
      <p class="mt-2 text-center text-sm text-gray-600">
        Vervollständige deine Registrierung
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Lade Daten...</p>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-red-50 py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <div class="text-center">
          <p class="text-red-600">{{ error }}</p>
          <button
            @click="navigateTo('/')"
            class="mt-4 text-green-600 hover:text-green-700 font-medium"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    </div>

    <!-- Main Form -->
    <div v-else class="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        
        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-between max-w-2xl mx-auto">
            <div 
              v-for="(stepItem, index) in steps" 
              :key="index"
              class="flex-1 flex flex-col items-center"
            >
              <div class="flex items-center w-full">
                <div 
                  class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all duration-300"
                  :class="{
                    'bg-green-600 border-green-600 text-white shadow-lg': index < step,
                    'bg-green-600 border-green-600 text-white shadow-lg ring-4 ring-green-100': index === step,
                    'bg-white border-gray-300 text-gray-400': index > step
                  }"
                >
                  <svg v-if="index < step" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                  </svg>
                  <span v-else class="text-sm font-semibold">{{ index + 1 }}</span>
                </div>
                <div 
                  v-if="index < steps.length - 1"
                  class="flex-1 h-0.5 mx-3 transition-colors duration-300"
                  :class="{
                    'bg-green-600': index < step,
                    'bg-gray-300': index >= step
                  }"
                ></div>
              </div>
              <p class="mt-3 text-xs text-center font-medium" :class="{
                'text-green-600': index <= step,
                'text-gray-500': index > step
              }">{{ stepItem }}</p>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleNextStep">
          <!-- Step 1: Set Password -->
          <div v-if="step === 0">
            <h2 class="text-xl font-bold mb-4">Setze dein Passwort</h2>
            <p class="text-sm text-gray-600 mb-6">
              Wähle ein sicheres Passwort für deinen Login.
            </p>

            <div class="space-y-4">
              <!-- Hidden dummy fields to prevent password suggestions -->
              <div style="position: absolute; left: -9999px; opacity: 0;">
                <input type="text" name="username" autocomplete="username">
                <input type="password" name="password" autocomplete="current-password">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Passwort *
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  required
                  minlength="12"
                  autocomplete="off"
                  name="new-password-field"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Mindestens 12 Zeichen"
                >
                <div class="mt-1 text-xs">
                  <p :class="passwordTooShort ? 'text-red-600' : 'text-gray-500'">
                    {{ passwordTooShort ? 'Passwort ist zu kurz (min. 12 Zeichen).' : 'Mindestens 12 Zeichen, empfohlen: Gross-/Kleinbuchstaben, Zahlen & Sonderzeichen' }}
                  </p>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen *
                </label>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  autocomplete="off"
                  name="confirm-password-field"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Passwort wiederholen"
                >
                <p v-if="passwordMismatch" class="mt-1 text-xs text-red-600">Passwörter stimmen nicht überein.</p>
              </div>

              <p v-if="passwordError" class="text-red-600 text-sm">{{ passwordError }}</p>
            </div>
          </div>

          <!-- Step 2: Complete Profile -->
          <div v-if="step === 1">
            <h2 class="text-xl font-bold mb-4">Vervollständige dein Profil</h2>
            <p class="text-sm text-gray-600 mb-6">
              Diese Daten benötigen wir für deine Fahrstunden.
            </p>

            <div class="space-y-4">
              <!-- First Name and Last Name -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Vorname *
                  </label>
                  <input
                    v-model="form.firstName"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Max"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nachname *
                  </label>
                  <input
                    v-model="form.lastName"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Mustermann"
                  >
                </div>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail Adresse *
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="max.mustermann@example.com"
                >
              </div>

              <!-- Phone -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Telefonnummer
                </label>
                <input
                  v-model="form.phone"
                  type="tel"
                  @blur="normalizePhoneNumber"
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="+41 79 123 45 67"
                >
              </div>

              <!-- Birthdate -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Geburtsdatum *
                </label>
                <input
                  v-model="form.birthdate"
                  type="date"
                  required
                  class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>

              <!-- Address -->
              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Strasse *
                  </label>
                  <input
                    v-model="form.street"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Musterstrasse"
                  >
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nr. *
                  </label>
                  <input
                    v-model="form.street_nr"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123"
                  >
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    PLZ *
                  </label>
                  <input
                    v-model="form.zip"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="8000"
                  >
                </div>

                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Ort *
                  </label>
                  <input
                    v-model="form.city"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Zürich"
                  >
                </div>
              </div>

              <!-- Category Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  Führerausweis-Kategorien *
                </label>
                <div class="space-y-3">
                  <div v-for="cat in categories" :key="cat.code || cat.id" class="flex justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center space-x-3">
                        <span class="text-lg font-bold text-gray-800">{{ cat.code || cat.id }}</span>
                        <span class="text-sm text-gray-600">{{ cat.name }}</span>
                      </div>
                    </div>
                    <label class="relative inline-flex items-start cursor-pointer ml-4 flex-shrink-0">
                      <input
                        v-model="form.categories"
                        :value="cat.code || cat.id"
                        type="checkbox"
                        class="sr-only peer"
                      />
                      <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Address - REMOVED from here, moved above categories -->
            </div>
          </div>

          <!-- Step 3: Upload Documents -->
          <div v-if="step === 2">
            <h2 class="text-xl font-bold mb-4">Dokumente hochladen</h2>
            <p class="text-sm text-gray-600 mb-6">
              Bitte lade für jede Kategorie einen Ausweis hoch.
            </p>

            <div class="space-y-6">
              <!-- Upload per Category -->
              <div 
                v-for="category in form.categories" 
                :key="category"
                class="border-2 border-gray-200 rounded-lg p-6"
              >
                <div class="mb-4">
                  <h3 class="text-lg font-semibold text-gray-900">
                    Kategorie {{ category }}
                  </h3>
                  <p class="text-sm text-gray-600 mt-1">
                    <template v-if="category === 'Boot' || category === 'M' || category === 'Motorboot'">
                      Lernfahr-/Führerausweis, ID oder Pass
                    </template>
                    <template v-else>
                      Lernfahr- oder Führerausweis
                    </template>
                  </p>
                </div>
                
                <!-- File Upload Area -->
                <div 
                  @drop="handleDrop($event, category)"
                  @dragover="handleDragOver($event, category)"
                  @dragenter="handleDragOver($event, category)"
                  @dragleave="handleDragLeave($event, category)"
                  :class="[
                    'border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200',
                    dragOver[category] ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400'
                  ]"
                >
                  <div v-if="!uploadedFiles[category]">
                    <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="mt-4">
                      <label :for="`file_${category}`" class="cursor-pointer">
                        <span class="mt-2 block text-sm font-medium text-gray-900">
                          Datei hierher ziehen oder
                          <span class="text-green-600 hover:text-green-500">durchsuchen</span>
                        </span>
                        <p class="mt-1 text-xs text-gray-500">
                          PNG, JPG, PDF bis 10MB
                        </p>
                      </label>
                      <input
                        :id="`file_${category}`"
                        type="file"
                        accept="image/*,.pdf"
                        @change="handleFileUpload($event, category)"
                        class="sr-only"
                        required
                      >
                    </div>
                  </div>
                  
                  <!-- File Preview -->
                  <div v-else class="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div class="flex items-center space-x-3 min-w-0 flex-1">
                      <div class="flex-shrink-0">
                        <svg v-if="uploadedFiles[category].type.startsWith('image/')" class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <svg v-else class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-green-900 truncate break-words" :title="uploadedFiles[category].name">
                          {{ uploadedFiles[category].name }}
                        </p>
                        <p class="text-xs text-green-600">
                          {{ formatFileSize(uploadedFiles[category].size) }}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="removeFile(category)"
                      class="flex-shrink-0 p-1 text-green-600 hover:text-green-800"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Terms & Conditions -->
          <div v-if="step === 3">
            <h2 class="text-xl font-bold mb-4">AGB akzeptieren</h2>
            <p class="text-sm text-gray-600 mb-6">
              Bitte lies und akzeptiere unsere Geschäftsbedingungen.
            </p>

            <div class="space-y-4">
              <div class="flex items-start space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <input
                  v-model="form.acceptedTerms"
                  type="checkbox"
                  required
                  class="mt-1 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded flex-shrink-0"
                >
                <label class="text-sm text-gray-700 leading-relaxed">
                  Ich akzeptiere die 
                  <button
                    type="button"
                    @click.prevent="openRegulationModal('nutzungsbedingungen')"
                    class="text-green-600 hover:text-green-800 underline font-medium"
                  >
                    Nutzungsbedingungen
                  </button>,
                  die
                  <button
                    type="button"
                    @click.prevent="openRegulationModal('agb')"
                    class="text-green-600 hover:text-green-800 underline font-medium"
                  >
                    AGB
                  </button>
                  und die
                  <button
                    type="button"
                    @click.prevent="openRegulationModal('datenschutz')"
                    class="text-green-600 hover:text-green-800 underline font-medium"
                  >
                    Datenschutzerklärung
                  </button>
                  und bestätige, dass ich alle Angaben korrekt gemacht habe. *
                </label>
              </div>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <button
              v-if="step > 0"
              type="button"
              @click="step--"
              class="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              ← Zurück
            </button>
            <div v-else class="hidden sm:block"></div>

            <button
              type="submit"
              :disabled="isSubmitting || (step === 0 && (passwordTooShort || passwordMismatch))"
              class="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <span v-if="isSubmitting" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird verarbeitet...
              </span>
              <span v-else>
                {{ step === 3 ? 'Registrierung abschliessen' : 'Weiter →' }}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>

    <!-- Error Modal -->
    <div v-if="showErrorModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-gray-900">Registrierung fehlgeschlagen</h3>
          </div>
        </div>
        <div class="mb-6">
          <p class="text-sm text-gray-600">{{ error }}</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            @click="showErrorModal = false"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Nochmal versuchen
          </button>
          <button
            @click="goToLogin"
            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Zum Login
          </button>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-gray-900">Registrierung erfolgreich!</h3>
          </div>
        </div>
        <div class="mb-6">
          <p class="text-sm text-gray-600">{{ successMessage }}</p>
        </div>
        <div class="flex justify-end">
          <button
            @click="goToLogin"
            class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Zum Login
          </button>
        </div>
      </div>
    </div>

    <!-- Regulations Modal -->
    <div v-if="showRegulationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="showRegulationModal = false">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-gray-100 px-6 py-4 border-b">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-bold text-gray-900">{{ currentRegulation?.title }}</h2>
            <button
              type="button"
              @click="showRegulationModal = false"
              class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="px-6 py-6">
          <div v-if="currentRegulation" v-html="currentRegulation.content" class="prose prose-sm max-w-none text-gray-700"></div>
        </div>

        <!-- Modal Footer -->
        <div class="bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button
            type="button"
            @click="showRegulationModal = false"
            class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const token = route.params.token as string

const step = ref(0)
const steps = ['Passwort', 'Profil', 'Dokumente', 'AGB']

const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref('')
const passwordError = ref('')
const successMessage = ref('')
const showErrorModal = ref(false)
const showSuccessModal = ref(false)
const showRegulationModal = ref(false)
const currentRegulation = ref<any>(null)
const passwordTooShort = computed(() => form.password.length > 0 && form.password.length < 12)
const passwordMismatch = computed(() => form.confirmPassword.length > 0 && form.password !== form.confirmPassword)

const tenantName = ref('Deiner Fahrschule')
const userData = ref<any>(null)
const categories = ref<any[]>([])
const termsText = ref('AGB werden geladen...')

const form = reactive({
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
  birthdate: '',
  categories: [] as string[],
  street: '',
  street_nr: '',
  zip: '',
  city: '',
  acceptedTerms: false
})

const uploadedFiles = reactive<Record<string, File>>({})
const dragOver = reactive<Record<string, boolean>>({})

// Normalize phone number to +41 79... format
function normalizePhoneNumber() {
  let phone = form.phone.replace(/[^0-9+]/g, '')
  
  // If starts with 0 and has 10 digits, convert to +41
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '+41' + phone.substring(1)
  } 
  // If starts with 41 and has 11 digits, add +
  else if (phone.startsWith('41') && phone.length === 11) {
    phone = '+' + phone
  }
  
  form.phone = phone
})

// Load user data by token
onMounted(async () => {
  // DEV MODE: Allow testing with 'dev' token
  const token = route.params.token as string
  const isDevelopment = process.dev && token === 'dev'
  
  if (isDevelopment) {
    logger.debug('🔧 DEV MODE: Using mock data for testing')
    isLoading.value = false
    userData.value = {
      id: 'dev-user-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      tenant_id: '64259d68-195a-4c68-8875-f1b44d962830',
      tenant_slug: 'driving-team' // Added for redirect
    }
    tenantName.value = 'Driving Team'
    categories.value = [
      { code: 'B', name: 'Auto', id: 1 },
      { code: 'A1', name: 'Motorrad', id: 2 },
      { code: 'Boot', name: 'Motorboot', id: 31 }
    ]
    termsText.value = 'Test AGB - Development Mode'
    form.email = 'test@example.com'
    return
  }
  
  // Redirect if we're on localhost to production domain
  if (process.client && window.location.hostname === 'localhost') {
    const redirectUrl = `https://simy.ch/onboarding/${token}`
    logger.debug('🔄 Redirecting onboarding link from localhost to production:', redirectUrl)
    window.location.href = redirectUrl
    return
  }

  try {
    const { data, error: fetchError } = await useFetch('/api/students/verify-onboarding-token', {
      method: 'POST',
      body: { token }
    })

    if (fetchError.value || !data.value?.success) {
      error.value = 'Ungültiger oder abgelaufener Link. Bitte kontaktiere deine Fahrschule.'
      return
    }

    userData.value = data.value.user
    tenantName.value = data.value.tenantName || 'Deiner Fahrschule'
    
    // Pre-fill known data
    if (userData.value.email) form.email = userData.value.email

    // Load dynamic categories
    try {
      const { data: catData } = await useFetch(`/api/onboarding/categories`, {
        method: 'GET',
        query: { token }
      })
      categories.value = catData.value?.categories || []
    } catch {}

    // Load dynamic terms/policies
    try {
      const { data: termsData } = await useFetch(`/api/onboarding/terms`, {
        method: 'GET',
        query: { token }
      })
      termsText.value = (termsData.value?.terms || 'AGB aktuell nicht verfügbar').trim()
    } catch {
      termsText.value = 'AGB aktuell nicht verfügbar'
    }
    
  } catch (err: any) {
    error.value = 'Fehler beim Laden der Daten. Bitte versuche es später erneut.'
  } finally {
    isLoading.value = false
  }
})

// Handle file uploads
const handleFileUpload = (event: Event, type: string) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadedFiles[type] = file
  }
}

// Handle drag and drop
const handleDrop = (event: DragEvent, type: string) => {
  event.preventDefault()
  dragOver[type] = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      uploadedFiles[type] = file
    }
  }
}

// Handle drag over
const handleDragOver = (event: DragEvent, type: string) => {
  event.preventDefault()
  dragOver[type] = true
}

// Handle drag leave
const handleDragLeave = (event: DragEvent, type: string) => {
  event.preventDefault()
  dragOver[type] = false
}

// Remove file
const removeFile = (type: string) => {
  delete uploadedFiles[type]
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Show error message
const showErrorMessage = (message: string) => {
  error.value = message
  showErrorModal.value = true
}

// Show success message
const showSuccessMessage = (message: string) => {
  successMessage.value = message
  showSuccessModal.value = true
}

// Navigate to login
const goToLogin = async () => {
  // Try to navigate to tenant-specific login if we have tenant info
  if (userData.value?.tenant_slug) {
    await navigateTo(`/${userData.value.tenant_slug}`)
  } else {
    await navigateTo('/')
  }
}

// Load and display regulations
const openRegulationModal = async (type: string) => {
  try {
    const supabase = getSupabase()
    const activeTenantId = userData.value?.tenant_id
    
    const typeLabel = type === 'nutzungsbedingungen' ? 'Nutzungsbedingungen' : 'Datenschutzerklärung'
    logger.debug('📋 Loading regulation:', type, 'for tenant:', activeTenantId)
    
    if (!activeTenantId) {
      console.error('❌ No tenant_id available')
      showErrorMessage(`Fehler: Die Tenant-Informationen fehlen. Bitte kontaktiere die Fahrschule.`)
      return
    }
    
    // Try to load tenant-specific reglement first, then fall back to global
    const { data: regulations, error } = await supabase
      .from('tenant_reglements')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .or(`tenant_id.eq.${activeTenantId},tenant_id.is.null`)
      .order('tenant_id', { ascending: false })
      .limit(1)
    
    logger.debug('📋 Query result:', { regulations, error })
    
    if (error) {
      console.error('❌ Error loading reglement:', error)
      showErrorMessage(`Fehler beim Laden der ${typeLabel}. Bitte versuche es später erneut oder kontaktiere die Fahrschule.`)
      return
    }
    
    if (regulations && regulations.length > 0) {
      currentRegulation.value = regulations[0]
      showRegulationModal.value = true
      logger.debug('✅ Opened reglement modal:', type, regulations[0].title)
    } else {
      console.warn('⚠️ Reglement not found:', type)
      showErrorMessage(`${typeLabel} sind noch nicht verfügbar. Bitte kontaktiere die Fahrschule.`)
    }
  } catch (err: any) {
    console.error('❌ Error opening reglement modal:', err)
    showErrorMessage('Fehler beim Laden der Dokumente. Bitte versuche es später erneut.')
  }
}

// Handle next step
const handleNextStep = async () => {
  // Validate current step
  if (step.value === 0) {
    // Password validation
    if (form.password.length < 12) {
      passwordError.value = 'Passwort muss mindestens 12 Zeichen lang sein'
      return
    }
    if (form.password !== form.confirmPassword) {
      passwordError.value = 'Passwörter stimmen nicht überein'
      return
    }
    passwordError.value = ''
    step.value++
  } else if (step.value === 1) {
    // Step 2 validation: Check that at least one category is selected
    if (form.categories.length === 0) {
      showErrorMessage('Bitte wähle mindestens eine Kategorie aus')
      return
    }
    step.value++
  } else if (step.value === 2) {
    // Step 3 validation: Check that all categories have uploaded documents
    const allCategoriesHaveDocuments = form.categories.every(cat => uploadedFiles[cat])
    if (!allCategoriesHaveDocuments) {
      showErrorMessage('Bitte lade für jede Kategorie einen Ausweis hoch')
      return
    }
    step.value++
  } else if (step.value < 3) {
    step.value++
  } else {
    // Final step - submit
    await completeOnboarding()
  }
}

// Complete onboarding
const completeOnboarding = async () => {
  isSubmitting.value = true

  try {
    // Upload documents first
    const documentUrls: Record<string, string> = {}
    
    for (const [type, file] of Object.entries(uploadedFiles)) {
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)
        formData.append('userId', userData.value.id)

        try {
          const { data: uploadData, error: uploadError } = await useFetch('/api/students/upload-document', {
          method: 'POST',
          body: formData
        })

          if (uploadError.value) {
            console.error('❌ Document upload error:', uploadError.value)
            throw new Error(`Dokument-Upload fehlgeschlagen: ${uploadError.value.message || 'Unbekannter Fehler'}`)
          }

        if (uploadData.value?.url) {
          documentUrls[type] = uploadData.value.url
          }
        } catch (uploadErr: any) {
          console.error('❌ Error uploading document for category', type, ':', uploadErr)
          throw new Error(`Fehler beim Upload der Dokumente (${type}): ${uploadErr.message}`)
        }
      }
    }

    // Complete onboarding
    const requestBody = {
      token,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,  // ✅ NEU: Telefonnummer hinzufügen
      password: form.password,
      email: form.email,
      birthdate: form.birthdate,
      categories: form.categories,
      street: form.street,
      street_nr: form.street_nr,
      zip: form.zip,
      city: form.city,
      documentUrls
    }
    
    logger.debug('📤 Sending onboarding completion request:', requestBody)
    
    const { data, error: completeError } = await useFetch('/api/students/complete-onboarding', {
      method: 'POST',
      body: requestBody
    })
    
    logger.debug('📥 Onboarding completion response:', { data: data.value, error: completeError.value })

    if (completeError.value) {
      console.error('❌ Complete error details:', completeError.value)
      let errorMessage = completeError.value.data?.message || completeError.value.message || 'Unbekannter Fehler'
      
      // Provide more helpful error messages
      if (errorMessage.includes('duplicate') || errorMessage.includes('Email')) {
        errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte verwende eine andere E-Mail oder kontaktiere die Fahrschule.'
      } else if (errorMessage.includes('password')) {
        errorMessage = 'Das Passwort erfüllt nicht die Anforderungen (min. 8 Zeichen, groß- und kleinbuchstaben, zahlen)'
      } else if (errorMessage.includes('Token')) {
        errorMessage = 'Der Registrierungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'
      }
      
      throw new Error(errorMessage)
    }

    if (!data.value?.success) {
      throw new Error('Registrierung fehlgeschlagen: Die Daten konnten nicht gespeichert werden. Bitte versuche es erneut.')
    }

    // Success - show success message and redirect
    showSuccessMessage('Registrierung erfolgreich abgeschlossen! Du wirst zum Login weitergeleitet...')
    
    // Auto-redirect to login after 2 seconds
    setTimeout(async () => {
      // Get tenant slug from userData or extract from token API response
      const tenantSlug = userData.value?.tenant_slug || data.value?.tenant_slug
      
      if (tenantSlug) {
        logger.debug('✅ Redirecting to tenant login:', `/${tenantSlug}`)
        await navigateTo(`/${tenantSlug}`)
      } else if (userData.value?.tenant_id === '64259d68-195a-4c68-8875-f1b44d962830') {
        // Fallback: Known Driving Team tenant
        logger.debug('✅ Redirecting to driving-team login')
        await navigateTo('/driving-team')
      } else {
        logger.debug('✅ Redirecting to general login')
        await navigateTo('/login')
      }
    }, 2000)

  } catch (err: any) {
    console.error('❌ Onboarding completion error:', err)
    console.error('❌ Error details:', err.stack)
    showErrorMessage(err.message || 'Fehler beim Abschliessen der Registrierung. Bitte versuche es später erneut oder kontaktiere die Fahrschule.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

