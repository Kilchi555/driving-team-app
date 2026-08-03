<!-- pages/[slug]/register.vue - Dynamic tenant registration page -->
<template>
  <div class="min-h-screen flex items-center justify-center p-4" :style="{ background: `linear-gradient(to bottom right, ${primaryColor}, ${accentColor || primaryColor})` }">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div v-if="!registrationComplete" class="bg-gray-100 text-white rounded-t-xl overflow-hidden">
        <div class="text-center pt-8">
          <LoadingLogo size="3xl" :tenant-id="activeTenantId || undefined" :tenant-slug="tenantSlug" />
          <h1 class="text-xl font-bold text-gray-700 py-8">
            {{ isAdminRegistration ? 'Admin-Account erstellen' :
               !showAccountStep ? 'Anfrage senden' :
               !isDrivingSchool ? 'Registrierung' :
               serviceType === 'fahrlektion' ? `Registrierung für ${labels.appointmentsPlural}` :
               serviceType === 'theorie' ? 'Registrierung für Theorielektion' :
               serviceType === 'beratung' ? 'Registrierung für Beratung' : 'Unverbindlich registrieren' }}
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
          <template v-if="requiresLernfahrausweis">
            <div class="h-1 w-12 bg-gray-300">
              <div v-if="currentStep >= 2" class="h-full bg-green-500 transition-all duration-300"></div>
            </div>
            <div :class="currentStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
                 class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
          </template>
          <template v-if="showAccountStep">
            <div class="h-1 w-12 bg-gray-300">
              <div v-if="currentStep >= maxSteps" class="h-full bg-green-500 transition-all duration-300"></div>
            </div>
            <div :class="currentStep >= maxSteps ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'" 
                 class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
              {{ maxSteps }}
            </div>
          </template>
        </div>
        <div class="flex justify-center text-center mt-2 text-xs text-gray-600 gap-6">
          <span>Persönliche Daten</span>
          <span v-if="requiresLernfahrausweis">
            Lernfahrausweis
            <span v-if="!lernfahrausweisRequired" class="text-gray-400">(opt.)</span>
          </span>
          <span v-if="showAccountStep">Account</span>
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
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {{ showAccountStep ? 'Registrierung erfolgreich!' : 'Anfrage gesendet!' }}
            </h2>
            <p class="text-gray-600 text-base sm:text-lg">
              {{ showAccountStep ? `Willkommen bei ${currentTenant?.name || 'Simy'}!` : `Danke — ${currentTenant?.name || 'wir'} melden uns bei dir.` }}
            </p>
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
                <h3 class="text-base sm:text-lg font-semibold text-green-900 mb-2">
                  {{ showAccountStep ? 'Account aktiviert' : 'Wir haben deine Angaben erhalten' }}
                </h3>
                <p class="text-green-800 text-sm sm:text-base break-words">
                  <template v-if="showAccountStep">
                    Ihr Account ist sofort aktiv. Sie können sich jetzt mit Ihren Zugangsdaten einloggen.
                  </template>
                  <template v-else>
                    Es ist kein Login nötig. Wir melden uns bei dir bezüglich Termin und weiterem Vorgehen.
                  </template>
                </p>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="space-y-3 pt-4 sm:pt-6">
            <button
              v-if="showAccountStep"
              @click="navigateTo(registeredTenantSlug || tenantSlug ? `/${registeredTenantSlug || tenantSlug}` : '/login')"
              class="w-full text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
              :style="{ background: primaryColor }"
            >
              Zum Login
            </button>
            <button
              v-else
              @click="navigateTo(tenantSlug ? `/${tenantSlug}` : '/')"
              class="w-full text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
              :style="{ background: primaryColor }"
            >
              Zurück zur Startseite
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
                 class="border rounded-lg p-3 mt-4" :style="{ background: `${primaryColor}15`, borderColor: `${primaryColor}33` }">
              <p class="text-sm" :style="{ color: primaryColor }">
                <span class="font-medium">ℹ️ Vorausgefüllte Daten:</span> 
                Die Kontaktdaten aus der Firmenregistrierung wurden automatisch übernommen.
              </p>
              <p class="text-xs mt-1" :style="{ color: primaryColor }">
                <span class="font-medium">📍 Adresse:</span> 
                Bitte geben Sie hier Ihre <strong>Privatadresse</strong> ein. Falls diese von der Firmenadresse abweicht, können Sie die Felder entsprechend anpassen.
              </p>
            </div>
          </div>

          <!-- Personal Information Form -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- First Name -->
            <div v-if="isAdminRegistration || isContactFieldVisible('first_name')">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Vorname <span v-if="isAdminRegistration || isContactFieldRequired('first_name')" class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.firstName"
                type="text"
                :required="isAdminRegistration || isContactFieldRequired('first_name')"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                placeholder="Max"
              />
            </div>

            <!-- Last Name -->
            <div v-if="isAdminRegistration || isContactFieldVisible('last_name')">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nachname <span v-if="isAdminRegistration || isContactFieldRequired('last_name')" class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.lastName"
                type="text"
                :required="isAdminRegistration || isContactFieldRequired('last_name')"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                placeholder="Mustermann"
              />
            </div>

            <!-- Birth Date -->
            <div v-if="isAdminRegistration || isContactFieldVisible('birthdate')" class="min-w-0">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum <span v-if="isAdminRegistration || isContactFieldRequired('birthdate')" class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-3 gap-2 min-w-0">
                <select
                  v-model="birthdateDay"
                  @change="syncBirthDateFromParts"
                  :required="isAdminRegistration || isContactFieldRequired('birthdate')"
                  :class="[
                    'w-full min-w-0 px-2 py-2 border rounded-lg focus:ring-2 bg-white text-sm',
                    fieldErrors.birthDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 tenant-focus'
                  ]"
                >
                  <option value="">Tag</option>
                  <option v-for="d in 31" :key="d" :value="String(d).padStart(2, '0')">{{ d }}</option>
                </select>
                <select
                  v-model="birthdateMonth"
                  @change="syncBirthDateFromParts"
                  :required="isAdminRegistration || isContactFieldRequired('birthdate')"
                  :class="[
                    'w-full min-w-0 px-2 py-2 border rounded-lg focus:ring-2 bg-white text-sm',
                    fieldErrors.birthDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 tenant-focus'
                  ]"
                >
                  <option value="">Monat</option>
                  <option value="01">Januar</option>
                  <option value="02">Februar</option>
                  <option value="03">März</option>
                  <option value="04">April</option>
                  <option value="05">Mai</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Dezember</option>
                </select>
                <select
                  v-model="birthdateYear"
                  @change="syncBirthDateFromParts"
                  :required="isAdminRegistration || isContactFieldRequired('birthdate')"
                  :class="[
                    'w-full min-w-0 px-2 py-2 border rounded-lg focus:ring-2 bg-white text-sm',
                    fieldErrors.birthDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 tenant-focus'
                  ]"
                >
                  <option value="">Jahr</option>
                  <option v-for="y in birthdateYears" :key="y" :value="String(y)">{{ y }}</option>
                </select>
              </div>
              <p v-if="fieldErrors.birthDate" class="mt-1 text-sm text-red-600">{{ fieldErrors.birthDate }}</p>
            </div>

            <!-- Phone -->
            <div v-if="isAdminRegistration || isContactFieldVisible('phone')">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Telefon <span v-if="isAdminRegistration || isContactFieldRequired('phone')" class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.phone"
                type="tel"
                :required="isAdminRegistration || isContactFieldRequired('phone')"
                @input="phoneExistsBlocked = false"
                @blur="normalizePhone"
                :class="[
                  'w-full px-3 py-2 border rounded-lg focus:ring-2',
                  fieldErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 tenant-focus'
                ]"
                placeholder="079 123 45 67"
              />
              <p v-if="fieldErrors.phone" class="mt-1 text-sm text-red-600">{{ fieldErrors.phone }}</p>
              <p v-else-if="phoneExistsBlocked" class="mt-1 text-sm text-red-600 flex items-center gap-1">
                ⚠ Diese Nummer ist bereits registriert.
                <button type="button" @click="showPendingPhoneModal = true" class="underline font-medium">Details anzeigen</button>
              </p>
              <p v-else-if="pendingPhoneFirstName && !pendingPhoneIsActive" class="mt-1 text-sm text-amber-700">
                Wir haben schon ein offenes Profil für diese Nummer — beim Absenden wird es aktiviert.
              </p>
              <p v-else-if="isCheckingPhone" class="text-xs mt-1 flex items-center gap-1" :style="{ color: primaryColor }">
                <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Wird geprüft...
              </p>
              <p v-else class="text-xs text-gray-500 mt-1">Format: +41791234567</p>
            </div>

            <!-- Email (admin always; otherwise when public contact field & no account step) -->
            <div v-if="isAdminRegistration || (!showAccountStep && isContactFieldVisible('email'))">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse
                <span v-if="isAdminRegistration || isContactFieldRequired('email')" class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.email"
                type="email"
                :required="isAdminRegistration || isContactFieldRequired('email')"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                placeholder="max@example.com"
              />
            </div>

            <!-- Street -->
            <div v-if="isAdminRegistration || isContactFieldVisible('street')">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Strasse <span v-if="isAdminRegistration || isContactFieldRequired('street')" class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.street"
                type="text"
                :required="isAdminRegistration || isContactFieldRequired('street')"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                placeholder="Musterstrasse"
              />
            </div>

            <!-- Street Number -->
            <div v-if="isAdminRegistration || isContactFieldVisible('street_nr')">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hausnummer <span v-if="isAdminRegistration || isContactFieldRequired('street_nr')" class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.streetNr"
                type="text"
                :required="isAdminRegistration || isContactFieldRequired('street_nr')"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                placeholder="123"
              />
            </div>

            <!-- ZIP, City and Profession -->
            <div
              v-if="isAdminRegistration || isContactFieldVisible('zip') || isContactFieldVisible('city') || isContactFieldVisible('profession')"
              class="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <div v-if="isAdminRegistration || isContactFieldVisible('zip')">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  PLZ <span v-if="isAdminRegistration || isContactFieldRequired('zip')" class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.zip"
                  type="text"
                  :required="isAdminRegistration || isContactFieldRequired('zip')"
                  pattern="[0-9]{4}"
                  @blur="validateZip"
                  :class="[
                    'w-full px-3 py-2 border rounded-lg focus:ring-2',
                    fieldErrors.zip ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 tenant-focus'
                  ]"
                  placeholder="8000"
                />
                <p v-if="fieldErrors.zip" class="mt-1 text-sm text-red-600">{{ fieldErrors.zip }}</p>
              </div>

              <div v-if="isAdminRegistration || isContactFieldVisible('city')">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Ort <span v-if="isAdminRegistration || isContactFieldRequired('city')" class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.city"
                  type="text"
                  :required="isAdminRegistration || isContactFieldRequired('city')"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                  placeholder="Zürich"
                />
              </div>

              <div v-if="isAdminRegistration || isContactFieldVisible('profession')">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Beruf <span v-if="isContactFieldRequired('profession')" class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.profession"
                  type="text"
                  :required="isContactFieldRequired('profession')"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                  placeholder="z.B. Student/in, Software Engineer"
                />
              </div>
            </div>
          </div>

          <!-- Categories (compact multi-select dropdown) -->
          <div v-if="showCategorySelection" class="relative" ref="categoryDropdownRef">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ isDrivingSchool ? 'Führerschein-' : '' }}{{ labels.categoriesLabel }}
              <span v-if="categoriesRequired" class="text-red-500">*</span>
              <span v-else class="text-xs text-gray-400 font-normal">(optional)</span>
            </label>

            <button
              type="button"
              class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-white text-left transition focus:outline-none focus:ring-2 tenant-focus"
              :class="categoriesRequired && formData.categories.length === 0 ? 'border-gray-300' : 'border-gray-300'"
              @click="categoryDropdownOpen = !categoryDropdownOpen"
            >
              <span class="min-w-0 flex-1 truncate text-sm" :class="formData.categories.length ? 'text-gray-900' : 'text-gray-400'">
                {{ categoryDropdownLabel }}
              </span>
              <svg
                class="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform"
                :class="categoryDropdownOpen ? 'rotate-180' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div
              v-if="categoryDropdownOpen"
              class="absolute z-30 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
            >
              <ul class="max-h-56 overflow-y-auto py-1">
                <li v-for="category in availableCategories" :key="category.code">
                  <button
                    type="button"
                    class="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    @click="toggleCategory(category.code)"
                  >
                    <span
                      class="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2"
                      :class="formData.categories.includes(category.code) ? 'border-transparent' : 'border-gray-300 bg-white'"
                      :style="formData.categories.includes(category.code) ? { background: primaryColor } : {}"
                    >
                      <svg
                        v-if="formData.categories.includes(category.code)"
                        class="h-2.5 w-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium text-gray-800">{{ category.name }}</span>
                      <span class="block text-xs text-gray-500 mt-0.5">
                        CHF {{ category.price }}/{{ category.duration || 45 }}min
                        <template v-if="category.adminFee && category.adminFee > 0">
                          · + CHF {{ category.adminFee }} Admin
                        </template>
                      </span>
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            <div v-if="formData.categories.length" class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="code in formData.categories"
                :key="code"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                :style="{ background: `${primaryColor}18`, color: primaryColor }"
              >
                {{ categoryLabel(code) }}
                <button
                  type="button"
                  class="rounded-full p-0.5 hover:bg-black/5"
                  :aria-label="`${categoryLabel(code)} entfernen`"
                  @click="toggleCategory(code)"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </span>
            </div>
          </div>

          <!-- Terminwunsch: Tage, Zeiten, Bemerkungen -->
          <div v-if="showProposalSection" class="space-y-5 pt-2 border-t border-gray-100">
            <div>
              <h3 class="text-sm font-semibold text-gray-800">
                Terminwunsch
                <span v-if="proposalRequired" class="text-red-500">*</span>
                <span v-else class="text-xs text-gray-400 font-normal ml-1">(optional)</span>
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">Wann passt es dir am besten? Wir melden uns mit Vorschlägen.</p>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-medium text-gray-700">
                Bevorzugte Tage
                <span v-if="proposalRequired" class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  v-for="(dayName, dayIndex) in weekDays"
                  :key="dayIndex"
                  type="button"
                  class="rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors"
                  :class="selectedDays.includes(dayIndex) ? 'text-white' : 'text-gray-700 border-gray-200 hover:border-gray-300'"
                  :style="selectedDays.includes(dayIndex)
                    ? { background: primaryColor, borderColor: primaryColor }
                    : {}"
                  @click="toggleDay(dayIndex)"
                >
                  {{ dayName }}
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-medium text-gray-700">
                Zeitfenster pro Tag
                <span v-if="proposalRequired" class="text-red-500">*</span>
              </label>

              <div
                v-if="selectedDays.length === 0"
                class="rounded-xl px-4 py-3 text-sm"
                :style="{ background: `${primaryColor}15`, color: primaryColor }"
              >
                Wähle zuerst mindestens einen Tag.
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="dayIndex in selectedDays"
                  :key="dayIndex"
                  class="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold text-gray-800">{{ weekDays[dayIndex] }}</h4>
                    <button
                      type="button"
                      class="text-xs font-medium text-red-600 hover:text-red-700"
                      @click="removeDay(dayIndex)"
                    >
                      Entfernen
                    </button>
                  </div>

                  <div
                    v-for="(slot, slotIndex) in getTimeSlotsForDay(dayIndex)"
                    :key="`${dayIndex}-${slotIndex}`"
                    class="flex items-center gap-2"
                  >
                    <input
                      v-model="slot.start_time"
                      type="time"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                      @change="bumpTimeSlots"
                    />
                    <span class="text-gray-400">–</span>
                    <input
                      v-model="slot.end_time"
                      type="time"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                      @change="bumpTimeSlots"
                    />
                    <button
                      type="button"
                      class="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      title="Zeitfenster entfernen"
                      @click="removeTimeSlot(dayIndex, slotIndex)"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    class="w-full rounded-lg border py-2 text-sm font-medium transition hover:bg-white"
                    :style="{ borderColor: `${primaryColor}44`, color: primaryColor }"
                    @click="addTimeSlot(dayIndex)"
                  >
                    + Weiteres Zeitfenster
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Bemerkungen
              </label>
              <textarea
                v-model="proposalNotes"
                rows="3"
                maxlength="1500"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 tenant-focus"
                placeholder="Optional: z.B. besondere Wünsche…"
              />
              <p class="mt-1 text-xs text-gray-400 text-right">{{ proposalNotes.length }}/1500</p>
            </div>
          </div>
        </div>

        <!-- Step 2: Lernfahrausweis Upload -->
        <div v-if="!registrationComplete && currentStep === 2 && requiresLernfahrausweis" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-2">
              Ausweis hochladen
              <span v-if="!lernfahrausweisRequired" class="text-sm font-normal text-gray-400">(optional)</span>
            </h2>
            <p class="text-gray-600 text-sm">
              <template v-if="lernfahrausweisRequired">
                Lade deinen Lernfahrausweis hoch, um fortzufahren.
              </template>
              <template v-else>
                Lade deinen Lernfahrausweis hoch – du kannst diesen Schritt auch überspringen und den Ausweis später in deinem Profil nachholen.
              </template>
            </p>
          </div>

          <!-- Upload per Category -->
          <div class="space-y-6">
            <div 
              v-for="category in lfaUploadCategories" 
              :key="category"
              class="border-2 border-gray-200 rounded-lg p-6"
            >
              <div class="mb-4">
                <h3 class="text-lg font-semibold text-gray-900">
                  <template v-if="category === 'general'">Ausweis</template>
                  <template v-else>Kategorie {{ category }}</template>
                  <span v-if="!lernfahrausweisRequired" class="ml-1 text-sm font-normal text-gray-400">(optional)</span>
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
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 tenant-hover-border transition-colors cursor-pointer"
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
                  <p class="font-medium mb-1" :style="{ color: primaryColor }">Klicken zum Hochladen</p>
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

        <!-- Account & Registrierung -->
        <div v-if="!registrationComplete && showAccountStep && ((currentStep === 2 && !requiresLernfahrausweis) || (currentStep === 3 && requiresLernfahrausweis))" class="space-y-6">
          <div class="text-center mb-6">
            <div class="text-4xl mb-2">🔐</div>
            <h3 class="text-xl font-semibold text-gray-900">Account erstellen</h3>
            <p class="text-gray-600">E-Mail und Passwort für Ihren Zugang</p>
          </div>


          <!-- WICHTIG: Form Element um die Passwort-Felder. Der Submit-Button liegt
               weiter unten in der gemeinsamen Navigation-Leiste (ausserhalb dieses
               <form>), ist aber via form="account-creation-form" formal damit
               verknüpft, damit Browser/iOS/Android beim Absenden ein echtes
               submit-Event sehen und "Passwort speichern?" anbieten können. -->
          <form id="account-creation-form" @submit.prevent="submitRegistration" class="space-y-4">
            <!-- E-Mail -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <div class="relative">
                <input
                  v-model="formData.email"
                  type="email"
                  autocomplete="email"
                  name="username"
                  id="client-email"
                  required
                  @blur="validateEmail"
                  @change="validateEmail"
                  :class="[
                    'w-full px-4 py-3 border rounded-lg focus:ring-2 pr-10',
                    fieldErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                  ]"
                  placeholder="ihre.email@beispiel.ch"
                />
                <!-- Email Check Status Indicator -->
                <div v-if="isCheckingEmail" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div class="animate-spin">
                    <svg class="w-5 h-5" :style="{ color: primaryColor }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                </div>
                <div v-else-if="!fieldErrors.email && formData.email && !isCheckingEmail" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
              <p v-if="fieldErrors.email" class="mt-1 text-sm text-red-600">{{ fieldErrors.email }}</p>
              <!-- Pending user: has been added manually but hasn't registered yet -->
              <div v-if="emailIsPending" class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p class="text-sm font-medium text-amber-800">Konto bereits angelegt — du kannst hier weiter machen</p>
                <p class="text-sm text-amber-700">
                  {{ labels.businessNoun }} hat dich schon erfasst. Fülle das Formular aus und sende ab — wir verknüpfen dein bestehendes Profil und aktivieren dein Konto.
                </p>
                <p class="text-xs text-amber-600">
                  Optional: Registrierungslink erneut per SMS anfordern.
                </p>
                <div v-if="!pendingEmailSmsSent">
                  <button
                    type="button"
                    :disabled="isResendingPendingEmailSms || !formData.phone"
                    @click="resendOnboardingByEmailUser"
                    class="text-sm font-medium text-white px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                    style="background:#d97706"
                  >
                    <span v-if="isResendingPendingEmailSms">Wird gesendet...</span>
                    <span v-else>Link per SMS anfordern</span>
                  </button>
                  <p v-if="!formData.phone" class="text-xs text-amber-600 mt-1">Bitte zuerst Telefonnummer eingeben.</p>
                </div>
                <p v-else class="text-sm text-green-700 font-medium">SMS wurde gesendet! Bitte prüfe dein Handy.</p>
              </div>
              <!-- Active user: already fully registered -->
              <div v-else-if="fieldErrors.email?.includes('bereits registriert')" class="mt-2 p-3 border rounded-lg" :style="{ background: `${primaryColor}15`, borderColor: `${primaryColor}33` }">
                <p class="text-sm font-medium mb-2" :style="{ color: primaryColor }">Du hast bereits ein Konto</p>
                <p class="text-xs text-gray-600 mb-3">Melde dich an — oder setze dein Passwort zurück, falls du es vergessen hast.</p>
                <div class="flex gap-2 flex-wrap">
                  <NuxtLink
                    :to="loginHref"
                    class="text-sm font-medium text-white px-3 py-1.5 rounded-md transition-colors"
                    :style="{ background: primaryColor }"
                  >
                    Zum Login
                  </NuxtLink>
                  <NuxtLink
                    :to="forgotPasswordHref"
                    class="text-sm font-medium px-3 py-1.5 border rounded-md bg-white transition-colors"
                    :style="{ color: primaryColor, borderColor: `${primaryColor}66` }"
                  >
                    Passwort vergessen?
                  </NuxtLink>
                </div>
              </div>
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
                  name="password"
                  id="client-password"
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
              <button type="button" @click="useGeneratedPassword" class="mt-2 text-xs font-semibold underline" :style="{ color: primaryColor }">
                Sicheres Passwort vorschlagen
              </button>

              <!-- Passwort-Validierung -->
              <div class="mt-2 space-y-1">
                <div class="flex items-center space-x-2">
                  <span :class="passwordChecks.length ? 'text-green-600' : 'text-gray-400'" class="text-sm">
                    {{ passwordChecks.length ? '✓' : '○' }} Mindestens 12 Zeichen
                  </span>
                </div>
                <!-- zxcvbn strength bar (shown once 12+ chars) -->
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
                <div v-if="hibpStatus !== 'idle'" class="flex items-center space-x-2 text-sm">
                  <span v-if="hibpStatus === 'checking'" class="text-gray-400">⏳ Sicherheitsprüfung läuft...</span>
                  <span v-else-if="hibpStatus === 'pwned'" class="text-red-600 font-medium">
                    ✗ Passwort {{ hibpCount.toLocaleString('de-CH') }}× in Datenlecks gefunden – bitte ein anderes wählen
                  </span>
                  <span v-else-if="hibpStatus === 'safe'" class="text-green-600">
                    ✓ Passwort nicht in bekannten Datenlecks gefunden
                  </span>
                </div>
              </div>
              <p v-if="fieldErrors.password" class="mt-2 text-sm text-red-600 font-medium">{{ fieldErrors.password }}</p>
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
                name="confirm-password"
                id="client-confirm-password"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Passwort wiederholen"
              />
              <p v-if="formData.confirmPassword && formData.password !== formData.confirmPassword" 
                class="text-red-600 text-sm mt-1">
                ✗ Passwörter stimmen nicht überein
              </p>
              <p v-else-if="formData.confirmPassword && formData.password === formData.confirmPassword"
                class="text-green-600 text-sm mt-1">
                ✓ Passwörter stimmen überein
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

          </form>
        </div>
      </div>

      <!-- Navigation -->
      <div v-if="!registrationComplete" class="px-6 py-4 bg-gray-50 rounded-b-xl space-y-3">
        <p v-if="proceedBlockReason && currentStep <= maxSteps" class="text-sm text-amber-700 text-right">
          {{ proceedBlockReason }}
        </p>
        <div class="flex justify-between">
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
          class="disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          :style="!canProceed ? {} : { background: primaryColor }"
        >
          Weiter →
        </button>
        
        <button
          v-if="currentStep === maxSteps && showAccountStep"
          type="submit"
          form="account-creation-form"
          :disabled="!canSubmit || isSubmitting"
          class="inline-flex items-center justify-center gap-2 min-w-[8.5rem] bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          <svg v-if="isSubmitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span>{{ isSubmitting ? 'Senden…' : 'Registrieren' }}</span>
        </button>
        <button
          v-else-if="currentStep === maxSteps && !showAccountStep"
          type="button"
          :disabled="!canSubmit || isSubmitting"
          class="inline-flex items-center justify-center gap-2 min-w-[8.5rem] bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          @click="submitRegistration"
        >
          <svg v-if="isSubmitting" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span>{{ isSubmitting ? 'Senden…' : 'Absenden' }}</span>
        </button>
        </div>
      </div>

      <!-- Login Link -->
      <div v-if="!registrationComplete && showAccountStep" class="px-6 py-3 text-center border-t">
        <p class="text-gray-600 text-sm">
          Bereits registriert?
          <button 
            @click="navigateTo(tenantSlug ? `/${tenantSlug}` : '/login')"
            class="font-semibold ml-1 hover:opacity-80 transition-opacity"
            :style="{ color: primaryColor }"
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
              class="text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              :style="{ background: primaryColor }"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Pending Account Modal -->
  <div v-if="showPendingPhoneModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="showPendingPhoneModal = false" />
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
      <div class="p-6">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0" :style="{ background: `${primaryColor}33` }">
            <svg class="w-6 h-6" :style="{ color: primaryColor }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ pendingPhoneIsActive ? 'Nummer bereits registriert' : 'Konto bereits angelegt' }}
            </h3>
            <p class="text-sm text-gray-600 mt-1">
              <span v-if="pendingPhoneFirstName">Hallo <strong>{{ pendingPhoneFirstName }}</strong>, dein</span>
              <span v-else>Dein</span>
              <span v-if="pendingPhoneIsActive">
                Konto ist bereits aktiv. Bitte melde dich direkt an.
              </span>
              <span v-else>
                Konto wurde bereits von {{ labels.businessNoun }} angelegt. Du kannst die Registrierung hier abschliessen — wir verknüpfen dein bestehendes Profil.
              </span>
            </p>
          </div>
        </div>

        <!-- Active account: show login link -->
        <div v-if="pendingPhoneIsActive" class="border rounded-lg p-4 mb-5 space-y-3" :style="{ background: `${primaryColor}15`, borderColor: `${primaryColor}33` }">
          <p class="text-sm" :style="{ color: primaryColor }">
            Diese Nummer gehört schon zu einem aktiven Konto. Melde dich an oder setze dein Passwort zurück.
          </p>
          <div class="flex gap-2 flex-wrap">
            <NuxtLink
              :to="loginHref"
              class="text-sm font-medium text-white px-3 py-1.5 rounded-md transition-colors"
              :style="{ background: primaryColor }"
            >
              Zum Login
            </NuxtLink>
            <NuxtLink
              :to="forgotPasswordHref"
              class="text-sm font-medium px-3 py-1.5 border rounded-md bg-white transition-colors"
              :style="{ color: primaryColor, borderColor: `${primaryColor}66` }"
            >
              Passwort vergessen?
            </NuxtLink>
          </div>
        </div>

        <!-- Pending account: continue here OR resend SMS -->
        <div v-else class="border rounded-lg p-4 mb-5 space-y-2" :style="{ background: `${primaryColor}15`, borderColor: `${primaryColor}33` }">
          <p class="text-sm" :style="{ color: primaryColor }">
            ✅ Am einfachsten: Formular hier ausfüllen und absenden — dein bestehender Eintrag wird ergänzt und aktiviert.
          </p>
          <p class="text-xs text-gray-600">
            Alternativ kannst du den Aktivierungslink erneut per SMS anfordern.
          </p>
        </div>

        <div v-if="pendingPhoneSmsError" class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-red-700">{{ pendingPhoneSmsError }}</p>
        </div>

        <div v-if="pendingPhoneSmsSent" class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-green-700">✅ SMS wurde gesendet! Bitte prüfe dein Handy.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            @click="showPendingPhoneModal = false"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {{ pendingPhoneIsActive ? 'Abbrechen' : 'Hier weiter registrieren' }}
          </button>

          <!-- Active account: go to login -->
          <NuxtLink
            v-if="pendingPhoneIsActive"
            :to="loginHref"
            class="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium text-center transition-colors"
            :style="{ background: primaryColor }"
          >
            Zum Login
          </NuxtLink>

          <!-- Pending account: optional SMS resend -->
          <button
            v-else-if="!pendingPhoneSmsSent"
            type="button"
            @click="resendOnboardingByPhone"
            :disabled="isSendingPendingPhoneSms"
            class="flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            :style="{ background: primaryColor }"
          >
            <svg v-if="isSendingPendingPhoneSms" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span>{{ isSendingPendingPhoneSms ? 'Wird gesendet...' : '📱 Link per SMS' }}</span>
          </button>
          <button
            v-else
            type="button"
            @click="showPendingPhoneModal = false"
            class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            OK, verstanden
          </button>
        </div>
      </div>

      <button
        @click="showPendingPhoneModal = false"
        class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { navigateTo, useRoute, useRouter, useRuntimeConfig, useHead } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useUIStore } from '~/stores/ui'
