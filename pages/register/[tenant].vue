<!-- pages/[slug]/register.vue - Dynamic tenant registration page -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div v-if="!registrationComplete" class="bg-gray-100 text-white p-1 rounded-t-xl">
        <div class="text-center">
          <LoadingLogo size="2xl" :tenant-id="activeTenantId || undefined" :tenant-slug="tenantSlug" />
          <h1 class="text-xl font-bold text-gray-700 p-4">
            {{ isAdminRegistration ? 'Admin-Account erstellen' :
               serviceType === 'fahrlektion' ? 'Registrierung für Fahrlektionen' : 
               serviceType === 'theorie' ? 'Registrierung für Theorielektion' : 
               serviceType === 'beratung' ? 'Registrierung für Beratung' : 'Registrierung' }}
          </h1>
        </div>
      </div>
      
      <!-- Navigation Back -->
      <div v-if="!registrationComplete" class="px-6 py-3 bg-gray-50 border-b">
        <button
          @click="goBack"
          class="text-gray-600 hover:text-gray-800 flex items-center text-sm"
        >
          {{ isAdminRegistration ? '← Zurück zur Firmenregistrierung' : '← Zurück zur Auswahl' }}
        </button>
      </div>

      <!-- Progress Steps -->
      <div v-if="!registrationComplete" class="px-6 py-4 bg-gray-50 border-b">
        <div class="flex items-center justify-center space-x-4">
          <div :class="currentStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <div v-if="requiresLernfahrausweis" class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= 2" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div v-if="requiresLernfahrausweis" :class="currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <div class="h-1 w-12 bg-gray-300">
            <div v-if="currentStep >= maxSteps" class="h-full bg-green-500 transition-all duration-300"></div>
          </div>
          <div :class="currentStep >= maxSteps ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
               class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
            {{ requiresLernfahrausweis ? 3 : 2 }}
          </div>
        </div>
        <div class="flex justify-center text-center mt-2 text-xs text-gray-600" :class="requiresLernfahrausweis ? 'space-x-6' : 'space-x-12'">
          <span>Persönliche Daten</span>
          <span v-if="requiresLernfahrausweis">Lernfahrausweis</span>
          <span>Account</span>
        </div>
      </div>

      <!-- Step Content -->
      <div class="p-6">
        <!-- Registration Complete Screen -->
        <div v-if="registrationComplete" class="space-y-4 sm:space-y-6 text-center py-8 sm:py-12">
          <!-- Success Icon -->
          <div class="flex justify-center">
            <div class="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-9 h-9 sm:w-12 sm:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          
          <!-- Confirmation Message -->
          <div>
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Registrierung erfolgreich!</h2>
            <p class="text-gray-600 text-base sm:text-lg">Willkommen bei {{ currentTenant?.name || 'Simy' }}!</p>
          </div>
          
          <!-- Email Confirmation Required -->
          <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4 sm:p-6">
            <div class="flex items-start space-x-2 sm:space-x-3">
              <div class="flex-shrink-0 mt-1">
                <svg class="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="text-left min-w-0">
                <h3 class="text-base sm:text-lg font-semibold text-green-900 mb-2">Account aktiviert</h3>
                <p class="text-green-800 text-sm sm:text-base break-words">
                  Ihr Account ist sofort aktiv. Sie können sich jetzt mit Ihren Zugangsdaten einloggen.
                </p>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="space-y-3 pt-4 sm:pt-6">
            <button
              @click="navigateTo(registeredTenantSlug || tenantSlug ? `/${registeredTenantSlug || tenantSlug}` : '/login')"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
            >
              Zum Login
            </button>
          </div>
        </div>
        
        <!-- Form Steps - only show if not registration complete -->
        <!-- Step 1: Personal Data -->
        <div v-if="!registrationComplete && currentStep === 1" class="space-y-6">
          
          <!-- Admin Registration Header -->
          <div v-if="isAdminRegistration" class="text-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-900 mb-2">👤 Admin-Account erstellen</h2>
            <p class="text-gray-600">Erstellen Sie Ihren Administrator-Account für {{ tenantSlug }}</p>
            
            <!-- Pre-filled data notice -->
            <div v-if="prefilledData.first_name || prefilledData.last_name || prefilledData.email || prefilledData.phone" 
                 class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p class="text-blue-800 text-sm">
                <span class="font-medium">ℹ️ Vorausgefüllte Daten:</span> 
                Die Kontaktdaten aus der Firmenregistrierung wurden automatisch übernommen.
              </p>
              <p class="text-blue-700 text-xs mt-1">
                <span class="font-medium">📍 Adresse:</span> 
                Bitte geben Sie hier Ihre <strong>Privatadresse</strong> ein. Falls diese von der Firmenadresse abweicht, können Sie die Felder entsprechend anpassen.
              </p>
            </div>
          </div>

          <!-- Personal Information Form -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- First Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vorname *
              </label>
              <input
                v-model="formData.firstName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Max"
              />
            </div>

            <!-- Last Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nachname *
              </label>
              <input
                v-model="formData.lastName"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mustermann"
              />
            </div>

            <!-- Birth Date -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum *
              </label>
              <input
                v-model="formData.birthDate"
                type="date"
                required
                @blur="validateBirthDate"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-blue-500',
                  fieldErrors.birthDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                ]"
              />
              <p v-if="fieldErrors.birthDate" class="mt-1 text-sm text-red-600">{{ fieldErrors.birthDate }}</p>
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefon *
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                required
                @blur="normalizePhone"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-blue-500',
                  fieldErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                ]"
                placeholder="079 123 45 67"
              />
              <p v-if="fieldErrors.phone" class="mt-1 text-sm text-red-600">{{ fieldErrors.phone }}</p>
              <p v-else class="text-xs text-gray-500 mt-1">Format: +41791234567</p>
            </div>

            <!-- Email (for Admin Registration) -->
            <div v-if="isAdminRegistration">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                v-model="formData.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin@ihre-firma.ch"
              />
            </div>

            <!-- Street -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Strasse *
              </label>
              <input
                v-model="formData.street"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Musterstrasse"
              />
            </div>

            <!-- Street Number -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hausnummer *
              </label>
              <input
                v-model="formData.streetNr"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123"
              />
            </div>

            <!-- ZIP -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                PLZ *
              </label>
              <input
                v-model="formData.zip"
                type="text"
                required
                pattern="[0-9]{4}"
                @blur="validateZip"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-blue-500',
                  fieldErrors.zip ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                ]"
                placeholder="8000"
              />
              <p v-if="fieldErrors.zip" class="mt-1 text-sm text-red-600">{{ fieldErrors.zip }}</p>
            </div>

            <!-- City -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ort *
              </label>
              <input
                v-model="formData.city"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Zürich"
              />
            </div>
          </div>

          <!-- Categories (only for normal registration) -->
          <div v-if="!isAdminRegistration">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Führerschein-Kategorien *
            </label>
            <div class="space-y-3">
              <label v-for="category in availableCategories" :key="category.code" :for="`cat-${category.code}`" class="flex justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-3">
                    <span class="text-lg font-bold text-gray-800">{{ category.code }}</span>
                    <span class="text-sm text-gray-600">{{ category.name }}</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <div>CHF {{ category.price }}/45min</div>
                    <div v-if="category.adminFee && category.adminFee > 0" class="mt-1 text-[10px] whitespace-nowrap">+ CHF {{ category.adminFee }} Admin- und Versicherung (einmalig)</div>
                  </div>
                </div>
                <div class="relative inline-flex items-start ml-4 flex-shrink-0">
                  <input
                    :id="`cat-${category.code}`"
                    v-model="formData.categories"
                    :value="category.code"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 pointer-events-none"></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Step 2: Lernfahrausweis Upload (only for Fahrlektionen) -->
        <div v-if="!registrationComplete && currentStep === 2 && requiresLernfahrausweis" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">Ausweis hochladen</h2>
            <p class="text-gray-600 text-sm">Bitte laden Sie für jede Kategorie einen Ausweis hoch</p>
          </div>

          <!-- Upload per Category -->
          <div class="space-y-6">
            <div 
              v-for="category in formData.categories" 
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

              <!-- Upload Area -->
              <div 
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors cursor-pointer"
                @click="() => triggerCategoryUpload(category)"
              >
                <input
                  :ref="el => { if (el) categoryFileInputs[category] = el as HTMLInputElement }"
                  type="file"
                  accept="image/*,.pdf"
                  @change="(e) => handleCategoryFileUpload(e, category)"
                  class="hidden"
                  :capture="useCamera ? 'environment' : undefined"
                />
                
                <!-- Upload Prompt -->
                <div v-if="!uploadedDocuments[category]" class="text-center">
                  <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <p class="text-blue-600 font-medium mb-1">Klicken zum Hochladen</p>
                  <p class="text-xs text-gray-500">Foto aufnehmen oder aus Galerie wählen</p>
                  <p class="text-xs text-gray-400 mt-1">PNG, JPG oder PDF bis 5MB</p>
                </div>

                <!-- Uploaded Document Preview -->
                <div v-if="uploadedDocuments[category]" class="space-y-3">
                  <div class="text-center">
                    <!-- Image Preview -->
                    <img 
                      v-if="uploadedDocuments[category].type.startsWith('image/')"
                      :src="uploadedDocuments[category].data" 
                      :alt="`Ausweis ${category}`" 
                      class="max-w-full h-48 object-contain mx-auto rounded-lg shadow-md border border-gray-200"
                    >
                    <!-- PDF Preview -->
                    <div 
                      v-else 
                      class="max-w-sm mx-auto bg-green-50 rounded-lg shadow-md border-2 border-green-200 p-8"
                    >
                      <svg class="w-20 h-20 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p class="text-green-600 font-bold text-xl">PDF hochgeladen</p>
                    </div>
                  </div>
                  
                  <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p class="text-green-800 font-semibold text-sm text-center">✓ Ausweis hochgeladen</p>
                  </div>
                  
                  <!-- Change Button -->
                  <div class="flex justify-center">
                    <button
                      @click.stop="() => clearCategoryImage(category)"
                      class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      🔄 Anderes Bild wählen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Account & Registrierung (Step 2 for theory/consultation, Step 3 for driving lessons) -->
        <div v-if="!registrationComplete && ((currentStep === 2 && !requiresLernfahrausweis) || (currentStep === 3 && requiresLernfahrausweis))" class="space-y-6">
          <div class="text-center mb-6">
            <div class="text-4xl mb-2">🔐</div>
            <h3 class="text-xl font-semibold text-gray-900">Account erstellen</h3>
            <p class="text-gray-600">E-Mail und Passwort für Ihren Zugang</p>
          </div>

          <!-- WICHTIG: Form Element um die Passwort-Felder -->
          <form @submit.prevent="submitRegistration" class="space-y-4">
            <!-- E-Mail -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                v-model="formData.email"
                type="email"
                autocomplete="email"
                required
                @blur="validateEmail"
                :class="[
                  'w-full px-4 py-3 border rounded-lg focus:ring-2',
                  fieldErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                ]"
                placeholder="ihre.email@beispiel.ch"
              />
              <p v-if="fieldErrors.email" class="mt-1 text-sm text-red-600">{{ fieldErrors.email }}</p>
            </div>

            <!-- Passwort -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Passwort *
              </label>
              <div class="relative">
                <input
                  v-model="formData.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                  class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Sicheres Passwort wählen"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              
              <!-- Passwort-Validierung -->
              <div class="mt-2 space-y-1">
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.length ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.length ? '✓' : '○' }} Mindestens 12 Zeichen
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.uppercase ? '✓' : '○' }} Großbuchstabe
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.lowercase ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.lowercase ? '✓' : '○' }} Kleinbuchstabe
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.number ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.number ? '✓' : '○' }} Zahl
                  </span>
                </div>
              </div>
            </div>

            <!-- Passwort bestätigen -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Passwort bestätigen *
              </label>
              <input
                v-model="formData.confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Passwort wiederholen"
              />
              <p v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" 
                class="text-red-600 text-sm mt-1">
                Passwörter stimmen nicht überein
              </p>
            </div>

            <!-- Nutzungsbedingungen -->
            <div class="flex items-start space-x-3">
              <input
                v-model="formData.acceptTerms"
                type="checkbox"
                id="terms"
                required
                class="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label for="terms" class="text-sm text-gray-700">
                Ich akzeptiere die 
                <button
                  type="button"
                  @click.prevent="openRegulationModal('nutzungsbedingungen')"
                  class="text-green-600 hover:text-green-800 underline cursor-pointer"
                >
                  Nutzungsbedingungen
                </button> 
                und die 
                <button
                  type="button"
                  @click.prevent="openRegulationModal('datenschutz')"
                  class="text-green-600 hover:text-green-800 underline cursor-pointer"
                >
                  Datenschutzerklärung
                </button>
              </label>
            </div>

            <!-- hCaptcha - only show if required -->
            <div v-if="requiresCaptcha" class="flex flex-col items-center">
              <div
                id="hcaptcha"
                :class="{ 'ring-2 ring-red-500 rounded': captchaError }"
              ></div>
              <p v-if="captchaError" class="text-sm text-red-600 mt-2 text-center">
                Bitte bestätigen Sie, dass Sie kein Roboter sind
              </p>
              <p class="text-xs text-gray-500 mt-2 text-center">
                Sicherheitsüberprüfung erforderlich (mehrere Registrierungen erkannt)
              </p>
            </div>
          </form>
        </div>
      </div>

      <!-- Navigation -->
      <div v-if="!registrationComplete" class="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between">
        <button
          v-if="currentStep > 1"
          @click="prevStep"
          class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          ← Zurück
        </button>
        <div v-else></div>

        <button
          v-if="currentStep < maxSteps"
          @click="nextStep"
          :disabled="!canProceed"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Weiter →
        </button>
        
        <button
          v-if="currentStep === maxSteps"
          @click="submitRegistration"
          :disabled="!canSubmit || isSubmitting"
          class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <span v-if="isSubmitting">⏳ Registrierung...</span>
          <span v-else>✅ Registrieren</span>
        </button>
      </div>

      <!-- Login Link -->
      <div v-if="!registrationComplete" class="px-6 py-3 text-center border-t">
        <p class="text-gray-600 text-sm">
          Bereits registriert?
          <button 
            @click="navigateTo(tenantSlug ? `/${tenantSlug}` : '/login')"
            class="text-blue-600 hover:text-blue-800 font-semibold ml-1"
          >
            Hier anmelden
          </button>
        </p>
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
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo, useRoute, useRouter, useRuntimeConfig, useHead } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useTenant } from '~/composables/useTenant'

