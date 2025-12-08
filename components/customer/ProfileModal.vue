<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8">
      <!-- Header -->
      <div class="bg-gray-100 border-b border-gray-200 p-6 rounded-t-xl">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-900">Mein Profil</h2>
          <div class="flex items-center gap-3">
            <button
              @click="$emit('close')"
              class="text-gray-600 hover:text-gray-900 transition-colors p-2"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
        
        <!-- VIEW MODE - Compact Display -->
        <div v-if="!isEditMode" class="space-y-4">
          <!-- Personal Data Section - Compact -->
          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-600">Vorname</p>
                <p class="font-medium text-gray-900">{{ formData.firstName || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-600">Nachname</p>
                <p class="font-medium text-gray-900">{{ formData.lastName || '-' }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-gray-600">Email</p>
                <p class="font-medium text-gray-900 break-all">{{ formData.email || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-600">Telefon</p>
                <p class="font-medium text-gray-900">{{ formData.phone || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-600">Geburtsdatum</p>
                <p class="font-medium text-gray-900">{{ formData.birthdate ? formatDate(formData.birthdate) : '-' }}</p>
              </div>
              <div v-if="formData.street || formData.streetNr" class="col-span-2">
                <p class="text-gray-600">Adresse</p>
                <p class="font-medium text-gray-900">{{ formData.street }} {{ formData.streetNr }}</p>
              </div>
              <div v-if="formData.zip">
                <p class="text-gray-600">PLZ</p>
                <p class="font-medium text-gray-900">{{ formData.zip }}</p>
              </div>
              <div v-if="formData.city">
                <p class="text-gray-600">Stadt</p>
                <p class="font-medium text-gray-900">{{ formData.city }}</p>
              </div>
            </div>
          </div>

          <!-- Documents Section - Compact -->
          <div v-if="categories.length > 0" class="border-t pt-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Ausweise</h3>
            <div class="space-y-4">
              <div v-for="category in categories" :key="category.code" class="text-sm">
                <p class="text-gray-600 font-medium mb-2">{{ category.name }}</p>
                <div v-if="category.documents && category.documents.length > 0" class="flex gap-3 flex-wrap">
                  <div 
                    v-for="doc in category.documents" 
                    :key="doc.id"
                    class="flex-1 min-w-[150px]"
                  >
                    <a 
                      :href="getDocumentUrl(doc)" 
                      target="_blank"
                      class="relative group block"
                      title="Klicke zum Öffnen"
                    >
                      <!-- Larger preview image -->
                      <img 
                        :src="getDocumentUrl(doc)" 
                        :alt="doc.file_name"
                        class="w-full h-32 object-contain rounded border border-blue-200 hover:border-blue-400 transition-colors bg-white"
                        @load="handleImageLoad(doc)"
                        @error="handleImageError"
                      />
                      <div class="absolute left-0 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div class="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {{ doc.file_name }}
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
                <p v-else class="text-gray-400 text-xs mt-1">Kein Dokument hochgeladen</p>
              </div>
            </div>
          </div>
        </div>

        <!-- EDIT MODE - Full Form -->
        <div v-else class="space-y-4">
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
                  @input="scheduleAutoSave"
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
                  @input="scheduleAutoSave"
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
                  @input="scheduleAutoSave"
                />
                <p class="text-xs text-gray-500 mt-1">📧 Email-Änderungen werden automatisch gespeichert</p>
              </div>

              <!-- Telefon -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
                <input
                  v-model="formData.phone"
                  type="tel"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+41 79 123 45 67"
                  @input="scheduleAutoSave"
                />
              </div>

              <!-- Geburtsdatum -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
                <input
                  v-model="formData.birthdate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  @input="scheduleAutoSave"
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
                  @input="scheduleAutoSave"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                <input
                  v-model="formData.streetNr"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nr."
                  @input="scheduleAutoSave"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                <input
                  v-model="formData.zip"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="PLZ"
                  @input="scheduleAutoSave"
                />
              </div>
            </div>

            <!-- Stadt and Stadt Feld nebeneinander -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                <input
                  v-model="formData.zip"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="PLZ"
                  @input="scheduleAutoSave"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                <input
                  v-model="formData.city"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Stadt"
                  @input="scheduleAutoSave"
                />
              </div>
            </div>
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
              <div v-if="category.documents && category.documents.length > 0" class="mb-4 space-y-4">
                <div v-for="doc in category.documents" :key="doc.id" class="w-full">
                  <!-- Large Preview -->
                  <div class="w-full bg-gray-50 rounded-lg border border-gray-200 p-2 overflow-auto">
                    <img 
                      v-if="doc.file_type && doc.file_type.startsWith('image/')"
                      :src="getDocumentUrl(doc)" 
                      :alt="doc.file_name"
                      class="w-full h-auto object-contain rounded"
                      @error="handleImageError"
                      @load="() => handleImageLoad(doc)"
                    >
                    <div v-else class="w-full h-64 bg-red-50 rounded flex flex-col items-center justify-center">
                      <svg class="w-16 h-16 text-red-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                      </svg>
                      <span class="text-sm text-red-600 font-medium">PDF</span>
                    </div>
                  </div>
                  
                  <!-- Document Info -->
                  <div class="mt-2">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useUIStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

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

const isEditMode = ref(false)

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
const error = ref('')
const successMessage = ref('')
const categories = ref<any[]>([])
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

const scheduleAutoSave = () => {
  // Clear existing timer
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  
  // Set new timer for 2 seconds
  autoSaveTimer = setTimeout(() => {
    saveProfile()
  }, 2000)
}

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
    const currentUser = authStore.user
    if (!currentUser) {
      throw new Error('Kein Benutzer angemeldet')
    }

    console.log('📤 Uploading document for category:', categoryCode, 'File:', file.name)
    
    // Create FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', currentUser.id)
    formData.append('type', 'student-document') // Document type
    
    console.log('📝 FormData prepared with keys:', Array.from(formData.keys()))
    
    // Upload via API
    console.log('🌐 Sending request to /api/students/upload-document')
    const response = await $fetch('/api/students/upload-document', {
      method: 'POST',
      body: formData
    }) as any
    
    console.log('✅ Upload response received:', response)
    
    if (response?.success) {
      console.log('✅ Document uploaded successfully to Storage:', response.url)
      successMessage.value = `${categoryName} erfolgreich hochgeladen`
      showSuccess('Erfolg', `${categoryName} erfolgreich hochgeladen`)
      setTimeout(() => { successMessage.value = '' }, 3000)
      
      // Reload page to refresh documents
      setTimeout(() => {
        location.reload()
      }, 1000)
    } else {
      console.error('❌ Upload failed - no success flag:', response)
      error.value = response?.message || 'Unbekannter Fehler beim Upload'
      showError('Fehler', error.value)
    }
  } catch (err: any) {
    console.error('❌ Error uploading document:', err)
    console.error('   Error details:', { message: err.message, status: err.status, data: err.data })
    error.value = err?.data?.statusMessage || err?.message || 'Fehler beim Hochladen'
    showError('Fehler', error.value)
  } finally {
    isUploading.value = false
    // Reset input
    input.value = ''
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
  console.log('🔍 getDocumentUrl called with doc:', doc)
  console.log('🔍 doc keys:', Object.keys(doc))
  
  // Documents from Storage API already have publicUrl!
  if (doc.publicUrl) {
    console.log('✅ Using publicUrl directly:', doc.publicUrl)
    return doc.publicUrl
  }
  
  // Fallback: try different storage path field names
  const storagePath = doc.storagePath || doc.storage_path || doc.file_path || doc.path || doc.url
  
  if (!storagePath) {
    console.warn('⚠️ No storage path found in doc:', doc.file_name, 'Available fields:', Object.keys(doc))
    return ''
  }
  
  // Check if it's already a full URL
  if (storagePath.startsWith('http')) return storagePath
  
  // Build Supabase storage URL
  const supabaseUrl = 'https://unyjaetebnaexaflpyoc.supabase.co'
  let path = storagePath.trim()
  
  // Remove bucket prefix if it exists
  if (path.startsWith('documents/')) {
    path = path.substring('documents/'.length)
  }
  
  // Clean up any double slashes
  path = path.replace(/\/+/g, '/')
  
  console.log('📷 Building URL for doc:', doc.file_name, 'path:', path)
  
  const finalUrl = `${supabaseUrl}/storage/v1/object/public/${path}`
  console.log('📷 Final URL:', finalUrl)
  
  return finalUrl
}

const handleImageLoad = (doc: any) => {
  console.log('✅ Image loaded:', doc.file_name)
}

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement
  console.error('❌ Image load error for:', img.alt, 'url:', img.src)
  // Zeige ein Fallback-Icon statt das Bild zu verstecken
  img.replaceWith(document.createElement('div'))
}

// Watch for modal opening
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    isEditMode.value = false
    loadUserData()
    // Use categories from props if provided
    if (props.categories) {
      categories.value = props.categories
      console.log('📂 Categories loaded from props:', categories.value.length)
    }
  }
})

// Also watch for props.categories changes
watch(() => props.categories, (newVal) => {
  if (newVal && newVal.length > 0) {
    categories.value = newVal
    console.log('📂 Categories updated from props:', newVal.length)
  }
}, { deep: true })
</script>