import { useTenant } from '~/composables/useTenant'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { useAffiliateRef } from '~/composables/useAffiliateRef'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { generateStrongPassword } from '~/composables/usePasswordStrength'
import { mergeTerminology, isDrivingSchoolBusinessType } from '~/composables/useTerminology'

const { primaryColor, accentColor } = useTenantBranding()

const route = useRoute()
const router = useRouter()
const { showError, showSuccess } = useUIStore()
const supabase = getSupabase()

// Get tenant slug from URL parameter
const tenantSlug = computed(() => route.params.tenant as string)
const loginHref = computed(() => (tenantSlug.value ? `/${tenantSlug.value}` : '/login'))
const forgotPasswordHref = computed(() =>
  tenantSlug.value ? `/${tenantSlug.value}?action=forgot` : '/login?forgot=1'
)

// Tenant Management
const { loadTenant, tenantId, currentTenant } = useTenant()

const businessType = computed(() => currentTenant.value?.business_type || 'driving_school')
const isDrivingSchool = computed(() => isDrivingSchoolBusinessType(businessType.value))
const labels = computed(() => mergeTerminology(businessType.value))

type RegistrationFieldMode = 'hidden' | 'optional' | 'required'

const bookingRequiredFields = ref<string[]>(['first_name', 'last_name', 'phone'])
const bookingOptionalFields = ref<string[]>(['email'])
const registrationCategoriesMode = ref<RegistrationFieldMode>('required')
const registrationLernfahrausweisMode = ref<RegistrationFieldMode>('optional')
const registrationProposalMode = ref<RegistrationFieldMode>('optional')
const registrationAccountMode = ref<'hidden' | 'required'>('required')