// Load hCaptcha script - ensure it loads immediately
if (typeof window !== 'undefined') {
  useHead({
    script: [
      {
        src: 'https://js.hcaptcha.com/1/api.js',
        async: true,
        defer: false
      }
    ]
  })
}

const supabase = getSupabase()
const route = useRoute()
const router = useRouter()
const { showError, showSuccess } = useUIStore()
const { public: publicConfig } = useRuntimeConfig()
const hcaptchaSiteKey = computed(() => publicConfig.hcaptchaSiteKey)
const hcaptchaWidgetId = ref<number | null>(null)

// Get tenant slug from URL parameter
const tenantSlug = computed(() => route.params.tenant as string)

// Tenant Management
const { loadTenant, tenantId, currentTenant } = useTenant()

// Get service type from URL parameter
const serviceType = ref(route.query.service as string || 'fahrlektion')

// Get role from URL parameter (for admin registration)
const roleParam = ref(route.query.role as string || 'client')

// Get pre-filled data from URL parameters (for admin registration)
const prefilledData = ref({
  first_name: route.query.first_name as string || '',
  last_name: route.query.last_name as string || '',
  email: route.query.email as string || '',
  phone: route.query.phone as string || ''
})

// State
const currentStep = ref(1)
const isSubmitting = ref(false)
const captchaError = ref(false) // Track captcha errors
const requiresCaptcha = ref(false) // Adaptive captcha flag
const uploadedImage = ref<string | null>(null)
const uploadedFileType = ref<string | null>(null)
// Camera toggle state
const useCamera = ref(false)
// Multiple documents per category
interface DocumentInfo {
  data: string
  type: string
  fileName: string
}
const uploadedDocuments = ref<Record<string, DocumentInfo>>({})
const showPassword = ref(false)
const showRegulationModal = ref(false)
const currentRegulation = ref<any>(null)
const registrationComplete = ref(false)
const registeredEmail = ref<string>('')
const registeredTenantSlug = ref<string>('')

