<template>
  <div class="p-6 max-w-6xl mx-auto space-y-8">

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Website</h1>
        <p class="text-gray-500 text-sm mt-0.5">Leads, Anfragen und Conversions deiner Website</p>
      </div>
      <div class="flex gap-3">
        <NuxtLink to="/admin/website/setup"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-600 text-gray-700 hover:bg-gray-50 transition-colors">
          ⚙️ Inhalte bearbeiten
        </NuxtLink>
        <NuxtLink to="/admin/website-analytics"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-600 hover:bg-blue-700 transition-colors">
          📊 Analytics
        </NuxtLink>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div v-for="kpi in kpis" :key="kpi.label" class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <p class="text-3xl font-black tracking-tight text-gray-900">{{ kpi.value }}</p>
        <p class="text-xs font-700 text-gray-400 uppercase tracking-wider mt-1">{{ kpi.label }}</p>
        <p class="text-xs mt-1" :class="kpi.trend > 0 ? 'text-green-600' : 'text-gray-400'">
          {{ kpi.trend > 0 ? `+${kpi.trend}%` : '–' }} vs. letzter Monat
        </p>
      </div>
    </div>

    <!-- Neue Leads -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <div class="flex items-center gap-3">
          <h2 class="font-800 text-gray-900">Neue Anfragen</h2>
          <span class="bg-blue-100 text-blue-700 text-xs font-700 px-2 py-0.5 rounded-full">{{ newLeads.length }} neu</span>
        </div>
        <select v-model="filterType" class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600">
          <option value="">Alle Typen</option>
          <option value="booking">Fahrstunde</option>
          <option value="vku">VKU</option>
          <option value="nothilfe">Nothilfe</option>
          <option value="contact">Kontakt</option>
        </select>
      </div>

      <div v-if="filteredLeads.length === 0" class="py-16 text-center text-gray-400">
        <p class="text-3xl mb-3">📭</p>
        <p class="font-600">Noch keine Anfragen</p>
        <p class="text-sm mt-1">Sobald jemand ein Formular auf der Website ausfüllt, erscheint es hier.</p>
      </div>

      <div v-else class="divide-y divide-gray-50">
        <div v-for="lead in filteredLeads" :key="lead.id"
          class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
          @click="selectedLead = lead">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-800 text-sm flex-shrink-0"
            :style="{ background: typeColor(lead.type) }">
            {{ lead.first_name?.[0] }}{{ lead.last_name?.[0] }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-700 text-gray-900 text-sm">{{ lead.first_name }} {{ lead.last_name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ lead.email }} · {{ lead.phone }}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <span class="inline-block text-xs font-700 px-2.5 py-1 rounded-full"
              :style="{ background: typeColorBg(lead.type), color: typeColor(lead.type) }">
              {{ typeLabel(lead.type) }}
            </span>
            <p class="text-xs text-gray-400 mt-1">{{ formatDate(lead.created_at) }}</p>
          </div>
          <div class="flex-shrink-0">
            <span class="w-2 h-2 rounded-full bg-blue-500 block" v-if="lead.status === 'new'"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Lead Detail Modal -->
    <Transition name="modal">
      <div v-if="selectedLead" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        @click.self="selectedLead = null">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedLead = null"></div>
        <div class="relative bg-white rounded-2xl w-full max-w-md shadow-2xl z-10">
          <div class="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p class="font-900 text-lg">{{ selectedLead.first_name }} {{ selectedLead.last_name }}</p>
              <span class="text-xs font-700 px-2.5 py-1 rounded-full inline-block mt-1"
                :style="{ background: typeColorBg(selectedLead.type), color: typeColor(selectedLead.type) }">
                {{ typeLabel(selectedLead.type) }}
              </span>
            </div>
            <button @click="selectedLead = null"
              class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">×</button>
          </div>
          <div class="p-6 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-lg">📧</span>
              <a :href="`mailto:${selectedLead.email}`" class="text-blue-600 font-600 text-sm hover:underline">{{ selectedLead.email }}</a>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-lg">📞</span>
              <a :href="`tel:${selectedLead.phone}`" class="text-gray-700 font-600 text-sm">{{ selectedLead.phone }}</a>
            </div>
            <div v-if="selectedLead.course_date" class="flex items-center gap-3">
              <span class="text-lg">📅</span>
              <p class="text-gray-700 text-sm font-600">{{ selectedLead.course_date }}</p>
            </div>
            <div v-if="selectedLead.message" class="flex items-start gap-3">
              <span class="text-lg">💬</span>
              <p class="text-gray-600 text-sm">{{ selectedLead.message }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-lg">🕐</span>
              <p class="text-gray-400 text-sm">{{ formatDate(selectedLead.created_at) }}</p>
            </div>
          </div>
          <div class="p-6 pt-0 flex gap-3">
            <a :href="`https://wa.me/${selectedLead.phone?.replace(/\D/g,'')}`" target="_blank"
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-700 text-sm hover:bg-green-600 transition-colors">
              💬 WhatsApp
            </a>
            <a :href="`mailto:${selectedLead.email}`"
              class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-700 text-sm hover:bg-gray-50 transition-colors">
              ✉️ E-Mail
            </a>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: ['admin'] })
useHead({ title: 'Website – Leads & Übersicht' })

const filterType = ref('')
const selectedLead = ref<any>(null)

// Demo-Daten — werden später durch echte Supabase-Queries ersetzt
const newLeads = ref([
  { id: '1', first_name: 'Luca', last_name: 'Müller', email: 'luca@beispiel.ch', phone: '079 123 45 67', type: 'booking', status: 'new', created_at: new Date().toISOString(), course_date: null, message: null },
  { id: '2', first_name: 'Sara', last_name: 'Meier', email: 'sara@beispiel.ch', phone: '078 234 56 78', type: 'vku', status: 'new', created_at: new Date(Date.now() - 3600000).toISOString(), course_date: '18. – 19. Juni 2026', message: null },
  { id: '3', first_name: 'Noah', last_name: 'Keller', email: 'noah@beispiel.ch', phone: '076 345 67 89', type: 'nothilfe', status: 'contacted', created_at: new Date(Date.now() - 86400000).toISOString(), course_date: null, message: 'Wann ist der nächste Kurs?' },
])

const kpis = ref([
  { label: 'Leads gesamt', value: '3', trend: 0 },
  { label: 'Diese Woche', value: '2', trend: 50 },
  { label: 'Conversion Rate', value: '–', trend: 0 },
  { label: 'Ø Antwortzeit', value: '–', trend: 0 },
])

const filteredLeads = computed(() =>
  filterType.value ? newLeads.value.filter(l => l.type === filterType.value) : newLeads.value
)

const typeLabel = (type: string) => ({
  booking: 'Fahrstunde', vku: 'VKU', nothilfe: 'Nothilfe', contact: 'Kontakt', theorie: 'Theorie'
}[type] || type)

const typeColor = (type: string) => ({
  booking: '#2563EB', vku: '#D97706', nothilfe: '#16A34A', contact: '#7C3AED', theorie: '#0891B2'
}[type] || '#6B7280')

const typeColorBg = (type: string) => ({
  booking: '#EFF6FF', vku: '#FEF3C7', nothilfe: '#F0FDF4', contact: '#F5F3FF', theorie: '#E0F2FE'
}[type] || '#F9FAFB')

const formatDate = (iso: string) => {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 3600000) return `vor ${Math.floor(diff / 60000)} Min.`
  if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)} Std.`
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
