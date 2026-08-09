<!-- pages/tenant-register.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center p-3 sm:p-6"
    :style="{ background: pageBackground }">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">

      <!-- Header -->
      <div class="relative text-white px-6 py-6 sm:px-10 sm:py-8 overflow-hidden"
        :style="{ background: `linear-gradient(135deg, ${formData.primary_color || '#3B82F6'}, ${formData.secondary_color || '#6366F1'})` }">
        <div class="relative z-10 flex items-center gap-4">
          <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img v-if="logoSquarePreview" :src="logoSquarePreview" alt="Logo" class="w-full h-full object-cover" />
            <svg v-else class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-bold tracking-tight">{{ isWebsiteMode ? 'Website-Kunde anlegen' : `${labels.businessNoun} registrieren` }}</h1>
            <p class="text-blue-200 text-xs sm:text-sm mt-0.5">{{ isWebsiteMode ? 'Kundendaten erfassen – Website wird automatisch generiert' : `${labels.businessNoun} auf Autopilot – in wenigen Minuten startklar` }}</p>
          </div>
        </div>
        <div class="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full pointer-events-none"></div>
        <div class="absolute right-12 bottom-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 pointer-events-none"></div>
      </div>

      <!-- Progress Indicator -->
      <div v-if="currentStep < LOADING_STEP" class="px-6 sm:px-10 pt-5 pb-2 border-b border-gray-100">
        <div class="hidden sm:flex justify-between text-xs mb-2.5 px-0.5">
          <span v-for="(step, i) in steps" :key="step.id" class="flex-1 text-center truncate px-1 font-medium transition-colors"
            :class="[i < visibleStepIndex ? 'text-green-600 cursor-pointer hover:opacity-70' : i === visibleStepIndex ? '' : 'text-gray-400']"
            :style="i === visibleStepIndex ? { color: formData.primary_color || '#2563EB' } : {}"
            @click="i < visibleStepIndex ? currentStep = step.id : undefined">
            {{ step.title }}
          </span>
        </div>
        <div class="flex items-center">
          <template v-for="(step, index) in steps" :key="step.id">
            <div
              @click="index < visibleStepIndex ? currentStep = step.id : undefined"
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0 z-10"
              :class="[
                index < visibleStepIndex  ? 'text-white cursor-pointer hover:opacity-80' :
                index === visibleStepIndex ? 'text-white ring-4' :
                                        'bg-gray-100 text-gray-400 cursor-not-allowed'
              ]"
              :style="index < visibleStepIndex
                ? { backgroundColor: formData.secondary_color || '#10B981' }
                : index === visibleStepIndex
                  ? { backgroundColor: formData.primary_color || '#3B82F6', '--tw-ring-color': (formData.primary_color || '#3B82F6') + '30' }
                  : {}"
              :title="index < visibleStepIndex ? `Zurück zu: ${step.title}` : undefined"
            >
              <svg v-if="index < visibleStepIndex" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div v-if="index < steps.length - 1" class="flex-1 h-0.5 transition-all duration-500"
              :class="index < visibleStepIndex ? '' : 'bg-gray-200'"
              :style="index < visibleStepIndex ? { backgroundColor: formData.secondary_color || '#10B981' } : {}"></div>
          </template>
        </div>
        <p class="sm:hidden text-xs text-center font-medium mt-2" :style="{ color: formData.primary_color || '#2563EB' }">
          Schritt {{ visibleStepIndex + 1 }}/{{ steps.length }} – {{ steps[visibleStepIndex]?.title }}
        </p>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="submitRegistration" class="px-6 sm:px-10 py-6 sm:py-8">

        <!-- ═══ STEP 0: Grunddaten ═══ -->
        <div v-if="currentStep === 0" class="space-y-8">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-4">Deine Branche</h2>
            <div class="max-w-sm">
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Geschäftstyp *</label>
              <select v-model="formData.business_type" required
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
                <option value="" disabled>Bitte wählen…</option>
                <option v-for="bt in businessTypes" :key="bt.code" :value="bt.code">{{ bt.name }}</option>
              </select>
            </div>
          </div>

          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-1">Firmen-Daten</h2>
            <p class="text-sm text-gray-500 mb-4">Wie soll dein Unternehmen heissen und wo ist es erreichbar?</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Firmen-Name *</label>
                <input v-model="formData.name" type="text" required :placeholder="`z.B. ${labels.businessNoun} Muster`"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Rechtlicher Name (für Rechnungen) *</label>
                <input v-model="formData.legal_company_name" type="text" required :placeholder="`z.B. ${labels.businessNoun} Muster GmbH`"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm"
                  @input="legalNameManuallyEdited = true">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">URL-Kennung *</label>
                <div class="flex items-stretch rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <span class="hidden sm:flex items-center px-3 bg-gray-100 text-gray-500 text-xs font-mono border-r border-gray-200 whitespace-nowrap">simy.ch/</span>
                  <input v-model="formData.slug" type="text" required :placeholder="slugPlaceholder"
                    pattern="[a-z0-9\-]+"
                    class="flex-1 px-4 py-2.5 bg-gray-50 focus:bg-white outline-none text-sm"
                    @input="sanitizeSlug(); onSlugInput()"
                    @blur="finalizeSlug">
                </div>
                <p class="text-xs text-gray-400 mt-1">Nur Kleinbuchstaben, Zahlen und Bindestriche</p>
                <!-- Slug availability feedback -->
                <p v-if="slugCheck === 'checking'" class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Wird geprüft…
                </p>
                <p v-else-if="slugCheck === 'available'" class="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  simy.ch/{{ formData.slug }} ist verfügbar
                </p>
                <p v-else-if="slugCheck === 'reserved'" class="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  Diese URL-Kennung ist reserviert – bitte eine andere wählen
                </p>
                <p v-else-if="slugCheck === 'taken'" class="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  Diese URL ist bereits vergeben – bitte eine andere wählen
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-1">Kontaktperson & Login</h2>
            <p class="text-sm text-gray-500 mb-4">Kontaktdaten für Rechnungen – und dein persönlicher Admin-Login.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Vorname *</label>
                <input v-model="formData.contact_person_first_name" type="text" required placeholder="Max"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Nachname *</label>
                <input v-model="formData.contact_person_last_name" type="text" required placeholder="Mustermann"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Telefon *</label>
                <input v-model="formData.contact_phone" type="tel" required placeholder="+41 44 123 45 67"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <!-- Primäre E-Mail – wird für Login, Kontakt & Versand verwendet -->
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  E-Mail *
                  <span class="normal-case font-normal text-gray-400 ml-1">– für Login, Kontakt & E-Mail-Versand</span>
                </label>
                <input
                  v-model="adminEmailEarly"
                  type="email"
                  required
                  placeholder="dein@login.ch"
                  @blur="checkAdminEmail(adminEmailEarly)"
                  @input="onAdminEmailInput(adminEmailEarly)"
                  :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm',
                    emailCheck === 'taken'     ? 'border-red-300 focus:ring-red-400' :
                    emailCheck === 'available' ? 'border-green-300 focus:ring-green-400' :
                    'border-gray-200 focus:ring-blue-500']"
                >
                <p v-if="emailCheck === 'checking'" class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Wird geprüft…
                </p>
                <p v-else-if="emailCheck === 'available'" class="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  E-Mail ist verfügbar
                </p>
                <p v-else-if="emailCheck === 'taken'" class="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  Diese E-Mail ist bereits registriert —
                  <a href="/login" class="underline font-medium">Einloggen</a>
                </p>
                <p v-else-if="emailCheck === 'error'" class="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg>
                  Prüfung nicht möglich — du kannst trotzdem fortfahren
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-1">Adresse</h2>
            <p class="text-sm text-gray-500 mb-4">Wird als Standard für deinen ersten Standort vorausgefüllt.</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2 grid grid-cols-3 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Strasse *</label>
                  <input v-model="formData.street" type="text" required placeholder="Musterstrasse"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Nr. *</label>
                  <input v-model="formData.streetNr" type="text" required placeholder="12"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">PLZ *</label>
                <input v-model="formData.zip" type="text" required pattern="[0-9]{4}" placeholder="8000"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Ort *</label>
                <input v-model="formData.city" type="text" required placeholder="Zürich"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
            </div>
          </div>

          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-4">Weitere Angaben</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Sprache</label>
                <select v-model="formData.language"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="it">Italiano</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">UID-Nummer</label>
                <input v-model="formData.uid_number" type="text" placeholder="CHE-123.456.789"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Anzahl {{ labels.staffPlural }}</label>
                <input v-model="formData.staff_count" type="number" min="1" max="999" placeholder="1"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Website</label>
                <input v-model="formData.website_url" type="url" placeholder="https://www.ihre-firma.ch"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 1: Kategorien ═══ -->
        <div v-if="currentStep === 1" class="space-y-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-semibold text-gray-900 mb-0.5">Welche {{ labels.categoriesLabel }} bietest du an?</h2>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="categoriesLoading" class="flex flex-col items-center justify-center py-16 gap-3">
            <div class="relative w-12 h-12">
              <div class="absolute inset-0 rounded-full border-4 border-blue-100"></div>
              <div class="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <p class="text-sm text-gray-500 font-medium">{{ labels.categoriesLabel }} werden geladen…</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="templateCategories.length === 0"
            class="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl bg-amber-50 border border-amber-200">
            <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            <p class="text-sm font-medium text-amber-800">Keine Vorlagen gefunden</p>
            <p class="text-xs text-amber-600">{{ labels.categoriesLabel }} können nach der Registrierung hinzugefügt werden.</p>
          </div>

          <!-- Category grid -->
          <div v-else class="space-y-5">
            <!-- Select all / deselect all -->
            <div class="flex items-center justify-end gap-3">
              <button type="button" @click="selectAllCategories"
                class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                Alle auswählen
              </button>
              <span class="text-gray-200 text-lg leading-none">|</span>
              <button type="button" @click="deselectAllCategories"
                class="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50">
                Alle abwählen
              </button>
            </div>

            <!-- Parent category cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="cat in templateCategories"
                :key="cat.id"
                type="button"
                @click="toggleCategory(cat.id)"
                class="relative group rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md focus:outline-none"
                :class="selectedCategoryIds.has(cat.id)
                  ? 'shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:-translate-y-0.5'"
                :style="selectedCategoryIds.has(cat.id)
                  ? { borderColor: cat.color || '#3b82f6', backgroundColor: (cat.color || '#3b82f6') + '12' }
                  : {}"
              >
                <!-- Checkmark badge -->
                <div class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
                  :class="selectedCategoryIds.has(cat.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
                  :style="{ backgroundColor: cat.color || '#3b82f6' }">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>

                <!-- SVG Icon -->
                <div v-if="cat.icon_svg"
                  class="mb-3 h-8 w-full flex items-center [&_svg]:h-7 [&_svg]:w-auto [&_svg]:max-w-full"
                  v-html="DOMPurify.sanitize(cat.icon_svg, { USE_PROFILES: { svg: true } })">
                </div>
                <div v-else class="mb-3 w-8 h-8 rounded-lg flex items-center justify-center"
                  :style="{ backgroundColor: (cat.color || '#6b7280') + '20' }">
                  <svg class="w-4 h-4" :style="{ color: cat.color || '#6b7280' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                  </svg>
                </div>

                <!-- Name -->
                <p class="font-semibold text-sm text-gray-900 leading-snug mb-1.5">{{ cat.name }}</p>

                <!-- Code badge -->
                <span v-if="cat.code"
                  class="inline-block text-xs font-bold px-2 py-0.5 rounded-lg text-white"
                  :style="{ backgroundColor: cat.color || '#6b7280' }">
                  {{ cat.code }}
                </span>

                <!-- Children hint (only if NOT yet selected) -->
                <p v-if="cat.children?.length && !selectedCategoryIds.has(cat.id)" class="mt-2 text-xs text-gray-400">
                  +{{ cat.children.length }} Unterkategorien
                </p>
                <!-- Children selected count (if selected) -->
                <p v-else-if="cat.children?.length && selectedCategoryIds.has(cat.id)" class="mt-2 text-xs font-medium"
                  :style="{ color: cat.color || '#3b82f6' }">
                  {{ cat.children.filter(c => selectedCategoryIds.has(c.id)).length }}/{{ cat.children.length }} Subs
                </p>
              </button>
            </div>

            <!-- Sub-categories: shown inline below grid, one block per selected parent with children -->
            <template v-for="cat in templateCategories" :key="'subs-' + cat.id">
              <transition
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="(cat.children?.length || customSubsOf(cat.id).length) && selectedCategoryIds.has(cat.id)"
                  class="rounded-2xl border-2 overflow-hidden"
                  :style="{ borderColor: (cat.color || '#3b82f6') + '40' }">
                  <!-- Header -->
                  <div class="flex items-center justify-between px-4 py-2.5"
                    :style="{ backgroundColor: (cat.color || '#3b82f6') + '10' }">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color || '#3b82f6' }"></span>
                      <p class="text-xs font-bold uppercase tracking-wide" :style="{ color: cat.color || '#3b82f6' }">
                        {{ cat.code }} – Unterkategorien wählen
                      </p>
                    </div>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      :style="{ backgroundColor: cat.color || '#3b82f6' }">
                      {{ [...(cat.children || []).map(c => c.id), ...customSubsOf(cat.id).map(c => c.tempId)].filter(id => selectedCategoryIds.has(id)).length }}/{{ (cat.children?.length || 0) + customSubsOf(cat.id).length }}
                    </span>
                  </div>
                  <!-- Child pills -->
                  <div class="flex flex-wrap gap-2 p-4">
                    <button
                      v-for="child in cat.children"
                      :key="child.id"
                      type="button"
                      @click="toggleCategory(child.id)"
                      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all duration-150 focus:outline-none"
                      :class="selectedCategoryIds.has(child.id)
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-white text-gray-600 hover:border-gray-300'"
                      :style="selectedCategoryIds.has(child.id)
                        ? { backgroundColor: child.color || cat.color || '#3b82f6', borderColor: child.color || cat.color || '#3b82f6' }
                        : { borderColor: (cat.color || '#3b82f6') + '40' }"
                    >
                      <svg v-if="selectedCategoryIds.has(child.id)" class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span v-else class="w-3 h-3 flex-shrink-0 rounded-sm border-2 border-current opacity-40"></span>
                      {{ labels.categoryLabel + ' ' + (child.code || child.name) }}
                    </button>
                    <!-- Custom sub-categories under this template parent -->
                    <button
                      v-for="cc in customSubsOf(cat.id)"
                      :key="cc.tempId"
                      type="button"
                      @click="toggleCategory(cc.tempId)"
                      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all duration-150 focus:outline-none"
                      :class="selectedCategoryIds.has(cc.tempId) ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 hover:border-gray-300'"
                      :style="selectedCategoryIds.has(cc.tempId)
                        ? { backgroundColor: cc.color, borderColor: cc.color }
                        : { borderColor: cc.color + '60' }"
                    >
                      <svg v-if="selectedCategoryIds.has(cc.tempId)" class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span v-else class="w-3 h-3 flex-shrink-0 rounded-sm border-2 border-current opacity-40"></span>
                      {{ cc.code || cc.name }}
                      <span role="button" tabindex="0" @click.stop="removeCustomCategory(cc.tempId)" @keydown.enter.stop="removeCustomCategory(cc.tempId)"
                        class="ml-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </transition>
            </template>

            <!-- Custom main categories (added by user) -->
            <div v-if="customMainCats.length" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="cc in customMainCats" :key="cc.tempId" class="relative group rounded-2xl border-2 p-4 text-left transition-all duration-200"
                :style="selectedCategoryIds.has(cc.tempId)
                  ? { borderColor: cc.color, backgroundColor: cc.color + '12' }
                  : { borderColor: '#e5e7eb' }">
                <!-- Remove button -->
                <button type="button" @click="removeCustomCategory(cc.tempId)"
                  class="absolute top-2 left-2 w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <svg class="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
                <!-- Select -->
                <div class="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                  :class="selectedCategoryIds.has(cc.tempId) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
                  :style="{ backgroundColor: cc.color }">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <button type="button" @click="toggleCategory(cc.tempId)" class="w-full text-left focus:outline-none">
                  <div class="mb-3 w-8 h-8 rounded-lg flex items-center justify-center" :style="{ backgroundColor: cc.color + '20' }">
                    <svg class="w-4 h-4" :style="{ color: cc.color }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                  </div>
                  <p class="font-semibold text-sm text-gray-900 leading-snug mb-1.5">{{ cc.name }}</p>
                  <span v-if="cc.code" class="inline-block text-xs font-bold px-2 py-0.5 rounded-lg text-white" :style="{ backgroundColor: cc.color }">
                    {{ cc.code }}
                  </span>
                  <p v-if="customSubsOf(cc.tempId).length" class="mt-1.5 text-xs text-gray-400">
                    +{{ customSubsOf(cc.tempId).length }} Unterkategorien
                  </p>
                </button>
              </div>
            </div>

            <!-- Sub-pills for selected custom main categories -->
            <template v-for="cc in customMainCats" :key="'custom-subs-' + cc.tempId">
              <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
                <div v-if="customSubsOf(cc.tempId).length && selectedCategoryIds.has(cc.tempId)"
                  class="rounded-2xl border-2 overflow-hidden" :style="{ borderColor: cc.color + '40' }">
                  <div class="flex items-center justify-between px-4 py-2.5" :style="{ backgroundColor: cc.color + '10' }">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: cc.color }"></span>
                      <p class="text-xs font-bold uppercase tracking-wide" :style="{ color: cc.color }">{{ cc.code || cc.name }} – Unterkategorien</p>
                    </div>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full text-white" :style="{ backgroundColor: cc.color }">
                      {{ customSubsOf(cc.tempId).filter(c => selectedCategoryIds.has(c.tempId)).length }}/{{ customSubsOf(cc.tempId).length }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-2 p-4">
                    <button v-for="sub in customSubsOf(cc.tempId)" :key="sub.tempId" type="button" @click="toggleCategory(sub.tempId)"
                      class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all duration-150 focus:outline-none"
                      :class="selectedCategoryIds.has(sub.tempId) ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 hover:border-gray-300'"
                      :style="selectedCategoryIds.has(sub.tempId) ? { backgroundColor: sub.color, borderColor: sub.color } : { borderColor: sub.color + '60' }">
                      <svg v-if="selectedCategoryIds.has(sub.tempId)" class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                      <span v-else class="w-3 h-3 flex-shrink-0 rounded-sm border-2 border-current opacity-40"></span>
                      {{ sub.code || sub.name }}
                      <span role="button" tabindex="0" @click.stop="removeCustomCategory(sub.tempId)" @keydown.enter.stop="removeCustomCategory(sub.tempId)" class="ml-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </transition>
            </template>

            <!-- ── Add custom category form ── -->
            <div class="pt-1">
              <button type="button" @click="showAddCatForm = !showAddCatForm"
                class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all duration-150">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Eigene {{ labels.categoryLabel }} hinzufügen
              </button>

              <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2 scale-98" enter-to-class="opacity-100 translate-y-0 scale-100"
                leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 -translate-y-2 scale-98">
                <div v-if="showAddCatForm" class="mt-3 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 space-y-4">
                  <p class="text-xs font-bold uppercase tracking-wide text-blue-700">Neue {{ labels.categoryLabel }}</p>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1">Name <span class="text-red-400">*</span></label>
                      <input v-model="newCat.name" type="text" placeholder="z.B. Anhänger" maxlength="50"
                        class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-600 mb-1">Kürzel <span class="text-gray-400 font-normal">(optional)</span></label>
                      <input v-model="newCat.code" type="text" placeholder="z.B. BE2" maxlength="10"
                        class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white uppercase" />
                    </div>
                  </div>

                  <!-- Color picker -->
                  <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-2">Farbe</label>
                    <div class="flex gap-2 flex-wrap">
                      <button v-for="c in CUSTOM_PALETTE" :key="c" type="button" @click="newCat.color = c"
                        class="w-7 h-7 rounded-full border-2 transition-all flex-shrink-0"
                        :style="{ backgroundColor: c, borderColor: newCat.color === c ? '#1d4ed8' : 'transparent' }"
                        :class="newCat.color === c ? 'scale-110 shadow-md' : 'hover:scale-105'" />
                    </div>
                  </div>

                  <!-- Type: main or sub -->
                  <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-2">Art</label>
                    <div class="flex gap-2">
                      <button type="button" @click="newCat.parentTempId = null"
                        class="px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all"
                        :class="newCat.parentTempId === null ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'">
                        Hauptkategorie
                      </button>
                      <button type="button" @click="newCat.parentTempId = availableParents[0]?.id ?? null"
                        class="px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all"
                        :class="newCat.parentTempId !== null ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'">
                        Unterkategorie
                      </button>
                    </div>
                  </div>

                  <!-- Parent selector (visible when "Unterkategorie" chosen) -->
                  <div v-if="newCat.parentTempId !== null">
                    <label class="block text-xs font-semibold text-gray-600 mb-1">Übergeordnete {{ labels.categoryLabel }}</label>
                    <select v-model="newCat.parentTempId"
                      class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                      <option v-for="p in availableParents" :key="p.id" :value="p.id">
                        {{ p.code ? p.code + ' – ' : '' }}{{ p.name }}
                      </option>
                    </select>
                  </div>

                  <div class="flex gap-2 pt-1">
                    <button type="button" @click="addCustomCategory" :disabled="!newCat.name.trim()"
                      class="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                      :class="newCat.name.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 cursor-not-allowed'">
                      Hinzufügen
                    </button>
                    <button type="button" @click="showAddCatForm = false; newCat.name = ''; newCat.code = ''"
                      class="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-all">
                      Abbrechen
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 2: Preise ═══ -->
        <div v-if="currentStep === 2" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">
              {{ pricingMode === 'per_event_type' ? 'Welche Leistungen bietest du an?' : `Preis pro ${labels.appointment}` }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ pricingMode === 'per_event_type'
                ? 'Pro Leistung: Sofortzahlung beim Buchen — oder ohne (z.B. Erstgespräch, Pauschale, Rechnung später). Mit ✕ entfernen. Später unter Admin → Terminarten anpassbar.'
                : `Preis & Dauer pro ${labels.categoryLabel} – als Standardwert für neue ${labels.appointmentsPlural}, jederzeit anpassbar.` }}
            </p>
          </div>

          <div class="space-y-4">
            <div v-for="cat in pricingGroups" :key="pricingMode === 'per_event_type' ? (cat.code || cat.id) : cat.id"
              class="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <!-- Category / Leistung header -->
              <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 min-w-0">
                <span v-if="cat.color" class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ background: cat.color }"></span>
                <p class="text-sm font-bold text-gray-800 truncate min-w-0">{{ cat.name }}</p>
                <span v-if="cat.code" class="text-xs text-gray-400 font-mono flex-shrink-0">{{ cat.code }}</span>
                <button
                  v-if="pricingMode === 'per_event_type' && cat.code"
                  type="button"
                  @click="removeTemplateEventType(cat.code)"
                  class="ml-auto w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors text-xs leading-none flex-shrink-0"
                  :title="`${cat.name} entfernen`"
                >✕</button>
              </div>
              <!-- price rows -->
              <div class="divide-y divide-gray-100">
                <div v-for="row in pricingRows.filter(r => r.catId === cat.id)" :key="row.type"
                  class="px-4 py-3 transition-opacity"
                  :class="row.enabled ? '' : 'opacity-40'">

                  <!-- per_event_type: stacked settings (mobile-friendly) -->
                  <template v-if="pricingMode === 'per_event_type'">
                    <div class="space-y-3">
                      <div class="flex items-center justify-between gap-3">
                        <span class="text-sm font-medium text-gray-700">Aktiv</span>
                        <button type="button" @click="row.enabled = !row.enabled"
                          class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                          :style="row.enabled ? { background: formData.primary_color || '#2563EB' } : {}"
                          :class="!row.enabled ? 'bg-gray-200' : ''"
                          :title="row.enabled ? `${row.typeLabel} deaktivieren` : `${row.typeLabel} aktivieren`">
                          <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                            :class="row.enabled ? 'translate-x-3' : 'translate-x-0'" />
                        </button>
                      </div>
                      <div class="space-y-3" :class="!row.enabled ? 'pointer-events-none' : ''">
                        <div class="flex items-center justify-between gap-3">
                          <div class="min-w-0 pr-2">
                            <p class="text-sm font-medium text-gray-700">Sofortzahlung</p>
                            <p class="text-xs text-gray-400 leading-snug">Kunde zahlt beim Buchen in der App</p>
                          </div>
                          <button type="button" :disabled="!row.enabled"
                            @click="toggleRowRequirePayment(row)"
                            class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                            :style="row.require_payment && row.enabled ? { background: formData.primary_color || '#2563EB' } : {}"
                            :class="!(row.require_payment && row.enabled) ? 'bg-gray-200' : ''">
                            <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                              :class="row.require_payment ? 'translate-x-3' : 'translate-x-0'" />
                          </button>
                        </div>
                        <div v-if="row.require_payment" class="flex items-center justify-between gap-3">
                          <span class="text-sm font-medium text-gray-700">Preis</span>
                          <div class="flex items-center gap-1.5 flex-shrink-0">
                            <span class="text-xs font-medium text-gray-400">CHF</span>
                            <input
                              v-model.number="row.price_chf"
                              type="number" min="0" step="5"
                              :disabled="!row.enabled"
                              class="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                        <div class="flex items-center justify-between gap-3">
                          <span class="text-sm font-medium text-gray-700">Dauer</span>
                          <DurationPicker v-model="row.duration_minutes" :disabled="!row.enabled" />
                        </div>
                        <div class="flex items-center justify-between gap-3">
                          <div class="min-w-0 pr-2">
                            <p class="text-sm font-medium text-gray-700">Online buchbar</p>
                            <p class="text-xs text-gray-400 leading-snug">Auf der öffentlichen Buchungsseite</p>
                          </div>
                          <button type="button" :disabled="!row.enabled"
                            @click="row.public_bookable = !row.public_bookable"
                            class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                            :style="row.public_bookable && row.enabled ? { background: formData.primary_color || '#2563EB' } : {}"
                            :class="!(row.public_bookable && row.enabled) ? 'bg-gray-200' : ''"
                            :title="row.public_bookable ? 'Online buchbar' : 'Nur intern'">
                            <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                              :class="row.public_bookable ? 'translate-x-3' : 'translate-x-0'" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- per_category: compact price × type rows -->
                  <template v-else>
                    <div class="flex items-center gap-2 mb-2.5 min-w-0">
                      <button type="button" @click="row.enabled = !row.enabled"
                        class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                        :style="row.enabled ? { background: formData.primary_color || '#2563EB' } : {}"
                        :class="!row.enabled ? 'bg-gray-200' : ''"
                        :title="row.enabled ? `${row.typeLabel} deaktivieren` : `${row.typeLabel} aktivieren`">
                        <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                          :class="row.enabled ? 'translate-x-3' : 'translate-x-0'" />
                      </button>
                      <span class="text-sm font-semibold text-gray-700 truncate">{{ row.typeLabel }}</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-3 sm:pl-10">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-medium text-gray-400">CHF</span>
                        <input
                          v-model.number="row.price_chf"
                          type="number" min="0" step="5"
                          :disabled="!row.enabled"
                          class="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <DurationPicker v-model="row.duration_minutes" :disabled="!row.enabled" />
                    </div>
                  </template>
                </div>
              </div>
              <!-- Adminpauschale: only driving school / per-category pricing -->
              <div
                v-if="showAdminFeeInRegister && adminFeeByCatId[cat.id]"
                class="px-4 py-3 border-t border-gray-100 bg-slate-50/80 space-y-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 pr-2">
                    <p class="text-sm font-medium text-gray-700">Administration & Versicherung</p>
                    <p class="text-xs text-gray-400 leading-snug">Einmalige Adminpauschale (0 = keine)</p>
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <span class="text-xs font-medium text-gray-400">CHF</span>
                    <input
                      v-model.number="adminFeeByCatId[cat.id].chf"
                      type="number" min="0" step="5"
                      class="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    />
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 pr-2">
                    <p class="text-sm font-medium text-gray-700">Admin-Fee ab Termin Nr.</p>
                    <p class="text-xs text-gray-400 leading-snug">z.B. 2 = ab der 2. Fahrstunde</p>
                  </div>
                  <input
                    v-model.number="adminFeeByCatId[cat.id].applies_from"
                    type="number" min="1" max="99"
                    class="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- ── Custom event types (own services, priced tenant-wide) ── -->
          <div v-if="customEventTypes.length" class="space-y-2">
            <div v-for="ce in customEventTypes" :key="ce.tempCode"
              class="rounded-xl border border-gray-200 bg-white overflow-hidden transition-opacity"
              :class="ce.enabled ? '' : 'opacity-40'">
              <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 min-w-0">
                <p class="text-sm font-bold text-gray-800 truncate min-w-0">{{ ce.name }}</p>
                <span class="text-xs text-gray-400 flex-shrink-0">eigene Leistung</span>
                <button type="button" @click="removeCustomEventType(ce.tempCode)"
                  class="ml-auto w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors text-xs leading-none flex-shrink-0">
                  ✕
                </button>
              </div>
              <div class="px-4 py-3 space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-gray-700">Aktiv</span>
                  <button type="button" @click="ce.enabled = !ce.enabled"
                    class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                    :style="ce.enabled ? { background: formData.primary_color || '#2563EB' } : {}"
                    :class="!ce.enabled ? 'bg-gray-200' : ''">
                    <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                      :class="ce.enabled ? 'translate-x-3' : 'translate-x-0'" />
                  </button>
                </div>
                <div class="space-y-3" :class="!ce.enabled ? 'pointer-events-none' : ''">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 pr-2">
                    <p class="text-sm font-medium text-gray-700">Sofortzahlung</p>
                    <p class="text-xs text-gray-400 leading-snug">Kunde zahlt beim Buchen in der App</p>
                  </div>
                  <button type="button" :disabled="!ce.enabled"
                    @click="toggleCustomRequirePayment(ce)"
                    class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                    :style="ce.require_payment && ce.enabled ? { background: formData.primary_color || '#2563EB' } : {}"
                    :class="!(ce.require_payment && ce.enabled) ? 'bg-gray-200' : ''">
                    <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                      :class="ce.require_payment ? 'translate-x-3' : 'translate-x-0'" />
                  </button>
                </div>
                <div v-if="ce.require_payment" class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-gray-700">Preis</span>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <span class="text-xs font-medium text-gray-400">CHF</span>
                    <input
                      v-model.number="ce.price_chf"
                      type="number" min="0" step="5"
                      :disabled="!ce.enabled"
                      class="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-gray-700">Dauer</span>
                  <DurationPicker v-model="ce.duration_minutes" :disabled="!ce.enabled" />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 pr-2">
                    <p class="text-sm font-medium text-gray-700">Online buchbar</p>
                    <p class="text-xs text-gray-400 leading-snug">Auf der öffentlichen Buchungsseite</p>
                  </div>
                  <button type="button" :disabled="!ce.enabled"
                    @click="ce.public_bookable = !ce.public_bookable"
                    class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                    :style="ce.public_bookable && ce.enabled ? { background: formData.primary_color || '#2563EB' } : {}"
                    :class="!(ce.public_bookable && ce.enabled) ? 'bg-gray-200' : ''"
                    :title="ce.public_bookable ? 'Online buchbar' : 'Nur intern'">
                    <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                      :class="ce.public_bookable ? 'translate-x-3' : 'translate-x-0'" />
                  </button>
                </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button type="button" @click="showAddEventTypeForm = !showAddEventTypeForm"
              class="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all duration-150">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Eigene Leistung hinzufügen
            </button>

            <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2 scale-98" enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-y-0 scale-100" leave-to-class="opacity-0 -translate-y-2 scale-98">
              <div v-if="showAddEventTypeForm" class="mt-3 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
                <p class="text-xs font-bold uppercase tracking-wide text-blue-700">Neue Leistung</p>

                <div>
                  <label class="block text-xs font-semibold text-gray-600 mb-1">Bezeichnung <span class="text-red-400">*</span></label>
                  <input v-model="newEventType.name" type="text" placeholder="z.B. Simulatorstunde" maxlength="50"
                    class="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
                </div>

                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 pr-2">
                    <p class="text-sm font-medium text-gray-700">Sofortzahlung</p>
                    <p class="text-xs text-gray-400 leading-snug">Kunde zahlt beim Buchen in der App</p>
                  </div>
                  <button type="button"
                    @click="newEventType.require_payment = !newEventType.require_payment"
                    class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                    :style="newEventType.require_payment ? { background: formData.primary_color || '#2563EB' } : {}"
                    :class="!newEventType.require_payment ? 'bg-gray-200' : ''">
                    <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                      :class="newEventType.require_payment ? 'translate-x-3' : 'translate-x-0'" />
                  </button>
                </div>
                <div v-if="newEventType.require_payment" class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-gray-700">Preis</span>
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <span class="text-xs font-medium text-gray-500">CHF</span>
                    <input v-model.number="newEventType.price_chf" type="number" min="0" step="5"
                      class="w-24 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-gray-700">Dauer</span>
                  <DurationPicker v-model="newEventType.duration_minutes" />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 pr-2">
                    <p class="text-sm font-medium text-gray-700">Online buchbar</p>
                    <p class="text-xs text-gray-400 leading-snug">Auf der öffentlichen Buchungsseite</p>
                  </div>
                  <button type="button"
                    @click="newEventType.public_bookable = !newEventType.public_bookable"
                    class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                    :style="newEventType.public_bookable ? { background: formData.primary_color || '#2563EB' } : {}"
                    :class="!newEventType.public_bookable ? 'bg-gray-200' : ''">
                    <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                      :class="newEventType.public_bookable ? 'translate-x-3' : 'translate-x-0'" />
                  </button>
                </div>

                <div class="flex gap-2 pt-1">
                  <button type="button" @click="addCustomEventType" :disabled="!newEventType.name.trim()"
                    class="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                    :class="newEventType.name.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 cursor-not-allowed'">
                    Hinzufügen
                  </button>
                  <button type="button" @click="cancelAddEventTypeForm"
                    class="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-all">
                    Abbrechen
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <div class="flex items-start gap-3 bg-blue-50 rounded-xl p-3.5 text-sm text-blue-700">
            <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span v-if="pricingMode === 'per_event_type'">Weitere Leistungen und Preise kannst du jederzeit nach dem Login im Adminbereich anpassen.</span>
            <span v-else-if="formData.business_type === 'driving_school'">Kurse (VKU, Theorie, Nothilfe, etc.) können nach dem Login im Adminbereich unter <strong>Kurse</strong> erstellt werden. Alle Preise sind jederzeit anpassbar.</span>
            <span v-else>Weitere {{ labels.categoriesLabel }} und Preise kannst du jederzeit nach dem Login im Adminbereich anpassen.</span>
          </div>
        </div>

        <!-- ═══ STEP 3: Standorte ═══ -->
        <div v-if="currentStep === 3" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">
              {{ isDrivingSchool ? `Wo bietest du deine ${labels.appointmentsPlural} an?` : 'Wo triffst du Kunden?' }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ isDrivingSchool
                ? `Mindestens ein Standort – als Treffpunkt für deine ${labels.appointmentsPlural}.`
                : 'Kunden-Treffpunkt, Telefon und/oder Online Call — mindestens eine Option.' }}
            </p>
          </div>

          <!-- Meeting channels -->
          <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            <div class="flex items-center justify-between gap-3 px-4 py-3">
              <p class="text-sm font-medium text-gray-800">Kunden-Treffpunkt</p>
              <button type="button"
                @click="toggleMeetingPoint"
                class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                :style="meetingChannels.meetingPoint ? { background: formData.primary_color || '#2563EB' } : {}"
                :class="!meetingChannels.meetingPoint ? 'bg-gray-200' : ''"
                :title="isDrivingSchool ? 'Bei Fahrschulen ist ein Treffpunkt nötig' : 'Kunden-Treffpunkt an/aus'">
                <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                  :class="meetingChannels.meetingPoint ? 'translate-x-3' : 'translate-x-0'" />
              </button>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-3">
              <p class="text-sm font-medium text-gray-800">Telefon</p>
              <button type="button"
                @click="meetingChannels.phone = !meetingChannels.phone"
                class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                :style="meetingChannels.phone ? { background: formData.primary_color || '#2563EB' } : {}"
                :class="!meetingChannels.phone ? 'bg-gray-200' : ''">
                <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                  :class="meetingChannels.phone ? 'translate-x-3' : 'translate-x-0'" />
              </button>
            </div>
            <div class="flex items-center justify-between gap-3 px-4 py-3">
              <p class="text-sm font-medium text-gray-800">Online Call</p>
              <button type="button"
                @click="meetingChannels.onlineCall = !meetingChannels.onlineCall"
                class="flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none"
                :style="meetingChannels.onlineCall ? { background: formData.primary_color || '#2563EB' } : {}"
                :class="!meetingChannels.onlineCall ? 'bg-gray-200' : ''">
                <span class="block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 mx-0.5"
                  :class="meetingChannels.onlineCall ? 'translate-x-3' : 'translate-x-0'" />
              </button>
            </div>
          </div>

          <div v-if="meetingChannels.phone || meetingChannels.onlineCall"
            class="flex flex-wrap gap-2">
            <span v-if="meetingChannels.phone"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
              :style="{ background: formData.primary_color || '#2563EB' }">
              Telefon
            </span>
            <span v-if="meetingChannels.onlineCall"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
              :style="{ background: formData.primary_color || '#2563EB' }">
              Online Call
            </span>
            <span class="text-xs text-gray-400 self-center">wird als buchbarer Ort angelegt</span>
          </div>

          <!-- Physical meeting points -->
          <template v-if="meetingChannels.meetingPoint">
            <div class="flex items-start gap-3 bg-blue-50 rounded-xl p-3.5 text-sm text-blue-700">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>{{ labels.staffPlural }} wählen beim Erstellen von Terminen einen Standort aus. Weitere können später hinzugefügt werden.</span>
            </div>

            <div class="space-y-3">
              <div
                v-for="(loc, index) in locationsList"
                :key="index"
                class="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {{ index + 1 }}
                    </div>
                    <span class="text-sm font-semibold text-gray-700 truncate">Standort {{ index + 1 }}</span>
                  </div>
                  <button v-if="locationsList.length > 1" type="button" @click="removeLocation(index)"
                    class="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors text-sm leading-none flex-shrink-0">
                    ✕
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bezeichnung *</label>
                    <input v-model="loc.name" type="text" placeholder="z.B. Hauptstandort Zürich"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Strasse + Nummer</label>
                    <input v-model="loc.address" type="text" placeholder="Musterstrasse 12"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PLZ</label>
                    <input v-model="loc.zip" type="text" placeholder="8000"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ort</label>
                    <input v-model="loc.city" type="text" placeholder="Zürich"
                      class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                  </div>
                </div>
              </div>
            </div>

            <button type="button" @click="addLocation"
              class="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors px-4 py-2 rounded-xl hover:bg-blue-50 border-2 border-dashed border-blue-200 hover:border-blue-400 w-full justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              Weiteren Standort hinzufügen
            </button>
          </template>

          <p v-if="!hasValidLocation" class="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
            </svg>
            {{ meetingChannels.meetingPoint && !validLocations.length
              ? 'Bitte mindestens einen Standort mit Bezeichnung erfassen.'
              : 'Bitte mindestens eine Option wählen: Kunden-Treffpunkt, Telefon oder Online Call.' }}
          </p>
        </div>

        <!-- ═══ STEP 4: Branding ═══ -->
        <div v-if="currentStep === 4" class="space-y-8">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Design, Zahlungen & Social Media</h2>
            <p class="text-sm text-gray-500">Alles optional – kann jederzeit in den Einstellungen angepasst werden.</p>
          </div>

          <!-- Color preview hint (shown when colors were pre-selected) -->
          <div v-if="colorsExtracted"
            class="flex items-center gap-3 rounded-xl px-4 py-3 border transition-all"
            :style="{ background: (formData.primary_color || '#3B82F6') + '0D', borderColor: (formData.primary_color || '#3B82F6') + '35' }">
            <div class="flex gap-1.5 flex-shrink-0">
              <span class="w-4 h-4 rounded-full shadow-sm" :style="{ background: formData.primary_color }"></span>
              <span class="w-4 h-4 rounded-full shadow-sm" :style="{ background: formData.secondary_color }"></span>
              <span class="w-4 h-4 rounded-full shadow-sm" :style="{ background: formData.accent_color }"></span>
            </div>
            <p class="text-xs font-medium" :style="{ color: formData.primary_color }">
              ✓ Farben automatisch aus deinem Logo erkannt – passe sie hier bei Bedarf an.
            </p>
          </div>
          <div v-else-if="formData.primary_color !== '#3B82F6' || formData.secondary_color !== '#10B981'"
            class="flex items-center gap-3 rounded-xl px-4 py-3 border"
            :style="{ background: (formData.primary_color || '#3B82F6') + '0D', borderColor: (formData.primary_color || '#3B82F6') + '35' }">
            <div class="flex gap-1.5 flex-shrink-0">
              <span class="w-4 h-4 rounded-full shadow-sm" :style="{ background: formData.primary_color }"></span>
              <span class="w-4 h-4 rounded-full shadow-sm" :style="{ background: formData.secondary_color }"></span>
              <span class="w-4 h-4 rounded-full shadow-sm" :style="{ background: formData.accent_color }"></span>
            </div>
            <p class="text-xs font-medium" :style="{ color: formData.primary_color }">
              Deine Farben aus der Vorschau wurden übernommen – passe sie hier bei Bedarf an.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Logos column -->
            <div class="space-y-4">
              <!-- Wide logo -->
              <div>
                <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Hauptlogo <span class="normal-case font-normal text-gray-400">(breit)</span></p>
                <div class="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center hover:border-gray-300 transition-colors">
                  <div v-if="logoPreview" class="mb-3">
                    <img :src="logoPreview" alt="Logo Preview" class="h-14 w-auto mx-auto object-contain rounded-lg">
                  </div>
                  <div v-else class="mb-3">
                    <div class="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                      <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="relative inline-block">
                    <input ref="logoInput" type="file" accept="image/*" @change="handleLogoSelect"
                      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button class="bg-gray-900 hover:bg-gray-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-colors" type="button">
                      {{ logoPreview ? 'Ändern' : 'Auswählen' }}
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 mt-2">Beliebiges Bildformat · bis 5 MB</p>
                  <button v-if="logoPreview" @click="removeLogo"
                    class="text-red-400 hover:text-red-600 text-xs mt-1 block mx-auto transition-colors" type="button">
                    Entfernen
                  </button>
                  <p v-if="logoError" class="text-xs text-red-500 mt-2 flex items-center justify-center gap-1">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
                    {{ logoError }}
                  </p>
                </div>
              </div>

              <!-- Square logo (optional) -->
              <div>
                <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  App-Icon <span class="normal-case font-normal text-gray-400">(quadratisch, optional)</span>
                </p>
                <div class="border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center hover:border-gray-300 transition-colors">
                  <!-- Uploaded square logo -->
                  <div v-if="logoSquarePreview" class="mb-3">
                    <img :src="logoSquarePreview" alt="Square Logo" class="w-14 h-14 mx-auto object-contain rounded-xl">
                  </div>
                  <!-- Initials fallback preview -->
                  <div v-else class="mb-3 flex flex-col items-center gap-1.5">
                    <div class="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm"
                      :style="{ background: formData.primary_color || '#3B82F6' }">
                      {{ companyInitials }}
                    </div>
                    <p class="text-[10px] text-gray-400">So wird es ohne Icon aussehen</p>
                  </div>
                  <div class="relative inline-block">
                    <input ref="logoSquareInput" type="file" accept="image/*" @change="handleLogoSquareSelect"
                      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <button class="bg-gray-900 hover:bg-gray-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-colors" type="button">
                      {{ logoSquarePreview ? 'Ändern' : 'Icon hochladen' }}
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 mt-2">Beliebiges Bildformat · bis 5 MB</p>
                  <button v-if="logoSquarePreview" @click="removeLogoSquare"
                    class="text-red-400 hover:text-red-600 text-xs mt-1 block mx-auto transition-colors" type="button">
                    Entfernen
                  </button>
                  <p v-if="logoSquareError" class="text-xs text-red-500 mt-2 flex items-center justify-center gap-1">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
                    {{ logoSquareError }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Farben -->
            <div>
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Farben</p>
              <div class="space-y-3">
                <div v-for="[key, label, fallback] in [['primary_color', 'Hauptfarbe', '#3B82F6'], ['secondary_color', 'Zweitfarbe', '#10B981'], ['accent_color', 'Akzentfarbe', '#8B5CF6']]" :key="key">
                  <label class="block text-xs text-gray-500 mb-1">{{ label }}</label>
                  <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden px-2">
                    <input :value="formData[key as keyof typeof formData]" @input="(e) => (formData as any)[key] = (e.target as HTMLInputElement).value" type="color"
                      class="w-8 h-8 border-0 bg-transparent cursor-pointer rounded-lg p-0.5 flex-shrink-0">
                    <input :value="formData[key as keyof typeof formData]" @input="(e) => (formData as any)[key] = (e.target as HTMLInputElement).value" type="text" :placeholder="fallback"
                      class="flex-1 py-2 bg-transparent text-sm outline-none font-mono">
                  </div>
                </div>
                <div class="flex gap-2 mt-2">
                  <div class="flex-1 py-2 rounded-xl text-white text-center text-xs font-semibold transition-colors" :style="{ backgroundColor: formData.primary_color || '#3B82F6' }">Haupt</div>
                  <div class="flex-1 py-2 rounded-xl text-white text-center text-xs font-semibold transition-colors" :style="{ backgroundColor: formData.secondary_color || '#10B981' }">Zweit</div>
                  <div class="flex-1 py-2 rounded-xl text-white text-center text-xs font-semibold transition-colors" :style="{ backgroundColor: formData.accent_color || '#8B5CF6' }">Akzent</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Social Media + Zahlungsdaten -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
            <div>
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Social Media</p>
              <div class="space-y-3">
                <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden px-3">
                  <svg class="w-4 h-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <input v-model="formData.instagram_url" type="url" :placeholder="`instagram.com/${slugPlaceholder}`"
                    class="flex-1 py-2.5 bg-transparent text-sm outline-none">
                </div>
                <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden px-3">
                  <svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <input v-model="formData.facebook_url" type="url" :placeholder="`facebook.com/${slugPlaceholder}`"
                    class="flex-1 py-2.5 bg-transparent text-sm outline-none">
                </div>
                <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden px-3">
                  <!-- Google G icon -->
                  <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <input v-model="formData.google_review_link" type="url" placeholder="https://g.page/r/.../review"
                    class="flex-1 py-2.5 bg-transparent text-sm outline-none">
                </div>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Zahlungsdaten (für QR-Rechnungen)</p>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">QR-IBAN <span class="text-gray-400 font-normal">(optional)</span></label>
                  <input v-model="formData.qr_iban" type="text" placeholder="CH04 3000 1234 5678 9012 3"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white text-sm transition-colors font-mono">
                  <p class="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    Die QR-IBAN findest du in deinem E-Banking (unterscheidet sich von der normalen IBAN). Ohne QR-IBAN wird kein QR-Einzahlungsschein auf Rechnungen gedruckt — kann jederzeit unter Einstellungen → Rechnungen nachgetragen werden.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Erweiterte Einstellungen (E-Mail + SMS Absender) -->
          <div class="pt-2 border-t border-gray-100">
            <button type="button" @click="showAdvancedBranding = !showAdvancedBranding"
              class="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors w-full text-left group">
              <svg class="w-4 h-4 transition-transform duration-200" :class="showAdvancedBranding ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
              Erweiterte Einstellungen
              <span class="text-xs font-normal text-gray-400">(E-Mail & SMS Absender — optional, kann nach dem Login gesetzt werden)</span>
            </button>

            <div v-if="showAdvancedBranding" class="mt-4 space-y-5">
            <!-- E-Mails anpassen -->
            <div>
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                E-Mails anpassen
              </p>
              <p class="text-xs text-gray-400 mb-3">
                Standardmässig wird deine Login-E-Mail für alles verwendet. Du kannst hier separate Adressen setzen.
              </p>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Kontakt-E-Mail</label>
                  <input
                    v-model="formData.contact_email"
                    type="email"
                    placeholder="info@deine-firma.ch"
                    class="w-full sm:w-80 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">
                    E-Mail Absender
                    <span class="text-gray-400 ml-1">– für eigene Domain, DNS-Verifikation nach Login</span>
                  </label>
                  <input
                    v-model="formData.from_email"
                    type="email"
                    placeholder="info@deine-firma.ch"
                    class="w-full sm:w-80 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm"
                  />
                </div>
              </div>
            </div>

            <!-- SMS Absender -->
            <div class="border-t border-gray-100 pt-4">
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                SMS Absender
              </p>
              <p class="text-xs text-gray-400 mb-3">
                Name der bei SMS-Nachrichten als Absender erscheint, z. B.
                <code class="bg-gray-100 px-1 rounded">{{ labels.businessNoun }}</code>.
                <span class="text-amber-600 font-medium">Maximal 11 Zeichen</span> – Einschränkung des SMS-Providers.
                Leer lassen = Firmenname wird automatisch verwendet.
            </p>
            <!-- Vorschläge basierend auf Firmenname -->
            <div v-if="smsSenderSuggestions.length" class="flex flex-wrap gap-1.5 mb-2">
              <button v-for="s in smsSenderSuggestions" :key="s" type="button"
                @click="formData.twilio_from_sender = s"
                class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all"
                :class="formData.twilio_from_sender === s
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'">
                {{ s }}
              </button>
            </div>
            <div class="relative w-full sm:w-80">
              <input
                v-model="formData.twilio_from_sender"
                type="text"
                maxlength="11"
                :placeholder="labels.businessNoun"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm pr-14"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono"
                :class="(formData.twilio_from_sender?.length || 0) > 11 ? 'text-red-500' : 'text-gray-400'">
                {{ formData.twilio_from_sender?.length || 0 }}/11
              </span>
            </div>
            </div><!-- /SMS Absender -->
            </div><!-- /showAdvancedBranding -->
          </div><!-- /Erweiterte Einstellungen wrapper -->
        </div>

        <!-- ═══ STEP 5: Admin-Konto ═══ -->
        <div v-if="currentStep === 5" class="space-y-6">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Admin-Konto erstellen</h2>
            <p class="text-sm text-gray-500">Dein persönlicher Login-Zugang.</p>
          </div>

          <div class="flex items-center justify-between bg-indigo-50 rounded-2xl px-4 py-3 border border-indigo-100">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <span class="text-sm font-medium text-indigo-800">Kontaktperson-Daten übernehmen</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="adminSameAsCompany" @change="applyAdminFromCompany" class="sr-only peer">
              <div class="relative w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Vorname *</label>
              <input v-model="adminForm.first_name" type="text" required
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Nachname *</label>
              <input v-model="adminForm.last_name" type="text" required
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">E-Mail *</label>
              <input v-model="adminForm.email" type="email" required
                name="step5-username" autocomplete="username"
                @blur="checkAdminEmail(adminForm.email)"
                @input="onAdminEmailInput(adminForm.email)"
                :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm',
                  emailCheck === 'taken'     ? 'border-red-300 focus:ring-red-400' :
                  emailCheck === 'available' ? 'border-green-300 focus:ring-green-400' :
                  'border-gray-200 focus:ring-blue-500']">
              <p v-if="emailCheck === 'checking'" class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Wird geprüft…
              </p>
              <p v-else-if="emailCheck === 'taken'" class="text-xs text-red-500 mt-1 flex items-center gap-2">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>Diese E-Mail ist bereits registriert —
                  <a href="/login" class="underline font-medium">Jetzt einloggen</a>
                </span>
              </p>
              <p v-else-if="emailCheck === 'available'" class="text-xs text-green-600 mt-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                E-Mail ist verfügbar
              </p>
              <p v-else-if="emailCheck === 'error'" class="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/></svg>
                Prüfung nicht möglich — du kannst trotzdem fortfahren
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Telefon</label>
              <input v-model="adminForm.phone" type="tel"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
            </div>
            <!-- Passwörter: immer nebeneinander, auch auf Mobile -->
            <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Passwort *</label>
                <input
                  v-model="adminForm.password"
                  :type="showPw ? 'text' : 'password'"
                  required
                  minlength="12"
                  autocomplete="new-password"
                  name="new-password"
                  id="admin-password"
                  :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm',
                    adminForm.password && !passwordValid ? 'border-red-300 focus:ring-red-500' :
                    adminForm.password && passwordValid ? 'border-green-300 focus:ring-green-500' :
                    'border-gray-200 focus:ring-blue-500']"
                  placeholder="Mindestens 12 Zeichen"
                >
                <div class="flex items-center justify-between mt-1.5">
                  <button type="button" @click="useGeneratedPassword" class="text-xs font-semibold text-blue-600 underline">
                    Sicheres Passwort vorschlagen
                  </button>
                  <button type="button" @click="showPw = !showPw" class="text-xs text-gray-500 hover:text-gray-700">
                    {{ showPw ? 'Verbergen' : 'Anzeigen' }}
                  </button>
                </div>
                <div v-if="zxcvbnScore !== null" class="mt-2">
                  <div class="flex gap-1 h-1">
                    <div v-for="i in 4" :key="i" class="flex-1 rounded-full transition-colors duration-300"
                      :class="i <= zxcvbnScore ? [
                        zxcvbnScore <= 1 ? 'bg-red-500' :
                        zxcvbnScore === 2 ? 'bg-yellow-400' :
                        zxcvbnScore === 3 ? 'bg-blue-400' : 'bg-green-500'
                      ] : 'bg-gray-200'"
                    />
                  </div>
                  <p class="text-xs mt-1 font-medium" :class="
                    zxcvbnScore <= 1 ? 'text-red-500' :
                    zxcvbnScore === 2 ? 'text-yellow-600' :
                    zxcvbnScore === 3 ? 'text-blue-600' : 'text-green-600'
                  ">
                    {{ ['Sehr schwach', 'Schwach', 'Akzeptabel', 'Stark', 'Sehr stark'][zxcvbnScore] }}
                    <span v-if="zxcvbnScore < 2"> – zu leicht erratbar</span>
                  </p>
                </div>
                <p v-if="hibpStatus === 'checking'" class="text-xs text-gray-400 mt-1">Sicherheitsprüfung…</p>
                <p v-else-if="hibpStatus === 'pwned'" class="text-xs text-red-600 mt-1">Dieses Passwort ist in {{ hibpCount }} Datenlecks bekannt – bitte ein anderes wählen.</p>
                <p v-else-if="hibpStatus === 'safe'" class="text-xs text-green-600 mt-1">Nicht in bekannten Datenlecks gefunden</p>
                <p v-if="passwordError" class="text-xs text-red-600 mt-1">{{ passwordError }}</p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Passwort bestätigen *</label>
                <input
                  v-model="adminForm.passwordConfirm"
                  :type="showPw ? 'text' : 'password'"
                  required
                  minlength="12"
                  autocomplete="new-password"
                  name="confirm-password"
                  id="admin-password-confirm"
                  :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm',
                    adminForm.passwordConfirm && passwordMismatch ? 'border-red-300 focus:ring-red-500' :
                    adminForm.passwordConfirm && !passwordMismatch && passwordValid ? 'border-green-300 focus:ring-green-500' :
                    'border-gray-200 focus:ring-blue-500']"
                  placeholder="Passwort wiederholen"
                >
                <p v-if="passwordMismatch" class="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein.</p>
                <p v-else-if="adminForm.passwordConfirm && !passwordMismatch && passwordValid" class="text-xs text-green-600 mt-1">Passwörter stimmen überein</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 6: Mitarbeiter einladen ═══ -->
        <div v-if="currentStep === 6" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">{{ labels.staffPlural }} hinzufügen</h2>
            <p class="text-sm text-gray-500">Weitere können jederzeit nach der Registrierung eingeladen werden.</p>
          </div>

          <!-- Toggle: Admin = Staff -->
          <div class="flex items-center justify-between bg-green-50 rounded-2xl px-4 py-3 border border-green-100">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <div>
                <span class="text-sm font-medium text-green-800">Meine Daten übernehmen</span>
                <p class="text-xs text-green-600 mt-0.5">
                  {{ staffAdminIsSelf ? `Deine Admin-Daten wurden vorausgefüllt – du erhältst einen separaten ${labels.staff}-Login.` : `Admin-Daten in den ersten ${labels.staff}-Eintrag kopieren.` }}
                </p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="staffAdminIsSelf" @change="applyAdminToStaff" class="sr-only peer">
              <div class="relative w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <!-- Warning wenn Admin = Staff: andere E-Mail erforderlich -->
          <div v-if="staffAdminIsSelf" class="flex items-start gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-200">
            <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
            </svg>
            <div class="text-sm text-amber-800">
              <p class="font-semibold mb-0.5">Zwei separate Logins</p>
              <p class="text-xs leading-relaxed">
                Der <strong>{{ labels.staff }}-Login</strong> ist für den Berufsalltag (Kalender, Termine).
                Der <strong>Admin-Login</strong> (<span class="font-mono">{{ adminForm.email || adminEmailEarly }}</span>)
                bleibt für Einstellungen &amp; Auswertungen.
                Trage unten eine <strong>andere E-Mail</strong> für den {{ labels.staff }}-Login ein —
                dorthin senden wir die Einladung.
              </p>
            </div>
          </div>

          <div v-else class="flex items-start gap-3 bg-blue-50 rounded-xl p-3.5 text-sm text-blue-700">
            <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <span>{{ labels.staffPlural }} erhalten die Einladung per E-Mail (nicht per SMS).</span>
          </div>

          <div class="space-y-3">
            <div
              v-for="(staff, index) in staffList"
              :key="index"
              class="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <span class="text-sm font-semibold text-gray-700">{{ labels.staff }} {{ index + 1 }}</span>
                </div>
                <button v-if="staffList.length > 1" type="button" @click="removeStaff(index)"
                  class="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors text-sm leading-none">
                  ✕
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vorname *</label>
                  <input v-model="staff.first_name" type="text" placeholder="Max"
                    :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-white text-sm transition-colors',
                      !staff.first_name.trim() ? 'border-red-200 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-500']">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nachname</label>
                  <input v-model="staff.last_name" type="text" placeholder="Mustermann"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    E-Mail für {{ labels.staff }}-Login *
                    <span v-if="staffAdminIsSelf && index === 0" class="normal-case font-normal text-amber-600 ml-1">andere als Admin</span>
                    <span v-else class="normal-case font-normal text-blue-500 ml-1">für Einladungs-E-Mail</span>
                  </label>
                  <input
                    v-model="staff.email"
                    type="email"
                    required
                    :placeholder="staffAdminIsSelf && index === 0 ? 'z.B. vorname@gmail.com' : 'max@example.com'"
                    :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-white text-sm transition-colors',
                      staffEmailFieldClass(staff, index)]"
                    @input="onStaffEmailInput(index, staff.email)"
                    @blur="checkStaffEmail(index, staff.email)"
                  >
                  <p v-if="staffEmailMatchesAdmin(staff)" class="text-xs text-red-600 mt-1">
                    Das ist deine Admin-E-Mail — für den {{ labels.staff }}-Login eine andere Adresse wählen.
                  </p>
                  <p v-else-if="staffEmailChecks[index] === 'checking'" class="text-xs text-gray-400 mt-1">
                    Wird geprüft…
                  </p>
                  <p v-else-if="staffEmailChecks[index] === 'available'" class="text-xs text-green-600 mt-1">
                    E-Mail ist verfügbar
                  </p>
                  <p v-else-if="staffEmailChecks[index] === 'taken'" class="text-xs text-red-600 mt-1">
                    {{ staffEmailTakenMsgs[index] || 'Diese E-Mail ist bereits registriert. Bitte eine andere Adresse wählen.' }}
                  </p>
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Telefon
                    <span class="normal-case font-normal text-gray-400 ml-1">optional</span>
                  </label>
                  <input v-model="staff.phone" type="tel" placeholder="+41 79 123 45 67"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                </div>
              </div>
            </div>
          </div>

          <button type="button" @click="addStaff"
            class="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm transition-colors px-4 py-2 rounded-xl hover:bg-green-50 border-2 border-dashed border-green-200 hover:border-green-400 w-full justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Weiteren {{ labels.staff }} hinzufügen
          </button>

          <p v-if="!staffStepValid"
            class="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
            </svg>
            <template v-if="staffEmailChecks.some(c => c === 'taken')">
              Mindestens eine {{ labels.staff }}-E-Mail ist bereits registriert — bitte eine andere wählen.
            </template>
            <template v-else>
              Bitte Vorname und {{ labels.staff }}-E-Mail
              <template v-if="staffAdminIsSelf"> (≠ Admin)</template>
              für jeden {{ labels.staff }} erfassen.
            </template>
          </p>
        </div>

        <!-- ═══ STEP 7: Bestätigung ═══ -->
        <div v-if="currentStep === 7" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Alles bereit?</h2>
            <p class="text-sm text-gray-500">Überprüfe deine Angaben vor der Registrierung.</p>
          </div>

          <!-- iOS/Android credential inputs: visible to password manager at submit time,
               clipped to 0px so they don't affect the visual layout -->
          <input type="email" name="username" autocomplete="username" :value="adminForm.email"
            tabindex="-1" readonly
            style="clip:rect(0,0,0,0);position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;border:0">
          <input type="password" name="password" autocomplete="new-password" :value="adminForm.password"
            tabindex="-1" readonly
            style="clip:rect(0,0,0,0);position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;border:0">
          <input type="password" name="confirm-password" autocomplete="new-password" :value="adminForm.passwordConfirm"
            tabindex="-1" readonly
            style="clip:rect(0,0,0,0);position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;border:0">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Firma -->
            <div class="rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Firma</p>
              <div class="space-y-1.5 text-sm">
                <p class="font-semibold text-gray-900">{{ formData.name }}</p>
                <p class="text-gray-500 text-xs font-mono">simy.ch/{{ formData.slug }}</p>
                <p class="text-gray-600">{{ formData.contact_person_first_name }} {{ formData.contact_person_last_name }}</p>
                <p class="text-gray-600 text-xs">{{ formData.street }} {{ formData.streetNr }}, {{ formData.zip }} {{ formData.city }}</p>
              </div>
            </div>

            <!-- Admin -->
            <div class="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
              <p class="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2.5">Admin-Konto</p>
              <div class="space-y-1.5 text-sm">
                <p class="font-semibold text-gray-900">{{ adminForm.first_name }} {{ adminForm.last_name }}</p>
                <p class="text-gray-600">{{ adminForm.email }}</p>
                <p class="text-gray-400 text-xs tracking-widest">••••••••••••</p>
              </div>
            </div>

            <!-- Kategorien (nur wenn der Schritt nicht übersprungen wurde) -->
            <div v-if="!skipsCategories" class="rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <p class="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2.5">{{ labels.categoriesLabel }}</p>
              <div class="flex items-baseline gap-1.5">
                <span class="text-2xl font-bold text-blue-700">{{ effectiveCategoryCount }}</span>
                <span class="text-sm text-blue-500">ausgewählt</span>
              </div>
            </div>

            <!-- Preise -->
            <div class="rounded-2xl bg-violet-50 border border-violet-100 p-4 sm:col-span-2">
              <p class="text-xs font-bold text-violet-400 uppercase tracking-wide mb-2.5">Preise</p>
              <div class="space-y-2">
                <div v-for="cat in pricingGroups" :key="cat.id">
                  <p class="text-xs font-semibold text-gray-600 mb-1">{{ cat.name }}</p>
                  <div class="grid grid-cols-3 gap-1 text-xs">
                    <span v-for="row in pricingRows.filter(r => r.catId === cat.id && r.enabled)" :key="row.type" class="text-gray-500">
                      {{ row.typeLabel }}: <strong>CHF {{ row.price_chf }}</strong> / {{ row.duration_minutes }} Min.
                    </span>
                    <span
                      v-if="showAdminFeeInRegister && (adminFeeByCatId[cat.id]?.chf || 0) > 0"
                      class="text-gray-500 col-span-3"
                    >
                      Adminpauschale: <strong>CHF {{ adminFeeByCatId[cat.id].chf }}</strong>
                      ab Termin {{ adminFeeByCatId[cat.id].applies_from }}
                    </span>
                  </div>
                </div>
                <div v-if="customEventTypes.some(c => c.enabled)" class="pt-1">
                  <p class="text-xs font-semibold text-gray-600 mb-1">Eigene Leistungen</p>
                  <div class="grid grid-cols-3 gap-1 text-xs">
                    <span v-for="ce in customEventTypes.filter(c => c.enabled)" :key="ce.tempCode" class="text-gray-500">
                      {{ ce.name }}: <strong>CHF {{ ce.price_chf }}</strong> / {{ ce.duration_minutes }} Min.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Standorte -->
            <div class="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <p class="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2.5">Standorte</p>
              <div class="space-y-1">
                <p v-for="(loc, i) in locationsForSubmit" :key="i" class="text-sm text-gray-700 font-medium">
                  {{ loc.name }}
                  <span v-if="loc.city" class="text-gray-400 font-normal text-xs"> – {{ loc.city }}</span>
                  <span v-else-if="loc.address?.startsWith('Remote')" class="text-gray-400 font-normal text-xs"> – remote</span>
                </p>
              </div>
            </div>

            <!-- Fahrlehrer -->
            <div v-if="staffList.some(s => s.first_name && s.email)"
              class="sm:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Einladungen</p>
              <div class="space-y-2">
                <div
                  v-for="(s, i) in staffList.filter(s => s.first_name && s.email)"
                  :key="i"
                  class="flex items-start gap-3 w-full bg-white rounded-xl border border-gray-200 px-3.5 py-3"
                >
                  <span class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg class="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-gray-900 leading-snug">
                      {{ s.first_name }} {{ s.last_name }}
                    </p>
                    <p class="text-xs text-blue-600 mt-0.5 break-all">{{ s.email }}</p>
                    <p v-if="s.phone" class="text-xs text-gray-400 mt-0.5">{{ s.phone }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AGB -->
          <div class="flex items-start gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-200">
            <input v-model="acceptTerms" type="checkbox" required
              class="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer flex-shrink-0">
            <span class="text-sm text-gray-600">
              Ich akzeptiere die <NuxtLink to="/agb" target="_blank" class="text-blue-600 hover:underline font-medium">Nutzungsbedingungen</NuxtLink>
              und die <NuxtLink to="/datenschutz" target="_blank" class="text-blue-600 hover:underline font-medium">Datenschutzerklärung</NuxtLink>
              (inkl. <NuxtLink to="/avv" target="_blank" class="text-blue-600 hover:underline font-medium">AVV</NuxtLink>).
            </span>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="currentStep === LOADING_STEP" class="flex flex-col items-center justify-center py-10 gap-5">
          <div class="relative w-14 h-14">
            <div class="absolute inset-0 rounded-full border-4 border-gray-100"></div>
            <div class="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
              :style="{ borderColor: `${formData.primary_color || '#3B82F6'} transparent transparent transparent` }"></div>
          </div>
          <div class="text-center px-2">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ labels.businessNoun }} wird eingerichtet…</h2>
            <p class="text-sm text-gray-500 transition-opacity duration-300">{{ setupProgressDetail }}</p>
          </div>
          <div class="w-full max-w-sm rounded-2xl border border-gray-200 overflow-hidden">
            <div class="divide-y divide-gray-100">
              <div
                v-for="step in setupProgressSteps"
                :key="step.id"
                class="flex items-center gap-3 px-4 py-2.5"
              >
                <div
                  class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="{
                    'bg-green-500': step.status === 'done',
                    'bg-transparent': step.status === 'active',
                    'bg-gray-200': step.status === 'pending',
                  }"
                >
                  <svg v-if="step.status === 'done'" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                  <div
                    v-else-if="step.status === 'active'"
                    class="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    :style="{ borderColor: `${formData.primary_color || '#3B82F6'} transparent transparent transparent` }"
                  />
                </div>
                <p
                  class="text-sm leading-snug"
                  :class="{
                    'text-gray-900 font-medium': step.status === 'active',
                    'text-gray-700': step.status === 'done',
                    'text-gray-400': step.status === 'pending',
                  }"
                >
                  {{ step.label }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Success State + Checkliste -->
        <div v-if="currentStep === SUCCESS_STEP" class="py-4">
          <!-- Hero -->
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg mb-4">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-1">{{ formData.name }} ist startklar!</h2>
            <p class="text-sm text-gray-500">Alles wurde erfolgreich auf Autopilot eingerichtet.</p>
            <div v-if="createdCustomerNumber" class="inline-flex items-center gap-2 mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">
              <span class="text-xs text-blue-500 font-medium">Kundennummer</span>
              <span class="font-mono font-bold text-blue-800">{{ createdCustomerNumber }}</span>
            </div>
          </div>

          <!-- Autopilot Checkliste -->
          <div class="rounded-2xl border border-gray-200 overflow-hidden mb-5">
            <div class="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">Autopilot Setup-Status</p>
            </div>
            <div class="divide-y divide-gray-100">
              <div v-for="item in [
                { done: true, label: `${labels.businessNoun} registriert` },
                { done: true, label: `${effectiveCategoryCount} ${labels.categoriesLabel} konfiguriert` },
                { done: true, label: `${locationsForSubmit.length} Standort(e) angelegt` },
                { done: true, label: 'Preise & Dauern konfiguriert' },
                { done: true, label: 'Termintypen & Bewertungsvorlagen importiert' },
                { done: true, label: 'Verfügbarkeit Mo–Sa 08:00–18:00 eingerichtet' },
                { done: (staffInviteResults?.filter(r => ['email_sent','invited'].includes(r.status))?.length ?? 0) > 0, label: `${labels.staffPlural} eingeladen (${staffInviteResults?.filter(r => ['email_sent','invited'].includes(r.status))?.length ?? 0})` },
              ]" :key="item.label"
              class="flex items-center gap-3 px-4 py-2.5">
                <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="item.done ? 'bg-green-500' : 'bg-gray-200'">
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span class="text-sm text-gray-700" :class="item.done ? 'font-medium' : 'text-gray-400'">{{ item.label }}</span>
              </div>
              <div class="px-4 py-2 bg-amber-50">
                <p class="text-xs font-semibold text-amber-600 mb-2">Nach dem Login noch offen:</p>
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2 text-sm text-amber-800">
                    <div class="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0"></div>
                    {{ labels.staff }}-Account erstellen
                  </div>
                  <div class="flex items-center gap-2 text-sm text-amber-800">
                    <div class="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0"></div>
                    {{ labels.bookAction }}
                  </div>
                  <div v-if="formData.from_email" class="flex items-center gap-2 text-sm text-amber-800">
                    <div class="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0"></div>
                    E-Mail Domain verifizieren
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- E-Mail Domain Setup Hinweis (nur wenn from_email gesetzt) -->
          <div v-if="formData.from_email" class="rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden mb-5">
            <div class="flex items-center gap-2.5 px-4 py-3 bg-blue-100 border-b border-blue-200">
              <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-bold text-blue-900">E-Mail Domain einrichten</p>
                <p class="text-xs text-blue-600 font-mono">{{ formData.from_email }}</p>
              </div>
              <span class="ml-auto text-xs font-semibold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">Ausstehend</span>
            </div>
            <div class="px-4 py-3.5 space-y-3">
              <p class="text-sm text-blue-800">
                Damit E-Mails mit <strong>{{ formData.from_email }}</strong> versendet werden können, müssen noch DNS-Einträge bei deinem Domain-Anbieter gesetzt werden.
              </p>
              <ol class="space-y-2">
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span class="text-sm text-blue-800">Einloggen und zu <strong>Einstellungen → E-Mail Domain</strong> navigieren</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span class="text-sm text-blue-800">Domain-Setup starten – du erhältst die benötigten DNS-Einträge (DKIM, SPF)</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span class="text-sm text-blue-800">Einträge beim Domain-Anbieter (z. B. Hostpoint, Infomaniak) eintragen und Verifizierung abwarten</span>
                </li>
              </ol>
              <p class="text-xs text-blue-500">
                Bis zur Verifizierung werden E-Mails automatisch von <code class="bg-blue-100 px-1 rounded">noreply@simy.ch</code> versendet.
              </p>
            </div>
          </div>

          <!-- Staff-Einladungen -->
          <div v-if="staffInviteResults && staffInviteResults.length > 0" class="rounded-2xl border border-gray-200 p-4 mb-5">
            <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Einladungsstatus</p>
            <div class="space-y-2">
              <div v-for="r in staffInviteResults" :key="r.name" class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="['email_sent'].includes(r.status) ? 'bg-green-100' : r.status === 'invited' ? 'bg-amber-100' : 'bg-red-100'">
                  <svg v-if="['email_sent'].includes(r.status)" class="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <svg v-else-if="r.status === 'invited'" class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
                <div>
                  <span class="text-sm font-medium text-gray-800">{{ r.name }}</span>
                  <span class="text-xs ml-2" :class="r.status === 'invited' ? 'text-amber-600' : 'text-gray-500'">{{ r.message }}</span>
                  <span v-if="r.status === 'invited'" class="block text-xs text-amber-600 mt-0.5">E-Mail fehlgeschlagen – bitte Link manuell senden</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Website-Mode: Zurück zum Superadmin -->
          <div v-if="isWebsiteMode && createdTenantId" class="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
            <p class="text-sm font-semibold text-indigo-800 mb-2">🌐 Website-Demo wurde generiert</p>
            <p class="text-xs text-indigo-600 mb-3">Prüfe und passe die Website im Superadmin an, bevor du den Link an den Kunden sendest.</p>
            <a :href="`/tenant-admin/websites/${createdTenantId}`"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
              :style="{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }">
              🔍 Website jetzt prüfen
            </a>
          </div>

          <button @click="goToLogin"
            class="w-full text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm hover:opacity-90"
            :style="{ background: `linear-gradient(135deg, ${formData.primary_color || '#3B82F6'}, ${formData.secondary_color || '#6366F1'})` }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
            </svg>
            Zum Admin-Login
          </button>
          <p class="text-xs text-center text-gray-400 mt-2.5 font-mono">{{ tenantUrl }}</p>

          <!-- App Store -->
          <div class="mt-5 text-center">
            <p class="text-xs text-gray-400 mb-2">Simy auch als iPhone-App verfügbar</p>
            <a href="https://apps.apple.com/ch/app/simy/id6766244063" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-xl hover:bg-gray-900 transition-colors">
              <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div class="text-left leading-tight">
                <div class="text-[9px] text-gray-300">Laden im</div>
                <div class="text-sm font-semibold">App Store</div>
              </div>
            </a>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
          </svg>
          <div class="flex-1">
            <p class="text-sm font-semibold text-red-800">Fehler bei der Registrierung</p>
            <p class="text-sm text-red-700 mt-0.5">{{ error }}</p>
            <a v-if="emailCheck === 'taken'" href="/login"
              class="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-red-800 underline underline-offset-2 hover:text-red-900">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              Jetzt einloggen →
            </a>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center gap-3 pt-6 border-t border-gray-100 mt-6" v-if="currentStep < LOADING_STEP">
          <button v-if="currentStep > 0" @click="previousStep" type="button"
            class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Zurück
          </button>
          <div v-else class="flex-shrink-0 w-0"></div>

          <button v-if="currentStep < 7" @click="nextStep" type="button" :disabled="!canProceed"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm transition-all disabled:bg-gray-200 disabled:text-gray-400"
            :style="canProceed ? { background: `linear-gradient(135deg, ${formData.primary_color || '#2563EB'}, ${formData.secondary_color || '#4F46E5'})` } : {}">
            Weiter
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <button v-else-if="currentStep === 7" type="submit" :disabled="!canSubmit"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-400 text-white font-bold text-sm transition-all shadow-sm"
            :style="canSubmit ? { background: 'linear-gradient(135deg, #10B981, #059669)' } : {}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            einrichten
          </button>
        </div>

        <!-- iOS Password Autofill: credential mirrors always present in DOM so Safari
             can offer to save them when the registration form submits.
             Use visually-hidden (clip, NOT aria-hidden) so the password manager still reads them. -->
        <div style="clip:rect(0,0,0,0);position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;white-space:nowrap;border:0">
          <input type="email" name="username" autocomplete="username" :value="adminForm.email" tabindex="-1" id="ios-mirror-email">
          <input type="password" name="password" autocomplete="new-password" :value="adminForm.password" tabindex="-1" id="ios-mirror-password">
          <input type="password" name="confirm-password" autocomplete="new-password" :value="adminForm.passwordConfirm" tabindex="-1" id="ios-mirror-confirm">
        </div>
      </form>


    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { navigateTo, useRoute } from '#app'
