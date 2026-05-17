<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center p-4 py-8">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

      <!-- Header: white logo area -->
      <div class="bg-white px-8 pt-7 pb-6">
        <!-- Tenant wide logo -->
        <div class="flex items-center justify-center mb-5">
          <img v-if="tenant?.logo_url"
            :src="tenant.logo_url"
            class="h-14 w-auto object-contain"
            style="max-width:260px"
            :alt="tenant.name" />
          <span v-else class="text-gray-900 text-xl font-bold">{{ tenant?.name }}</span>
        </div>

        <!-- Divider + "In Zusammenarbeit mit" -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="text-gray-400 text-xs font-medium whitespace-nowrap">In Zusammenarbeit mit</span>
          <div class="flex-1 h-px bg-gray-200"></div>
        </div>

        <!-- Real Helvetia logo -->
        <div class="flex items-center justify-center">
          <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNi4yLjEsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkViZW5lXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4Ig0KCSB3aWR0aD0iMTY5LjkzOXB4IiBoZWlnaHQ9IjM5Ljg0NnB4IiB2aWV3Qm94PSIwIDAgMTY5LjkzOSAzOS44NDYiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDE2OS45MzkgMzkuODQ2Ig0KCSB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxnPg0KCTxwYXRoIGZpbGw9IiMxODE3MTYiIGQ9Ik02LjAxNSw5LjV2MTAuMDUzaDAuMDY2YzEuMzktMS44NSwzLjA3NS0yLjcxMSw1LjQyNC0yLjcxMWM0LjI5NSwwLDYuMzc5LDIuODQ0LDYuMzc5LDcuMTQzdjEwLjM4MWgtNi4wMTYNCgkJdi04LjY5NGMwLTEuOTg1LTAuMjk4LTQuMDMyLTIuNzEyLTQuMDMyYy0yLjM3OSwwLTMuMTQxLDIuMDQ3LTMuMTQxLDQuMDMydjguNjk0SDBWOS41SDYuMDE1eiIvPg0KCTxwYXRoIGZpbGw9IiMxODE3MTYiIGQ9Ik0zOC4yODIsMjYuODk2SDI1LjYyYzAsMi40NDQsMS4yOTEsMy43NjgsMy43NywzLjc2OGMxLjI5LDAsMi4yMTQtMC40MzEsMi44NzYtMS41NTNoNS43ODUNCgkJYy0wLjk2LDQtNC43NjEsNS44MTgtOC42MjksNS44MThjLTUuNjIsMC05LjgxOS0zLjE3My05LjgxOS05LjAyNWMwLTUuNjU1LDMuODY3LTkuMDYxLDkuMzg5LTkuMDYxDQoJCWM1Ljg4NSwwLDkuMjg5LDMuNjM4LDkuMjg5LDkuNDI0VjI2Ljg5NnogTTMyLjY5NiwyMy40MjNjLTAuMjk5LTEuNjIxLTEuNzg2LTIuNjgtMy40MDYtMi42OGMtMS43NTIsMC0zLjIwNiwwLjkyOC0zLjU3MiwyLjY4DQoJCUgzMi42OTZ6Ii8+DQoJPHBhdGggZmlsbD0iIzE4MTcxNiIgZD0iTTQ2LjA1LDM0LjM2NmgtNi4wMTVWOS41aDYuMDE1VjM0LjM2NnoiLz4NCgk8cGF0aCBmaWxsPSIjMTgxNzE2IiBkPSJNNTcuNDY1LDI2LjEwM2w0LjAzNC04LjY5OGg2Ljc0NWwtOC44NjEsMTYuOTYyaC0zLjgzNWwtOC44OTMtMTYuOTYyaDYuNzQ0TDU3LjQ2NSwyNi4xMDN6Ii8+DQoJPHBhdGggZmlsbD0iIzE4MTcxNiIgZD0iTTg1LjQzNywyNi44OTZINzIuNzc1YzAsMi40NDQsMS4yODksMy43NjgsMy43NywzLjc2OGMxLjI4OSwwLDIuMjE1LTAuNDMxLDIuODc1LTEuNTUzaDUuNzg1DQoJCWMtMC45NTgsNC00Ljc2MSw1LjgxOC04LjYyNiw1LjgxOGMtNS42MiwwLTkuODE5LTMuMTczLTkuODE5LTkuMDI1YzAtNS42NTUsMy44NjktOS4wNjEsOS4zODgtOS4wNjENCgkJYzUuODg0LDAsOS4yOSwzLjYzOCw5LjI5LDkuNDI0VjI2Ljg5NnogTTc5Ljg0OSwyMy40MjNjLTAuMjk2LTEuNjIxLTEuNzg0LTIuNjgtMy40MDMtMi42OGMtMS43NTMsMC0zLjIwOCwwLjkyOC0zLjU3MSwyLjY4DQoJCUg3OS44NDl6Ii8+DQoJPHBhdGggZmlsbD0iIzE4MTcxNiIgZD0iTTk0LjMxLDM0LjM2NmgtNi4wMTZ2LTEyaC0xLjk1di00Ljk2MmgxLjk1di01LjA5aDYuMDE2djUuMDloMy40MDV2NC45NjJIOTQuMzFWMzQuMzY2eiIvPg0KCTxwYXRoIGZpbGw9IiMxODE3MTYiIGQ9Ik0xMDUuMjM3LDEyLjA1YzAsMS44NTEtMS41MTgsMy4zNzEtMy4zNzEsMy4zNzFjLTEuODUsMC0zLjM3Mi0xLjUyLTMuMzcyLTMuMzcxDQoJCWMwLTEuODUyLDEuNTIyLTMuMzcyLDMuMzcyLTMuMzcyQzEwMy43Miw4LjY3OCwxMDUuMjM3LDEwLjE5OCwxMDUuMjM3LDEyLjA1eiBNMTA0Ljg3NSwzNC4zNjZoLTYuMDE5VjE3LjQwNGg2LjAxOVYzNC4zNjZ6Ii8+DQoJPHBhdGggZmlsbD0iIzE4MTcxNiIgZD0iTTEyNi4zOTcsMzQuMzY2aC02LjAyVjMyLjQ4aC0wLjA2NGMtMS4wNiwxLjY4OC0zLjE0MSwyLjQ0OC01LjEyNCwyLjQ0OGMtNS4wMjYsMC04LjU2My00LjE5OS04LjU2My05LjA2DQoJCWMwLTQuODYyLDMuNDcyLTkuMDI3LDguNDk4LTkuMDI3YzEuOTQ4LDAsMy45OTcsMC43MjgsNS4yNTQsMi4yMTZ2LTEuNjU0aDYuMDJWMzQuMzY2eiBNMTEyLjg0MywyNS45MDMNCgkJYzAsMi4xNDgsMS40MiwzLjgsMy44NjYsMy44czMuODY4LTEuNjUxLDMuODY4LTMuOGMwLTIuMDgzLTEuNDIyLTMuODM2LTMuODY4LTMuODM2UzExMi44NDMsMjMuODIsMTEyLjg0MywyNS45MDN6Ii8+DQoJPGc+DQoJCTxnPg0KCQkJPGc+DQoJCQkJPHBvbHlnb24gZmlsbD0iIzU2M0I2QyIgcG9pbnRzPSIxNDcuODMyLDI3LjIzOCAxNDAuMTExLDI5LjIyMSAxNDYuMTExLDE1LjM1NSAxNTMuODYsMTMuNTA3IAkJCQkiLz4NCgkJCTwvZz4NCgkJPC9nPg0KCQk8Zz4NCgkJCTxwb2x5Z29uIGZpbGw9IiM3MTUxOEMiIHBvaW50cz0iMTQ1LjcyNiwxLjY5OSAxNTMuNTA2LDAgMTU2LjYzOCw3LjE4MSAxNDguODc5LDguOTY3IAkJCSIvPg0KCQk8L2c+DQoJCTxnPg0KCQkJPHBvbHlnb24gZmlsbD0iIzg3NjFBOCIgcG9pbnRzPSIxMzQuMzc5LDI4LjIzOSAxNDUuNzI2LDEuNjk5IDE0OC44NzksOC45NjcgMTQwLjExMSwyOS4yMjEgCQkJIi8+DQoJCTwvZz4NCgk8L2c+DQoJPGc+DQoJCTxwb2x5Z29uIGZpbGw9IiMxMTgyODkiIHBvaW50cz0iMTQwLjExMSwyOS4yMjEgMTQ3LjgzMiwyNy4yMzggMTYwLjc3LDI5LjM5OCAxNTMuMDY5LDMxLjQzOCAJCSIvPg0KCQk8Zz4NCgkJCTxwb2x5Z29uIGZpbGw9IiM0NkE4QjMiIHBvaW50cz0iMTU2LjIzNiwzOC43NjIgMTMxLjc2NCwzNC4zNjYgMTM0LjM3OSwyOC4yMzkgMTUzLjA2OSwzMS40MzggCQkJIi8+DQoJCTwvZz4NCgk8L2c+DQoJPGc+DQoJCTxnPg0KCQkJPHBvbHlnb24gZmlsbD0iIzlGMTcxNyIgcG9pbnRzPSIxNDguODc5LDguOTY3IDE1Ni42MzgsNy4xODEgMTY5LjkzOSwzNy42ODkgMTYyLjI3NywzOS44NDYgCQkJIi8+DQoJCTwvZz4NCgkJPGc+DQoJCQk8cG9seWdvbiBmaWxsPSIjQzIxOTI0IiBwb2ludHM9IjE0Ni4xMTEsMTUuMzU1IDE0OC44NzksOC45NjcgMTYyLjI3NywzOS44NDYgMTU2LjIzNiwzOC43NjIgCQkJIi8+DQoJCTwvZz4NCgk8L2c+DQo8L2c+DQo8L3N2Zz4NCg=="
            alt="Helvetia" class="h-8 w-auto object-contain" />
        </div>
      </div>

      <!-- Title bar in tenant color -->
      <div class="px-6 py-4 text-center" :style="{ background: tenant?.primary_color || '#0f172a' }">
        <h1 class="text-lg font-black text-white">Kostenlose Versicherungs-Offerte</h1>
        <p class="text-white/70 text-xs mt-0.5">Unverbindlich · Nur 2 Minuten</p>
      </div>

      <!-- Success -->
      <div v-if="submitted" class="p-10 text-center">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-5">✅</div>
        <h2 class="text-2xl font-black text-gray-900 mb-3">Anfrage gesendet!</h2>
        <p class="text-gray-500 leading-relaxed text-sm mb-6">
          Ihre Anfrage wurde an <strong>Helvetia</strong> weitergeleitet.<br/>
          Michele Cecio oder ein Berater meldet sich bei Ihnen — in der Regel innert 1–2 Arbeitstagen.
        </p>
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left text-sm text-blue-800 space-y-1">
          <p class="font-semibold text-blue-900">Was passiert als nächstes?</p>
          <p>1. Helvetia prüft Ihre Anfrage und Ihre Unterlagen</p>
          <p>2. Ein Berater erstellt eine massgeschneiderte Offerte</p>
          <p>3. Sie erhalten die Offerte per Email oder Telefon</p>
        </div>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="submit" class="p-7 space-y-5">

        <!-- Intro -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <p class="font-semibold mb-1">💰 Unsere Kunden sparen durchschnittlich CHF 1'200 – 3'800 pro Jahr</p>
          <p class="text-amber-800 text-xs leading-relaxed">Helvetia überzeugt mit einem hervorragenden Preis-Leistungs-Verhältnis — top Versicherungsschutz zu einem fairen Preis.</p>
        </div>

        <!-- Insurance types -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-2.5 uppercase tracking-wider">
            Für welche Versicherungen möchten Sie eine Offerte? <span class="text-red-500">*</span>
          </label>
          <div class="flex flex-wrap gap-2">
            <label v-for="type in insuranceTypes" :key="type.value"
              class="flex items-center gap-2 px-3 py-2.5 border rounded-xl cursor-pointer transition-all text-sm"
              :class="form.insurance_types.includes(type.value)
                ? 'border-blue-500 bg-blue-50 text-blue-800'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'">
              <input type="checkbox" :value="type.value" v-model="form.insurance_types" class="hidden" />
              <span class="text-base shrink-0">{{ type.icon }}</span>
              <span class="font-medium whitespace-nowrap">{{ type.label }}</span>
              <svg v-if="form.insurance_types.includes(type.value)" class="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </label>
          </div>
          <p v-if="validationError && form.insurance_types.length === 0" class="text-red-600 text-xs mt-1.5">Bitte mindestens eine Versicherung auswählen.</p>
          <p v-if="form.insurance_types.includes('andere')" class="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs mt-2">
            Bitte beschreiben Sie im Feld «Anmerkungen» unten, für welche Versicherung Sie eine Offerte wünschen.
          </p>
        </div>

        <!-- Contact fields -->
        <div class="space-y-3.5">
          <p class="text-xs font-bold text-gray-700 uppercase tracking-wider">Ihre Kontaktdaten</p>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Vorname <span class="text-red-500">*</span></label>
              <input v-model="form.first_name" type="text" required placeholder="Max"
                class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Nachname</label>
              <input v-model="form.last_name" type="text" placeholder="Muster"
                class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Email <span class="text-red-500">*</span></label>
            <input v-model="form.email" type="email" required placeholder="max@beispiel.ch"
              class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Telefon</label>
            <input v-model="form.phone" type="tel" placeholder="+41 79 123 45 67"
              class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
          </div>

          <div>
            <label class="block text-xs text-gray-500 mb-1">Anmerkungen (optional)</label>
            <textarea v-model="form.notes" rows="2" placeholder="z.B. bestehende Versicherungen, besondere Wünsche…"
              class="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"></textarea>
          </div>
        </div>

        <!-- Document upload -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
            Dokumente hochladen
            <span class="font-normal text-gray-400 normal-case tracking-normal ml-1">(optional)</span>
          </label>
          <div
            class="border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer"
            :class="dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="onDrop"
            @click="fileInputRef?.click()">
            <input ref="fileInputRef" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" class="hidden" @change="onFileChange" />
            <div class="text-gray-400 text-2xl mb-2">📎</div>
            <p class="text-sm text-gray-600 font-medium">Klicken oder Dateien hierhin ziehen</p>
            <p class="text-xs text-gray-400 mt-1">PDF, JPG, PNG · max. 10 MB pro Datei · z.B. bestehende Policen</p>
          </div>

          <!-- File list -->
          <div v-if="files.length > 0" class="mt-2 space-y-1.5">
            <div v-for="(f, i) in files" :key="i"
              class="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-base shrink-0">{{ fileIcon(f) }}</span>
                <span class="text-gray-700 truncate">{{ f.name }}</span>
                <span class="text-gray-400 shrink-0">{{ formatSize(f.size) }}</span>
              </div>
              <button type="button" @click="removeFile(i)" class="text-gray-400 hover:text-red-500 transition shrink-0 ml-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <p class="text-xs text-gray-400 mt-2">
            🔒 Vertraulich — Dokumente werden ausschliesslich an Helvetia übermittelt und danach gelöscht.
          </p>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">{{ error }}</div>

        <!-- Submit -->
        <button type="submit" :disabled="loading"
          class="w-full text-white py-4 rounded-xl font-bold text-base transition disabled:opacity-50 flex items-center justify-center gap-2"
          :style="{ background: tenant?.primary_color || '#0f172a' }">
          <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ loading ? 'Wird gesendet…' : 'Kostenlose Offerte anfordern →' }}
        </button>

        <p class="text-xs text-gray-400 text-center leading-relaxed">
          Unverbindlich und kostenlos. Kein Abonnement, keine versteckten Kosten.
          Ihre Daten werden vertraulich behandelt und nur für die Offerte-Anfrage verwendet.
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({ layout: false })
useHead({ title: 'Kostenlose Versicherungs-Offerte — Helvetia' })

