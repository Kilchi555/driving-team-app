<template>
  <div class="whs">
    <p class="whs-hint">
      Kein eigenes Foto? Drei Vorschläge für {{ industry }} holen und antippen.
    </p>
    <div v-if="chips.length" class="whs-chips">
      <button
        v-for="chip in chips"
        :key="chip.hint"
        type="button"
        class="whs-chip"
        :class="{ on: hint === chip.hint }"
        :disabled="!!busy"
        @click="suggest('stock', chip.hint)"
      >
        {{ chip.label }}
      </button>
    </div>
    <div class="whs-actions">
      <button type="button" class="whs-btn" :disabled="busy" @click="suggest('stock')">
        {{ busy === 'stock' ? 'Sucht…' : 'Stock-Fotos' }}
      </button>
      <button type="button" class="whs-btn" :disabled="busy" @click="suggest('ai')">
        {{ busy === 'ai' ? 'Erzeugt…' : 'AI-Bilder' }}
      </button>
      <button
        v-if="candidates.length && lastSource"
        type="button"
        class="whs-btn"
        :disabled="busy"
        @click="refresh"
      >
        {{ busy === lastSource ? 'Sucht andere…' : 'Andere 3 zeigen' }}
      </button>
    </div>
    <p v-if="error" class="whs-error">{{ error }}</p>
    <div v-if="candidates.length" class="whs-grid">
      <button
        v-for="c in candidates"
        :key="c.id"
        type="button"
        class="whs-card"
        :class="{ on: applying === c.id }"
        :disabled="!!applying"
        @click="apply(c)"
      >
        <img :src="c.preview_url" :alt="c.photographer || 'Vorschlag'" />
        <span>{{ applying === c.id ? 'Übernimmt…' : c.source === 'ai' ? 'AI' : 'Stock' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { heroIndustryChips } from '~/server/utils/website-hero-prompts'

export type HeroCandidate = {
  id: string
  preview_url: string
  hotlink_url?: string | null
  source: 'stock' | 'ai'
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
  download_location?: string | null
}

const props = defineProps<{
  industry?: string
  businessType?: string
}>()

const emit = defineEmits<{
  applied: [payload: { url: string; source: 'stock' | 'ai' }]
}>()

const busy = ref<'stock' | 'ai' | ''>('')
const applying = ref('')
const error = ref('')
const hint = ref('')
const lastSource = ref<'stock' | 'ai' | ''>('')
const page = ref(1)
const seenIds = ref<string[]>([])
const industryFromApi = ref('')
const chips = ref<Array<{ label: string; hint: string }>>(heroIndustryChips(props.businessType))
const candidates = ref<HeroCandidate[]>([])

const industry = computed(() => props.industry || industryFromApi.value || 'deine Branche')

async function suggest(source: 'stock' | 'ai', nextHint = '', refresh = false) {
  busy.value = source
  hint.value = nextHint
  lastSource.value = source
  if (!refresh) {
    page.value = 1
    seenIds.value = []
  }
  error.value = ''
  try {
    const res = await $fetch<{
      candidates?: HeroCandidate[]
      industry?: string
      chips?: Array<{ label: string; hint: string }>
    }>('/api/website/media/suggest-hero', {
      method: 'POST',
      body: {
        source,
        hint: nextHint || undefined,
        page: page.value,
        exclude_ids: seenIds.value,
      },
    })
    candidates.value = res?.candidates || []
    seenIds.value = [...new Set([...seenIds.value, ...candidates.value.map((c) => c.id)])]
    if (res?.industry) industryFromApi.value = res.industry
    if (res?.chips?.length) chips.value = res.chips
    if (!candidates.value.length) error.value = 'Keine weiteren Vorschläge — eigenes Foto hochladen.'
  } catch (err: any) {
    candidates.value = []
    error.value = err?.data?.statusMessage || err?.message || 'Vorschläge fehlgeschlagen'
  } finally {
    busy.value = ''
  }
}

function refresh() {
  if (!lastSource.value) return
  page.value += 1
  return suggest(lastSource.value, hint.value, true)
}

async function apply(c: HeroCandidate) {
  applying.value = c.id
  error.value = ''
  try {
    const res = await $fetch<{ hero_image_url?: string }>('/api/website/media/apply-hero', {
      method: 'POST',
      body: {
        source: c.source,
        preview_url: c.preview_url,
        hotlink_url: c.hotlink_url,
        photographer: c.photographer,
        photographer_url: c.photographer_url,
        unsplash_url: c.unsplash_url,
        download_location: c.download_location,
      },
    })
    const url = res?.hero_image_url || c.hotlink_url || c.preview_url
    if (url) emit('applied', { url, source: c.source })
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Übernehmen fehlgeschlagen'
  } finally {
    applying.value = ''
  }
}
</script>

<style scoped>
.whs { margin-top: 0.45rem; }
.whs-hint { margin: 0 0 0.4rem; font-size: 0.75rem; color: #6b7280; line-height: 1.4; }
.whs-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-bottom: 0.4rem; }
.whs-chip {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
}
.whs-chip.on { border-color: #111827; color: #111827; background: #f3f4f6; }
.whs-chip:disabled { opacity: 0.55; cursor: default; }
.whs-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.whs-btn {
  border: 1px solid #d7dbe3;
  background: #fff;
  border-radius: 0.55rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}
.whs-btn:disabled { opacity: 0.55; cursor: default; }
.whs-error { margin: 0.4rem 0 0; font-size: 0.75rem; color: #b45309; }
.whs-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.55rem;
}
.whs-card {
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 0.55rem;
  overflow: hidden;
  background: #f3f5f8;
  cursor: pointer;
  text-align: left;
}
.whs-card.on { opacity: 0.7; }
.whs-card img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.whs-card span { display: block; padding: 0.25rem 0.4rem; font-size: 0.68rem; color: #6b7280; }
</style>