const isContactFieldVisible = (key: string) =>
  bookingRequiredFields.value.includes(key) || bookingOptionalFields.value.includes(key)

const isContactFieldRequired = (key: string) => bookingRequiredFields.value.includes(key)

async function loadRegistrationPolicy(slug: string) {
  try {
    const res = await $fetch<{
      success: boolean
      data?: {
        bookingPolicy?: {
          booking_required_fields?: string[]
          booking_optional_fields?: string[]
          registration_categories_mode?: RegistrationFieldMode
          registration_lernfahrausweis_mode?: RegistrationFieldMode
          registration_proposal_mode?: RegistrationFieldMode
          registration_account_mode?: 'hidden' | 'required'
        }
      }
    }>('/api/booking/get-booking-init', { query: { slug } })

    const policy = res?.data?.bookingPolicy
    if (!policy) return

    if (Array.isArray(policy.booking_required_fields)) {
      bookingRequiredFields.value = policy.booking_required_fields
    }
    if (Array.isArray(policy.booking_optional_fields)) {
      bookingOptionalFields.value = policy.booking_optional_fields
    }
    if (policy.registration_categories_mode) {
      registrationCategoriesMode.value = policy.registration_categories_mode
    }
    if (policy.registration_lernfahrausweis_mode) {
      registrationLernfahrausweisMode.value = policy.registration_lernfahrausweis_mode
    }
    if (policy.registration_proposal_mode) {
      registrationProposalMode.value = policy.registration_proposal_mode
    }
    if (policy.registration_account_mode) {
      registrationAccountMode.value = policy.registration_account_mode
    }
  } catch (e) {
    logger.warn('⚠️ Failed to load registration booking policy, using defaults:', e)
  }
}

