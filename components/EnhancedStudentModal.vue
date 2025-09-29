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
              :key="`${requirement.id}_${requirement.categoryCode}`"
              class="bg-white border border-gray-200 rounded-lg p-6"
            >
              <!-- Document Header -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                  <div class="text-2xl mr-3">{{ requirement.icon }}</div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="font-medium text-gray-900">{{ requirement.title }}</h4>
                      <span v-if="requirement.isRequired" class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                        Erforderlich
                      </span>
                      <span v-else class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        Optional
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">{{ requirement.reason }}</p>
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
                    <span v-if="getDocumentUrl(requirement, 'front')" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      ✅
                    </span>
                    <span v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      ❌ Fehlt
                    </span>
                  </div>
                  
                  <!-- Upload Area or Preview -->
                  <div v-if="getDocumentUrl(requirement, 'front')" class="relative group">
                    <img 
                      :src="getDocumentUrl(requirement, 'front')!" 
                      :alt="requirement.title + ' Vorderseite'"
                      class="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                      @click="viewDocument(getDocumentUrl(requirement, 'front')!, requirement.title + (requirement.requiresBothSides ? ' Vorderseite' : ''))"
                    />
                    <button
                      @click="deleteDocumentFile(requirement, 'front')"
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
                    <span v-if="getDocumentUrl(requirement, 'back')" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      ✅
                    </span>
                    <span v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      ❌ Fehlt
                    </span>
                  </div>
                  
                  <!-- Upload Area or Preview -->
                  <div v-if="getDocumentUrl(requirement, 'back')" class="relative group">
                    <img 
                      :src="getDocumentUrl(requirement, 'back')!" 
                      :alt="requirement.title + ' Rückseite'"
                      class="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                      @click="viewDocument(getDocumentUrl(requirement, 'back')!, requirement.title + ' Rückseite')"
                    />
                    <button
                      @click="deleteDocumentFile(requirement, 'back')"
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
        
        <!-- Progress Tab -->
        <div v-if="activeTab === 'progress'" class="p-4">
          <!-- Loading State -->
          <div v-if="isLoadingLessons" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Lade Lektionen...</span>
          </div>

          <div v-else-if="lessonsError" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            <h4 class="font-semibold text-red-900 mb-2">Fehler beim Laden</h4>
            <p class="text-red-700 text-sm mb-4">{{ lessonsError }}</p>
            <button @click="loadLessons" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
              Erneut versuchen
            </button>
          </div>

          <div v-else-if="lessons.length === 0" class="text-center py-12">
            <div class="text-6xl mb-4">📚</div>
            <h4 class="font-semibold text-gray-900 mb-2 text-lg">Keine Lektionen gefunden</h4>
            <p class="text-gray-600">Für diesen Schüler wurden noch keine Lektionen erfasst.</p>
          </div>

          <div v-else class="space-y-4">
            <h4 class="text-lg font-semibold text-gray-900">Lektionen & Bewertungen</h4>
            <p class="text-gray-600">{{ lessons.length }} Lektionen gefunden</p>
          </div>
        </div>

        <!-- Payments Tab -->
        <div v-if="activeTab === 'payments'" class="p-4">
          <!-- Loading State -->
          <div v-if="isLoadingPayments" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-gray-600">Lade Zahlungen...</span>
          </div>

          <div v-else-if="paymentsError" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            <h4 class="font-semibold text-gray-900 mb-2">Fehler beim Laden der Zahlungen</h4>
            <p>{{ paymentsError }}</p>
            <button @click="loadPayments" class="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              Erneut versuchen
            </button>
          </div>

          <div v-else-if="payments.length === 0" class="text-center py-8">
            <div class="text-4xl mb-2">💰</div>
            <h4 class="font-semibold text-gray-900 mb-2">Keine Zahlungen gefunden</h4>
            <p class="text-gray-600">Für diesen Schüler wurden noch keine Zahlungen erfasst.</p>
          </div>

          <div v-else class="space-y-4">
            <h4 class="text-lg font-semibold text-gray-900">Zahlungshistorie</h4>
            <p class="text-gray-600">{{ payments.length }} Zahlungen gefunden</p>
          </div>
        </div>
        
        <!-- Details Tab -->
        <div v-if="activeTab === 'details'" class="space-y-6 p-2">
          <!-- Persönliche Informationen -->
          <div class="bg-white rounded-lg border p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              Persönliche Daten
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <!-- E-Mail -->
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">E-Mail</div>
                    <div v-if="selectedStudent.email" class="mt-1">
                      <a 
                        :href="`mailto:${selectedStudent.email}`"
                        class="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                      >
                        {{ selectedStudent.email }}
                      </a>
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
                  </div>
                </div>

                <!-- Telefon -->
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">Telefon</div>
                    <div v-if="selectedStudent.phone" class="mt-1">
                      <a 
                        :href="`tel:${selectedStudent.phone}`"
                        class="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                      >
                        {{ selectedStudent.phone }}
                      </a>
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
                  </div>
                </div>

                <!-- Kategorien -->
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">Kategorien</div>
                    <div v-if="selectedStudent.category && selectedStudent.category.length > 0" class="mt-1">
                      <div class="flex flex-wrap gap-1">
                        <span 
                          v-for="cat in selectedStudent.category" 
                          :key="cat"
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {{ cat }}
                        </span>
                      </div>
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Keine Kategorien zugewiesen</div>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <!-- Geburtsdatum -->
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">Geburtsdatum</div>
                    <div v-if="selectedStudent.birthdate" class="mt-1 text-sm text-gray-700">
                      {{ formatDate(selectedStudent.birthdate) }}
                      <span v-if="calculateAge(selectedStudent.birthdate)" class="text-gray-500 ml-2">
                        ({{ calculateAge(selectedStudent.birthdate) }} Jahre)
                      </span>
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
                  </div>
                </div>

                <!-- Adresse -->
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">Adresse</div>
                    <div v-if="selectedStudent.street && selectedStudent.street_nr && selectedStudent.zip && selectedStudent.city" class="mt-1 text-sm text-gray-700">
                      {{ selectedStudent.street }} {{ selectedStudent.street_nr }}<br>
                      {{ selectedStudent.zip }} {{ selectedStudent.city }}
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
                  </div>
                </div>

                <!-- Lernfahrausweis Nummer -->
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">Lernfahrausweis Nr.</div>
                    <div v-if="selectedStudent.lernfahrausweis_nr" class="mt-1 text-sm text-gray-700">
                      {{ selectedStudent.lernfahrausweis_nr }}
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Viewer Modal -->
    <div v-if="showDocumentViewer" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
      <div class="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b">
          <h3 class="text-lg font-semibold">{{ viewerTitle }}</h3>
          <button @click="closeDocumentViewer" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-4">
          <img 
            :src="viewerImageUrl"
            :alt="viewerTitle"
            class="max-w-full max-h-[70vh] object-contain mx-auto"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRefs, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useUserDocuments, type UserDocument } from '~/composables/useUserDocuments'

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  birthdate: string | null
  street: string | null
  street_nr: string | null
  zip: string | null
  city: string | null
  is_active: boolean
  category: string[] | null
  assignedInstructor: string | null
  lastLesson: string | null
  lernfahrausweis_nr: string | null
  scheduledLessonsCount?: number
  completedLessonsCount?: number
  cancelledLessonsCount?: number
  [key: string]: any // Allow dynamic field access
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

