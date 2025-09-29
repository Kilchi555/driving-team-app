<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 admin-modal">
      <h3 class="text-lg font-semibold mb-4">Standard-Kategorien kopieren</h3>
      
      <div class="mb-4">
        <p class="text-gray-600 mb-2">
          Möchten Sie die Standard-Kategorien für den Tenant <strong>{{ tenantName }}</strong> kopieren?
        </p>
        <p class="text-sm text-gray-500">
          Dies wird alle Standard-Kategorien (B, A, BE, etc.) für diesen Tenant verfügbar machen.
        </p>
      </div>

      <div v-if="loading" class="text-center py-4">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p class="mt-2 text-sm text-gray-600">Kategorien werden kopiert...</p>
      </div>

      <div v-else class="flex justify-end space-x-3">
        <button
          @click="close"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          :disabled="loading"
        >
          Abbrechen
        </button>
        <button
          @click="copyCategories"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          :disabled="loading"
        >
          Kopieren
        </button>
      </div>

      <div v-if="success" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
        <p class="text-sm text-green-800">
          ✅ {{ result?.categories_copied || 0 }} Kategorien erfolgreich kopiert!
        </p>
      </div>

      <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  tenantId: string
  tenantName: string
}

interface Emits {
  (e: 'close'): void
  (e: 'success', result: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const success = ref(false)
const error = ref('')
const result = ref<any>(null)

const close = () => {
  success.value = false
  error.value = ''
  result.value = null
  emit('close')
}

const copyCategories = async () => {
  loading.value = true
  error.value = ''
  success.value = false

  try {
    const { data, error: apiError } = await $fetch('/api/tenants/copy-default-categories', {
      method: 'POST',
      body: {
        tenant_id: props.tenantId
      }
    })

    if (apiError) {
      throw new Error(apiError.message || 'Fehler beim Kopieren der Kategorien')
    }

    result.value = data
    success.value = true
    
    // Nach 2 Sekunden schließen
    setTimeout(() => {
      emit('success', data)
      close()
    }, 2000)

  } catch (err: any) {
    console.error('Error copying categories:', err)
    error.value = err.message || 'Unbekannter Fehler beim Kopieren der Kategorien'
  } finally {
    loading.value = false
  }
}

// Reset state when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    success.value = false
    error.value = ''
    result.value = null
  }
})
</script>