// Refs
const fileInput = ref<HTMLInputElement>()
const categoryFileInputs = ref<Record<string, HTMLInputElement>>({})

// LocalStorage key for form data
const FORM_DATA_KEY = 'register_form_data'

// Form data
const formData = ref({
  // Personal data
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  street: '',
  streetNr: '',
  zip: '',
  city: '',
  categories: [] as string[],
  lernfahrausweisNr: '',
  
  // Account data
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

// Category type definition
interface Category {
  code: string
  name: string
  price: number
  adminFee?: number
}

// Available categories
const availableCategories = ref<Category[]>([
  { code: 'B', name: 'Auto', price: 95, adminFee: 0 },
  { code: 'A', name: 'Motorrad', price: 95, adminFee: 0 },
  { code: 'BE', name: 'Auto + Anhänger', price: 120, adminFee: 0 },
  { code: 'C', name: 'LKW', price: 170, adminFee: 0 },
  { code: 'CE', name: 'LKW + Anhänger', price: 200, adminFee: 0 },
  { code: 'D', name: 'Bus', price: 200, adminFee: 0 },
  { code: 'BPT', name: 'Berufspersonentransport', price: 100, adminFee: 0 }
])

// Computed
const isAdminRegistration = computed(() => {
  return roleParam.value === 'admin'
})

const activeTenantId = computed(() => {
  return tenantId.value || currentTenant.value?.id || null
})

const requiresLernfahrausweis = computed(() => {
  return serviceType.value === 'fahrlektion' && !isAdminRegistration.value
})

const maxSteps = computed(() => {
  if (isAdminRegistration.value) {
    return 2 // Admin: Personal data + Account
  }
  return requiresLernfahrausweis.value ? 3 : 2
})

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    if (isAdminRegistration.value) {
      // Admin registration: basic info + address required
      return formData.value.firstName && formData.value.lastName && 
             formData.value.phone && formData.value.email &&
             formData.value.street && formData.value.streetNr && 
             formData.value.zip && formData.value.city
    }
    // Normal registration: all fields required
    return formData.value.firstName && formData.value.lastName && 
           formData.value.birthDate && formData.value.phone && 
           formData.value.street && formData.value.streetNr && 
           formData.value.zip && formData.value.city && 
           formData.value.categories.length > 0
  }
  if (currentStep.value === 2 && requiresLernfahrausweis.value) {
    // All selected categories must have an uploaded document
    return formData.value.categories.every(cat => uploadedDocuments.value[cat])
  }
  return true
})

