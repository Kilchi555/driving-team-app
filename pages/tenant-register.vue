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
            <img v-if="logoPreview" :src="logoPreview" alt="Logo" class="w-full h-full object-contain p-1" />
            <svg v-else class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div>
            <h1 class="text-lg sm:text-xl font-bold tracking-tight">Fahrschule registrieren</h1>
            <p class="text-blue-200 text-xs sm:text-sm mt-0.5">Deine Fahrschule auf Autopilot – in wenigen Minuten startklar</p>
          </div>
        </div>
        <div class="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full pointer-events-none"></div>
        <div class="absolute right-12 bottom-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 pointer-events-none"></div>
      </div>

      <!-- Progress Indicator -->
      <div v-if="currentStep < LOADING_STEP" class="px-6 sm:px-10 pt-5 pb-2 border-b border-gray-100">
        <div class="hidden sm:flex justify-between text-xs mb-2.5 px-0.5">
          <span v-for="(step, i) in steps" :key="i" class="flex-1 text-center truncate px-1 font-medium transition-colors"
            :class="[i < currentStep ? 'text-green-600 cursor-pointer hover:opacity-70' : i === currentStep ? '' : 'text-gray-400']"
            :style="i === currentStep ? { color: formData.primary_color || '#2563EB' } : {}"
            @click="i < currentStep ? currentStep = i : undefined">
            {{ step.title }}
          </span>
        </div>
        <div class="flex items-center">
          <template v-for="(step, index) in steps" :key="index">
            <div
              @click="index < currentStep ? currentStep = index : undefined"
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0 z-10"
              :class="[
                index < currentStep  ? 'text-white cursor-pointer hover:opacity-80' :
                index === currentStep ? 'text-white ring-4' :
                                        'bg-gray-100 text-gray-400 cursor-not-allowed'
              ]"
              :style="index < currentStep
                ? { backgroundColor: formData.secondary_color || '#10B981' }
                : index === currentStep
                  ? { backgroundColor: formData.primary_color || '#3B82F6', '--tw-ring-color': (formData.primary_color || '#3B82F6') + '30' }
                  : {}"
              :title="index < currentStep ? `Zurück zu: ${step.title}` : undefined"
            >
              <svg v-if="index < currentStep" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div v-if="index < steps.length - 1" class="flex-1 h-0.5 transition-all duration-500"
              :class="index < currentStep ? '' : 'bg-gray-200'"
              :style="index < currentStep ? { backgroundColor: formData.secondary_color || '#10B981' } : {}"></div>
          </template>
        </div>
        <p class="sm:hidden text-xs text-center font-medium mt-2" :style="{ color: formData.primary_color || '#2563EB' }">
          Schritt {{ currentStep + 1 }}/{{ steps.length }} – {{ steps[currentStep]?.title }}
        </p>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="submitRegistration" class="px-6 sm:px-10 py-6 sm:py-8">

        <!-- ═══ STEP 0: Grunddaten ═══ -->
        <div v-if="currentStep === 0" class="space-y-8">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-1">Firmen-Daten</h2>
            <p class="text-sm text-gray-500 mb-4">Wie soll deine Fahrschule heissen und wo ist sie erreichbar?</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Firmen-Name *</label>
                <input v-model="formData.name" type="text" required placeholder="z.B. Fahrschule Muster"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Rechtlicher Name (für Rechnungen) *</label>
                <input v-model="formData.legal_company_name" type="text" required placeholder="z.B. Fahrschule Muster GmbH"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">URL-Kennung *</label>
                <div class="flex items-stretch rounded-xl overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <span class="hidden sm:flex items-center px-3 bg-gray-100 text-gray-500 text-xs font-mono border-r border-gray-200 whitespace-nowrap">simy.ch/</span>
                  <input v-model="formData.slug" type="text" required placeholder="meine-fahrschule"
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
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">E-Mail (Kontakt)</label>
                <input v-model="formData.contact_email" type="email" placeholder="info@fahrschule.ch"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Telefon *</label>
                <input v-model="formData.contact_phone" type="tel" required placeholder="+41 44 123 45 67"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
              </div>
              <!-- Admin Login Email – früh validieren -->
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  E-Mail für Admin-Login *
                  <span class="normal-case font-normal text-gray-400 ml-1">– wird dein persönlicher Login</span>
                </label>
                <input
                  v-model="adminEmailEarly"
                  type="email"
                  required
                  placeholder="dein@login.ch"
                  @blur="checkAdminEmail(adminEmailEarly)"
                  @input="emailCheck = 'idle'"
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
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  Diese E-Mail ist bereits registriert –
                  <a href="/login" class="underline">Einloggen</a>
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
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Geschäftstyp</label>
                <select v-model="formData.business_type"
                  class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm">
                  <option value="driving_school">Fahrschule</option>
                  <option value="mental_coach">Coaching</option>
                </select>
              </div>
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
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Anzahl Fahrlehrer</label>
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
              <h2 class="text-base font-semibold text-gray-900 mb-0.5">Welche Kategorien bietest du an?</h2>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="categoriesLoading" class="flex flex-col items-center justify-center py-16 gap-3">
            <div class="relative w-12 h-12">
              <div class="absolute inset-0 rounded-full border-4 border-blue-100"></div>
              <div class="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <p class="text-sm text-gray-500 font-medium">Kategorien werden geladen…</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="templateCategories.length === 0"
            class="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl bg-amber-50 border border-amber-200">
            <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
            <p class="text-sm font-medium text-amber-800">Keine Vorlagen gefunden</p>
            <p class="text-xs text-amber-600">Kategorien können nach der Registrierung hinzugefügt werden.</p>
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
                  v-html="cat.icon_svg">
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
                <div v-if="cat.children?.length && selectedCategoryIds.has(cat.id)"
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
                      {{ cat.children.filter(c => selectedCategoryIds.has(c.id)).length }}/{{ cat.children.length }}
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
                      {{ 'Kategorie ' + (child.code || child.name) }}
                    </button>
                  </div>
                </div>
              </transition>
            </template>
          </div>
        </div>

        <!-- ═══ STEP 2: Standorte ═══ -->
        <div v-if="currentStep === 2" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Wo bietest du deine Fahrstunden an?</h2>
            <p class="text-sm text-gray-500">Mindestens ein Standort – als Treffpunkt für deine Fahrstunden.</p>
          </div>

          <div class="flex items-start gap-3 bg-blue-50 rounded-xl p-3.5 text-sm text-blue-700">
            <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span>Fahrlehrer wählen beim Erstellen von Terminen einen Standort aus. Weitere können später hinzugefügt werden.</span>
          </div>

          <div class="space-y-3">
            <div
              v-for="(loc, index) in locationsList"
              :key="index"
              class="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {{ index + 1 }}
                  </div>
                  <span class="text-sm font-semibold text-gray-700">Standort {{ index + 1 }}</span>
                </div>
                <button v-if="locationsList.length > 1" type="button" @click="removeLocation(index)"
                  class="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors text-sm leading-none">
                  ✕
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bezeichnung *</label>
                  <input v-model="loc.name" type="text" placeholder="z.B. Hauptstandort Zürich"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Strasse + Nummer</label>
                  <input v-model="loc.address" type="text" placeholder="Musterstrasse 12"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-2">
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
          </div>

          <button type="button" @click="addLocation"
            class="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors px-4 py-2 rounded-xl hover:bg-blue-50 border-2 border-dashed border-blue-200 hover:border-blue-400 w-full justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Weiteren Standort hinzufügen
          </button>

          <p v-if="!hasValidLocation" class="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
            </svg>
            Bitte mindestens einen Standort mit Bezeichnung erfassen.
          </p>
        </div>

        <!-- ═══ STEP 3: Branding ═══ -->
        <div v-if="currentStep === 3" class="space-y-8">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Design, Zahlungen & Social Media</h2>
            <p class="text-sm text-gray-500">Alles optional – kann jederzeit in den Einstellungen angepasst werden.</p>
          </div>

          <!-- Color preview hint (shown when colors were pre-selected) -->
          <div v-if="formData.primary_color !== '#3B82F6' || formData.secondary_color !== '#10B981'"
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
            <!-- Logo Upload -->
            <div>
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Logo</p>
              <div class="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-gray-300 transition-colors">
                <div v-if="logoPreview" class="mb-4">
                  <img :src="logoPreview" alt="Logo Preview" class="h-16 w-auto mx-auto object-contain rounded-lg">
                </div>
                <div v-else class="mb-4">
                  <div class="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                </div>
                <div class="relative inline-block">
                  <input ref="logoInput" type="file" accept="image/*" @change="handleLogoSelect"
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <button class="bg-gray-900 hover:bg-gray-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-colors" type="button">
                    {{ logoPreview ? 'Logo ändern' : 'Logo auswählen' }}
                  </button>
                </div>
                <p class="text-xs text-gray-400 mt-2">JPG, PNG, WebP · max. 2 MB</p>
                <button v-if="logoPreview" @click="removeLogo"
                  class="text-red-400 hover:text-red-600 text-xs mt-2 block mx-auto transition-colors" type="button">
                  Entfernen
                </button>
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
                  <input v-model="formData.instagram_url" type="url" placeholder="instagram.com/fahrschule"
                    class="flex-1 py-2.5 bg-transparent text-sm outline-none">
                </div>
                <div class="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden px-3">
                  <svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <input v-model="formData.facebook_url" type="url" placeholder="facebook.com/fahrschule"
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
        </div>

        <!-- ═══ STEP 4: Admin-Konto ═══ -->
        <div v-if="currentStep === 4" class="space-y-6">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Admin-Konto erstellen</h2>
            <p class="text-sm text-gray-500">Dein persönlicher Login-Zugang zur Fahrschule.</p>
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
                @blur="checkAdminEmail(adminForm.email)"
                @input="emailCheck = 'idle'"
                :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm',
                  emailCheck === 'taken'     ? 'border-red-300 focus:ring-red-400' :
                  emailCheck === 'available' ? 'border-green-300 focus:ring-green-400' :
                  'border-gray-200 focus:ring-blue-500']">
              <p v-if="emailCheck === 'taken'" class="text-xs text-red-500 mt-1">Diese E-Mail ist bereits registriert</p>
              <p v-else-if="emailCheck === 'available'" class="text-xs text-green-600 mt-1">E-Mail ist verfügbar</p>
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
                <input v-model="adminForm.password" type="password" required minlength="12" autocomplete="new-password" name="new-password"
                  :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm',
                    adminForm.password && !passwordValid ? 'border-red-300 focus:ring-red-500' :
                    adminForm.password && passwordValid ? 'border-green-300 focus:ring-green-500' :
                    'border-gray-200 focus:ring-blue-500']"
                  placeholder="Mindestens 12 Zeichen">
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
                <input v-model="adminForm.passwordConfirm" type="password" required minlength="12" autocomplete="new-password" name="confirm-password"
                  :class="['w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:border-transparent bg-gray-50 focus:bg-white transition-colors text-sm',
                    adminForm.passwordConfirm && passwordMismatch ? 'border-red-300 focus:ring-red-500' :
                    adminForm.passwordConfirm && !passwordMismatch && passwordValid ? 'border-green-300 focus:ring-green-500' :
                    'border-gray-200 focus:ring-blue-500']"
                  placeholder="Passwort wiederholen">
                <p v-if="passwordMismatch" class="text-xs text-red-600 mt-1">Passwörter stimmen nicht überein.</p>
                <p v-else-if="adminForm.passwordConfirm && !passwordMismatch && passwordValid" class="text-xs text-green-600 mt-1">Passwörter stimmen überein</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ STEP 5: Mitarbeiter einladen ═══ -->
        <div v-if="currentStep === 5" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Fahrlehrer hinzufügen</h2>
            <p class="text-sm text-gray-500">Mindestens 1 Fahrlehrer – weitere können jederzeit hinzugefügt werden.</p>
          </div>

          <div class="flex items-start gap-3 bg-blue-50 rounded-xl p-3.5 text-sm text-blue-700">
            <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <span>Fahrlehrer mit Telefonnummer erhalten nach der Registrierung eine Einladungs-SMS.</span>
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
                  <span class="text-sm font-semibold text-gray-700">Fahrlehrer {{ index + 1 }}</span>
                </div>
                <button v-if="staffList.length > 1" type="button" @click="removeStaff(index)"
                  class="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-colors text-sm leading-none">
                  ✕
                </button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vorname</label>
                  <input v-model="staff.first_name" type="text" placeholder="Max"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nachname</label>
                  <input v-model="staff.last_name" type="text" placeholder="Mustermann"
                    class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm transition-colors">
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Telefon
                    <span class="normal-case font-normal text-blue-500 ml-1">für Einladungs-SMS</span>
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
            Weiteren Fahrlehrer hinzufügen
          </button>

          <p v-if="!staffList.some(s => s.first_name.trim() && s.last_name.trim())"
            class="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/>
            </svg>
            Bitte mindestens einen Fahrlehrer mit Vor- und Nachname erfassen.
          </p>
        </div>

        <!-- ═══ STEP 6: Bestätigung ═══ -->
        <div v-if="currentStep === 6" class="space-y-5">
          <div>
            <h2 class="text-base font-semibold text-gray-900 mb-0.5">Alles bereit?</h2>
            <p class="text-sm text-gray-500">Überprüfe deine Angaben vor der Registrierung.</p>
          </div>

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

            <!-- Kategorien -->
            <div class="rounded-2xl bg-blue-50 border border-blue-100 p-4">
              <p class="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2.5">Kategorien</p>
              <div class="flex items-baseline gap-1.5">
                <span class="text-2xl font-bold text-blue-700">{{ effectiveCategoryCount }}</span>
                <span class="text-sm text-blue-500">ausgewählt</span>
              </div>
            </div>

            <!-- Standorte -->
            <div class="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <p class="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-2.5">Standorte</p>
              <div class="space-y-1">
                <p v-for="(loc, i) in validLocations" :key="i" class="text-sm text-gray-700 font-medium">
                  {{ loc.name }}
                  <span v-if="loc.city" class="text-gray-400 font-normal text-xs"> – {{ loc.city }}</span>
                </p>
              </div>
            </div>

            <!-- Fahrlehrer -->
            <div v-if="staffList.some(s => s.first_name && s.last_name)"
              class="sm:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Einladungen</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="(s, i) in staffList.filter(s => s.first_name && s.last_name)" :key="i"
                  class="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-gray-200 text-sm text-gray-700">
                  <span class="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                    </svg>
                  </span>
                  {{ s.first_name }} {{ s.last_name }}
                  <span v-if="s.phone" class="text-blue-500 text-xs">{{ s.phone }}</span>
                </span>
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
        <div v-if="currentStep === LOADING_STEP" class="flex flex-col items-center justify-center py-16 gap-4">
          <div class="relative w-16 h-16">
            <div class="absolute inset-0 rounded-full border-4 border-gray-100"></div>
            <div class="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
              :style="{ borderColor: `${formData.primary_color || '#3B82F6'} transparent transparent transparent` }"></div>
          </div>
          <div class="text-center">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">Fahrschule wird eingerichtet…</h2>
            <p class="text-sm text-gray-500">Kategorien, Vorlagen und Benutzer werden erstellt.</p>
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
            <p class="text-sm text-gray-500">Deine Fahrschule wurde erfolgreich auf Autopilot eingerichtet.</p>
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
                { done: true, label: 'Fahrschule registriert' },
                { done: true, label: `${effectiveCategoryCount} Kategorien konfiguriert` },
                { done: true, label: `${validLocations.length} Standort(e) angelegt` },
                { done: true, label: 'Termintypen & Bewertungsvorlagen importiert' },
                { done: (staffInviteResults?.length ?? 0) > 0, label: `Fahrlehrer eingeladen (${staffInviteResults?.length ?? 0})` },
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
                  <div v-for="label in ['Preisregeln pro Kategorie definieren', 'Verfügbarkeit & Arbeitszeiten einrichten', 'Erste Fahrstunde buchen']"
                    :key="label" class="flex items-center gap-2 text-sm text-amber-800">
                    <div class="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0"></div>
                    {{ label }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Fahrlehrer-Einladungen -->
          <div v-if="staffInviteResults && staffInviteResults.length > 0" class="rounded-2xl border border-gray-200 p-4 mb-5">
            <p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Einladungsstatus</p>
            <div class="space-y-2">
              <div v-for="r in staffInviteResults" :key="r.name" class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  :class="['sms_sent', 'email_sent', 'invited'].includes(r.status) ? 'bg-green-100' : 'bg-red-100'">
                  <svg v-if="['sms_sent', 'email_sent', 'invited'].includes(r.status)" class="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
                <div>
                  <span class="text-sm font-medium text-gray-800">{{ r.name }}</span>
                  <span class="text-xs text-gray-500 ml-2">{{ r.message }}</span>
                </div>
              </div>
            </div>
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
        </div>

        <!-- Error Display -->
        <div v-if="error" class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
          <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
          </svg>
          <div>
            <p class="text-sm font-semibold text-red-800">Fehler bei der Registrierung</p>
            <p class="text-sm text-red-700 mt-0.5">{{ error }}</p>
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

          <button v-if="currentStep < 6" @click="nextStep" type="button" :disabled="!canProceed"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm transition-all disabled:bg-gray-200 disabled:text-gray-400"
            :style="canProceed ? { background: `linear-gradient(135deg, ${formData.primary_color || '#2563EB'}, ${formData.secondary_color || '#4F46E5'})` } : {}">
            Weiter
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <button v-else-if="currentStep === 6" @click="submitRegistration" type="button" :disabled="!canSubmit"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-400 text-white font-bold text-sm transition-all shadow-sm"
            :style="canSubmit ? { background: 'linear-gradient(135deg, #10B981, #059669)' } : {}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Fahrschule einrichten
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { navigateTo, useRoute } from '#app'

definePageMeta({ layout: false })

const LOADING_STEP = 7
const SUCCESS_STEP = 8

// ─── Steps ─────────────────────────────────────────────────────────────────
const steps = [
  { title: 'Grunddaten' },
  { title: 'Kategorien' },
  { title: 'Standorte' },
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
  uid_number: '',
  website_url: '',
  staff_count: '',
  language: 'de',
  qr_iban: '',
  instagram_url: '',
  facebook_url: '',
})

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
  for (const cat of templateCategories.value) {
    const selectedChildren = (cat.children || []).filter(c => selectedCategoryIds.value.has(c.id))
    if (selectedChildren.length > 0) {
      count += selectedChildren.length
    } else if (selectedCategoryIds.value.has(cat.id)) {
      count += 1
    }
  }
  return count
})

