<template>
  <Teleport to="body">
    <!-- Warning Toast for Session Order -->
    <Transition name="slide-down">
      <div 
        v-if="showSessionWarning"
        class="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4"
      >
        <div class="bg-amber-50 border border-amber-300 rounded-lg shadow-lg p-4 flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-amber-800">Session-Reihenfolge angepasst</p>
            <p class="text-sm text-amber-700 mt-1">{{ sessionWarningMessage }}</p>
          </div>
          <button 
            @click="showSessionWarning = false"
            class="text-amber-500 hover:text-amber-700"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
    
    <div 
      v-if="isOpen" 
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-slate-800">Kursanmeldung</h2>
          <button 
            @click="$emit('close')" 
            class="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Course Info -->
          <div class="rounded-lg p-4 mb-6" :style="{ backgroundColor: getTenantBackgroundColor() }">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-semibold text-gray-800">{{ course.name.split(' - ')[0] }}</h3>
                <p class="text-sm mt-1 text-gray-500">{{ course.description }}</p>
              </div>
              <span v-if="isForcedPartial || isPartialMode" class="shrink-0 text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Nur Teil {{ partialStartPosition }}</span>
            </div>

            <!-- Partial mode toggle (only for full courses whose category allows it) -->
            <div v-if="categoryAllowsPartial && !isForcedPartial && course.course_sessions?.length >= partialStartPosition" class="mt-3 flex items-center justify-between bg-white/60 rounded-lg px-3 py-2 border border-amber-200">
              <div>
                <p class="text-sm font-medium text-amber-900">Nur Teil {{ partialStartPosition }} buchen</p>
                <p class="text-xs text-amber-700">Für Kunden mit bestehendem A1-Kursnachweis</p>
              </div>
              <button
                type="button"
                @click="isPartialMode = !isPartialMode; isIndividualSessionMode = false; partialConfirmed = false"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="isPartialMode ? 'bg-amber-500' : 'bg-gray-300'"
              >
                <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200" :class="isPartialMode ? 'translate-x-5' : 'translate-x-0'" />
              </button>
            </div>

            <!-- Session-level individual booking toggle -->
            <div
              v-if="individualBookableSessions.length > 0 && !isForcedPartial"
              class="mt-3 flex items-center justify-between bg-white/60 rounded-lg px-3 py-2 border border-blue-200"
            >
              <div>
                <p class="text-sm font-medium text-blue-900">Nur Session {{ individualSessionNumber }} buchen</p>
                <p class="text-xs text-blue-700">CHF {{ (individualSessionPriceRappen / 100).toFixed(2) }} · Einzelbuchung für diese Session</p>
              </div>
              <button
                type="button"
                @click="isIndividualSessionMode = !isIndividualSessionMode; isPartialMode = false; partialConfirmed = false"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :class="isIndividualSessionMode ? 'bg-blue-500' : 'bg-gray-300'"
              >
                <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200" :class="isIndividualSessionMode ? 'translate-x-5' : 'translate-x-0'" />
              </button>
            </div>

            <div class="mt-2 flex items-center gap-3 flex-wrap">
              <p class="text-lg font-bold text-gray-800"
                :class="(appliedDiscount || userCreditRappen > 0) ? 'line-through text-gray-400 text-base' : ''">
                CHF {{ formatPrice(activeBasePrice) }}
              </p>
              <p v-if="appliedDiscount && !userCreditRappen" class="text-lg font-bold text-green-700">
                CHF {{ formatPrice(effectivePrice) }}
              </p>
              <p
                v-if="userCreditRappen > 0"
                class="text-lg font-bold"
                :class="effectivePriceAfterCredit === 0 ? 'text-green-700' : ''"
                :style="effectivePriceAfterCredit === 0 ? {} : { color: getTenantPrimaryColor() }"
              >
                {{ effectivePriceAfterCredit === 0 ? 'Kostenlos ✓' : `CHF ${formatPrice(effectivePriceAfterCredit)}` }}
              </p>
            </div>
            <div
              v-if="userCreditRappen > 0"
              class="mt-1 text-xs flex items-center gap-1"
              :style="{ color: getTenantPrimaryColor() }"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              CHF {{ formatPrice(Math.min(userCreditRappen, effectivePrice)) }} Guthaben wird {{ effectivePriceAfterCredit === 0 ? 'vollständig' : 'teilweise' }} verrechnet
            </div>
            
            <!-- Sessions overview -->
            <div class="mt-3 space-y-1">
              <div 
                v-for="(session, idx) in sessionGroups" 
                :key="idx" 
                class="text-sm p-2 rounded-lg flex items-center justify-between gap-2"
                :class="session.isCustom ? 'border' : 'bg-gray-50'"
                :style="session.isCustom ? { background: `${getTenantPrimaryColor()}15`, borderColor: `${getTenantPrimaryColor()}33` } : {}"
              >
                <div class="flex flex-col gap-0.5 min-w-0">
                  <div>
                    <span class="text-gray-800 font-medium">{{ session.label }}: </span>
                    <span class="text-gray-800">{{ formatSessionDate(session.displayDate) }}</span>
                  </div>
                  <span class="text-gray-500">{{ session.timeRange }}</span>
                  <span v-if="session.isCustom" class="text-xs" :style="{ color: getTenantPrimaryColor() }">({{ session.customCourseName }})</span>
                </div>
                <div class="shrink-0 flex items-center gap-1.5">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="session.freeSlots > 3 ? 'bg-green-100 text-green-700' : session.freeSlots > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'"
                  >
                    {{ session.freeSlots }} frei
                  </span>
                  <button
                    v-if="session.isChangeable && sessionHasAlternatives[session.position]"
                    @click="openSessionSwapModal(session)"
                    class="px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                    :style="{ backgroundColor: getTenantPrimaryColor() + '20', color: getTenantPrimaryColor() }"
                  >
                    Ändern
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Sessions anpassen Button -->
            <button
              v-if="hasChangeableSessions && Object.values(sessionHasAlternatives).some(v => v)"
              @click="showSessionCustomizer = true"
              class="mt-3 w-full py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2"
              :style="{ 
                color: getTenantPrimaryColor(), 
                borderColor: getTenantPrimaryColor() 
              }"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ hasCustomSessions ? 'Sessions bearbeiten' : 'Sessions anpassen' }}
            </button>
          </div>
          
          <!-- Session Customizer Modal -->
          <div 
            v-if="showSessionCustomizer" 
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            @click.self="showSessionCustomizer = false"
          >
            <div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden">
              <div class="p-4 border-b flex items-center justify-between">
                <h3 class="font-semibold text-gray-800">Sessions anpassen</h3>
                <button @click="showSessionCustomizer = false" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div class="p-4 overflow-y-auto max-h-[65vh]">
                <p class="text-sm text-gray-600 mb-4">
                  Wähle für jede Session das gewünschte Datum. Die erste Session ist fix.
                </p>
                
                <!-- All sessions list -->
                <div class="space-y-3">
                  <div 
                    v-for="session in sessionGroups" 
                    :key="session.position"
                    class="p-3 rounded-lg border"
                    :class="session.isCustom ? '' : 'bg-gray-50 border-gray-200'"
                    :style="session.isCustom ? { background: `${getTenantPrimaryColor()}15`, borderColor: `${getTenantPrimaryColor()}33` } : {}"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-medium text-gray-800">{{ session.label }}</span>
                        <span v-if="!session.isChangeable" class="ml-2 text-xs text-gray-400">(fix)</span>
                      </div>
                      <button
                        v-if="session.isChangeable"
                        @click="openSessionSwapModal(session)"
                        class="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
                        :style="{ 
                          backgroundColor: getTenantPrimaryColor(),
                          color: 'white'
                        }"
                      >
                        Ändern
                      </button>
                    </div>
                    <div class="mt-1 text-sm">
                      <span class="text-gray-700">{{ formatSessionDate(session.displayDate) }}</span>
                      <span class="text-gray-500 ml-2">{{ session.timeRange }}</span>
                    </div>
                    <div v-if="session.isCustom" class="mt-1 text-xs" :style="{ color: getTenantPrimaryColor() }">
                      {{ session.customCourseName }}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="p-4 border-t">
                <button
                  @click="showSessionCustomizer = false"
                  class="w-full py-2 text-white font-medium rounded-lg transition-colors"
                  :style="{ backgroundColor: getTenantPrimaryColor() }"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
          
          <!-- Session Swap Options Modal (nested) -->
          <div 
            v-if="showSessionSwapModal" 
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            @click.self="closeSessionSwapModal"
          >
            <div class="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div class="p-4 border-b flex items-center justify-between">
                <h3 class="font-semibold text-gray-800">{{ swapModalTitle }}</h3>
                <button @click="closeSessionSwapModal" class="text-gray-400 hover:text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div class="p-4 overflow-y-auto max-h-[60vh]">
                <div v-if="isLoadingSwapOptions" class="text-center py-8">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" :style="{ borderColor: getTenantPrimaryColor() }"></div>
                  <p class="text-sm text-gray-500">Lade verfügbare Sessions...</p>
                </div>
                
                <div v-else-if="availableSwapSessions.length === 0" class="text-center py-8 text-gray-500">
                  <p>Keine alternativen Sessions verfügbar.</p>
                </div>
                
                <div v-else class="space-y-2">
                  <!-- Option to reset to original -->
                  <button
                    v-if="swappingSession?.isCustom"
                    @click="resetSessionToOriginal"
                    class="w-full p-3 text-left rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                  >
                    <div class="font-medium text-gray-800">Original wiederherstellen</div>
                    <div class="text-sm text-gray-500">Zurück zur ursprünglichen Session</div>
                    <!-- Warning if other sessions will be affected -->
                    <div 
                      v-if="resetAffectedSessions.length > 0" 
                      class="mt-2 text-xs text-amber-600 flex items-center gap-1"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Teil {{ resetAffectedSessions.join(', ') }} wird ebenfalls zurückgesetzt
                    </div>
                  </button>
                  
                  <!-- Available sessions -->
                  <button
                    v-for="option in availableSwapSessions"
                    :key="option.sessionId"
                    @click="selectSwapSession(option)"
                    class="w-full p-3 text-left rounded-lg border-2 transition-colors"
                    :class="option.isSelected ? '' : 'border-gray-200 hover:border-gray-400'"
                    :style="option.isSelected ? { borderColor: getTenantPrimaryColor(), background: `${getTenantPrimaryColor()}15` } : {}"
                  >
                    <div class="flex justify-between items-start">
                      <div>
                        <div class="font-medium text-gray-800">{{ formatSessionDate(option.date) }}</div>
                        <div class="text-sm text-gray-600">{{ option.displayTimeRange || formatSwapTime(option.startTime, option.endTime) }}</div>
                        <div class="text-xs text-gray-500 mt-1">{{ option.courseLocation }}</div>
                      </div>
                      <div class="text-right">
                        <span class="text-xs px-2 py-1 rounded-full" :class="option.freeSlots > 3 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
                          {{ option.freeSlots }} frei
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Wallee-disabled banner (online-payment city, online payment off, credit insufficient) -->
          <div
            v-if="paymentMethod === 'WALLEE' && !walleeEnabled && effectivePriceAfterCredit > 0"
            class="mb-4 p-4 rounded-lg border-2 border-amber-300 bg-amber-50"
          >
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div class="text-sm text-amber-900">
                <p class="font-semibold mb-1">Online-Zahlung aktuell nicht verfügbar</p>
                <p>
                  Für diesen Kurs wäre eine Online-Zahlung über Kreditkarte oder TWINT erforderlich, die die Fahrschule aktuell nicht aktiviert hat. Bitte kontaktiere die Fahrschule direkt für die Anmeldung.
                </p>
              </div>
            </div>
          </div>

          <!-- Step 1: SARI Lookup -->
          <div v-if="step === 'lookup'">
            <h4 class="font-medium text-slate-800 mb-4">Schritt 1: Identifikation</h4>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Lernfahrausweis ID *</label>
                <input 
                  v-model="formData.faberid"
                  type="text"
                  placeholder=""
                  class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  :style="{ '--tw-ring-color': getTenantPrimaryColor(), borderColor: isFaberIdFocused ? getTenantPrimaryColor() : 'rgb(203, 213, 225)' }"
                  @focus="isFaberIdFocused = true"
                  @blur="isFaberIdFocused = false"
                  @input="formData.faberid = formData.faberid.replace(/[^0-9]/g, '')"
                />
                <p class="text-xs text-slate-500 mt-1">Für ZH & AG die Nummer im Adressfeld, andere Kantone Faber oder Reg-Nr</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Geburtsdatum</label>
                <input 
                  v-model="formData.birthdate"
                  type="date"
                  class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                />
              </div>
            </div>

            <div v-if="lookupError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ lookupError }}
            </div>

              <button 
                @click="lookupSARI"
                :disabled="!canLookup || isLoading"
                class="mt-6 w-full py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                :style="{ backgroundColor: getTenantPrimaryColor() }"
              >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Wird geprüft...
              </span>
              <span v-else>Weiter</span>
            </button>
          </div>

          <!-- Step 2: Contact & Payment -->
          <div v-else-if="step === 'contact'">
            <h4 class="font-medium text-slate-800 mb-4">{{ isSariCourse ? 'Schritt 2: ' : '' }}Kontaktdaten & Zahlung</h4>
            
            <!-- SARI: verified name box -->
            <div v-if="isSariCourse" class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div class="flex items-center gap-2 text-green-700 mb-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="font-medium">Daten verifiziert</span>
              </div>
              <p class="text-sm text-green-800">{{ sariData?.firstname }} {{ sariData?.lastname }}</p>
              <p class="text-sm text-green-700">{{ sariData?.address }}, {{ sariData?.zip }} {{ sariData?.city }}</p>
            </div>

            <!-- Non-SARI: name + address input fields -->
            <div v-else class="space-y-4 mb-6">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Vorname *</label>
                  <input
                    v-model="formData.firstName"
                    type="text"
                    placeholder="Max"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Nachname *</label>
                  <input
                    v-model="formData.lastName"
                    type="text"
                    placeholder="Mustermann"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-slate-700 mb-1">Strasse *</label>
                  <input
                    v-model="formData.street"
                    type="text"
                    placeholder="Musterstrasse"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Nr. *</label>
                  <input
                    v-model="formData.streetNr"
                    type="text"
                    placeholder="12"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">PLZ *</label>
                  <input
                    v-model="formData.zip"
                    type="text"
                    placeholder="8000"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-slate-700 mb-1">Ort *</label>
                  <input
                    v-model="formData.city"
                    type="text"
                    placeholder="Zürich"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Führerausweis-Nr. *</label>
                  <input
                    v-model="formData.licenseNumber"
                    type="text"
                    placeholder="123456789"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Geburtsdatum *</label>
                  <input
                    v-model="formData.birthdateNonSari"
                    type="date"
                    class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                    :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  />
                </div>
              </div>
            </div>

            <!-- Contact Details -->
            <div class="space-y-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">E-Mail *</label>
                <input 
                  v-model="formData.email"
                  type="email"
                  placeholder="deine@email.ch"
                  class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  :style="{ '--tw-ring-color': getTenantPrimaryColor() } as any"
                  :class="{ 'border-red-300': formData.email && !isValidEmail }"
                />
                <p v-if="formData.email && !isValidEmail" class="text-xs text-red-500 mt-1">Bitte gib eine gültige E-Mail ein</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Telefon *</label>
                <input 
                  v-model="formData.phone"
                  type="tel"
                  placeholder="+41"
                  class="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-offset-0"
                  :style="{ '--tw-ring-color': getTenantPrimaryColor(), borderColor: isPhoneFocused ? getTenantPrimaryColor() : 'rgb(203, 213, 225)' }"
                  :class="{ 'border-red-300': formData.phone && !isValidPhone }"
                  @focus="isPhoneFocused = true"
                  @blur="isPhoneFocused = false; formatPhoneNumber()"
                />
                <p v-if="formData.phone && !isValidPhone" class="text-xs text-red-500 mt-1">Bitte gib eine gültige Telefonnummer ein</p>
              </div>
            </div>

            <!-- Discount Code -->
            <DiscountCodeInput
              :tenant-id="props.tenantId"
              :amount-rappen="props.course.price_per_participant_rappen"
              :primary-color="getTenantPrimaryColor()"
              @applied="(d) => appliedDiscount = d"
              @removed="appliedDiscount = null"
            />

            <!-- Payment Method -->
            <div class="border-t pt-4">
              <p class="text-sm font-medium text-slate-700 mb-2">Zahlungsart</p>
              <p class="text-slate-600">{{ paymentMethodLabel }}</p>
            </div>

            <!-- Cash payment info (only if admin enabled customer visibility) -->
            <div
              v-if="cashVisibleForCustomer && paymentMethod === 'CASH_ON_SITE'"
              class="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <svg class="w-4 h-4 mt-0.5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p class="text-sm text-green-800">
                <strong>Barzahlung vor Ort</strong> — du bezahlst direkt beim Kurs. Es ist keine Vorauszahlung nötig.
              </p>
            </div>
            <div
              v-else-if="cashVisibleForCustomer && paymentMethod === 'WALLEE' && effectivePriceAfterCredit > 0"
              class="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <svg class="w-4 h-4 mt-0.5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-blue-800">
                <strong>Hinweis:</strong> Für diesen Kurs ist Online-Zahlung vorgesehen. Barzahlung ist nach Absprache mit der Fahrschule möglich.
              </p>
            </div>

            <div v-if="enrollmentError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {{ enrollmentError }}
            </div>

            <!-- A1-confirmation checkbox (only for partial enrollments) -->
            <div v-if="isForcedPartial || isPartialMode || isIndividualSessionMode" class="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <input
                id="partial-confirm-checkbox"
                v-model="partialConfirmed"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-amber-400 focus:ring-amber-500"
                style="accent-color: #d97706"
              />
              <label for="partial-confirm-checkbox" class="text-sm text-amber-900">
                <template v-if="isIndividualSessionMode">
                  Ich bestätige, dass ich die Voraussetzungen für die Buchung dieser einzelnen Session erfülle.
                </template>
                <template v-else>
                  Ich bestätige, dass ich die Kategorie A1 durch einen <strong>Kursbesuch</strong> erworben habe (nicht als Schenkung). Nur dann ist die Teilbuchung zulässig.
                </template>
              </label>
            </div>

            <!-- AGB Checkbox -->
            <div class="mt-6 flex items-start gap-3">
              <input 
                id="agb-checkbox"
                v-model="agbAccepted"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-slate-300 focus:ring-2"
                :style="{ accentColor: getTenantPrimaryColor(), '--tw-ring-color': getTenantPrimaryColor() } as any"
              />
              <label for="agb-checkbox" class="text-sm text-slate-600">
                Ich habe die 
                <a 
                  :href="`/reglemente/agb?tenant=${props.tenantSlug}`" 
                  target="_blank" 
                  class="underline hover:no-underline"
                  :style="{ color: getTenantPrimaryColor() }"
                >AGB's</a> 
                gelesen und akzeptiere diese.
              </label>
            </div>

            <div class="flex gap-3 mt-4">
              <button 
                v-if="isSariCourse"
                @click="step = 'lookup'"
                class="flex-1 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Zurück
              </button>
              <button 
                v-if="requiresVehicle && availableVehicles.length === 0 && !isLoadingVehicles"
                @click="loadAvailableVehicles().then(() => availableVehicles.length > 0 ? step = 'vehicle' : submitEnrollment())"
                :disabled="!canSubmit || isLoading"
                class="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                :style="{ backgroundColor: getTenantPrimaryColor() }"
              >
                Weiter
              </button>
              <button 
                v-else-if="requiresVehicle && (availableVehicles.length > 0 || isLoadingVehicles)"
                @click="step = 'vehicle'"
                :disabled="!canSubmit || isLoading || isLoadingVehicles"
                class="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                :style="{ backgroundColor: getTenantPrimaryColor() }"
              >
                <span v-if="isLoadingVehicles" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Fahrzeuge laden…
                </span>
                <span v-else>Fahrzeug wählen →</span>
              </button>
              <button 
                v-else
                @click="submitEnrollment"
                :disabled="!canSubmit || isLoading || (paymentMethod === 'WALLEE' && !walleeEnabled && effectivePriceAfterCredit > 0)"
                class="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                :style="{ backgroundColor: getTenantPrimaryColor() }"
              >
                <span v-if="isLoading" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Lädt...
                </span>
                <span v-else-if="paymentMethod === 'WALLEE' && !walleeEnabled && effectivePriceAfterCredit > 0">Online-Zahlung nicht verfügbar</span>
                <span v-else-if="paymentMethod === 'WALLEE' && effectivePriceAfterCredit === 0">Mit Guthaben anmelden</span>
                <span v-else>{{ paymentMethod === 'WALLEE' ? 'Zur Zahlung' : 'Verbindlich anmelden' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Vehicle Selection Step ──────────────────────────────────── -->
    <div v-else-if="step === 'vehicle'" class="p-6 space-y-5">
      <div>
        <h3 class="text-lg font-bold text-slate-900">Fahrzeug wählen</h3>
        <p class="text-sm text-slate-500 mt-1">Wähle dein Mietfahrzeug für den Kurs.</p>
      </div>

      <div v-if="isLoadingVehicles" class="py-8 text-center text-slate-400">Lädt…</div>
      <div v-else-if="availableVehicles.length === 0" class="py-8 text-center text-slate-500">
        <p class="font-medium">Keine Fahrzeuge verfügbar</p>
        <p class="text-xs mt-1">Bitte kontaktiere uns direkt.</p>
      </div>
      <div v-else class="space-y-3">
        <label
          v-for="v in availableVehicles"
          :key="v.id"
          class="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all"
          :class="selectedVehicleId === v.id
            ? 'border-current bg-opacity-5'
            : 'border-slate-200 hover:border-slate-300'"
          :style="selectedVehicleId === v.id ? { borderColor: getTenantPrimaryColor(), backgroundColor: getTenantPrimaryColor() + '10' } : {}"
        >
          <input type="radio" :value="v.id" v-model="selectedVehicleId" class="mt-1 accent-current" :style="{ accentColor: getTenantPrimaryColor() }" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="font-semibold text-slate-900">{{ v.display_name }}</p>
              <span v-if="!v.is_available" class="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Ausgebucht</span>
              <span v-else-if="v.blocked_sessions > 0" class="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{{ v.total_sessions - v.blocked_sessions }}/{{ v.total_sessions }} Termine frei</span>
            </div>
            <div class="flex gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              <span v-if="v.farbe">{{ v.farbe }}</span>
              <span v-if="v.getriebe">{{ v.getriebe }}</span>
              <span v-if="v.location_address">📍 {{ v.location_address }}</span>
            </div>
            <div v-if="v.pricing_tiers?.lesson || v.hourly_rate_rappen" class="mt-1.5 text-sm font-semibold" :style="{ color: getTenantPrimaryColor() }">
              <span v-if="v.pricing_tiers?.lesson">CHF {{ (v.pricing_tiers.lesson / 100).toFixed(2) }} pro Lektion</span>
              <span v-else-if="v.hourly_rate_rappen">CHF {{ (v.hourly_rate_rappen / 100).toFixed(2) }}/h</span>
            </div>
          </div>
        </label>
      </div>

      <div v-if="enrollmentError" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ enrollmentError }}
      </div>

      <div class="flex gap-3">
        <button @click="step = 'contact'" class="flex-1 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
          Zurück
        </button>
        <button
          @click="submitEnrollment"
          :disabled="isLoading || (!selectedVehicleId && availableVehicles.some(v => v.is_available))"
          class="flex-1 py-3 text-white font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          :style="{ backgroundColor: getTenantPrimaryColor() }"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Lädt…
          </span>
          <span v-else>{{ paymentMethod === 'WALLEE' ? 'Zur Zahlung' : 'Verbindlich anmelden' }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { logger } from '~/utils/logger'
import { getCoursePaymentMethod, getPaymentMethodLabel } from '~/utils/courseLocationUtils'
import { useTenant } from '~/composables/useTenant'
import { useAffiliateRef } from '~/composables/useAffiliateRef'
import { useWalleeStatus } from '~/composables/useWalleeStatus'
import { useCashPaymentSettings } from '~/composables/useCashPaymentSettings'
import DiscountCodeInput from '~/components/shared/DiscountCodeInput.vue'
import { getSupabase } from '~/utils/supabase'

interface Props {
  isOpen: boolean
  course: any
  tenantId: string
  tenantSlug: string
  walleeEnabledOverride?: boolean  // Pass from public pages to avoid auth-required API call
  initialIndividualMode?: boolean  // Pre-activate individual session mode
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'enrolled'])

