<!-- pages/tenant-register.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-2 sm:p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-2 sm:mx-0">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-8 rounded-t-xl text-center">
        <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Neue Firma registrieren</h1>
      </div>

      <!-- Progress Indicator -->
      <div class="px-4 sm:px-8 py-4 bg-gray-50">
        <div class="flex items-center justify-between">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="flex items-center flex-1 min-w-0"
          >
            <div 
              class="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors flex-shrink-0"
              :class="[
                index < currentStep ? 'bg-green-600 text-white' : 
                index === currentStep ? 'bg-blue-600 text-white' : 
                'bg-gray-300 text-gray-600'
              ]"
            >
              {{ index < currentStep ? '✓' : index + 1 }}
            </div>
            <span 
              class="ml-1 sm:ml-2 text-xs sm:text-sm font-medium truncate"
              :class="[
                index <= currentStep ? 'text-gray-900' : 'text-gray-500'
              ]"
            >
              <span class="hidden sm:inline">{{ step.title }}</span>
              <span class="hidden xs:inline sm:hidden">{{ step.title.split(' ')[0] }}</span>
            </span>
            <div 
              v-if="index < steps.length - 1" 
              class="w-4 sm:w-8 lg:w-16 h-0.5 mx-1 sm:mx-2 lg:mx-4 flex-shrink-0"
              :class="[
                index < currentStep ? 'bg-green-600' : 'bg-gray-300'
              ]"
            ></div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="submitRegistration" class="p-4 sm:p-6 lg:p-8">
        
        <!-- Step 1: Grunddaten -->
        <div v-if="currentStep === 0" class="space-y-6">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <!-- Fahrschul-Name -->
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Firmen-Name *
              </label>
              <input
                v-model="formData.name"
                type="text"
                required
                placeholder="z.B. Musterfirma"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- URL-Slug -->
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                URL-Kennung *
              </label>
              <div class="flex flex-col sm:flex-row sm:items-center">
                <span class="text-gray-500 text-xs sm:text-sm mb-1 sm:mb-0 sm:mr-2 flex-shrink-0">
                  <span class="hidden sm:inline">www.simy.ch/</span>
                  <span class="sm:hidden">URL: /</span>
                </span>
                <input
                  v-model="formData.slug"
                  type="text"
                  required
                  placeholder="mental-coaching"
                  pattern="[a-z0-9\-]+"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @input="sanitizeSlug; onSlugInput()"
                >
              </div>
              <p class="text-xs text-gray-500 mt-1">
                Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt
              </p>
            </div>

            <!-- Kontaktperson Vorname -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vorname *
              </label>
              <input
                v-model="formData.contact_person_first_name"
                type="text"
                required
                placeholder="Max"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- Kontaktperson Nachname -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nachname *
              </label>
              <input
                v-model="formData.contact_person_last_name"
                type="text"
                required
                placeholder="Mustermann"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- E-Mail -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail *
              </label>
              <input
                v-model="formData.contact_email"
                type="email"
                required
                placeholder="info@ihre-firma.ch"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- Telefon -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefon*
              </label>
              <input
                v-model="formData.contact_phone"
                type="tel"
                required
                placeholder="+41 44 123 45 67"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- Geburtsdatum (Admin / Kontaktperson) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum (Admin)
              </label>
              <input
                v-model="formData.admin_birthdate"
                type="date"
                placeholder="YYYY-MM-DD"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- Straße -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Strasse *
              </label>
              <input
                v-model="formData.street"
                type="text"
                required
                placeholder="Musterstrasse"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- Hausnummer -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nummer *
              </label>
              <input
                v-model="formData.streetNr"
                type="text"
                required
                placeholder="123"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- PLZ -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                PLZ *
              </label>
              <input
                v-model="formData.zip"
                type="text"
                required
                pattern="[0-9]{4}"
                placeholder="8000"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>

            <!-- Ort -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ort *
              </label>
              <input
                v-model="formData.city"
                type="text"
                required
                placeholder="Zürich"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
            </div>


            <!-- Geschäftstyp -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geschäftstyp
              </label>
              <select
                v-model="formData.business_type"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="driving_school">Fahrschule</option>
                <option value="mental_coach">Mental-Coaching</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 2: Branding -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">🎨 Design & Branding</h2>
            <p class="text-sm sm:text-base text-gray-600">Personalisieren Sie das Aussehen Ihrer WebApp.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <!-- Logo Upload -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Logo (optional)</h3>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <!-- Logo Preview -->
                <div v-if="logoPreview" class="mb-4">
                  <img 
                    :src="logoPreview" 
                    alt="Logo Preview"
                    class="h-20 w-auto mx-auto object-contain"
                  >
                </div>
                
                <!-- Upload Button -->
                <div class="relative inline-block">
                  <input
                    ref="logoInput"
                    type="file"
                    accept="image/*"
                    @change="handleLogoSelect"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button 
                    class="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    type="button"
                  >
                    {{ logoPreview ? '📝 Logo ändern' : '📁 Logo auswählen' }}
                  </button>
                </div>
                
                <p class="text-xs text-gray-500 mt-2">
                  JPG, PNG, max. 2MB
                </p>
                
                <!-- Remove Button -->
                <button 
                  v-if="logoPreview"
                  @click="removeLogo"
                  class="text-red-600 hover:text-red-800 text-sm mt-2 block mx-auto"
                  type="button"
                >
                  🗑️ Entfernen
                </button>
              </div>
            </div>

            <!-- Farben -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Farben</h3>
              
              <!-- Primary Color -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Hauptfarbe
                </label>
                <div class="flex items-center space-x-3">
                  <input
                    v-model="formData.primary_color"
                    type="color"
                    class="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  >
                  <input
                    v-model="formData.primary_color"
                    type="text"
                    placeholder="#3B82F6"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                </div>
              </div>

              <!-- Secondary Color -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Zweitfarbe
                </label>
                <div class="flex items-center space-x-3">
                  <input
                    v-model="formData.secondary_color"
                    type="color"
                    class="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  >
                  <input
                    v-model="formData.secondary_color"
                    type="text"
                    placeholder="#10B981"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                </div>
              </div>

              <!-- Color Preview -->
              <div class="mt-6">
                <p class="text-sm font-medium text-gray-700 mb-2">Vorschau:</p>
                <div class="space-y-2">
                  <div 
                    class="p-3 rounded-lg text-white text-center"
                    :style="{ backgroundColor: formData.primary_color }"
                  >
                    Hauptfarbe
                  </div>
                  <div 
                    class="p-3 rounded-lg text-white text-center"
                    :style="{ backgroundColor: formData.secondary_color }"
                  >
                    Zweitfarbe
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Admin-Daten -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">👤 Admin-Daten</h2>
            <p class="text-sm sm:text-base text-gray-600">Erstellen Sie das Admin-Konto für Ihren Zugang.</p>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700">Admin-Daten aus Firmen-Kontakt übernehmen</span>
              <!-- Toggle Switch -->
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="adminSameAsCompany"
                  @change="applyAdminFromCompany"
                  class="sr-only peer"
                >
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
              <input v-model="adminForm.first_name" type="text" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
              <input v-model="adminForm.last_name" type="text" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
              <input v-model="adminForm.email" type="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
              <input v-model="adminForm.phone" type="tel" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Geburtsdatum</label>
              <input v-model="adminForm.birthdate" type="date" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div></div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Passwort *</label>
              <input 
                v-model="adminForm.password" 
                type="password" 
                required 
                minlength="8" 
                :class="[
                  'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent',
                  adminForm.password && !passwordValid 
                    ? 'border-red-300 focus:ring-red-500' 
                    : adminForm.password && passwordValid 
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-blue-500'
                ]"
              >
              <p v-if="passwordError" class="text-xs text-red-600 mt-1">{{ passwordError }}</p>
              <p v-else-if="adminForm.password && passwordValid" class="text-xs text-green-600 mt-1">✓ Passwort erfüllt alle Anforderungen</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Passwort bestätigen *</label>
              <input 
                v-model="adminForm.passwordConfirm" 
                type="password" 
                required 
                minlength="8" 
                :class="[
                  'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent',
                  adminForm.passwordConfirm && passwordMismatch 
                    ? 'border-red-300 focus:ring-red-500' 
                    : adminForm.passwordConfirm && !passwordMismatch && passwordValid
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-blue-500'
                ]"
              >
              <p v-if="passwordMismatch" class="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein.</p>
              <p v-else-if="adminForm.passwordConfirm && !passwordMismatch && passwordValid" class="text-xs text-green-600 mt-1">✓ Passwörter stimmen überein</p>
            </div>
          </div>
        </div>

        <!-- Step 4: Bestätigung -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">✅ Bestätigung</h2>
            <p class="text-sm sm:text-base text-gray-600">Überprüfen Sie Ihre Angaben vor der Registrierung.</p>
          </div>

          <!-- Summary -->
          <div class="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Zusammenfassung</h3>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <!-- Grunddaten -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Grunddaten</h4>
                <div class="space-y-1 text-sm text-gray-600">
                  <p><strong>Name:</strong> {{ formData.name }}</p>
                  <p><strong>URL:</strong> www.simy.ch/{{ formData.slug }}</p>
                  <p><strong>Kontaktperson:</strong> {{ formData.contact_person_first_name }} {{ formData.contact_person_last_name }}</p>
                  <p><strong>E-Mail:</strong> {{ formData.contact_email }}</p>
                  <p><strong>Telefon:</strong> {{ formData.contact_phone }}</p>
                  <p><strong>Adresse:</strong> {{ formData.street }} {{ formData.streetNr }}, {{ formData.zip }} {{ formData.city }}</p>
                  <p v-if="createdCustomerNumber"><strong>Kundennummer:</strong> {{ createdCustomerNumber }}</p>
                </div>
              </div>

              <!-- Admin-Daten -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Admin-Account</h4>
                <div class="space-y-1 text-sm text-gray-600">
                  <p><strong>Name:</strong> {{ adminForm.first_name }} {{ adminForm.last_name }}</p>
                  <p><strong>E-Mail:</strong> {{ adminForm.email }}</p>
                  <p v-if="adminForm.phone"><strong>Telefon:</strong> {{ adminForm.phone }}</p>
                  <p v-if="adminForm.birthdate"><strong>Geburtsdatum:</strong> {{ new Date(adminForm.birthdate).toLocaleDateString('de-CH') }}</p>
                  <p><strong>Passwort:</strong> ••••••••</p>
                </div>
              </div>

              <!-- Branding -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Branding</h4>
                <div class="space-y-2">
                  <!-- Logo -->
                  <div v-if="logoPreview" class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Logo:</span>
                    <img :src="logoPreview" alt="Logo" class="h-8 w-auto">
                  </div>
                  
                  <!-- Farben -->
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Farben:</span>
                    <div 
                      class="w-6 h-6 rounded border"
                      :style="{ backgroundColor: formData.primary_color }"
                    ></div>
                    <div 
                      class="w-6 h-6 rounded border"
                      :style="{ backgroundColor: formData.secondary_color }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Terms -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label class="flex items-start space-x-3">
              <input
                v-model="acceptTerms"
                type="checkbox"
                required
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <span class="text-sm text-gray-700">
                Ich akzeptiere die <a href="#" class="text-blue-600 hover:underline">Nutzungsbedingungen</a> 
                und die <a href="#" class="text-blue-600 hover:underline">Datenschutzerklärung</a>.
              </span>
            </label>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="currentStep === 4" class="text-center py-8 sm:py-12">
          <div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Account wird erstellt...</h2>
          <p class="text-sm sm:text-base text-gray-600">Bitte warten Sie einen Moment.</p>
        </div>

        <!-- Success State -->
        <div v-if="currentStep === 5" class="text-center py-8 sm:py-12">
          <div class="text-4xl sm:text-6xl text-green-600 mb-6">✅</div>
          <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">Registrierung erfolgreich!</h2>
          <p class="text-sm sm:text-base text-gray-600 mb-6">
            Ihr Account für "{{ formData.name }}" wurde erfolgreich erstellt.
          </p>
          
          <div v-if="createdCustomerNumber" class="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6">
            <p class="text-blue-800 font-medium text-sm sm:text-base">Ihre Kundennummer: <span class="font-mono text-base sm:text-lg">{{ createdCustomerNumber }}</span></p>
            <p class="text-blue-600 text-xs sm:text-sm mt-1">Diese Nummer können Sie für Rechnungen und Support-Anfragen verwenden.</p>
          </div>
          
          <div class="space-y-4">
            <button
              @click="goToTenantPage"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto"
            >
              🚀 Zur {{ formData.name }}-Seite
            </button>
            
            <p class="text-xs sm:text-sm text-gray-500 break-all">
              Ihre URL: <code class="bg-gray-100 px-2 py-1 rounded text-xs">{{ tenantUrl }}</code>
            </p>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-6">
          <div class="flex items-center">
            <div class="text-red-600 mr-2">❌</div>
            <div>
              <h3 class="text-sm font-medium text-red-800">Fehler bei der Registrierung</h3>
              <p class="text-sm text-red-700 mt-1">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-6" v-if="currentStep < 4">
          <button
            v-if="currentStep > 0"
            @click="previousStep"
            class="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto order-2 sm:order-1"
          >
            ← Zurück
          </button>
          <div v-else class="order-2 sm:order-1"></div>

          <button
            v-if="currentStep < 3"
            @click="nextStep"
            :disabled="!canProceed"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto order-1 sm:order-2"
          >
            Weiter →
          </button>
          
          <button
            v-else-if="currentStep === 3"
            @click="submitRegistration"
            :disabled="!canSubmit"
            class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto order-1 sm:order-2"
          >
            Account erstellen
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { navigateTo } from '#app'