// Destructure props for easier access
const { selectedStudent } = toRefs(props)

// Supabase client
const supabase = getSupabase()

// Reactive state
const activeTab = ref<'details' | 'progress' | 'payments' | 'documents'>('details')

// Document requirements now loaded dynamically from database

// Document requirements from database
interface DocumentRequirement {
  id: string
  title: string
  description: string
  icon: string
  field_prefix: string
  storage_prefix: string
  requires_both_sides: boolean
  when_required: 'always' | 'after_exam' | 'conditional'
  isRequired?: boolean
  reason?: string
  categoryCode?: string
  categories?: string[]
  frontField?: string
  backField?: string
  requiresBothSides?: boolean
}

const categoryDocumentRequirements = ref<DocumentRequirement[]>([])
const loadingDocumentRequirements = ref(false)

// User Documents Management
const { 
  documents: userDocuments, 
  loading: documentsLoading,
  error: documentsError,
  loadDocuments,
  hasDocument,
  getDocument,
  saveDocument,
  deleteDocument,
  uploadFile,
  getPublicUrl
} = useUserDocuments()

// Helper function to get document URL from user_documents table
const getDocumentUrl = (requirement: DocumentRequirement, side: 'front' | 'back' = 'front'): string | null => {
  if (!selectedStudent.value) return null
  
  const doc = getDocument(
    requirement.field_prefix, 
    requirement.categoryCode, 
    side
  )
  
  return doc ? getPublicUrl(doc.storage_path) : null
}