// Tenant hooks
const { tenantPrimaryColor } = useTenant()
const { walleeEnabled: walleeEnabledFromStore, loadWalleeStatus } = useWalleeStatus()
const { cashVisible: cashVisibleForCustomer } = useCashPaymentSettings('customer')

// Prefer the prop value (from public API) over the store value to avoid an auth-required
// API call that would redirect unauthenticated public users.
const walleeEnabled = computed(() =>
  props.walleeEnabledOverride !== undefined ? props.walleeEnabledOverride : walleeEnabledFromStore.value
)

onMounted(() => {
  if (props.walleeEnabledOverride === undefined) {
    loadWalleeStatus()
  }
})
const { getStoredRefCode } = useAffiliateRef()

// Helper functions for colors
const getTenantPrimaryColor = () => {
  return tenantPrimaryColor.value || '#3B82F6'
}

const getTenantBackgroundColor = () => {
  const primary = getTenantPrimaryColor()
  return primary + '10' // 10% opacity version
}

const getTextColor = () => {
  return { color: getTenantPrimaryColor() }
}

// State
const isSariCourse = computed(() => !!props.course?.sari_managed)

const step = ref<'lookup' | 'contact' | 'vehicle'>(props.course?.sari_managed ? 'lookup' : 'contact')
const isLoading = ref(false)
const lookupError = ref<string | null>(null)
const enrollmentError = ref<string | null>(null)
const sariData = ref<any>(null)
const isFaberIdFocused = ref(false)
const isPhoneFocused = ref(false)

