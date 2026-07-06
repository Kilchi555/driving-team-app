<template>
  <div class="bg-gray-50 min-h-screen">
    <!-- Page Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between py-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Räume</h1>
            <p class="mt-1 text-sm text-gray-600">Raumverwaltung und Buchungskalender</p>
          </div>
          <button
            v-if="activeTab === 'rooms'"
            @click="openModal()"
            class="px-4 py-2 rounded-xl text-white text-sm font-medium"
            :style="{ background: primaryColor }"
          >+ Raum hinzufügen</button>
        </div>
        <!-- Tabs -->
        <div class="flex gap-1 -mb-px">
          <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
            class="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === tab.key ? 'border-current text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >{{ tab.label }}</button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- ─── TAB: Räume (Liste) ─── -->
      <template v-if="activeTab === 'rooms'">
        <div v-if="isLoading" class="text-center py-16 text-gray-400">Wird geladen…</div>
        <div v-else-if="rooms.length === 0" class="text-center py-16 text-gray-400">
          Noch keine Räume erfasst.
          <button @click="openModal()" class="ml-2 text-blue-600 underline">Raum hinzufügen</button>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="room in rooms" :key="room.id"
            class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
            :class="{ 'opacity-60': !room.is_active }"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold text-gray-900 leading-snug">{{ room.name }}</p>
                <p v-if="room.location" class="text-xs text-gray-400 mt-0.5">📍 {{ room.location }}</p>
              </div>
              <button @click="openModal(room)"
                class="flex-shrink-0 text-xs px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Bearbeiten
              </button>
            </div>

            <div class="flex flex-wrap gap-1.5">
              <span v-if="room.capacity" class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {{ room.capacity }} Plätze
              </span>
              <template v-if="enabledTiers(room).length">
                <span v-for="t in enabledTiers(room)" :key="t.type"
                  class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  :style="{ color: primaryColor, background: primaryColor + '18' }">
                  {{ t.badge }}
                </span>
              </template>
              <span v-else-if="+room.hourly_rate_rappen > 0" class="text-xs font-semibold px-2 py-0.5 rounded-full"
                :style="{ color: primaryColor, background: primaryColor + '18' }">
                CHF {{ room.hourly_rate_chf }}/h
              </span>
              <span v-if="room.visibility === 'public'" class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Öffentlich</span>
              <span v-else-if="room.visibility === 'link'" class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Mit Link</span>
              <span v-else class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Intern</span>
              <span v-if="!room.is_own" class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Fremder Raum</span>
            </div>

            <p v-if="room.description" class="text-xs text-gray-500 leading-relaxed">{{ room.description }}</p>
          </div>
        </div>
      </template>

      <!-- ─── TAB: Kalender ─── -->
      <template v-if="activeTab === 'calendar'">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <RoomCalendar @load-error="calendarError = $event" />
          <p v-if="calendarError" class="text-sm text-red-600 mt-3">{{ calendarError }}</p>
        </div>
      </template>

    </div>

    <!-- ─── MODAL ─── -->
    <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
      @click.self="showModal = false">
      <div class="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg sm:m-4 p-5 sm:p-6 max-h-[92dvh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-gray-900">{{ editingRoom ? 'Raum bearbeiten' : 'Raum hinzufügen' }}</h3>
          <button @click="showModal = false" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveRoom" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input v-model="form.name" type="text" required
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="z.B. Schulungsraum A" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Standort / Adresse</label>
              <input v-model="form.location" type="text"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Raum 2, OG" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Kapazität (Plätze)</label>
              <input v-model.number="form.capacity" type="number" min="0"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="20" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea v-model="form.description" rows="2"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              placeholder="Ausstattung, Besonderheiten…" />
          </div>

          <div class="border-t pt-4">
            <div class="mb-3">
              <label class="block text-xs text-gray-500 mb-1">Sichtbarkeit</label>
              <select v-model="form.visibility"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="private">🔒 Intern</option>
                <option value="link">🔑 Mit Link</option>
                <option value="public">🌐 Öffentlich</option>
              </select>
            </div>
          </div>

          <div class="border-t pt-4">
            <p class="text-xs font-semibold text-gray-700 mb-0.5">Preismodelle</p>
            <p class="text-xs text-gray-400 mb-3">Aktiviere die gewünschten Tarife. Mehrere können gleichzeitig angeboten werden.</p>
            <div class="space-y-2">
              <div v-for="tier in form.pricing_tiers" :key="tier.type"
                class="rounded-xl border transition-colors"
                :class="tier.enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'">
                <div class="flex items-center gap-3 p-3">
                  <input type="checkbox" v-model="tier.enabled" class="flex-shrink-0 w-4 h-4 rounded" />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ tier.label }}</p>
                    <p class="text-xs text-gray-400">{{ tier.description }}</p>
                  </div>
                  <div v-if="tier.enabled" class="flex items-center gap-1.5 flex-shrink-0">
                    <span class="text-xs text-gray-500">CHF</span>
                    <input v-model="tier.rate_chf" type="number" min="0" step="0.50"
                      class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="0.00" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p v-if="formError" class="text-sm text-red-700 bg-red-50 rounded-xl p-3">{{ formError }}</p>

          <div class="flex items-center justify-between pt-2 gap-3">
            <button v-if="editingRoom" type="button" @click="deleteRoom"
              class="text-sm text-red-500 hover:text-red-700 underline py-2">Löschen</button>
            <div class="flex gap-2 ml-auto">
              <button type="button" @click="showModal = false"
                class="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Abbrechen
              </button>
              <button type="submit" :disabled="isSaving"
                class="px-5 py-2.5 text-sm text-white rounded-xl disabled:opacity-50 font-medium"
                :style="{ background: primaryColor }">
                {{ isSaving ? 'Wird gespeichert…' : editingRoom ? 'Speichern' : 'Hinzufügen' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import RoomCalendar from '~/components/admin/RoomCalendar.vue'

definePageMeta({ middleware: 'admin', layout: 'admin' })

const { currentTenantBranding } = useTenantBranding()
const primaryColor = computed(() => currentTenantBranding.value?.colors?.primary || '#2563eb')

// ── Pricing tiers ─────────────────────────────────────────────────────────
const ROOM_TIER_DEFS = [
  { type: 'hourly',   label: 'Stundenweise',  description: 'Preis pro Stunde — frei wählbarer Zeitraum.' },
  { type: 'half_day', label: 'Halbtages',     description: 'Fixpreis für Morgen (07–13h) oder Nachmittag (13–19h).' },
  { type: 'full_day', label: 'Ganztages',     description: 'Fixpreis für den ganzen Tag (07–19h).' },
]

function makeRoomPricingTiers(existing: any[] = []) {
  return ROOM_TIER_DEFS.map(def => {
    const found = existing.find((t: any) => t.type === def.type)
    return {
      ...def,
      enabled: found?.enabled ?? (def.type === 'hourly'),
      rate_rappen: found?.rate_rappen ?? 0,
      rate_chf: found ? (found.rate_rappen / 100).toFixed(2) : '0.00',
    }
  })
}

function enabledTiers(room: any): { type: string; badge: string }[] {
  const tiers: any[] = room.pricing_tiers ?? []
  return tiers
    .filter((t: any) => t.enabled && t.rate_rappen > 0)
    .map((t: any) => {
      const chf = (t.rate_rappen / 100).toFixed(2)
      return {
        type: t.type,
        badge: t.type === 'hourly' ? `CHF ${chf}/h`
          : t.type === 'half_day' ? `CHF ${chf} halbtags`
          : `CHF ${chf} ganztags`,
      }
    })
}

const tabs = [
  { key: 'rooms', label: 'Räume' },
  { key: 'calendar', label: 'Kalender' },
]
const activeTab = ref('rooms')
const calendarError = ref('')

// ── Room list ──────────────────────────────────────────────────────────────
const rooms = ref<any[]>([])
const isLoading = ref(false)

async function loadRooms() {
  isLoading.value = true
  try {
    const res: any = await $fetch('/api/admin/resources/rooms?include_public=true')
    rooms.value = res.rooms || []
  } catch { /* silent */ } finally {
    isLoading.value = false
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────
const showModal = ref(false)
const editingRoom = ref<any>(null)
const isSaving = ref(false)
const formError = ref('')

const form = ref({
  name: '',
  location: '',
  capacity: null as number | null,
  description: '',
  hourly_rate_chf: '0',
  visibility: 'private' as 'private' | 'link' | 'public',
  pricing_tiers: makeRoomPricingTiers() as any[],
})

function openModal(room?: any) {
  editingRoom.value = room ?? null
  formError.value = ''
  const toVisibility = (r: any) => r.visibility ?? (r.is_public ? 'public' : 'private')
  form.value = room ? {
    name: room.name ?? '',
    location: room.location ?? '',
    capacity: room.capacity ?? null,
    description: room.description ?? '',
    hourly_rate_chf: room.hourly_rate_chf ?? '0',
    visibility: toVisibility(room),
    pricing_tiers: makeRoomPricingTiers(room.pricing_tiers ?? []),
  } : {
    name: '', location: '', capacity: null, description: '',
    hourly_rate_chf: '0', visibility: 'private',
    pricing_tiers: makeRoomPricingTiers(),
  }
  showModal.value = true
}

async function saveRoom() {
  isSaving.value = true
  formError.value = ''
  const serializedTiers = form.value.pricing_tiers.map((t: any) => ({
    type: t.type,
    enabled: t.enabled,
    rate_rappen: Math.round((parseFloat(t.rate_chf) || 0) * 100),
  }))
  const hourlyTier = serializedTiers.find((t: any) => t.type === 'hourly')
  const payload = {
    name: form.value.name.trim(),
    location: form.value.location.trim() || null,
    capacity: form.value.capacity || null,
    description: form.value.description.trim() || null,
    hourly_rate_rappen: hourlyTier?.enabled ? hourlyTier.rate_rappen : Math.round((parseFloat(form.value.hourly_rate_chf) || 0) * 100),
    pricing_tiers: serializedTiers,
    is_public: form.value.visibility === 'public',
    visibility: form.value.visibility,
  }
  try {
    if (editingRoom.value) {
      await $fetch('/api/admin/resources/rooms/update', {
        method: 'POST',
        body: { roomId: editingRoom.value.id, ...payload },
      })
    } else {
      await $fetch('/api/admin/resources/rooms/create', {
        method: 'POST',
        body: payload,
      })
    }
    showModal.value = false
    await loadRooms()
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || 'Fehler beim Speichern.'
  } finally {
    isSaving.value = false
  }
}

async function deleteRoom() {
  if (!editingRoom.value || !confirm(`Raum "${editingRoom.value.name}" wirklich löschen?`)) return
  try {
    await $fetch('/api/admin/resources/rooms/delete', {
      method: 'POST',
      body: { roomId: editingRoom.value.id },
    })
    showModal.value = false
    await loadRooms()
  } catch (err: any) {
    formError.value = err?.data?.statusMessage || 'Fehler beim Löschen.'
  }
}

onMounted(loadRooms)
</script>