// Get service type from URL parameter (empty = generic/interest registration, no Lernfahrausweis required)
const serviceType = ref(route.query.service as string || '')

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
const hibpStatus = ref<'idle' | 'checking' | 'pwned' | 'safe'>('idle')
const hibpCount = ref(0)
const zxcvbnScore = ref<0 | 1 | 2 | 3 | 4 | null>(null)
let hibpDebounceTimer: ReturnType<typeof setTimeout> | null = null

const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  formData.value.password = pw
  formData.value.confirmPassword = pw
  showPassword.value = true
  checkHibp(pw)
}

const checkHibp = async (password: string) => {
  // zxcvbn runs synchronously in the browser
  const { default: zxcvbn } = await import('zxcvbn')
  const result = zxcvbn(password)
  zxcvbnScore.value = result.score as 0 | 1 | 2 | 3 | 4

  // Only call HIBP if zxcvbn score is acceptable (≥ 2)
  if (result.score < 2) {
    hibpStatus.value = 'idle'
    return
  }

  hibpStatus.value = 'checking'
  try {
    const hibp = await $fetch<{ isPwned: boolean; count: number }>('/api/auth/check-password-pwned', {
      method: 'POST',
      body: { password }
    })
    hibpCount.value = hibp.count
    hibpStatus.value = hibp.isPwned ? 'pwned' : 'safe'
  } catch {
    hibpStatus.value = 'idle'
  }
}

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
  profession: '',
  categories: [] as string[],
  lernfahrausweisNr: '',
  
  // Account data
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const CONTACT_FORM_KEYS: Record<string, 'firstName' | 'lastName' | 'phone' | 'email' | 'birthDate' | 'street' | 'streetNr' | 'zip' | 'city' | 'profession'> = {
  first_name: 'firstName',
  last_name: 'lastName',
  phone: 'phone',
  email: 'email',
  birthdate: 'birthDate',
  street: 'street',
  street_nr: 'streetNr',
  zip: 'zip',
  city: 'city',
  profession: 'profession',
}