const route = useRoute()
const tenantSlug = computed(() => String(route.query.t || '').toLowerCase().trim())

const { data: brandingData } = await useFetch('/api/tenants/branding', {
  query: computed(() => ({ slug: tenantSlug.value || undefined })),
}) as any

const tenant = computed(() => {
  const d = brandingData.value?.data
  if (!d) return null
  return {
    id: d.id,
    name: d.name,
    primary_color: d.primary_color || '#0f172a',
    logo_url: d.logo_wide_url || d.logo_url,
    logo_square_url: d.logo_square_url,
  }
})

const insuranceTypes = [
  { value: 'fahrzeug', label: 'Fahrzeugversicherung', icon: '🚗' },
  { value: 'hausrat', label: 'Hausrat', icon: '🏠' },
  { value: 'privathaftpflicht', label: 'Privathaftpflicht', icon: '🤝' },
  { value: 'rechtsschutz', label: 'Rechtsschutz', icon: '⚖️' },
  { value: 'krankenversicherung', label: 'Krankenversicherung', icon: '🏥' },
  { value: 'lebensversicherung', label: 'Lebensversicherung', icon: '❤️' },
  { value: 'reise', label: 'Reise', icon: '✈️' },
  { value: 'andere', label: 'Andere', icon: '➕' },
]

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  notes: '',
  insurance_types: [] as string[],
})