// ── Vehicle selection ─────────────────────────────────────────────────────
const availableVehicles = ref<any[]>([])
const selectedVehicleId = ref<string | null>(null)
const isLoadingVehicles = ref(false)

const requiresVehicle = computed(() => !!props.course?.requires_vehicle)

async function loadAvailableVehicles() {
  if (!requiresVehicle.value || !props.course?.id) return
  isLoadingVehicles.value = true
  try {
    const res: any = await $fetch(`/api/courses/${props.course.id}/available-vehicles`)
    availableVehicles.value = res.vehicles || []
  } catch {
    availableVehicles.value = []
  } finally {
    isLoadingVehicles.value = false
  }
}

const formData = ref({
  faberid: '',
  birthdate: '',
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  street: '',
  streetNr: '',
  zip: '',
  city: '',
  licenseNumber: '',
  birthdateNonSari: '',
})

// Computed
const paymentMethod = computed(() => {
  // Honors `course.payment_method` (admin override), falls back to city +
  // tenant Wallee status. Server-side handlers use the same helper to keep
  // UI and API in sync.
  return getCoursePaymentMethod(props.course as any, walleeEnabled.value)
})

const paymentMethodLabel = computed(() => getPaymentMethodLabel(paymentMethod.value))

const canLookup = computed(() => {
  return formData.value.faberid.length >= 6 && formData.value.birthdate
})

