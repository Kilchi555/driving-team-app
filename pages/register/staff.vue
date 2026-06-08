<template>
  <div class="min-h-[100svh] bg-gray-50 flex items-center justify-center py-8 px-4" :style="brandVars">
    <div class="w-full max-w-xl">

      <!-- Header + Progress (outside card) -->
      <div v-if="currentStep < STEP_LOADING" class="mb-6">
        <div class="text-center mb-4">
          <h1 class="text-2xl font-bold text-gray-900">👨‍🏫 Fahrlehrer Registrierung</h1>
          <p class="text-sm text-gray-500 mt-1">{{ tenantName }}</p>
        </div>
        <!-- Progress bar -->
        <div class="flex items-center gap-1">
          <div
            v-for="(s, i) in VISIBLE_STEPS"
            :key="i"
            class="flex-1 h-1.5 rounded-full transition-all"
            :style="i <= currentStep ? { background: tenantColor } : { background: '#e5e7eb' }"
          ></div>
        </div>
        <div class="flex justify-between mt-1">
          <span class="text-xs text-gray-400">Schritt {{ currentStep + 1 }} / {{ VISIBLE_STEPS.length }}</span>
          <span class="text-xs font-medium" :style="{ color: tenantColor }">{{ VISIBLE_STEPS[currentStep]?.label }}</span>
        </div>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-xl shadow-md overflow-hidden">

        <!-- ── Loading ── -->
        <div v-if="currentStep === STEP_LOADING" class="p-12 text-center">
          <div class="animate-spin rounded-full h-14 w-14 border-b-2 mx-auto mb-4" :style="{ borderColor: tenantColor }"></div>
          <p class="text-gray-600 font-medium">Konto wird erstellt…</p>
          <p class="text-sm text-gray-400 mt-1">Bitte warten Sie einen Moment.</p>
        </div>

        <!-- ── Success ── -->
        <div v-else-if="currentStep === STEP_SUCCESS" class="p-8 text-center space-y-6">
          <div class="text-6xl">✅</div>
          <div>
            <h2 class="text-xl font-bold text-gray-900">Willkommen im Team!</h2>
            <p class="text-gray-500 mt-1">Ihr Konto wurde erfolgreich erstellt.</p>
          </div>

          <!-- ICS-Feed URL -->
          <div class="rounded-lg p-4 text-left" :style="{ background: tenantColor + '14', border: `1px solid ${tenantColor}40` }">
            <p class="text-sm font-semibold mb-2" :style="{ color: tenantColor }">📅 Kalender-Abo-Link</p>
            <p class="text-xs mb-2" :style="{ color: tenantColor }">Diesen Link in Apple/Google/Outlook als Kalenderabo eintragen, um Termine automatisch zu synchronisieren:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs break-all">{{ icsUrl }}</code>
              <button type="button" @click="copyIcsUrl"
                class="text-xs text-white px-2 py-1 rounded hover:opacity-90 flex-shrink-0" :style="{ background: tenantColor }">
                {{ icsCopied ? '✓' : 'Kopieren' }}
              </button>
            </div>
          </div>

          <!-- Affiliate (wenn aktiviert) -->
          <div v-if="affiliateEnabled && affiliateCode" class="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
            <p class="text-sm font-semibold text-green-800 mb-1">🎁 Empfehlungslink</p>
            <p class="text-xs text-green-600 mb-2">Teile diesen Link und verdiene eine Prämie für jede Empfehlung:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-white border border-green-200 rounded px-2 py-1 text-xs break-all">{{ affiliateLink }}</code>
              <button type="button" @click="copyAffiliateLink"
                class="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 flex-shrink-0">
                {{ affiliateCopied ? '✓' : 'Kopieren' }}
              </button>
            </div>
          </div>

          <!-- Auto-login warning -->
          <div v-if="autoLoginFailed" class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <p class="text-sm font-semibold text-amber-800">Automatischer Login fehlgeschlagen</p>
            <p class="text-xs text-amber-700 mt-1">Dein Konto wurde erfolgreich erstellt, aber der automatische Login hat nicht funktioniert. Bitte melde dich manuell mit deiner E-Mail und deinem Passwort an.</p>
            <NuxtLink to="/login" class="inline-block mt-2 text-xs font-semibold text-amber-700 underline">Zur Login-Seite</NuxtLink>
          </div>

          <button @click="goToDashboard"
            class="w-full text-white font-semibold py-3 rounded-lg transition-opacity hover:opacity-90"
            :style="{ background: tenantColor }">
            🚀 Zum Dashboard
          </button>

          <!-- App Store -->
          <div class="text-center pt-2">
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

        <!-- ── Error loading invitation ── -->
        <div v-else-if="loadError" class="p-8">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6">
            <span class="text-2xl">❌</span>
            <h3 class="font-medium text-red-800 mt-2">{{ loadError }}</h3>
            <ul class="text-sm text-red-600 list-disc list-inside mt-2">
              <li>Der Einladungslink ist abgelaufen</li>
              <li>Der Link wurde bereits verwendet</li>
              <li>Der Link ist ungültig</li>
            </ul>
            <a href="/" class="text-sm text-red-600 hover:underline mt-4 block">← Zur Startseite</a>
          </div>
        </div>

        <!-- ── Initial loading ── -->
        <div v-else-if="isLoading" class="p-12 text-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" :style="{ borderColor: tenantColor }"></div>
          <p class="text-sm text-gray-500">Einladung wird geladen…</p>
        </div>

        <!-- ── Form steps ── -->
        <form v-else @submit.prevent="onFormSubmit" class="p-6 space-y-5">

          <!-- Error banner -->
          <div v-if="registrationError" class="bg-red-50 border-l-4 border-red-500 rounded-r p-3 text-sm text-red-800">
            <strong>Fehler:</strong> {{ registrationError }}
          </div>

          <!-- ═══ STEP 0: Basisdaten ═══ -->
          <template v-if="currentStep === 0">
            <h2 class="text-lg font-semibold text-gray-900">Persönliche Daten</h2>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Vorname *</label>
                <input v-model="form.firstName" type="text" class="input" placeholder="Max">
              </div>
              <div>
                <label class="label">Nachname *</label>
                <input v-model="form.lastName" type="text" class="input" placeholder="Mustermann">
              </div>
              <div class="col-span-2">
                <label class="label">E-Mail *</label>
                <input v-model="form.email" type="email" autocomplete="email" name="username" id="staff-wizard-email" class="input" placeholder="max@example.com"
                  @input="onStaffEmailInput(form.email)"
                  @blur="checkStaffEmail(form.email)"
                  :class="{ '!border-red-300': staffEmailCheck === 'taken', '!border-green-300': staffEmailCheck === 'available' }"
                >
                <p v-if="staffEmailCheck === 'checking'" class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Wird geprüft…
                </p>
                <p v-else-if="staffEmailCheck === 'available'" class="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  E-Mail ist verfügbar
                </p>
                <p v-else-if="staffEmailCheck === 'taken'" class="text-xs text-red-500 mt-1 flex items-center gap-2">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  <span>Diese E-Mail ist bereits registriert — <a href="/login" class="underline font-medium">Jetzt einloggen</a></span>
                </p>
                <p v-else-if="staffEmailCheck === 'error'" class="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  E-Mail-Prüfung fehlgeschlagen — bitte erneut versuchen
                </p>
              </div>
              <div class="col-span-2">
                <label class="label">Telefon *</label>
                <input v-model="form.phone" type="tel" class="input" placeholder="+41 79 123 45 67">
              </div>
              <div>
                <label class="label">Geburtsdatum *</label>
                <input v-model="form.birthdate" type="date" class="input" style="width: fit-content; min-width: 130px; max-width: 160px">
              </div>
              <div class="col-span-2 border-t pt-3">
                <p class="text-xs text-gray-500 font-medium mb-2">Adresse</p>
              </div>
              <div>
                <label class="label">Strasse *</label>
                <input v-model="form.street" type="text" class="input" placeholder="Musterstrasse">
              </div>
              <div>
                <label class="label">Nr. *</label>
                <input v-model="form.streetNr" type="text" class="input" placeholder="12">
              </div>
              <div>
                <label class="label">PLZ *</label>
                <input v-model="form.zip" type="text" pattern="[0-9]{4}" class="input" placeholder="8000">
              </div>
              <div>
                <label class="label">Ort *</label>
                <input v-model="form.city" type="text" class="input" placeholder="Zürich">
              </div>
            </div>
          </template>

          <!-- ═══ STEP 1: Profil ═══ -->
          <template v-if="currentStep === 1">
            <h2 class="text-lg font-semibold text-gray-900">Fahrlehrer-Profil</h2>

            <!-- Kategorien -->
            <div v-if="availableCategories.length">
              <label class="label mb-2">Unterrichtete Kategorien</label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="cat in availableCategories"
                  :key="cat.code"
                  class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all text-sm"
                  :class="form.selectedCategories.includes(cat.code)
                    ? 'text-gray-800'
                    : 'border-gray-200 hover:border-gray-300'"
                  :style="form.selectedCategories.includes(cat.code)
                    ? { borderColor: tenantColor, backgroundColor: tenantColor + '14' }
                    : {}"
                >
                  <input type="checkbox" :value="cat.code" v-model="form.selectedCategories">
                  <span class="font-medium">{{ cat.code }}</span>
                  <span class="text-gray-400 text-xs truncate">{{ cat.description }}</span>
                </label>
              </div>
            </div>
          </template>

          <!-- ═══ STEP 2: Arbeitszeiten ═══ -->
          <template v-if="currentStep === 2">
            <h2 class="text-lg font-semibold text-gray-900">Arbeitszeiten</h2>
            <p class="text-sm text-gray-500">Wähle deine regulären Arbeitszeiten. Diese können später in den Einstellungen angepasst werden.</p>

            <div class="space-y-2">
              <div
                v-for="day in weekDays"
                :key="day.value"
                class="flex items-center gap-3 p-3 border rounded-lg"
                :style="form.workingDays[day.value]?.active
                  ? { borderColor: tenantColor, backgroundColor: tenantColor + '14' }
                  : {}"
                :class="!form.workingDays[day.value]?.active ? 'border-gray-200' : ''"
              >
                <label class="flex items-center gap-2 w-16 cursor-pointer">
                  <input type="checkbox" v-model="form.workingDays[day.value].active">
                  <span class="text-sm font-medium text-gray-700">{{ day.short }}</span>
                </label>
                <template v-if="form.workingDays[day.value]?.active">
                  <input
                    v-model="form.workingDays[day.value].start"
                    type="time"
                    class="input-sm"
                  >
                  <span class="text-gray-400 text-sm">–</span>
                  <input
                    v-model="form.workingDays[day.value].end"
                    type="time"
                    class="input-sm"
                  >
                </template>
                <span v-else class="text-sm text-gray-400 italic">Freier Tag</span>
              </div>
            </div>
          </template>

          <!-- ═══ STEP 3: Standorte ═══ -->
          <template v-if="currentStep === 3">
            <h2 class="text-lg font-semibold text-gray-900">Standorte</h2>

            <!-- Treffpunkte -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Treffpunkte / Abholorte</h3>

              <!-- Bestehende Tenant-Treffpunkte -->
              <div v-if="tenantLocations.length" class="space-y-2 mb-3">
                <label
                  v-for="loc in tenantLocations"
                  :key="loc.id"
                  class="flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-all"
                  :class="!form.selectedLocationIds.includes(loc.id) ? 'border-gray-200 hover:border-gray-300' : ''"
                  :style="form.selectedLocationIds.includes(loc.id)
                    ? { borderColor: tenantColor, backgroundColor: tenantColor + '14' }
                    : {}"
                >
                  <input type="checkbox" :value="loc.id" v-model="form.selectedLocationIds" class="mt-0.5">
                  <div>
                    <div class="text-sm font-medium">{{ loc.name }}</div>
                    <div class="text-xs text-gray-500">{{ loc.address }}</div>
                  </div>
                </label>
              </div>

              <!-- Eigene neue Treffpunkte als Tags -->
              <div v-if="form.newLocations.length" class="flex flex-wrap gap-2 mb-3">
                <span
                  v-for="(loc, i) in form.newLocations"
                  :key="i"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                  :style="{ background: tenantColor }"
                >
                  {{ loc.name }}
                  <button type="button" @click="form.newLocations.splice(i, 1)" class="ml-0.5 hover:opacity-75">×</button>
                </span>
              </div>

              <!-- Neuen Treffpunkt hinzufügen -->
              <div v-if="showNewLocationForm" class="border border-gray-200 rounded-lg p-3 space-y-2 mb-2">
                <input v-model="newLocationName" type="text" placeholder="Name (z.B. Bahnhof Zürich HB)" class="input text-sm">
                <input v-model="newLocationAddress" type="text" placeholder="Adresse (z.B. Bahnhofplatz 1, 8001 Zürich)" class="input text-sm">
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="addNewLocation"
                    :disabled="!newLocationName.trim() || !newLocationAddress.trim()"
                    class="px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-40 transition-opacity"
                    :style="{ background: tenantColor }"
                  >Hinzufügen</button>
                  <button type="button" @click="showNewLocationForm = false; newLocationName = ''; newLocationAddress = ''" class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Abbrechen</button>
                </div>
              </div>

              <button
                v-if="!showNewLocationForm"
                type="button"
                @click="showNewLocationForm = true"
                class="text-xs font-medium flex items-center gap-1 mt-1"
                :style="{ color: tenantColor }"
              >
                <span class="text-base leading-none">+</span> Treffpunkt hinzufügen
              </button>
            </div>

            <!-- Prüfungsorte mit Suche -->
            <div class="border-t pt-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-1">Prüfungsorte</h3>
              <p class="text-xs text-gray-500 mb-3">Suche und wähle die Prüfungsorte, an denen du Prüfungen abnimmst.</p>

              <!-- Suchfeld -->
              <div class="relative mb-3">
                <input
                  v-model="examLocationSearch"
                  type="text"
                  placeholder="Suchen (z.B. Zürich, Bern, SVA...)"
                  class="input pr-8"
                  @focus="examSearchOpen = true"
                  @click="examSearchOpen = true"
                  @blur="setTimeout(() => examSearchOpen = false, 150)"
                />
                <svg class="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <!-- Dropdown -->
                <div v-if="examSearchOpen && filteredExamLocations.length" class="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div
                    v-for="loc in filteredExamLocations"
                    :key="loc.id"
                    class="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    @mousedown.prevent="toggleExamLocationSelection(loc)"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-gray-900 truncate">{{ loc.name }}</div>
                      <div class="text-xs text-gray-500 truncate">{{ loc.address }}<span v-if="loc.canton"> · {{ loc.canton }}</span></div>
                    </div>
                    <span v-if="isExamLocationSelected(loc.id)" class="ml-2 text-xs font-medium flex-shrink-0" :style="{ color: tenantColor }">✓</span>
                    <span v-else class="ml-2 text-xs text-gray-400 flex-shrink-0">+ Wählen</span>
                  </div>
                </div>
                <p v-if="examSearchOpen && examLocationSearch.length > 1 && !filteredExamLocations.length" class="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow p-3 text-sm text-gray-500">
                  Keine Prüfungsorte gefunden für "{{ examLocationSearch }}"
                </p>
              </div>

              <!-- Ausgewählte Prüfungsorte als Tags -->
              <div v-if="form.selectedExamLocations.length" class="flex flex-wrap gap-2">
                <span
                  v-for="loc in form.selectedExamLocations"
                  :key="loc.id"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                  :style="{ background: tenantColor }"
                >
                  {{ loc.name }}
                  <button type="button" @click="toggleExamLocationSelection(loc)" class="ml-0.5 hover:opacity-75">×</button>
                </span>
              </div>
              <p v-else class="text-xs text-gray-400 italic">Noch keine Prüfungsorte ausgewählt.</p>
            </div>
          </template>

          <!-- ═══ STEP 4: Kalender ═══ -->
          <template v-if="currentStep === 4">
            <h2 class="text-lg font-semibold text-gray-900">Kalender-Verbindung</h2>

            <!-- Externen Kalender einbinden -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-1">Externen Kalender verbinden <span class="text-gray-400 font-normal">(optional)</span></h3>
              <p class="text-xs text-gray-500 mb-3">Verbinde deinen persönlichen Kalender, damit private Termine automatisch als Sperrzeiten in Simy erscheinen. Du kannst das auch später in den Einstellungen machen.</p>
              <div class="space-y-2">
                <!-- Deselect / none option -->
                <label
                  class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
                  :class="!form.externalCalendarProvider ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-gray-300'"
                  @click="form.externalCalendarProvider = ''; form.externalCalendarUrl = ''"
                >
                  <input type="radio" value="" v-model="form.externalCalendarProvider">
                  <span class="text-xl">🚫</span>
                  <span class="text-sm font-medium text-gray-500">Kein externer Kalender</span>
                </label>
                <label v-for="provider in calendarProviders" :key="provider.id"
                  class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
                  :class="form.externalCalendarProvider !== provider.id ? 'border-gray-200 hover:border-gray-300' : ''"
                  :style="form.externalCalendarProvider === provider.id ? { borderColor: tenantColor, backgroundColor: tenantColor + '14' } : {}"
                >
                  <input type="radio" :value="provider.id" v-model="form.externalCalendarProvider">
                  <span class="text-xl">{{ provider.icon }}</span>
                  <span class="text-sm font-medium">{{ provider.label }}</span>
                </label>
              </div>

              <!-- ICS URL input + provider-specific instructions -->
              <div v-if="form.externalCalendarProvider" class="mt-4 space-y-3">
                <!-- Step-by-step instructions -->
                <div class="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                  <template v-if="form.externalCalendarProvider === 'apple'">
                    <p class="font-semibold mb-1">So findest du deine Apple iCal URL:</p>
                    <p><strong>iPhone/iPad:</strong> Kalender-App öffnen → «Kalender» unten → Info-Symbol (i) neben dem Kalender antippen → «Öffentlicher Kalender» einschalten → «Link kopieren»</p>
                    <p><strong>Mac:</strong> Kalender-App → Rechtsklick auf den Kalender → «Kalender freigeben» → «Öffentlicher Kalender» aktivieren → URL kopieren</p>
                    <p><strong>iCloud.com:</strong> icloud.com/calendar öffnen → Teilen-Symbol neben dem Kalender → «Öffentlicher Kalender» einschalten → «Kopieren»</p>
                    <p class="mt-1 text-blue-600">💡 Falls die URL mit <strong>webcal://</strong> beginnt – einfach einfügen, sie wird automatisch umgewandelt.</p>
                  </template>
                  <template v-else-if="form.externalCalendarProvider === 'google'">
                    <p class="font-semibold mb-1">So findest du deine Google Kalender URL:</p>
                    <p>1. Google Calendar im Browser öffnen (calendar.google.com)</p>
                    <p>2. Links neben dem gewünschten Kalender auf die drei Punkte (⋮) klicken → «Einstellungen und Freigabe»</p>
                    <p>3. Nach unten scrollen zu «Kalenderintegration»</p>
                    <p>4. «Geheime Adresse im iCal-Format» kopieren</p>
                    <p class="mt-1 text-blue-600">⚠️ Nur auf dem Computer verfügbar, nicht in der mobilen App. Bei Firmen-Accounts muss der Admin externe Freigabe erlauben.</p>
                  </template>
                  <template v-else-if="form.externalCalendarProvider === 'outlook'">
                    <p class="font-semibold mb-1">So findest du deine Outlook Kalender URL:</p>
                    <p>1. outlook.com im Browser öffnen und einloggen</p>
                    <p>2. Kalender öffnen → Einstellungen (Zahnrad oben rechts) → «Alle Outlook-Einstellungen anzeigen»</p>
                    <p>3. «Kalender» → «Freigegebene Kalender»</p>
                    <p>4. Unter «Kalender veröffentlichen»: Kalender auswählen, Berechtigung wählen → «Veröffentlichen»</p>
                    <p>5. Den <strong>ICS-Link</strong> kopieren (nicht den HTML-Link)</p>
                    <p class="mt-1 text-blue-600">⚠️ Nur bei Microsoft-Konten (Outlook.com, Hotmail, Live) verfügbar. Firmen-Konten benötigen Admin-Freigabe.</p>
                  </template>
                  <template v-else>
                    <p class="font-semibold mb-1">ICS-URL deines Kalenders einfügen:</p>
                    <p>Öffne die Einstellungen deines Kalenders und suche nach «Kalender abonnieren», «ICS exportieren» oder «Kalender freigeben». Kopiere die URL, die auf <strong>.ics</strong> endet.</p>
                  </template>
                </div>

                <div>
                  <label class="label">ICS-URL einfügen</label>
                  <input v-model="form.externalCalendarUrl" type="url" class="input"
                    :placeholder="form.externalCalendarProvider === 'apple' ? 'https://p123-caldav.icloud.com/published/...' : form.externalCalendarProvider === 'google' ? 'https://calendar.google.com/calendar/ical/.../basic.ics' : 'https://...ics'"
                    @blur="normalizeCalendarUrl">
                  <p v-if="form.externalCalendarUrl && form.externalCalendarUrl.startsWith('https://')" class="text-xs text-green-600 mt-1">
                    ✓ URL wird automatisch verwendet
                  </p>
                </div>
              </div>
            </div>

            <!-- Eigener Kalender-Link (Vorschau) -->
            <div class="bg-gray-50 border rounded-lg p-4 mt-2">
              <p class="text-sm font-semibold text-gray-700 mb-1">📅 Dein persönlicher Simy-Kalender-Link</p>
              <p class="text-xs text-gray-500">Nach der Registrierung erhältst du einen ICS-Link, den du in deiner Kalender-App als Abo eintragen kannst. So siehst du alle deine Fahrstunden direkt in deiner eigenen Kalender-App (Apple, Google, Outlook, etc.).</p>
              <p class="text-xs mt-2 font-medium" :style="{ color: tenantColor }">→ Wird auf der Bestätigungsseite angezeigt</p>
            </div>
          </template>

          <!-- ═══ STEP 5: Dokumente ═══ -->
          <template v-if="currentStep === 5">
            <h2 class="text-lg font-semibold text-gray-900">Dokumente</h2>
            <p class="text-sm text-gray-500">Lade deinen Führerausweis hoch (Vorderseite erforderlich).</p>

            <!-- Vorderseite -->
            <div>
              <label class="label">Führerausweis Vorderseite</label>
              <div
                class="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors"
                :style="isDraggingFront ? { borderColor: tenantColor, backgroundColor: tenantColor + '14' } : { borderColor: '#d1d5db' }"
                @click="licenseFrontInput?.click()"
                @dragover.prevent="isDraggingFront = true"
                @dragleave.prevent="isDraggingFront = false"
                @drop.prevent="handleDrop($event, 'front')"
              >
                <input ref="licenseFrontInput" type="file" accept="image/*,.pdf" @change="onFileChange($event, 'front')" class="hidden">
                <div v-if="!licenseFrontFile" class="text-gray-400 text-sm">
                  <div class="text-3xl mb-1">📎</div>
                  Klicken oder Datei hierher ziehen<br>
                  <span class="text-xs">PNG, JPG, PDF bis 5MB</span>
                </div>
                <div v-else class="text-sm text-green-700">
                  <img v-if="licenseFrontPreview" :src="licenseFrontPreview" class="h-24 mx-auto rounded mb-1 object-contain">
                  <div class="font-medium">{{ licenseFrontFile.name }}</div>
                  <button type="button" @click.stop="licenseFrontFile = null; licenseFrontPreview = null" class="text-red-500 text-xs mt-1">Entfernen</button>
                </div>
              </div>
            </div>

            <!-- Rückseite -->
            <div>
              <label class="label">Führerausweis Rückseite</label>
              <div
                class="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors"
                :style="isDraggingBack ? { borderColor: tenantColor, backgroundColor: tenantColor + '14' } : { borderColor: '#d1d5db' }"
                @click="licenseBackInput?.click()"
                @dragover.prevent="isDraggingBack = true"
                @dragleave.prevent="isDraggingBack = false"
                @drop.prevent="handleDrop($event, 'back')"
              >
                <input ref="licenseBackInput" type="file" accept="image/*,.pdf" @change="onFileChange($event, 'back')" class="hidden">
                <div v-if="!licenseBackFile" class="text-gray-400 text-sm">
                  <div class="text-3xl mb-1">📎</div>
                  Klicken oder Datei hierher ziehen<br>
                  <span class="text-xs">PNG, JPG, PDF bis 5MB</span>
                </div>
                <div v-else class="text-sm text-green-700">
                  <img v-if="licenseBackPreview" :src="licenseBackPreview" class="h-24 mx-auto rounded mb-1 object-contain">
                  <div class="font-medium">{{ licenseBackFile.name }}</div>
                  <button type="button" @click.stop="licenseBackFile = null; licenseBackPreview = null" class="text-red-500 text-xs mt-1">Entfernen</button>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══ STEP 6: Passwort + AGB ═══ -->
          <template v-if="currentStep === 6">
            <h2 class="text-lg font-semibold text-gray-900">Passwort & Bestätigung</h2>

            <div>
              <label class="label">Passwort *</label>
              <input v-model="form.password" :type="showPw ? 'text' : 'password'" required class="input" placeholder="Mindestens 12 Zeichen" autocomplete="new-password" name="new-password">
              <div class="flex items-center justify-between mt-2">
                <button type="button" @click="useGeneratedPassword" class="text-xs font-semibold underline" :style="{ color: tenantColor }">
                  Sicheres Passwort vorschlagen
                </button>
                <button type="button" @click="showPw = !showPw" class="text-xs text-gray-500 hover:text-gray-700">
                  {{ showPw ? 'Verbergen' : 'Anzeigen' }}
                </button>
              </div>
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
            </div>

            <div>
              <label class="label">Passwort bestätigen *</label>
              <input v-model="form.confirmPassword" :type="showPw ? 'text' : 'password'" required class="input" placeholder="Passwort wiederholen" autocomplete="new-password" name="confirm-password">
              <p v-if="form.confirmPassword && form.password !== form.confirmPassword" class="text-xs text-red-500 mt-1">
                Passwörter stimmen nicht überein
              </p>
              <p v-else-if="form.confirmPassword && form.password === form.confirmPassword && passwordIsValid" class="text-xs text-green-600 mt-1">
                ✓ Passwörter stimmen überein
              </p>
            </div>

            <!-- AGB -->
            <div class="bg-gray-50 border rounded-lg p-4">
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" v-model="form.acceptedTerms" class="mt-0.5">
                <span class="text-sm text-gray-700">
                  Ich akzeptiere die
                  <a href="/register/staff-agb" target="_blank" class="hover:underline" :style="{ color: tenantColor }">Nutzungsbedingungen</a>
                  und die
                  <a href="/register/staff-datenschutz" target="_blank" class="hover:underline" :style="{ color: tenantColor }">Datenschutzerklärung</a>.
                </span>
              </label>
            </div>
          </template>

          <!-- Navigation -->
          <div class="flex justify-between pt-2 border-t">
            <button
              v-if="currentStep > 0"
              type="button"
              @click="currentStep--"
              class="px-5 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >← Zurück</button>
            <div v-else></div>

            <div class="flex gap-2">
              <!-- Next / Submit -->
              <button
                v-if="currentStep < STEP_LOADING"
                :type="currentStep === 6 ? 'submit' : 'button'"
                @click="currentStep < 6 ? nextStep() : undefined"
                :disabled="!canProceed"
                class="px-5 py-2 text-sm text-white rounded-lg transition-opacity font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                :style="{ background: tenantColor }"
              >{{ currentStep === 6 ? 'Registrierung abschliessen' : 'Weiter →' }}</button>
            </div>
          </div>

          <!-- iOS Password Autofill: mirrors always present in DOM so Safari can detect
               username + password at form submission, even though they're on different steps -->
          <div aria-hidden="true" style="position:absolute;opacity:0;pointer-events:none;top:-9999px;left:-9999px">
            <input type="email" name="username" autocomplete="username" :value="form.email" tabindex="-1">
            <input type="password" name="password" autocomplete="new-password" :value="form.password" tabindex="-1">
            <input type="password" name="confirm-password" autocomplete="new-password" :value="form.confirmPassword" tabindex="-1">
          </div>

        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ name: 'register-staff-invite' })

