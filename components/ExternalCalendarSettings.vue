<template>
  <div class="bg-white rounded-lg mt-2">

    <!-- Aktuelle Verbindungen -->
    <div v-if="externalCalendars.length > 0" class="mb-3 sm:mb-4">
      <h4 class="text-md font-medium text-gray-800 mb-3">Verbundene Kalender</h4>
      <div class="space-y-3">
        <div 
          v-for="calendar in externalCalendars" 
          :key="calendar.id"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg space-y-3 sm:space-y-0"
        >
          <div class="flex items-center space-x-3 min-w-0 flex-1">
            <div 
              class="w-4 h-4 rounded flex-shrink-0"
              :style="{ backgroundColor: calendar.calendar_color || '#3B82F6' }"
            ></div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-gray-900 truncate">
                {{ getProviderName(calendar.provider) }} - {{ calendar.calendar_name || calendar.account_identifier }}
              </div>
              <div class="text-sm text-gray-500 truncate">
                Letzte Synch.: {{ formatLastSync(calendar.last_sync_at) }}
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

        <!-- Account Identifier (für alle außer ICS) -->
        <div v-if="newCalendar.provider && newCalendar.provider !== 'ics'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ newCalendar.provider === 'google' ? 'Google Account Email' : 
                 newCalendar.provider === 'microsoft' ? 'Microsoft Account Email' : 
                 'Apple ID Email' }}
            </label>
            <input
              v-model="newCalendar.account_identifier"
              type="email"
              :placeholder="newCalendar.provider === 'google' ? 'ihre.email@gmail.com' : 
                            newCalendar.provider === 'microsoft' ? 'ihre.email@outlook.com' : 
                            'ihre.email@icloud.com'"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <!-- ICS-URL (für alle Provider) -->
        <div v-if="newCalendar.provider" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ICS-URL
            </label>
            <input
              v-model="newCalendar.ics_url"
              type="url"
              :placeholder="getIcsPlaceholder()"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <!-- Google Anleitung -->
          <div v-if="newCalendar.provider === 'google'" class="bg-blue-50 p-3 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Anleitung Google Calendar:</strong>
              <br>1. Öffnen Sie Google Calendar im Browser.
              <br>2. Gehen Sie zu den Einstellungen.
              <br>3. Wählen Sie Ihren Kalender aus.
              <br>4. Scrollen Sie zu "Kalender integrieren".
              <br>5. Kopieren Sie die "Öffentliche Adresse im iCal-Format".
            </p>
          </div>
          
          <!-- Microsoft Anleitung -->
          <div v-if="newCalendar.provider === 'microsoft'" class="bg-blue-50 p-3 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Anleitung Microsoft Outlook:</strong>
              <br>1. Öffnen Sie Outlook Calendar
              <br>2. Klicken Sie auf "Freigeben"
              <br>3. Wählen Sie "Kalender veröffentlichen"
              <br>4. Wählen Sie den gewünschten Kalender
              <br>5. Kopieren Sie die angezeigte ICS-URL
            </p>
          </div>
          
          <!-- Apple Anleitung -->
          <div v-if="newCalendar.provider === 'apple'" class="bg-green-50 p-3 rounded-lg">
            <p class="text-sm text-green-800">
              <strong>Anleitung Apple Calendar:</strong>
              <br>1. Öffne den Kalender auf deinem iPhone.
              <br>2. Drücke auf Kalender unten in der Mitte.
              <br>3. Klicke auf das i von dem Kalender, welchen du teilen möchtest.
              <br>4. Aktiviere ganz unten "Öffentlicher Kalender".
              <br>5. Kopiere den Link von diesem Kalender und füge ihn im Simy App ein.
            </p>
          </div>
          
          <!-- ICS Anleitung -->
          <div v-if="newCalendar.provider === 'ics'" class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm text-gray-800">
              <strong>ICS-URL Format:</strong>
              <br>Geben Sie eine öffentliche ICS-URL ein, die Ihren Kalender im iCalendar-Format (.ics) bereitstellt.
              <br>Die URL muss öffentlich zugänglich sein.
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
            :disabled="isConnecting || !canConnect"
            class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors"
          >
            {{ isConnecting ? 'Verbinde...' : 'Kalender verbinden' }}
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
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

// State
const externalCalendars = ref<any[]>([])
const isConnecting = ref(false)
const isSyncing = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const newCalendar = ref({
  provider: '',
  account_identifier: '',
  calendar_name: '',
  ics_url: ''
})

// Computed
const canConnect = computed(() => {
  if (!newCalendar.value.provider) return false
  // Für unseren aktuellen Sync-Flow ist eine ICS-URL erforderlich
  return !!newCalendar.value.ics_url
})