import { generateStrongPassword } from '~/composables/usePasswordStrength'
import { getTerminologyDefaults, type Terminology } from '~/composables/useTerminology'
import { compressImage } from '~/utils/imageCompression'
import { extractColorsFromLogo } from '~/utils/logoUtils'
import DOMPurify from 'isomorphic-dompurify'
import { getSupabase } from '~/utils/supabase'
import { saveCredentials } from '~/utils/save-credentials'

definePageMeta({ layout: false })

const LOADING_STEP = 8
const SUCCESS_STEP = 9

// ─── Steps ─────────────────────────────────────────────────────────────────
// Computed statt fixem Array, da 'Kategorien' und 'Mitarbeiter' je nach
// Branche anders heissen (z.B. Consulting: 'Leistungsbereiche'/'Berater').
// Bei per_event_type (Consulting, Mental Coach) wird der Kategorien-Schritt
// übersprungen — Preise hängen an Leistungen, nicht an Bereichen.
const allStepDefs = computed(() => [
  { id: 0, title: 'Grunddaten', skip: false },
  { id: 1, title: labels.value.categoriesLabel, skip: pricingMode.value === 'per_event_type' },
  { id: 2, title: 'Preise', skip: false },
  { id: 3, title: 'Standorte', skip: false },
  { id: 4, title: 'Branding', skip: false },
  { id: 5, title: 'Admin', skip: false },
  { id: 6, title: labels.value.staffPlural, skip: false },
  { id: 7, title: 'Bestätigung', skip: false },
])
const steps = computed(() => allStepDefs.value.filter(s => !s.skip))
const visibleStepIndex = computed(() => {
  const idx = steps.value.findIndex(s => s.id === currentStep.value)
  return idx >= 0 ? idx : 0
})
const skipsCategories = computed(() => pricingMode.value === 'per_event_type')

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
  // Bewusst leer statt eines Default-Werts wie 'driving_school': Solange die
  // Branche unbekannt ist (frischer Besuch ohne ?type=…-Link), sollen
  // neutrale Begriffe ('generic' in labels unten) angezeigt werden statt
  // fälschlich "Fahrschule"-Sprache für z.B. einen Consulting-Interessenten.
  business_type: '',
  primary_color: '#3B82F6',
  secondary_color: '#10B981',
  accent_color: '#8B5CF6',
  uid_number: '',
  website_url: '',
  staff_count: '',
  language: 'de',
  qr_iban: '',
  instagram_url: '',
  facebook_url: '',
  google_review_link: '',
  from_email: '',
  twilio_from_sender: '',
})

