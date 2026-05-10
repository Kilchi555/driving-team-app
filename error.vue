<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Error Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="mb-4">
          <div class="text-6xl mb-2">{{ error?.statusCode === 404 ? '🔍' : '⚠️' }}</div>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-2">
          {{ error?.statusCode === 404 ? 'Seite nicht gefunden' : 'Etwas ist schief gelaufen' }}
        </h1>
        
        <p class="text-gray-600 text-sm mb-6 leading-relaxed">
          {{ errorMessage }}
        </p>

        <!-- Error Details (development only) -->
        <div v-if="isDev && error?.message" class="bg-gray-100 rounded-lg p-3 mb-6 text-left">
          <p class="text-xs text-gray-600 font-mono break-words">{{ error.message }}</p>
        </div>

        <!-- Action Button -->
        <button
          @click="handleAction"
          class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 active:scale-95 mb-3"
        >
          {{ actionButtonText }}
        </button>

        <!-- Secondary Link -->
        <a 
          href="https://app.simy.ch/login" 
          class="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium transition"
        >
          → Zur Login-Seite
        </a>
      </div>

      <!-- Footer Text -->
      <p class="text-center text-gray-500 text-xs mt-6">
        Falls das Problem weiterhin besteht, kontaktiere bitte den Support.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

// useError() returns a reactive ref — use it directly so the template
// always has the error available on first render (no null flash).
const error = useError()

// import.meta cannot be used inside Vue template expressions — expose it as a constant.
const isDev = import.meta.dev

const errorMessage = computed(() => {
  const code = error.value?.statusCode
  if (code === 404) return error.value?.message || 'Der angeforderte Tenant existiert nicht. Bitte überprüfe die URL oder melde dich an.'
  if (code === 500) return 'Es gab einen Fehler auf dem Server. Bitte versuche es später erneut.'
  return 'Es gab einen unerwarteten Fehler. Bitte versuche es später erneut.'
})

const actionButtonText = computed(() => {
  return error.value?.statusCode === 404 ? '→ Zur Login-Seite' : 'Zurück'
})

const handleAction = () => {
  if (error.value?.statusCode === 404) {
    window.location.href = 'https://app.simy.ch/login'
  } else {
    router.back()
  }
}
</script>

<style scoped>
</style>