import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'
import { useAuthStore } from '~/stores/auth'
import { generateStrongPassword } from '~/composables/usePasswordStrength'
import { saveCredentials } from '~/utils/save-credentials'

const route              = useRoute()
const router             = useRouter()
const authStore          = useAuthStore()
const { loadTenantBranding } = useTenantBranding()

// ─── Constants ──────────────────────────────────────────────────────────────
const STEP_LOADING = 7
const STEP_SUCCESS = 8
const VISIBLE_STEPS = [
  { label: 'Basisdaten' },
  { label: 'Profil' },
  { label: 'Arbeitszeiten' },
  { label: 'Standorte' },
  { label: 'Kalender' },
  { label: 'Dokumente' },
  { label: 'Passwort' },
]

const weekDays = [
  { value: 1, short: 'Mo' }, { value: 2, short: 'Di' }, { value: 3, short: 'Mi' },
  { value: 4, short: 'Do' }, { value: 5, short: 'Fr' }, { value: 6, short: 'Sa' },
  { value: 7, short: 'So' },
]

const calendarProviders = [
  { id: 'apple',   icon: '🍎', label: 'Apple iCal' },
  { id: 'google',  icon: '📅', label: 'Google Kalender' },
  { id: 'outlook', icon: '📧', label: 'Microsoft Outlook' },
  { id: 'other',   icon: '🗓️', label: 'Anderer Kalender (ICS)' },
]

