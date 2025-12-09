<template>
  <div class="p-4 bg-gray-100 rounded">
    <h3 class="font-bold mb-2">🌐 Language Switcher (Debug)</h3>
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="locale in availableLocales"
        :key="locale"
        @click="switchLanguage(locale)"
        :class="[
          'px-3 py-1 rounded text-sm font-medium transition',
          currentLocale === locale
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        ]"
      >
        {{ locale.toUpperCase() }}
      </button>
    </div>
    <div class="mt-2 text-xs text-gray-600">
      <p>Current: {{ currentLocale }}</p>
      <p>Cookie: {{ cookieValue }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const i18n = useI18n()
const currentLocale = computed(() => i18n.locale.value)
const availableLocales = computed(() => i18n.availableLocales)
const cookieValue = ref('')

const switchLanguage = (locale: string) => {
  console.log(`🌐 Switching language from ${i18n.locale.value} to ${locale}`)
  i18n.setLocale(locale)
  console.log(`🌐 New locale: ${i18n.locale.value}`)
}

onMounted(() => {
  cookieValue.value = localStorage.getItem('driving_team_language') || 'not set'
})
</script>