// Methods
const loadExternalCalendars = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get internal user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData?.id) {
      console.error('Error loading user data:', userError)
      return
    }

    console.log('🔍 Loading calendars for staff_id:', userData.id)

    const { data: calendars, error } = await supabase
      .from('external_calendars')
      .select('*')
      .eq('staff_id', userData.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error loading calendars:', error)
      throw error
    }
    
    externalCalendars.value = calendars || []
    console.log('✅ Loaded calendars:', calendars?.length || 0, calendars)
  } catch (err: any) {
    console.error('Error loading external calendars:', err)
    error.value = 'Fehler beim Laden der Kalender-Verbindungen'
  }
}

const connectCalendar = async () => {
  isConnecting.value = true
  error.value = null
  success.value = null

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht authentifiziert')

    // Get user's tenant_id and internal users.id (staff id)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData?.tenant_id || !userData?.id) {
      throw new Error('Benutzer-Tenant nicht gefunden')
    }

    const calendarData = {
      tenant_id: userData.tenant_id,
      staff_id: userData.id, // use internal users.id, not auth user id
      provider: newCalendar.value.provider,
      account_identifier: newCalendar.value.account_identifier,
      calendar_name: newCalendar.value.calendar_name,
      connection_type: newCalendar.value.provider === 'ics' ? 'ics_url' : 'oauth',
      ics_url: newCalendar.value.ics_url,
      sync_enabled: true
    }

    // Upsert: bei Duplikat aktualisieren statt Fehler
    const { error: upsertError } = await supabase
      .from('external_calendars')
      .upsert(calendarData, {
        onConflict: 'tenant_id,staff_id,provider,account_identifier'
      })

    if (upsertError) throw upsertError

    success.value = 'Kalender erfolgreich verbunden!'
    await loadExternalCalendars()
    
    // Reset form
    newCalendar.value = {
      provider: '',
      account_identifier: '',
      calendar_name: '',
      ics_url: ''
    }

  } catch (err: any) {
    console.error('Error connecting calendar:', err)
    error.value = err.message || 'Fehler beim Verbinden des Kalenders'
  } finally {
    isConnecting.value = false
  }
}

const syncCalendar = async (calendarId: string) => {
  isSyncing.value = true
  error.value = null
  success.value = null

  try {
    const calendar = externalCalendars.value.find(c => c.id === calendarId)
    if (!calendar) throw new Error('Kalender nicht gefunden')

    // Fallback: Wenn eine ICS-URL vorhanden ist, immer darüber synchronisieren
    if (calendar.ics_url) {
      // Sync ICS calendar
      const response = await $fetch<{ success: boolean, imported_events?: number, message?: string, error?: string }>('/api/external-calendars/sync-ics', {
        method: 'POST',
        body: {
          calendar_id: calendarId,
          ics_url: calendar.ics_url
        }
      })

      if (response.success) {
        success.value = `Kalender synchronisiert! ${response.imported_events} Termine importiert.`
        await loadExternalCalendars()
      } else {
        // Zeige detaillierten Fehler vom Server an
        error.value = `${response.message}${response.error ? ' - ' + response.error : ''}`
        return
      }
    } else {
      // TODO: Optional: OAuth-Flow implementieren
      throw new Error('Bitte eine ICS-URL hinterlegen, OAuth-Sync ist noch nicht aktiv')
    }
  } catch (err: any) {
    console.error('Sync error:', err)
    error.value = (err?.data?.message || err?.message || 'Fehler beim Synchronisieren')
  } finally {
    isSyncing.value = false
  }
}

const disconnectCalendar = async (calendarId: string) => {
  if (!confirm('Möchten Sie diese Kalender-Verbindung wirklich trennen?')) return

  try {
    const { error } = await supabase
      .from('external_calendars')
      .delete()
      .eq('id', calendarId)

    if (error) throw error

    success.value = 'Kalender-Verbindung getrennt!'
    await loadExternalCalendars()
  } catch (err: any) {
    error.value = 'Fehler beim Trennen der Verbindung'
  }
}

const onProviderChange = () => {
  // Reset form when provider changes
  newCalendar.value.account_identifier = ''
  newCalendar.value.ics_url = ''
  newCalendar.value.calendar_name = ''
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
    google: 'https://calendar.google.com/calendar/ical/...',
    microsoft: 'https://outlook.office365.com/owa/calendar/...',
    apple: 'webcal://p01-caldav.icloud.com/...',
    ics: 'https://example.com/calendar.ics'
  }
  return placeholders[newCalendar.value.provider as keyof typeof placeholders] || 'https://...'
}

// Lifecycle
onMounted(() => {
  loadExternalCalendars()
})
</script>