const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(formData.value.email)
})

const isValidPhone = computed(() => {
  const phoneClean = formData.value.phone.replace(/\s/g, '')
  return phoneClean.length >= 10
})

const isValidName = computed(() => {
  return formData.value.firstName.trim().length >= 2 && formData.value.lastName.trim().length >= 2
})

const isValidAddress = computed(() => {
  return (
    formData.value.street.trim().length >= 2 &&
    formData.value.streetNr.trim().length >= 1 &&
    formData.value.zip.trim().length >= 4 &&
    formData.value.city.trim().length >= 2 &&
    formData.value.licenseNumber.trim().length >= 6 &&
    formData.value.birthdateNonSari.trim().length >= 8
  )
})

const agbAccepted = ref(false)

// Discount
const appliedDiscount = ref<{ code: string; discountAmountRappen: number; discountData: any } | null>(null)

const activeBasePrice = computed(() => {
  if (!props.course) return 0
  if (isIndividualSessionMode.value) return individualSessionPriceRappen.value
  if (isForcedPartial.value || isPartialMode.value) return partialPriceRappen.value
  return props.course.price_per_participant_rappen ?? 0
})

const effectivePrice = computed(() => {
  return Math.max(0, activeBasePrice.value - (appliedDiscount.value?.discountAmountRappen ?? 0))
})

// Credit wallet for logged-in users
const userCreditRappen = ref(0)
const loggedInUserId = ref<string | null>(null)

const effectivePriceAfterCredit = computed(() => Math.max(0, effectivePrice.value - userCreditRappen.value))

onMounted(async () => {
  // Pre-load vehicles if course requires them
  if (requiresVehicle.value) loadAvailableVehicles()

  try {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const currentUser = await $fetch('/api/auth/current-user') as any
    if (!currentUser?.id) return
    loggedInUserId.value = currentUser.id

    const creditRes = await $fetch(`/api/student-credits/get-credit?user_id=${currentUser.id}`) as any
    userCreditRappen.value = creditRes?.data?.balance_rappen ?? 0
  } catch {
    // not logged in or no credit – fine
  }
})