const canSubmit = computed(() => {
  return formData.value.email && 
         formData.value.password && 
         formData.value.confirmPassword === formData.value.password && 
         formData.value.acceptTerms && 
         passwordIsValid.value
})

const passwordChecks = computed(() => ({
  length: formData.value.password.length >= 12,
  uppercase: /[A-Z]/.test(formData.value.password),
  lowercase: /[a-z]/.test(formData.value.password),
  number: /[0-9]/.test(formData.value.password)
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length && 
         passwordChecks.value.uppercase && 
         passwordChecks.value.lowercase &&
         passwordChecks.value.number
})

// Field-specific errors
const fieldErrors = ref<Record<string, string>>({
  email: '',
  phone: '',
  birthDate: '',
  firstName: '',
  lastName: '',
  zip: ''
})

// Validation functions
const validateEmail = () => {
  if (!formData.value.email) {
    fieldErrors.value.email = ''
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.value.email)) {
    fieldErrors.value.email = 'Ungültige E-Mail-Adresse'
  } else {
    fieldErrors.value.email = ''
  }
}

const validatePhone = () => {
  if (!formData.value.phone) {
    fieldErrors.value.phone = ''
    return
  }
  
  const phoneRegex = /^\+41[0-9]{9}$/
  if (!phoneRegex.test(formData.value.phone.replace(/\s/g, ''))) {
    fieldErrors.value.phone = 'Format: +41791234567'
  } else {
    fieldErrors.value.phone = ''
  }
}

const validateBirthDate = () => {
  if (!formData.value.birthDate) {
    fieldErrors.value.birthDate = ''
    return
  }
  
  const birthDate = new Date(formData.value.birthDate)
  const today = new Date()
  
  if (birthDate > today) {
    fieldErrors.value.birthDate = 'Geburtsdatum darf nicht in der Zukunft liegen'
    return
  }
  
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  const dayDiff = today.getDate() - birthDate.getDate()
  const actualAge = age - (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? 1 : 0)
  
  if (actualAge < 16) {
    fieldErrors.value.birthDate = 'Mindestalter: 16 Jahre'
  } else {
    fieldErrors.value.birthDate = ''
  }
}

const validateZip = () => {
  if (!formData.value.zip) {
    fieldErrors.value.zip = ''
    return
  }
  
  if (!/^[0-9]{4}$/.test(formData.value.zip)) {
    fieldErrors.value.zip = 'PLZ muss 4 Ziffern haben (z.B. 8000)'
  } else {
    fieldErrors.value.zip = ''
  }
}

// Methods
const normalizePhone = () => {
  let phone = formData.value.phone.replace(/[^0-9+]/g, '')
  
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '+41' + phone.substring(1)
  } else if (phone.startsWith('41') && phone.length === 11) {
    phone = '+' + phone
  }
  
  formData.value.phone = phone
  validatePhone()
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < maxSteps.value) {
    if (isAdminRegistration.value) {
      // Admin registration: go directly to account step
      currentStep.value = 2
    } else if (currentStep.value === 1 && !requiresLernfahrausweis.value) {
      // Skip step 2 (Lernfahrausweis) for theory and consultation
      currentStep.value = 2 // This becomes the account step
    } else {
      currentStep.value++
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    if (isAdminRegistration.value) {
      // Admin registration: go back to step 1
      currentStep.value = 1
    } else if (currentStep.value === 2 && !requiresLernfahrausweis.value) {
      // Skip step 2 (Lernfahrausweis) when going back
      currentStep.value = 1
    } else {
      currentStep.value--
    }
  }
}