// Page Meta
definePageMeta({
  layout: false
})

// Form Data
const formData = ref({
  name: '',
  slug: '',
  contact_person_first_name: '',
  contact_person_last_name: '',
  contact_email: '',
  contact_phone: '',
  admin_birthdate: '',
  street: '',
  streetNr: '',
  zip: '',
  city: '',
  business_type: 'driving_school',
  primary_color: '#3B82F6',
  secondary_color: '#10B981'
})

// State
const currentStep = ref(0)
const acceptTerms = ref(false)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const error = ref<string | null>(null)
const createdTenantSlug = ref<string>('')
const createdCustomerNumber = ref<string>('')

// Steps Configuration
const steps = [
  { title: 'Grunddaten' },
  { title: 'Branding' },
  { title: 'Admin' },
  { title: 'Bestätigung' }
]

// Refs
const logoInput = ref<HTMLInputElement>()

// Computed
const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return formData.value.name && 
           formData.value.slug && 
           formData.value.contact_person_first_name && 
           formData.value.contact_person_last_name && 
           formData.value.contact_email && 
           formData.value.contact_phone && 
           formData.value.street && 
           formData.value.streetNr && 
           formData.value.zip && 
           formData.value.city
  } else if (currentStep.value === 2) {
    // Admin step validation
    return adminForm.value.first_name &&
           adminForm.value.last_name &&
           adminForm.value.email &&
           adminForm.value.password &&
           adminForm.value.passwordConfirm &&
           passwordValid.value &&
           !passwordMismatch.value
  }
  return true
})

