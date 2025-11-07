<!-- pages/i18n-examples.vue -->
<!-- Beispiele für die Verwendung von i18n in Vue Components -->
<!-- URL: http://localhost:3000/i18n-examples -->

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">🌍 i18n Usage Examples</h1>
      
      <!-- Aktuelle Sprache anzeigen -->
      <div class="mb-6 p-4 bg-blue-100 rounded-lg">
        <p class="font-semibold">Aktuelle Sprache: <span class="text-blue-700">{{ locale }}</span></p>
        <button 
          @click="changeLanguage"
          class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sprache wechseln
        </button>
      </div>
      
      <!-- Beispiel 1: Einfache Übersetzung mit $t() -->
      <div class="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Beispiel 1: Einfache Übersetzung</h2>
        <div class="space-y-2">
          <p><strong>{{ $t('common.save') }}</strong></p>
          <p><strong>{{ $t('common.cancel') }}</strong></p>
          <button class="px-4 py-2 bg-green-600 text-white rounded">{{ $t('common.confirm') }}</button>
        </div>
      </div>
      
      <!-- Beispiel 2: Nested Keys -->
      <div class="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Beispiel 2: Verschachtelte Schlüssel</h2>
        <div class="space-y-2">
          <p>Event Type: <strong>{{ $t('eventType.lesson') }}</strong></p>
          <p>Status: <strong>{{ $t('status.confirmed') }}</strong></p>
          <p>Status (Scheduled): <strong>{{ $t('status.scheduled') }}</strong></p>
        </div>
      </div>
      
      <!-- Beispiel 3: Mit useI18n() Composable -->
      <div class="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Beispiel 3: useI18n() Composable</h2>
        <div class="space-y-2">
          <p>Receipt Title: <strong>{{ t('receipt.title') }}</strong></p>
          <p>Receipt Date: <strong>{{ t('receipt.date') }}</strong></p>
        </div>
      </div>
      
      <!-- Beispiel 4: In Templates mit v-bind -->
      <div class="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Beispiel 4: In Attributen</h2>
        <button 
          :title="$t('common.save')"
          class="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {{ $t('common.save') }} (Hover für Tooltip)
        </button>
      </div>
      
      <!-- Beispiel 5: Mit Parametern -->
      <div class="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Beispiel 5: Mit Parametern</h2>
        <p>{{ t('receipt.footer', { email: 'info@example.com' }) }}</p>
      </div>
      
      <!-- Beispiel 6: Event Types & Status -->
      <div class="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Beispiel 6: Event Types & Status</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h3 class="font-semibold mb-2">Event Types:</h3>
            <ul class="space-y-1">
              <li>{{ $t('eventType.lesson') }}</li>
              <li>{{ $t('eventType.theory') }}</li>
              <li>{{ $t('eventType.exam') }}</li>
              <li>{{ $t('eventType.WarmUp') }}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold mb-2">Status:</h3>
            <ul class="space-y-1">
              <li>{{ $t('status.scheduled') }}</li>
              <li>{{ $t('status.confirmed') }}</li>
              <li>{{ $t('status.cancelled') }}</li>
              <li>{{ $t('status.completed') }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// useI18n() gibt t, locale, locales, etc. zurück
const { t, locale, locales, setLocale } = useI18n()

// Sprache programmatisch wechseln
const changeLanguage = () => {
  const currentIndex = locales.value.findIndex((l: any) => l.code === locale.value)
  const nextIndex = (currentIndex + 1) % locales.value.length
  setLocale(locales.value[nextIndex].code)
}
</script>