// ─── Branchen-Terminologie ──────────────────────────────────────────────────
// Es gibt hier (bewusst) noch keinen Tenant, daher liefert useTerminology()
// (welche über useTenantBranding() den *eingeloggten* Tenant liest) den
// falschen Wert. getTerminologyDefaults() ist die reine, parameterlose
// Variante dafür — sie liest lokal aus formData.business_type.
//
// Fallback-Kette pro Schlüssel: DB (business_type_presets.ui_labels, via
// /api/tenants/business-types) > hardcodierte TS-Defaults. So können neue/
// angepasste Branchenbegriffe rein per DB-Eintrag gepflegt werden, ohne
// Code-Deploy — die TS-Defaults greifen nur, wenn die API (noch) nicht
// geladen ist oder für einen Key keinen DB-Wert liefert.
const labels = computed(() => {
  // Solange keine Branche gewählt ist, explizit 'generic' statt formData.value.
  // business_type='' an getTerminologyDefaults() zu übergeben — dessen interner
  // Fallback ist 'driving_school' (für eingeloggte Alt-Tenants ohne
  // business_type gedacht), was hier vor der Auswahl fälschlich Fahrschule-
  // Sprache zeigen würde.
  const fallback = getTerminologyDefaults(formData.value.business_type || 'generic')
  const dbLabels = businessTypes.value.find(bt => bt.code === formData.value.business_type)?.ui_labels || {}
  const merged = { ...fallback }
  for (const key of Object.keys(fallback) as (keyof Terminology)[]) {
    const dbValue = dbLabels[key]
    if (typeof dbValue === 'string' && dbValue.trim()) merged[key] = dbValue
  }
  return merged
})