const canSubmit = computed(() => {
  return acceptTerms.value && canProceed.value
})

const tenantUrl = computed(() => {
  if (!createdTenantSlug.value) return ''
  return `${window.location.origin}/auswahl?tenant=${createdTenantSlug.value}`
})

// Methods
const sanitizeSlug = () => {
  formData.value.slug = formData.value.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
}

const handleLogoSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // Validierung
  if (!file.type.startsWith('image/')) {
    alert('Nur Bilddateien sind erlaubt')
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    alert('Datei zu groß! Maximale Größe: 2MB')
    return
  }

  logoFile.value = file

  // Preview erstellen
  const reader = new FileReader()
  reader.onload = (e) => {
    logoPreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  if (logoInput.value) {
    logoInput.value.value = ''
  }
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Admin form state
const adminForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  birthdate: '',
  password: '',
  passwordConfirm: ''
})

const adminSameAsCompany = ref(false)

const passwordMismatch = computed(() => adminForm.value.password !== adminForm.value.passwordConfirm)

const passwordValid = computed(() => {
  const password = adminForm.value.password
  return password.length >= 8 && /\d/.test(password)
})

const passwordError = computed(() => {
  const password = adminForm.value.password
  if (!password) return ''
  if (password.length < 8) return 'Mindestens 8 Zeichen erforderlich'
  if (!/\d/.test(password)) return 'Mindestens eine Zahl erforderlich'
  return ''
})

