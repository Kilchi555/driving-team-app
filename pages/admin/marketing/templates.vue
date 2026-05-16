<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink to="/admin/marketing" class="text-gray-400 hover:text-gray-600">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">Email-Templates</h1>
          </div>
          <button
            @click="openCreate"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Neues Template
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      <!-- Variable Hint -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p class="text-sm text-blue-800">
          <strong>Verfügbare Variablen:</strong>
          <code class="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs" v-text="'{{first_name}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs" v-text="'{{last_name}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs" v-text="'{{email}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs" v-text="'{{consent_link}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs" v-text="'{{unsubscribe_link}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-xs" v-text="'{{tenant_name}}'"></code>
          — werden beim Versand pro Lead ersetzt.
          <span class="block mt-1"><strong v-text="'{{consent_link}}'"></strong> = Opt-In-Button (für Re-Consent) · <strong v-text="'{{unsubscribe_link}}'"></strong> = Abmelde-Link</span>
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="templates.length === 0" class="text-center py-16 bg-white rounded-xl border">
        <svg class="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p class="text-gray-500 mb-4">Noch keine Templates vorhanden</p>
        <button @click="openCreate" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Erstes Template erstellen
        </button>
      </div>

      <!-- Template Grid -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="t in templates"
          :key="t.id"
          class="bg-white rounded-xl border p-5 hover:border-blue-200 transition-colors"
        >
          <div class="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ t.name }}</h3>
              <p class="text-sm text-gray-500 mt-0.5">{{ t.subject }}</p>
            </div>
            <div class="flex gap-1 shrink-0">
              <button @click="openEdit(t)" class="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button @click="confirmDelete(t)" class="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div class="text-xs text-gray-400">
            Erstellt {{ formatDate(t.created_at) }}
          </div>
          <div class="mt-3 text-xs text-gray-500 line-clamp-2 bg-gray-50 rounded p-2 font-mono" v-html="t.html_body.replace(/<[^>]+>/g, ' ').slice(0, 120) + '...'" />
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="modalOpen" class="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        <div class="flex items-center justify-between p-6 border-b">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ editingTemplate ? 'Template bearbeiten' : 'Neues Template' }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name <span class="text-red-500">*</span></label>
            <input v-model="form.name" type="text" placeholder="z.B. Willkommens-Email Motorrad" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Betreff <span class="text-red-500">*</span></label>
            <input v-model="form.subject" type="text" placeholder="z.B. Hallo {{first_name}}, wir haben ein Angebot für dich" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-sm font-medium text-gray-700">HTML-Inhalt <span class="text-red-500">*</span></label>
              <button @click="viewMode = viewMode === 'edit' ? 'preview' : 'edit'" class="text-xs text-blue-600 hover:underline">
                {{ viewMode === 'edit' ? 'Vorschau' : 'Editor' }}
              </button>
            </div>

            <!-- Editor -->
            <div v-if="viewMode === 'edit'">
              <textarea
                v-model="form.html_body"
                rows="14"
                placeholder="<h2>Hallo {{first_name}},</h2><p>...</p>"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              <p class="text-xs text-gray-400 mt-1">HTML + Variablen wie <code>&#123;&#123;first_name&#125;&#125;</code>, <code>&#123;&#123;consent_link&#125;&#125;</code>. Abmelde-Link: <code>&#123;&#123;unsubscribe_link&#125;&#125;</code></p>
            </div>

            <!-- Preview -->
            <div v-else class="border rounded-lg bg-gray-50 p-4 min-h-48">
              <iframe
                v-if="form.html_body"
                :srcdoc="form.html_body"
                class="w-full h-64 border-0 rounded"
                sandbox="allow-same-origin"
              />
              <p v-else class="text-sm text-gray-400 text-center py-8">Kein Inhalt zum Anzeigen</p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 p-6 border-t">
          <button @click="closeModal" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveTemplate" :disabled="saving || !form.name || !form.subject || !form.html_body" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {{ saving ? 'Speichere...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Email-Templates - Admin' })

const authStore = useAuthStore()
const templates = ref<any[]>([])
const loading = ref(true)
const modalOpen = ref(false)
const editingTemplate = ref<any>(null)
const saving = ref(false)
const viewMode = ref<'edit' | 'preview'>('edit')

const form = reactive({ name: '', subject: '', html_body: '' })

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

async function loadTemplates() {
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  loading.value = true
  try {
    const res = await $fetch<any>('/api/marketing/templates', { query: { tenantId } })
    templates.value = res.templates
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingTemplate.value = null
  form.name = ''
  form.subject = ''
  form.html_body = ''
  viewMode.value = 'edit'
  modalOpen.value = true
}

function openEdit(t: any) {
  editingTemplate.value = t
  form.name = t.name
  form.subject = t.subject
  form.html_body = t.html_body
  viewMode.value = 'edit'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editingTemplate.value = null
}

async function saveTemplate() {
  const tenantId = authStore.userProfile?.tenant_id
  const userId = authStore.userProfile?.id
  if (!tenantId) return
  saving.value = true
  try {
    if (editingTemplate.value) {
      await $fetch(`/api/marketing/templates/${editingTemplate.value.id}`, {
        method: 'PATCH',
        body: { tenantId, ...form },
      })
    } else {
      await $fetch('/api/marketing/templates', {
        method: 'POST',
        body: { tenantId, createdBy: userId, ...form },
      })
    }
    closeModal()
    await loadTemplates()
  } finally {
    saving.value = false
  }
}

async function confirmDelete(t: any) {
  if (!confirm(`Template "${t.name}" wirklich löschen?`)) return
  const tenantId = authStore.userProfile?.tenant_id
  if (!tenantId) return
  await $fetch(`/api/marketing/templates/${t.id}`, {
    method: 'DELETE',
    query: { tenantId },
  })
  await loadTemplates()
}

onMounted(loadTemplates)
</script>