const loadTemplateCategories = async () => {
  if (categoriesLoading.value) return
  if (templateCategories.value.length > 0) return // already loaded, keep user's selection
  categoriesLoading.value = true
  try {
    const res = await $fetch<{ categories: TemplateCategory[] }>('/api/tenants/template-categories', {
      query: { business_type: formData.value.business_type }
    })
    templateCategories.value = res.categories || []
    // Always start with nothing selected – user picks explicitly
    selectedCategoryIds.value = new Set<number>()
  } catch {
    templateCategories.value = []
  } finally {
    categoriesLoading.value = false
  }
}

const toggleCategory = (id: number) => {
  if (selectedCategoryIds.value.has(id)) {
    selectedCategoryIds.value.delete(id)
    // Deselecting a parent also removes all its children
    const parent = templateCategories.value.find(c => c.id === id)
    if (parent?.children) {
      for (const child of parent.children) selectedCategoryIds.value.delete(child.id)
    }
  } else {
    selectedCategoryIds.value.add(id)
  }
  selectedCategoryIds.value = new Set(selectedCategoryIds.value)
}

const selectAllCategories = () => {
  selectedCategoryIds.value = new Set<number>(allTemplateCategoryIds.value)
}

const deselectAllCategories = () => {
  selectedCategoryIds.value = new Set<number>()
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

const locationsList = ref<LocationEntry[]>([
  { name: '', address: '', zip: '', city: '', phone: '', email: '' }
])

const addLocation = () => {
  locationsList.value.push({ name: '', address: '', zip: '', city: '', phone: '', email: '' })
}

const removeLocation = (index: number) => {
  locationsList.value.splice(index, 1)
}

const validLocations = computed(() => locationsList.value.filter(l => l.name.trim()))
const hasValidLocation = computed(() => validLocations.value.length > 0)

// Pre-fill first location from company address when entering step 2
const prefillFirstLocation = () => {
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
interface StaffEntry { first_name: string; last_name: string; phone: string }

const staffList = ref<StaffEntry[]>([{ first_name: '', last_name: '', phone: '' }])
const addStaff = () => staffList.value.push({ first_name: '', last_name: '', phone: '' })
const removeStaff = (index: number) => staffList.value.splice(index, 1)
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
  password: '',
  passwordConfirm: ''
})
const adminSameAsCompany = ref(false)