const goBack = () => {
  router.back()
}

// File upload (legacy - keeping for backward compatibility)
const handleFileUpload = (event: Event) => {
  logger.debug('📤 File upload started')
  const file = (event.target as HTMLInputElement).files?.[0]
  logger.debug('📄 File selected:', file?.name, 'Size:', file?.size, 'Type:', file?.type)
  
  if (file) {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large:', file.size, 'bytes')
      showError(
        'Datei zu groß', 
        `Die gewählte Datei ist ${(file.size / (1024 * 1024)).toFixed(2)} MB groß. Maximale Größe: 5 MB. Bitte komprimieren Sie das Bild oder wählen Sie eine kleinere Datei.`
      )
      // Clear the file input to prevent accidental submission
      if (fileInput.value) {
        fileInput.value.value = ''
      }
      return
    }
    
    // Store file type
    uploadedFileType.value = file.type
    
    const reader = new FileReader()
    reader.onload = (e) => {
      logger.debug('✅ File read complete, setting uploadedImage')
      uploadedImage.value = e.target?.result as string
      logger.debug('✅ uploadedImage.value set, length:', uploadedImage.value?.length)
    }
    reader.readAsDataURL(file)
  }
}

// Trigger file input for specific category
const triggerCategoryUpload = (category: string) => {
  const input = categoryFileInputs.value[category]
  if (input) {
    input.click()
  } else {
    console.warn('⚠️ File input not found for category:', category)
  }
}

// Handle file upload for specific category
const handleCategoryFileUpload = (event: Event, category: string) => {
  logger.debug('📤 Category file upload started for:', category)
  const file = (event.target as HTMLInputElement).files?.[0]
  const input = categoryFileInputs.value[category]
  
  if (!file) return
  
  logger.debug('📄 File selected:', file?.name, 'Size:', file?.size, 'Type:', file?.type)
  
  // ✅ Check file type (JPG, PNG, PDF only)
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    console.error('❌ Invalid file type:', file.type)
    showError(
      'Ungültiger Dateityp',
      `Nur JPG, PNG und PDF-Dateien sind erlaubt. Ihre Datei ist vom Typ: ${file.type || 'unbekannt'}`
    )
    if (input) input.value = ''
    return
  }
  
  // ✅ Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    console.error('❌ File too large:', file.size, 'bytes')
    showError(
      'Datei zu groß',
      `Die gewählte Datei ist ${(file.size / (1024 * 1024)).toFixed(2)} MB groß. Maximale Größe: 5 MB. Bitte komprimieren Sie das Bild oder wählen Sie eine kleinere Datei.`
    )
    if (input) input.value = ''
    return
  }
  
  const reader = new FileReader()
  
  // ✅ Error handling for FileReader
  reader.onerror = (error) => {
    console.error('❌ FileReader error for category:', category, error)
    showError(
      'Lesefehler',
      'Die Datei konnte nicht gelesen werden. Bitte versuchen Sie eine andere Datei oder ein anderes Format.'
    )
    if (input) input.value = ''
  }
  
  reader.onload = (e) => {
    try {
      const result = e.target?.result as string
      if (!result) {
        throw new Error('Leere Datei')
      }
      
      logger.debug('✅ File read complete for category:', category)
      uploadedDocuments.value[category] = {
        data: result,
        type: file.type,
        fileName: file.name
      }
      logger.debug('✅ uploadedDocuments updated:', Object.keys(uploadedDocuments.value))
    } catch (err: any) {
      console.error('❌ Error processing file:', err)
      showError(
        'Fehler beim Verarbeiten',
        'Die Datei konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.'
      )
      if (input) input.value = ''
    }
  }
  
  reader.readAsDataURL(file)
}

// Clear image for specific category
const clearCategoryImage = (category: string) => {
  delete uploadedDocuments.value[category]
  const input = categoryFileInputs.value[category]
  if (input) {
    input.value = ''
  }
}