// Helper function to check if document exists
const hasDocumentFile = (requirement: DocumentRequirement, side: 'front' | 'back' = 'front'): boolean => {
  if (!selectedStudent.value) return false
  
  return hasDocument(
    requirement.field_prefix, 
    requirement.categoryCode, 
    side
  )
}

// Load document requirements from categories table
const loadDocumentRequirements = async () => {
  if (!props.selectedStudent?.category || props.selectedStudent.category.length === 0) {
    categoryDocumentRequirements.value = []
    return
  }

  loadingDocumentRequirements.value = true
  
  try {
    console.log('🔍 Loading document requirements for categories:', props.selectedStudent.category)

    // Load categories with their document requirements from database
    const { data: categories, error } = await supabase
      .from('categories')
      .select('code, name, document_requirements')
      .in('code', props.selectedStudent.category)
      .eq('is_active', true)

    if (error) {
      console.error('❌ Error loading categories:', error)
      throw error
    }

    console.log('✅ Categories loaded:', categories)

    const allRequirements: DocumentRequirement[] = []
    const addedDocuments = new Set<string>()

    // Process each category
    categories?.forEach((category: any) => {
      const requirements = category.document_requirements
      if (!requirements) return

      console.log(`📋 Processing requirements for ${category.code}:`, requirements)

      // Add required documents
      requirements.required?.forEach((req: any) => {
        const uniqueId = `${req.id}_${category.code}`
        if (!addedDocuments.has(uniqueId)) {
          allRequirements.push({
            ...req,
            isRequired: true,
            reason: `Erforderlich für Kategorie ${category.code}`,
            categoryCode: category.code,
            // Map database fields to template fields for backwards compatibility
            frontField: req.field_prefix + '_url',
            backField: req.field_prefix + '_back_url',
            requiresBothSides: req.requires_both_sides,
            categories: [category.code]
          })
          addedDocuments.add(uniqueId)
        }
      })

      // Add optional documents based on conditions
      requirements.optional?.forEach((req: any) => {
        const uniqueId = `${req.id}_${category.code}`
        if (addedDocuments.has(uniqueId)) return // Already added as required

        let shouldShow = false
        let reason = ''

        switch (req.when_required) {
          case 'always':
            shouldShow = true
            reason = `Optional für Kategorie ${category.code}`
            break
            
          case 'after_exam':
            // Show only if student has made progress (has any document uploaded)
            const hasAnyDocument = userDocuments.value && userDocuments.value.length > 0
            shouldShow = !!hasAnyDocument
            reason = 'Optional nach bestandener Prüfung'
            break
            
          case 'conditional':
            // Additional conditions can be implemented here
            shouldShow = false
            break
        }

        if (shouldShow && !addedDocuments.has(req.id)) {
          allRequirements.push({
            ...req,
            isRequired: false,
            reason,
            categoryCode: category.code,
            // Map database fields to template fields for backwards compatibility
            frontField: req.field_prefix + '_url',
            backField: req.field_prefix + '_back_url',
            requiresBothSides: req.requires_both_sides,
            categories: [category.code]
          })
          addedDocuments.add(req.id)
        }
      })
    })

    categoryDocumentRequirements.value = allRequirements
    console.log('📄 Final document requirements:', allRequirements)

  } catch (error) {
    console.error('❌ Error loading document requirements:', error)
    // Fallback to empty requirements
    categoryDocumentRequirements.value = []
  } finally {
    loadingDocumentRequirements.value = false
  }
}