// adminEmailEarly: entered on step 0 for early validation; synced to adminForm.email
const adminEmailEarly = ref('')
watch(adminEmailEarly, (val) => {
  adminForm.value.email = val
})

// ─── Password Strength ─────────────────────────────────────────────────────
const passwordMismatch = computed(() => adminForm.value.password !== adminForm.value.passwordConfirm)
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
      return !!(formData.value.name && formData.value.legal_company_name && formData.value.slug &&
                formData.value.contact_person_first_name && formData.value.contact_person_last_name &&
                formData.value.contact_email && formData.value.contact_phone &&
                formData.value.street && formData.value.streetNr && formData.value.zip && formData.value.city) &&
             slugCheck.value !== 'taken' && emailCheck.value !== 'taken' &&
             !!adminEmailEarly.value && adminEmailEarly.value.includes('@')
    case 1:
      return true // Categories are optional (all pre-selected by default)
    case 2:
      return hasValidLocation.value
    case 4:
      return !!(adminForm.value.first_name && adminForm.value.last_name &&
                adminForm.value.email && adminForm.value.password &&
                adminForm.value.passwordConfirm && passwordValid.value &&
                !passwordMismatch.value && hibpStatus.value !== 'pwned' && hibpStatus.value !== 'checking' &&
                emailCheck.value !== 'taken')
    case 5:
      return staffList.value.some(s => s.first_name.trim() && s.last_name.trim())
    default:
      return true
  }
})

