<script setup lang="ts">
export type GbpAiTextContext = 'post' | 'photo_caption' | 'review_reply' | 'profile_description'

const props = withDefaults(defineProps<{
  modelValue: string
  context: GbpAiTextContext
  locationId?: string | null
  defaultKeywords?: string[]
  maxLength?: number
  rows?: number
  placeholder?: string
  label?: string
  reviewContext?: {
    reviewerName?: string
    starRating?: number
    reviewText?: string
  }
}>(), {
  defaultKeywords: () => [],
  maxLength: 1500,
  rows: 4,
  placeholder: 'Text eingeben oder Stichworte unten — dann KI optimieren…',
  label: 'Text',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const text = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

const keywordChips = ref<string[]>([])
const keywordDraft = ref('')
const tone = ref<'local_friendly' | 'factual' | 'cta_focus'>('local_friendly')
const loading = ref(false)
const previousText = ref<string | null>(null)
const error = ref('')

const showKeywords = computed(() => props.context !== 'review_reply')
const showTone = computed(() => true)
const charHint = computed(() => {
  if (props.context === 'photo_caption') return 'Ziel: 80–220 Zeichen'
  if (props.context === 'review_reply') return 'Max. 3 Sätze empfohlen'
  if (props.context === 'profile_description') return 'Ziel: 400–750 Zeichen (Google-Limit)'
  return 'Ziel: 400–900 Zeichen'
})

watch(
  () => props.defaultKeywords,
  (kw) => {
    if (keywordChips.value.length === 0 && kw?.length) {
      keywordChips.value = [...kw]
    }
  },
  { immediate: true },
)

function addKeyword() {
  const parts = keywordDraft.value.split(',').map(s => s.trim()).filter(Boolean)
  for (const p of parts) {
    if (!keywordChips.value.includes(p)) keywordChips.value.push(p)
  }
  keywordDraft.value = ''
}

function removeKeyword(k: string) {
  keywordChips.value = keywordChips.value.filter(x => x !== k)
}

function onKeywordKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addKeyword()
  }
}

async function runAi(mode: 'generate' | 'regenerate' | 'shorter' | 'more_cta' = 'generate') {
  loading.value = true
  error.value = ''
  try {
    if (text.value.trim()) previousText.value = text.value
    const res = await $fetch<{ text: string }>('/api/gbp/ai-text', {
      method: 'POST',
      body: {
        context: props.context,
        locationId: props.locationId,
        keywords: keywordChips.value,
        draftText: text.value || null,
        tone: tone.value,
        mode,
        reviewContext: props.reviewContext,
      },
    })
    text.value = res.text
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'KI-Text fehlgeschlagen'
  } finally {
    loading.value = false
  }
}

function restorePrevious() {
  if (previousText.value != null) {
    text.value = previousText.value
    previousText.value = null
  }
}
</script>

<template>
  <div class="space-y-3 min-w-0">
    <label v-if="label" class="text-xs font-medium text-gray-600 block">{{ label }}</label>

    <textarea
      v-model="text"
      :rows="rows"
      :placeholder="placeholder"
      :maxlength="maxLength"
      class="block w-full min-w-0 text-sm rounded-xl border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
    />

    <div v-if="showKeywords" class="space-y-2">
      <p class="text-xs text-gray-500">Stichworte (Orte, Leistungen, Namen — für Local SEO)</p>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="kw in keywordChips"
          :key="kw"
          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
        >
          {{ kw }}
          <button type="button" class="text-blue-400 hover:text-blue-800" @click="removeKeyword(kw)">×</button>
        </span>
      </div>
      <input
        v-model="keywordDraft"
        type="text"
        placeholder="Stichwort eingeben, Enter…"
        class="block w-full min-w-0 text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        @keydown="onKeywordKeydown"
      />
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        v-if="showTone"
        v-model="tone"
        class="w-full sm:w-auto text-xs rounded-lg border border-gray-200 px-2.5 py-2 bg-white text-gray-700"
      >
        <option value="local_friendly">Lokal & freundlich</option>
        <option value="factual">Sachlich</option>
        <option value="cta_focus">Mit CTA-Fokus</option>
      </select>
      <button
        type="button"
        :disabled="loading"
        class="w-full sm:w-auto px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 disabled:opacity-50"
        @click="runAi('generate')"
      >
        {{ loading ? 'KI schreibt…' : '✦ SEO-Text generieren' }}
      </button>
      <button
        v-if="text.trim()"
        type="button"
        :disabled="loading"
        class="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
        @click="runAi('regenerate')"
      >
        Nochmal
      </button>
      <button
        v-if="text.trim()"
        type="button"
        :disabled="loading"
        class="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
        @click="runAi('shorter')"
      >
        Kürzer
      </button>
      <button
        v-if="text.trim() && context !== 'review_reply'"
        type="button"
        :disabled="loading"
        class="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
        @click="runAi('more_cta')"
      >
        Mehr CTA
      </button>
    </div>

    <div class="flex items-center justify-between gap-2 text-xs text-gray-400">
      <span>{{ text.length }}/{{ maxLength }} · {{ charHint }}</span>
      <button
        v-if="previousText != null"
        type="button"
        class="text-blue-600 hover:text-blue-800 font-medium shrink-0"
        @click="restorePrevious"
      >
        Vorherige Version
      </button>
    </div>

    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
