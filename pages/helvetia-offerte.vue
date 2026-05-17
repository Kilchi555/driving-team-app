<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center p-4 py-8">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

      <!-- Header -->
      <div class="relative p-8 text-center overflow-hidden" :style="{ background: tenant?.primary_color || '#0f172a' }">
        <!-- Background pattern -->
        <div class="absolute inset-0 opacity-10" style="background-image:radial-gradient(circle at 20% 50%, white 1px, transparent 1px),radial-gradient(circle at 80% 20%, white 1px, transparent 1px);background-size:30px 30px"></div>

        <!-- Logos side by side -->
        <div class="relative flex items-center justify-center gap-4 mb-5">
          <img v-if="tenant?.logo_square_url && tenant.logo_square_url.startsWith('data:')"
            :src="tenant.logo_square_url"
            class="h-12 w-auto object-contain"
            :alt="tenant.name" />
          <img v-else-if="tenant?.logo_square_url"
            :src="tenant.logo_square_url"
            class="h-12 w-auto object-contain bg-white/20 rounded-lg p-1"
            :alt="tenant.name" />
          <div v-if="tenant?.logo_square_url" class="w-px h-10 bg-white/30"></div>
          <!-- Helvetia logo (white version via CSS) -->
          <div class="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="white" fill-opacity="0.2"/>
              <text x="16" y="22" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="serif">H</text>
            </svg>
            <span class="text-white font-bold text-lg tracking-tight">Helvetia</span>
          </div>
        </div>

        <h1 class="relative text-2xl font-black text-white leading-tight">Kostenlose Versicherungs-Offerte</h1>
        <p class="relative text-white/80 text-sm mt-2">Unverbindlich · In Zusammenarbeit mit Helvetia Versicherungen</p>
      </div>

      <!-- Success -->
      <div v-if="submitted" class="p-10 text-center">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-5">✅</div>
        <h2 class="text-2xl font-black text-gray-900 mb-3">Anfrage gesendet!</h2>
        <p class="text-gray-500 leading-relaxed text-sm mb-6">
          Ihre Anfrage wurde an <strong>Helvetia Glarus</strong> weitergeleitet.<br/>
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
          <p class="text-amber-800 text-xs leading-relaxed">Dank der Zusammenarbeit mit Helvetia erhalten Sie als Fahrschul-Kunde exklusive Konditionen — bei vollem Schutz.</p>
        </div>

        <!-- Insurance types -->
        <div>
          <label class="block text-xs font-bold text-gray-700 mb-2.5 uppercase tracking-wider">
            Für welche Versicherungen möchten Sie eine Offerte? <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="type in insuranceTypes" :key="type.value"
              class="flex items-center gap-2.5 p-3 border rounded-xl cursor-pointer transition-all text-sm"
              :class="form.insurance_types.includes(type.value)
                ? 'border-blue-500 bg-blue-50 text-blue-800'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'">
              <input type="checkbox" :value="type.value" v-model="form.insurance_types" class="hidden" />
              <span class="text-base shrink-0">{{ type.icon }}</span>
              <span class="font-medium leading-tight">{{ type.label }}</span>
              <svg v-if="form.insurance_types.includes(type.value)" class="w-4 h-4 text-blue-600 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </label>
          </div>
          <p v-if="validationError && form.insurance_types.length === 0" class="text-red-600 text-xs mt-1.5">Bitte mindestens eine Versicherung auswählen.</p>
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
    logo_square_url: d.logo_square_url,
  }
})

const insuranceTypes = [
  { value: 'auto', label: 'Autoversicherung', icon: '🚗' },
  { value: 'motorrad', label: 'Motorrad', icon: '🏍️' },
  { value: 'hausrat', label: 'Hausrat', icon: '🏠' },
  { value: 'privathaftpflicht', label: 'Privathaftpflicht', icon: '🤝' },
  { value: 'rechtsschutz', label: 'Rechtsschutz', icon: '⚖️' },
  { value: 'krankenversicherung', label: 'Kranken-versicherung', icon: '🏥' },
  { value: 'lebensversicherung', label: 'Lebens-versicherung', icon: '❤️' },
  { value: 'reise', label: 'Reise', icon: '✈️' },
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
