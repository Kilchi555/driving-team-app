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
      <p class="text-gray-700">{{ testTranslation }}</p>
      <p class="text-gray-500 mt-1">i18n messages: {{ Object.keys(i18n.messages.value).join(', ') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const i18n = useI18n()
const currentLocale = computed(() => i18n.locale.value)
const availableLocales = computed(() => i18n.availableLocales)
const cookieValue = ref('')
const testTranslation = ref('')

// Watch locale changes and update test translation
watch(() => i18n.locale.value, () => {
  updateTestTranslation()
}, { immediate: true })

const updateTestTranslation = () => {
  try {
    // Try to get the test translation from current locale messages
    const messages = i18n.messages.value[i18n.locale.value]
    if (messages && messages.test) {
      testTranslation.value = messages.test
      console.log(`✅ Translation loaded for ${i18n.locale.value}: ${messages.test}`)
    } else {
      testTranslation.value = `No translation for 'test' in ${i18n.locale.value}`
      console.warn(`⚠️ No 'test' key found in ${i18n.locale.value} messages`)
      console.log(`Available keys in ${i18n.locale.value}:`, Object.keys(messages || {}))
    }
  } catch (e) {
    testTranslation.value = `Error loading translation: ${e}`
    console.error(`❌ Error loading translation:`, e)
  }
}

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
  console.log(`📋 Available locales:`, availableLocales.value)
  console.log(`📋 i18n.messages keys:`, Object.keys(i18n.messages.value))
  console.log(`📋 Current messages for ${i18n.locale.value}:`, i18n.messages.value[i18n.locale.value])
})
</script>