// ─── State ───────────────────────────────────────────────────────────────────
const currentStep        = ref(0)
const isLoading          = ref(true)
const loadError          = ref('')
const registrationError  = ref('')
const autoLoginFailed    = ref(false)
const tenantName         = ref('')
const tenantSlugRef      = ref('')
const tenantColor        = ref('#7C3AED')
const availableCategories  = ref<any[]>([])
const tenantLocations      = ref<any[]>([])
const tenantExamLocations  = ref<any[]>([]) // global exam locations (tenant_id = null)
const affiliateEnabled     = ref(false)

// New meetup location form state
const showNewLocationForm  = ref(false)
const newLocationName      = ref('')
const newLocationAddress   = ref('')

const addNewLocation = () => {
  const name    = newLocationName.value.trim()
  const address = newLocationAddress.value.trim()
  if (!name || !address) return
  form.newLocations.push({ name, address })
  newLocationName.value    = ''
  newLocationAddress.value = ''
  showNewLocationForm.value = false
}

// Exam location search state
const examLocationSearch = ref('')
const examSearchOpen     = ref(false)

const filteredExamLocations = computed(() => {
  const q = examLocationSearch.value.toLowerCase().trim()
  if (!q) return tenantExamLocations.value.slice(0, 20) // show first 20 when empty
  return tenantExamLocations.value.filter(loc =>
    loc.name?.toLowerCase().includes(q) ||
    loc.address?.toLowerCase().includes(q) ||
    loc.city?.toLowerCase().includes(q) ||
    loc.canton?.toLowerCase().includes(q) ||
    loc.postal_code?.includes(q)
  )
})

