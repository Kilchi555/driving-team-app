<template>
  <div class="editor-page">
    <header class="editor-top">
      <div>
        <h1 class="editor-title">{{ isAddonPage ? 'Add-on Seite bearbeiten' : 'Website bearbeiten' }}</h1>
        <p class="editor-sub">
          <template v-if="isAddonPage">Review der generierten Seite — nur freigegebene Slots.</template>
          <template v-else>Nur freigegebene Felder — Layout und Buchungs-CTA bleiben geschützt.</template>
        </p>
      </div>
      <div class="editor-actions">
        <NuxtLink to="/admin/website/addons" class="btn-ghost">Add-on Seiten</NuxtLink>
        <NuxtLink to="/admin/website/setup" class="btn-ghost">Neu generieren</NuxtLink>
        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener"
          class="btn-ghost"
        >
          Preview öffnen
        </a>
        <button type="button" class="btn-ghost" :disabled="saving" @click="save(false)">
          {{ saving && !publishing ? 'Speichern…' : 'Speichern' }}
        </button>
        <button type="button" class="btn-primary" :disabled="saving" @click="save(true)">
          {{ publishing ? 'Veröffentlichen…' : 'Veröffentlichen' }}
        </button>
      </div>
    </header>

    <div v-if="loadError" class="editor-empty">
      <p>{{ loadError }}</p>
      <NuxtLink to="/admin/website/setup" class="btn-primary">Wizard starten</NuxtLink>
    </div>

    <div v-else-if="loading" class="editor-empty">Lädt…</div>

    <div v-else class="editor-grid">
      <aside class="editor-form">
        <div v-for="group in grouped" :key="group.group" class="slot-group">
          <h2>{{ group.label }}</h2>
          <div v-for="slot in group.slots" :key="slot.id" class="slot-field">
            <label :for="slot.id">{{ slot.label }}</label>
            <p v-if="slot.hint" class="slot-hint">{{ slot.hint }}</p>

            <div v-if="slot.kind === 'image'" class="slot-image">
              <div class="slot-image-preview">
                <img v-if="form[slot.id]" :src="form[slot.id]!" :alt="slot.label" />
                <span v-else>Kein Bild</span>
              </div>
              <label class="btn-upload">
                {{ uploadingSlot === slot.id ? 'Lädt…' : 'Hochladen' }}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                  class="hidden"
                  :disabled="!!uploadingSlot"
                  @change="onUpload($event, slot.id)"
                />
              </label>
            </div>

            <div v-else-if="slot.kind === 'video'" class="slot-video">
              <div class="slot-video-preview">
                <video
                  v-if="form[slot.id]"
                  :src="form[slot.id]!"
                  muted
                  playsinline
                  preload="metadata"
                  controls
                />
                <span v-else>Kein Video</span>
              </div>
              <div class="slot-video-actions">
                <label class="btn-upload">
                  {{ uploadingSlot === slot.id ? 'Lädt…' : 'Video hochladen' }}
                  <input
                    type="file"
                    accept="video/mp4,video/webm,.mp4,.webm"
                    class="hidden"
                    :disabled="!!uploadingSlot"
                    @change="onUpload($event, slot.id)"
                  />
                </label>
                <button
                  v-if="form[slot.id]"
                  type="button"
                  class="btn-ghost btn-sm"
                  :disabled="!!uploadingSlot"
                  @click="form[slot.id] = ''"
                >
                  Entfernen
                </button>
              </div>
              <input
                :id="slot.id"
                v-model="form[slot.id]"
                type="url"
                class="slot-video-url"
                placeholder="oder Video-URL einfügen (https://…)"
              />
            </div>

            <div v-else-if="slot.kind === 'enum'" class="slot-enum">
              <button
                v-for="opt in slot.enumValues || []"
                :key="opt"
                type="button"
                class="enum-btn"
                :class="{ active: form[slot.id] === opt }"
                @click="form[slot.id] = opt"
              >
                {{ opt === 'sie' ? 'Sie' : opt === 'du' ? 'Du' : opt }}
              </button>
            </div>

            <input
              v-else-if="slot.kind === 'color'"
              :id="slot.id"
              v-model="form[slot.id]"
              type="color"
              class="slot-color"
            />

            <textarea
              v-else-if="slot.kind === 'textarea'"
              :id="slot.id"
              v-model="form[slot.id]"
              rows="3"
              :maxlength="slot.maxLength"
            />

            <input
              v-else
              :id="slot.id"
              v-model="form[slot.id]"
              type="text"
              :maxlength="slot.maxLength"
            />

            <p v-if="slot.maxLength && form[slot.id]" class="slot-count">
              {{ (form[slot.id] || '').length }}/{{ slot.maxLength }}
            </p>
          </div>
        </div>
      </aside>

      <section class="editor-preview">
        <div class="preview-toolbar">
          <span>Vorschau</span>
          <div class="viewport-toggle">
            <button
              type="button"
              :class="{ active: viewport === 'desktop' }"
              @click="viewport = 'desktop'"
            >
              Desktop
            </button>
            <button
              type="button"
              :class="{ active: viewport === 'mobile' }"
              @click="viewport = 'mobile'"
            >
              Mobile
            </button>
          </div>
          <button type="button" class="btn-ghost btn-sm" @click="refreshPreview">Aktualisieren</button>
        </div>
        <div class="preview-frame-wrap" :class="`is-${viewport}`">
          <iframe
            v-if="iframeSrc"
            :key="iframeKey"
            :src="iframeSrc"
            title="Website Preview"
            class="preview-iframe"
          />
        </div>
      </section>
    </div>

    <p v-if="statusMsg" class="editor-status">{{ statusMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  getAllSlots,
  getSlotValues,
  groupSlots,
  isLandingPayload,
  type LandingPagePayload,
  type SlotDef,
} from '~/utils/website-slot-schema'
import { useTenantBranding } from '~/composables/useTenantBranding'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const { primaryColor } = useTenantBranding()

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const publishing = ref(false)
const statusMsg = ref('')
const uploadingSlot = ref('')
const viewport = ref<'desktop' | 'mobile'>('desktop')
const iframeKey = ref(0)
const subdomain = ref('')
const previewUrl = ref('')
const currentSlug = ref('index')
const isAddonPage = ref(false)
const form = reactive<Record<string, string | null>>({})
const slotDefs = ref<SlotDef[]>([])

const grouped = computed(() => groupSlots(slotDefs.value))
const pageQuerySlug = computed(() => {
  const raw = route.query.page
  const s = Array.isArray(raw) ? raw[0] : raw
  return s ? String(s).trim() : ''
})

const iframeSrc = computed(() => {
  if (!subdomain.value) return ''
  const path =
    isAddonPage.value && currentSlug.value && currentSlug.value !== 'index'
      ? `/s/${encodeURIComponent(subdomain.value)}/${encodeURIComponent(currentSlug.value)}`
      : `/s/${encodeURIComponent(subdomain.value)}`
  return `${path}?preview=1&_=${iframeKey.value}`
})

function hydrateForm(landing: LandingPagePayload) {
  slotDefs.value = getAllSlots(landing)
  const values = getSlotValues(landing)
  for (const key of Object.keys(form)) delete form[key]
  for (const [k, v] of Object.entries(values)) {
    form[k] = v
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    await $fetch('/api/website/init', { method: 'POST' }).catch(() => null)
    const slug = pageQuerySlug.value || 'index'
    const res = await $fetch<any>(`/api/website/pages/${encodeURIComponent(slug)}`)
    const landing = res?.page?.blocks
    if (!isLandingPayload(landing)) {
      loadError.value = pageQuerySlug.value
        ? 'Add-on Seite nicht gefunden.'
        : 'Noch keine Website-Inhalte. Bitte zuerst den Wizard abschliessen.'
      return
    }
    subdomain.value = res?.website?.subdomain || ''
    currentSlug.value = res?.page?.slug || slug
    isAddonPage.value = !res?.page?.is_home && res?.page?.page_type !== 'home'
    previewUrl.value =
      subdomain.value && isAddonPage.value
        ? `/s/${encodeURIComponent(subdomain.value)}/${encodeURIComponent(currentSlug.value)}?preview=1`
        : subdomain.value
          ? `/s/${encodeURIComponent(subdomain.value)}?preview=1`
          : ''
    hydrateForm(landing)
  } catch (err: any) {
    loadError.value =
      err?.data?.statusMessage ||
      err?.message ||
      'Website konnte nicht geladen werden. Wizard starten?'
  } finally {
    loading.value = false
  }
}

async function save(publish: boolean) {
  saving.value = true
  publishing.value = publish
  statusMsg.value = ''
  try {
    const slots: Record<string, string> = {}
    for (const slot of slotDefs.value) {
      slots[slot.id] = form[slot.id] ?? ''
    }
    const res = await $fetch<any>('/api/website/slots-save', {
      method: 'POST',
      body: {
        slots,
        publish,
        slug: currentSlug.value || undefined,
      },
    })
    if (res?.landing && isLandingPayload(res.landing)) {
      hydrateForm(res.landing)
    }
    statusMsg.value = publish ? 'Veröffentlicht.' : 'Gespeichert.'
    refreshPreview()
  } catch (err: any) {
    statusMsg.value = err?.data?.statusMessage || err?.message || 'Speichern fehlgeschlagen'
  } finally {
    saving.value = false
    publishing.value = false
  }
}

function mediaUploadSlotFor(slotId: string): 'logo' | 'hero' | 'hero_video' {
  if (slotId === 'brand.hero_video_url') return 'hero_video'
  if (slotId === 'brand.hero_image_url' || slotId.includes('hero_image')) return 'hero'
  return 'logo'
}

async function onUpload(event: Event, slotId: string) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const slot = mediaUploadSlotFor(slotId)
  uploadingSlot.value = slotId
  statusMsg.value = ''
  try {
    const body = new FormData()
    body.append('slot', slot)
    body.append('file', file)
    const res = await $fetch<any>('/api/website/media/upload', {
      method: 'POST',
      body,
    })
    form[slotId] = res.url || res.webp_url
    // Keep brand hero/logo synced if related
    if (slot === 'logo' && slotId !== 'brand.logo_url') form['brand.logo_url'] = form[slotId]
    if (slot === 'hero' && slotId !== 'brand.hero_image_url') form['brand.hero_image_url'] = form[slotId]
    if (slot === 'hero_video' && slotId !== 'brand.hero_video_url') {
      form['brand.hero_video_url'] = form[slotId]
    }
    statusMsg.value =
      slot === 'hero_video'
        ? 'Video hochgeladen — bitte speichern. (Kein Transcode: ≤720p empfohlen.)'
        : 'Bild hochgeladen — bitte speichern.'
  } catch (err: any) {
    statusMsg.value = err?.data?.statusMessage || err?.message || 'Upload fehlgeschlagen'
  } finally {
    uploadingSlot.value = ''
    if (input) input.value = ''
  }
}