const applyAdminFromCompany = () => {
  if (adminSameAsCompany.value) {
    // Daten übernehmen
    adminForm.value.first_name = formData.value.contact_person_first_name
    adminForm.value.last_name = formData.value.contact_person_last_name
    adminForm.value.email = formData.value.contact_email
    adminForm.value.phone = formData.value.contact_phone
    adminForm.value.birthdate = formData.value.admin_birthdate || ''
  } else {
    // Daten leeren
    adminForm.value.first_name = ''
    adminForm.value.last_name = ''
    adminForm.value.email = ''
    adminForm.value.phone = ''
    adminForm.value.birthdate = ''
  }
}

// Watch für Toggle-Änderungen
watch(() => adminSameAsCompany.value, () => {
  applyAdminFromCompany()
})

onMounted(() => {
  applyAdminFromCompany()
})

const submitRegistration = async () => {
  if (!canSubmit.value) {
    console.error('❌ Cannot submit: canSubmit is false')
    console.log('canProceed:', canProceed.value)
    console.log('acceptTerms:', acceptTerms.value)
    return
  }

  // Zusätzliche Validierung vor dem Senden
  if (!formData.value.name?.trim()) {
    error.value = 'Firmen-Name ist erforderlich'
    return
  }

  currentStep.value = 4 // Loading
  error.value = null

  try {
    // FormData für Multipart-Upload erstellen
    const formDataToSend = new FormData()
    
    // Grunddaten hinzufügen
    console.log('📝 Form data being sent:', formData.value)
    Object.entries(formData.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        const stringValue = value.toString().trim()
        if (stringValue !== '') {
          formDataToSend.append(key, stringValue)
          console.log(`📤 Added to FormData: ${key} = ${stringValue}`)
        } else {
          console.warn(`⚠️ Skipping empty field: ${key} = "${stringValue}"`)
        }
      } else {
        console.warn(`⚠️ Skipping null/undefined field: ${key} = ${value}`)
      }
    })
    
    // Logo-Datei hinzufügen (falls vorhanden)
    if (logoFile.value) {
      formDataToSend.append('logo_file', logoFile.value)
      console.log('📤 Added logo file to FormData')
    }
    
    // Debug: Alle FormData-Einträge ausgeben
    console.log('🔍 FormData contents:')
    for (const [key, value] of formDataToSend.entries()) {
      console.log(`  ${key}:`, value)
    }

    const response = await $fetch('/api/tenants/register', {
      method: 'POST',
      body: formDataToSend
    })

    if (response.success) {
      console.log('✅ Registration successful, response:', response)
      console.log('📊 Tenant data:', response.tenant)
      console.log('🔢 Customer number:', response.tenant.customer_number)
      createdTenantSlug.value = response.tenant.slug
      createdCustomerNumber.value = response.tenant.customer_number
      // Create admin user immediately
      try {
        const adminPayload = {
          email: adminForm.value.email,
          password: adminForm.value.password,
          role: 'admin',
          tenant_id: response.tenant.id,
          first_name: adminForm.value.first_name,
          last_name: adminForm.value.last_name,
          phone: adminForm.value.phone,
          birthdate: adminForm.value.birthdate
        }
        await $fetch('/api/admin/create-user', { method: 'POST', body: adminPayload })
      } catch (adminErr: any) {
        console.error('Admin creation failed:', adminErr)
        // Show but still allow success of tenant creation
        error.value = adminErr.statusMessage || adminErr.message || 'Admin-Erstellung fehlgeschlagen'
      }
      currentStep.value = 5 // Success
    } else {
      throw new Error(response.error || 'Unbekannter Fehler')
    }

  } catch (err: any) {
    console.error('Registration failed:', err)
    error.value = err.message || 'Registrierung fehlgeschlagen'
    currentStep.value = 2 // Zurück zur Bestätigung
  }
}