const clearImage = () => {
  uploadedImage.value = null
  uploadedFileType.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isSubmitting.value = true
  captchaError.value = false // Reset captcha error
  
  try {
    // Debug: Check if hCaptcha element and script exist
    const hcaptchaElement = document.getElementById('hcaptcha')
    logger.debug('🔍 hCaptcha element exists:', !!hcaptchaElement)
    logger.debug('🔍 window.hcaptcha exists:', !!(window as any).hcaptcha)
    logger.debug('🔍 Requires captcha:', requiresCaptcha.value)
    
    // Get hCaptcha token - only if captcha is required
    let captchaToken: string | null = null
    
    if (requiresCaptcha.value) {
      // Try to get token with retries
      const widgetId = hcaptchaWidgetId.value
      logger.debug('🔍 Using hCaptcha widget ID:', widgetId)
      
      for (let attempt = 0; attempt < 10; attempt++) {
        logger.debug(`🔄 Attempt ${attempt + 1}: checking for hcaptcha.getResponse`)
        
        if ((window as any).hcaptcha?.getResponse) {
          try {
            // Try to get response using widget ID
            let response: string
            if (widgetId !== null) {
              response = (window as any).hcaptcha.getResponse(widgetId)
            } else {
              // Fallback to container ID if widget ID not available
              response = (window as any).hcaptcha.getResponse('hcaptcha')
            }
            logger.debug(`✅ Got captcha response on attempt ${attempt + 1}:`, !!response, 'First 20 chars:', response?.substring(0, 20))
            
            // If we got a token, use it
            if (response && typeof response === 'string' && response.length > 0) {
              captchaToken = response
              break
            } else if (attempt === 0) {
              logger.debug('ℹ️ hCaptcha response is empty - user might not have completed the challenge yet')
            }
          } catch (error: any) {
            logger.debug(`⚠️ Error calling getResponse on attempt ${attempt + 1}:`, error?.message || error?.cause || error)
            if (attempt === 0) {
              logger.debug('🔍 Full error object:', error)
            }
          }
        } else {
          logger.debug(`❌ hcaptcha.getResponse not available on attempt ${attempt + 1}`)
        }
        
        // Wait 200ms before retrying
        if (attempt < 9 && !captchaToken) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      if (!captchaToken) {
        console.error('❌ Failed to get hCaptcha token after retries')
        console.error('❌ window.hcaptcha:', (window as any).hcaptcha)
        console.error('❌ hcaptcha element:', hcaptchaElement)
        throw new Error('Bitte führen Sie die Captcha-Verifikation durch')
      }
      
      logger.debug('✅ hCaptcha token received')
    } else {
      logger.debug('ℹ️ Captcha not required for this registration')
    }
    
    logger.debug('🚀 Starting registration via backend API...')
    
    // Load tenant by slug
    await loadTenant(tenantSlug.value)
    
    let activeTenantId = tenantId.value || currentTenant.value?.id
    
    if (!activeTenantId) {
      throw new Error('Fehler beim Laden der Mandanten-Daten. Bitte kontaktieren Sie den Support.')
    }
    
    logger.debug('🏢 Registering user for tenant:', activeTenantId)
    
    // Call backend API to register client (creates auth user + profile via service role)
    logger.debug('📡 Calling backend registration API...')
    const response = await fetch('/api/auth/register-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: formData.value.firstName.trim(),
        lastName: formData.value.lastName.trim(),
        email: formData.value.email.trim().toLowerCase(),
        password: formData.value.password,
        phone: formData.value.phone?.trim() || null,
        birthDate: formData.value.birthDate || null,
        street: formData.value.street?.trim() || null,
        streetNr: formData.value.streetNr?.trim() || null,
        zip: formData.value.zip?.trim() || null,
        city: formData.value.city?.trim() || null,
        categories: formData.value.categories || null,
        lernfahrausweisNr: formData.value.lernfahrausweisNr?.trim() || null,
        tenantId: activeTenantId,
        isAdmin: isAdminRegistration.value,
        captchaToken: captchaToken
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.statusMessage || 'Fehler bei der Registrierung')
    }
    
    logger.debug('✅ User registered successfully:', data.userId)
    
    // Upload Lernfahrausweis documents to Supabase Storage (one per category)
    if (Object.keys(uploadedDocuments.value).length > 0 && data.userId) {
      logger.debug('📸 Uploading documents for categories:', Object.keys(uploadedDocuments.value))
      
      const uploadErrors: string[] = []
      
      for (const [category, docInfo] of Object.entries(uploadedDocuments.value)) {
        try {
          // Determine file extension based on type
          const fileExt = docInfo.type.includes('pdf') ? 'pdf' : 'jpg'
          const fileName = `lernfahrausweis_${category}.${fileExt}`
          
          logger.debug(`📤 Uploading document for category ${category}...`)
          
          // Upload via backend API (uses service role to bypass RLS)
          const uploadResponse = await $fetch('/api/auth/upload-document', {
            method: 'POST',
            body: {
              userId: data.userId,
              tenantId: activeTenantId.value,
              fileData: docInfo.data,
              fileName: fileName,
              bucket: 'user-documents',
              path: category, // Category becomes the document type identifier
              category: category
            }
          }) as any
          
          logger.debug(`✅ Document for category ${category} uploaded successfully:`, uploadResponse.path)
        } catch (imageError: any) {
          console.error(`❌ Document upload failed for category ${category}:`, imageError)
          
          // Extract meaningful error message
          let errorMsg = `Kategorie ${category}: `
          if (imageError.data?.statusMessage?.includes('exceeded the maximum allowed size')) {
            errorMsg += 'Datei zu groß (max. 5MB)'
          } else if (imageError.statusMessage) {
            errorMsg += imageError.statusMessage
          } else {
            errorMsg += 'Upload fehlgeschlagen'
          }
          uploadErrors.push(errorMsg)
        }
      }
      
      // If any uploads failed, show error and stop registration
      if (uploadErrors.length > 0) {
        throw new Error('Dokument-Upload fehlgeschlagen:\n' + uploadErrors.join('\n'))
      }
    }
    
    // Success - Show confirmation screen
    registeredEmail.value = formData.value.email
    registeredTenantSlug.value = tenantSlug.value
    registrationComplete.value = true
    logger.debug('✅ Registration complete, showing confirmation screen')
    
    // No auto-redirect - user clicks button to proceed
    
  } catch (error: any) {
    console.error('❌ Registration failed:', error)
    
    let errorMessage = error.message || 'Unbekannter Fehler bei der Registrierung'
    let errorTitle = 'Registrierung fehlgeschlagen'
    
    // Spezifische Fehlermeldungen
    if (errorMessage.includes('duplicate key') || errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
      errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere E-Mail-Adresse oder loggen Sie sich ein.'
    } else if (errorMessage.includes('Invalid email')) {
      errorMessage = 'Ungültige E-Mail-Adresse. Bitte prüfen Sie Ihre Eingabe.'
    } else if (errorMessage.includes('Password') || errorMessage.includes('weak password')) {
      errorMessage = 'Passwort zu schwach. Mindestens 12 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe und 1 Zahl erforderlich.'
    } else if (errorMessage.includes('Captcha') || errorMessage.includes('captcha') || errorMessage.includes('hCaptcha')) {
      errorTitle = 'Captcha-Verifizierung fehlgeschlagen'
      errorMessage = 'Die Captcha-Verifizierung ist fehlgeschlagen. Bitte versuchen Sie es erneut und stellen Sie sicher, dass Sie das Captcha korrekt ausgefüllt haben.'
      captchaError.value = true // Highlight captcha field
    } else if (errorMessage.includes('Dokument-Upload')) {
      errorTitle = 'Dokument-Upload fehlgeschlagen'
      // errorMessage bleibt wie es ist (enthält bereits Details)
    } else if (errorMessage.includes('exceeded the maximum allowed size')) {
      errorTitle = 'Datei zu groß'
      errorMessage = 'Die hochgeladene Datei überschreitet die maximale Größe von 5 MB. Bitte komprimieren Sie das Bild oder wählen Sie eine kleinere Datei.'
    } else if (errorMessage.includes('logger is not defined') || errorMessage.includes('ReferenceError')) {
      errorTitle = 'Technischer Fehler'
      errorMessage = 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es in wenigen Minuten erneut oder kontaktieren Sie den Support.'
    } else if (error.statusCode === 429) {
      errorTitle = 'Zu viele Versuche'
      errorMessage = 'Sie haben zu viele Registrierungsversuche unternommen. Bitte warten Sie einige Minuten und versuchen Sie es erneut.'
    } else if (error.statusCode === 500) {
      errorTitle = 'Server-Fehler'
      errorMessage = 'Ein Server-Fehler ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
    }
    
    showError(errorTitle, errorMessage)
    
  } finally {
    isSubmitting.value = false
  }
}