// Slug-Platzhalter aus dem branchenspezifischen "businessNoun" abgeleitet
// (z.B. "fahrschule", "consulting-unternehmen", "coaching-praxis"), damit der
// Platzhalter auch für zukünftige Branchen automatisch passt.
const slugPlaceholder = computed(() => {
  const slug = labels.value.businessNoun
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'meine-firma'
})

// ─── Business Types ────────────────────────────────────────────────────────
interface BusinessTypeOption { code: string; name: string; description?: string; ui_labels?: Record<string, string> }
const businessTypes = ref<BusinessTypeOption[]>([])

const loadBusinessTypes = async () => {
  try {
    const res = await $fetch<{ businessTypes: BusinessTypeOption[] }>('/api/tenants/business-types')
    businessTypes.value = res.businessTypes || []
  } catch {
    // Fallback keeps the form usable even if the endpoint is unreachable
    businessTypes.value = [{ code: 'driving_school', name: 'Fahrschule' }]
  }
}

// ─── Categories ────────────────────────────────────────────────────────────
interface TemplateCategory {
  id: number
  name: string
  code?: string
  color?: string
  icon_svg?: string
  business_type?: string
  children?: TemplateCategory[]
}

const templateCategories = ref<TemplateCategory[]>([])
const selectedCategoryIds = ref(new Set<number>())

