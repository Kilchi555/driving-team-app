<template>
  <div
    v-if="showSuggestions"
    class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3"
  >
    <div class="flex items-start gap-2 sm:gap-3">
      <span class="text-xl shrink-0" aria-hidden="true">✨</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm mb-2">AI-Vorschläge:</p>
        <div class="space-y-3 max-h-60 overflow-y-auto">
          <div v-for="(suggestion, idx) in suggestions" :key="idx" class="bg-white rounded p-2 border border-blue-100">
            <p class="text-sm text-gray-700 mb-2 break-words whitespace-pre-wrap">{{ suggestion.suggestion }}</p>
            <p class="text-xs text-gray-500 mb-2 italic leading-snug">{{ suggestion.reason }}</p>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs text-gray-500">
                Score: <span class="font-semibold">{{ suggestion.score }}/10</span>
              </span>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="generateMoreVersions(suggestion.suggestion, idx)"
                  :disabled="loadingMore.includes(idx)"
                  class="text-xs bg-amber-500 text-white px-2.5 py-1.5 rounded hover:bg-amber-600 disabled:opacity-50 min-h-[32px]"
                >
                  {{ loadingMore.includes(idx) ? '…' : 'Mehr' }}
                </button>
                <button
                  type="button"
                  @click="applySuggestion(suggestion.suggestion)"
                  class="text-xs bg-blue-500 text-white px-2.5 py-1.5 rounded hover:bg-blue-600 min-h-[32px]"
                >
                  Übernehmen
                </button>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          @click="resetSuggestions"
          class="text-xs text-gray-600 hover:text-gray-800 mt-3 underline"
        >
          Zurück
        </button>
      </div>
    </div>
  </div>

  <div v-else class="mt-3 space-y-2">
    <div
      v-if="loading"
      class="w-full bg-blue-50 border border-blue-200 rounded-lg p-3"
      role="status"
      aria-live="polite"
    >
      <p class="text-sm font-semibold text-blue-700 mb-2">{{ activeStageLabel }}</p>
      <ol class="space-y-1.5">
        <li
          v-for="(stage, idx) in stages"
          :key="stage.id"
          class="flex items-center gap-2 text-xs"
          :class="stageClass(idx)"
        >
          <span class="wz-ai-stage-icon" aria-hidden="true">
            <template v-if="idx < stageIndex">✓</template>
            <template v-else-if="idx === stageIndex">
              <span class="wz-ai-spinner" />
            </template>
            <template v-else>○</template>
          </span>
          <span>{{ stage.label }}</span>
        </li>
      </ol>
    </div>

    <button
      v-else
      type="button"
      class="w-full text-left bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-600 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer min-h-[44px]"
      @click="loadSuggestions"
    >
      ✨ AI-Vorschläge holen
    </button>

    <p v-if="errorMsg" class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      {{ errorMsg }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps<{
  original: string
  contentType: string
  optimizationType: 'seo' | 'conversion' | 'readability'
  formalAddress?: 'sie' | 'du'
  /** Used when the field is still empty (e.g. service name). */
  context?: string
}>()

const emit = defineEmits<{
  apply: [value: string]
}>()

const stages = [
  { id: 'prepare', label: 'Kontext vorbereiten' },
  { id: 'analyze', label: 'Text analysieren' },
  { id: 'write', label: '3 Varianten schreiben' },
  { id: 'score', label: 'Vorschläge bewerten' },
  { id: 'done', label: 'Fertigstellen' },
] as const

const showSuggestions = ref(false)
const loading = ref(false)
const loadingMore = ref<number[]>([])
const suggestions = ref<any[]>([])
const errorMsg = ref('')
const stageIndex = ref(0)
let stageTimer: ReturnType<typeof setInterval> | null = null

const activeStageLabel = computed(() => {
  const stage = stages[Math.min(stageIndex.value, stages.length - 1)]
  return stage ? `${stage.label}…` : 'AI arbeitet…'
})

function stageClass(idx: number) {
  if (idx < stageIndex.value) return 'text-blue-800 font-medium'
  if (idx === stageIndex.value) return 'text-blue-700 font-semibold'
  return 'text-blue-300'
}

function clearStageTimer() {
  if (stageTimer) {
    clearInterval(stageTimer)
    stageTimer = null
  }
}

function startStages() {
  clearStageTimer()
  stageIndex.value = 0
  // Advance through early stages while waiting for the API (last stage reserved for completion)
  stageTimer = setInterval(() => {
    if (stageIndex.value < stages.length - 2) {
      stageIndex.value += 1
    }
  }, 1100)
}

function finishStages() {
  clearStageTimer()
  stageIndex.value = stages.length - 1
}

function buildRequestContent(): string | null {
  const text = String(props.original || '').trim()
  const ctx = String(props.context || '').trim()

  if (props.contentType === 'testimonial') {
    if (text.length >= 5) return text
    return null
  }

  // Short bios: send the text itself; server enforces 2–3 sentences via content_type=bio
  if (props.contentType === 'bio') {
    if (text.length >= 5) return text
    if (ctx.length >= 2) {
      return `Website-Bio für «${ctx}»: Ort, Angebot und sanfter CTA zum Online-Buchen.`
    }
    return null
  }

  if (text.length >= 5) return text
  if (ctx.length >= 2) {
    if (props.contentType === 'service_description') {
      return `Erstelle eine kurze, überzeugende Website-Beschreibung (1–2 Sätze) für die Dienstleistung «${ctx}».`
    }
    if (props.contentType === 'seo_title') {
      return `Erstelle einen SEO-Titel für «${ctx}».`
    }
    if (props.contentType === 'seo_description') {
      return `Erstelle eine SEO-Meta-Beschreibung für «${ctx}».`
    }
    if (props.contentType === 'keywords') {
      return `Erstelle kommagetrennte SEO-Keywords für «${ctx}».`
    }
    return `Erstelle passenden Website-Text für «${ctx}» (Typ: ${props.contentType}).`
  }
  return null
}

const loadSuggestions = async () => {
  errorMsg.value = ''
  const content = buildRequestContent()
  if (!content) {
    errorMsg.value =
      props.contentType === 'testimonial'
        ? 'Bitte zuerst das echte Zitat eintippen — AI formt nur um, erfindet nichts.'
        : 'Bitte zuerst etwas Text eingeben — oder warte, bis der Servicename geladen ist.'
    return
  }

  loading.value = true
  startStages()
  try {
    const response = await $fetch<{ suggestions?: any[] }>('/api/website/ai-optimize', {
      method: 'POST',
      body: {
        content,
        content_type: props.contentType,
        optimization_type: props.optimizationType,
        formal_address: props.formalAddress === 'du' ? 'du' : 'sie',
      },
    })

    finishStages()
    suggestions.value = response.suggestions || []
    if (!suggestions.value.length) {
      errorMsg.value = 'Keine Vorschläge erhalten. Bitte erneut versuchen.'
      return
    }
    // Brief beat so "Fertigstellen" is visible
    await new Promise((r) => setTimeout(r, 280))
    showSuggestions.value = true
  } catch (error: any) {
    console.error('Failed to load AI suggestions:', error)
    errorMsg.value =
      error?.data?.statusMessage ||
      error?.statusMessage ||
      error?.message ||
      'AI-Vorschläge fehlgeschlagen. Bitte erneut versuchen.'
  } finally {
    clearStageTimer()
    loading.value = false
  }
}

const generateMoreVersions = async (baseSuggestion: string, index: number) => {
  if (!baseSuggestion) return

  loadingMore.value.push(index)
  errorMsg.value = ''
  try {
    const response = await $fetch<{ suggestions?: any[] }>('/api/website/ai-optimize', {
      method: 'POST',
      body: {
        content: baseSuggestion,
        content_type: props.contentType,
        optimization_type: props.optimizationType,
        formal_address: props.formalAddress === 'du' ? 'du' : 'sie',
      },
    })

    suggestions.value = response.suggestions || []
  } catch (error: any) {
    console.error('Failed to generate more versions:', error)
    errorMsg.value =
      error?.data?.statusMessage ||
      error?.statusMessage ||
      error?.message ||
      'Weitere Vorschläge fehlgeschlagen.'
  } finally {
    loadingMore.value = loadingMore.value.filter((i) => i !== index)
  }
}

const applySuggestion = (suggestion: string) => {
  emit('apply', suggestion)
  resetSuggestions()
}

const resetSuggestions = () => {
  clearStageTimer()
  showSuggestions.value = false
  suggestions.value = []
  errorMsg.value = ''
  stageIndex.value = 0
}

onBeforeUnmount(() => {
  clearStageTimer()
})
</script>

<style scoped>
.wz-ai-stage-icon {
  width: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wz-ai-spinner {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  border: 1.5px solid currentColor;
  border-right-color: transparent;
  animation: wz-ai-spin 0.7s linear infinite;
}

@keyframes wz-ai-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
