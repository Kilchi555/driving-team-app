<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      @click.self="$emit('close')">
      <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md sm:m-0 max-h-[95dvh] overflow-y-auto">

        <!-- Header -->
        <div class="flex items-center justify-between p-5 pb-3">
          <div>
            <h3 class="text-base font-bold text-gray-900">
              {{ editingBooking ? 'Reservierung' : (resourceType === 'room' ? 'Raum reservieren' : 'Fahrzeug blockieren') }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ resourceName }}</p>
          </div>
          <button @click="$emit('close')" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- View-only for lesson/course bookings -->
        <div v-if="editingBooking && isReadonlyBooking" class="px-5 pb-5 space-y-4">

          <!-- Student / Instructor (lesson bookings) -->
          <div v-if="editingBooking.appointment" class="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              :style="{ background: primaryColor }">
              {{ (editingBooking.appointment.student?.first_name || '?').charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">
                {{ editingBooking.appointment.student?.first_name }} {{ editingBooking.appointment.student?.last_name }}
              </p>
              <p class="text-xs text-gray-500 truncate">
                {{ editingBooking.appointment.student?.phone || editingBooking.appointment.student?.email || 'Keine Kontaktdaten' }}
              </p>
            </div>
            <span v-if="editingBooking.appointment.type" class="text-xs font-medium px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-700 flex-shrink-0">
              {{ editingBooking.appointment.type }}
            </span>
          </div>

          <!-- Course (course bookings) -->
          <div v-else-if="editingBooking.course" class="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0" :style="{ background: primaryColor }">
              🎓
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">{{ editingBooking.course.name }}</p>
              <p v-if="editingBooking.course.city" class="text-xs text-gray-500 truncate">{{ editingBooking.course.city }}</p>
            </div>
          </div>

          <div class="bg-gray-50 rounded-xl p-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Typ</span>
              <span class="font-medium">{{ purposeLabelOf(editingBooking.purpose) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Von</span>
              <span class="font-medium">{{ formatDT(editingBooking.start_time) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Bis</span>
              <span class="font-medium">{{ formatDT(editingBooking.end_time) }}</span>
            </div>
            <div v-if="editingBooking.appointment?.instructor" class="flex justify-between text-sm">
              <span class="text-gray-500">Fahrlehrer</span>
              <span class="font-medium">{{ editingBooking.appointment.instructor.first_name }} {{ editingBooking.appointment.instructor.last_name }}</span>
            </div>
            <div v-if="bookingLocationLabel" class="flex justify-between text-sm gap-3">
              <span class="text-gray-500 flex-shrink-0">Ort</span>
              <span class="font-medium text-right">{{ bookingLocationLabel }}</span>
            </div>
            <div v-if="editingBooking.cost_rappen" class="flex justify-between text-sm">
              <span class="text-gray-500">Kosten Fahrzeug</span>
              <span class="font-medium">CHF {{ (editingBooking.cost_rappen / 100).toFixed(2) }}</span>
            </div>
            <div v-if="editingBooking.booked_by_user" class="flex justify-between text-sm">
              <span class="text-gray-500">Erstellt von</span>
              <span class="font-medium">{{ editingBooking.booked_by_user.first_name }} {{ editingBooking.booked_by_user.last_name }}</span>
            </div>
            <div v-if="editingBooking.notes" class="pt-1 border-t border-gray-200">
              <span class="text-gray-500 text-xs">Notizen</span>
              <p class="font-medium text-sm mt-0.5">{{ editingBooking.notes }}</p>
            </div>
          </div>
          <p class="text-xs text-gray-400 text-center">Diese Buchung ist mit einem Termin oder Kurs verknüpft und kann nur dort bearbeitet werden.</p>
          <button @click="$emit('close')" class="w-full py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Schliessen</button>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submit" class="px-5 pb-5 space-y-4">

          <!-- Date & Time -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Von *</label>
              <input v-model="form.start_time" type="datetime-local" required
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Bis *</label>
              <input v-model="form.end_time" type="datetime-local" required
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <!-- Type: intern / extern -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-2">Art der Reservierung *</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" @click="form.isExternal = false"
                class="py-2.5 text-sm font-medium rounded-xl border-2 transition-all"
                :class="!form.isExternal ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'">
                🏠 Intern
              </button>
              <button type="button" @click="form.isExternal = true"
                class="py-2.5 text-sm font-medium rounded-xl border-2 transition-all"
                :class="form.isExternal ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600'">
                🌐 Extern
              </button>
            </div>
          </div>

          <!-- Purpose (only for internal) -->
          <div v-if="!form.isExternal">
            <label class="block text-xs font-medium text-gray-700 mb-2">Zweck *</label>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="p in internalPurposes" :key="p.value" type="button"
                @click="form.purpose = p.value"
                class="py-2 text-sm rounded-xl border-2 transition-all"
                :class="form.purpose === p.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 bg-white text-gray-600'">
                {{ p.label }}
              </button>
              <button type="button"
                @click="form.purpose = 'custom'"
                class="py-2 text-sm rounded-xl border-2 transition-all col-span-2"
                :class="form.purpose === 'custom' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 bg-white text-gray-600'">
                ✏️ Eigener Zweck
              </button>
            </div>
            <input v-if="form.purpose === 'custom'" v-model="form.customPurposeLabel" type="text"
              required maxlength="60" placeholder="z.B. Fotoshooting, Probefahrt Kunde XY…"
              class="mt-2 w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          <!-- Internal: booked by (staff selector) -->
          <div v-if="!form.isExternal">
            <label class="block text-xs font-medium text-gray-700 mb-1">Reserviert für (optional)</label>
            <select v-model="form.booked_by_user_id"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">— Ich selbst —</option>
              <option v-for="u in staffUsers" :key="u.id" :value="u.id">
                {{ u.first_name }} {{ u.last_name }}
              </option>
            </select>
          </div>

          <!-- External: contact info -->
          <template v-if="form.isExternal">

            <!-- State A: Contact selected from search -->
            <div v-if="selectedContactLabel"
              class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                :style="{ background: primaryColor }">
                {{ form.external_contact_name.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ form.external_contact_name }}</p>
                <p class="text-xs text-gray-500">{{ form.external_contact_email }}</p>
              </div>
              <button type="button" @click="clearContact"
                class="p-1.5 rounded-lg hover:bg-green-100 text-green-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- State B: Search + manual toggle -->
            <template v-else>
              <!-- Search field -->
              <div class="relative">
                <input v-model="contactSearch" type="search"
                  placeholder="🔍  Kunde oder Firma suchen…"
                  @input="searchContacts"
                  class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <!-- Results dropdown -->
                <div v-if="contactResults.length > 0"
                  class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  <button v-for="r in contactResults" :key="r.id + r.type" type="button"
                    @click="applyContact(r)"
                    class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0">
                    <span class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      :style="{ background: r.type === 'company' ? '#f97316' : primaryColor }">
                      <template v-if="r.type === 'company'">🏢</template>
                      <template v-else-if="r.name">{{ r.name.charAt(0).toUpperCase() }}</template>
                      <template v-else>
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                      </template>
                    </span>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 truncate">{{ r.name }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ r.subtitle }}</p>
                    </div>
                    <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                      :class="r.type === 'company' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-600'">
                      {{ r.type === 'company' ? 'Firma' : 'Kunde' }}
                    </span>
                  </button>
                </div>
                <p v-else-if="contactSearch.length >= 2" class="text-xs text-gray-400 mt-1.5 pl-1">Keine Ergebnisse</p>
              </div>

              <!-- Toggle manual entry -->
              <div class="text-center">
                <button type="button" @click="showManual = !showManual"
                  class="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
                  {{ showManual ? 'Manuelle Eingabe ausblenden' : '+ Manuell eingeben' }}
                </button>
              </div>

              <!-- Manual fields (collapsible) -->
              <template v-if="showManual">
                <div class="grid grid-cols-2 gap-3">
                  <div class="col-span-2">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input v-model="form.external_contact_name" type="text" :required="showManual && !selectedContactLabel"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="Max Muster" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Firma (optional)</label>
                    <input v-model="form.external_company_name" type="text"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="Muster AG" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs font-medium text-gray-700 mb-1">E-Mail * <span class="font-normal text-gray-400">(Bestätigung)</span></label>
                    <input v-model="form.external_contact_email" type="email" :required="showManual && !selectedContactLabel"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="max@beispiel.ch" />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Telefon (optional)</label>
                    <input v-model="form.external_contact_phone" type="tel"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="+41 79 123 45 67" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Strasse</label>
                    <input v-model="form.external_street" type="text"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="Musterstrasse" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Nr.</label>
                    <input v-model="form.external_street_nr" type="text"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="12" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">PLZ</label>
                    <input v-model="form.external_zip" type="text"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="8001" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Ort</label>
                    <input v-model="form.external_city" type="text"
                      class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      placeholder="Zürich" />
                  </div>
                </div>
              </template>
            </template>

          </template>

          <!-- Actions for external bookings (create user / invoice) -->
          <template v-if="form.isExternal && (selectedContactLabel || showManual) && !editingBooking">
            <div class="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
              <p class="text-xs font-semibold text-gray-700 mb-2">Abrechnung</p>

              <label class="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg"
                :class="billingMode === 'none' ? 'bg-white border border-gray-300' : ''">
                <input type="radio" v-model="billingMode" value="none" class="mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-gray-800">Keine Abrechnung</p>
                  <p class="text-xs text-gray-400">Nur Reservierung, keine Rechnung</p>
                </div>
              </label>

              <label class="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg"
                :class="billingMode === 'pending' ? 'bg-white border border-gray-300' : ''">
                <input type="radio" v-model="billingMode" value="pending" class="mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-gray-800">Für Sammelrechnung vormerken</p>
                  <p class="text-xs text-gray-400">Erscheint in «Offene Positionen» — kann später mit anderen Positionen auf eine Rechnung</p>
                </div>
              </label>

              <label class="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg"
                :class="billingMode === 'now' ? 'bg-white border border-gray-300' : ''">
                <input type="radio" v-model="billingMode" value="now" class="mt-0.5" />
                <div>
                  <p class="text-sm font-medium text-gray-800">Rechnung jetzt erstellen & senden</p>
                  <p class="text-xs text-gray-400">Generiert sofort eine Rechnung und schickt sie per E-Mail</p>
                </div>
              </label>
            </div>

            <label v-if="billingMode !== 'none' && !selectedContactLabel" class="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" v-model="actions.createUser" class="rounded" />
              <div>
                <p class="text-sm font-medium text-gray-800">Kunden-Account anlegen</p>
                <p class="text-xs text-gray-500">Erstellt einen neuen Client-Benutzer im System</p>
              </div>
            </label>

            <!-- Email toggles -->
            <div class="border border-gray-200 rounded-xl p-3 space-y-2 bg-white">
              <p class="text-xs font-semibold text-gray-700 mb-1">E-Mail senden</p>
              <label v-if="billingMode !== 'now'" class="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" v-model="actions.sendConfirmation" class="rounded" />
                <p class="text-sm font-medium text-gray-800">Reservierungsbestätigung</p>
              </label>
              <label v-if="billingMode === 'now'" class="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" v-model="actions.sendInvoice" class="rounded" />
                <div>
                  <p class="text-sm font-medium text-gray-800">Rechnung per E-Mail</p>
                  <p class="text-xs text-gray-500">Rechnung als PDF per E-Mail verschicken</p>
                </div>
              </label>
            </div>
          </template>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Notizen (optional)</label>
            <textarea v-model="form.notes" rows="2"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              placeholder="Weitere Informationen…" />
          </div>

          <!-- Error -->
          <p v-if="error" class="text-sm text-red-700 bg-red-50 rounded-xl p-3">{{ error }}</p>

          <!-- External email notice -->
          <div v-if="form.isExternal && form.external_contact_email && actions.sendConfirmation"
            class="flex items-center gap-2.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl">
            <svg class="w-4 h-4 flex-shrink-0 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <p class="text-xs text-orange-800 truncate">
              Bestätigung → <strong>{{ form.external_contact_email }}</strong>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 pt-1">
            <button v-if="editingBooking" type="button" @click="cancel"
              :disabled="isSaving"
              class="text-sm text-red-500 hover:text-red-700 py-2 px-1">
              Stornieren
            </button>
            <div class="flex gap-2 ml-auto">
              <button type="button" @click="$emit('close')"
                class="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Abbrechen
              </button>
              <button type="submit" :disabled="isSaving"
                class="px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50"
                :style="{ background: primaryColor }">
                {{ isSaving ? 'Wird gespeichert…' : (form.isExternal ? (billingMode === 'now' ? 'Reservieren & Rechnung senden' : 'Reservieren & E-Mail senden') : 'Reservieren') }}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

interface Props {
  resourceType: 'room' | 'vehicle'
  resourceId: string
  resourceName: string
  prefillDate?: string      // YYYY-MM-DD
  editingBooking?: any | null
}

const props = withDefaults(defineProps<Props>(), {
  editingBooking: null,
})
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const { currentTenantBranding } = useTenantBranding()
const primaryColor = computed(() => currentTenantBranding.value?.colors?.primary || '#2563eb')

const internalPurposes = [
  { value: 'internal', label: '🔒 Intern' },
  { value: 'maintenance', label: '🔧 Wartung' },
  { value: 'meeting', label: '👥 Meeting' },
  { value: 'event', label: '🎉 Event' },
]

const linkedPurposeLabels: Record<string, string> = {
  lesson: '🚗 Fahrstunde',
  course: '🎓 Kurs',
}

function purposeLabelOf(p: string): string {
  return linkedPurposeLabels[p]
    ?? internalPurposes.find(x => x.value === p)?.label
    ?? (p === 'external' ? '🌐 Extern' : p)
}

const formatDT = (iso: string) =>
  new Date(iso).toLocaleString('de-CH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Read-only view when booking is linked to appointment/course
const isReadonlyBooking = computed(() =>
  !!(props.editingBooking?.appointment_id || props.editingBooking?.course_id)
)

const bookingLocationLabel = computed(() => {
  const appt = props.editingBooking?.appointment
  if (!appt) return ''
  return appt.custom_location_address || appt.custom_location_name ||
    appt.location?.address || appt.location?.name || ''
})

// Staff list for "booked for" dropdown
const staffUsers = ref<any[]>([])
const loadStaff = async () => {
  try {
    const res: any = await $fetch('/api/admin/staff-users')
    staffUsers.value = res.data || []
  } catch { /* silent */ }
}

// External contact search (customers + companies)
const contactSearch = ref('')
const contactResults = ref<any[]>([])
const selectedContactLabel = ref('')
const showManual = ref(false)
let contactSearchTimer: ReturnType<typeof setTimeout> | null = null

function searchContacts() {
  if (contactSearchTimer) clearTimeout(contactSearchTimer)
  if (contactSearch.value.length < 2) { contactResults.value = []; return }
  contactSearchTimer = setTimeout(async () => {
    const q = contactSearch.value
    const [usersRes, companiesRes]: any[] = await Promise.allSettled([
      $fetch('/api/admin/users/search', { query: { q } }),
      $fetch('/api/admin/companies', { query: { search: q } }),
    ])
    const users = (usersRes.value?.users || []).map((u: any) => ({
      id: u.id, type: 'user',
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      subtitle: u.email || '',
      email: u.email || '',
      phone: u.phone || '',
    }))
    const companies = (companiesRes.value?.companies || []).map((c: any) => ({
      id: c.id, type: 'company',
      name: c.name,
      subtitle: c.contact_person ? `${c.contact_person} · ${c.email || ''}` : (c.email || ''),
      email: c.email || '',
      phone: c.phone || '',
      contact_person: c.contact_person || '',
    }))
    contactResults.value = [...users, ...companies].slice(0, 10)
  }, 280)
}

function applyContact(r: any) {
  if (r.type === 'company') {
    form.value.external_contact_name = r.contact_person || r.name
    form.value.external_contact_email = r.email
    form.value.external_contact_phone = r.phone
    selectedContactLabel.value = `${r.name}${r.contact_person ? ` (${r.contact_person})` : ''}`
  } else {
    form.value.external_contact_name = r.name
    form.value.external_contact_email = r.email
    form.value.external_contact_phone = r.phone
    selectedContactLabel.value = `${r.name} — ${r.email}`
  }
  contactSearch.value = ''
  contactResults.value = []
}

function clearContact() {
  selectedContactLabel.value = ''
  form.value.external_contact_name = ''
  form.value.external_contact_email = ''
  form.value.external_contact_phone = ''
  showManual.value = false
}

// Form
const defaultStart = computed(() => {
  const base = props.prefillDate || new Date().toISOString().split('T')[0]
  return `${base}T09:00`
})
const defaultEnd = computed(() => {
  const base = props.prefillDate || new Date().toISOString().split('T')[0]
  return `${base}T10:00`
})

const form = ref({
  start_time: defaultStart.value,
  end_time: defaultEnd.value,
  isExternal: false,
  purpose: 'internal' as string,
  customPurposeLabel: '',
  booked_by_user_id: '',
  external_contact_name: '',
  external_contact_email: '',
  external_contact_phone: '',
  external_company_name: '',
  external_street: '',
  external_street_nr: '',
  external_zip: '',
  external_city: '',
  notes: '',
})

const actions = ref({ createUser: false, createInvoice: false, sendConfirmation: true, sendInvoice: true })
const billingMode = ref<'none' | 'pending' | 'now'>('pending')

// Populate from editingBooking
watch(() => props.editingBooking, (b) => {
  if (!b) return
  const toLocal = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const knownPurposes = internalPurposes.map(p => p.value)
  const isKnownOrExternal = b.purpose === 'external' || knownPurposes.includes(b.purpose)
  form.value = {
    start_time: toLocal(b.start_time),
    end_time: toLocal(b.end_time),
    isExternal: b.purpose === 'external',
    purpose: b.purpose === 'external' ? 'external' : (isKnownOrExternal ? (b.purpose || 'internal') : 'custom'),
    customPurposeLabel: isKnownOrExternal ? '' : (b.purpose || ''),
    booked_by_user_id: b.booked_by || '',
    external_contact_name: b.external_contact_name || '',
    external_contact_email: b.external_contact_email || '',
    external_contact_phone: b.external_contact_phone || '',
    external_company_name: b.external_company_name || '',
    external_street: b.external_street || '',
    external_street_nr: b.external_street_nr || '',
    external_zip: b.external_zip || '',
    external_city: b.external_city || '',
    notes: b.notes || '',
  }
}, { immediate: true })

const isSaving = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  if (!form.value.isExternal && form.value.purpose === 'custom' && !form.value.customPurposeLabel.trim()) {
    error.value = 'Bitte einen Zweck eingeben.'
    return
  }
  isSaving.value = true
  try {
    const effectivePurpose = form.value.isExternal
      ? 'external'
      : (form.value.purpose === 'custom' ? form.value.customPurposeLabel.trim() : form.value.purpose)
    await $fetch('/api/admin/resources/block', {
      method: 'POST',
      body: {
        resource_type: props.resourceType,
        resource_id: props.resourceId,
        start_time: new Date(form.value.start_time).toISOString(),
        end_time: new Date(form.value.end_time).toISOString(),
        purpose: effectivePurpose,
        notes: form.value.notes || null,
        booked_by_user_id: form.value.booked_by_user_id || null,
        ...(form.value.isExternal ? {
          external_contact_name: form.value.external_contact_name,
          external_contact_email: form.value.external_contact_email,
          external_contact_phone: form.value.external_contact_phone || null,
          external_company_name: form.value.external_company_name || null,
          external_street: form.value.external_street || null,
          external_street_nr: form.value.external_street_nr || null,
          external_zip: form.value.external_zip || null,
          external_city: form.value.external_city || null,
          create_user: actions.value.createUser,
          create_invoice: billingMode.value === 'now',
          billing_pending: billingMode.value === 'pending',
          send_confirmation: billingMode.value !== 'now' && actions.value.sendConfirmation,
          send_invoice: actions.value.sendInvoice,
        } : {}),
      },
    })
    emit('saved')
    emit('close')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Fehler beim Speichern.'
  } finally {
    isSaving.value = false
  }
}

const cancel = async () => {
  if (!props.editingBooking?.id) return
  if (!confirm('Reservierung wirklich stornieren?')) return
  isSaving.value = true
  try {
    await $fetch('/api/admin/resources/block/cancel', {
      method: 'POST',
      body: { resource_type: props.resourceType, booking_id: props.editingBooking.id },
    })
    emit('saved')
    emit('close')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Fehler beim Stornieren.'
  } finally {
    isSaving.value = false
  }
}

onMounted(loadStaff)
</script>