// Load categories from database WITH PRICING RULES
const loadCategories = async () => {
  try {
    const activeTenantId = tenantId.value || currentTenant.value?.id
    
    logger.debug('🏢 Loading categories for tenant:', activeTenantId || 'fallback')
    
    let categories, categoriesError
    
    if (activeTenantId) {
      // Load tenant-specific categories first
      const { data: tenantCategories, error: tenantError } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', activeTenantId)
        .eq('is_active', true)
        .order('code')
      
      categories = tenantCategories
      categoriesError = tenantError
      
      logger.debug('🏢 Loaded tenant-specific categories:', categories?.length || 0)
    } else {
      // Fallback: Load global categories (tenant_id = null)
      const { data: globalCategories, error: globalError } = await supabase
        .from('categories')
        .select('*')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('code')
      
      categories = globalCategories
      categoriesError = globalError
      
      logger.debug('🌐 Loaded global categories:', categories?.length || 0)
    }
    
    // Use fallback only if DB loading failed
    let finalCategories
    if (categoriesError || !categories || categories.length === 0) {
      console.warn('⚠️ Could not load categories from DB, using fallback:', categoriesError?.message || 'No categories found')
      finalCategories = availableCategories.value
    } else {
      logger.debug('✅ Loaded categories from DB:', categories.length)
      
      // Load base_price and admin_fee pricing rules for categories
      let pricingRules = null
      let adminFeeRules = null
      logger.debug('🔍 Loading pricing rules for tenant:', activeTenantId)
      
      // Load base_price rules
      const { data: rules, error: rulesError } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('rule_type', 'base_price')
        .eq('tenant_id', activeTenantId)
        .eq('is_active', true)
      
      if (rulesError) {
        console.error('❌ Error loading pricing rules:', rulesError)
      }
      
      if (!rulesError && rules && rules.length > 0) {
        pricingRules = rules
        logger.debug('✅ Loaded base_price rules:', rules.length, 'rules')
      } else {
        logger.debug('ℹ️ No base_price rules found for tenant', activeTenantId)
      }
      
      // Load admin_fee rules
      const { data: adminFees, error: adminFeeError } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('rule_type', 'admin_fee')
        .eq('tenant_id', activeTenantId)
        .eq('is_active', true)
      
      if (!adminFeeError && adminFees && adminFees.length > 0) {
        adminFeeRules = adminFees
        logger.debug('✅ Loaded admin_fee rules:', adminFees.length, 'rules')
      }
      
      // Map categories with their prices
      finalCategories = categories.map(cat => {
        let price = cat.price_per_lesson || 95 // Default fallback
        let adminFee = 0
        
        // Override with pricing rule if available
        if (pricingRules) {
          const rule = pricingRules.find(r => r.category_code === cat.code)
          if (rule && rule.price_per_minute_rappen) {
            // Calculate price: (Rappen/minute / 100) * minutes = CHF
            // IMPORTANT: Base price is ALWAYS calculated for 45 minutes (standard lesson duration)
            const pricePerMinuteChf = rule.price_per_minute_rappen / 100
            const baseDurationMinutes = 45 // ALWAYS 45 minutes for base price
            price = Math.round(pricePerMinuteChf * baseDurationMinutes)
            logger.debug(`💰 Category ${cat.code}: ${price} CHF (from base_price rule)`)
          }
        }
        
        // Load admin fee for this category
        if (adminFeeRules) {
          const adminFeeRule = adminFeeRules.find(r => r.category_code === cat.code)
          if (adminFeeRule && adminFeeRule.admin_fee_rappen) {
            adminFee = Math.round(adminFeeRule.admin_fee_rappen / 100)
            logger.debug(`💳 Category ${cat.code}: Admin Fee ${adminFee} CHF (one-time)`)
          }
        }
        
        return {
          code: cat.code || cat.name,
          name: cat.description || cat.name,
          price: price,
          adminFee: adminFee
        }
      })
    }
    
    availableCategories.value = finalCategories
    logger.debug('✅ Final available categories:', availableCategories.value)
  } catch (error) {
    console.error('Error loading categories:', error)
  }
}