// Session swap state
const customSessions = ref<Record<string, any>>({})
const showSessionCustomizer = ref(false)
const showSessionSwapModal = ref(false)
const swappingSession = ref<any>(null)
const availableSwapSessions = ref<any[]>([])

// Which positions have actual alternatives available (position → boolean)
const sessionHasAlternatives = ref<Record<number, boolean>>({})

const checkSessionAlternatives = async () => {
  if (!hasChangeableSessions.value || !props.course?.course_sessions?.length) return
  const groups = sessionGroups.value.filter((g: any) => g.isChangeable)
  const results = await Promise.allSettled(groups.map(async (group: any) => {
    const prevGroup = sessionGroups.value.find((g: any) => g.position === group.position - 1)
    const afterDate = prevGroup?.displayDate || prevGroup?.date
    try {
      const res = await $fetch('/api/courses/available-sessions', {
        query: {
          tenantId: props.tenantId,
          category: props.course.category,
          sessionPosition: group.position,
          afterDate,
          excludeCourseId: props.course.id,
          courseLocation: props.course.description,
          currentDate: group.displayDate || group.date
        }
      }) as any
      sessionHasAlternatives.value[group.position] = !!(res?.sessions?.length)
    } catch {
      sessionHasAlternatives.value[group.position] = false
    }
  }))
}
const isLoadingSwapOptions = ref(false)

// Partial enrollment (Teil-3-only / upgrade path)
const isPartialMode = ref(false)
const partialConfirmed = ref(false)

// Session-level individual booking (per-session override of category config)
const isIndividualSessionMode = ref(props.initialIndividualMode ?? false)

// Sessions that have allow_individual_booking = true, sorted by session_number
const individualBookableSessions = computed(() =>
  (props.course?.course_sessions ?? [])
    .filter((s: any) => s.allow_individual_booking)
    .sort((a: any, b: any) => (a.session_number ?? 0) - (b.session_number ?? 0)),
)

// Price for currently selected individual session
const individualSessionPriceRappen = computed(() => {
  const s = individualBookableSessions.value[0]
  return s?.individual_price_rappen ?? 0
})

// Session number to display ("Nur Teil 3")
const individualSessionNumber = computed(() => {
  const s = individualBookableSessions.value[0]
  return s?.session_number ?? null
})

const categoryAllowsPartial = computed(() =>
  !!(props.course?.course_category?.allow_partial_enrollment)
)
const partialStartPosition = computed(() =>
  props.course?.course_category?.partial_start_position ?? 3
)
const partialPriceRappen = computed(() =>
  props.course?.course_category?.partial_price_rappen ?? 0
)
// A SARI-synced course that already only contains Teil 3 is always in partial mode
const isForcedPartial = computed(() => !!props.course?.is_partial_only)

// Warning toast for session order issues
const showSessionWarning = ref(false)
const sessionWarningMessage = ref('')
const autoHideWarningTimeout = ref<any>(null)

// Check if any sessions can be changed
const hasChangeableSessions = computed(() => {
  const sessions = props.course?.course_sessions
  if (!sessions?.length) return false
  const hasIndividualSessions = sessions.some((s: any) => s.allow_individual_booking)
  const allowsPartial = !!props.course?.course_category?.allow_partial_enrollment
  const isPartialOnly = !!props.course?.is_partial_only
  return hasIndividualSessions || allowsPartial || isPartialOnly
})

// Check if user has customized any sessions
const hasCustomSessions = computed(() => {
  return Object.keys(customSessions.value).length > 0
})

const canSubmit = computed(() => {
  const contactOk = isValidEmail.value && isValidPhone.value && agbAccepted.value
  const identityOk = isSariCourse.value ? !!sariData.value : (isValidName.value && isValidAddress.value)
  const baseOk = contactOk && identityOk
  if (isForcedPartial.value || isPartialMode.value || isIndividualSessionMode.value) return baseOk && partialConfirmed.value
  return baseOk
})

