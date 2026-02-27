<template>
  <div class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
    <div v-if="showSuggestions" class="flex items-start gap-3">
      <span class="text-xl">✨</span>
      <div class="flex-1">
        <p class="font-semibold text-sm mb-2">AI-Verbesserungen:</p>
        <div class="space-y-3 max-h-60 overflow-y-auto">
          <div v-for="(suggestion, idx) in suggestions" :key="idx" class="bg-white rounded p-2 border border-blue-100">
            <p class="text-sm text-gray-700 mb-2">{{ suggestion.suggestion }}</p>
            <p class="text-xs text-gray-500 mb-2 italic">{{ suggestion.reason }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">
                Score: <span class="font-semibold">{{ suggestion.score }}/10</span>
              </span>
              <div class="flex gap-2">
                <button
                  @click="generateMoreVersions(suggestion.suggestion)"
                  :disabled="loadingMore.includes(idx)"
                  class="text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 disabled:opacity-50"
                >
                  {{ loadingMore.includes(idx) ? '🔄' : '➕' }} Mehr
                </button>
                <button
                  @click="applySuggestion(suggestion.suggestion)"
                  class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  Übernehmen
                </button>
              </div>
            </div>
          </div>
        </div>
        <button
          @click="resetSuggestions"
          class="text-xs text-gray-600 hover:text-gray-800 mt-3 underline"
        >
          Zurück
        </button>
      </div>
    </div>

    <button
      v-else
      @click="loadSuggestions"
      :disabled="loading"
      class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
    >
      {{ loading ? '🔄 Loading...' : '✨ Get AI suggestions' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  original: string
  contentType: string
  optimizationType: 'seo' | 'conversion' | 'readability'
}>()

const emit = defineEmits<{
  apply: [value: string]
}>()

const showSuggestions = ref(false)
const loading = ref(false)
const loadingMore = ref<number[]>([])
const suggestions = ref<any[]>([])
const originalContent = ref('')

const loadSuggestions = async () => {
  if (!props.original || props.original.length < 5) {
    return
  }

  originalContent.value = props.original
  loading.value = true
  try {
    const response = await $fetch('/api/website/ai-optimize', {
      method: 'POST',
      body: {
        content: props.original,
        content_type: props.contentType,
        optimization_type: props.optimizationType
      }
    })

    suggestions.value = response.suggestions || []
    showSuggestions.value = true
  } catch (error) {
    console.error('Failed to load AI suggestions:', error)
  } finally {
    loading.value = false
  }
}

const generateMoreVersions = async (baseSuggestion: string, index: number) => {
  if (!baseSuggestion) return
  
  loadingMore.value.push(index)
  try {
    const response = await $fetch('/api/website/ai-optimize', {
      method: 'POST',
      body: {
        content: baseSuggestion,
        content_type: props.contentType,
        optimization_type: props.optimizationType
      }
    })

    // Replace the selected suggestion with the new set of 3
    suggestions.value = response.suggestions || []
  } catch (error) {
    console.error('Failed to generate more versions:', error)
  } finally {
    loadingMore.value = loadingMore.value.filter(i => i !== index)
  }
}

const applySuggestion = (suggestion: string) => {
  emit('apply', suggestion)
  resetSuggestions()
}

const resetSuggestions = () => {
  showSuggestions.value = false
  suggestions.value = []
  originalContent.value = ''
}
</script>