// Document upload state
const showUploadInterface = ref(false)
const isDraggingCurrent = ref(false)
const isUploadingCurrent = ref(false)
const currentFileInput = ref<HTMLInputElement>()

// Document viewer state
const showDocumentViewer = ref(false)
const viewerImageUrl = ref('')
const viewerTitle = ref('')

// Progress and Payments data
const lessons = ref<any[]>([])
const progressData = ref<any[]>([])
const payments = ref<any[]>([])
const isLoadingLessons = ref(false)
const isLoadingPayments = ref(false)
const lessonsError = ref<string | null>(null)
const paymentsError = ref<string | null>(null)

// Payment functionality
const selectedPayments = ref<string[]>([])
const isProcessingBulkAction = ref(false)

// Computed properties
const paymentsCount = computed(() => payments.value.length)

const totalSelectedAmount = computed(() => {
  return selectedPayments.value.reduce((total, paymentId) => {
    const payment = payments.value.find(p => p.id === paymentId)
    return total + (payment?.total_amount_rappen || 0)
  }, 0)
})

const totalEvaluations = computed(() => {
  return progressData.value.reduce((total, group) => total + group.evaluations.length, 0)
})

const averageRating = computed(() => {
  const allRatings = progressData.value.flatMap(group => 
    group.evaluations.map((evaluation: any) => evaluation.criteria_rating)
  )
  if (allRatings.length === 0) return '0.0'
  const avg = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
  return avg.toFixed(1)
})

// Category-based upload functions
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

// Functions
const closeModal = () => {
  emit('close')
}

const startCategoryUpload = (requirement: any, side: 'front' | 'back') => {
  currentUploadRequirement.value = requirement
  currentUploadSide.value = side
  showUploadInterface.value = true
}


const viewDocument = (url: string, title: string) => {
  viewerImageUrl.value = url
  viewerTitle.value = title
  showDocumentViewer.value = true
}

const closeDocumentViewer = () => {
  showDocumentViewer.value = false
  viewerImageUrl.value = ''
  viewerTitle.value = ''
}

// Upload handlers
const triggerCurrentUpload = () => {
  currentFileInput.value?.click()
}

const setDragState = (isDragging: boolean) => {
  isDraggingCurrent.value = isDragging
}

const handleCurrentDrop = (event: DragEvent) => {
  isDraggingCurrent.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    uploadCurrentFile(files[0])
  }
}

const handleCurrentFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    uploadCurrentFile(files[0])
  }
}

// Utility functions
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Nicht angegeben'
  try {
    return new Date(dateString).toLocaleDateString('de-CH')
  } catch {
    return 'Ungültiges Datum'
  }
}