// ─── Custom categories added by the user during registration ─────────────
interface CustomCat {
  tempId: number        // negative temp ID, e.g. -1, -2 …
  name: string
  code: string
  color: string
  parentTempId: number | null  // null = main cat; >0 = template parent; <0 = custom parent
}

const CUSTOM_PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#64748b']
let _nextCustomId = -1
const customCategories = ref<CustomCat[]>([])
const showAddCatForm = ref(false)
const newCat = ref({ name: '', code: '', color: CUSTOM_PALETTE[0], parentTempId: null as number | null })

// Derived views
const customMainCats = computed(() => customCategories.value.filter(c => c.parentTempId === null))
const customSubsOf = (parentId: number) => customCategories.value.filter(c => c.parentTempId === parentId)

// All parents available for the "sub of" selector
const availableParents = computed(() => [
  ...templateCategories.value.map(c => ({ id: c.id, name: c.name, code: c.code, color: c.color })),
  ...customMainCats.value.map(c => ({ id: c.tempId, name: c.name, code: c.code || undefined, color: c.color })),
])

// ─── Pricing ────────────────────────────────────────────────────────────────
interface PricingRow {
  catId: number
  catName: string
  catCode: string | undefined
  catColor: string | undefined
  type: string
  typeLabel: string
  price_chf: number
  duration_minutes: number
  enabled: boolean
  /** Online-Buchung (event_types.public_bookable) — relevant in per_event_type mode */
  public_bookable: boolean
  /** false = no in-app price (Erstgespräch, external invoice, package, …) */
  require_payment: boolean
}

// Dynamic, business-type-aware event types for the pricing step (replaces the
// old hardcoded Fahrstunde/Prüfung/Theorie array – see GET /api/tenants/template-event-types).
interface EventTypeTemplate {
  code: string
  name: string
  price_chf: number
  duration_minutes: number
  default_enabled: boolean
  public_bookable?: boolean
  require_payment?: boolean
}
const eventTypeTemplates = ref<EventTypeTemplate[]>([])
// 'per_category': price varies per selected category (driving_school: Fahrstunde/Prüfung/Theorie
//   priced individually for e.g. category B vs A1). 'per_event_type': one tenant-wide price per
//   event type, independent of category (e.g. mental_coach Sitzung/Paket).
const pricingMode = ref<'per_category' | 'per_event_type'>('per_category')
const eventTypesLoading = ref(false)

const loadEventTypeTemplates = async () => {
  if (eventTypesLoading.value || eventTypeTemplates.value.length > 0) return
  // Snapshot the type this fetch is *for* — if the user switches business_type
  // again (step 0 → back → different type) before this resolves, the reset
  // watcher below already cleared eventTypeTemplates for the new type, and we
  // must not let this now-stale response overwrite it a moment later.
  const requestedType = formData.value.business_type
  eventTypesLoading.value = true
  try {
    const res = await $fetch<{ eventTypes: EventTypeTemplate[]; pricingMode: 'per_category' | 'per_event_type' }>(
      '/api/tenants/template-event-types',
      { query: { business_type: requestedType } }
    )
    if (formData.value.business_type !== requestedType) return
    eventTypeTemplates.value = res.eventTypes || []
    pricingMode.value = res.pricingMode || 'per_category'
  } catch {
    if (formData.value.business_type !== requestedType) return
    // Fallback keeps the step usable even if the endpoint is unreachable.
    // Uses the branch-aware label so it doesn't silently show "Fahrstunde"
    // for a business type that isn't driving_school.
    eventTypeTemplates.value = [
      { code: 'lesson', name: labels.value.appointment, price_chf: 95, duration_minutes: 45, default_enabled: true, public_bookable: true, require_payment: true },
    ]
    pricingMode.value = 'per_category'
  } finally {
    eventTypesLoading.value = false
  }
}

const pricingRows = ref<PricingRow[]>([])

/** Driving-school default: CHF 120 from the 2nd lesson (Admin → Kategorien). */
const DEFAULT_ADMIN_FEE = { chf: 120, applies_from: 2 }
const adminFeeByCatId = ref<Record<number, { chf: number; applies_from: number }>>({})
const showAdminFeeInRegister = computed(
  () => pricingMode.value === 'per_category' && formData.value.business_type === 'driving_school'
)

const effectiveCategoryList = computed((): TemplateCategory[] => {
  const result: TemplateCategory[] = []
  for (const cat of templateCategories.value) {
    const selectedChildren = (cat.children || []).filter(c => selectedCategoryIds.value.has(c.id))
    // Also include selected custom subs of this template parent
    const customSubs = customSubsOf(cat.id)
      .filter(cc => selectedCategoryIds.value.has(cc.tempId))
      .map(cc => ({ id: cc.tempId, name: cc.name, code: cc.code || undefined, color: cc.color }))
    const allSubs = [...selectedChildren, ...customSubs]
    if (allSubs.length > 0) {
      result.push(...allSubs)
    } else if (selectedCategoryIds.value.has(cat.id)) {
      result.push(cat)
    }
  }
  // Custom main categories
  for (const cc of customMainCats.value) {
    if (!selectedCategoryIds.value.has(cc.tempId)) continue
    const subs = customSubsOf(cc.tempId)
      .filter(c => selectedCategoryIds.value.has(c.tempId))
      .map(c => ({ id: c.tempId, name: c.name, code: c.code || undefined, color: c.color }))
    if (subs.length > 0) {
      result.push(...subs)
    } else {
      result.push({ id: cc.tempId, name: cc.name, code: cc.code || undefined, color: cc.color })
    }
  }
  return result
})

// Pricing "groups" – in per_category mode these are the selected categories
// (price grid = category × event type). In per_event_type mode there is no
// category dimension, so each event type becomes its own single-row group.
const pricingGroups = computed((): TemplateCategory[] => {
  if (pricingMode.value === 'per_event_type') {
    // Stable negative ids from code so deleting a middle item doesn't rematch rows.
    return eventTypeTemplates.value.map((e) => ({
      id: stableEventTypeGroupId(e.code),
      name: e.name,
      code: e.code,
    }))
  }
  return effectiveCategoryList.value
})

function stableEventTypeGroupId(code: string): number {
  let h = 0
  for (let i = 0; i < code.length; i++) h = ((h << 5) - h + code.charCodeAt(i)) | 0
  return -Math.abs(h || 1)
}

const removeTemplateEventType = (code: string) => {
  eventTypeTemplates.value = eventTypeTemplates.value.filter(t => t.code !== code)
  pricingRows.value = pricingRows.value.filter(r => r.type !== code)
}

const toggleRowRequirePayment = (row: PricingRow) => {
  row.require_payment = !row.require_payment
  if (row.require_payment && !(row.price_chf > 0)) {
    const template = eventTypeTemplates.value.find(t => t.code === row.type)
    row.price_chf = template?.price_chf && template.price_chf > 0 ? template.price_chf : 100
  }
}

// Rebuild flat pricingRows whenever selected categories/event-types change, preserving existing values
watch([pricingGroups, eventTypeTemplates], ([groups, types]) => {
  const updated: PricingRow[] = []
  if (pricingMode.value === 'per_event_type') {
    // One row per event type, no category crossing.
    for (const group of groups) {
      const template = types.find(t => t.code === group.code)
      if (!template) continue
      // Match by type code (stable across deletes), not shifting catId index.
      const existing = pricingRows.value.find(r => r.type === template.code)
      updated.push(existing ? {
        ...existing,
        catId: group.id,
        catName: group.name,
        catCode: group.code,
        typeLabel: template.name,
        // Keep user's Sofortzahlung / Ohne Sofortzahlung choice
      } : {
        catId: group.id,
        catName: group.name,
        catCode: group.code,
        catColor: undefined,
        type: template.code,
        typeLabel: template.name,
        price_chf: template.price_chf,
        duration_minutes: template.duration_minutes,
        enabled: template.default_enabled,
        public_bookable: template.public_bookable ?? true,
        require_payment: template.require_payment !== false,
      })
    }
  } else {
    const pricingTypes = types.length > 0
      ? types
      : [{ code: 'lesson', name: labels.value.appointment, price_chf: 95, duration_minutes: 45, default_enabled: true, public_bookable: true, require_payment: true }]
    for (const cat of groups) {
      for (const t of pricingTypes) {
        const existing = pricingRows.value.find(r => r.catId === cat.id && r.type === t.code)
        updated.push(existing ? {
          ...existing,
          catName: cat.name,
          catCode: cat.code,
          catColor: cat.color,
          require_payment: t.require_payment !== false,
        } : {
          catId: cat.id,
          catName: cat.name,
          catCode: cat.code,
          catColor: cat.color,
          type: t.code,
          typeLabel: t.name,
          price_chf: t.price_chf,
          duration_minutes: t.duration_minutes,
          enabled: t.default_enabled,
          public_bookable: t.public_bookable ?? true,
          require_payment: t.require_payment !== false,
        })
      }
    }
  }
  pricingRows.value = updated
}, { immediate: true, flush: 'sync' })

// Keep per-category admin fee entries in sync (defaults 120 / ab Termin 2).
watch(pricingGroups, (groups) => {
  if (!showAdminFeeInRegister.value) return
  const next = { ...adminFeeByCatId.value }
  for (const cat of groups) {
    if (!next[cat.id]) next[cat.id] = { ...DEFAULT_ADMIN_FEE }
  }
  adminFeeByCatId.value = next
}, { immediate: true })

// ─── Custom event types (tenant-defined services beyond the template list) ──
// Always priced tenant-wide via rule_type='event_price' + event_type_code
// (never crossed with categories, even in per_category mode) — this keeps
// them on the same, already-functional pricing path used by per_event_type
// business types like mental_coach, instead of inventing a new dead-end
// rule_type. A matching event_types row is created by the backend so it's
// immediately selectable when creating appointments after login.
interface CustomEventType {
  tempCode: string
  name: string
  price_chf: number
  duration_minutes: number
  enabled: boolean
  public_bookable: boolean
  require_payment: boolean
}
const customEventTypes = ref<CustomEventType[]>([])
const showAddEventTypeForm = ref(false)
const newEventType = ref({ name: '', price_chf: 100, duration_minutes: 60, public_bookable: true, require_payment: true })