// Load and display regulations
const openRegulationModal = async (type: string) => {
  try {
    const activeTenantId = tenantId.value || currentTenant.value?.id
    
    logger.debug('📋 Loading regulation:', type, 'for tenant:', activeTenantId)
    
    // Try to load tenant-specific reglement first, then fall back to global
    const { data: regulations, error } = await supabase
      .from('tenant_reglements')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .or(`tenant_id.eq.${activeTenantId},tenant_id.is.null`)
      .order('tenant_id', { ascending: false })
    
    if (error) {
      console.error('❌ Error loading reglement:', error)
      return
    }
    
    if (regulations && regulations.length > 0) {
      currentRegulation.value = regulations[0]
      showRegulationModal.value = true
      logger.debug('✅ Opened reglement modal:', type, regulations[0].title)
    } else {
      console.warn('⚠️ Reglement not found:', type)
    }
  } catch (err) {
    console.error('Error opening reglement modal:', err)
  }
}

// Initialize
onMounted(async () => {
  // Check registration risk first
  try {
    const riskCheck = await $fetch('/api/auth/check-registration-risk', {
      method: 'POST'
    }) as any
    
    requiresCaptcha.value = riskCheck.requiresCaptcha || false
    logger.debug('🔍 Registration risk check:', riskCheck)
    
    if (requiresCaptcha.value) {
      logger.debug('⚠️ Multiple registrations detected from this IP - captcha required')
    } else {
      logger.debug('✅ First registration from this IP - no captcha needed')
    }
  } catch (err) {
    logger.warn('⚠️ Risk check failed, defaulting to require captcha:', err)
    requiresCaptcha.value = true // On error, require captcha to be safe
  }
  
  // Restore form data from localStorage if available
  if (process.client) {
    const savedData = localStorage.getItem(FORM_DATA_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        logger.debug('📦 Restoring form data from cache')
        Object.assign(formData.value, parsed)
        if (parsed.uploadedImage) {
          uploadedImage.value = parsed.uploadedImage
        }
      } catch (e) {
        console.error('Error parsing saved form data:', e)
      }
    }
  }
  
  // Pre-fill form data for admin registration (overrides saved data)
  if (roleParam.value === 'admin') {
    formData.value.firstName = prefilledData.value.first_name || ''
    formData.value.lastName = prefilledData.value.last_name || ''
    formData.value.email = prefilledData.value.email || ''
    formData.value.phone = prefilledData.value.phone || ''
  }
  
  // Load tenant if tenant slug is provided
  if (tenantSlug.value) {
    logger.debug('🏢 Loading tenant from URL parameter:', tenantSlug.value)
    try {
      await loadTenant(tenantSlug.value)
    } catch (error) {
      console.warn('⚠️ Failed to load tenant, but continuing with slug:', error)
      // Don't redirect - just continue with the slug
      // The form will work without tenant data
    }
  }
  
  // Skip tenant verification for now - allow registration without tenant data
  // if (!isAdminRegistration.value && !activeTenantId.value) {
  //   console.error('❌ No tenant loaded for customer registration, redirecting to tenant selection')
  //   alert('Bitte wählen Sie zuerst einen Anbieter aus.')
  //   await navigateTo('/auswahl')
  //   return
  // }
  
  loadCategories()
})

// Watch for service type changes and reload categories
watch(serviceType, (newValue, oldValue) => {
  if (oldValue !== undefined && newValue !== oldValue) {
    logger.debug('🔄 Service type changed from', oldValue, 'to', newValue, '- reloading categories')
    loadCategories()
  }
})

// Watch for step changes and render hCaptcha when on last step AND captcha is required
watch(currentStep, async (newStep) => {
  if (newStep === maxSteps.value && requiresCaptcha.value) {
    logger.debug('📍 Reached final step with captcha required, rendering hCaptcha...')
    
    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if ((window as any).hcaptcha) {
      const hcaptchaContainer = document.getElementById('hcaptcha')
      logger.debug('🔍 hCaptcha container found:', !!hcaptchaContainer)
      
      if (hcaptchaContainer && hcaptchaContainer.children.length === 0) {
        try {
          const siteKey = hcaptchaSiteKey.value
          const keyPreview = typeof siteKey === 'string' ? siteKey.substring(0, 10) : siteKey
          logger.debug('🎨 Rendering hCaptcha widget with sitekey:', keyPreview)
          const widgetId = (window as any).hcaptcha.render('hcaptcha', {
            sitekey: siteKey,
            theme: 'light'
          })
          hcaptchaWidgetId.value = widgetId
          logger.debug('✅ hCaptcha rendered successfully on step change with widget ID:', widgetId)
        } catch (error: any) {
          console.error('❌ Error rendering hCaptcha:', error?.message || error)
        }
      } else if (hcaptchaContainer) {
        logger.debug('✅ hCaptcha already rendered')
      }
    } else {
      console.warn('⚠️ window.hcaptcha not available')
    }
  }
})

// Auto-save form data to localStorage
watch(formData, (newData) => {
  if (process.client) {
    try {
      // Save without password for security
      const dataToSave = {
        ...newData,
        password: '',
        confirmPassword: '',
        uploadedImage: uploadedImage.value
      }
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(dataToSave))
    } catch (e) {
      console.error('Error saving form data:', e)
    }
  }
}, { deep: true })
</script>