const canSubmit = computed(() => acceptTerms.value && canProceed.value)

const tenantUrl = computed(() =>
  createdTenantSlug.value
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auswahl?tenant=${createdTenantSlug.value}`
    : ''
)

// ─── Navigation ───────────────────────────────────────────────────────────
const nextStep = () => {
  if (!canProceed.value || currentStep.value >= 6) return
  const next = currentStep.value + 1
  if (next === 1) loadTemplateCategories()
  if (next === 2) prefillFirstLocation()
  currentStep.value = next
}

const previousStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

// ─── Availability Checks ───────────────────────────────────────────────────
type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'error'

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
      const res = await $fetch<{ slug: { available: boolean } }>('/api/tenants/check-availability', { query: { slug } })
      slugCheck.value = res.slug.available ? 'available' : 'taken'
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
  checkSlug(formData.value.slug)
}

const handleLogoSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { alert('Nur Bilddateien sind erlaubt'); return }
  if (file.size > 2 * 1024 * 1024) { alert('Datei zu gross! Maximum 2MB'); return }
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

  try {
    const fd = new FormData()

    Object.entries(formData.value).forEach(([key, value]) => {
      const v = value?.toString().trim()
      if (v) fd.append(key, v)
    })

    // Selected category IDs
    if (selectedCategoryIds.value.size > 0) {
      fd.append('selected_category_ids', Array.from(selectedCategoryIds.value).join(','))
    }

    // Locations as JSON
    const locs = validLocations.value
    if (locs.length > 0) {
      fd.append('locations_json', JSON.stringify(locs))
    }

    if (logoFile.value) fd.append('logo_file', logoFile.value)

    // 1. Register tenant + copy templates + create locations
    const response = await $fetch('/api/tenants/register', { method: 'POST', body: fd }) as any

    if (!response.success) {
      throw new Error(response.error || 'Unbekannter Fehler')
    }

    createdTenantSlug.value     = response.tenant.slug
    createdCustomerNumber.value = response.tenant.customer_number

    // 2. Create admin user (dedicated endpoint)
    let adminRes: any
    try {
      adminRes = await $fetch('/api/tenants/create-admin', {
        method: 'POST',
        body: {
          email:      adminForm.value.email,
          password:   adminForm.value.password,
          first_name: adminForm.value.first_name,
          last_name:  adminForm.value.last_name,
          phone:      adminForm.value.phone,
          tenant_id:  response.tenant.id,
        }
      }) as any
    } catch (adminErr: any) {
      // Rollback: Tenant löschen, damit der Slug wieder verwendbar ist
      try {
        await $fetch('/api/tenants/rollback-registration', {
          method: 'POST',
          body: { tenant_id: response.tenant.id }
        })
      } catch (rollbackErr) {
        console.warn('Rollback failed:', rollbackErr)
      }
      throw new Error('Admin-Konto konnte nicht erstellt werden: ' + (adminErr.data?.statusMessage || adminErr.message || ''))
    }

    if (!adminRes.success) {
      // Rollback: Tenant löschen, damit der Slug wieder verwendbar ist
      try {
        await $fetch('/api/tenants/rollback-registration', {
          method: 'POST',
          body: { tenant_id: response.tenant.id }
        })
      } catch (rollbackErr) {
        console.warn('Rollback failed:', rollbackErr)
      }
      throw new Error('Admin-Konto konnte nicht erstellt werden: ' + (adminRes.message || ''))
    }

    // 3. Invite staff (non-critical)
    const filledStaff = staffList.value.filter(s => s.first_name.trim() && s.last_name.trim() && s.phone.trim())
    if (filledStaff.length > 0) {
      try {
        const inviteRes = await $fetch('/api/tenants/invite-staff-batch', {
          method: 'POST',
          body: { tenant_id: response.tenant.id, staff_list: filledStaff }
        }) as any
        staffInviteResults.value = inviteRes.results || []
      } catch (inviteErr) {
        console.warn('Staff invite failed (non-critical):', inviteErr)
      }
    }

    currentStep.value = SUCCESS_STEP
    localStorage.removeItem(STORAGE_KEY)

  } catch (err: any) {
    console.error('Registration failed:', err)
    error.value = err.data?.statusMessage || err.statusMessage || err.message || 'Registrierung fehlgeschlagen'
    currentStep.value = 6
  }
}

const goToLogin = () => {
  if (createdTenantSlug.value) {
    navigateTo(`/auswahl?tenant=${createdTenantSlug.value}`)
  }
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
})

watch(() => adminSameAsCompany.value, () => applyAdminFromCompany())
watch(() => adminForm.value.password, (pw) => checkPasswordStrength(pw))

// ─── LocalStorage ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'tenant-registration-data'

const saveToStorage = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    formData: formData.value,
    adminForm: adminForm.value,
    adminEmailEarly: adminEmailEarly.value,
    adminSameAsCompany: adminSameAsCompany.value,
    currentStep: currentStep.value,
    userEditedSlug: userEditedSlug.value,
    logoPreview: logoPreview.value,
    staffList: staffList.value,
    locationsList: locationsList.value,
    selectedCategoryIds: Array.from(selectedCategoryIds.value),
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
    adminEmailEarly.value     = d.adminEmailEarly || d.adminForm?.email || ''
    adminSameAsCompany.value  = d.adminSameAsCompany || false
    currentStep.value         = d.currentStep || 0
    userEditedSlug.value      = d.userEditedSlug || false
    logoPreview.value         = d.logoPreview || null
    if (d.staffList)    staffList.value    = d.staffList
    if (d.locationsList) locationsList.value = d.locationsList
    if (Array.isArray(d.selectedCategoryIds)) selectedCategoryIds.value = new Set<number>(d.selectedCategoryIds)
    if (adminSameAsCompany.value) applyAdminFromCompany()
  } catch { /* ignore */ }
}

watch([formData, adminForm, adminEmailEarly, adminSameAsCompany, currentStep, locationsList, staffList, selectedCategoryIds], saveToStorage, { deep: true })

const route = useRoute()

// ─── Page Background ────────────────────────────────────────────────────────
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
  // Pre-populate brand colors from URL query params (set by the index page color picker)
  const q = route.query
  if (q.primary_color && typeof q.primary_color === 'string') formData.value.primary_color = q.primary_color
  if (q.secondary_color && typeof q.secondary_color === 'string') formData.value.secondary_color = q.secondary_color
  if (q.accent_color && typeof q.accent_color === 'string') formData.value.accent_color = q.accent_color

  // Pre-populate logo from sessionStorage (set by the index page logo upload)
  const savedLogo = sessionStorage.getItem('simy_preview_logo')
  if (savedLogo) {
    logoPreview.value = savedLogo
    sessionStorage.removeItem('simy_preview_logo')
  }

  loadFromStorage()
  if (adminSameAsCompany.value) applyAdminFromCompany()
  // Pre-load categories if already past step 0
  if (currentStep.value >= 1) await loadTemplateCategories()
})
</script>
