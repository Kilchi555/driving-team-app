<template>
  <div v-if="selectedStudent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-bold">{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
          </div>
          <div class="flex items-center gap-3">
            <span :class="[
              'text-xs px-2 py-1 rounded-full font-medium',
              selectedStudent.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            ]">
              {{ selectedStudent.is_active ? 'Aktiv' : 'Inaktiv' }}
            </span>
            <button @click="closeModal" class="text-white hover:text-green-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="bg-gray-50 border-b px-2">
        <div class="flex">
          <button
            @click="activeTab = 'details'"
            :class="[
              'px-2 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'details'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Details
          </button>

          <button
            @click="activeTab = 'progress'"
            :class="[
              'px-2 py-1 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'progress'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Fortschritt
          </button>
          
          <button
            @click="activeTab = 'payments'"
            :class="[
              'px-2 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'payments'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Zahlungen
            <span v-if="paymentsCount > 0" class="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
              {{ paymentsCount }}
            </span>
          </button>

          <button
            @click="activeTab = 'documents'"
            :class="[
              'px-2 py-1 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'documents'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Dokumente
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto">
        
        <!-- Documents Tab - CATEGORY BASED -->
        <div v-if="activeTab === 'documents'" class="p-4 space-y-6">
          
          <!-- Header -->
          <div class="text-center mb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Dokumente verwalten</h3>
            <p class="text-sm text-gray-500">
              Basierend auf den Kategorien: 
              <span v-for="cat in selectedStudent?.category" :key="cat" class="inline-flex items-center px-2 py-1 mx-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {{ cat }}
              </span>
            </p>
          </div>

          <!-- Category-Based Document Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Document placeholders based on categories -->
            <div 
              v-for="requirement in categoryDocumentRequirements" 
              :key="requirement.id"
              class="bg-white border border-gray-200 rounded-lg p-6"
            >
              <!-- Document Header -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                  <div class="text-2xl mr-3">{{ requirement.icon }}</div>
                  <div>
                    <h4 class="font-medium text-gray-900">{{ requirement.title }}</h4>
                    <p class="text-xs text-gray-500">{{ requirement.description }}</p>
                  </div>
                </div>
                <div class="flex items-center">
                  <span v-for="cat in requirement.categories" :key="cat" class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {{ cat }}
                  </span>
                </div>
              </div>

              <!-- Document Status & Upload -->
              <div class="space-y-4">
                <!-- Front/Main Document -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">
                      {{ requirement.requiresBothSides ? 'Vorderseite' : requirement.title }}
                    </span>
                    <span v-if="(selectedStudent as any)?.[requirement.frontField]" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      ✅ Vorhanden
                    </span>
                    <span v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      ❌ Fehlt
                    </span>
                  </div>
                  
                  <!-- Upload Area or Preview -->
                  <div v-if="(selectedStudent as any)?.[requirement.frontField]" class="relative group">
                    <img 
                      :src="(selectedStudent as any)[requirement.frontField]" 
                      :alt="requirement.title + ' Vorderseite'"
                      class="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                      @click="viewDocument((selectedStudent as any)[requirement.frontField], requirement.title + (requirement.requiresBothSides ? ' Vorderseite' : ''))"
                    />
                    <button
                      @click="deleteSpecificDocument(requirement.frontField)"
                      class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                  <div v-else
                    @click="startCategoryUpload(requirement, 'front')"
                    class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    <p class="text-sm text-gray-600">{{ requirement.requiresBothSides ? 'Vorderseite' : requirement.title }} hochladen</p>
                  </div>
                </div>

                <!-- Back Document (if required) -->
                <div v-if="requirement.requiresBothSides">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">Rückseite</span>
                    <span v-if="(selectedStudent as any)?.[requirement.backField]" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      ✅ Vorhanden
                    </span>
                    <span v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      ❌ Fehlt
                    </span>
                  </div>
                  
                  <!-- Upload Area or Preview -->
                  <div v-if="(selectedStudent as any)?.[requirement.backField]" class="relative group">
                    <img 
                      :src="(selectedStudent as any)[requirement.backField]" 
                      :alt="requirement.title + ' Rückseite'"
                      class="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                      @click="viewDocument((selectedStudent as any)[requirement.backField], requirement.title + ' Rückseite')"
                    />
                    <button
                      @click="deleteSpecificDocument(requirement.backField)"
                      class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                  <div v-else
                    @click="startCategoryUpload(requirement, 'back')"
                    class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    <p class="text-sm text-gray-600">Rückseite hochladen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Upload Modal (when uploading) -->
          <div v-if="showUploadInterface" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
              <div class="text-center mb-6">
                <h3 class="text-lg font-medium text-gray-900 mb-2">{{ currentUploadTitle }}</h3>
                <p class="text-sm text-gray-500">{{ currentUploadDescription }}</p>
              </div>

              <!-- Upload Area -->
              <div 
                @click="triggerCurrentUpload"
                @dragover.prevent="setDragState(true)"
                @dragleave.prevent="setDragState(false)"
                @drop.prevent="handleCurrentDrop"
                :class="[
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                  isDraggingCurrent 
                    ? 'border-blue-400 bg-blue-50 scale-105' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                ]"
              >
                <div class="space-y-4">
                  <div v-if="isUploadingCurrent" class="flex items-center justify-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                  <div v-else class="space-y-2">
                    <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <div class="text-lg font-medium text-gray-900">
                      {{ isDraggingCurrent ? 'Loslassen zum Hochladen' : 'Bild hier ablegen' }}
                    </div>
                    <p class="text-sm text-gray-500">oder klicken Sie hier zum Auswählen</p>
                    <p class="text-xs text-gray-400">JPG, PNG bis 5MB</p>
                  </div>
                </div>
              </div>
              
              <!-- Hidden file input -->
              <input
                ref="currentFileInput"
                type="file"
                accept="image/*"
                @change="handleCurrentFileSelect"
                class="hidden"
              />

              <!-- Modal Actions -->
              <div class="mt-6 flex justify-end space-x-3">
                <button
                  @click="showUploadInterface = false"
                  class="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Details Tab -->
        <div v-if="activeTab === 'details'" class="space-y-6 p-2">
          <!-- Content will be here -->
          <div class="bg-white rounded-lg border p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Details Tab</h4>
            <p>Details content here...</p>
          </div>
        </div>

        <!-- Other tabs... -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  category: string[] | null
  lernfahrausweis_url: string | null
  [key: string]: any
}

