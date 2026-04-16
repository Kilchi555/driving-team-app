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
              :class="[index <= currentStep ? 'text-gray-900' : 'text-gray-500']"
            >
              <span class="hidden sm:inline">{{ step.title }}</span>
              <span class="hidden xs:inline sm:hidden">{{ step.title.split(' ')[0] }}</span>
            </span>
            <div 
              v-if="index < steps.length - 1" 
              class="w-4 sm:w-8 lg:w-16 h-0.5 mx-1 sm:mx-2 lg:mx-4 flex-shrink-0"
              :class="[index < currentStep ? 'bg-green-600' : 'bg-gray-300']"
            ></div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="submitRegistration" class="p-4 sm:p-6 lg:p-8">
        
        <!-- ═══ STEP 0: Grunddaten ═══ -->
        <div v-if="currentStep === 0" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Firmen-Name *</label>
              <input v-model="formData.name" type="text" required placeholder="z.B. Musterfirma"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">Rechtlicher Firmenname (für Quittungen/Rechnungen) *</label>
              <input v-model="formData.legal_company_name" type="text" required placeholder="z.B. Musterfirma GmbH"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-2">URL-Kennung *</label>
              <div class="flex flex-col sm:flex-row sm:items-center">
                <span class="text-gray-500 text-xs sm:text-sm mb-1 sm:mb-0 sm:mr-2 flex-shrink-0">
                  <span class="hidden sm:inline">www.simy.ch/</span>
                  <span class="sm:hidden">URL: /</span>
                </span>
                <input v-model="formData.slug" type="text" required placeholder="meine-fahrschule"
                  pattern="[a-z0-9\-]+"
                  class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @input="sanitizeSlug(); onSlugInput()">
              </div>
              <p class="text-xs text-gray-500 mt-1">Nur Kleinbuchstaben, Zahlen und Bindestriche</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Vorname Kontaktperson *</label>
              <input v-model="formData.contact_person_first_name" type="text" required placeholder="Max"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nachname Kontaktperson *</label>
              <input v-model="formData.contact_person_last_name" type="text" required placeholder="Mustermann"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
              <input v-model="formData.contact_email" type="email" required placeholder="info@ihre-firma.ch"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Telefon *</label>
              <input v-model="formData.contact_phone" type="tel" required placeholder="+41 44 123 45 67"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Gründungsdatum</label>
              <input v-model="formData.admin_birthdate" type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Website</label>
              <input v-model="formData.website_url" type="url" placeholder="https://www.ihre-firma.ch"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Strasse *</label>
              <input v-model="formData.street" type="text" required placeholder="Musterstrasse"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nummer *</label>
              <input v-model="formData.streetNr" type="text" required placeholder="123"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">PLZ *</label>
              <input v-model="formData.zip" type="text" required pattern="[0-9]{4}" placeholder="8000"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Ort *</label>
              <input v-model="formData.city" type="text" required placeholder="Zürich"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- MwSt / UID -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">UID-Nummer (optional)</label>
              <input v-model="formData.uid_number" type="text" placeholder="CHE-123.456.789"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- Anzahl Fahrlehrer -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Anzahl Fahrlehrer</label>
              <input v-model="formData.staff_count" type="number" min="1" max="999" placeholder="1"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>

            <!-- Sprache -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Sprache</label>
              <select v-model="formData.language"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="it">Italiano</option>
              </select>
            </div>

            <!-- Geschäftstyp -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Geschäftstyp</label>
              <select v-model="formData.business_type"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="driving_school">Fahrschule</option>
                <option value="mental_coach">Coaching</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 1: Branding ═══ -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">🎨 Design, Zahlungen & Social Media</h2>
            <p class="text-sm sm:text-base text-gray-600">Branding, Zahlungsdaten und Online-Präsenz.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <!-- Logo Upload -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Logo (optional)</h3>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div v-if="logoPreview" class="mb-4">
                  <img :src="logoPreview" alt="Logo Preview" class="h-20 w-auto mx-auto object-contain">
                </div>
                <div class="relative inline-block">
                  <input ref="logoInput" type="file" accept="image/*" @change="handleLogoSelect"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <button class="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors" type="button">
                    {{ logoPreview ? '📝 Logo ändern' : '📁 Logo auswählen' }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-2">JPG, PNG, max. 2MB</p>
                <button v-if="logoPreview" @click="removeLogo"
                  class="text-red-600 hover:text-red-800 text-sm mt-2 block mx-auto" type="button">
                  🗑️ Entfernen
                </button>
              </div>
            </div>

            <!-- Farben -->
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Farben</h3>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Hauptfarbe</label>
                <div class="flex items-center space-x-3">
                  <input v-model="formData.primary_color" type="color" class="w-12 h-10 border border-gray-300 rounded cursor-pointer">
                  <input v-model="formData.primary_color" type="text" placeholder="#3B82F6"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Zweitfarbe</label>
                <div class="flex items-center space-x-3">
                  <input v-model="formData.secondary_color" type="color" class="w-12 h-10 border border-gray-300 rounded cursor-pointer">
                  <input v-model="formData.secondary_color" type="text" placeholder="#10B981"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Akzentfarbe (optional)</label>
                <div class="flex items-center space-x-3">
                  <input v-model="formData.accent_color" type="color" class="w-12 h-10 border border-gray-300 rounded cursor-pointer">
                  <input v-model="formData.accent_color" type="text" placeholder="#8B5CF6"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
              <!-- Vorschau -->
              <div class="flex gap-2 mt-4">
                <div class="flex-1 p-2 rounded-lg text-white text-center text-xs" :style="{ backgroundColor: formData.primary_color }">Haupt</div>
                <div class="flex-1 p-2 rounded-lg text-white text-center text-xs" :style="{ backgroundColor: formData.secondary_color }">Zweit</div>
                <div class="flex-1 p-2 rounded-lg text-white text-center text-xs" :style="{ backgroundColor: formData.accent_color || '#8B5CF6' }">Akzent</div>
              </div>
            </div>
          </div>

          <!-- Social Media -->
          <div class="border-t pt-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">🌐 Social Media (optional)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                <input v-model="formData.instagram_url" type="url" placeholder="https://instagram.com/ihre-fahrschule"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                <input v-model="formData.facebook_url" type="url" placeholder="https://facebook.com/ihre-fahrschule"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
          </div>

          <!-- Zahlungsdaten -->
          <div class="border-t pt-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">💳 Zahlungsdaten (für Rechnungen)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                <input v-model="formData.iban" type="text" placeholder="CH56 0483 5012 3456 7800 9"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Bank</label>
                <input v-model="formData.bank_name" type="text" placeholder="z.B. Raiffeisen, ZKB, UBS"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 2: Admin-Daten ═══ -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">👤 Admin-Daten</h2>
            <p class="text-sm sm:text-base text-gray-600">Erstellen Sie das Admin-Konto für Ihren Zugang.</p>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700">Admin-Daten aus Firmen-Kontakt übernehmen</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="adminSameAsCompany" @change="applyAdminFromCompany" class="sr-only peer">
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Vorname *</label>
              <input v-model="adminForm.first_name" type="text" required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nachname *</label>
              <input v-model="adminForm.last_name" type="text" required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
              <input v-model="adminForm.email" type="email" required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
              <input v-model="adminForm.phone" type="tel"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Geburtsdatum</label>
              <input v-model="adminForm.birthdate" type="date"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <div></div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Passwort *</label>
              <input v-model="adminForm.password" type="password" required minlength="12" autocomplete="new-password" name="new-password"
                :class="['w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent',
                  adminForm.password && !passwordValid ? 'border-red-300 focus:ring-red-500' :
                  adminForm.password && passwordValid ? 'border-green-300 focus:ring-green-500' :
                  'border-gray-300 focus:ring-blue-500']"
                placeholder="Mindestens 12 Zeichen">
              <!-- zxcvbn strength bar -->
              <div v-if="zxcvbnScore !== null" class="mt-2">
                <div class="flex gap-1 h-1.5">
                  <div v-for="i in 4" :key="i" class="flex-1 rounded-full transition-colors duration-300"
                    :class="i <= zxcvbnScore ? [
                      zxcvbnScore <= 1 ? 'bg-red-500' :
                      zxcvbnScore === 2 ? 'bg-yellow-400' :
                      zxcvbnScore === 3 ? 'bg-blue-400' : 'bg-green-500'
                    ] : 'bg-gray-200'"
                  />
                </div>
                <p class="text-xs mt-1" :class="
                  zxcvbnScore <= 1 ? 'text-red-500' :
                  zxcvbnScore === 2 ? 'text-yellow-600' :
                  zxcvbnScore === 3 ? 'text-blue-600' : 'text-green-600'
                ">
                  {{ ['Sehr schwach', 'Schwach', 'Akzeptabel', 'Stark', 'Sehr stark'][zxcvbnScore] }}
                  <span v-if="zxcvbnScore < 2"> – zu leicht erratbar</span>
                </p>
              </div>
              <!-- HIBP -->
              <p v-if="hibpStatus === 'checking'" class="text-xs text-gray-400 mt-1">🔍 Sicherheitsprüfung...</p>
              <p v-else-if="hibpStatus === 'pwned'" class="text-xs text-red-600 mt-1">⚠️ Dieses Passwort ist in {{ hibpCount }} Datenlecks bekannt – bitte ein anderes wählen.</p>
              <p v-else-if="hibpStatus === 'safe'" class="text-xs text-green-600 mt-1">✓ Nicht in bekannten Datenlecks gefunden</p>
              <p v-if="passwordError" class="text-xs text-red-600 mt-1">{{ passwordError }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Passwort bestätigen *</label>
              <input v-model="adminForm.passwordConfirm" type="password" required minlength="12" autocomplete="new-password" name="confirm-password"
                :class="['w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent',
                  adminForm.passwordConfirm && passwordMismatch ? 'border-red-300 focus:ring-red-500' :
                  adminForm.passwordConfirm && !passwordMismatch && passwordValid ? 'border-green-300 focus:ring-green-500' :
                  'border-gray-300 focus:ring-blue-500']"
                placeholder="Passwort wiederholen">
              <p v-if="passwordMismatch" class="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein.</p>
              <p v-else-if="adminForm.passwordConfirm && !passwordMismatch && passwordValid" class="text-xs text-green-600 mt-1">✓ Passwörter stimmen überein</p>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 3: Mitarbeiter einladen ═══ -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">👥 Fahrlehrer einladen</h2>
            <p class="text-sm sm:text-base text-gray-600">
              Erfasse mindestens einen Fahrlehrer – er erhält direkt eine Einladungs-SMS zur Registrierung.
            </p>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            📱 Für jeden Fahrlehrer mit Telefonnummer geht direkt nach der Registrierung eine SMS mit Einladungslink raus.
          </div>

          <div class="space-y-4">
            <div
              v-for="(staff, index) in staffList"
              :key="index"
              class="border border-gray-200 rounded-lg p-4 bg-gray-50 relative"
            >
              <button
                v-if="staffList.length > 1"
                type="button"
                @click="removeStaff(index)"
                class="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
              >✕</button>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Vorname *</label>
                  <input v-model="staff.first_name" type="text" placeholder="Max"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Nachname *</label>
                  <input v-model="staff.last_name" type="text" placeholder="Mustermann"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Telefon * <span class="text-blue-500">(Einladungs-SMS)</span></label>
                  <input v-model="staff.phone" type="tel" placeholder="+41 79 123 45 67"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
              </div>
            </div>
          </div>

          <button type="button" @click="addStaff"
            class="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors">
            <span class="text-lg leading-none">+</span> Weiteren Fahrlehrer hinzufügen
          </button>

          <p v-if="!hasValidStaff" class="text-xs text-red-500">
            Bitte mindestens einen Fahrlehrer mit Vor- und Nachname sowie Telefonnummer erfassen.
          </p>
        </div>

        <!-- ═══ STEP 4: Bestätigung ═══ -->
        <div v-if="currentStep === 4" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">✅ Bestätigung</h2>
            <p class="text-sm sm:text-base text-gray-600">Überprüfen Sie Ihre Angaben vor der Registrierung.</p>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Zusammenfassung</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Grunddaten -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Grunddaten</h4>
                <div class="space-y-1 text-sm text-gray-600">
                  <p><strong>Name:</strong> {{ formData.name }}</p>
                  <p><strong>Rechtlicher Name:</strong> {{ formData.legal_company_name }}</p>
                  <p><strong>URL:</strong> www.simy.ch/{{ formData.slug }}</p>
                  <p><strong>Kontakt:</strong> {{ formData.contact_person_first_name }} {{ formData.contact_person_last_name }}</p>
                  <p><strong>E-Mail:</strong> {{ formData.contact_email }}</p>
                  <p><strong>Telefon:</strong> {{ formData.contact_phone }}</p>
                  <p><strong>Adresse:</strong> {{ formData.street }} {{ formData.streetNr }}, {{ formData.zip }} {{ formData.city }}</p>
                  <p v-if="formData.uid_number"><strong>UID:</strong> {{ formData.uid_number }}</p>
                  <p v-if="formData.website_url"><strong>Website:</strong> {{ formData.website_url }}</p>
                  <p v-if="formData.staff_count"><strong>Fahrlehrer:</strong> {{ formData.staff_count }}</p>
                  <p><strong>Sprache:</strong> {{ { de: 'Deutsch', fr: 'Français', it: 'Italiano' }[formData.language] || formData.language }}</p>
                  <p v-if="createdCustomerNumber"><strong>Kundennummer:</strong> {{ createdCustomerNumber }}</p>
                </div>
              </div>
              <!-- Admin -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Admin-Account</h4>
                <div class="space-y-1 text-sm text-gray-600">
                  <p><strong>Name:</strong> {{ adminForm.first_name }} {{ adminForm.last_name }}</p>
                  <p><strong>E-Mail:</strong> {{ adminForm.email }}</p>
                  <p v-if="adminForm.phone"><strong>Telefon:</strong> {{ adminForm.phone }}</p>
                  <p><strong>Passwort:</strong> ••••••••</p>
                </div>
              </div>
              <!-- Fahrlehrer -->
              <div v-if="staffList.some(s => s.first_name && s.last_name)">
                <h4 class="font-medium text-gray-900 mb-2">Fahrlehrer-Einladungen</h4>
                <div class="space-y-1 text-sm text-gray-600">
                  <div v-for="(s, i) in staffList.filter(s => s.first_name && s.last_name)" :key="i"
                    class="flex items-center gap-2">
                    <span>{{ s.first_name }} {{ s.last_name }}</span>
                    <span class="text-blue-600 text-xs">📱 {{ s.phone }}</span>
                  </div>
                </div>
              </div>
              <!-- Branding -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Branding</h4>
                <div class="space-y-2">
                  <div v-if="logoPreview" class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Logo:</span>
                    <img :src="logoPreview" alt="Logo" class="h-8 w-auto">
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-600">Farben:</span>
                    <div class="w-6 h-6 rounded border" :style="{ backgroundColor: formData.primary_color }"></div>
                    <div class="w-6 h-6 rounded border" :style="{ backgroundColor: formData.secondary_color }"></div>
                    <div class="w-6 h-6 rounded border" :style="{ backgroundColor: formData.accent_color || '#8B5CF6' }"></div>
                  </div>
                  <div v-if="formData.instagram_url || formData.facebook_url" class="text-sm text-gray-600">
                    <span v-if="formData.instagram_url">📸 Instagram ✓ </span>
                    <span v-if="formData.facebook_url">📘 Facebook ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AGB -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label class="flex items-start space-x-3">
              <input v-model="acceptTerms" type="checkbox" required
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
              <span class="text-sm text-gray-700">
                Ich akzeptiere die <a href="#" class="text-blue-600 hover:underline">Nutzungsbedingungen</a>
                und die <a href="#" class="text-blue-600 hover:underline">Datenschutzerklärung</a>.
              </span>
            </label>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="currentStep === 5" class="text-center py-8 sm:py-12">
          <div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 class="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Account wird erstellt...</h2>
          <p class="text-sm sm:text-base text-gray-600">Bitte warten Sie einen Moment.</p>
        </div>

        <!-- Success State -->
        <div v-if="currentStep === 6" class="text-center py-8 sm:py-12">
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
            <button @click="goToTenantPage"
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto">
              🚀 Zur {{ formData.name }}-Seite
            </button>
            <p class="text-xs sm:text-sm text-gray-500 break-all">
              Login-URL: <code class="bg-gray-100 px-2 py-1 rounded text-xs">{{ tenantUrl }}</code>
            </p>
          </div>

          <!-- SMS-Versand-Ergebnisse -->
          <div v-if="staffInviteResults && staffInviteResults.length > 0" class="mt-6 bg-gray-50 border rounded-lg p-4 text-left">
            <h3 class="font-semibold text-gray-800 mb-3">📱 Fahrlehrer-Einladungen</h3>
            <div class="space-y-2">
              <div v-for="r in staffInviteResults" :key="r.name"
                class="flex items-center gap-3 text-sm">
                <span class="text-lg leading-none">
                  {{ r.status === 'sms_sent' ? '✅' : r.status === 'email_sent' ? '📧' : r.status === 'invited' ? '🔗' : '❌' }}
                </span>
                <div>
                  <span class="font-medium">{{ r.name }}</span>
                  <span class="text-gray-500 ml-2">{{ r.message }}</span>
                </div>
              </div>
            </div>
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
        <div class="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-6" v-if="currentStep < 5">
          <button v-if="currentStep > 0" @click="previousStep"
            class="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto order-2 sm:order-1">
            ← Zurück
          </button>
          <div v-else class="order-2 sm:order-1"></div>

          <button v-if="currentStep < 4" @click="nextStep" :disabled="!canProceed"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto order-1 sm:order-2">
            Weiter →
          </button>
          <button v-else-if="currentStep === 4" @click="submitRegistration" :disabled="!canSubmit"
            class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full sm:w-auto order-1 sm:order-2">
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