const groupedSessions = computed(() => {
  if (!props.course?.course_sessions?.length) return []
  
  const sorted = [...props.course.course_sessions].sort((a: any, b: any) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  const grouped: { date: string; startTime: string; endTime: string; parts: number }[] = []
  let currentDate = ''
  let currentGroup: { date: string; startTime: string; endTime: string; parts: number } | null = null
  
  for (const session of sorted) {
    const date = session.start_time.split('T')[0]
    
    if (date !== currentDate) {
      if (currentGroup) grouped.push(currentGroup)
      currentDate = date
      currentGroup = {
        date,
        startTime: session.start_time,
        endTime: session.end_time,
        parts: 1
      }
    } else if (currentGroup) {
      currentGroup.endTime = session.end_time
      currentGroup.parts++
    }
  }
  
  if (currentGroup) grouped.push(currentGroup)
  
  return grouped.map(g => ({
    date: g.date,
    timeRange: `${formatTime(g.startTime)} - ${formatTime(g.endTime)}`,
    parts: g.parts
  }))
})

// Session groups with swap capability
const sessionGroups = computed(() => {
  if (!props.course?.course_sessions?.length) return []
  
  const sorted = [...props.course.course_sessions].sort((a: any, b: any) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  // Group by date
  const byDate: Map<string, any[]> = new Map()
  for (const session of sorted) {
    const date = session.start_time.split('T')[0]
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(session)
  }
  
  // Build session groups
  const groups: any[] = []
  let position = 0
  let sessionCounter = 0 // Track actual session numbers
  
  for (const [date, sessions] of byDate.entries()) {
    position++
    const isGrouped = sessions.length > 1 // Multiple sessions on same day = grouped
    
    // Calculate session numbers for label
    const startSessionNum = sessionCounter + 1
    const endSessionNum = sessionCounter + sessions.length
    sessionCounter += sessions.length
    
    // Check if this session has been customized
    const customSession = customSessions.value[position.toString()]
    
    // Calculate per-session free slots.
    // When session-level current_participants is available, use it directly
    // (don't mix with course-level which aggregates across all sessions).
    const courseMaxParticipants = props.course.max_participants || 0
    const courseFreeSlots = courseMaxParticipants - (props.course.current_participants || 0)
    let hasSessionData = false
    let sessionMinFreeSlots = Infinity
    for (const s of sessions) {
      if (s.max_participants != null) {
        sessionMinFreeSlots = Math.min(sessionMinFreeSlots, s.max_participants - (s.current_participants || 0))
        hasSessionData = true
      } else if (s.current_participants != null) {
        sessionMinFreeSlots = Math.min(sessionMinFreeSlots, courseMaxParticipants - s.current_participants)
        hasSessionData = true
      }
    }
    const freeSlots = Math.max(0, hasSessionData ? sessionMinFreeSlots : courseFreeSlots)

    groups.push({
      position,
      label: `Teil ${startSessionNum}${isGrouped ? `-${endSessionNum}` : ''}`,
      date,
      displayDate: customSession?.date || date,
      startTime: sessions[0].start_time,
      endTime: sessions[sessions.length - 1].end_time,
      timeRange: customSession 
        ? formatSwapTime(customSession.startTime, customSession.endTime)
        : `${formatTime(sessions[0].start_time)} - ${formatTime(sessions[sessions.length - 1].end_time)}`,
      parts: sessions.length,
      isChangeable: position > 1, // Can change any session/group except the first one
      isCustom: !!customSession,
      customCourseName: customSession?.courseName?.split(' - ')[0],
      originalSariIds: sessions.map((s: any) => s.sari_session_id).filter(Boolean),
      sariIds: customSession?.sariSessionId ? [customSession.sariSessionId] : sessions.map((s: any) => s.sari_session_id).filter(Boolean),
      freeSlots
    })
  }
  
  // Individual session mode: show ONLY the selected session
  if (isIndividualSessionMode.value && individualSessionNumber.value !== null) {
    return groups.filter(g => g.position === individualSessionNumber.value)
  }
  // Category-level partial mode: filter to sessions at or after partial_start_position
  if (isForcedPartial.value || isPartialMode.value) {
    return groups.filter(g => g.position >= partialStartPosition.value)
  }
  return groups
})

const swapModalTitle = computed(() => {
  if (!swappingSession.value) return ''
  return `${swappingSession.value.label} ändern`
})

// Check which sessions would be affected if we reset the current session
const resetAffectedSessions = computed(() => {
  if (!swappingSession.value) return []
  
  const currentPosition = swappingSession.value.position
  const originalDate = swappingSession.value.date
  
  const affected: number[] = []
  
  // Check previous positions that have custom sessions after our original date
  for (let pos = currentPosition - 1; pos >= 1; pos--) {
    const prevCustom = customSessions.value[pos.toString()]
    if (prevCustom && prevCustom.date > originalDate) {
      affected.push(pos)
    } else {
      break
    }
  }
  
  return affected
})

// Methods
const formatPrice = (rappen: number) => (rappen / 100).toFixed(2)

const formatSwapTime = (startTime: string, endTime: string) => {
  if (!startTime) return ''
  const start = formatTime(startTime)
  const end = endTime ? formatTime(endTime) : ''
  return end ? `${start} - ${end}` : start
}

// Session swap methods
const openSessionSwapModal = async (session: any) => {
  swappingSession.value = session
  showSessionSwapModal.value = true
  isLoadingSwapOptions.value = true
  availableSwapSessions.value = []
  
  try {
    // Get the date of the previous session for chronological validation
    // Use displayDate (which reflects custom session dates) not original date
    const prevSession = sessionGroups.value.find((s: any) => s.position === session.position - 1)
    const afterDate = prevSession?.displayDate || prevSession?.date
    
    // Use displayDate for currentDate as well (the actual current date of this session)
    const currentSessionDate = session.displayDate || session.date
    
    const response = await $fetch('/api/courses/available-sessions', {
      query: {
        tenantId: props.tenantId,
        category: props.course.category,
        sessionPosition: session.position,
        afterDate,
        excludeCourseId: props.course.id,
        courseLocation: props.course.description,
        currentDate: currentSessionDate // Exclude sessions on the same date (custom or original)
      }
    }) as any
    
    if (response.success) {
      // Group sessions by date and course
      const grouped: Map<string, any[]> = new Map()
      
      for (const session of response.sessions) {
        const key = `${session.courseId}-${session.date}`
        if (!grouped.has(key)) {
          grouped.set(key, [])
        }
        grouped.get(key)!.push(session)
      }
      
      // Convert groups to display format
      availableSwapSessions.value = Array.from(grouped.values()).map((sessionGroup: any[]) => {
        // Sort by start time
        const sorted = [...sessionGroup].sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        )
        
        // Combine start/end times
        const firstSession = sorted[0]
        const lastSession = sorted[sorted.length - 1]
        
        return {
          ...firstSession,
          startTime: firstSession.startTime,
          endTime: lastSession.endTime,
          displayTimeRange: `${formatTime(firstSession.startTime)} - ${formatTime(lastSession.endTime)}`,
          // Store ALL session IDs for this group (for grouped sessions)
          sariSessionIds: sorted.map((s: any) => s.sariSessionId),
          isSelected: customSessions.value[session.position.toString()]?.sariSessionIds?.[0] === firstSession.sariSessionId,
          groupSize: sessionGroup.length
        }
      })
    }
  } catch (error) {
    console.error('Error loading swap options:', error)
  } finally {
    isLoadingSwapOptions.value = false
  }
}

const closeSessionSwapModal = () => {
  showSessionSwapModal.value = false
  swappingSession.value = null
  availableSwapSessions.value = []
}

const selectSwapSession = async (option: any) => {
  if (!swappingSession.value) return
  
  const currentPosition = swappingSession.value.position
  const newDate = option.date
  
  // Store all session IDs for this group (for grouped sessions at same time)
  // IMPORTANT: Also store originalSariIds so webhook knows which IDs to replace
  customSessions.value[currentPosition.toString()] = {
    sariSessionIds: option.sariSessionIds || [option.sariSessionId], // Array of all NEW session IDs
    originalSariIds: swappingSession.value.originalSariIds || [], // Array of ORIGINAL session IDs to replace
    sessionId: option.sessionId,
    courseId: option.courseId,
    courseName: option.courseName,
    date: newDate,
    startTime: option.startTime,
    endTime: option.endTime
  }
  
  closeSessionSwapModal()
  
  // Check if subsequent sessions need to be adjusted
  await checkAndFixSessionOrder(currentPosition, newDate)
}

// Check if session order is valid and auto-fix if needed
const checkAndFixSessionOrder = async (changedPosition: number, newDate: string) => {
  // Get all sessions after the changed one
  const allGroups = sessionGroups.value
  const subsequentGroups = allGroups.filter((g: any) => g.position > changedPosition)
  
  for (const group of subsequentGroups) {
    // Get the effective date for this group (custom or original)
    const groupDate = customSessions.value[group.position.toString()]?.date || group.date
    
    // If this session is before or same as the changed session, we need to fix it
    if (groupDate <= newDate) {
      console.log(`⚠️ Session ${group.position} (${groupDate}) is before/same as session ${changedPosition} (${newDate})`)
      
      // Try to auto-find the next available session after the new date
      const nextSession = await findNextAvailableSession(group.position, newDate)
      
      if (nextSession) {
        // Auto-set the next available session
        customSessions.value[group.position.toString()] = {
          sariSessionIds: nextSession.sariSessionIds || [nextSession.sariSessionId],
          originalSariIds: group.originalSariIds || [],
          sessionId: nextSession.sessionId,
          courseId: nextSession.courseId,
          courseName: nextSession.courseName,
          date: nextSession.date,
          startTime: nextSession.startTime,
          endTime: nextSession.endTime
        }
        
        // Show warning toast
        showSessionOrderWarning(`Teil ${group.label} wurde automatisch auf ${formatSessionDate(nextSession.date)} verschoben, da er nach Teil ${changedPosition} absolviert werden muss.`)
        
        // Update newDate for the next iteration
        newDate = nextSession.date
      } else {
        // No session available - reset to original and show warning
        delete customSessions.value[group.position.toString()]
        showSessionOrderWarning(`Teil ${group.label} wurde zurückgesetzt. Bitte wählen Sie ein neues Datum das nach Teil ${changedPosition} liegt.`)
      }
    }
  }
}

// Find next available session after a given date
const findNextAvailableSession = async (position: number, afterDate: string): Promise<any | null> => {
  try {
    const response = await $fetch('/api/courses/available-sessions', {
      query: {
        tenantId: props.tenantId,
        category: props.course.category,
        sessionPosition: position,
        afterDate,
        excludeCourseId: props.course.id,
        courseLocation: props.course.description
      }
    }) as any
    
    if (response.success && response.sessions?.length > 0) {
      // Group by date and return the first (earliest) group
      const grouped: Map<string, any[]> = new Map()
      for (const session of response.sessions) {
        const key = `${session.courseId}-${session.date}`
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(session)
      }
      
      // Get first group sorted by date
      const sortedGroups = Array.from(grouped.values()).sort((a, b) => 
        a[0].date.localeCompare(b[0].date)
      )
      
      if (sortedGroups.length > 0) {
        const firstGroup = sortedGroups[0].sort((a: any, b: any) => 
          a.startTime.localeCompare(b.startTime)
        )
        const first = firstGroup[0]
        const last = firstGroup[firstGroup.length - 1]
        
        return {
          ...first,
          endTime: last.endTime,
          sariSessionIds: firstGroup.map((s: any) => s.sariSessionId)
        }
      }
    }
  } catch (err) {
    console.error('Error finding next session:', err)
  }
  return null
}

// Show warning toast
const showSessionOrderWarning = (message: string) => {
  sessionWarningMessage.value = message
  showSessionWarning.value = true
  
  // Auto-hide after 8 seconds
  if (autoHideWarningTimeout.value) clearTimeout(autoHideWarningTimeout.value)
  autoHideWarningTimeout.value = setTimeout(() => {
    showSessionWarning.value = false
  }, 8000)
}

const resetSessionToOriginal = () => {
  if (!swappingSession.value) return
  
  const currentPosition = swappingSession.value.position
  const originalDate = swappingSession.value.date // Original date from course
  
  // Check if resetting would break chronological order with previous sessions
  // Find all previous positions that have custom sessions with dates AFTER the original date
  const positionsToReset: number[] = []
  
  for (let pos = currentPosition - 1; pos >= 1; pos--) {
    const prevCustom = customSessions.value[pos.toString()]
    if (prevCustom && prevCustom.date > originalDate) {
      // This previous custom session is AFTER our original date - need to reset it too
      positionsToReset.push(pos)
    } else {
      // Found a session that's before our original date - stop checking
      break
    }
  }
  
  // Reset all affected sessions (including current one)
  delete customSessions.value[currentPosition.toString()]
  
  if (positionsToReset.length > 0) {
    for (const pos of positionsToReset) {
      delete customSessions.value[pos.toString()]
    }
    
    // Show warning that other sessions were also reset
    const resetLabels = positionsToReset.map(p => `Teil ${p}`).join(', ')
    showSessionOrderWarning(`${resetLabels} wurde(n) ebenfalls zurückgesetzt, um die chronologische Reihenfolge einzuhalten.`)
  }
  
  closeSessionSwapModal()
}

const formatSessionDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    const formatted = new Intl.DateTimeFormat('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
    // Replace comma and format weekday to 2 chars + dot
    const parts = formatted.split(' ')
    if (parts.length > 0) {
      parts[0] = parts[0].slice(0, 2) + '.'
    }
    return parts.join(' ')
  } catch {
    return dateStr
  }
}