const contactFieldValue = (key: string): string => {
  const formKey = CONTACT_FORM_KEYS[key]
  if (!formKey) return ''
  return String(formData.value[formKey] || '').trim()
}

// Category type definition
interface Category {
  code: string
  name: string
  price: number
  adminFee?: number
  duration?: number
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
  return (
    !isAdminRegistration.value &&
    isDrivingSchool.value &&
    registrationLernfahrausweisMode.value !== 'hidden'
  )
})

const lernfahrausweisRequired = computed(() =>
  requiresLernfahrausweis.value && registrationLernfahrausweisMode.value === 'required'
)

/** Categories to show LFA upload for; fallback when none selected yet */
const lfaUploadCategories = computed(() => {
  if (formData.value.categories.length > 0) return formData.value.categories
  return ['general']
})

const showCategorySelection = computed(() => {
  return (
    !isAdminRegistration.value &&
    registrationCategoriesMode.value !== 'hidden' &&
    availableCategories.value.length > 0
  )
})

const categoriesRequired = computed(() =>
  showCategorySelection.value && registrationCategoriesMode.value === 'required'
)

const categoryDropdownOpen = ref(false)
const categoryDropdownRef = ref<HTMLElement | null>(null)

const categoryLabel = (code: string) =>
  availableCategories.value.find(c => c.code === code)?.name || code

const categoryDropdownLabel = computed(() => {
  if (formData.value.categories.length === 0) {
    return 'Kategorie wählen…'
  }
  if (formData.value.categories.length === 1) {
    return categoryLabel(formData.value.categories[0])
  }
  return `${formData.value.categories.length} Kategorien gewählt`
})

const toggleCategory = (code: string) => {
  const idx = formData.value.categories.indexOf(code)
  if (idx >= 0) {
    formData.value.categories.splice(idx, 1)
  } else {
    formData.value.categories.push(code)
  }
  categoryDropdownOpen.value = false
}