definePageMeta({ layout: false })

// ─── Wochentage (nur noch für Kompatibilität) ──────────────────────────────
const weekDays = [
  { value: 1, short: 'Mo' }, { value: 2, short: 'Di' }, { value: 3, short: 'Mi' },
  { value: 4, short: 'Do' }, { value: 5, short: 'Fr' }, { value: 6, short: 'Sa' },
  { value: 7, short: 'So' },
]

// ─── Steps ─────────────────────────────────────────────────────────────────
const steps = [
  { title: 'Grunddaten' },
  { title: 'Branding' },
  { title: 'Admin' },
  { title: 'Mitarbeiter' },
  { title: 'Bestätigung' },
]

// ─── Form Data ─────────────────────────────────────────────────────────────
const formData = ref({
  name: '',
  legal_company_name: '',
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
  secondary_color: '#10B981',
  accent_color: '#8B5CF6',
  // Neue Felder
  uid_number: '',
  website_url: '',
  staff_count: '',
  language: 'de',
  iban: '',
  bank_name: '',
  instagram_url: '',
  facebook_url: '',
})

interface StaffEntry {
  first_name: string
  last_name: string
  phone: string
}

const staffList = ref<StaffEntry[]>([
  { first_name: '', last_name: '', phone: '' }
])

const addStaff = () => {
  staffList.value.push({ first_name: '', last_name: '', phone: '' })
}

