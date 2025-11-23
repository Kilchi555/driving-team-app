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
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="email@example.com"
              />
              <p class="text-xs text-gray-500 mt-1">📧 Email-Änderungen werden sofort übernommen</p>
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

            <!-- Current Documents -->
            <div v-if="category.documents && category.documents.length > 0" class="mb-3 space-y-2">
              <div v-for="doc in category.documents" :key="doc.id" class="p-3 bg-gray-50 rounded-lg">
                <div class="flex gap-3">
                  <!-- Thumbnail Preview -->
                  <div class="flex-shrink-0">
                    <img 
                      v-if="doc.file_type && doc.file_type.startsWith('image/')"
                      :src="getDocumentUrl(doc)" 
                      :alt="doc.file_name"
                      class="w-16 h-16 object-cover rounded border border-gray-200"
                      @error="(e) => handleImageError(e, doc)"
                      @load="() => handleImageLoad(doc)"
                    >
                    <div v-else class="w-16 h-16 bg-gray-200 rounded border border-gray-200 flex items-center justify-center">
                      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Document Info -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ doc.file_name }}</p>
                    <p class="text-xs text-gray-500 mt-1">{{ formatDate(doc.created_at) }}</p>
                    <div class="flex gap-2 mt-2">
                      <a 
                        :href="getDocumentUrl(doc)" 
                        target="_blank"
                        class="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Öffnen
                      </a>
                      <button
                        @click="deleteDocument(doc.id, category.name)"
                        class="text-xs text-red-600 hover:text-red-800"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
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
                {{ (category.documents && category.documents.length > 0) ? 'Austausch' : 'Hochladen' }}
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
import { ref, onMounted, watch } from 'vue'
import { useUIStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'

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
  userEmail?: string
  userName?: string
  categories?: Category[]
  userData?: any
}

const props = defineProps<Props>()
defineEmits<{
  close: []
}>()

const { showSuccess, showError } = useUIStore()
const authStore = useAuthStore()

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

// Load user data when modal opens
const loadUserData = () => {
  try {
    console.log('📥 Loading user profile data...')
    console.log('props.userData:', props.userData)
    
    if (props.userData) {
      console.log('✅ Using userData from props')
      formData.value = {
        firstName: props.userData.first_name || '',
        lastName: props.userData.last_name || '',
        email: props.userData.email || props.userEmail || '',
        phone: props.userData.phone || '',
        birthdate: props.userData.birthdate || '',
        street: props.userData.street || '',
        streetNr: props.userData.street_nr || '',
        zip: props.userData.zip || '',
        city: props.userData.city || ''
      }
    } else {
      console.log('⚠️ No userData provided')
      formData.value.email = props.userEmail || ''
    }
    console.log('📋 Final formData:', formData.value)
  } catch (err: any) {
    console.error('❌ Error loading user profile:', err)
  }
}

const isSaving = ref(false)
const isUploading = ref(false)
const isDeleting = ref(false)
const error = ref('')
const successMessage = ref('')
const showDeleteConfirm = ref(false)
const deleteDocId = ref<string | null>(null)
const deleteDocName = ref('')
const categories = ref<any[]>([])

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
  successMessage.value = ''

  try {
    console.log('💾 Saving profile with data:', formData.value)
    
    const response = await $fetch('/api/customer/update-profile', {
      method: 'POST',
      body: {
        firstName: formData.value.firstName,
        lastName: formData.value.lastName,
        email: formData.value.email,
        phone: formData.value.phone,
        birthDate: formData.value.birthdate,
        street: formData.value.street,
        streetNr: formData.value.streetNr,
        zip: formData.value.zip,
        city: formData.value.city
      }
    }) as any

    if (response?.success) {
      successMessage.value = 'Profil erfolgreich gespeichert'
      showSuccess('Erfolg', 'Profil gespeichert')
      console.log('✅ Profile saved successfully')
      setTimeout(() => { successMessage.value = '' }, 3000)
    } else {
      error.value = response?.message || 'Fehler beim Speichern'
      showError('Fehler', error.value)
    }
  } catch (err: any) {
    console.error('❌ Save error:', err)
    error.value = err?.data?.statusMessage || err?.message || 'Fehler beim Speichern'
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

const getDocumentUrl = (doc: any) => {
  if (!doc.storage_path) return ''
  
  // Check if it's already a full URL
  if (doc.storage_path.startsWith('http')) return doc.storage_path
  
  // Build Supabase storage URL
  const supabaseUrl = 'https://unyjaetebnaexaflpyoc.supabase.co'
  const bucket = 'documents'
  
  // The storage_path might be: "user-documents/lernfahrausweise/filename.jpg"
  // Or it might include the bucket: "documents/user-documents/lernfahrausweise/filename.jpg"
  let path = doc.storage_path.trim()
  
  // Remove bucket prefix if it exists
  if (path.startsWith(`${bucket}/`)) {
    path = path.substring(bucket.length + 1)
  }
  
  // Clean up any double slashes
  path = path.replace(/\/+/g, '/')
  
  console.log('📷 Building URL for doc:', doc.file_name, 'path:', path)
  const finalUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
  console.log('📷 Final URL:', finalUrl)
  
  return finalUrl
}

const handleImageLoad = (doc: any) => {
  console.log('✅ Image loaded:', doc.file_name)
}

const handleImageError = (e: Event, doc: any) => {
  const img = e.target as HTMLImageElement
  console.error('❌ Image load error for:', doc.file_name, 'url:', getDocumentUrl(doc))
  img.style.display = 'none'
}

const useRouter = () => {
  const router = window.__NUXT__.nuxtApp.$router
  return router
}

// Watch for modal opening
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadUserData()
    // Use categories from props if provided
    if (props.categories) {
      categories.value = props.categories
    }
  }
})
</script>

