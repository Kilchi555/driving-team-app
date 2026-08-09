<template>
  <div class="addons-page">
    <header class="addons-top">
      <div>
        <h1>Add-on Seiten</h1>
        <p>Standort-, Kategorie- und Preisseiten — Input liefern, AI generiert Draft, du reviewst.</p>
      </div>
      <div class="addons-actions">
        <NuxtLink to="/admin/website/editor" class="btn-ghost">One-Pager Editor</NuxtLink>
      </div>
    </header>

    <div v-if="loading" class="card">Lädt…</div>

    <div v-else-if="!enabled" class="card locked">
      <h2>Noch nicht freigeschaltet</h2>
      <p>
        Add-on-Seiten sind ein Aufpreis-Feature. Bitte Simy kontaktieren, damit Superadmin die
        Freischaltung setzt.
      </p>
    </div>

    <template v-else>
      <section class="card">
        <h2>Neue Seite generieren</h2>
        <div class="type-row">
          <button
            v-for="t in pageTypes"
            :key="t.id"
            type="button"
            class="type-btn"
            :class="{ active: form.page_type === t.id }"
            @click="form.page_type = t.id"
          >
            <strong>{{ t.label }}</strong>
            <span>{{ t.hint }}</span>
          </button>
        </div>

        <div class="form-grid">
          <div v-if="form.page_type === 'location'">
            <label>Stadt / Standort *</label>
            <input v-model="form.city" placeholder="z.B. Zürich" />
          </div>
          <div v-if="form.page_type === 'category'">
            <label>Kategorie / Angebot *</label>
            <input v-model="form.category_name" placeholder="z.B. Motorrad Kategorie A" />
          </div>
          <div>
            <label>Titel (optional)</label>
            <input v-model="form.title" placeholder="Seiten-Titel" />
          </div>
          <div class="full">
            <label>Keywords</label>
            <input v-model="form.keywords" placeholder="fahrschule zürich, online buchen, …" />
          </div>
          <div class="full">
            <label>Referenz-Links (Komma oder Zeilen)</label>
            <textarea v-model="form.links" rows="2" placeholder="https://…" />
          </div>
          <div class="full">
            <label>Notizen für die AI</label>
            <textarea v-model="form.notes" rows="3" placeholder="Was soll betont werden?" />
          </div>
        </div>

        <button type="button" class="btn-primary" :disabled="generating || !canGenerate" @click="generate">
          {{ generating ? 'Generiert…' : 'AI Draft erzeugen' }}
        </button>
        <p v-if="genMsg" class="msg">{{ genMsg }}</p>
      </section>

      <section class="card">
        <h2>Deine Add-on Seiten</h2>
        <div v-if="!pages.length" class="empty">Noch keine Add-on-Seiten.</div>
        <ul v-else class="page-list">
          <li v-for="p in pages" :key="p.id">
            <div>
              <strong>{{ p.title }}</strong>
              <span class="meta">{{ typeLabel(p.page_type) }} · /{{ p.slug }} · {{ p.is_published ? 'Live' : 'Draft' }}</span>
            </div>
            <div class="row-actions">
              <NuxtLink :to="`/admin/website/editor?page=${encodeURIComponent(p.slug)}`" class="btn-ghost">
                Review
              </NuxtLink>
              <a
                :href="`/s/${subdomain}/${p.slug}?preview=1`"
                target="_blank"
                rel="noopener"
                class="btn-ghost"
              >
                Preview
              </a>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const { primaryColor } = useTenantBranding()

const pageTypes = [
  { id: 'location' as const, label: 'Standort', hint: 'Lokale Landingpage' },
  { id: 'category' as const, label: 'Kategorie', hint: 'Angebots-Seite' },
  { id: 'prices' as const, label: 'Preise', hint: 'Preistransparenz' },
]

const loading = ref(true)
const enabled = ref(false)
const pages = ref<any[]>([])
const subdomain = ref('')
const generating = ref(false)
const genMsg = ref('')

const form = reactive({
  page_type: 'location' as 'location' | 'category' | 'prices',
  city: '',
  category_name: '',
  title: '',
  keywords: '',
  links: '',
  notes: '',
})

const canGenerate = computed(() => {
  if (form.page_type === 'location') return !!form.city.trim() || !!form.title.trim()
  if (form.page_type === 'category') return !!form.category_name.trim() || !!form.title.trim()
  return true
})

function typeLabel(t: string) {
  if (t === 'location') return 'Standort'
  if (t === 'category') return 'Kategorie'
  if (t === 'prices') return 'Preise'
  return t
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<any>('/api/website/addon/pages')
    enabled.value = !!res.enabled
    pages.value = res.pages || []
    subdomain.value = res.website?.subdomain || ''
  } catch (err: any) {
    genMsg.value = err?.data?.statusMessage || err?.message || 'Laden fehlgeschlagen'
  } finally {
    loading.value = false
  }
}

async function generate() {
  generating.value = true
  genMsg.value = ''
  try {
    const res = await $fetch<any>('/api/website/addon/generate', {
      method: 'POST',
      body: {
        page_type: form.page_type,
        city: form.city,
        category_name: form.category_name,
        title: form.title,
        keywords: form.keywords,
        links: form.links,
        notes: form.notes,
      },
    })
    genMsg.value = res.ai_used ? 'Draft mit AI erstellt.' : 'Draft mit Fallback erstellt (AI offline).'
    await load()
    if (res.editor_url) await navigateTo(res.editor_url)
  } catch (err: any) {
    genMsg.value = err?.data?.statusMessage || err?.message || 'Generieren fehlgeschlagen'
  } finally {
    generating.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.addons-page {
  --c: v-bind(primaryColor);
  padding: 1.25rem 1.5rem 2.5rem;
  max-width: 920px;
  margin: 0 auto;
}
.addons-top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.addons-top h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
}
.addons-top p {
  margin: 0.3rem 0 0;
  color: #5b6577;
  font-size: 0.9rem;
}
.card {
  background: #fff;
  border: 1px solid #e6e9ef;
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.card h2 {
  margin: 0 0 1rem;
  font-size: 1.05rem;
}
.locked {
  text-align: center;
  padding: 2.5rem 1.5rem;
}
.type-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
  margin-bottom: 1rem;
}
.type-btn {
  text-align: left;
  border: 1px solid #d7dbe3;
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: #fff;
  cursor: pointer;
}
.type-btn strong {
  display: block;
  font-size: 0.9rem;
}
.type-btn span {
  font-size: 0.75rem;
  color: #7a8494;
}
.type-btn.active {
  border-color: transparent;
  background: var(--c, #0f766e);
  color: #fff;
}
.type-btn.active span {
  color: rgba(255, 255, 255, 0.8);
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.form-grid .full {
  grid-column: 1 / -1;
}
.form-grid label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.form-grid input,
.form-grid textarea {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.9rem;
}
.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  padding: 0.55rem 0.95rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary {
  background: var(--c, #0f766e);
  color: #fff;
}
.btn-primary:disabled {
  opacity: 0.55;
}
.btn-ghost {
  background: #fff;
  border-color: #d7dbe3;
  color: #1a2333;
}
.msg {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #1a2333;
}
.page-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.page-list li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 0;
  border-bottom: 1px solid #eef1f5;
}
.meta {
  display: block;
  font-size: 0.78rem;
  color: #7a8494;
  margin-top: 0.15rem;
}
.row-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
.empty {
  color: #7a8494;
  font-size: 0.9rem;
}
@media (max-width: 700px) {
  .type-row,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .page-list li {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