const removeStaff = (index: number) => {
  staffList.value.splice(index, 1)
}

// Ergebnis der Onboarding-SMS nach Absenden
const staffInviteResults = ref<Array<{ name: string; status: string; message: string; invite_link?: string }> | null>(null)

// ─── State ─────────────────────────────────────────────────────────────────
const currentStep = ref(0)
const acceptTerms = ref(false)
const logoFile    = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const error       = ref<string | null>(null)
const createdTenantSlug    = ref('')
const createdCustomerNumber = ref('')
const logoInput = ref<HTMLInputElement>()
const userEditedSlug = ref(false)

// ─── Admin Form ────────────────────────────────────────────────────────────
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

// ─── Computed ──────────────────────────────────────────────────────────────
const passwordMismatch = computed(() => adminForm.value.password !== adminForm.value.passwordConfirm)

// ─── zxcvbn + HIBP ─────────────────────────────────────────────────────────
const zxcvbnScore    = ref<0 | 1 | 2 | 3 | 4 | null>(null)
const hibpStatus     = ref<'idle' | 'checking' | 'pwned' | 'safe'>('idle')
const hibpCount      = ref(0)
let hibpDebounceTimer: ReturnType<typeof setTimeout> | null = null

const checkPasswordStrength = async (password: string) => {
  if (!password || password.length < 12) { zxcvbnScore.value = null; hibpStatus.value = 'idle'; return }
  const { default: zxcvbn } = await import('zxcvbn')
  const result = zxcvbn(password)
  zxcvbnScore.value = result.score as 0 | 1 | 2 | 3 | 4
  if (result.score < 2) { hibpStatus.value = 'idle'; return }
  // Debounced HIBP check
  if (hibpDebounceTimer) clearTimeout(hibpDebounceTimer)
  hibpDebounceTimer = setTimeout(async () => {
    hibpStatus.value = 'checking'
    try {
      const res = await $fetch<{ isPwned: boolean; count: number }>('/api/auth/check-password-pwned', {
        method: 'POST', body: { password }
      })
      hibpCount.value  = res.count
      hibpStatus.value = res.isPwned ? 'pwned' : 'safe'
    } catch { hibpStatus.value = 'idle' }
  }, 800)
}

