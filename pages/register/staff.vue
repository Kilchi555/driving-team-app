<template>
  <div class="min-h-[100svh] bg-gray-50 flex items-center justify-center py-8 px-4">
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
            :class="i <= currentStep ? 'bg-purple-600' : 'bg-gray-200'"
          ></div>
        </div>
        <div class="flex justify-between mt-1">
          <span class="text-xs text-gray-400">Schritt {{ currentStep + 1 }} / {{ VISIBLE_STEPS.length }}</span>
          <span class="text-xs text-purple-600 font-medium">{{ VISIBLE_STEPS[currentStep]?.label }}</span>
        </div>
      </div>

      <!-- Card -->
      <div class="bg-white rounded-xl shadow-md overflow-hidden">

        <!-- ── Loading ── -->
        <div v-if="currentStep === STEP_LOADING" class="p-12 text-center">
          <div class="animate-spin rounded-full h-14 w-14 border-b-2 border-purple-600 mx-auto mb-4"></div>
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
          <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
            <p class="text-sm font-semibold text-purple-800 mb-2">📅 Kalender-Abo-Link</p>
            <p class="text-xs text-purple-600 mb-2">Diesen Link in Apple/Google/Outlook als Kalenderabo eintragen, um Termine automatisch zu synchronisieren:</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 bg-white border border-purple-200 rounded px-2 py-1 text-xs break-all">{{ icsUrl }}</code>
              <button type="button" @click="copyIcsUrl"
                class="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 flex-shrink-0">
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

          <button @click="goToDashboard"
            class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors">
            🚀 Zum Dashboard
          </button>
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
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p class="text-sm text-gray-500">Einladung wird geladen…</p>
        </div>

        <!-- ── Form steps ── -->
        <form v-else @submit.prevent class="p-6 space-y-5">

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
                <input v-model="form.firstName" type="text" required class="input" placeholder="Max">
              </div>
              <div>
                <label class="label">Nachname *</label>
                <input v-model="form.lastName" type="text" required class="input" placeholder="Mustermann">
              </div>
              <div class="col-span-2">
                <label class="label">E-Mail *</label>
                <input v-model="form.email" type="email" required class="input" placeholder="max@example.com">
              </div>
              <div>
                <label class="label">Telefon</label>
                <input v-model="form.phone" type="tel" class="input" placeholder="+41 79 123 45 67">
              </div>
              <div>
                <label class="label">Geburtsdatum</label>
                <input v-model="form.birthdate" type="date" class="input">
              </div>
              <div>
                <label class="label">Sprache</label>
                <select v-model="form.language" class="input">
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="it">Italiano</option>
                </select>
              </div>
              <div></div>
              <div class="col-span-2 border-t pt-3">
                <p class="text-xs text-gray-500 font-medium mb-2">Adresse</p>
              </div>
              <div>
                <label class="label">Strasse</label>
                <input v-model="form.street" type="text" class="input" placeholder="Musterstrasse">
              </div>
              <div>
                <label class="label">Nr.</label>
                <input v-model="form.streetNr" type="text" class="input" placeholder="12">
              </div>
              <div>
                <label class="label">PLZ</label>
                <input v-model="form.zip" type="text" pattern="[0-9]{4}" class="input" placeholder="8000">
              </div>
              <div>
                <label class="label">Ort</label>
                <input v-model="form.city" type="text" class="input" placeholder="Zürich">
              </div>
            </div>
          </template>

          <!-- ═══ STEP 1: Profil ═══ -->
          <template v-if="currentStep === 1">
            <h2 class="text-lg font-semibold text-gray-900">Fahrlehrer-Profil</h2>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Führerausweis Nr.</label>
                <input v-model="form.lernfahrausweis_nr" type="text" class="input" placeholder="z.B. 1234567">
              </div>
              <div>
                <label class="label">Fahrlehrer seit (Jahr)</label>
                <input v-model="form.instructor_since_year" type="number" min="1960" :max="new Date().getFullYear()" class="input" placeholder="2015">
              </div>
            </div>

            <!-- Kategorien -->
            <div v-if="availableCategories.length">
              <label class="label mb-2">Unterrichtete Kategorien</label>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="cat in availableCategories"
                  :key="cat.code"
                  class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all text-sm"
                  :class="form.selectedCategories.includes(cat.code)
                    ? 'border-purple-500 bg-purple-50 text-purple-800'
                    : 'border-gray-200 hover:border-gray-300'"
                >
                  <input type="checkbox" :value="cat.code" v-model="form.selectedCategories" class="accent-purple-600">
                  <span class="font-medium">{{ cat.code }}</span>
                  <span class="text-gray-400 text-xs truncate">{{ cat.name }}</span>
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
                :class="form.workingDays[day.value]?.active ? 'border-purple-300 bg-purple-50' : 'border-gray-200'"
              >
                <label class="flex items-center gap-2 w-16 cursor-pointer">
                  <input type="checkbox" v-model="form.workingDays[day.value].active" class="accent-purple-600">
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
              <div v-if="tenantLocations.length" class="space-y-2">
                <label
                  v-for="loc in tenantLocations"
                  :key="loc.id"
                  class="flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-all"
                  :class="form.selectedLocationIds.includes(loc.id)
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'"
                >
                  <input type="checkbox" :value="loc.id" v-model="form.selectedLocationIds" class="accent-purple-600 mt-0.5">
                  <div>
                    <div class="text-sm font-medium">{{ loc.name }}</div>
                    <div class="text-xs text-gray-500">{{ loc.address }}</div>
                  </div>
                </label>
              </div>
              <p v-else class="text-sm text-gray-400 italic">Noch keine Treffpunkte erfasst. Du kannst sie später in den Einstellungen hinzufügen.</p>
            </div>

            <!-- Prüfungsorte -->
            <div class="border-t pt-4">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Prüfungsorte</h3>
              <div v-if="tenantExamLocations.length" class="space-y-2">
                <label
                  v-for="loc in tenantExamLocations"
                  :key="loc.id"
                  class="flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-all"
                  :class="form.selectedExamLocationIds.includes(loc.id)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'"
                >
                  <input type="checkbox" :value="loc.id" v-model="form.selectedExamLocationIds" class="accent-blue-600 mt-0.5">
                  <div>
                    <div class="text-sm font-medium">{{ loc.name }}</div>
                    <div class="text-xs text-gray-500">{{ loc.address }}</div>
                  </div>
                </label>
              </div>
              <p v-else class="text-sm text-gray-400 italic">Noch keine Prüfungsorte erfasst.</p>
            </div>
          </template>

          <!-- ═══ STEP 4: Kalender ═══ -->
          <template v-if="currentStep === 4">
            <h2 class="text-lg font-semibold text-gray-900">Kalender-Verbindung</h2>

            <!-- Externen Kalender einbinden -->
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-1">Externen Kalender verbinden (optional)</h3>
              <p class="text-xs text-gray-500 mb-3">Trage die ICS-URL deines privaten Kalenders ein, damit Termine aus Apple/Google/Outlook als Sperrzeiten erscheinen.</p>
              <div class="space-y-3">
                <label v-for="provider in calendarProviders" :key="provider.id"
                  class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all"
                  :class="form.externalCalendarProvider === provider.id ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-gray-300'"
                >
                  <input type="radio" :value="provider.id" v-model="form.externalCalendarProvider" class="accent-purple-600">
                  <span class="text-xl">{{ provider.icon }}</span>
                  <span class="text-sm font-medium">{{ provider.label }}</span>
                </label>
              </div>
              <div v-if="form.externalCalendarProvider" class="mt-3">
                <label class="label">ICS-URL *</label>
                <input v-model="form.externalCalendarUrl" type="url" class="input"
                  placeholder="https://calendar.google.com/calendar/ical/....ics">
                <p class="text-xs text-gray-400 mt-1">
                  <template v-if="form.externalCalendarProvider === 'apple'">In Apple Kalender: Ablage → Kalender exportieren / oder via iCloud.com &gt; Kalender &gt; Freigabe → Link kopieren</template>
                  <template v-else-if="form.externalCalendarProvider === 'google'">In Google Calendar: Einstellungen → Kalender → Kalenderintegration → Geheime Adresse im iCal-Format</template>
                  <template v-else-if="form.externalCalendarProvider === 'outlook'">In Outlook.com: Einstellungen → Kalender → Freigegebene Kalender → Abonnieren</template>
                  <template v-else>Öffentliche oder private ICS-URL deines Kalenders</template>
                </p>
              </div>
            </div>

            <!-- Eigener Kalender-Link (Vorschau) -->
            <div class="bg-gray-50 border rounded-lg p-4 mt-2">
              <p class="text-sm font-semibold text-gray-700 mb-1">📅 Dein persönlicher Kalender-Link</p>
              <p class="text-xs text-gray-500">Nach der Registrierung erhältst du einen ICS-Link, den du in deinem Handy-Kalender als Abo eintragen kannst. So siehst du alle Fahrstunden in deiner eigenen Kalender-App.</p>
              <p class="text-xs text-purple-600 mt-2 font-medium">→ Wird auf der Bestätigungsseite angezeigt</p>
            </div>
          </template>

          <!-- ═══ STEP 5: Dokumente ═══ -->
          <template v-if="currentStep === 5">
            <h2 class="text-lg font-semibold text-gray-900">Dokumente <span class="text-sm text-gray-400 font-normal">(optional)</span></h2>
            <p class="text-sm text-gray-500">Lade deinen Führerausweis hoch. Du kannst das auch später in den Einstellungen nachholen.</p>

            <!-- Vorderseite -->
            <div>
              <label class="label">Führerausweis Vorderseite</label>
              <div
                class="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-purple-400 transition-colors"
                :class="isDraggingFront ? 'border-purple-400 bg-purple-50' : 'border-gray-300'"
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
                class="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-purple-400 transition-colors"
                :class="isDraggingBack ? 'border-purple-400 bg-purple-50' : 'border-gray-300'"
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
              <input v-model="form.password" type="password" required class="input" placeholder="Mindestens 12 Zeichen" autocomplete="new-password" name="new-password">
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
              <input v-model="form.confirmPassword" type="password" required class="input" placeholder="Passwort wiederholen" autocomplete="new-password" name="confirm-password">
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
                <input type="checkbox" v-model="form.acceptedTerms" required class="mt-0.5 accent-purple-600">
                <span class="text-sm text-gray-700">
                  Ich akzeptiere die
                  <a href="#" class="text-purple-600 hover:underline">Nutzungsbedingungen</a>
                  und die
                  <a href="#" class="text-purple-600 hover:underline">Datenschutzerklärung</a>.
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
              <!-- Skip button for optional steps -->
              <button
                v-if="isOptionalStep"
                type="button"
                @click="currentStep++"
                class="px-5 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >Überspringen</button>

              <!-- Next / Submit -->
              <button
                v-if="currentStep < STEP_LOADING - 1"
                type="button"
                @click="nextStep"
                :disabled="!canProceed"
                class="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors font-medium"
              >{{ currentStep === 6 ? 'Registrierung abschliessen' : 'Weiter →' }}</button>
            </div>
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