const goToTenantPage = () => {
  // Weiterleitung zur Admin-Registrierung mit vorausgefüllten Daten
  // Erfolgreiche Registrierung - keine Weiterleitung nötig
  console.log('✅ Tenant registration completed successfully')
}

// State to track if user manually edited slug
const userEditedSlug = ref(false)

// Auto-generate slug from name
watch(() => formData.value.name, (newName: string) => {
  if (newName && !userEditedSlug.value) {
    formData.value.slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
  }
})

// Track manual slug editing
const onSlugInput = () => {
  userEditedSlug.value = true
}

// Local Storage für Formulardaten
const STORAGE_KEY = 'tenant-registration-data'

// Daten speichern
const saveToStorage = () => {
  if (typeof window !== 'undefined') {
    const dataToSave = {
      formData: formData.value,
      adminForm: adminForm.value,
      adminSameAsCompany: adminSameAsCompany.value,
      currentStep: currentStep.value,
      userEditedSlug: userEditedSlug.value,
      logoPreview: logoPreview.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  }
}

// Daten laden
const loadFromStorage = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        formData.value = { ...formData.value, ...data.formData }
        adminForm.value = { ...adminForm.value, ...data.adminForm }
        adminSameAsCompany.value = data.adminSameAsCompany || false
        currentStep.value = data.currentStep || 0
        userEditedSlug.value = data.userEditedSlug || false
        logoPreview.value = data.logoPreview || null
        
        // Admin-Daten anwenden falls Toggle aktiv ist
        if (adminSameAsCompany.value) {
          applyAdminFromCompany()
        }
      } catch (error) {
        console.warn('Failed to load saved data:', error)
      }
    }
  }
}

// Daten löschen
const clearStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Watcher für automatisches Speichern
watch([formData, adminForm, adminSameAsCompany, currentStep], () => {
  saveToStorage()
}, { deep: true })

// Beim Mount laden
onMounted(() => {
  loadFromStorage()
  // Nur anwenden wenn Toggle aktiv ist (aus gespeicherten Daten)
  if (adminSameAsCompany.value) {
    applyAdminFromCompany()
  }
})

// Beim Erfolg löschen
watch(() => currentStep.value, (newStep) => {
  if (newStep === 5) { // Success step
    clearStorage()
  }
})
</script>