const passwordValid = computed(() =>
  adminForm.value.password.length >= 12 &&
  zxcvbnScore.value !== null && zxcvbnScore.value >= 2 &&
  hibpStatus.value !== 'pwned'
)

const passwordError = computed(() => {
  const p = adminForm.value.password
  if (!p) return ''
  if (p.length < 12) return 'Mindestens 12 Zeichen erforderlich'
  if (zxcvbnScore.value !== null && zxcvbnScore.value < 2) return 'Passwort ist zu einfach – bitte ein stärkeres wählen'
  if (hibpStatus.value === 'pwned') return `Passwort in ${hibpCount.value} Datenlecks bekannt – bitte ein anderes wählen`
  return ''
})

const hasValidStaff = computed(() =>
  staffList.value.some(s => s.first_name.trim() && s.last_name.trim() && s.phone.trim())
)

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return !!(formData.value.name && formData.value.legal_company_name && formData.value.slug &&
              formData.value.contact_person_first_name && formData.value.contact_person_last_name &&
              formData.value.contact_email && formData.value.contact_phone &&
              formData.value.street && formData.value.streetNr && formData.value.zip && formData.value.city)
  }
  if (currentStep.value === 2) {
    return !!(adminForm.value.first_name && adminForm.value.last_name &&
              adminForm.value.email && adminForm.value.password &&
              adminForm.value.passwordConfirm && passwordValid.value &&
              !passwordMismatch.value && hibpStatus.value !== 'pwned' && hibpStatus.value !== 'checking')
  }
  if (currentStep.value === 3) {
    return hasValidStaff.value
  }
  // Step 1 (Branding) ist optional → true
  return true
})