const isExamLocationSelected = (id: string) =>
  form.selectedExamLocations.some((l: any) => l.id === id)

const toggleExamLocationSelection = (loc: any) => {
  const idx = form.selectedExamLocations.findIndex((l: any) => l.id === loc.id)
  if (idx >= 0) {
    form.selectedExamLocations.splice(idx, 1)
  } else {
    form.selectedExamLocations.push(loc)
  }
  examLocationSearch.value = ''
  examSearchOpen.value = false
}
const affiliateCode      = ref('')
const icsUrl             = ref('')
const icsCopied          = ref(false)
const affiliateCopied    = ref(false)
const affiliateLink      = computed(() =>
  affiliateCode.value ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ref/${affiliateCode.value}` : ''
)

// Files
const licenseFrontInput  = ref<HTMLInputElement>()
const licenseBackInput   = ref<HTMLInputElement>()
const licenseFrontFile   = ref<File | null>(null)
const licenseBackFile    = ref<File | null>(null)
const licenseFrontPreview = ref<string | null>(null)
const licenseBackPreview  = ref<string | null>(null)
const isDraggingFront    = ref(false)
const isDraggingBack     = ref(false)

// ─── Form ────────────────────────────────────────────────────────────────────
const defaultWorkingDays = () => Object.fromEntries(
  weekDays.map(d => [d.value, { active: d.value <= 5, start: '07:00', end: '18:00' }])
)

const form = reactive({
  // Step 0
  firstName: '', lastName: '', email: '', phone: '', birthdate: '',
  street: '', streetNr: '', zip: '', city: '',
  // Step 1
  selectedCategories: [] as string[],
  // Step 2
  workingDays: defaultWorkingDays() as Record<number, { active: boolean; start: string; end: string }>,
  // Step 3
  selectedLocationIds: [] as string[],
  selectedExamLocationIds: [] as string[], // kept for backward compat
  selectedExamLocations: [] as any[],      // full objects for global exam locations
  newLocations: [] as { name: string; address: string }[], // new meetup locations added by staff
  // Step 4
  externalCalendarProvider: '' as string,
  externalCalendarUrl: '',
  // Step 6
  password: '', confirmPassword: '', acceptedTerms: false,
})

// ─── Computed ────────────────────────────────────────────────────────────────
const zxcvbnScore    = ref<0 | 1 | 2 | 3 | 4 | null>(null)
const hibpStatus     = ref<'idle' | 'checking' | 'pwned' | 'safe'>('idle')
const hibpCount      = ref(0)
const showPw         = ref(false)

// ─── Email availability check ───────────────────────────────────────────────
const staffEmailCheck = ref<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle')
let staffEmailDebounce: ReturnType<typeof setTimeout> | null = null

const checkStaffEmail = (val: string) => {
  if (staffEmailDebounce) clearTimeout(staffEmailDebounce)
  const email = val.trim()
  if (!email.includes('@') || email.length < 5) { staffEmailCheck.value = 'idle'; return }
  staffEmailCheck.value = 'checking'
  staffEmailDebounce = setTimeout(async () => {
    try {
      const res = await $fetch<{ email: { available: boolean } }>('/api/tenants/check-availability', { query: { email } })
      staffEmailCheck.value = res.email.available ? 'available' : 'taken'
    } catch { staffEmailCheck.value = 'error' }
  }, 600)
}

const onStaffEmailInput = (val: string) => {
  staffEmailCheck.value = 'idle'
  if (staffEmailDebounce) clearTimeout(staffEmailDebounce)
  const email = val.trim()
  if (!email.includes('@') || email.length < 5) return
  staffEmailCheck.value = 'checking'
  staffEmailDebounce = setTimeout(async () => {
    try {
      const res = await $fetch<{ email: { available: boolean } }>('/api/tenants/check-availability', { query: { email } })
      staffEmailCheck.value = res.email.available ? 'available' : 'taken'
    } catch { staffEmailCheck.value = 'error' }
  }, 700)
}

let hibpDebounceTimer: ReturnType<typeof setTimeout> | null = null

const useGeneratedPassword = () => {
  const pw = generateStrongPassword()
  form.password = pw
  form.confirmPassword = pw
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

const passwordIsValid = computed(() =>
  form.password.length >= 12 &&
  zxcvbnScore.value !== null && zxcvbnScore.value >= 2 &&
  hibpStatus.value !== 'pwned' && hibpStatus.value !== 'checking'
)

const brandVars = computed(() => ({
  '--brand': tenantColor.value,
}))

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return !!(
        form.firstName &&
        form.lastName &&
        form.email &&
        form.phone &&
        form.birthdate &&
        form.street &&
        form.streetNr &&
        form.zip &&
        form.city &&
        staffEmailCheck.value === 'available'
      )
    case 1:
      // At least one category selected (skip if none available)
      return availableCategories.value.length === 0 || form.selectedCategories.length > 0
    case 2:
      // At least one working day active
      return Object.values(form.workingDays).some(d => d.active)
    case 3: {
      const hasLocation     = tenantLocations.value.length === 0 || form.selectedLocationIds.length > 0 || form.newLocations.length > 0
      const hasExamLocation = tenantExamLocations.value.length === 0 || form.selectedExamLocations.length > 0
      return hasLocation && hasExamLocation
    }
    case 4:
      // Calendar connection is fully optional – always allow proceeding
      return true
    case 5:
      // Front side of license required
      return !!licenseFrontFile.value
    case 6:
      return passwordIsValid.value &&
             form.password === form.confirmPassword &&
             form.acceptedTerms
    default:
      return true
  }
})

// ─── Load invitation ─────────────────────────────────────────────────────────
const loadInvitation = async () => {
  try {
    const token = route.query.token as string
    if (!token) { loadError.value = 'Kein Einladungstoken gefunden'; return }

    const response = await $fetch('/api/staff/get-invitation', {
      method: 'POST', body: { token }
    }).catch((err: any) => {
      loadError.value = err.status === 410
        ? 'Diese Einladung ist abgelaufen'
        : 'Ungültige oder abgelaufene Einladung'
      throw err
    }) as any

    if (!response?.success) throw new Error('Load failed')

    // Set invitation data
    const inv = response.invitation
    form.firstName = inv.first_name || ''
    form.lastName  = inv.last_name  || ''
    // Don't pre-fill placeholder emails generated by the system
    form.email     = (inv.email && !inv.email.includes('@onboarding.simy.ch')) ? inv.email : ''
    if (form.email) checkStaffEmail(form.email)
    form.phone     = inv.phone      || ''

    tenantName.value          = response.tenant?.name || ''
    tenantSlugRef.value       = response.tenant?.slug || ''
    tenantColor.value         = response.tenant?.primary_color || '#7C3AED'
    availableCategories.value = response.categories   || []
    tenantLocations.value     = response.locations    || []
    tenantExamLocations.value = response.examLocations || []
    affiliateEnabled.value    = response.affiliateEnabled || false

    // Apply tenant working hours template if available
    if (response.tenant?.working_days_template) {
      const tpl = response.tenant.working_days_template
      if (Array.isArray(tpl.days)) {
        Object.keys(form.workingDays).forEach(d => {
          form.workingDays[+d].active = tpl.days.includes(+d)
          // Per-day overrides take priority over global start/end
          const daySchedule = tpl.schedule?.[d]
          form.workingDays[+d].start = daySchedule?.start ?? tpl.start_time ?? '07:00'
          form.workingDays[+d].end   = daySchedule?.end   ?? tpl.end_time   ?? '19:00'
        })
      }
    }

  } catch (err: any) {
    if (!loadError.value) loadError.value = 'Fehler beim Laden der Einladung'
  } finally {
    isLoading.value = false
  }
}

// ─── Navigation ──────────────────────────────────────────────────────────────
const nextStep = async () => {
  if (currentStep.value === 6) {
    await submit()
  } else {
    currentStep.value++
  }
}

// Form submit handler — called by type="submit" button on final step
const onFormSubmit = () => {
  if (currentStep.value === 6) nextStep()
}

// ─── Submit ──────────────────────────────────────────────────────────────────
const submit = async () => {
  if (!canProceed.value) return
  registrationError.value = ''
  currentStep.value = STEP_LOADING

  try {
    // Build working hours array from selected days
    const workingHours = Object.entries(form.workingDays)
      .filter(([, v]) => v.active)
      .map(([day, v]) => ({ day_of_week: +day, start_time: v.start, end_time: v.end }))

    const response = await $fetch<any>('/api/staff/register', {
      method: 'POST',
      body: {
        invitationToken:       route.query.token,
        email:                 form.email,
        firstName:             form.firstName,
        lastName:              form.lastName,
        phone:                 form.phone,
        birthdate:             form.birthdate,
        street:                form.street,
        streetNr:              form.streetNr,
        zip:                   form.zip,
        city:                  form.city,
        password:              form.password,
        selectedCategories:    form.selectedCategories,
        acceptedTerms:         form.acceptedTerms,
        workingHours,
        selectedLocationIds:      form.selectedLocationIds,
        newLocations:             form.newLocations,
        selectedExamLocationIds:  form.selectedExamLocations.map((l: any) => l.id),
      }
    })

    if (!response.success) throw new Error('Registrierung fehlgeschlagen')

    const userId = response.userId
    if (response.tenantSlug) tenantSlugRef.value = response.tenantSlug

    // Upload license files
    if (userId && (licenseFrontFile.value || licenseBackFile.value)) {
      try {
        const fd = new FormData()
        fd.append('userId', userId)
        if (licenseFrontFile.value) fd.append('frontFile', licenseFrontFile.value)
        if (licenseBackFile.value)  fd.append('backFile',  licenseBackFile.value)
        await $fetch('/api/admin/upload-license', { method: 'POST', body: fd })
      } catch { /* non-fatal */ }
    }

    // Auto-login
    const loginOk = await authStore.login(form.email, form.password).catch(() => false)
    if (!loginOk) autoLoginFailed.value = true

    // Save credentials for Android/Chrome; iOS relies on mirror inputs + form submit
    if (loginOk) {
      await saveCredentials(form.email, form.password, `${form.firstName} ${form.lastName}`.trim())
    }

    // Generate ICS URL after login
    if (loginOk) {
      try {
        const tokenRes = await $fetch<any>('/api/calendar/generate-token', { method: 'POST' })
        icsUrl.value = tokenRes?.calendarLink || tokenRes?.url || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ics?staff_id=${userId}`
      } catch {
        icsUrl.value = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ics?staff_id=${userId}`
    }
  }

// Auto-normalize calendar URL: webcal:// and http:// → https://
const normalizeCalendarUrl = () => {
  if (!form.externalCalendarUrl) return
  form.externalCalendarUrl = form.externalCalendarUrl
    .trim()
    .replace(/^webcal:\/\//i, 'https://')
    .replace(/^http:\/\//i, 'https://')
}

    // Connect external calendar after login
    if (loginOk && form.externalCalendarProvider && form.externalCalendarUrl) {
      try {
        // Normalize webcal:// → https:// and http:// → https:// (already done on input, but kept as safety net)
        const normalizedUrl = form.externalCalendarUrl
          .replace(/^webcal:\/\//i, 'https://')
          .replace(/^http:\/\//i, 'https://')
        await $fetch('/api/staff/external-calendars', {
          method: 'POST',
          body: {
            action: 'connect',
            data: {
              provider: form.externalCalendarProvider,
              ics_url: normalizedUrl,
            }
          }
        })
      } catch { /* non-fatal */ }
    }

    currentStep.value = STEP_SUCCESS

  } catch (err: any) {
    console.error('Registration error:', err)
    registrationError.value = err.data?.statusMessage || err.statusMessage || err.message || 'Ein Fehler ist aufgetreten'
    currentStep.value = 6
  }
}

// ─── Dashboard redirect ───────────────────────────────────────────────────────
const goToDashboard = async () => {
  // Load tenant branding before navigating so the dashboard shows correct colors/logo.
  // The plugin skips branding for /dashboard (it's in nonTenantPaths), so we
  // pre-load it here using the slug we got from the registration response.
  if (tenantSlugRef.value) {
    await loadTenantBranding(tenantSlugRef.value).catch(() => {})
  }
  router.push('/dashboard')
}

// ─── File handling ────────────────────────────────────────────────────────────
const validateFile = (file: File): string | null => {
  if (file.size > 5 * 1024 * 1024) return 'Datei ist zu gross. Maximum 5MB.'
  if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type))
    return 'Nur JPG, PNG oder PDF erlaubt.'
  return null
}
const createPreview = (file: File): Promise<string | null> => new Promise(resolve => {
  if (!file.type.startsWith('image/')) { resolve(null); return }
  const r = new FileReader()
  r.onload = e => resolve(e.target?.result as string)
  r.onerror = () => resolve(null)
  r.readAsDataURL(file)
})
const onFileChange = async (e: Event, side: 'front' | 'back') => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const err = validateFile(file)
  if (err) { registrationError.value = err; return }
  if (side === 'front') { licenseFrontFile.value = file; licenseFrontPreview.value = await createPreview(file) }
  else                  { licenseBackFile.value  = file; licenseBackPreview.value  = await createPreview(file) }
}
const handleDrop = async (e: DragEvent, side: 'front' | 'back') => {
  if (side === 'front') isDraggingFront.value = false
  else isDraggingBack.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const err = validateFile(file)
  if (err) { registrationError.value = err; return }
  if (side === 'front') { licenseFrontFile.value = file; licenseFrontPreview.value = await createPreview(file) }
  else                  { licenseBackFile.value  = file; licenseBackPreview.value  = await createPreview(file) }
}

// ─── Copy helpers ─────────────────────────────────────────────────────────────
const copyIcsUrl = () => {
  navigator.clipboard.writeText(icsUrl.value)
  icsCopied.value = true
  setTimeout(() => icsCopied.value = false, 2000)
}
const copyAffiliateLink = () => {
  navigator.clipboard.writeText(affiliateLink.value)
  affiliateCopied.value = true
  setTimeout(() => affiliateCopied.value = false, 2000)
}

watch(() => form.password, (pw) => checkPasswordStrength(pw))

onMounted(() => loadInvitation())
</script>

<style scoped>
.label  { @apply block text-sm font-medium text-gray-700 mb-1; }
.input  { @apply w-full px-3 py-2 border border-gray-300 rounded-lg text-sm; }
.input:focus { outline: none; border-color: var(--brand, #7C3AED); box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand, #7C3AED) 25%, transparent); }
.input-sm { @apply px-2 py-1 border border-gray-300 rounded text-sm; }
.input-sm:focus { outline: none; border-color: var(--brand, #7C3AED); box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand, #7C3AED) 25%, transparent); }
input[type="checkbox"], input[type="radio"] { accent-color: var(--brand, #7C3AED); }
</style>