const slugifyEventTypeCode = (name: string): string => {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents (ä→a etc.)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'leistung'
  const reserved = new Set([...eventTypeTemplates.value.map(t => t.code), ...customEventTypes.value.map(c => c.tempCode)])
  let code = base
  let i = 2
  while (reserved.has(code)) { code = `${base}_${i}`; i++ }
  return code
}

const addCustomEventType = () => {
  const name = newEventType.value.name.trim()
  if (!name) return
  customEventTypes.value.push({
    tempCode: slugifyEventTypeCode(name),
    name,
    price_chf: newEventType.value.require_payment ? (newEventType.value.price_chf || 0) : 0,
    duration_minutes: newEventType.value.duration_minutes || 60,
    enabled: true,
    public_bookable: newEventType.value.public_bookable,
    require_payment: newEventType.value.require_payment,
  })
  newEventType.value = { name: '', price_chf: 100, duration_minutes: 60, public_bookable: true, require_payment: true }
  showAddEventTypeForm.value = false
}

const removeCustomEventType = (tempCode: string) => {
  customEventTypes.value = customEventTypes.value.filter(c => c.tempCode !== tempCode)
}

const toggleCustomRequirePayment = (ce: CustomEventType) => {
  ce.require_payment = !ce.require_payment
  if (ce.require_payment && !(ce.price_chf > 0)) ce.price_chf = 100
}

const cancelAddEventTypeForm = () => {
  showAddEventTypeForm.value = false
  newEventType.value = { name: '', price_chf: 100, duration_minutes: 60, public_bookable: true, require_payment: true }
}

const categoriesLoading = ref(false)

const allTemplateCategoryIds = computed(() => {
  const ids: number[] = []
  for (const cat of templateCategories.value) {
    ids.push(cat.id)
    for (const child of cat.children || []) ids.push(child.id)
  }
  return ids
})

const parentCategoryIds = computed(() =>
  templateCategories.value.map(c => c.id)
)

// Count only "leaf" selections: children count as-is, parents only count if they have no selected children
const effectiveCategoryCount = computed(() => {
  // Fallback to raw selected count if templateCategories not yet loaded
  if (templateCategories.value.length === 0) return selectedCategoryIds.value.size
  let count = 0
  // Template categories
  for (const cat of templateCategories.value) {
    const selectedChildren = (cat.children || []).filter(c => selectedCategoryIds.value.has(c.id))
    if (selectedChildren.length > 0) {
      count += selectedChildren.length
    } else if (selectedCategoryIds.value.has(cat.id)) {
      count += 1
    }
  }
  // Custom categories (negative tempIds, not in templateCategories)
  for (const cc of customCategories.value) {
    if (cc.parentTempId !== null) continue // subcats are counted via their parent
    const subs = customCategories.value.filter(c => c.parentTempId === cc.tempId)
    if (subs.length > 0) {
      count += subs.filter(s => selectedCategoryIds.value.has(s.tempId)).length
    } else if (selectedCategoryIds.value.has(cc.tempId)) {
      count += 1
    }
  }
  return count
})

const loadTemplateCategories = async () => {
  if (categoriesLoading.value) return
  if (templateCategories.value.length > 0) return // already loaded, keep user's selection
  // Snapshot the type this fetch is *for* — see loadEventTypeTemplates() above
  // for why this guard against a stale, since-superseded response is needed.
  const requestedType = formData.value.business_type
  categoriesLoading.value = true
  try {
    const res = await $fetch<{ categories: TemplateCategory[] }>('/api/tenants/template-categories', {
      query: { business_type: requestedType }
    })
    if (formData.value.business_type !== requestedType) return
    templateCategories.value = res.categories || []
    // Start with nothing selected – user picks explicitly
    selectedCategoryIds.value = new Set<number>()
  } catch {
    if (formData.value.business_type !== requestedType) return
    templateCategories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

const toggleCategory = (id: number) => {
  if (selectedCategoryIds.value.has(id)) {
    selectedCategoryIds.value.delete(id)
    // Deselecting a parent also removes all its children (template + custom)
    const parent = templateCategories.value.find(c => c.id === id)
    if (parent?.children) {
      for (const child of parent.children) selectedCategoryIds.value.delete(child.id)
    }
    for (const cc of customSubsOf(id)) selectedCategoryIds.value.delete(cc.tempId)
  } else {
    selectedCategoryIds.value.add(id)
  }
  selectedCategoryIds.value = new Set(selectedCategoryIds.value)
}

const selectAllCategories = () => {
  const all = new Set<number>(allTemplateCategoryIds.value)
  for (const cc of customCategories.value) all.add(cc.tempId)
  selectedCategoryIds.value = all
}

const deselectAllCategories = () => {
  selectedCategoryIds.value = new Set<number>()
}

const addCustomCategory = () => {
  const name = newCat.value.name.trim()
  if (!name) return
  const id = _nextCustomId--
  customCategories.value.push({
    tempId: id,
    name,
    code: newCat.value.code.trim().toUpperCase(),
    color: newCat.value.color,
    parentTempId: newCat.value.parentTempId,
  })
  // Auto-select the new category
  selectedCategoryIds.value = new Set([...selectedCategoryIds.value, id])
  // Reset form
  newCat.value = { name: '', code: '', color: CUSTOM_PALETTE[0], parentTempId: null }
  showAddCatForm.value = false
}

const removeCustomCategory = (tempId: number) => {
  // Remove this category and any custom children
  const toRemove = new Set<number>([tempId, ...customSubsOf(tempId).map(c => c.tempId)])
  customCategories.value = customCategories.value.filter(c => !toRemove.has(c.tempId))
  const updated = new Set(selectedCategoryIds.value)
  for (const id of toRemove) updated.delete(id)
  selectedCategoryIds.value = updated
}

// ─── Locations ─────────────────────────────────────────────────────────────
interface LocationEntry {
  name: string
  address: string
  zip: string
  city: string
  phone: string
  email: string
}

const isDrivingSchool = computed(() => formData.value.business_type === 'driving_school')

/** How customers can meet — physical and/or remote channels */
const meetingChannels = ref({
  meetingPoint: true,
  phone: false,
  onlineCall: false,
})

const REMOTE_LOCATION_DEFS = [
  { key: 'phone' as const, name: 'Telefon', address: 'Remote / Telefon' },
  { key: 'onlineCall' as const, name: 'Online Call', address: 'Remote / Video (Zoom, Teams, …)' },
]

const locationsList = ref<LocationEntry[]>([
  { name: '', address: '', zip: '', city: '', phone: '', email: '' }
])

const addLocation = () => {
  locationsList.value.push({ name: '', address: '', zip: '', city: '', phone: '', email: '' })
}

const removeLocation = (index: number) => {
  locationsList.value.splice(index, 1)
}

const toggleMeetingPoint = () => {
  // Driving schools always need at least one physical Treffpunkt
  if (isDrivingSchool.value && meetingChannels.value.meetingPoint) return
  meetingChannels.value.meetingPoint = !meetingChannels.value.meetingPoint
}

const validLocations = computed(() => locationsList.value.filter(l => l.name.trim()))

/** Physical + remote locations that will be created on register */
const locationsForSubmit = computed((): LocationEntry[] => {
  const locs: LocationEntry[] = []
  if (meetingChannels.value.meetingPoint) {
    locs.push(...validLocations.value)
  }
  for (const def of REMOTE_LOCATION_DEFS) {
    if (!meetingChannels.value[def.key]) continue
    if (locs.some(l => l.name === def.name)) continue
    locs.push({ name: def.name, address: def.address, zip: '', city: '', phone: '', email: '' })
  }
  return locs
})

const hasValidLocation = computed(() => {
  const anyChannel =
    meetingChannels.value.meetingPoint ||
    meetingChannels.value.phone ||
    meetingChannels.value.onlineCall
  if (!anyChannel) return false
  if (meetingChannels.value.meetingPoint && validLocations.value.length === 0) return false
  return locationsForSubmit.value.length > 0
})

// Pre-fill first location from company address when entering step 3
const prefillFirstLocation = () => {
  if (!meetingChannels.value.meetingPoint) return
  if (locationsList.value[0].name) return
  locationsList.value[0] = {
    name: formData.value.name ? `Hauptstandort ${formData.value.city}`.trim() : '',
    address: formData.value.street && formData.value.streetNr
      ? `${formData.value.street} ${formData.value.streetNr}`
      : '',
    zip: formData.value.zip || '',
    city: formData.value.city || '',
    phone: formData.value.contact_phone || '',
    email: formData.value.contact_email || '',
  }
}

// ─── Staff ─────────────────────────────────────────────────────────────────
interface StaffEntry { first_name: string; last_name: string; phone: string; email: string }
type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'error'

const staffList = ref<StaffEntry[]>([{ first_name: '', last_name: '', phone: '', email: '' }])
const staffEmailChecks = ref<CheckState[]>(['idle'])
const staffEmailTakenMsgs = ref<string[]>([''])
const staffEmailDebouncers: Array<ReturnType<typeof setTimeout> | null> = [null]

const addStaff = () => {
  staffList.value.push({ first_name: '', last_name: '', phone: '', email: '' })
  staffEmailChecks.value.push('idle')
  staffEmailTakenMsgs.value.push('')
  staffEmailDebouncers.push(null)
}
const removeStaff = (index: number) => {
  staffList.value.splice(index, 1)
  staffEmailChecks.value.splice(index, 1)
  staffEmailTakenMsgs.value.splice(index, 1)
  if (staffEmailDebouncers[index]) clearTimeout(staffEmailDebouncers[index]!)
  staffEmailDebouncers.splice(index, 1)
}
const staffAdminIsSelf = ref(false)

const adminEmailForStaffCompare = computed(() =>
  (adminForm.value.email || adminEmailEarly.value || '').trim().toLowerCase()
)

const staffEmailMatchesAdmin = (staff: StaffEntry) => {
  const e = (staff.email || '').trim().toLowerCase()
  return !!e && !!adminEmailForStaffCompare.value && e === adminEmailForStaffCompare.value
}

const staffEmailFieldClass = (staff: StaffEntry, index: number) => {
  if (staffEmailMatchesAdmin(staff) || staffEmailChecks.value[index] === 'taken') {
    return 'border-red-300 focus:ring-red-400'
  }
  if (staffEmailChecks.value[index] === 'available') {
    return 'border-green-300 focus:ring-green-400'
  }
  const e = (staff.email || '').trim()
  if (!e || !e.includes('@')) return 'border-red-200 focus:ring-red-400'
  return 'border-gray-200 focus:ring-blue-500'
}

const staffStepValid = computed(() =>
  staffList.value.every((s, i) => {
    if (!s.first_name.trim()) return false
    const e = (s.email || '').trim()
    if (!e.includes('@')) return false
    if (staffEmailMatchesAdmin(s)) return false
    if (staffEmailChecks.value[i] === 'taken') return false
    if (staffEmailChecks.value[i] === 'checking') return false
    return true
  })
)

const checkStaffEmail = (index: number, val: string) => {
  if (staffEmailDebouncers[index]) clearTimeout(staffEmailDebouncers[index]!)
  const email = val.trim()
  if (!email.includes('@') || email.length < 5) {
    staffEmailChecks.value[index] = 'idle'
    staffEmailTakenMsgs.value[index] = ''
    return
  }
  if (staffEmailMatchesAdmin(staffList.value[index])) {
    staffEmailChecks.value[index] = 'idle'
    staffEmailTakenMsgs.value[index] = ''
    return
  }
  // Duplicate within the current staff list
  const normalized = email.toLowerCase()
  const dupIndex = staffList.value.findIndex(
    (s, i) => i !== index && (s.email || '').trim().toLowerCase() === normalized
  )
  if (dupIndex >= 0) {
    staffEmailChecks.value[index] = 'taken'
    staffEmailTakenMsgs.value[index] = `Diese E-Mail wird bereits für ${labels.value.staff} ${dupIndex + 1} verwendet.`
    return
  }
  staffEmailChecks.value[index] = 'checking'
  staffEmailDebouncers[index] = setTimeout(async () => {
    try {
      const res = await $fetch<{ email?: { available: boolean; reason?: string } }>(
        '/api/tenants/check-availability',
        { query: { email } }
      )
      if (res.email?.available) {
        staffEmailChecks.value[index] = 'available'
        staffEmailTakenMsgs.value[index] = ''
      } else {
        staffEmailChecks.value[index] = 'taken'
        staffEmailTakenMsgs.value[index] =
          res.email?.reason === 'admin'
            ? `Das ist eine Admin-E-Mail — für den ${labels.value.staff}-Login eine andere Adresse wählen.`
            : res.email?.reason === 'auth'
              ? 'Diese E-Mail ist bereits registriert. Bitte eine andere Adresse wählen.'
              : 'Diese E-Mail ist bereits registriert. Bitte eine andere Adresse wählen.'
      }
    } catch {
      staffEmailChecks.value[index] = 'error'
    }
  }, 500)
}

const onStaffEmailInput = (index: number, val: string) => {
  staffEmailChecks.value[index] = 'idle'
  staffEmailTakenMsgs.value[index] = ''
  checkStaffEmail(index, val)
}

const applyAdminToStaff = () => {
  if (staffAdminIsSelf.value) {
    staffList.value[0] = {
      first_name: adminForm.value.first_name || formData.value.contact_person_first_name,
      last_name:  adminForm.value.last_name  || formData.value.contact_person_last_name,
      phone:      adminForm.value.phone      || formData.value.contact_phone,
      // Never copy admin email — staff login needs a different address
      email: '',
    }
  } else {
    staffList.value[0] = { first_name: '', last_name: '', phone: '', email: '' }
  }
  staffEmailChecks.value[0] = 'idle'
  staffEmailTakenMsgs.value[0] = ''
  if (staffEmailDebouncers[0]) {
    clearTimeout(staffEmailDebouncers[0]!)
    staffEmailDebouncers[0] = null
  }
}
const staffInviteResults = ref<Array<{ name: string; status: string; message: string; invite_link?: string }> | null>(null)

// ─── Setup progress (loading screen) ───────────────────────────────────────
type SetupProgressStatus = 'pending' | 'active' | 'done'
interface SetupProgressStep {
  id: string
  label: string
  status: SetupProgressStatus
}
const setupProgressSteps = ref<SetupProgressStep[]>([])
const setupProgressDetail = ref('')
let registerSubProgressTimer: ReturnType<typeof setInterval> | null = null

const clearRegisterSubProgress = () => {
  if (registerSubProgressTimer) {
    clearInterval(registerSubProgressTimer)
    registerSubProgressTimer = null
  }
}

const initSetupProgress = (hasStaff: boolean) => {
  clearRegisterSubProgress()
  const L = labels.value
  const steps: SetupProgressStep[] = [
    { id: 'register', label: `${L.businessNoun} wird registriert`, status: 'active' },
    {
      id: 'templates',
      label: skipsCategories.value
        ? 'Leistungen & Vorlagen werden erstellt'
        : `${L.categoriesLabel} & Vorlagen werden erstellt`,
      status: 'pending',
    },
    { id: 'locations', label: 'Standorte & Preise werden eingerichtet', status: 'pending' },
    { id: 'admin', label: 'Admin-Konto wird erstellt', status: 'pending' },
  ]
  if (hasStaff) {
    steps.push({ id: 'staff', label: `${L.staffPlural} werden eingeladen`, status: 'pending' })
  }
  steps.push({ id: 'welcome', label: 'Willkommens-E-Mail wird gesendet', status: 'pending' })
  setupProgressSteps.value = steps
  setupProgressDetail.value = steps[0]?.label || ''
}

const markProgressDone = (id: string) => {
  setupProgressSteps.value = setupProgressSteps.value.map((s) =>
    s.id === id ? { ...s, status: 'done' as const } : s
  )
}

const setProgressActive = (id: string) => {
  setupProgressSteps.value = setupProgressSteps.value.map((s) => {
    if (s.id === id) return { ...s, status: 'active' as const }
    if (s.status === 'active') return { ...s, status: 'done' as const }
    return s
  })
  const step = setupProgressSteps.value.find((s) => s.id === id)
  if (step) setupProgressDetail.value = step.label
}

/** Soft progress while the long /register call runs (tenant + templates + locations). */
const startRegisterSubProgress = () => {
  clearRegisterSubProgress()
  const softIds = ['register', 'templates', 'locations']
  let i = 0
  registerSubProgressTimer = setInterval(() => {
    if (i >= softIds.length - 1) {
      clearRegisterSubProgress()
      return
    }
    markProgressDone(softIds[i])
    i += 1
    setProgressActive(softIds[i])
  }, 2400)
}

const finishRegisterSubProgress = () => {
  clearRegisterSubProgress()
  for (const id of ['register', 'templates', 'locations']) {
    markProgressDone(id)
  }
}

onBeforeUnmount(() => {
  clearRegisterSubProgress()
})

// ─── State ─────────────────────────────────────────────────────────────────
const currentStep = ref(0)
const acceptTerms = ref(false)
const logoFile    = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const logoError   = ref<string | null>(null)
const logoSquareFile    = ref<File | null>(null)
const logoSquarePreview = ref<string | null>(null)
const logoSquareError = ref<string | null>(null)
const colorsExtracted = ref(false)
const error       = ref<string | null>(null)
const createdTenantSlug    = ref('')
const createdTenantId      = ref('')
const createdCustomerNumber = ref('')
const logoInput = ref<HTMLInputElement>()
const logoSquareInput = ref<HTMLInputElement>()

const companyInitials = computed(() => {
  const name = (formData.value.name || '').trim()
  if (!name) return '?'
  const words = name.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
})
// Generates up to 4 smart SMS sender ID suggestions from the tenant name.
// All suggestions are max 11 chars, letters/digits/spaces only, at least 1 letter.
const smsSenderSuggestions = computed((): string[] => {
  const raw = (formData.value.name || '').trim()
  if (!raw) return []

  const clean = (s: string) =>
    s.replace(/ä/gi, 'a').replace(/ö/gi, 'o').replace(/ü/gi, 'u').replace(/ß/g, 'ss')
     .replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 11).trim()

  const suggestions: string[] = []
  const seen = new Set<string>()
  const add = (s: string) => { const c = clean(s); if (c && !seen.has(c)) { seen.add(c); suggestions.push(c) } }

  const words = raw.split(/\s+/).filter(Boolean)
  // Branchenspezifisches Kürzel aus den Anfangsbuchstaben von "businessNoun"
  // (z.B. "Fahrschule" → "FS", "Consulting-Unternehmen" → "CU").
  const businessNounWords = labels.value.businessNoun.split(/[^a-zA-Z]+/).filter(Boolean)
  const prefix = businessNounWords.map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'FS'
  const genericWords = new Set([
    ...businessNounWords.map(w => w.toLowerCase()),
    prefix.toLowerCase(), 'die', 'der', 'das'
  ])

  // 1. Branchen-Bezeichnung – immer eine gültige Vorschlag-Basis
  add(labels.value.businessNoun)
  // 2. First word (often already the brand or business name)
  add(words[0])
  // 3. Prefix + first non-generic word
  const brandWords = words.filter(w => !genericWords.has(w.toLowerCase()))
  if (brandWords[0]) add(prefix + ' ' + brandWords[0])
  // 4. Full name truncated to 11 chars
  add(raw)
  // 5. Initials + rest: "XY.Muster" style
  if (brandWords[0]) add(prefix + '.' + brandWords[0])

  return suggestions.slice(0, 4)
})

const userEditedSlug = ref(false)
const legalNameManuallyEdited = ref(false)

// ─── Admin Form ────────────────────────────────────────────────────────────
const adminForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: ''
})
const adminSameAsCompany = ref(false)
const showAdvancedBranding = ref(false)