const route     = useRoute()
const router    = useRouter()
const authStore = useAuthStore()

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
const tenantName         = ref('')
const tenantSlugRef      = ref('')
const availableCategories = ref<any[]>([])
const tenantLocations    = ref<any[]>([])
const tenantExamLocations = ref<any[]>([])
const affiliateEnabled   = ref(false)
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
  language: 'de', street: '', streetNr: '', zip: '', city: '',
  // Step 1
  lernfahrausweis_nr: '', instructor_since_year: '', selectedCategories: [] as string[],
  // Step 2
  workingDays: defaultWorkingDays() as Record<number, { active: boolean; start: string; end: string }>,
  // Step 3
  selectedLocationIds: [] as string[],
  selectedExamLocationIds: [] as string[],
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

const passwordIsValid = computed(() =>
  form.password.length >= 12 &&
  zxcvbnScore.value !== null && zxcvbnScore.value >= 2 &&
  hibpStatus.value !== 'pwned' && hibpStatus.value !== 'checking'
)

const isOptionalStep = computed(() => [2, 3, 4, 5].includes(currentStep.value))

const canProceed = computed(() => {
  if (currentStep.value === 0) {
    return !!(form.firstName && form.lastName && form.email)
  }
  if (currentStep.value === 6) {
    return passwordIsValid.value &&
           form.password === form.confirmPassword &&
           form.acceptedTerms
  }
  return true
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
    form.email     = inv.email      || ''
    form.phone     = inv.phone      || ''

    tenantName.value          = response.tenant?.name || ''
    tenantSlugRef.value       = response.tenant?.slug || ''
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
          if (tpl.start_time) form.workingDays[+d].start = tpl.start_time
          if (tpl.end_time)   form.workingDays[+d].end   = tpl.end_time
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

// ─── Submit ──────────────────────────────────────────────────────────────────
const submit = async () => {
  if (!canProceed.value) return
  registrationError.value = ''
  currentStep.value = STEP_LOADING

  try {
    // Build working hours array from selected days
    const workingHours = Object.entries(form.workingDays)
      .filter(([, v]) => v.active)
      .map(([day, v]) => ({ day_of_week: +day, start_time: v.start + ':00', end_time: v.end + ':00' }))

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
        lernfahrausweis_nr:    form.lernfahrausweis_nr,
        instructor_since_year: form.instructor_since_year,
        language:              form.language,
        acceptedTerms:         form.acceptedTerms,
        workingHours,
        selectedLocationIds:      form.selectedLocationIds,
        selectedExamLocationIds:  form.selectedExamLocationIds,
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

    // Generate ICS URL after login
    if (loginOk) {
      try {
        const tokenRes = await $fetch<any>('/api/calendar/generate-token', { method: 'POST' })
        icsUrl.value = tokenRes?.calendarLink || tokenRes?.url || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ics?staff_id=${userId}`
      } catch {
        icsUrl.value = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/ics?staff_id=${userId}`
      }
    }

    // Connect external calendar after login
    if (loginOk && form.externalCalendarProvider && form.externalCalendarUrl) {
      try {
        await $fetch('/api/staff/external-calendars', {
          method: 'POST',
          body: {
            action: 'connect',
            provider: form.externalCalendarProvider,
            ics_url: form.externalCalendarUrl,
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
const goToDashboard = () => router.push('/dashboard')

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
.input  { @apply w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500; }
.input-sm { @apply px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-400; }
</style>