const formatTime = (isoString: string) => {
  try {
    if (!isoString) return ''
    const date = new Date(isoString.replace(' ', 'T'))
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Zurich'
    })
  } catch {
    return ''
  }
}

const lookupSARI = async () => {
  isLoading.value = true
  lookupError.value = null
  
  try {
    const faberidClean = formData.value.faberid.replace(/\./g, '')
    
    // Ensure birthdate is in YYYY-MM-DD format
    let birthdate = formData.value.birthdate
    if (!birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = birthdate.split('.')
      if (parts.length === 3) {
        birthdate = `${parts[2]}-${parts[1]}-${parts[0]}`
      }
    }
    
    const response = await $fetch('/api/sari/lookup-customer', {
      method: 'POST',
      body: {
        faberid: faberidClean,
        birthdate: birthdate,
        tenantId: props.tenantId
      }
    }) as any
    
    if (response.success && response.customer) {
      sariData.value = response.customer
      formData.value.email = response.customer.email || ''
      formData.value.phone = response.customer.phone || ''
      step.value = 'contact'
    } else {
      lookupError.value = response.message || getGermanErrorMessage(response)
    }
  } catch (error: any) {
    logger.error('SARI lookup error:', error)
    lookupError.value = getGermanErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const submitEnrollment = async () => {
  isLoading.value = true
  enrollmentError.value = null
  let willRedirectToPayment = false
  
  try {
    const faberidClean = formData.value.faberid.replace(/\./g, '')
    
    // Ensure birthdate is in YYYY-MM-DD format
    let birthdate = formData.value.birthdate
    if (!birthdate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parts = birthdate.split('.')
      if (parts.length === 3) {
        birthdate = `${parts[2]}-${parts[1]}-${parts[0]}`
      }
    }
    
    const endpoint = paymentMethod.value === 'WALLEE' 
      ? '/api/courses/enroll-wallee'
      : '/api/courses/enroll-cash'
    
    // Build custom sessions object if any sessions were swapped
    const hasCustomSessions = Object.keys(customSessions.value).length > 0
    
    const isPartial = isForcedPartial.value || isPartialMode.value
    const isIndividual = isIndividualSessionMode.value && individualSessionNumber.value !== null

    const marketingSessionId = (typeof window !== 'undefined' && (window as any).__analyticsSessionId) || undefined

    const response = await $fetch(endpoint, {
      method: 'POST',
      body: {
        courseId: props.course.id,
        faberid: isSariCourse.value ? faberidClean : undefined,
        birthdate: isSariCourse.value ? birthdate : formData.value.birthdateNonSari,
        firstName: !isSariCourse.value ? formData.value.firstName.trim() : undefined,
        lastName: !isSariCourse.value ? formData.value.lastName.trim() : undefined,
        street: !isSariCourse.value ? formData.value.street.trim() : undefined,
        streetNr: !isSariCourse.value ? formData.value.streetNr.trim() : undefined,
        zip: !isSariCourse.value ? formData.value.zip.trim() : undefined,
        city: !isSariCourse.value ? formData.value.city.trim() : undefined,
        licenseNumber: !isSariCourse.value ? formData.value.licenseNumber.trim() : undefined,
        tenantId: props.tenantId,
        email: formData.value.email,
        phone: formData.value.phone,
        customSessions: hasCustomSessions ? customSessions.value : null,
        referralCode: getStoredRefCode() ?? undefined,
        discountCode: appliedDiscount.value?.code ?? undefined,
        discountAmountRappen: appliedDiscount.value?.discountAmountRappen ?? 0,
        isPartialEnrollment: (isPartial || isIndividual) || undefined,
        individualSessionNumber: isIndividual ? individualSessionNumber.value : undefined,
        marketingSessionId,
        vehicleId: selectedVehicleId.value || undefined,
      }
    }) as any
    
    if (response.success) {
      if (response.paymentUrl) {
        // Keep loading state active during navigation — do NOT reset isLoading.
        // Small delay gives Wallee time to activate the transaction before the
        // browser hits the payment page (avoids "cannot connect" on first load).
        willRedirectToPayment = true
        await new Promise(resolve => setTimeout(resolve, 800))
        window.location.href = response.paymentUrl
        return
      } else {
        // Paid with credit or cash – registration already confirmed
        emit('enrolled')
      }
    } else {
      enrollmentError.value = getGermanErrorMessage(response)
    }
  } catch (error: any) {
    logger.error('Enrollment error:', error)
    enrollmentError.value = getGermanErrorMessage(error)
  } finally {
    // Don't reset loading state when navigating to Wallee — button stays
    // disabled with spinner until the browser actually leaves the page.
    if (!willRedirectToPayment) {
      isLoading.value = false
    }
  }
}

// Reset on close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    step.value = isSariCourse.value ? 'lookup' : 'contact'
    showSessionCustomizer.value = false
    isIndividualSessionMode.value = props.initialIndividualMode ?? false
    if (isIndividualSessionMode.value) partialConfirmed.value = true
    sessionHasAlternatives.value = {}
    checkSessionAlternatives()
  } else {
    step.value = isSariCourse.value ? 'lookup' : 'contact'
    lookupError.value = null
    enrollmentError.value = null
    sariData.value = null
    agbAccepted.value = false
    customSessions.value = {}
    showSessionCustomizer.value = false
    showSessionSwapModal.value = false
    swappingSession.value = null
    availableSwapSessions.value = []
    formData.value = { faberid: '', birthdate: '', email: '', phone: '', firstName: '', lastName: '', street: '', streetNr: '', zip: '', city: '', licenseNumber: '', birthdateNonSari: '' }
    appliedDiscount.value = null
    isPartialMode.value = false
    isIndividualSessionMode.value = false
    partialConfirmed.value = false
    sessionHasAlternatives.value = {}
  }
})

