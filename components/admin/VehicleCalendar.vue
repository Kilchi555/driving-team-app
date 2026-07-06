<template>
  <div class="space-y-4">
    <!-- Week navigation -->
    <div class="flex items-center justify-between">
      <h3 class="text-base font-semibold text-gray-900">Fahrzeug-Auslastung</h3>
      <div class="flex items-center gap-2">
        <button @click="shiftWeek(-1)" :disabled="!canGoBack"
          class="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30">
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="text-sm font-medium text-gray-700 min-w-[160px] text-center">{{ weekLabel }}</span>
        <button @click="shiftWeek(1)" class="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-12 text-gray-400">Wird geladen…</div>
    <div v-else-if="vehicles.length === 0" class="text-center py-12 text-gray-400">
      Keine aktiven Fahrzeuge vorhanden.
    </div>

    <div v-else class="space-y-4">
      <div v-for="vehicle in vehicles" :key="vehicle.id" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <!-- Vehicle header -->
        <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ vehicle.name }}</p>
            <p v-if="vehicle.location_address" class="text-xs text-gray-500">📍 {{ vehicle.location_address }}</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex flex-wrap gap-1">
              <span v-for="code in (vehicle.category_codes || [])" :key="code"
                class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">{{ code }}</span>
            </div>
            <button
              @click="openNewBooking(vehicle, null)"
              class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg"
              :style="{ background: primaryColor }"
              title="Fahrzeug blockieren"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Blockieren
            </button>
          </div>
        </div>

        <!-- Week grid -->
        <div class="overflow-x-auto">
          <div class="grid min-w-[600px]" :style="{ gridTemplateColumns: '80px repeat(7, 1fr)' }">
            <!-- Day headers -->
            <div class="text-xs text-gray-400 px-2 py-2 font-medium">Fahrzeug</div>
            <div v-for="day in weekDays" :key="day.date"
              class="text-center py-2 border-l border-gray-100"
              :class="day.isToday ? 'bg-blue-50' : ''">
              <p class="text-xs text-gray-400 uppercase tracking-wide">{{ day.shortLabel }}</p>
              <p class="text-sm font-semibold" :class="day.isToday ? 'text-blue-600' : 'text-gray-700'">{{ day.dayNum }}</p>
            </div>

            <!-- Bookings row -->
            <div class="px-2 py-3 text-xs text-gray-500 border-t border-gray-100 flex items-center">Buchungen</div>
            <div v-for="day in weekDays" :key="'b_' + day.date"
              class="border-l border-t border-gray-100 p-1 min-h-[60px] cursor-pointer group"
              :class="day.isToday ? 'bg-blue-50' : 'bg-white'"
              @click="openNewBooking(vehicle, day.date)">
              <div v-for="b in getBookingsForDay(vehicle, day.date)" :key="b.id"
                class="mb-1 rounded px-1.5 py-1 text-xs leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                :class="bookingClass(b)"
                :title="bookingTitle(b)"
                @click.stop="openExistingBooking(vehicle, b)"
              >
                <p class="font-semibold truncate">{{ purposeLabel(b.purpose) }}</p>
                <p class="truncate">{{ formatTime(b.start_time) }}–{{ formatTime(b.end_time) }}</p>
                <p v-if="b.external_contact_name" class="truncate opacity-75">{{ b.external_contact_name }}</p>
              </div>
              <div v-if="getBookingsForDay(vehicle, day.date).length === 0"
                class="h-full flex items-center justify-center">
                <span class="text-xs text-green-400 group-hover:text-green-600 transition-colors">+ frei</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Resource Block Modal -->
    <ResourceBlockModal
      v-if="blockModal.open"
      resource-type="vehicle"
      :resource-id="blockModal.resourceId"
      :resource-name="blockModal.resourceName"
      :prefill-date="blockModal.prefillDate"
      :editing-booking="blockModal.editingBooking"
      @close="blockModal.open = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import ResourceBlockModal from '~/components/admin/ResourceBlockModal.vue'

const { currentTenantBranding } = useTenantBranding()
const primaryColor = computed(() => currentTenantBranding.value?.colors?.primary || '#2563eb')

const vehicles = ref<any[]>([])
const isLoading = ref(false)
const weekStart = ref(todayDateStr())

function todayDateStr() {
  return new Date().toISOString().split('T')[0]
}