// adminEmailEarly: entered on step 0 for early validation; synced to adminForm.email
const adminEmailEarly = ref('')
watch(adminEmailEarly, (val, oldVal) => {
  adminForm.value.email = val
  // Auto-sync contact_email and from_email as long as they haven't been manually customized
  if (!formData.value.contact_email || formData.value.contact_email === oldVal) {
    formData.value.contact_email = val
  }
  if (!formData.value.from_email || formData.value.from_email === oldVal) {
    formData.value.from_email = val
  }
})

// ─── Password Strength ─────────────────────────────────────────────────────
const passwordMismatch = computed(() => adminForm.value.password !== adminForm.value.passwordConfirm)
const zxcvbnScore    = ref<0 | 1 | 2 | 3 | 4 | null>(null)
const hibpStatus     = ref<'idle' | 'checking' | 'pwned' | 'safe'>('idle')
const hibpCount      = ref(0)
const showPw         = ref(false)
let hibpDebounceTimer: ReturnType<typeof setTimeout> | null = null

const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  adminForm.value.password = pw
  adminForm.value.passwordConfirm = pw
  showPw.value = true
  checkPasswordStrength(pw)
}

const checkPasswordStrength = async (password: string) => {
  if (!password || password.length < 12) { zxcvbnScore.value = null; hibpStatus.value = 'idle'; return }
  const { default: zxcvbn } = await import('zxcvbn')
  const result = zxcvbn(password)
  zxcvbnScore.value = result.score as 0 | 1 | 2 | 3 | 4
  if (result.score < 2) { hibpStatus.value = 'idle'; return }
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

// ─── Computed Validation ───────────────────────────────────────────────────
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return !!(formData.value.business_type &&
                formData.value.name && formData.value.legal_company_name && formData.value.slug &&
                formData.value.contact_person_first_name && formData.value.contact_person_last_name &&
                formData.value.contact_email && formData.value.contact_phone &&
                formData.value.street && formData.value.streetNr && formData.value.zip && formData.value.city) &&
             slugCheck.value !== 'taken' && slugCheck.value !== 'reserved' && slugCheck.value !== 'checking' &&
             (emailCheck.value === 'available' || emailCheck.value === 'error') &&
             !!adminEmailEarly.value && adminEmailEarly.value.includes('@')
    case 1: {
      if (skipsCategories.value) return true
      if (selectedCategoryIds.value.size === 0) return false
      // Every selected parent that HAS subcategories must have at least one sub selected
      for (const cat of templateCategories.value) {
        if (!selectedCategoryIds.value.has(cat.id)) continue
        if (!cat.children?.length) continue
        const hasSelectedChild = cat.children.some(c => selectedCategoryIds.value.has(c.id))
        if (!hasSelectedChild) return false
      }
      return effectiveCategoryCount.value > 0
    }
    case 2:
      return true // Prices are optional (defaults pre-filled)
    case 3:
      return hasValidLocation.value
    case 5:
      return !!(adminForm.value.first_name && adminForm.value.last_name &&
                adminForm.value.email && adminForm.value.password &&
                adminForm.value.passwordConfirm && passwordValid.value &&
                !passwordMismatch.value && hibpStatus.value !== 'pwned' && hibpStatus.value !== 'checking' &&
                (emailCheck.value === 'available' || emailCheck.value === 'error'))
    case 6: {
      return staffStepValid.value
    }
    default:
      return true
  }
})

const canSubmit = computed(() => acceptTerms.value && canProceed.value)

const tenantUrl = computed(() => {
  const slug = (createdTenantSlug.value || formData.value.slug || '').trim()
  if (!slug) return ''
  if (import.meta.client && typeof window !== 'undefined') {
    return `${window.location.origin}/${slug}`
  }
  return `https://app.simy.ch/${slug}`
})

// ─── Navigation ───────────────────────────────────────────────────────────
const nextStep = async () => {
  if (!canProceed.value || currentStep.value >= 7) return

  // Need pricingMode before deciding whether to skip categories
  if (currentStep.value === 0) {
    await loadEventTypeTemplates()
  }

  let next = currentStep.value + 1
  // per_event_type: skip categories step (prices are per Leistung, not Bereich)
  if (next === 1 && pricingMode.value === 'per_event_type') next = 2

  if (next === 1) loadTemplateCategories()
  if (next === 2) loadEventTypeTemplates()
  if (next === 3) prefillFirstLocation()
  currentStep.value = next
}

const previousStep = () => {
  if (currentStep.value <= 0) return
  let prev = currentStep.value - 1
  if (prev === 1 && pricingMode.value === 'per_event_type') prev = 0
  currentStep.value = prev
}

// ─── Availability Checks ───────────────────────────────────────────────────
const slugCheck  = ref<CheckState>('idle')
const emailCheck = ref<CheckState>('idle')

let slugDebounce:  ReturnType<typeof setTimeout> | null = null
let emailDebounce: ReturnType<typeof setTimeout> | null = null

const checkSlug = (val: string) => {
  if (slugDebounce) clearTimeout(slugDebounce)
  const slug = val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '')
  if (slug.length < 3) { slugCheck.value = 'idle'; return }
  slugCheck.value = 'checking'
  slugDebounce = setTimeout(async () => {
    try {
      const res = await $fetch<{ slug: { available: boolean; reason?: 'invalid' | 'reserved' | 'taken' } }>(
        '/api/tenants/check-availability',
        { query: { slug } }
      )
      if (res.slug.available) {
        slugCheck.value = 'available'
      } else if (res.slug.reason === 'reserved') {
        slugCheck.value = 'reserved'
      } else {
        slugCheck.value = 'taken'
      }
    } catch { slugCheck.value = 'error' }
  }, 500)
}

const checkAdminEmail = (val: string) => {
  if (emailDebounce) clearTimeout(emailDebounce)
  const email = val.trim()
  if (!email.includes('@') || email.length < 5) { emailCheck.value = 'idle'; return }
  emailCheck.value = 'checking'
  emailDebounce = setTimeout(async () => {
    try {
      const res = await $fetch<{ email: { available: boolean } }>('/api/tenants/check-availability', { query: { email } })
      emailCheck.value = res.email.available ? 'available' : 'taken'
    } catch { emailCheck.value = 'error' }
  }, 600)
}

// Debounced check while typing — triggers after 700ms of no input
const onAdminEmailInput = (val: string) => {
  emailCheck.value = 'idle'
  if (emailDebounce) clearTimeout(emailDebounce)
  const email = val.trim()
  if (!email.includes('@') || email.length < 5) return
  emailCheck.value = 'checking'
  emailDebounce = setTimeout(async () => {
    try {
      const res = await $fetch<{ email: { available: boolean } }>('/api/tenants/check-availability', { query: { email } })
      emailCheck.value = res.email.available ? 'available' : 'taken'
    } catch { emailCheck.value = 'error' }
  }, 700)
}

// ─── Form Helpers ─────────────────────────────────────────────────────────
const sanitizeSlug = () => {
  // Strip invalid chars and double-dashes, but allow trailing hyphen while typing
  formData.value.slug = formData.value.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-/, '') // only strip leading hyphen
}

const finalizeSlug = () => {
  // On blur: also strip trailing hyphen
  formData.value.slug = formData.value.slug.replace(/-$/, '')
  if (formData.value.slug) checkSlug(formData.value.slug)
}

const onSlugInput = () => {
  userEditedSlug.value = true
  if (error.value && /URL-Kennung|reserviert|bereits vergeben/i.test(error.value)) {
    error.value = null
  }
  checkSlug(formData.value.slug)
}

const handleLogoSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  logoError.value = null
  if (!file) return
  if (!file.type.startsWith('image/')) { logoError.value = 'Nur Bilddateien erlaubt (PNG, JPG, WebP)'; return }
  if (file.size > 5 * 1024 * 1024) { logoError.value = 'Datei zu gross — Maximum 5 MB'; return }
  try {
    logoPreview.value = await compressImage(file, 'wide')
    logoFile.value = base64ToFile(logoPreview.value, `logo-${Date.now()}.webp`)
    // Extract colors from logo
    const colors = await extractColorsFromLogo(logoPreview.value)
    if (colors) {
      formData.value.primary_color = colors[0]
      formData.value.secondary_color = colors[1]
      formData.value.accent_color = colors[2]
      colorsExtracted.value = true
      setTimeout(() => { colorsExtracted.value = false }, 3500)
    }
  } catch {
    logoError.value = 'Bildformat wird nicht unterstützt — bitte PNG, JPG oder WebP verwenden'
  }
}

const handleLogoSquareSelect = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  logoSquareError.value = null
  if (!file) return
  if (!file.type.startsWith('image/')) { logoSquareError.value = 'Nur Bilddateien erlaubt (PNG, JPG, WebP)'; return }
  if (file.size > 5 * 1024 * 1024) { logoSquareError.value = 'Datei zu gross — Maximum 5 MB'; return }
  try {
    logoSquarePreview.value = await compressImage(file, 'square')
    logoSquareFile.value = base64ToFile(logoSquarePreview.value, `logo-square-${Date.now()}.webp`)
    // Extract colors from square logo only if wide logo hasn't already set them
    if (!logoPreview.value) {
      const colors = await extractColorsFromLogo(logoSquarePreview.value)
      if (colors) {
        formData.value.primary_color = colors[0]
        formData.value.secondary_color = colors[1]
        formData.value.accent_color = colors[2]
        colorsExtracted.value = true
        setTimeout(() => { colorsExtracted.value = false }, 3500)
      }
    }
  } catch {
    logoSquareError.value = 'Bildformat wird nicht unterstützt — bitte PNG, JPG oder WebP verwenden'
  }
}

function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) { u8arr[n] = bstr.charCodeAt(n) }
  return new File([u8arr], filename, { type: mime })
}

const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  if (logoInput.value) logoInput.value.value = ''
}

const removeLogoSquare = () => {
  logoSquareFile.value = null
  logoSquarePreview.value = null
  if (logoSquareInput.value) logoSquareInput.value.value = ''
}

const applyAdminFromCompany = () => {
  if (adminSameAsCompany.value) {
    adminForm.value.first_name = formData.value.contact_person_first_name
    adminForm.value.last_name  = formData.value.contact_person_last_name
    adminForm.value.email      = formData.value.contact_email
    adminForm.value.phone      = formData.value.contact_phone
  } else {
    adminForm.value.first_name = ''
    adminForm.value.last_name  = ''
    adminForm.value.email      = ''
    adminForm.value.phone      = ''
  }
}