function refreshPreview() {
  iframeKey.value += 1
}

watch(pageQuerySlug, () => {
  load()
})

onMounted(load)
</script>

<style scoped>
.editor-page {
  --ed-primary: v-bind(primaryColor);
  min-height: 100%;
  padding: 1.25rem 1.5rem 2.5rem;
  background: linear-gradient(160deg, #f6f4f0 0%, #eef2f6 100%);
}
.editor-top {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}
.editor-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0c1222;
  margin: 0;
}
.editor-sub {
  margin: 0.25rem 0 0;
  color: #5b6577;
  font-size: 0.9rem;
}
.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.btn-primary,
.btn-ghost,
.btn-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  padding: 0.55rem 0.95rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
}
.btn-primary {
  background: var(--ed-primary, #0f766e);
  color: #fff;
}
.btn-primary:disabled,
.btn-ghost:disabled,
.btn-upload:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-ghost,
.btn-upload {
  background: #fff;
  border-color: #d7dbe3;
  color: #1a2333;
}
.btn-sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
}
.editor-empty {
  background: #fff;
  border-radius: 1rem;
  padding: 2.5rem;
  text-align: center;
  display: grid;
  gap: 1rem;
  place-items: center;
  color: #5b6577;
}
.editor-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) 1fr;
  gap: 1rem;
  align-items: start;
}
@media (max-width: 1100px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}
.editor-form {
  background: #fff;
  border-radius: 1rem;
  border: 1px solid #e6e9ef;
  padding: 1rem 1.1rem 1.5rem;
  max-height: calc(100vh - 10rem);
  overflow: auto;
}
.slot-group + .slot-group {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #eef1f5;
}
.slot-group h2 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a8494;
  margin: 0 0 0.85rem;
}
.slot-field {
  margin-bottom: 0.9rem;
}
.slot-field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1a2333;
  margin-bottom: 0.3rem;
}
.slot-hint {
  font-size: 0.72rem;
  color: #7a8494;
  margin: -0.15rem 0 0.35rem;
}
.slot-field input[type='text'],
.slot-field textarea {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.9rem;
  background: #fafbfc;
}
.slot-field input:focus,
.slot-field textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--ed-primary, #0f766e) 35%, transparent);
  border-color: var(--ed-primary, #0f766e);
}
.slot-color {
  width: 3rem;
  height: 2.25rem;
  border: 1px solid #d7dbe3;
  border-radius: 0.5rem;
  padding: 0;
  background: transparent;
}
.slot-count {
  font-size: 0.7rem;
  color: #8a93a3;
  margin: 0.2rem 0 0;
  text-align: right;
}
.slot-enum {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}
.enum-btn {
  border: 1px solid #d7dbe3;
  background: #fff;
  border-radius: 0.65rem;
  padding: 0.55rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.enum-btn.active {
  background: var(--ed-primary, #0f766e);
  border-color: transparent;
  color: #fff;
}
.slot-image {
  display: grid;
  gap: 0.5rem;
}
.slot-image-preview {
  height: 5.5rem;
  border-radius: 0.75rem;
  background: #f3f5f8;
  border: 1px dashed #c9d0db;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #9aa3b2;
  font-size: 0.8rem;
}
.slot-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.slot-video {
  display: grid;
  gap: 0.5rem;
}
.slot-video-preview {
  height: 9rem;
  border-radius: 0.75rem;
  background: #0c1222;
  border: 1px dashed #c9d0db;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #9aa3b2;
  font-size: 0.8rem;
}
.slot-video-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.slot-video-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.slot-video-url {
  width: 100%;
  border: 1px solid #d7dbe3;
  border-radius: 0.65rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.875rem;
  background: #fff;
}
.hidden {
  display: none;
}
.editor-preview {
  background: #fff;
  border-radius: 1rem;
  border: 1px solid #e6e9ef;
  overflow: hidden;
  min-height: 70vh;
  display: flex;
  flex-direction: column;
}
.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #eef1f5;
  font-size: 0.85rem;
  font-weight: 600;
  color: #5b6577;
}
.viewport-toggle {
  display: inline-flex;
  border: 1px solid #d7dbe3;
  border-radius: 0.55rem;
  overflow: hidden;
  margin-left: auto;
}
.viewport-toggle button {
  border: 0;
  background: #fff;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
  color: #5b6577;
}
.viewport-toggle button.active {
  background: #0c1222;
  color: #fff;
}
.preview-frame-wrap {
  flex: 1;
  background: #e8ebf0;
  display: flex;
  justify-content: center;
  padding: 0.75rem;
  min-height: 64vh;
}
.preview-frame-wrap.is-mobile .preview-iframe {
  width: 390px;
  max-width: 100%;
  border-radius: 1rem;
  box-shadow: 0 12px 40px rgba(12, 18, 34, 0.18);
}
.preview-iframe {
  width: 100%;
  height: 100%;
  min-height: 64vh;
  border: 0;
  background: #fff;
}
.editor-status {
  margin-top: 0.85rem;
  font-size: 0.85rem;
  color: #1a2333;
}
</style>
