<template>
  <div class="bg-white rounded-lg mt-2">

    <!-- Aktuelle Verbindungen -->
    <div v-if="externalCalendars.length > 0" class="mb-3 sm:mb-4">
      <h4 class="text-md font-medium text-gray-800 mb-3">Verbundene Kalender</h4>
      <div class="space-y-3">
        <div 
          v-for="calendar in externalCalendars" 
          :key="calendar.id"
          class="p-3 rounded-lg space-y-3"
          :class="calendarHasError(calendar) ? 'bg-red-50 border border-red-200' : 'bg-gray-50'"
        >
          <!-- Calendar header row -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div class="flex items-center space-x-3 min-w-0 flex-1">
              <div 
                class="w-4 h-4 rounded flex-shrink-0"
                :style="{ backgroundColor: calendar.calendar_color || '#3B82F6' }"
              ></div>
              <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-900 truncate">
                  {{ getProviderName(calendar.provider) }}<span v-if="calendar.calendar_name"> – {{ calendar.calendar_name }}</span>
                </div>
                <div class="text-sm truncate" :class="calendarHasError(calendar) ? 'text-red-700' : 'text-gray-500'">
                  <template v-if="calendarHasError(calendar)">
                    Sync fehlgeschlagen · {{ formatLastSync(calendar.last_sync_at) }}
                  </template>
                  <template v-else>
                    Letzte Synch.: {{ formatLastSync(calendar.last_sync_at) }}
                  </template>
                </div>
              </div>
            </div>
            <div class="flex items-center space-x-2 flex-shrink-0">
              <button
                @click="syncCalendar(calendar.id)"
                :disabled="isSyncing"
                class="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 px-2 py-1"
              >
                {{ isSyncing ? 'Sync...' : 'Sync' }}
              </button>
              <button
                @click="disconnectCalendar(calendar.id)"
                class="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1"
              >
                Trennen
              </button>
            </div>
          </div>

          <div
            v-if="calendarHasError(calendar)"
            class="text-sm text-red-800 bg-white/70 border border-red-200 rounded-md px-3 py-2"
          >
            <p class="font-medium">{{ calendarErrorMessage(calendar) }}</p>
            <p v-if="calendarErrorTip(calendar)" class="mt-1 text-red-700/90 text-xs">
              {{ calendarErrorTip(calendar) }}
            </p>
            <p class="mt-2 text-xs text-red-600">
              Trenne den Kalender und verbinde ihn mit einer neuen ICS-URL, oder tippe auf Sync zum erneuten Versuch.
            </p>
          </div>

          <!-- PLZ config row -->
          <div class="border-t border-gray-200 pt-2">
            <div class="flex items-center gap-2">
              <div class="flex-1">
                <label class="block text-xs font-medium text-gray-500 mb-1">
                  Standard-PLZ für Termine ohne Ort
                  <span class="text-gray-400 font-normal">(z.B. 8048 für Zürich)</span>
                </label>
                <div class="flex gap-2">
                  <input
                    :value="plzDraft[calendar.id] ?? calendar.default_postal_code ?? ''"
                    @input="plzDraft[calendar.id] = ($event.target as HTMLInputElement).value"
                    @keyup.enter="saveDefaultPLZ(calendar.id)"
                    type="text"
                    inputmode="numeric"
                    maxlength="4"
                    placeholder="PLZ"
                    class="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    @click="saveDefaultPLZ(calendar.id)"
                    :disabled="plzSaving[calendar.id]"
                    class="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                  >
                    {{ plzSaving[calendar.id] ? '...' : 'Speichern' }}
                  </button>
                </div>
              </div>
              <div v-if="calendar.default_postal_code" class="flex-shrink-0 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 mt-4">
                ✓ PLZ {{ calendar.default_postal_code }} aktiv
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-1">
              Wenn gesetzt, werden Termine ohne Standortangabe (z.B. "Privat") für die Fahrzeit-Prüfung mit dieser PLZ berücksichtigt.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Neue Verbindung hinzufügen -->
    <div class="border-t pt-3 sm:pt-4">
      <h4 class="text-md font-medium text-gray-800 mb-3">Neuen Kalender verbinden</h4>
      
      <form @submit.prevent="connectCalendar" class="space-y-4">
        <!-- Provider Auswahl -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Kalender-Anbieter
          </label>
          <select
            v-model="newCalendar.provider"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            @change="onProviderChange"
          >
            <option value="">Anbieter wählen</option>
            <option value="google">Google Calendar</option>
            <option value="microsoft">Microsoft Outlook</option>
            <option value="apple">Apple Calendar</option>
            <option value="ics">ICS-URL (Google/Outlook Export)</option>
          </select>
        </div>

        <!-- ICS-URL (für alle Provider) -->
        <div v-if="newCalendar.provider" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ICS-URL <span class="font-normal text-gray-500">(nicht die Adresse aus der Browser-Leiste)</span>
            </label>
            <input
              v-model="newCalendar.ics_url"
              type="url"
              :placeholder="getIcsPlaceholder()"
              class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              :class="urlFieldClass"
              required
              @blur="onIcsUrlBlur"
              @input="onIcsUrlInput"
            />
            <div class="mt-2 text-sm">
              <p v-if="urlCheckStatus === 'checking'" class="text-gray-600">URL wird geprüft…</p>
              <p v-else-if="urlCheckStatus === 'ok'" class="text-green-700">
                ✓ {{ urlCheckMessage }}
              </p>
              <div v-else-if="urlCheckStatus === 'error'" class="text-red-700 space-y-1">
                <p class="font-medium">{{ urlCheckMessage }}</p>
                <p v-if="urlCheckTip" class="text-xs text-red-600">{{ urlCheckTip }}</p>
              </div>
              <p v-else-if="shapeHint" class="text-amber-700 text-xs">{{ shapeHint }}</p>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                class="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                :disabled="!newCalendar.ics_url || urlCheckStatus === 'checking'"
                @click="validateIcsUrl(true)"
              >
                URL prüfen
              </button>
            </div>
          </div>
          
          <!-- Google Anleitung -->
          <div v-if="newCalendar.provider === 'google'" class="bg-blue-50 p-3 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Anleitung Google Calendar:</strong>
              <br>1. Google Calendar im <strong>Browser</strong> öffnen (nicht die App).
              <br>2. Zahnrad → <strong>Einstellungen</strong>.
              <br>3. Links deinen Kalender wählen.
              <br>4. Zu <strong>«Kalender integrieren»</strong> scrollen.
              <br>5. <strong>«Geheime Adresse im iCal-Format»</strong> kopieren.
              <br><span class="text-xs">Die URL enthält <code>/calendar/ical/</code> und endet oft mit <code>basic.ics</code> — nicht die Adresse aus der Browser-Leiste.</span>
            </p>
          </div>
          
          <!-- Microsoft Anleitung -->
          <div v-if="newCalendar.provider === 'microsoft'" class="bg-blue-50 p-3 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Anleitung Microsoft Outlook:</strong>
              <br>1. Outlook im Browser öffnen → Einstellungen → Kalender
              <br>2. «Freigegebene Kalender» → «Kalender veröffentlichen»
              <br>3. Den <strong>ICS-Link</strong> kopieren (nicht den HTML-Link)
            </p>
          </div>
          
          <!-- Apple Anleitung -->
          <div v-if="newCalendar.provider === 'apple'" class="bg-green-50 p-3 rounded-lg">
            <p class="text-sm text-green-800">
              <strong>Anleitung Apple Calendar:</strong>
              <br>1. Kalender-App auf dem iPhone öffnen
              <br>2. Unten auf «Kalender» tippen → Info-Icon (i) beim gewünschten Kalender
              <br>3. «Öffentlicher Kalender» aktivieren
              <br>4. Freigabe-Link kopieren (beginnt oft mit <code>webcal://</code> — das ist OK)
            </p>
          </div>
          
          <!-- ICS Anleitung -->
          <div v-if="newCalendar.provider === 'ics'" class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm text-gray-800">
              <strong>ICS-URL Format:</strong>
              <br>Öffentliche ICS-/iCal-Adresse deines Kalenders (oft mit <code>.ics</code> oder <code>/ical/</code>).
              <br>Nicht die normale Web-Adresse aus der Browser-Leiste verwenden.
            </p>
          </div>
        </div>

        <!-- Kalender Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Kalender Name (optional)
          </label>
          <input
            v-model="newCalendar.calendar_name"
            type="text"
            placeholder="z.B. Privater Kalender"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- Submit Button -->
        <div class="flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            type="submit"
            :disabled="isConnecting || !canConnect || urlCheckStatus === 'error' || urlCheckStatus === 'checking'"
            class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors"
          >
            {{ isConnecting ? connectingLabel : 'Kalender verbinden & synchronisieren' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm text-red-800 break-words">{{ error }}</p>
    </div>
    
    <div v-if="success" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
      <p class="text-sm text-green-800 break-words">{{ success }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { humanizeIcsFetchError, inspectIcsUrlShape, normalizeIcsUrl } from '~/utils/ics-url'


// State
const authStore = useAuthStore()
const externalCalendars = ref<any[]>([])
const isConnecting = ref(false)
const connectingLabel = ref('Verbinde...')
const isSyncing = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const plzDraft = ref<Record<string, string>>({})
const plzSaving = ref<Record<string, boolean>>({})

const newCalendar = ref({
  provider: '',
  calendar_name: '',
  ics_url: ''
})

type UrlCheckStatus = 'idle' | 'checking' | 'ok' | 'error'
const urlCheckStatus = ref<UrlCheckStatus>('idle')
const urlCheckMessage = ref('')
const urlCheckTip = ref('')
const shapeHint = ref('')
let urlCheckTimer: ReturnType<typeof setTimeout> | null = null

// Computed
const canConnect = computed(() => {
  if (!newCalendar.value.provider) return false
  return !!newCalendar.value.ics_url?.trim()
})

const urlFieldClass = computed(() => {
  if (urlCheckStatus.value === 'ok') return 'border-green-500 focus:border-green-500'
  if (urlCheckStatus.value === 'error') return 'border-red-500 focus:border-red-500'
  return 'border-gray-300'
})

const calendarHasError = (calendar: any) => {
  return !!(calendar?.last_fetch_error) || (calendar?.consecutive_failures ?? 0) >= 3
}

const calendarErrorMessage = (calendar: any) => {
  const human = humanizeIcsFetchError(calendar?.last_fetch_error || 'Sync fehlgeschlagen')
  return human.message
}

const calendarErrorTip = (calendar: any) => {
  return humanizeIcsFetchError(calendar?.last_fetch_error || '').tip || ''
}

// Methods
const loadExternalCalendars = async () => {
  try {
    const user = authStore.user // ✅ MIGRATED: Use auth store instead
    if (!user) return

    logger.debug('🔍 Loading external calendars for user:', user.id)

    const response = await $fetch<{ success: boolean; data: any[] }>('/api/staff/external-calendars', {
      method: 'POST',
      body: {
        action: 'load',
        data: {
          authUserId: user.id
        }
      }
    })

    if (response.success) {
      externalCalendars.value = response.data || []
      logger.debug('✅ Loaded calendars:', response.data?.length || 0, response.data)
    }
  } catch (err: any) {
    console.error('Error loading external calendars:', err)
    error.value = 'Fehler beim Laden der Kalender-Verbindungen'
  }
}

const resetUrlCheck = () => {
  urlCheckStatus.value = 'idle'
  urlCheckMessage.value = ''
  urlCheckTip.value = ''
  shapeHint.value = ''
}

const applyLocalShapeCheck = () => {
  const raw = newCalendar.value.ics_url
  if (!raw?.trim()) {
    shapeHint.value = ''
    return true
  }
  const shape = inspectIcsUrlShape(raw)
  if (!shape.ok) {
    urlCheckStatus.value = 'error'
    urlCheckMessage.value = shape.message
    urlCheckTip.value = shape.tip || ''
    shapeHint.value = ''
    newCalendar.value.ics_url = normalizeIcsUrl(raw)
    return false
  }
  newCalendar.value.ics_url = shape.url
  if (urlCheckStatus.value === 'error') {
    // Clear stale error until live check runs
    urlCheckStatus.value = 'idle'
    urlCheckMessage.value = ''
    urlCheckTip.value = ''
  }
  shapeHint.value = 'Sieht nach einer gültigen URL aus — wird beim Verbinden live geprüft.'
  return true
}

const onIcsUrlInput = () => {
  if (urlCheckTimer) clearTimeout(urlCheckTimer)
  urlCheckStatus.value = 'idle'
  urlCheckMessage.value = ''
  urlCheckTip.value = ''
  const raw = newCalendar.value.ics_url
  if (!raw?.trim()) {
    shapeHint.value = ''
    return
  }
  const shape = inspectIcsUrlShape(raw)
  if (!shape.ok) {
    shapeHint.value = shape.message
    return
  }
  shapeHint.value = ''
  urlCheckTimer = setTimeout(() => {
    validateIcsUrl(false)
  }, 800)
}

const onIcsUrlBlur = () => {
  if (!newCalendar.value.ics_url?.trim()) return
  newCalendar.value.ics_url = normalizeIcsUrl(newCalendar.value.ics_url)
  if (!applyLocalShapeCheck()) return
  validateIcsUrl(false)
}

const validateIcsUrl = async (showIdleErrors = true) => {
  const raw = newCalendar.value.ics_url
  if (!raw?.trim()) {
    if (showIdleErrors) {
      urlCheckStatus.value = 'error'
      urlCheckMessage.value = 'Bitte eine ICS-URL einfügen.'
    }
    return false
  }

  if (!applyLocalShapeCheck()) return false

  urlCheckStatus.value = 'checking'
  urlCheckMessage.value = ''
  urlCheckTip.value = ''
  shapeHint.value = ''

  try {
    const response = await $fetch<{
      success: boolean
      ok: boolean
      url?: string
      message?: string
      tip?: string
      vevent_count?: number
    }>('/api/external-calendars/validate-ics', {
      method: 'POST',
      body: { ics_url: newCalendar.value.ics_url }
    })

    if (response.url) {
      newCalendar.value.ics_url = response.url
    }

    if (response.ok) {
      urlCheckStatus.value = 'ok'
      urlCheckMessage.value = response.message || 'Kalender-Feed OK'
      urlCheckTip.value = ''
      return true
    }

    urlCheckStatus.value = 'error'
    urlCheckMessage.value = response.message || 'URL ungültig'
    urlCheckTip.value = response.tip || ''
    return false
  } catch (err: any) {
    urlCheckStatus.value = 'error'
    urlCheckMessage.value = err?.data?.statusMessage || err?.message || 'URL konnte nicht geprüft werden'
    urlCheckTip.value = 'Stelle sicher, dass die URL öffentlich erreichbar ist.'
    return false
  }
}

const connectCalendar = async () => {
  isConnecting.value = true
  connectingLabel.value = 'URL wird geprüft…'
  error.value = null
  success.value = null

  try {
    const user = authStore.user
    if (!user) throw new Error('Nicht authentifiziert')

    const valid = await validateIcsUrl(true)
    if (!valid) {
      error.value = urlCheckTip.value
        ? `${urlCheckMessage.value} ${urlCheckTip.value}`
        : (urlCheckMessage.value || 'ICS-URL ungültig')
      return
    }

    connectingLabel.value = 'Verbinde…'
    const response = await $fetch<{
      success: boolean
      message: string
      calendar_id?: string
    }>('/api/staff/external-calendars', {
      method: 'POST',
      body: {
        action: 'connect',
        data: {
          authUserId: user.id,
          provider: newCalendar.value.provider,
          calendar_name: newCalendar.value.calendar_name,
          ics_url: newCalendar.value.ics_url
        }
      }
    })

    if (!response.success) {
      error.value = response.message || 'Fehler beim Verbinden des Kalenders'
      return
    }

    await loadExternalCalendars()

    const calendarId =
      response.calendar_id ||
      externalCalendars.value.find(c => c.ics_url === newCalendar.value.ics_url)?.id

    if (calendarId) {
      connectingLabel.value = 'Synchronisiere…'
      try {
        const syncResponse = await $fetch<{
          success: boolean
          imported_events?: number
          message?: string
        }>('/api/external-calendars/sync-ics', {
          method: 'POST',
          body: {
            calendar_id: calendarId,
            ics_url: newCalendar.value.ics_url
          }
        })
        if (syncResponse.success) {
          const imported = syncResponse.imported_events || 0
          if (imported === 0) {
            error.value =
              'Kalender verbunden, aber der Feed enthält keine Termine. Vermutlich wurde ein leerer Kalender geteilt — bitte den Kalender mit den echten Terminen teilen und den neuen Link verbinden.'
            success.value = null
          } else {
            success.value = `Kalender verbunden und synchronisiert — ${imported} Termin(e) importiert.`
          }
        } else {
          success.value = null
          error.value =
            (syncResponse as any).tip
              ? `${syncResponse.message || 'Sync fehlgeschlagen'}. ${(syncResponse as any).tip}`
              : (syncResponse.message || 'Verbunden, aber Sync fehlgeschlagen. Bitte Sync erneut versuchen.')
        }
      } catch (syncErr: any) {
        success.value = response.message
        error.value =
          syncErr?.data?.statusMessage ||
          syncErr?.message ||
          'Verbunden, aber Sync fehlgeschlagen. Bitte Sync erneut versuchen.'
      }
      await loadExternalCalendars()
    } else {
      success.value = response.message || 'Kalender erfolgreich verbunden!'
    }

    newCalendar.value = {
      provider: '',
      calendar_name: '',
      ics_url: ''
    }
    resetUrlCheck()
  } catch (err: any) {
    console.error('Error connecting calendar:', err)
    error.value =
      err?.data?.message ||
      err?.data?.statusMessage ||
      err?.message ||
      'Fehler beim Verbinden des Kalenders'
  } finally {
    isConnecting.value = false
    connectingLabel.value = 'Verbinde...'
  }
}

const syncCalendar = async (calendarId: string) => {
  isSyncing.value = true
  error.value = null
  success.value = null

  try {
    logger.debug('🔄 Starting calendar sync for:', calendarId)
    
    const calendar = externalCalendars.value.find(c => c.id === calendarId)
    if (!calendar) {
      throw new Error('Kalender nicht gefunden')
    }

    logger.debug('📅 Calendar found:', calendar.calendar_name, 'ICS URL:', calendar.ics_url ? 'Yes' : 'No')

    if (calendar.ics_url) {
      logger.debug('🌐 Fetching from API: /api/external-calendars/sync-ics')
      
      const response = await $fetch<{ success: boolean, imported_events?: number, message?: string, error?: string }>('/api/external-calendars/sync-ics', {
        method: 'POST',
        body: {
          calendar_id: calendarId,
          ics_url: calendar.ics_url
        }
      })

      logger.debug('📡 API Response:', response)

      if (response.success) {
        const imported = response.imported_events || 0
        if (imported === 0) {
          error.value =
            'Sync ok, aber 0 Termine im Feed. Vermutlich wurde ein leerer Kalender geteilt — bitte den Kalender mit den echten Terminen teilen.'
        } else {
          success.value = `Kalender synchronisiert! ${imported} Termine importiert.`
        }
        await loadExternalCalendars()
      } else {
        const errorMsg = `${response.message}${response.error ? ' - ' + response.error : ''}${(response as any).tip ? ' — ' + (response as any).tip : ''}`
        error.value = errorMsg
        await loadExternalCalendars()
        return
      }
    } else {
      throw new Error('Bitte eine ICS-URL hinterlegen, OAuth-Sync ist noch nicht aktiv')
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.data?.message || err?.message || 'Fehler beim Synchronisieren'
    await loadExternalCalendars()
  } finally {
    isSyncing.value = false
    logger.debug('🏁 Sync process completed')
  }
}

const disconnectCalendar = async (calendarId: string) => {
  if (!confirm('Möchten Sie diese Kalender-Verbindung wirklich trennen?')) return

  try {
    const response = await $fetch<{ success: boolean; message: string }>('/api/staff/external-calendars', {
      method: 'POST',
      body: {
        action: 'disconnect',
        data: {
          calendarId
        }
      }
    })

    if (response.success) {
      success.value = response.message || 'Kalender-Verbindung getrennt!'
      await loadExternalCalendars()
    }
  } catch (err: any) {
    error.value = 'Fehler beim Trennen der Verbindung'
  }
}

const saveDefaultPLZ = async (calendarId: string) => {
  const plz = (plzDraft.value[calendarId] ?? '').trim()
  plzSaving.value[calendarId] = true
  error.value = null
  success.value = null

  try {
    const response = await $fetch<{ success: boolean; message: string }>('/api/staff/external-calendars', {
      method: 'POST',
      body: {
        action: 'update-default-plz',
        data: { calendarId, defaultPostalCode: plz || null }
      }
    })

    if (response.success) {
      success.value = response.message
      delete plzDraft.value[calendarId]
      await loadExternalCalendars()
      setTimeout(() => { success.value = null }, 3000)
    }
  } catch (err: any) {
    error.value = err.message || 'Fehler beim Speichern der PLZ'
  } finally {
    plzSaving.value[calendarId] = false
  }
}

const onProviderChange = () => {
  newCalendar.value.ics_url = ''
  newCalendar.value.calendar_name = ''
  resetUrlCheck()
}

const getProviderName = (provider: string) => {
  const names = {
    google: 'Google Calendar',
    microsoft: 'Microsoft Outlook',
    apple: 'Apple Calendar',
    ics: 'ICS-URL'
  }
  return names[provider as keyof typeof names] || provider
}

const formatLastSync = (lastSync: string | null) => {
  if (!lastSync) return 'Nie synchronisiert'
  return new Date(lastSync).toLocaleString('de-DE')
}

const getIcsPlaceholder = () => {
  const placeholders = {
    google: 'https://calendar.google.com/calendar/ical/.../basic.ics',
    microsoft: 'https://outlook.office365.com/owa/calendar/.../calendar.ics',
    apple: 'webcal://p01-caldav.icloud.com/published/...',
    ics: 'https://example.com/calendar.ics'
  }
  return placeholders[newCalendar.value.provider as keyof typeof placeholders] || 'https://...'
}

// Lifecycle
onMounted(() => {
  loadExternalCalendars()
})
</script>