const getCourseInfoStyle = () => {
  return {
    backgroundColor: getTenantBackgroundColor(),
    borderColor: getTenantPrimaryColor()
  }
}

const getGermanErrorMessage = (error: any): string => {
  // Debug: Log the full error structure
  logger.debug('🔍 Full error object:', {
    keys: Object.keys(error),
    data: error.data,
    statusMessage: error.statusMessage,
    message: error.message,
    status: error.status,
    response: error.response
  })

  // Try multiple error message locations (H3 errors use statusMessage, fetch errors use data)
  const message = error.data?.statusMessage || 
                  error.data?.message || 
                  error.statusMessage || 
                  error.message || 
                  error.data || 
                  ''
  const statusCode = error.data?.statusCode || error.status || error.statusCode
  
  logger.debug('🔍 Extracted error info:', { 
    message: message?.substring(0, 150), 
    statusCode,
    messageLength: message?.length || 0
  })
  
  // ⚠️ IMPORTANT: Log the exact message for debugging
  logger.warn('⚠️ EXACT ERROR MESSAGE FOR MATCHING:', { 
    message, 
    statusCode 
  })
  
  // License errors from SARI - return the exact message if it contains license info
  if (message && (message.includes('Lizenz') || message.includes('Fahrerlaubnis') || message.includes('Category'))) {
    logger.debug('✅ License error detected, returning exact message')
    return message
  }
  if (message.includes('Dieser Kurs ist leider ausgebucht.')) {
    return 'Dieser Kurs ist leider ausgebucht.'
  }
  if (message.includes('Sie sind bereits für diesen Kurs angemeldet.')) {
    return 'Sie sind bereits für diesen Kurs angemeldet.'
  }
  // SARI deadline/capacity errors (most specific first)
  if (message.includes('Anmeldungsfrist abgelaufen') || message.includes('Anmeldefrist') || message.includes('Deadline violated') || message.includes('DEADLINE_VIOLATED')) {
    return 'Anmeldungsfrist abgelaufen. Der Kurs nimmt keine neuen Anmeldungen mehr an.'
  }
  if (message.includes('Der Kurs ist leider voll besetzt') || message.includes('CAPACITY')) {
    return 'Der Kurs ist leider voll besetzt.'
  }
  if (message.includes('Lernfahrausweis nicht gefunden oder ungültig') || message.includes('INVALID_PERSON')) {
    return 'Lernfahrausweis nicht gefunden oder ungültig. Bitte überprüfen Sie Ihre Angaben.'
  }
  if (message.includes('SARI-Anmeldung fehlgeschlagen')) {
    return 'Die Anmeldung über SARI ist fehlgeschlagen. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('Die Lernfahrausweis ID ist ungültig.')) {
    return 'Überprüfen Sie Ihre Angaben. Die Lernfahrausweis ID scheint ungültig zu sein.'
  }
  if (message.includes('SARI validation failed')) {
    return 'Die eingegebenen Daten wurden nicht gefunden. Überprüfen Sie Ihre Angaben.'
  }
  if (message.includes('Ihre Fahrerlaubnis genügt nicht für diesen Kurs.')) {
    return 'Ihre Fahrerlaubnis genügt nicht für diesen Kurs.'
  }
  if (message.includes('Validation failed')) {
    return 'Ihre Eingaben sind ungültig. Bitte überprüfen Sie diese.'
  }
  if (message.includes('Missing required fields')) {
    return 'Es fehlen Pflichtfelder. Bitte füllen Sie alle Felder aus.'
  }
  if (message.includes('invalid input syntax for type uuid')) {
    return 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('SARI enrollment not possible')) {
    return 'Eine Anmeldung über SARI ist derzeit nicht möglich. Bitte kontaktieren Sie uns.'
  }
  if (message.includes('Could not verify course availability')) {
    return 'Die Kursverfügbarkeit konnte nicht überprüft werden. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('Guest user could not be created')) {
    return 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('Failed to create payment session')) {
    return 'Die Zahlung konnte nicht initialisiert werden. Bitte versuchen Sie es später erneut.'
  }
  if (message.includes('Cash-on-site payment is only available for Einsiedeln courses')) {
    return 'Barzahlung vor Ort ist nur für Kurse in Einsiedeln verfügbar. Bitte wählen Sie Online-Zahlung.'
  }
  if (message.includes('Die E-Mail-Adresse ist ungültig.')) {
    return 'Überprüfen Sie Ihre Angaben. Die E-Mail-Adresse ist ungültig.'
  }
  if (message.includes('Die Telefonnummer ist ungültig.')) {
    return 'Überprüfen Sie Ihre Angaben. Die Telefonnummer ist ungültig.'
  }
  
  switch (statusCode) {
    case 400:
      logger.warn('❌ 400 Error, returning generic message. Original message was:', message?.substring(0, 100))
      return 'Überprüfen Sie Ihre Angaben. Diese scheinen ungültig zu sein.'
    case 401:
      return 'Sie sind nicht autorisiert. Bitte melden Sie sich an.'
    case 403:
      logger.warn('❌ 403 Error (Forbidden). Message:', message?.substring(0, 100))
      // For 403, try to return the message if available
      if (message) return message
      return 'Zugriff verweigert. Bitte überprüfen Sie Ihre Angaben.'
    case 404:
      return 'Die angefragten Daten wurden nicht gefunden.'
    case 409:
      return 'Konflikt: Die Aktion konnte nicht ausgeführt werden (z.B. bereits angemeldet).'
    case 500:
      logger.warn('❌ 500 Error. Message:', message?.substring(0, 100))
      return 'Ein interner Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    default:
      logger.warn('❌ Unknown error code:', statusCode, 'Message:', message?.substring(0, 100))
      return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
}

const formatPhoneNumber = () => {
  let phone = formData.value.phone.replace(/\s/g, '').replace(/[^0-9+]/g, '')
  if (phone.startsWith('0041')) {
    phone = '+' + phone.substring(2)
  } else if (phone.startsWith('0')) {
    phone = '+41' + phone.substring(1)
  } else if (!phone.startsWith('+41') && phone.length > 0) {
    phone = '+41' + phone
  }
  formData.value.phone = phone
}
</script>

<style scoped>
/* Toast slide-down animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-100%);
}

.slide-down-enter-to,
.slide-down-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
