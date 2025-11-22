<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold">Mein Profil</h2>
          <button
            @click="$emit('close')"
            class="text-white hover:text-gray-200 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
        <!-- Personal Data Section -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">Persönliche Daten</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <!-- Vorname -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
              <input
                v-model="formData.firstName"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Vorname"
              />
            </div>

            <!-- Nachname -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
              <input
                v-model="formData.lastName"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nachname"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="formData.email"
                type="email"
                disabled
                class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <!-- Telefon -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
              <input
                v-model="formData.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+41 79 123 45 67"
              />
            </div>

            <!-- Geburtsdatum -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
              <input
                v-model="formData.birthdate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <!-- Adresse -->
          <div class="grid grid-cols-4 gap-4">
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Strasse</label>
              <input
                v-model="formData.street"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Strasse"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
              <input
                v-model="formData.streetNr"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nr."
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <input
                v-model="formData.zip"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="PLZ"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
            <input
              v-model="formData.city"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Stadt"
            />
          </div>

          <!-- Save Button for Personal Data -->
          <button
            @click="saveProfile"
            :disabled="isSaving"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            <span v-if="isSaving">Wird gespeichert...</span>
            <span v-else>Persönliche Daten speichern</span>
          </button>
        </div>

        <!-- Documents Section -->
        <div class="space-y-4 border-t pt-6">
          <h3 class="text-lg font-semibold text-gray-900">Ausweise</h3>
          
          <div v-if="categories.length === 0" class="text-center text-gray-500 py-8">
            <p>Keine Kategorien verfügbar</p>
          </div>

          <div v-for="category in categories" :key="category.code" class="border rounded-lg p-4">
            <div class="flex justify-between items-start mb-3">
              <div>
                <h4 class="font-medium text-gray-900">{{ category.name }}</h4>
                <p class="text-sm text-gray-500">Kategorie: {{ category.code }}</p>
              </div>
            </div>

            <!-- Current Document -->
            <div v-if="category.document" class="mb-3 p-3 bg-gray-50 rounded-lg">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm font-medium text-gray-700">Hochgeladen:</p>
                  <p class="text-xs text-gray-500">{{ formatDate(category.document.created_at) }}</p>
                </div>
                <button
                  @click="deleteDocument(category.document.id, category.name)"
                  class="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Löschen
                </button>
              </div>
            </div>

            <!-- Upload -->
            <div class="flex gap-2">
              <input
                type="file"
                :ref="`fileInput_${category.code}`"
                accept="image/*,application/pdf"
                class="hidden"
                @change="(e) => uploadDocument(e, category.code, category.name)"
              />
              <button
                @click="triggerFileInput(category.code)"
                :disabled="isUploading"
                class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {{ category.document ? 'Austausch' : 'Hochladen' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t p-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          Schliessen
        </button>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900">Dokument löschen?</h3>
        <p class="text-gray-600">Möchten Sie {{ deleteDocName }} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
        
        <div class="flex gap-3 pt-4">
          <button
            @click="showDeleteConfirm = false"
            class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="confirmDelete"
            :disabled="isDeleting"
            class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {{ isDeleting ? 'Wird gelöscht...' : 'Löschen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUIStore } from '~/stores/ui'

interface Category {
  code: string
  name: string
  document?: {
    id: string
    created_at: string
  }
}

interface Props {
  isOpen: boolean
  userEmail: string
  userName?: string
  categories: Category[]
}

defineProps<Props>()
defineEmits<{
  close: []
}>()

const { showSuccess, showError } = useUIStore()

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthdate: '',
  street: '',
  streetNr: '',
  zip: '',
  city: ''
})

const isSaving = ref(false)
const isUploading = ref(false)
const isDeleting = ref(false)
const error = ref('')
const successMessage = ref('')
const showDeleteConfirm = ref(false)
const deleteDocId = ref<string | null>(null)
const deleteDocName = ref('')

const triggerFileInput = (categoryCode: string) => {
  const input = document.querySelector(`input[ref*="${categoryCode}"]`) as HTMLInputElement
  input?.click()
}

const uploadDocument = async (event: Event, categoryCode: string, categoryName: string) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return

  isUploading.value = true
  error.value = ''

  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string
      
      console.log('📤 Uploading document for category:', categoryCode)
      
      const response = await $fetch('/api/customer/manage-documents', {
        method: 'POST',
        body: {
          action: 'upload',
          base64Data,
          documentType: categoryCode,
          categoryCode
        }
      }) as any

      if (response?.success) {
        successMessage.value = `${categoryName} erfolgreich hochgeladen`
        showSuccess('Erfolg', `${categoryName} erfolgreich hochgeladen`)
        setTimeout(() => { successMessage.value = '' }, 3000)
        
        // Emit event to refresh documents
        useRouter().go(0)
      }
    }
    reader.readAsDataURL(file)
  } catch (err: any) {
    console.error('❌ Upload error:', err)
    error.value = err?.data?.statusMessage || 'Fehler beim Hochladen'
    showError('Fehler', error.value)
  } finally {
    isUploading.value = false
  }
}

const deleteDocument = (docId: string, docName: string) => {
  deleteDocId.value = docId
  deleteDocName.value = docName
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deleteDocId.value) return

  isDeleting.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/customer/manage-documents', {
      method: 'POST',
      body: {
        action: 'delete',
        documentId: deleteDocId.value
      }
    }) as any

    if (response?.success) {
      showSuccess('Erfolg', 'Dokument gelöscht')
      showDeleteConfirm.value = false
      useRouter().go(0)
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Fehler beim Löschen'
    showError('Fehler', error.value)
    showDeleteConfirm.value = false
  } finally {
    isDeleting.value = false
  }
}

const saveProfile = async () => {
  isSaving.value = true
  error.value = ''

  try {
    const response = await $fetch('/api/customer/update-profile', {
      method: 'POST',
      body: formData.value
    }) as any

    if (response?.success) {
      showSuccess('Erfolg', 'Profil gespeichert')
      setTimeout(() => { successMessage.value = '' }, 3000)
    }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Fehler beim Speichern'
    showError('Fehler', error.value)
  } finally {
    isSaving.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const useRouter = () => {
  const router = window.__NUXT__.nuxtApp.$router
  return router
}
</script>

