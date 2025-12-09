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
      <p class="mt-2 font-semibold text-gray-900">🌐 Test Translation:</p>
      <p class="text-gray-700">{{ $t('test') }}</p>
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

const switchLanguage = async (locale: string) => {
  console.log(`🌐 Switching language from ${i18n.locale.value} to ${locale}`)
  
  // Method 1: Try setLocale (official method)
  try {
    await i18n.setLocale(locale as any)
    console.log(`✅ setLocale worked! New locale: ${i18n.locale.value}`)
  } catch (e) {
    // Method 2: Directly set the locale value (fallback)
    console.warn(`⚠️ setLocale failed, trying direct assignment:`, e)
    i18n.locale.value = locale
    console.log(`✅ Direct assignment worked! New locale: ${i18n.locale.value}`)
  }
  
  // Save to localStorage for persistence
  localStorage.setItem('driving_team_language', locale)
  console.log(`💾 Saved to localStorage: ${locale}`)
}

onMounted(() => {
  cookieValue.value = localStorage.getItem('driving_team_language') || 'not set'
})
</script>