const onCategoryDropdownClickOutside = (event: MouseEvent) => {
  const el = categoryDropdownRef.value
  if (el && event.target instanceof Node && !el.contains(event.target)) {
    categoryDropdownOpen.value = false
  }
}

const showProposalSection = computed(() =>
  !isAdminRegistration.value && registrationProposalMode.value !== 'hidden'
)

const proposalRequired = computed(() =>
  showProposalSection.value && registrationProposalMode.value === 'required'
)

const weekDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const selectedDays = ref<number[]>([])
const timeSlots = ref<Map<number, Array<{ start_time: string; end_time: string }>>>(new Map())
const timeSlotsVersion = ref(0)
const proposalNotes = ref('')

const bumpTimeSlots = () => { timeSlotsVersion.value += 1 }

const toggleDay = (dayIndex: number) => {
  if (selectedDays.value.includes(dayIndex)) {
    removeDay(dayIndex)
  } else {
    selectedDays.value.push(dayIndex)
    selectedDays.value.sort((a, b) => a - b)
    if (!timeSlots.value.has(dayIndex)) {
      timeSlots.value.set(dayIndex, [{ start_time: '09:00', end_time: '17:00' }])
    }
    bumpTimeSlots()
  }
}

const removeDay = (dayIndex: number) => {
  selectedDays.value = selectedDays.value.filter(d => d !== dayIndex)
  timeSlots.value.delete(dayIndex)
  bumpTimeSlots()
}

const getTimeSlotsForDay = (dayIndex: number) => {
  void timeSlotsVersion.value
  return timeSlots.value.get(dayIndex) || []
}

const addTimeSlot = (dayIndex: number) => {
  const slots = timeSlots.value.get(dayIndex) || []
  slots.push({ start_time: '09:00', end_time: '17:00' })
  timeSlots.value.set(dayIndex, slots)
  bumpTimeSlots()
}

const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
  const slots = timeSlots.value.get(dayIndex) || []
  slots.splice(slotIndex, 1)
  if (slots.length === 0) {
    removeDay(dayIndex)
  } else {
    timeSlots.value.set(dayIndex, slots)
    bumpTimeSlots()
  }
}

const buildPreferredTimeSlots = () => {
  const preferred: Array<{ day_of_week: number; start_time: string; end_time: string }> = []
  selectedDays.value.forEach((dayIndex) => {
    const slots = timeSlots.value.get(dayIndex) || []
    slots.forEach((slot) => {
      preferred.push({
        day_of_week: dayIndex,
        start_time: slot.start_time,
        end_time: slot.end_time,
      })
    })
  })
  return preferred
}

const hasValidTimeSlots = computed(() => {
  void timeSlotsVersion.value
  if (selectedDays.value.length === 0) return false
  return selectedDays.value.every((dayIndex) => {
    const slots = timeSlots.value.get(dayIndex) || []
    return slots.length > 0 && slots.every(s => s.start_time && s.end_time && s.start_time < s.end_time)
  })
})

const hasAnyProposalInput = computed(() =>
  selectedDays.value.length > 0 || !!proposalNotes.value.trim()
)

const showAccountStep = computed(() =>
  isAdminRegistration.value || registrationAccountMode.value === 'required'
)

const maxSteps = computed(() => {
  if (isAdminRegistration.value) return 2
  let steps = 1
  if (requiresLernfahrausweis.value) steps += 1
  if (showAccountStep.value) steps += 1
  return steps
})

const canProceed = computed(() => {
  return !proceedBlockReason.value
})

const proceedBlockReason = computed(() => {
  if (phoneExistsBlocked.value) {
    return 'Diese Telefonnummer ist bereits registriert.'
  }

  if (currentStep.value === 1) {
    if (isAdminRegistration.value) {
      if (!(formData.value.firstName && formData.value.lastName &&
             formData.value.phone && formData.value.email &&
             formData.value.street && formData.value.streetNr &&
             formData.value.zip && formData.value.city)) {
        return 'Bitte alle Pflichtfelder ausfüllen.'
      }
      return ''
    }

    // Email is collected on the Account step when login is enabled
    const requiredKeys = bookingRequiredFields.value.filter(
      key => !(key === 'email' && showAccountStep.value)
    )
    const missing = requiredKeys.filter(key => !contactFieldValue(key))
    if (missing.length) {
      const labels: Record<string, string> = {
        first_name: 'Vorname', last_name: 'Nachname', phone: 'Telefon', email: 'E-Mail',
        birthdate: 'Geburtsdatum', street: 'Strasse', street_nr: 'Hausnummer',
        zip: 'PLZ', city: 'Ort', profession: 'Beruf',
      }
      return `Bitte noch ausfüllen: ${missing.map(k => labels[k] || k).join(', ')}`
    }
    if (fieldErrors.value.phone) return fieldErrors.value.phone
    if (fieldErrors.value.birthDate) return fieldErrors.value.birthDate
    if (fieldErrors.value.zip) return fieldErrors.value.zip
    if (categoriesRequired.value && formData.value.categories.length === 0) {
      return 'Bitte mindestens eine Kategorie wählen.'
    }
    if (proposalRequired.value && !hasValidTimeSlots.value) {
      return 'Bitte bevorzugte Tage und gültige Zeitfenster wählen.'
    }
    if (!proposalRequired.value && selectedDays.value.length > 0 && !hasValidTimeSlots.value) {
      return 'Bitte Zeitfenster prüfen (Start vor Ende).'
    }
    return ''
  }
  if (currentStep.value === 2 && requiresLernfahrausweis.value) {
    if (lernfahrausweisRequired.value && !lfaUploadCategories.value.every(cat => !!uploadedDocuments.value[cat])) {
      return 'Bitte Lernfahrausweis hochladen.'
    }
  }
  return ''
})

const canSubmit = computed(() => {
  if (!showAccountStep.value) {
    return canProceed.value
  }
  return !!(formData.value.email &&
         formData.value.password &&
         formData.value.confirmPassword === formData.value.password &&
         formData.value.acceptTerms &&
         passwordIsValid.value)
})

const passwordChecks = computed(() => ({
  length: formData.value.password.length >= 12,
}))

const passwordIsValid = computed(() => {
  return passwordChecks.value.length &&
         (zxcvbnScore.value === null || zxcvbnScore.value >= 2) &&
         hibpStatus.value !== 'pwned' &&
         hibpStatus.value !== 'checking'
})

// Field-specific errors
const fieldErrors = ref<Record<string, string>>({
  email: '',
  password: '',
  phone: '',
  birthDate: '',
  firstName: '',
  lastName: '',
  zip: ''
})

const isCheckingEmail = ref(false)
const emailIsPending = ref(false)
const isResendingPendingEmailSms = ref(false)
const pendingEmailSmsSent = ref(false)

// Phone pending check state
const isCheckingPhone = ref(false)
const phoneExistsBlocked = ref(false)
const showPendingPhoneModal = ref(false)
const pendingPhoneFirstName = ref<string | null>(null)
const pendingPhoneIsActive = ref(false)
const isSendingPendingPhoneSms = ref(false)
const pendingPhoneSmsSent = ref(false)
const pendingPhoneSmsError = ref('')

// Validation functions
let emailCheckTimeout: ReturnType<typeof setTimeout>

