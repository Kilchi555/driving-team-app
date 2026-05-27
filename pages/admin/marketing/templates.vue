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
            class="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
            :style="{ background: primaryColor }"
          >
            + Neues Template
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      <!-- Variable Hint -->
      <div class="rounded-xl p-4 mb-6 border"
        :style="{ background: `${primaryColor}10`, borderColor: `${primaryColor}33` }">
        <p class="text-sm" :style="{ color: primaryColor }">
          <strong>Verfügbare Variablen:</strong>
          <code class="mx-1 px-1.5 py-0.5 rounded text-xs" :style="{ background: `${primaryColor}1f` }" v-text="'{{first_name}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 rounded text-xs" :style="{ background: `${primaryColor}1f` }" v-text="'{{last_name}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 rounded text-xs" :style="{ background: `${primaryColor}1f` }" v-text="'{{email}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 rounded text-xs" :style="{ background: `${primaryColor}1f` }" v-text="'{{consent_link}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 rounded text-xs" :style="{ background: `${primaryColor}1f` }" v-text="'{{unsubscribe_link}}'"></code>
          <code class="mx-1 px-1.5 py-0.5 rounded text-xs" :style="{ background: `${primaryColor}1f` }" v-text="'{{tenant_name}}'"></code>
          — werden beim Versand pro Lead ersetzt.
          <span class="block mt-1"><strong v-text="'{{consent_link}}'"></strong> = Opt-In-Button (für Re-Consent) · <strong v-text="'{{unsubscribe_link}}'"></strong> = Abmelde-Link</span>
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2" :style="{ borderBottomColor: primaryColor }"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="templates.length === 0" class="text-center py-16 bg-white rounded-xl border">
        <svg class="mx-auto w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p class="text-gray-500 mb-4">Noch keine Templates vorhanden</p>
        <button @click="openCreate" class="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
          :style="{ background: primaryColor }">
          Erstes Template erstellen
        </button>
      </div>

      <!-- Template Grid -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="t in templates"
          :key="t.id"
          class="tenant-card-hover bg-white rounded-xl border p-5 transition-colors"
        >
          <div class="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ t.name }}</h3>
              <p class="text-sm text-gray-500 mt-0.5">{{ t.subject }}</p>
            </div>
            <div class="flex gap-1 shrink-0">
              <button @click="openEdit(t)" class="p-1.5 text-gray-400 tenant-hover-primary tenant-hover-bg transition-colors rounded-lg">
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

        <div class="p-6 space-y-5">

          <!-- Template Name + Subject -->
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Interner Name <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" placeholder="z.B. Willkommens-Email Motorrad" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email-Betreff <span class="text-red-500">*</span></label>
              <input v-model="form.subject" type="text" placeholder="z.B. Ein Angebot für dich 🎉" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
              <p class="text-xs text-gray-400 mt-1">Du kannst <span class="font-mono">&#123;&#123;first_name&#125;&#125;</span> im Betreff verwenden.</p>
            </div>
          </div>

          <!-- Mode toggle -->
          <div class="flex items-center gap-2 border-b pb-3">
            <button
              @click="editorMode = 'simple'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
              :class="editorMode === 'simple' ? 'text-white' : 'text-gray-500 hover:bg-gray-100'"
              :style="editorMode === 'simple' ? { background: primaryColor } : {}"
            >
              ✏️ Einfacher Editor
            </button>
            <button
              @click="editorMode = 'html'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
              :class="editorMode === 'html' ? 'text-white' : 'text-gray-500 hover:bg-gray-100'"
              :style="editorMode === 'html' ? { background: primaryColor } : {}"
            >
              🧑‍💻 HTML (Profi)
            </button>
            <button
              @click="editorMode = 'preview'"
              class="px-3 py-1.5 rounded-lg text-sm font-medium transition"
              :class="editorMode === 'preview' ? 'text-white' : 'text-gray-500 hover:bg-gray-100'"
              :style="editorMode === 'preview' ? { background: primaryColor } : {}"
            >
              👁 Vorschau
            </button>
          </div>

          <!-- SIMPLE EDITOR -->
          <div v-if="editorMode === 'simple'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Überschrift im Email</label>
              <input v-model="simple.headline" type="text" placeholder="z.B. Verdiene bis zu CHF 70.– pro Empfehlung" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nachricht <span class="text-red-500">*</span></label>
              <textarea
                v-model="simple.body"
                rows="6"
                placeholder="Schreib hier deine Nachricht. Drücke Enter für einen neuen Absatz.&#10;&#10;Du kannst {{first_name}} für den Vornamen verwenden."
                class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 resize-y"
              />
              <p class="text-xs text-gray-400 mt-1">Tipp: <span class="font-mono">&#123;&#123;first_name&#125;&#125;</span> wird durch den Vornamen der Person ersetzt.</p>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 space-y-3">
              <div class="flex items-center gap-2">
                <input type="checkbox" v-model="simple.showCta" id="showCta" class="rounded" />
                <label for="showCta" class="text-sm font-medium text-gray-700">Button hinzufügen (z.B. "Jetzt anmelden")</label>
              </div>
              <div v-if="simple.showCta" class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Button-Text</label>
                  <input v-model="simple.ctaText" type="text" placeholder="Jetzt Partner werden →" class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">Link (URL)</label>
                  <input v-model="simple.ctaUrl" type="url" placeholder="https://..." class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2" />
                </div>
              </div>
            </div>

            <div class="bg-gray-50 rounded-xl p-4 space-y-3">
              <div class="flex items-center gap-2">
                <input type="checkbox" v-model="simple.showConsent" id="showConsent" class="rounded" />
                <label for="showConsent" class="text-sm font-medium text-gray-700">Opt-in / Opt-out Sektion anzeigen</label>
              </div>
              <p v-if="simple.showConsent" class="text-xs text-gray-500">
                Fügt automatisch einen "Ja, ich bin dabei" Button und einen Abmelde-Link ein. Pflicht für Re-Consent Kampagnen.
              </p>
            </div>
          </div>

          <!-- HTML EDITOR -->
          <div v-else-if="editorMode === 'html'">
            <textarea
              v-model="form.html_body"
              rows="16"
              placeholder="<h2>Hallo {{first_name}},</h2><p>...</p>"
              class="tenant-focus w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 resize-y"
            />
            <p class="text-xs text-gray-400 mt-1">Variablen: <code>&#123;&#123;first_name&#125;&#125;</code> <code>&#123;&#123;tenant_name&#125;&#125;</code> <code>&#123;&#123;consent_link&#125;&#125;</code> <code>&#123;&#123;unsubscribe_link&#125;&#125;</code></p>
          </div>

          <!-- PREVIEW -->
          <div v-else class="border rounded-xl bg-gray-50 overflow-hidden">
            <iframe
              v-if="previewHtml"
              :srcdoc="previewHtml"
              class="w-full h-96 border-0"
              sandbox="allow-same-origin allow-scripts"
            />
            <p v-else class="text-sm text-gray-400 text-center py-12">Kein Inhalt zum Anzeigen</p>
          </div>

        </div>

        <div class="flex justify-end gap-2 p-6 border-t">
          <button @click="closeModal" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            Abbrechen
          </button>
          <button @click="saveTemplate" :disabled="saving || !form.name || !form.subject || !finalHtml" class="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            :style="{ background: primaryColor }">
            {{ saving ? 'Speichere...' : 'Speichern' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useHead } from '#app'
import { useAuthStore } from '~/stores/auth'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Email-Templates - Admin' })

const { primaryColor } = useTenantBranding()

const authStore = useAuthStore()
const templates = ref<any[]>([])
const loading = ref(true)
const tenantName = ref('Fahrschule')
const tenantColor = ref('#6366f1')
const modalOpen = ref(false)
const editingTemplate = ref<any>(null)
const saving = ref(false)
const editorMode = ref<'simple' | 'html' | 'preview'>('simple')

const form = reactive({ name: '', subject: '', html_body: '' })

// Simple editor fields — generate HTML automatically
const simple = reactive({
  headline: '',
  body: '',
  showCta: false,
  ctaText: 'Mehr erfahren →',
  ctaUrl: '',
  showConsent: true,
})

// Converts the simple form fields into a clean HTML email body
const generatedHtml = computed(() => {
  const paragraphs = simple.body
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n')

  const headline = simple.headline
    ? `<h2 style="margin:0 0 20px;color:#111827;font-size:22px;font-weight:800">${simple.headline}</h2>`
    : ''

  const cta = simple.showCta && simple.ctaText
    ? `<a href="${simple.ctaUrl || '#'}" style="display:block;background:{{primary_color}};color:#fff;text-decoration:none;text-align:center;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;margin:28px 0">${simple.ctaText}</a>`
    : ''

  const consent = simple.showConsent
    ? `<div style="background:#f0f9ff;border:2px solid {{primary_color}};border-radius:16px;padding:28px;margin:32px 0;text-align:center">
        <h3 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700">Darf ich dir ab und zu solche Infos schicken?</h3>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px">Du kannst dich jederzeit wieder abmelden.</p>
        <a href="{{consent_link}}" style="display:inline-block;background:{{primary_color}};color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">✅ Ja, ich bin dabei!</a>
        <a href="{{unsubscribe_link}}" style="display:block;margin-top:14px;color:#9ca3af;font-size:13px;text-decoration:underline">Nein danke, abmelden</a>
      </div>`
    : ''

  return `${headline}${paragraphs}${cta}${consent}`
})

// The final HTML that gets saved — either from simple generator or raw HTML editor.
// When in simple/preview mode and the simple fields haven't been filled yet
// (e.g. complex HTML that couldn't be fully parsed), fall back to the raw html_body
// so the preview stays accurate until the user actually starts editing.
const simpleHasContent = computed(() => !!(simple.headline || simple.body))

const finalHtml = computed(() => {
  if (editorMode.value === 'html') return form.html_body
  if (!simpleHasContent.value && form.html_body) return form.html_body
  return generatedHtml.value
})

// Preview wraps the content in the marketing email shell
const previewHtml = computed(() => {
  const color = tenantColor.value
  const name = tenantName.value
  const content = finalHtml.value
  if (!content) return ''

  // Replace all template variables with realistic preview values
  const rendered = content
    .replace(/\{\{primary_color\}\}/g, color)
    .replace(/\{\{tenant_name\}\}/g, name)
    .replace(/\{\{first_name\}\}/g, 'Max')
    .replace(/\{\{last_name\}\}/g, 'Mustermann')
    .replace(/\{\{email\}\}/g, 'max@beispiel.ch')
    .replace(/\{\{consent_link\}\}/g, '#')
    .replace(/\{\{unsubscribe_link\}\}/g, '#')

  // If template is already a complete HTML document, render it directly
  if (/^\s*<!DOCTYPE/i.test(rendered) || /^\s*<html/i.test(rendered)) {
    return rendered
  }

  // Otherwise wrap the fragment in the standard marketing email shell
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden}
.header{background:${color};padding:24px 32px}
.header h1{margin:0;color:#fff;font-size:18px;font-weight:600}
.body{padding:32px}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}
</style></head><body><div class="wrap">
<div class="header"><h1>${name}</h1></div>
<div class="body">${rendered}</div>
<div class="footer">${name} &middot; <a href="#" style="color:#9ca3af">Abmelden</a></div>
</div></body></html>`
})

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
  simple.headline = ''
  simple.body = ''
  simple.showCta = false
  simple.ctaText = 'Mehr erfahren →'
  simple.ctaUrl = ''
  simple.showConsent = true
  editorMode.value = 'simple'
  modalOpen.value = true
}

function parseHtmlToSimple(html: string) {
  const div = document.createElement('div')
  div.innerHTML = html

  // Headline: first <h2>
  const h2 = div.querySelector('h2')
  simple.headline = h2?.textContent?.trim() || ''
  if (h2) h2.remove()

  // CTA button: <a> with inline background style (not unsubscribe/consent)
  const links = Array.from(div.querySelectorAll('a'))
  const ctaLink = links.find(a =>
    a.style.background && !a.href?.includes('unsubscribe') && !a.href?.includes('consent') && a.href !== '#'
  )
  if (ctaLink) {
    simple.showCta = true
    simple.ctaText = ctaLink.textContent?.trim() || ''
    simple.ctaUrl = ctaLink.getAttribute('href') || ''
    ctaLink.closest('div')?.remove() || ctaLink.remove()
  } else {
    simple.showCta = false
    simple.ctaText = 'Mehr erfahren →'
    simple.ctaUrl = ''
  }

  // Consent section: detect {{consent_link}}
  simple.showConsent = html.includes('{{consent_link}}')
  if (simple.showConsent) {
    div.querySelectorAll('div').forEach(d => {
      if (d.innerHTML.includes('consent_link')) d.remove()
    })
  }

  // Body: remaining <p> text joined with double newlines
  const paragraphs = Array.from(div.querySelectorAll('p'))
    .map(p => p.textContent?.trim())
    .filter(Boolean)
  simple.body = paragraphs.join('\n\n')
}

function openEdit(t: any) {
  editingTemplate.value = t
  form.name = t.name
  form.subject = t.subject
  form.html_body = t.html_body
  simple.headline = ''
  simple.body = ''
  simple.showCta = false
  simple.ctaText = 'Mehr erfahren →'
  simple.ctaUrl = ''
  simple.showConsent = false
  parseHtmlToSimple(t.html_body)
  editorMode.value = 'simple'
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
    const html_body = finalHtml.value
    if (editingTemplate.value) {
      await $fetch(`/api/marketing/templates/${editingTemplate.value.id}`, {
        method: 'PATCH',
        body: { tenantId, name: form.name, subject: form.subject, html_body },
      })
    } else {
      await $fetch('/api/marketing/templates', {
        method: 'POST',
        body: { tenantId, createdBy: userId, name: form.name, subject: form.subject, html_body },
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

onMounted(async () => {
  await loadTemplates()
  // Load tenant branding for realistic preview (cached on server, fast)
  const tenantId = authStore.userProfile?.tenant_id
  if (tenantId) {
    try {
      const res = await $fetch<any>('/api/tenants/branding', { query: { id: tenantId } })
      if (res?.data) {
        tenantName.value = res.data.brand_name || res.data.name || 'Fahrschule'
        tenantColor.value = res.data.primary_color || '#6366f1'
      }
    } catch {}
  }
})
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--color-primary, #1E40AF);
  border-color: var(--color-primary, #1E40AF);
}
.tenant-hover-primary:hover {
  color: var(--color-primary, #1E40AF);
}
.tenant-hover-bg:hover {
  background-color: color-mix(in srgb, var(--color-primary, #1E40AF) 8%, transparent);
}
.tenant-card-hover:hover {
  border-color: color-mix(in srgb, var(--color-primary, #1E40AF) 30%, transparent);
}
</style>