const weekDays = computed(() => {
  const days = []
  const today = todayDateStr()
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${weekStart.value}T12:00:00`)
    d.setDate(d.getDate() + i)
    const date = d.toISOString().split('T')[0]
    days.push({
      date,
      shortLabel: d.toLocaleDateString('de-CH', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: date === today,
    })
  }
  return days
})

const weekLabel = computed(() => {
  if (!weekDays.value.length) return ''
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const first = new Date(`${weekDays.value[0].date}T12:00:00`)
  const last = new Date(`${weekDays.value[6].date}T12:00:00`)
  return `${first.toLocaleDateString('de-CH', opts)} – ${last.toLocaleDateString('de-CH', opts)}`
})

const canGoBack = computed(() => weekStart.value > todayDateStr())

function shiftWeek(dir: -1 | 1) {
  const d = new Date(`${weekStart.value}T12:00:00`)
  d.setDate(d.getDate() + dir * 7)
  const next = d.toISOString().split('T')[0]
  if (dir === -1 && next < todayDateStr()) return
  weekStart.value = next
}

async function load() {
  isLoading.value = true
  try {
    const fromDate = weekStart.value
    const toD = new Date(`${fromDate}T12:00:00`)
    toD.setDate(toD.getDate() + 7)
    const toDate = toD.toISOString().split('T')[0]

    const [vehiclesRes, bookingsRes] = await Promise.all([
      $fetch('/api/admin/rental-vehicles') as Promise<any>,
      $fetch(`/api/admin/resources/vehicle-bookings?from=${fromDate}&to=${toDate}`) as Promise<any>,
    ])

    const allVehicles = (vehiclesRes.vehicles || []).filter((v: any) => v.is_active !== false)
    const allBookings: any[] = bookingsRes.bookings || []

    vehicles.value = allVehicles.map((v: any) => ({
      ...v,
      bookings: allBookings.filter((b: any) => b.vehicle_id === v.id),
    }))
  } catch (err: any) {
    console.error('VehicleCalendar load error:', err)
  } finally {
    isLoading.value = false
  }
}

function getBookingsForDay(vehicle: any, date: string): any[] {
  return (vehicle.bookings || []).filter((b: any) => b.start_time.startsWith(date))
}

function bookingClass(b: any): string {
  if (b.purpose === 'lesson') return 'bg-green-100 text-green-800'
  if (b.purpose === 'course') return 'bg-blue-100 text-blue-800'
  if (b.purpose === 'rental') return 'bg-indigo-100 text-indigo-800'
  if (b.purpose === 'external') return 'bg-orange-100 text-orange-800'
  if (b.purpose === 'maintenance') return 'bg-red-100 text-red-700'
  if (b.purpose === 'meeting') return 'bg-purple-100 text-purple-800'
  if (b.purpose === 'event') return 'bg-pink-100 text-pink-800'
  return 'bg-gray-100 text-gray-700'
}

function bookingTitle(b: any): string {
  const ext = b.external_contact_name ? ` — ${b.external_contact_name}` : ''
  return `${purposeLabel(b.purpose)}${ext}: ${formatTime(b.start_time)}–${formatTime(b.end_time)}`
}

function purposeLabel(p: string): string {
  const map: Record<string, string> = {
    lesson: 'Fahrstunde',
    course: 'Kurs',
    rental: 'Vermietung',
    external: 'Extern',
    maintenance: 'Wartung',
    meeting: 'Meeting',
    event: 'Event',
    internal: 'Intern',
  }
  return map[p] ?? p
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })

// ── Modal ────────────────────────────────────────────────────────────────────
const blockModal = ref({
  open: false,
  resourceId: '',
  resourceName: '',
  prefillDate: undefined as string | undefined,
  editingBooking: null as any,
})

function openNewBooking(vehicle: any, date: string | null) {
  blockModal.value = {
    open: true,
    resourceId: vehicle.id,
    resourceName: vehicle.name || `${vehicle.marke ?? ''} ${vehicle.modell ?? ''}`.trim(),
    prefillDate: date ?? undefined,
    editingBooking: null,
  }
}

function openExistingBooking(vehicle: any, booking: any) {
  blockModal.value = {
    open: true,
    resourceId: vehicle.id,
    resourceName: vehicle.name || `${vehicle.marke ?? ''} ${vehicle.modell ?? ''}`.trim(),
    prefillDate: undefined,
    editingBooking: booking,
  }
}

function onSaved() {
  load()
}

watch(weekStart, () => load())
onMounted(() => load())
</script>
