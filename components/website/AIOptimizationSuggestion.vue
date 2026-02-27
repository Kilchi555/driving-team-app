<template>
  <div class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
    <div v-if="showSuggestions" class="flex items-start gap-3">
      <span class="text-xl">✨</span>
      <div class="flex-1">
        <p class="font-semibold text-sm mb-2">AI-Verbesserungen:</p>
        <div class="space-y-2 max-h-40 overflow-y-auto">
          <div v-for="(suggestion, idx) in suggestions" :key="idx" class="text-sm">
            <p class="text-gray-700 line-clamp-2">{{ suggestion.suggestion }}</p>
            <div class="flex items-center justify-between mt-1">
              <span class="text-xs text-gray-500">
                Score: <span class="font-semibold">{{ suggestion.score }}/10</span>
              </span>
              <button
                @click="applySuggestion(suggestion.suggestion)"
                class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
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
const suggestions = ref<any[]>([])

const loadSuggestions = async () => {
  if (!props.original || props.original.length < 5) {
    return
  }

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

const applySuggestion = (suggestion: string) => {
  emit('apply', suggestion)
  showSuggestions.value = false
}
</script>