const validateEmail = async () => {
  emailIsPending.value = false
  pendingEmailSmsSent.value = false
  if (!formData.value.email) {
    fieldErrors.value.email = ''
    isCheckingEmail.value = false
    return
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.value.email)) {
    fieldErrors.value.email = 'Ungültige E-Mail-Adresse'
    isCheckingEmail.value = false
    return
  }
  
  // Clear previous timeout
  clearTimeout(emailCheckTimeout)
  
  // Set checking state
  isCheckingEmail.value = true
  
  // Debounce the check (wait 500ms after user stops typing)
  emailCheckTimeout = setTimeout(async () => {
    try {
      const response = await fetch('/api/auth/check-email-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.value.email.toLowerCase().trim(),
          tenantId: activeTenantId.value || tenantId.value
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        fieldErrors.value.email = 'Fehler beim Prüfen der E-Mail'
        isCheckingEmail.value = false
        return
      }
      
      if (data.exists && data.isPending) {
        // Manually-added user who hasn't completed registration yet
        fieldErrors.value.email = ''
        emailIsPending.value = true
        pendingEmailSmsSent.value = false
      } else if (data.exists) {
        fieldErrors.value.email = '✗ Diese E-Mail-Adresse ist bereits registriert'
        emailIsPending.value = false
      } else {
        fieldErrors.value.email = ''
        emailIsPending.value = false
      }
    } catch (err: any) {
      console.warn('⚠️ Email check failed:', err)
      // Don't show error - just allow submission
      fieldErrors.value.email = ''
    } finally {
      isCheckingEmail.value = false
    }
  }, 500)
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

const birthdateDay = ref('')
const birthdateMonth = ref('')
const birthdateYear = ref('')
const birthdateYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear - 14; y >= currentYear - 100; y--) years.push(y)
  return years
})

const syncBirthDateFromParts = () => {
  if (birthdateDay.value && birthdateMonth.value && birthdateYear.value) {
    formData.value.birthDate = `${birthdateYear.value}-${birthdateMonth.value}-${birthdateDay.value}`
    validateBirthDate()
  } else {
    formData.value.birthDate = ''
    fieldErrors.value.birthDate = ''
  }
}

watch(() => formData.value.birthDate, (val) => {
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split('-')
    if (!birthdateYear.value) birthdateYear.value = y
    if (!birthdateMonth.value) birthdateMonth.value = m
    if (!birthdateDay.value) birthdateDay.value = d
  }
}, { immediate: true })

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
const normalizePhone = async () => {
  let phone = formData.value.phone.replace(/[^0-9+]/g, '')
  
  if (phone.startsWith('0') && phone.length === 10) {
    phone = '+41' + phone.substring(1)
  } else if (phone.startsWith('41') && phone.length === 11) {
    phone = '+' + phone
  }
  
  formData.value.phone = phone
  validatePhone()

  // Only check if format is valid
  const phoneRegex = /^\+41[0-9]{9}$/
  if (!phoneRegex.test(phone)) return

  const tid = activeTenantId.value || tenantId.value
  if (!tid) return

  isCheckingPhone.value = true
  try {
    const res = await $fetch('/api/auth/check-phone-exists', {
      method: 'POST',
      body: { phone, tenantId: tid },
    }) as any

    if (res.isPending) {
      // Pending invite without auth — allow claiming via this form (don't block)
      phoneExistsBlocked.value = false
      pendingPhoneFirstName.value = res.firstName || null
      pendingPhoneSmsSent.value = false
      pendingPhoneSmsError.value = ''
      pendingPhoneIsActive.value = false
      showPendingPhoneModal.value = true
    } else if (res.isActive || res.isStaffOrAdmin) {
      phoneExistsBlocked.value = true
      pendingPhoneFirstName.value = res.firstName || null
      pendingPhoneSmsSent.value = false
      pendingPhoneSmsError.value = ''
      pendingPhoneIsActive.value = true
      showPendingPhoneModal.value = true
    } else {
      phoneExistsBlocked.value = false
    }
    // Silent fail — don't block registration on check errors
  } finally {
    isCheckingPhone.value = false
  }
}

const resendOnboardingByPhone = async () => {
  isSendingPendingPhoneSms.value = true
  pendingPhoneSmsError.value = ''
  try {
    const tid = activeTenantId.value || tenantId.value
    await $fetch('/api/auth/resend-onboarding-by-phone', {
      method: 'POST',
      body: { phone: formData.value.phone, tenantId: tid },
    })
    pendingPhoneSmsSent.value = true
  } catch (err: any) {
    pendingPhoneSmsError.value = err?.data?.statusMessage || `SMS konnte nicht gesendet werden. Bitte kontaktiere ${labels.value.businessNoun}.`
  } finally {
    isSendingPendingPhoneSms.value = false
  }
}