// ─── Submit ────────────────────────────────────────────────────────────────
const submitRegistration = async () => {
  if (!canSubmit.value) return

  currentStep.value = LOADING_STEP
  error.value = null

  const filledStaffPreview = staffList.value.filter((s) => {
    if (!s.first_name.trim()) return false
    const e = (s.email || '').trim().toLowerCase()
    if (!e.includes('@')) return false
    if (e === adminEmailForStaffCompare.value) return false
    return true
  })
  initSetupProgress(filledStaffPreview.length > 0)
  startRegisterSubProgress()

  try {
    const fd = new FormData()

    Object.entries(formData.value).forEach(([key, value]) => {
      const v = value?.toString().trim()
      if (v) fd.append(key, v)
    })

    // Selected category IDs (only template IDs — custom categories sent separately).
    // Always send the field so an intentional empty selection is distinguishable
    // from "omit and copy all templates" on older admin paths.
    const templateIds = Array.from(selectedCategoryIds.value).filter(id => id > 0)
    if (skipsCategories.value) {
      fd.append('skip_categories', '1')
      fd.append('selected_category_ids', '')
    } else if (templateIds.length > 0) {
      fd.append('selected_category_ids', templateIds.join(','))
    }

    // Custom categories defined by the user (not applicable when categories step is skipped)
    if (!skipsCategories.value && customCategories.value.length > 0) {
      const customJson = customCategories.value.map(cc => {
        let parentCode: string | null = null
        if (cc.parentTempId !== null) {
          if (cc.parentTempId > 0) {
            // Template parent — look up its code
            const tmpl = templateCategories.value.find(c => c.id === cc.parentTempId)
            parentCode = tmpl?.code ?? null
          } else {
            // Custom parent — use its code or name as key
            const parent = customCategories.value.find(c => c.tempId === cc.parentTempId)
            parentCode = parent?.code || parent?.name || null
          }
        }
        return { name: cc.name, code: cc.code, color: cc.color, parentCode }
      })
      fd.append('custom_categories_json', JSON.stringify(customJson))
    }

    // Pricing rules from flat pricingRows array.
    // per_category mode (driving_school-style): price varies per license category,
    //   so rows map to the legacy rule_type enum the pricing engine reads
    //   (base_price / theory). Event types without a wired-up rule_type (e.g.
    //   'exam' – see server/api/pricing/calculate.post.ts, no rule_type='exam'
    //   read path exists anywhere) are intentionally skipped instead of writing
    //   pricing_rules rows that would never be used.
    // per_event_type mode (mental_coach-style): one tenant-wide price per event
    //   type, stored via rule_type='event_price' + event_type_code (no category).
    const CATEGORY_MODE_RULE_TYPE: Record<string, string> = { lesson: 'base_price', theory: 'theory', consultation: 'consultation' }
    const pricingJson = pricingRows.value
      .filter(r => r.enabled)
      .map(r => {
        if (pricingMode.value === 'per_event_type') {
          // Free services: no pricing_rules row — only activate + duration/bookable.
          if (!r.require_payment) {
            return {
              label: r.typeLabel,
              rule_type: 'free_event',
              event_type_code: r.type,
              category_code: null,
              price_chf: 0,
              duration_minutes: r.duration_minutes,
              public_bookable: !!r.public_bookable,
            }
          }
          return {
            label: r.typeLabel,
            rule_type: 'event_price',
            event_type_code: r.type,
            category_code: null,
            price_chf: r.price_chf,
            duration_minutes: r.duration_minutes,
            public_bookable: !!r.public_bookable,
          }
        }
        const ruleType = CATEGORY_MODE_RULE_TYPE[r.type]
        if (!ruleType) return null
        return {
          label: `${r.catName} – ${r.typeLabel}`,
          rule_type: ruleType,
          category_code: r.catCode || r.catName.toUpperCase().replace(/\s+/g, '_'),
          price_chf: r.price_chf,
          duration_minutes: r.duration_minutes,
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // Custom, tenant-defined services (added via "Eigene Leistung hinzufügen").
    // Always flat-priced tenant-wide via event_price + event_type_code, in
    // both pricing modes — the backend also creates the matching event_types
    // row (is_custom: true) so it's immediately usable when creating
    // appointments, not just a pricing_rules row without a bookable type.
    const customEventTypeJson = customEventTypes.value
      .filter(c => c.enabled && c.name.trim())
      .map(c => ({
        label: c.name,
        rule_type: c.require_payment ? 'event_price' : 'free_event',
        event_type_code: c.tempCode,
        category_code: null,
        price_chf: c.require_payment ? c.price_chf : 0,
        duration_minutes: c.duration_minutes,
        is_custom: true,
        public_bookable: !!c.public_bookable,
      }))

    const adminFeeJson = showAdminFeeInRegister.value
      ? pricingGroups.value
          .filter((cat) => (adminFeeByCatId.value[cat.id]?.chf || 0) > 0)
          .map((cat) => {
            const fee = adminFeeByCatId.value[cat.id] || DEFAULT_ADMIN_FEE
            return {
              label: `${cat.name} – Adminpauschale`,
              rule_type: 'admin_fee',
              category_code: cat.code || cat.name.toUpperCase().replace(/\s+/g, '_'),
              price_chf: 0,
              duration_minutes: 45,
              admin_fee_chf: fee.chf,
              admin_fee_applies_from: fee.applies_from > 0 ? fee.applies_from : 2,
            }
          })
      : []

    fd.append('pricing_json', JSON.stringify([...pricingJson, ...customEventTypeJson, ...adminFeeJson]))

    // Locations as JSON (physical Treffpunkte + optional Telefon / Online Call)
    const locs = locationsForSubmit.value
    if (locs.length > 0) {
      fd.append('locations_json', JSON.stringify(locs))
    }

    if (logoFile.value) fd.append('logo_file', logoFile.value)
    if (logoSquareFile.value) fd.append('logo_square_file', logoSquareFile.value)

    // Platform tenant→tenant invite (?ref= stored by middleware)
    try {
      const { getStoredPlatformRefCode, clearPlatformRefCode } = usePlatformRef()
      const platformRef = getStoredPlatformRefCode()
      if (platformRef) {
        fd.append('platform_referral_code', platformRef)
        clearPlatformRefCode()
      }
    } catch { /* ignore */ }

    // 1. Register tenant + copy templates + create locations
    // Backend catches validation errors and returns HTTP 200 with { success: false, error }
    // so we must surface response.error directly — throwing new Error() loses status
    // fields and the outer catch used to fall back to a generic message.
    const response = await $fetch('/api/tenants/register', { method: 'POST', body: fd }) as any

    if (!response.success) {
      clearRegisterSubProgress()
      const msg = response.error || 'Unbekannter Fehler'
      if (/URL-Kennung|reserviert|bereits vergeben/i.test(msg)) {
        slugCheck.value = /reserviert/i.test(msg) ? 'reserved' : 'taken'
        currentStep.value = 0
      } else if (/E-Mail|email/i.test(msg)) {
        emailCheck.value = 'taken'
        currentStep.value = 7
      } else {
        currentStep.value = 7
      }
      error.value = msg
      return
    }

    finishRegisterSubProgress()
    setProgressActive('admin')

    createdTenantSlug.value     = response.tenant.slug
    createdCustomerNumber.value = response.tenant.customer_number
    createdTenantId.value       = response.tenant.id
    const registrationToken     = response.registration_token as string | undefined

    // If website mode: set website_status to pending_review
    if (isWebsiteMode.value && response.tenant.id) {
      try {
        await getSupabase()
          .from('tenants')
          .update({ website_status: 'pending_review' })
          .eq('id', response.tenant.id)
      } catch (_) {}
    }

    // 2. Create admin user (dedicated endpoint)
    let adminRes: any
    try {
      adminRes = await $fetch('/api/tenants/create-admin', {
        method: 'POST',
        body: {
          email:              adminForm.value.email,
          password:           adminForm.value.password,
          first_name:         adminForm.value.first_name,
          last_name:          adminForm.value.last_name,
          phone:              adminForm.value.phone,
          tenant_id:          response.tenant.id,
          registration_token: registrationToken,
        }
      }) as any
    } catch (adminErr: any) {
      // Rollback: Tenant löschen, damit der Slug wieder verwendbar ist
      try {
        await $fetch('/api/tenants/rollback-registration', {
          method: 'POST',
          body: { tenant_id: response.tenant.id, registration_token: registrationToken }
        })
      } catch (rollbackErr) {
        console.warn('Rollback failed:', rollbackErr)
      }
      // Re-throw original error to preserve status code for outer catch handler
      throw adminErr
    }

    if (!adminRes.success) {
      // Rollback: Tenant löschen, damit der Slug wieder verwendbar ist
      try {
        await $fetch('/api/tenants/rollback-registration', {
          method: 'POST',
          body: { tenant_id: response.tenant.id, registration_token: registrationToken }
        })
      } catch (rollbackErr) {
        console.warn('Rollback failed:', rollbackErr)
      }
      throw new Error('Admin-Konto konnte nicht erstellt werden: ' + (adminRes.message || ''))
    }

    // 3. Invite staff (non-critical)
    const filledStaff = filledStaffPreview.map(s => ({
      first_name: s.first_name.trim(),
      last_name: s.last_name.trim(),
      phone: s.phone.trim() || undefined,
      email: (s.email || '').trim(),
    }))
    if (filledStaff.length > 0) {
      setProgressActive('staff')
      try {
        const inviteRes = await $fetch('/api/tenants/invite-staff-batch', {
          method: 'POST',
          body: { tenant_id: response.tenant.id, staff_list: filledStaff }
        }) as any
        staffInviteResults.value = inviteRes.results || []
      } catch (inviteErr: any) {
        // Set synthetic failed result so the user sees what happened on the success screen
        staffInviteResults.value = filledStaff.map(s => ({
          name: `${s.first_name} ${s.last_name}`.trim(),
          status: 'failed',
          message: inviteErr?.data?.statusMessage || inviteErr?.message || 'Einladung konnte nicht gesendet werden'
        }))
      }
      markProgressDone('staff')
    }

    // 4. Send welcome email (non-critical)
    setProgressActive('welcome')
    try {
      await $fetch('/api/tenants/send-welcome-email', {
        method: 'POST',
        body: { tenantId: response.tenant.id }
      })
    } catch (welcomeErr) {
      console.warn('Welcome email failed (non-critical):', welcomeErr)
    }
    markProgressDone('welcome')
    setupProgressDetail.value = 'Fast fertig…'

    // Offer to save credentials — never block the success screen (Chrome's
    // PasswordCredential.store can hang until the user dismisses a prompt).
    void saveCredentials(
      adminForm.value.email,
      adminForm.value.password,
      `${adminForm.value.first_name} ${adminForm.value.last_name}`.trim()
    )

    currentStep.value = SUCCESS_STEP
    localStorage.removeItem(STORAGE_KEY)

  } catch (err: any) {
    clearRegisterSubProgress()
    console.error('Registration failed:', err)
    const statusCode = err.status || err.statusCode || err.data?.statusCode
    const knownMessage =
      err.data?.statusMessage ||
      err.data?.message ||
      err.statusMessage ||
      err.message

    const isUserFacing =
      !!knownMessage &&
      knownMessage.length < 200 &&
      !/^FetchError/i.test(knownMessage) &&
      !/\[[A-Z]+\]\s+\//.test(knownMessage) &&
      (statusCode == null || statusCode < 500)

    if (statusCode === 409 || /E-Mail|email.*bereits|bereits.*registriert/i.test(knownMessage || '')) {
      emailCheck.value = 'taken'
      error.value = knownMessage || 'Diese E-Mail-Adresse ist bereits registriert. Bitte verwende eine andere Adresse oder logge dich ein.'
    } else if (/URL-Kennung|reserviert|bereits vergeben/i.test(knownMessage || '')) {
      slugCheck.value = /reserviert/i.test(knownMessage || '') ? 'reserved' : 'taken'
      error.value = knownMessage
      currentStep.value = 0
      return
    } else {
      error.value = isUserFacing
        ? knownMessage
        : 'Ein technischer Fehler ist aufgetreten. Bitte versuche es erneut oder kontaktiere support@simy.ch'
    }
    currentStep.value = 7 // Back to confirmation so the user can retry without re-entering everything
  }
}

const goToLogin = () => {
  const slug = (createdTenantSlug.value || formData.value.slug || '').trim()
  // Relative path so preview/local work too; absolute app.simy.ch broke silently
  // when slug was empty (old handler did nothing).
  if (slug) {
    window.location.assign(`/${encodeURIComponent(slug)}`)
    return
  }
  window.location.assign('/login')
}

// ─── Watchers ─────────────────────────────────────────────────────────────
watch(() => formData.value.name, (newName: string) => {
  if (newName && !userEditedSlug.value) {
    formData.value.slug = newName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
  }
  if (newName && !legalNameManuallyEdited.value) {
    formData.value.legal_company_name = newName
  }
})

watch(() => adminSameAsCompany.value, () => applyAdminFromCompany())
watch(() => adminForm.value.password, (pw, oldPw) => {
  checkPasswordStrength(pw)
  // Nur bei Autofill / Passwort-Manager (Wert springt um >1 Zeichen), nicht beim Tippen —
  // sonst wäre die Bestätigung sinnlos gegen Tippfehler.
  const prev = oldPw || ''
  const next = pw || ''
  const isBulkFill = Math.abs(next.length - prev.length) > 1
  if (isBulkFill && next && (!adminForm.value.passwordConfirm || adminForm.value.passwordConfirm === prev)) {
    adminForm.value.passwordConfirm = next
  }
})

// Wenn der Geschäftstyp geändert wird (z.B. User geht von Step 1+ zurück zu
// Step 0 und wählt eine andere Branche), waren bereits geladene Kategorien/
// Event-Types/Preise für den *alten* Typ gedacht. Ohne Reset blieben sie
// stehen, weil loadTemplateCategories()/loadEventTypeTemplates() nur laden,
// wenn ihre jeweilige Liste noch leer ist. Wir setzen die Auswahl daher
// zurück, sobald sich der Typ ändert, und laden sofort neu, falls der User
// die betroffenen Schritte schon besucht hatte — sonst holt nextStep() die
// Daten wie gewohnt beim ersten Betreten des Schritts.
//
// WICHTIG: loadFromStorage() (siehe unten) ersetzt formData.value komplett
// in einem Zug ("formData.value = { ...formData.value, ...d.formData }"),
// was bei einem wiederhergestellten Draft mit z.B. business_type='consulting'
// denselben "Typ hat sich geändert"-Fall auslöst wie ein echter Dropdown-
// Wechsel — obwohl der User nichts geändert hat, sondern nur seinen alten
// Stand lädt. Ohne die isRestoringFromStorage-Guard hier würde das gerade
// wiederhergestellte selectedCategoryIds/customCategories/pricingRows/
// customEventTypes sofort wieder gelöscht. flush:'sync' + das Flag stellen
// sicher, dass der Reset währenddessen sicher übersprungen wird.
watch(() => formData.value.business_type, (newType, oldType) => {
  if (isRestoringFromStorage) return

  // Real branch switch (not the initial empty→first pick): wipe branch-specific
  // template data so the next load can't leak the previous industry's rows.
  if (oldType && newType && newType !== oldType) {
    templateCategories.value = []
    selectedCategoryIds.value = new Set()
    customCategories.value = []
    eventTypeTemplates.value = []
    pricingRows.value = []
    customEventTypes.value = []
    adminFeeByCatId.value = {}
    pricingMode.value = 'per_category'
  }

  // Meeting channels: Fahrschule braucht Treffpunkt; Consulting/Coaching default remote
  if (newType === 'driving_school') {
    meetingChannels.value.meetingPoint = true
  } else if (newType && (!oldType || oldType === 'driving_school')) {
    meetingChannels.value.phone = true
    meetingChannels.value.onlineCall = true
  }

  // Load pricingMode early so the progress bar can hide the categories step
  // for per_event_type branches before the user clicks Weiter.
  // Fire-and-forget (watcher stays sync for the isRestoringFromStorage guard).
  if (newType) {
    loadEventTypeTemplates().then(() => {
      if (currentStep.value === 1 && pricingMode.value === 'per_event_type') {
        currentStep.value = 2
      } else if (
        oldType && newType !== oldType &&
        currentStep.value >= 1 &&
        pricingMode.value !== 'per_event_type'
      ) {
        loadTemplateCategories()
      }
    })
  }
}, { flush: 'sync' })

// ─── LocalStorage ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'tenant-registration-data'
// Plain (non-reactive) flag, not a ref — it only needs to be readable
// synchronously by the flush:'sync' watcher above during loadFromStorage(),
// never by the template.
let isRestoringFromStorage = false

const saveToStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    formData: formData.value,
    // Never persist passwords — security risk (localStorage readable by extensions, XSS, shared machines)
    adminForm: { ...adminForm.value, password: '', passwordConfirm: '' },
    adminEmailEarly: adminEmailEarly.value,
    adminSameAsCompany: adminSameAsCompany.value,
    currentStep: currentStep.value,
    userEditedSlug: userEditedSlug.value,
    logoPreview: logoPreview.value,
    logoSquarePreview: logoSquarePreview.value,
    staffList: staffList.value,
    staffAdminIsSelf: staffAdminIsSelf.value,
    locationsList: locationsList.value,
    meetingChannels: meetingChannels.value,
    selectedCategoryIds: Array.from(selectedCategoryIds.value),
    customCategories: customCategories.value,
    pricingItems: pricingRows.value,
    customEventTypes: customEventTypes.value,
  }))
}

const loadFromStorage = () => {
  if (typeof window === 'undefined') return
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return
  isRestoringFromStorage = true
  try {
    const d = JSON.parse(saved)
    formData.value            = { ...formData.value, ...d.formData }
    adminForm.value           = { ...adminForm.value, ...d.adminForm, password: '', passwordConfirm: '' }
    adminEmailEarly.value     = d.adminEmailEarly || d.adminForm?.email || ''
    adminSameAsCompany.value  = d.adminSameAsCompany || false
    currentStep.value         = d.currentStep || 0
    userEditedSlug.value      = d.userEditedSlug || false
    logoPreview.value         = d.logoPreview || null
    logoSquarePreview.value   = d.logoSquarePreview || null
    // File objects can't be serialized to JSON, so we reconstruct them from the
    // stored base64 previews so the logo is actually uploaded on submit.
    if (logoPreview.value) {
      logoFile.value = base64ToFile(logoPreview.value, `logo-${Date.now()}.webp`)
    }
    if (logoSquarePreview.value) {
      logoSquareFile.value = base64ToFile(logoSquarePreview.value, `logo-square-${Date.now()}.webp`)
    }
    if (d.staffList) {
      staffList.value = (d.staffList as any[]).map((s) => ({
        first_name: s.first_name || '',
        last_name: s.last_name || '',
        phone: s.phone || '',
        email: s.email || '',
      }))
      staffEmailChecks.value = staffList.value.map(() => 'idle' as CheckState)
      staffEmailTakenMsgs.value = staffList.value.map(() => '')
      while (staffEmailDebouncers.length < staffList.value.length) staffEmailDebouncers.push(null)
      staffEmailDebouncers.length = staffList.value.length
      staffList.value.forEach((s, i) => {
        if ((s.email || '').includes('@')) checkStaffEmail(i, s.email)
      })
    }
    if (typeof d.staffAdminIsSelf === 'boolean') staffAdminIsSelf.value = d.staffAdminIsSelf
    if (d.locationsList) locationsList.value = d.locationsList
    if (d.meetingChannels && typeof d.meetingChannels === 'object') {
      meetingChannels.value = {
        meetingPoint: d.meetingChannels.meetingPoint !== false,
        phone: !!d.meetingChannels.phone,
        onlineCall: !!d.meetingChannels.onlineCall,
      }
    }
    if (Array.isArray(d.selectedCategoryIds)) selectedCategoryIds.value = new Set<number>(d.selectedCategoryIds)
    if (Array.isArray(d.customCategories)) customCategories.value = d.customCategories
    if (d.pricingItems && typeof d.pricingItems === 'object') pricingRows.value = d.pricingItems
    if (Array.isArray(d.customEventTypes)) customEventTypes.value = d.customEventTypes
    if (adminSameAsCompany.value) applyAdminFromCompany()
  } catch { /* ignore */ } finally {
    isRestoringFromStorage = false
  }
}

watch([formData, adminForm, adminEmailEarly, adminSameAsCompany, currentStep, locationsList, meetingChannels, staffList, staffAdminIsSelf, selectedCategoryIds, pricingRows, customEventTypes, logoPreview, logoSquarePreview], saveToStorage, { deep: true })

const route = useRoute()
const isWebsiteMode = computed(() => route.query.mode === 'website')
function darkenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount))
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount))
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const pageBackground = computed(() => {
  const p = formData.value.primary_color || '#3B82F6'
  const s = formData.value.secondary_color || '#6366F1'
  const a = formData.value.accent_color || '#8B5CF6'
  return `linear-gradient(135deg, ${darkenHex(p, 0.78)}, ${darkenHex(s, 0.72)} 55%, ${darkenHex(a, 0.82)})`
})

onMounted(async () => {
  const q = route.query

  // Awaited (rather than fire-and-forget) so the business_type query-param
  // check below can validate against the real list before applying it.
  await loadBusinessTypes()

  // Restore any previously saved progress first
  loadFromStorage()

  // Pre-select the business type when arriving from an industry-specific
  // marketing link (e.g. /tenant-register?type=consulting), so labels
  // ("Berater" instead of "Fahrlehrer" etc.) are correct from the very first
  // field the visitor sees — no need to manually switch the dropdown.
  // Takes precedence over a restored draft, same reasoning as the brand-color
  // params below: a fresh, explicit link is more trustworthy than a stale
  // localStorage draft from a possibly-abandoned earlier attempt (which may
  // even be for a different business type). Validated against the loaded
  // list so a typo'd/unknown code can't silently "select" a non-existent type.
  const rawType = typeof q.type === 'string' ? q.type : (typeof q.business_type === 'string' ? q.business_type : '')
  // Marketing URLs may use the path slug (`fahrschule`) instead of the DB code
  const typeAliases: Record<string, string> = {
    fahrschule: 'driving_school',
    coaching: 'mental_coach',
    'personal-training': 'fitness',
    nachhilfe: 'tutoring',
    musikschule: 'music_school',
    hundeschule: 'dog_training',
  }
  const typeParam = typeAliases[rawType] || rawType
  if (typeParam && businessTypes.value.some(bt => bt.code === typeParam)) {
    formData.value.business_type = typeParam
  }

  // Brand colors from URL params / sessionStorage always take precedence over
  // anything stored in localStorage (they come fresh from the simy.ch color picker)
  if (q.primary_color && typeof q.primary_color === 'string') formData.value.primary_color = q.primary_color
  if (q.secondary_color && typeof q.secondary_color === 'string') formData.value.secondary_color = q.secondary_color
  if (q.accent_color && typeof q.accent_color === 'string') formData.value.accent_color = q.accent_color

  const savedPrimary   = sessionStorage.getItem('simy_preview_primary')
  const savedSecondary = sessionStorage.getItem('simy_preview_secondary')
  const savedAccent    = sessionStorage.getItem('simy_preview_accent')
  if (savedPrimary)   { formData.value.primary_color   = savedPrimary;   sessionStorage.removeItem('simy_preview_primary') }
  if (savedSecondary) { formData.value.secondary_color = savedSecondary; sessionStorage.removeItem('simy_preview_secondary') }
  if (savedAccent)    { formData.value.accent_color    = savedAccent;    sessionStorage.removeItem('simy_preview_accent') }

  // After restoring from storage, re-trigger the email availability check so that
  // emailCheck doesn't remain 'idle' and block the "Weiter" button.
  if (adminEmailEarly.value && adminEmailEarly.value.includes('@')) {
    checkAdminEmail(adminEmailEarly.value)
  }

  // Pre-populate logo from sessionStorage — read AFTER loadFromStorage so it takes
  // precedence over any stale null value from a previous registration attempt.
  const savedLogo = sessionStorage.getItem('simy_preview_logo')
  if (savedLogo) {
    logoPreview.value = savedLogo
    logoFile.value = base64ToFile(savedLogo, `logo-${Date.now()}.webp`)
    sessionStorage.removeItem('simy_preview_logo')
  }

  // Pre-populate logo from temp storage URL (passed from simy.ch marketing preview).
  // This always takes precedence — an explicit logo_url from the URL is fresher than
  // anything stale in localStorage from a previous registration attempt.
  if (q.logo_url && typeof q.logo_url === 'string') {
    try {
      logoPreview.value = q.logo_url
      const res = await fetch(q.logo_url)
      const blob = await res.blob()
      logoFile.value = new File([blob], `logo-${Date.now()}.webp`, { type: 'image/webp' })
    } catch {
      logoPreview.value = null
    }
  }

  if (adminSameAsCompany.value) applyAdminFromCompany()

  // Resolve pricingMode early (hides categories step for per_event_type).
  // Always load when a business type is known — even on step 0 — so the
  // progress bar is correct before the user clicks Weiter.
  if (formData.value.business_type) await loadEventTypeTemplates()

  // Draft may have been saved on the categories step; bump past it when skipped.
  if (currentStep.value === 1 && pricingMode.value === 'per_event_type') {
    currentStep.value = 2
  }

  // Pre-load categories/event-types if a saved draft resumes past those steps
  if (currentStep.value >= 1 && pricingMode.value !== 'per_event_type') await loadTemplateCategories()
  if (currentStep.value >= 2) await loadEventTypeTemplates()
})
</script>
