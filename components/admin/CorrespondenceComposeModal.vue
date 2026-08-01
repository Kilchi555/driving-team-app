<template>
  <div class="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4" @click.self="$emit('close')">
    <div class="fixed inset-0 bg-gray-900/60 transition-opacity" @click="$emit('close')" />

    <div class="admin-modal relative w-full min-w-0 bg-white shadow-xl transition-all
                rounded-t-2xl max-h-[95dvh]
                sm:rounded-2xl sm:max-w-2xl sm:max-h-[90dvh]
                flex flex-col overflow-hidden">
      <div class="flex-none sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div class="flex justify-center pt-3 pb-1 sm:hidden">
          <div class="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <h3 class="text-base font-semibold text-gray-900 truncate min-w-0">Brief schreiben</h3>
          <button type="button" class="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1" @click="$emit('close')">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <form class="flex flex-col flex-1 min-h-0 min-w-0" @submit.prevent="onSubmit('send')">
        <div class="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5 space-y-5">
          <!-- Empfänger -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Empfänger *</label>
            <div v-if="selectedLabel"
              class="flex items-center justify-between px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  :style="{ background: form.company_id ? '#f97316' : primaryColor }">
                  {{ form.company_id ? '🏢' : selectedLabel.charAt(0).toUpperCase() }}
                </span>
                <span class="font-medium text-gray-900 truncate">{{ selectedLabel }}</span>
              </div>
              <button type="button" class="p-1.5 rounded-lg hover:bg-green-100 text-green-600" @click="clearRecipient">✕</button>
            </div>
            <div v-else class="relative">
              <input v-model="search" type="search" placeholder="Kunde oder Firma suchen…"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                @input="onSearch" />
              <div v-if="results.length"
                class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                <button v-for="r in results" :key="r.type + r.id" type="button"
                  class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                  @click="applyRecipient(r)">
                  <span class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    :style="{ background: r.type === 'company' ? '#f97316' : primaryColor }">
                    {{ r.type === 'company' ? '🏢' : (r.name?.charAt(0) || '?').toUpperCase() }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ r.name }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ r.subtitle }}</p>
                  </div>
                </button>
              </div>
            </div>
            <p v-if="addressPreview" class="mt-2 text-xs text-gray-500 whitespace-pre-line">{{ addressPreview }}</p>
          </div>

          <!-- Snippets -->
          <div class="flex flex-wrap gap-2">
            <button v-for="s in snippets" :key="s.id" type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
              @click="applySnippet(s)">
              {{ s.label }}
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Betreff *</label>
            <input v-model="form.subject" type="text" required maxlength="200"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="z.B. Terminverschiebung" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Anrede</label>
              <input v-model="form.salutation" type="text"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Sehr geehrte Damen und Herren" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Datum</label>
              <input v-model="form.letter_date" type="date"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Brieftext *</label>
            <textarea v-model="form.body" required rows="8"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
              placeholder="Absätze mit Leerzeile trennen…" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Grussformel</label>
              <input v-model="form.closing" type="text"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Ihr Zeichen</label>
              <input v-model="form.their_reference" type="text"
                class="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="optional" />
            </div>
          </div>

          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>

        <div class="flex-none border-t border-gray-100 px-4 py-3 flex flex-wrap items-center justify-end gap-2 bg-white">
          <button type="button" :disabled="busy" @click="onSubmit('preview')"
            class="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            PDF-Vorschau
          </button>
          <button type="button" :disabled="busy" @click="onSubmit('draft')"
            class="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Als Entwurf speichern
          </button>
          <button type="submit" :disabled="busy"
            class="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            :style="{ background: primaryColor }">
            {{ busy ? 'Sende…' : 'Senden' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

const props = defineProps<{
  initialUser?: {
    id: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    street?: string | null
    street_nr?: string | null
    zip?: string | null
    city?: string | null
  } | null
  initialCompany?: {
    id: string
    name: string
    contact_person?: string | null
    email?: string | null
    street?: string | null
    zip?: string | null
    city?: string | null
  } | null
}>()

const emit = defineEmits<{
  close: []
  saved: [row: any]
}>()

const { primaryColor } = useTenantBranding()

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
const form = ref({
  user_id: '',
  company_id: '',
  subject: '',
  body: '',
  salutation: 'Sehr geehrte Damen und Herren',
  closing: 'Freundliche Grüsse',
  their_reference: '',
  letter_date: today,
  document_title: 'BRIEF',
})

const search = ref('')
const results = ref<any[]>([])
const selectedLabel = ref('')
const addressPreview = ref('')
const busy = ref(false)
const error = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const snippets = [
  {
    id: 'welcome',
    label: 'Willkommen',
    subject: 'Willkommen',
    salutation: 'Guten Tag',
    body: 'Herzlich willkommen bei uns.\n\nWir freuen uns, Sie kennenzulernen und begleiten Sie gerne auf Ihrem Weg.\n\nBei Fragen sind wir jederzeit für Sie da.',
  },
  {
    id: 'cancel',
    label: 'Terminabsage',
    subject: 'Terminabsage',
    salutation: 'Guten Tag',
    body: 'Leider müssen wir den vereinbarten Termin absagen.\n\nBitte melden Sie sich bei uns, damit wir einen neuen Termin finden können.\n\nVielen Dank für Ihr Verständnis.',
  },
  {
    id: 'info',
    label: 'Allgemeine Info',
    subject: 'Information',
    salutation: 'Guten Tag',
    body: 'Wir möchten Sie über Folgendes informieren:\n\n…\n\nBei Rückfragen stehen wir gerne zur Verfügung.',
  },
]

function applySnippet(s: typeof snippets[number]) {
  form.value.subject = s.subject
  form.value.salutation = s.salutation
  form.value.body = s.body
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  if (search.value.length < 1) { results.value = []; return }
  searchTimer = setTimeout(async () => {
    const q = search.value
    const [usersRes, companiesRes]: any[] = await Promise.allSettled([
      $fetch('/api/admin/users/search', { query: { q } }),
      $fetch('/api/admin/companies', { query: { search: q } }),
    ])
    const userList = (usersRes.value?.users || []).map((u: any) => ({
      id: u.id,
      type: 'user',
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      subtitle: u.email || '',
      email: u.email || '',
      street: u.street || '',
      street_nr: u.street_nr || '',
      zip: u.zip || '',
      city: u.city || '',
    }))
    const companyList = (companiesRes.value?.companies || []).map((c: any) => ({
      id: c.id,
      type: 'company',
      name: c.name,
      subtitle: c.contact_person ? `${c.contact_person} · ${c.email || ''}` : (c.email || ''),
      email: c.email || '',
      contact_person: c.contact_person || '',
      street: c.street || '',
      zip: c.zip || '',
      city: c.city || '',
    }))
    results.value = [...userList, ...companyList].slice(0, 10)
  }, 280)
}

function applyRecipient(r: any) {
  results.value = []
  search.value = ''
  if (r.type === 'company') {
    form.value.company_id = r.id
    form.value.user_id = ''
    selectedLabel.value = r.name
    addressPreview.value = [r.name, r.contact_person, r.street, [r.zip, r.city].filter(Boolean).join(' '), r.email]
      .filter(Boolean).join('\n')
    if (r.contact_person) {
      form.value.salutation = `Sehr geehrte/r ${r.contact_person}`
    }
  } else {
    form.value.user_id = r.id
    form.value.company_id = ''
    selectedLabel.value = `${r.name}${r.email ? ` — ${r.email}` : ''}`
    addressPreview.value = [r.name, [r.street, r.street_nr].filter(Boolean).join(' '), [r.zip, r.city].filter(Boolean).join(' '), r.email]
      .filter(Boolean).join('\n')
    if (r.name) form.value.salutation = `Guten Tag ${r.name}`
  }
}

function clearRecipient() {
  form.value.user_id = ''
  form.value.company_id = ''
  selectedLabel.value = ''
  addressPreview.value = ''
}

function payload() {
  return {
    user_id: form.value.user_id || null,
    company_id: form.value.company_id || null,
    subject: form.value.subject.trim(),
    body: form.value.body.trim(),
    salutation: form.value.salutation.trim() || null,
    closing: form.value.closing.trim() || 'Freundliche Grüsse',
    their_reference: form.value.their_reference.trim() || null,
    letter_date: form.value.letter_date,
    document_title: form.value.document_title,
  }
}

async function onSubmit(mode: 'preview' | 'draft' | 'send') {
  error.value = ''
  if (!form.value.user_id && !form.value.company_id) {
    error.value = 'Bitte Empfänger wählen'
    return
  }
  if (!form.value.subject.trim() || !form.value.body.trim()) {
    error.value = 'Betreff und Brieftext sind erforderlich'
    return
  }

  busy.value = true
  try {
    if (mode === 'preview') {
      const res = await $fetch<{ pdfUrl: string }>('/api/correspondence/preview-pdf', {
        method: 'POST',
        body: payload(),
      })
      if (res.pdfUrl) window.open(res.pdfUrl, '_blank')
      return
    }
    if (mode === 'draft') {
      const res = await $fetch<{ data: any }>('/api/correspondence/create', {
        method: 'POST',
        body: payload(),
      })
      emit('saved', res.data)
      emit('close')
      return
    }
    const res = await $fetch<{ data: any; pdfUrl?: string }>('/api/correspondence/send', {
      method: 'POST',
      body: { ...payload(), send_email: true },
    })
    emit('saved', res.data)
    emit('close')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Fehler beim Speichern'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (props.initialCompany) {
    applyRecipient({
      type: 'company',
      id: props.initialCompany.id,
      name: props.initialCompany.name,
      contact_person: props.initialCompany.contact_person || '',
      email: props.initialCompany.email || '',
      street: props.initialCompany.street || '',
      zip: props.initialCompany.zip || '',
      city: props.initialCompany.city || '',
      subtitle: '',
    })
  } else if (props.initialUser) {
    const name = `${props.initialUser.first_name || ''} ${props.initialUser.last_name || ''}`.trim()
    applyRecipient({
      type: 'user',
      id: props.initialUser.id,
      name,
      email: props.initialUser.email || '',
      street: props.initialUser.street || '',
      street_nr: props.initialUser.street_nr || '',
      zip: props.initialUser.zip || '',
      city: props.initialUser.city || '',
      subtitle: props.initialUser.email || '',
    })
  }
})
</script>