interface Props {
  selectedStudent: Student | null
}

interface Emits {
  (e: 'close'): void
  (e: 'studentUpdated', data: { id: string, [key: string]: any }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { selectedStudent } = toRefs(props)
const supabase = getSupabase()

// State
const activeTab = ref<'details' | 'progress' | 'payments' | 'documents'>('details')
const showUploadInterface = ref(false)
const isDraggingCurrent = ref(false)
const isUploadingCurrent = ref(false)
const currentFileInput = ref<HTMLInputElement>()

// Category-based document requirements
const categoryDocumentMapping = {
  'B': {
    id: 'lernfahrausweis_b',
    title: 'Lernfahrausweis Kategorie B',
    icon: '📄',
    description: 'Lernfahrausweis für Personenwagen',
    requiresBothSides: false,
    frontField: 'lernfahrausweis_url',
    backField: 'lernfahrausweis_back_url',
    storagePrefix: 'lernfahrausweis_b',
    categories: ['B']
  },
  'FUEHRERSCHEIN': {
    id: 'fuehrerschein',
    title: 'Führerschein',
    icon: '🪪',
    description: 'Vollständiger Führerschein (alle Kategorien)',
    requiresBothSides: true,
    frontField: 'fuehrerschein_url',
    backField: 'fuehrerschein_back_url',
    storagePrefix: 'fuehrerschein',
    categories: ['B', 'A', 'BE', 'C', 'D']
  }
}

const categoryDocumentRequirements = computed(() => {
  if (!props.selectedStudent?.category || props.selectedStudent.category.length === 0) {
    return []
  }
  
  const requirements = []
  
  // Add category-specific documents
  props.selectedStudent.category.forEach(category => {
    if ((categoryDocumentMapping as any)[category]) {
      requirements.push((categoryDocumentMapping as any)[category])
    }
  })
  
  // Always add general Führerschein option
  requirements.push(categoryDocumentMapping['FUEHRERSCHEIN'])
  
  return requirements
})

// Upload functions
const currentUploadRequirement = ref<any>(null)
const currentUploadSide = ref<'front' | 'back'>('front')

const currentUploadTitle = computed(() => {
  if (!currentUploadRequirement.value) return ''
  const side = currentUploadSide.value
  return side === 'front' 
    ? (currentUploadRequirement.value.requiresBothSides ? `${currentUploadRequirement.value.title} Vorderseite` : currentUploadRequirement.value.title)
    : `${currentUploadRequirement.value.title} Rückseite`
})

const currentUploadDescription = computed(() => {
  if (!currentUploadRequirement.value) return ''
  return `Für Kategorien: ${currentUploadRequirement.value.categories.join(', ')}`
})

const paymentsCount = computed(() => 0) // Placeholder

// Functions
const closeModal = () => {
  emit('close')
}

const startCategoryUpload = (requirement: any, side: 'front' | 'back') => {
  currentUploadRequirement.value = requirement
  currentUploadSide.value = side
  showUploadInterface.value = true
}

const deleteSpecificDocument = async (fieldName: string) => {
  // Implementation here
}

const viewDocument = (url: string, title: string) => {
  // Implementation here
}

const triggerCurrentUpload = () => {
  currentFileInput.value?.click()
}

const setDragState = (isDragging: boolean) => {
  isDraggingCurrent.value = isDragging
}

const handleCurrentDrop = (event: DragEvent) => {
  // Implementation here
}

const handleCurrentFileSelect = (event: Event) => {
  // Implementation here
}

</script>