const calculateAge = (birthdate: string | null | undefined): number | null => {
  if (!birthdate) return null
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// Load functions
const loadLessons = async () => {
  if (!props.selectedStudent) return
  
  isLoadingLessons.value = true
  lessonsError.value = null
  
  try {
    console.log('📚 Loading lessons for student:', props.selectedStudent.id)
    // Simplified version - just load basic data
    lessons.value = []
    progressData.value = []
    
  } catch (error) {
    console.error('Error loading lessons:', error)
    lessonsError.value = 'Fehler beim Laden der Lektionen'
  } finally {
    isLoadingLessons.value = false
  }
}

const loadPayments = async () => {
  if (!props.selectedStudent) return
  
  isLoadingPayments.value = true
  paymentsError.value = null
  
  try {
    console.log('💰 Loading payments for student:', props.selectedStudent.id)
    // Simplified version - just load basic data
    payments.value = []
    
  } catch (error) {
    console.error('Error loading payments:', error)
    paymentsError.value = 'Fehler beim Laden der Zahlungen'
  } finally {
    isLoadingPayments.value = false
  }
}

const uploadCurrentFile = async (file: File) => {
  if (!selectedStudent.value?.id) {
    alert('❌ Kein Benutzer ausgewählt')
    return
  }
  
  isUploadingCurrent.value = true
  
  try {
    const requirement = currentUploadRequirement.value
    const side = currentUploadSide.value
    
    if (!requirement) {
      alert('❌ Kein Dokument-Typ ausgewählt')
      return
    }

    console.log('📤 Starting upload with new user_documents table:', {
      fileName: file.name,
      requirement: requirement.id,
      side: side
    })

    // Upload file using the new composable
    const storagePath = await uploadFile(
      file,
      selectedStudent.value.id,
      requirement.field_prefix,
      requirement.categoryCode,
      side
    )

    if (!storagePath) {
      throw new Error('Upload fehlgeschlagen')
    }

    console.log('✅ File uploaded to storage:', storagePath)

    // Save document record to user_documents table
    const documentData = {
      user_id: selectedStudent.value.id,
      tenant_id: selectedStudent.value.tenant_id,
      document_type: requirement.field_prefix,
      category_code: requirement.categoryCode,
      side: side,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: storagePath,
      title: `${requirement.title} (${side === 'front' ? 'Vorderseite' : 'Rückseite'})`
    }

    const savedDocument = await saveDocument(documentData)

    if (!savedDocument) {
      throw new Error('Dokument konnte nicht gespeichert werden')
    }

    console.log('✅ Document saved to database:', savedDocument)

    // Reload documents to update UI
    await loadDocuments(selectedStudent.value.id)

    // Emit update to parent
    emit('studentUpdated', selectedStudent.value)

    console.log('✅ Document uploaded successfully with new system:', file.name)
    
    // Nach erfolgreichem Upload automatisch schließen
    setTimeout(() => {
      showUploadInterface.value = false
      currentUploadRequirement.value = null
    }, 1500)
    
  } catch (error: any) {
    console.error('❌ Upload error:', error)
    alert(`❌ Upload fehlgeschlagen: ${error.message}`)
  } finally {
    isUploadingCurrent.value = false
  }
}

// Watch for student changes
watch(() => props.selectedStudent, (newStudent) => {
  if (newStudent) {
    loadLessons()
    loadPayments()
    loadDocumentRequirements()
    loadDocuments(newStudent.id) // Load user documents from new table
  }
}, { immediate: true })

// Watch for tab changes
watch(() => activeTab.value, (newTab) => {
  if ((newTab === 'progress' || newTab === 'payments') && props.selectedStudent) {
    if (newTab === 'progress') {
      loadLessons()
    } else if (newTab === 'payments') {
      loadPayments()
    }
  }
})

// Document management functions
const deleteDocumentFile = async (requirement: DocumentRequirement, side: 'front' | 'back') => {
  if (!selectedStudent.value) return
  
  const doc = getDocument(
    requirement.field_prefix, 
    requirement.categoryCode, 
    side
  )
  
  if (!doc) return
  
  const success = await deleteDocument(doc.id)
  if (success) {
    // Reload documents to update UI
    await loadDocuments(selectedStudent.value.id)
    // Emit update to parent
    emit('studentUpdated', selectedStudent.value)
  }
}

// viewDocument function already defined earlier

</script>