// Resend onboarding SMS when email belongs to a pending (manually-added) user.
// The API looks up the user by phone; staff always receive a phone number when added.
const resendOnboardingByEmailUser = async () => {
  if (!formData.value.phone) {
    return
  }
  let phone = formData.value.phone.replace(/\s/g, '')
  if (phone.startsWith('0') && !phone.startsWith('00')) {
    phone = '+41' + phone.substring(1)
  } else if (!phone.startsWith('+')) {
    phone = '+41' + phone
  }
  isResendingPendingEmailSms.value = true
  try {
    const tid = activeTenantId.value || tenantId.value
    await $fetch('/api/auth/resend-onboarding-by-phone', {
      method: 'POST',
      body: { phone, tenantId: tid },
    })
    pendingEmailSmsSent.value = true
  } catch (err: any) {
    console.warn('Could not send onboarding SMS:', err)
    pendingEmailSmsSent.value = true // show success anyway (security — don't reveal if phone exists)
  } finally {
    isResendingPendingEmailSms.value = false
  }
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < maxSteps.value) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
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
  
  try {
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
    const { getStoredRefCode, clearRefCode } = useAffiliateRef()
    const refCode = getStoredRefCode()
    const pendingOnly = !showAccountStep.value
    const response = await fetch('/api/auth/register-client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: formData.value.firstName.trim(),
        lastName: formData.value.lastName.trim(),
        email: formData.value.email.trim().toLowerCase() || null,
        password: pendingOnly ? undefined : formData.value.password,
        phone: formData.value.phone?.trim() || null,
        birthDate: formData.value.birthDate || null,
        street: formData.value.street?.trim() || null,
        streetNr: formData.value.streetNr?.trim() || null,
        zip: formData.value.zip?.trim() || null,
        city: formData.value.city?.trim() || null,
        profession: formData.value.profession?.trim() || null,
        categories: formData.value.categories || null,
        lernfahrausweisNr: formData.value.lernfahrausweisNr?.trim() || null,
        tenantId: activeTenantId,
        isAdmin: isAdminRegistration.value,
        referredByCode: refCode || null,
        pendingOnly,
      })
    })
    if (refCode) clearRefCode()
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.statusMessage || 'Fehler bei der Registrierung')
    }
    
    logger.debug('✅ User registered successfully:', data.userId)

    // Create booking proposal with preferred times/notes when configured
    if (
      showProposalSection.value &&
      data.userId &&
      (proposalRequired.value || hasAnyProposalInput.value)
    ) {
      try {
        const slots = buildPreferredTimeSlots()
        const notes = proposalNotes.value.trim()
        if (slots.length > 0 || notes) {
          await $fetch('/api/booking/submit-general-inquiry', {
            method: 'POST',
            body: {
              tenant_id: activeTenantId,
              first_name: formData.value.firstName.trim(),
              last_name: formData.value.lastName.trim(),
              email: formData.value.email.trim().toLowerCase(),
              phone: formData.value.phone?.trim() || null,
              street: formData.value.street?.trim() || null,
              street_nr: formData.value.streetNr?.trim() || null,
              zip: formData.value.zip?.trim() || null,
              city: formData.value.city?.trim() || null,
              birthdate: formData.value.birthDate || null,
              profession: formData.value.profession?.trim() || null,
              // No category_code: avoids location_id requirement on tenants with "locations" intake
              preferred_time_slots: slots,
              notes: [
                notes || (slots.length ? 'Terminwunsch bei Registrierung' : ''),
                formData.value.categories?.length
                  ? `Kategorien: ${formData.value.categories.join(', ')}`
                  : '',
              ].filter(Boolean).join('\n'),
              created_by_user_id: data.userId,
              location_intake_mode: 'callback',
              skip_customer_email: pendingOnly,
            },
          })
          logger.debug('✅ Booking proposal created from registration')
        }
      } catch (proposalErr: any) {
        logger.warn('⚠️ Registration proposal failed (non-critical):', proposalErr?.message || proposalErr)
      }
    }
    
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

    const apiMessage =
      error?.data?.statusMessage ||
      error?.statusMessage ||
      error?.data?.message ||
      error?.message ||
      ''
    const errorCode = error?.data?.data?.code || error?.data?.code
    let errorMessage = apiMessage || 'Unbekannter Fehler bei der Registrierung'
    let errorTitle = 'Registrierung fehlgeschlagen'

    // Spezifische Fehlermeldungen
    if (
      error.statusCode === 409 ||
      errorCode === 'DUPLICATE_EMAIL' ||
      errorCode === 'DUPLICATE_PHONE' ||
      /duplicate key|already registered|already exists|bereits registriert/i.test(errorMessage)
    ) {
      if (errorCode === 'DUPLICATE_PHONE' || /telefon|phone|nummer/i.test(errorMessage)) {
        errorTitle = 'Telefonnummer bereits registriert'
        errorMessage = 'Diese Telefonnummer gehört schon zu einem aktiven Konto. Bitte melde dich an oder setze dein Passwort zurück.'
        phoneExistsBlocked.value = true
        pendingPhoneIsActive.value = true
        showPendingPhoneModal.value = true
      } else {
        errorTitle = 'E-Mail bereits registriert'
        errorMessage = 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder setze dein Passwort zurück.'
        fieldErrors.value.email = '✗ Diese E-Mail-Adresse ist bereits registriert'
        emailIsPending.value = false
      }
    } else if (errorMessage.includes('Invalid email') || /ungültige e-mail/i.test(errorMessage)) {
      errorMessage = 'Ungültige E-Mail-Adresse. Bitte prüfe deine Eingabe.'
    } else if (errorMessage.includes('Password') || errorMessage.includes('weak password') || errorMessage.includes('Passwort') || errorMessage.includes('nicht erlaubtes Muster')) {
      // Show password error directly at the field, not as a modal
      fieldErrors.value.password = errorMessage.includes('nicht erlaubtes Muster')
        ? 'Passwort enthält ein nicht erlaubtes Muster (z.B. 3× gleiche Zeichen oder ein bekanntes Standard-Passwort).'
        : 'Passwort erfüllt die Sicherheitsanforderungen nicht. Bitte alle Kriterien beachten.'
      isSubmitting.value = false
      return
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

// Load categories from database WITH PRICING RULES (main/sub logic via API)
const loadCategories = async () => {
  try {
    const tid = tenantId.value || currentTenant.value?.id
    if (!tid) {
      logger.debug('⚠️ loadCategories: no tenant ID yet, skipping')
      return
    }

    logger.debug('🏢 Loading categories for tenant:', tid)

    const result = await $fetch<{ success: boolean; categories: any[] }>(
      `/api/booking/get-categories-with-pricing?tenant_id=${tid}`
    )

    if (result?.success && result.categories.length > 0) {
      availableCategories.value = result.categories.map(cat => ({
        code: cat.code,
        name: cat.name,
        price: cat.price_chf ? parseFloat(cat.price_chf) : 0,
        adminFee: cat.admin_fee_chf ? parseFloat(cat.admin_fee_chf) : 0,
        duration: cat.lesson_duration_minutes || 45,
      }))
      logger.debug('✅ Categories loaded from API:', availableCategories.value.length)
    } else {
      logger.debug('ℹ️ No categories returned from API, keeping fallback list')
    }
  } catch (error) {
    console.error('❌ Error loading categories:', error)
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
  if (process.client) {
    document.addEventListener('click', onCategoryDropdownClickOutside)
  }

  // Redirect affiliate links to the new lightweight landing page
  const refCode = route.query.ref as string | undefined
  if (refCode && route.params.tenant) {
    await navigateTo(`/ref/${route.params.tenant}?ref=${refCode}`, { replace: true })
    return
  }

  // ✅ NEW: Redirect if already logged in
  const authStore = useAuthStore()
  if (authStore.isLoggedIn) {
    logger.info('ℹ️ User already logged in, redirecting to dashboard')
    // Redirect to appropriate dashboard based on role
    if (authStore.isAdmin) {
      await navigateTo('/admin/dashboard')
    } else if (authStore.isStaff) {
      await navigateTo('/dashboard')
    } else {
      await navigateTo('/customer-dashboard')
    }
    return
  }

  // Restore form data from localStorage immediately (sync, no delay)
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

  // Load categories immediately (no await needed)
  loadCategories()

  // Run async tasks in parallel (non-blocking for form display)
  const asyncTasks: Promise<void>[] = []

  if (tenantSlug.value) {
    logger.debug('🏢 Loading tenant from URL parameter:', tenantSlug.value)
    asyncTasks.push(
      loadTenant(tenantSlug.value).catch((error) => {
        console.warn('⚠️ Failed to load tenant, but continuing with slug:', error)
      })
    )
    asyncTasks.push(loadRegistrationPolicy(tenantSlug.value))
  }

  await Promise.allSettled(asyncTasks)
})

onBeforeUnmount(() => {
  if (process.client) {
    document.removeEventListener('click', onCategoryDropdownClickOutside)
  }
})

// Clear password field error when user types a new password
watch(() => formData.value.password, (newPw) => {
  if (fieldErrors.value.password) fieldErrors.value.password = ''
  zxcvbnScore.value = null
  hibpStatus.value = 'idle'
  // Debounced check (wait 800ms after user stops typing)
  if (hibpDebounceTimer) clearTimeout(hibpDebounceTimer)
  if (newPw.length >= 12) {
    hibpDebounceTimer = setTimeout(() => checkHibp(newPw), 800)
  }
})

// Watch for service type changes and reload categories
watch(serviceType, (newValue, oldValue) => {
  if (oldValue !== undefined && newValue !== oldValue) {
    logger.debug('🔄 Service type changed from', oldValue, 'to', newValue, '- reloading categories')
    loadCategories()
  }
})

// Reload categories once tenantId is known (async tenant loading)
watch(
  () => tenantId.value || currentTenant.value?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      logger.debug('🔄 Tenant ID resolved:', newId, '- loading categories')
      loadCategories()
    }
  }
)

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

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #111827);
  border-color: var(--color-primary, #111827);
}
.tenant-hover-border:hover {
  border-color: var(--color-primary, #111827);
}
.tenant-toggle {
  --tw-ring-color: color-mix(in srgb, var(--color-primary, #111827) 40%, transparent);
}
.peer:checked ~ .tenant-toggle {
  background-color: var(--color-primary, #111827);
}
</style>