const canSubmit = computed(() => acceptTerms.value && canProceed.value)

const tenantUrl = computed(() =>
  createdTenantSlug.value
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auswahl?tenant=${createdTenantSlug.value}`
    : ''
)

const sanitizeSlug = () => {
  formData.value.slug = formData.value.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
}

const onSlugInput = () => { userEditedSlug.value = true }

const handleLogoSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { alert('Nur Bilddateien sind erlaubt'); return }
  if (file.size > 2 * 1024 * 1024)    { alert('Datei zu groß! Maximum 2MB'); return }
  logoFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => { logoPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
}

const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  if (logoInput.value) logoInput.value.value = ''
}

const nextStep     = () => { if (canProceed.value && currentStep.value < 4) currentStep.value++ }
const previousStep = () => { if (currentStep.value > 0) currentStep.value-- }

const applyAdminFromCompany = () => {
  if (adminSameAsCompany.value) {
    adminForm.value.first_name = formData.value.contact_person_first_name
    adminForm.value.last_name  = formData.value.contact_person_last_name
    adminForm.value.email      = formData.value.contact_email
    adminForm.value.phone      = formData.value.contact_phone
    adminForm.value.birthdate  = formData.value.admin_birthdate || ''
  } else {
    adminForm.value.first_name = ''
    adminForm.value.last_name  = ''
    adminForm.value.email      = ''
    adminForm.value.phone      = ''
    adminForm.value.birthdate  = ''
  }
}

// ─── Submit ─────────────────────────────────────────────────────────────────
const submitRegistration = async () => {
  if (!canSubmit.value) return
  if (!formData.value.name?.trim()) { error.value = 'Firmen-Name ist erforderlich'; return }

  currentStep.value = 5 // Loading
  error.value = null

  try {
    const fd = new FormData()

    // Stammdaten
    Object.entries(formData.value).forEach(([key, value]) => {
      const v = value?.toString().trim()
      if (v) fd.append(key, v)
    })

    // Kategorien werden automatisch vom Server kopiert (alle Templates mit tenant_id IS NULL)

    if (logoFile.value) fd.append('logo_file', logoFile.value)

    const response = await $fetch('/api/tenants/register', { method: 'POST', body: fd }) as any

    if (response.success) {
      createdTenantSlug.value     = response.tenant.slug
      createdCustomerNumber.value = response.tenant.customer_number
      // Admin-User erstellen
      try {
        await $fetch('/api/admin/create-user', {
          method: 'POST',
          body: {
            email: adminForm.value.email,
            password: adminForm.value.password,
            role: 'admin',
            tenant_id: response.tenant.id,
            first_name: adminForm.value.first_name,
            last_name: adminForm.value.last_name,
            phone: adminForm.value.phone,
            birthdate: adminForm.value.birthdate
          }
        })
      } catch (adminErr: any) {
        console.error('Admin creation failed:', adminErr)
        error.value = adminErr.statusMessage || adminErr.message || 'Admin-Erstellung fehlgeschlagen'
      }

      // Fahrlehrer-Einladungen versenden (falls erfasst)
      const filledStaff = staffList.value.filter(s => s.first_name.trim() && s.last_name.trim() && s.phone.trim())
      if (filledStaff.length > 0) {
        try {
          const inviteRes = await $fetch('/api/tenants/invite-staff-batch', {
            method: 'POST',
            body: { tenant_id: response.tenant.id, staff_list: filledStaff }
          }) as any
          staffInviteResults.value = inviteRes.results || []
        } catch (inviteErr: any) {
          console.error('Staff invite failed (non-critical):', inviteErr)
        }
      }

      currentStep.value = 6 // Success
    } else {
      throw new Error(response.error || 'Unbekannter Fehler')
    }
    } catch (err: any) {
    console.error('Registration failed:', err)
    error.value = err.message || 'Registrierung fehlgeschlagen'
    currentStep.value = 2 // Zurück zu Admin
  }
}

const goToTenantPage = () => {
  console.log('✅ Tenant registration completed successfully')
}

// ─── Watcher / Slug auto-generate ─────────────────────────────────────────
watch(() => formData.value.name, (newName: string) => {
  if (newName && !userEditedSlug.value) {
    formData.value.slug = newName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
  }
})

watch(() => adminSameAsCompany.value, () => applyAdminFromCompany())

// ─── LocalStorage Persist ──────────────────────────────────────────────────
const STORAGE_KEY = 'tenant-registration-data'

const saveToStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    formData: formData.value,
    adminForm: adminForm.value,
    adminSameAsCompany: adminSameAsCompany.value,
    currentStep: currentStep.value,
    userEditedSlug: userEditedSlug.value,
    logoPreview: logoPreview.value,
    staffList: staffList.value,
  }))
}

const loadFromStorage = () => {
  if (typeof window === 'undefined') return
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  try {
    const d = JSON.parse(saved)
    formData.value            = { ...formData.value, ...d.formData }
    adminForm.value           = { ...adminForm.value, ...d.adminForm }
    adminSameAsCompany.value  = d.adminSameAsCompany || false
    currentStep.value         = d.currentStep || 0
    userEditedSlug.value      = d.userEditedSlug || false
    logoPreview.value         = d.logoPreview || null
    if (d.staffList) staffList.value = d.staffList
    if (adminSameAsCompany.value) applyAdminFromCompany()
  } catch { /* ignore */ }
}

watch([formData, adminForm, adminSameAsCompany, currentStep], saveToStorage, { deep: true })

watch(() => adminForm.value.password, (pw) => checkPasswordStrength(pw))

watch(() => currentStep.value, (step) => {
  if (step === 6) localStorage.removeItem(STORAGE_KEY)
})

onMounted(() => {
  loadFromStorage()
  if (adminSameAsCompany.value) applyAdminFromCompany()
})
</script>