const files = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const submitted = ref(false)
const loading = ref(false)
const error = ref('')
const validationError = ref(false)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(Array.from(input.files))
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) addFiles(Array.from(e.dataTransfer.files))
}

function addFiles(newFiles: File[]) {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  for (const f of newFiles) {
    if (!allowed.includes(f.type)) { error.value = `Dateiformat nicht erlaubt: ${f.name}`; continue }
    if (f.size > 10 * 1024 * 1024) { error.value = `Datei zu gross (max 10 MB): ${f.name}`; continue }
    if (!files.value.find(x => x.name === f.name && x.size === f.size)) files.value.push(f)
  }
}

function removeFile(i: number) { files.value.splice(i, 1) }

function fileIcon(f: File) {
  if (f.type === 'application/pdf') return '📄'
  return '🖼️'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function submit() {
  error.value = ''
  validationError.value = true

  if (form.insurance_types.length === 0) return
  if (!form.first_name || !form.email) { error.value = 'Bitte Vorname und Email ausfüllen.'; return }

  loading.value = true
  try {
    const fd = new FormData()
    fd.append('tenant_id', tenant.value?.id || '')
    fd.append('partner_slug', 'helvetia')
    fd.append('first_name', form.first_name)
    fd.append('last_name', form.last_name)
    fd.append('email', form.email)
    fd.append('phone', form.phone)
    fd.append('notes', form.notes)
    fd.append('insurance_types', JSON.stringify(form.insurance_types))
    for (const f of files.value) fd.append('files', f)

    await $fetch('/api/partner/offer-request', { method: 'POST', body: fd })
    submitted.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Fehler beim Senden. Bitte versuche es erneut.'
  } finally {
    loading.value = false
  }
}
</script>
