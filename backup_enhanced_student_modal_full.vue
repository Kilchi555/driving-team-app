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
            @click="() => { logger.debug('🔧 Switching to documents tab'); activeTab = 'documents' }"
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
            <div class="max-w-sm mx-auto">
              <!-- Empty State Icon -->
              <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              
              <h3 class="text-lg font-medium text-gray-900 mb-2">Noch keine Dokumente</h3>
              <p class="text-sm text-gray-500 mb-6">Fügen Sie Dokumente wie Lernfahrausweis oder Führerschein hinzu</p>
              
              <!-- Plus Button -->
              <button
                @click="showDocumentTypeSelector = true"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Dokument hinzufügen
              </button>
            </div>
          </div>

          <!-- Step 2: Document Type Selection -->
          <div v-if="showDocumentTypeSelector && !showUploadInterface" class="max-w-md mx-auto">
            <div class="text-center mb-6">
              <h3 class="text-lg font-medium text-gray-900 mb-2">Dokumententyp wählen</h3>
              <p class="text-sm text-gray-500">Welches Dokument möchten Sie hochladen?</p>
            </div>
            
            <div class="space-y-3">
              <button
                @click="startDocumentUpload('lernfahrausweis')"
                class="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div class="flex items-center">
                  <div class="text-2xl mr-3">📄</div>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 group-hover:text-blue-900">Lernfahrausweis</div>
                    <div class="text-xs text-gray-500 group-hover:text-blue-700">Nur Vorderseite erforderlich</div>
                  </div>
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </button>
              
              <button
                @click="startDocumentUpload('fuehrerschein')"
                class="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div class="flex items-center">
                  <div class="text-2xl mr-3">🪪</div>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 group-hover:text-blue-900">Führerschein</div>
                    <div class="text-xs text-gray-500 group-hover:text-blue-700">Vorder- und Rückseite erforderlich</div>
                  </div>
                  <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </button>
              
            </div>
            
            <div class="mt-6 text-center">
              <button
                @click="showDocumentTypeSelector = false"
                class="text-sm text-gray-500 hover:text-gray-700"
              >
                Abbrechen
              </button>
            </div>
          </div>

          <!-- Step 3: Upload Interface -->
          <div v-if="showUploadInterface" class="max-w-2xl mx-auto">
            <!-- Header with Back Button -->
            <div class="flex items-center mb-6">
              <button
                @click="goBackToTypeSelection"
                class="mr-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ currentDocumentConfig.title }} hochladen</h3>
                <p class="text-sm text-gray-500">
                  {{ currentDocumentConfig.requiresBothSides ? 'Bitte laden Sie beide Seiten hoch' : 'Bitte laden Sie das Dokument hoch' }}
                </p>
              </div>
            </div>

            <!-- Upload Progress Steps -->
            <div class="mb-8">
              <div class="flex items-center justify-center space-x-8">
                <!-- Step 1: Front -->
                <div class="flex flex-col items-center">
                  <div :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    uploadedDocuments[currentDocumentConfig.frontField] 
                      ? 'bg-green-100 text-green-800' 
                      : currentUploadStep === 'front'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500'
                  ]">
                    {{ uploadedDocuments[currentDocumentConfig.frontField] ? '✓' : '1' }}
                  </div>
                  <span class="text-xs mt-1 text-gray-600">
                    {{ currentDocumentConfig.requiresBothSides ? 'Vorderseite' : currentDocumentConfig.title }}
                  </span>
                </div>
                
                <!-- Connector Line -->
                <div v-if="currentDocumentConfig.requiresBothSides" :class="[
                  'h-px w-16',
                  uploadedDocuments[currentDocumentConfig.frontField] ? 'bg-green-300' : 'bg-gray-300'
                ]"></div>
                
                <!-- Step 2: Back (if required) -->
                <div v-if="currentDocumentConfig.requiresBothSides" class="flex flex-col items-center">
                  <div :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    uploadedDocuments[currentDocumentConfig.backField] 
                      ? 'bg-green-100 text-green-800' 
                      : currentUploadStep === 'back'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500'
                  ]">
                    {{ uploadedDocuments[currentDocumentConfig.backField] ? '✓' : '2' }}
                  </div>
                  <span class="text-xs mt-1 text-gray-600">Rückseite</span>
                </div>
              </div>
            </div>

            <!-- Current Upload Area -->
            <div class="bg-white rounded-lg border p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-4">
                {{ currentUploadStep === 'front' 
                    ? (currentDocumentConfig.requiresBothSides ? 'Vorderseite' : currentDocumentConfig.title)
                    : 'Rückseite' }}
              </h4>
              
              <!-- Success State (when document is uploaded) -->
              <div v-if="uploadedDocuments[currentUploadStep === 'front' ? currentDocumentConfig.frontField : currentDocumentConfig.backField]" 
                   class="border-2 border-green-300 bg-green-50 rounded-lg p-8 text-center">
                <div class="space-y-4">
                  <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div class="text-lg font-medium text-green-900">
                    Upload erfolgreich!
                  </div>
                  <p class="text-sm text-green-700">
                    {{ currentUploadStep === 'front' 
                        ? (currentDocumentConfig.requiresBothSides ? 'Vorderseite' : currentDocumentConfig.title)
                        : 'Rückseite' }} wurde hochgeladen
                  </p>
                  
                  <!-- Preview Image -->
                  <div class="mt-4">
                    <img 
                      :src="uploadedDocuments[currentUploadStep === 'front' ? currentDocumentConfig.frontField : currentDocumentConfig.backField]" 
                      alt="Hochgeladenes Dokument"
                      class="w-32 h-24 object-cover rounded-lg border mx-auto"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Upload Area (when no document uploaded yet) -->
              <div v-else
                @click="triggerCurrentUpload"
                @dragover.prevent="setDragState(true)"
                @dragleave.prevent="setDragState(false)"
                @drop.prevent="handleCurrentDrop"
                :class="[
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                  isDraggingCurrent 
                    ? 'border-blue-400 bg-blue-50 scale-105' 
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
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
            </div>

            <!-- Navigation Buttons -->
            <div class="mt-6 flex justify-between">
              <button
                v-if="currentUploadStep === 'back'"
                @click="currentUploadStep = 'front'"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ← Zurück zur Vorderseite
              </button>
              <div v-else></div>
              
              <button
                v-if="canProceedToNext"
                @click="proceedToNext"
                class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {{ isUploadComplete ? 'Fertig' : 'Weiter' }}
              </button>
            </div>
          </div>

          <!-- Step 4: Document Gallery (when documents exist) -->
          <div v-if="hasAnyDocuments && !showDocumentTypeSelector && !showUploadInterface">
            
            <div class="flex items-center justify-between mb-6">
              <button
                @click="showDocumentTypeSelector = true"
                class="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Hinzufügen
              </button>
            </div>
            

            <!-- Document Grid -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <!-- Document thumbnails will be generated dynamically -->
              
              <!-- Document Cards -->
              <div 
                v-for="doc in existingDocuments" 
                :key="doc.id"
                class="relative group cursor-pointer bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                @click="viewDocument(doc.url, doc.title)"
              >
                <!-- Document Info Header -->
                <div class="mb-3">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
                  <p class="text-xs text-gray-500">{{ doc.type }}</p>
                </div>
                
                <!-- Image Container with better error handling -->
                <div class="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 mb-3 relative">
                  <img 
                    :src="doc.url" 
                    :alt="doc.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    @error="handleImageError"
                    @load="handleImageLoad"
                  />
                </div>
                
                <!-- Status -->
                <div class="text-center">
                  <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    ✅ Hochgeladen
                  </span>
                </div>
                
                <!-- Delete button -->
                <button
                  @click.stop="deleteDocument(doc)"
                  class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            </div>
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
                        <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
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
                        <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </a>
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
                  </div>
                </div>

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
              </div>

              <div class="space-y-4">
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

                <!-- Fahrlehrer -->
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900">Fahrlehrer</div>
                    <div v-if="selectedStudent.assignedInstructor" class="mt-1 text-sm text-gray-700">
                      {{ selectedStudent.assignedInstructor }}
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">-</div>
                  </div>
                </div>

                <!-- Kategorie -->
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
            </div>
          </div>

          <!-- Statistiken -->
          <div class="bg-white rounded-lg border p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Lektionen-Übersicht
            </h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div v-if="selectedStudent.lastLesson" class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900">Letzte Lektion</div>
                  <div class="text-sm text-gray-700">{{ formatDate(selectedStudent.lastLesson) }}</div>
                </div>
              </div>
            </div>

            <!-- Neue detaillierte Lektionen-Übersicht -->
            <div v-if="selectedStudent.scheduledLessonsCount || selectedStudent.completedLessonsCount || selectedStudent.cancelledLessonsCount" class="mt-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Geplante Lektionen -->
                <div v-if="selectedStudent.scheduledLessonsCount" class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span class="text-sm text-gray-600">Geplant: <span class="font-medium text-blue-600">{{ selectedStudent.scheduledLessonsCount }}</span></span>
                </div>
                
                <!-- Durchgeführte Lektionen -->
                <div v-if="selectedStudent.completedLessonsCount" class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span class="text-sm text-gray-600">Durchgeführt: <span class="font-medium text-green-600">{{ selectedStudent.completedLessonsCount }}</span></span>
                </div>
                
                <!-- Gecancelte Lektionen -->
                <div v-if="selectedStudent.cancelledLessonsCount" class="flex items-center space-x-2">
                  <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span class="text-sm text-gray-600">Gecancelt: <span class="font-medium text-orange-600">{{ selectedStudent.cancelledLessonsCount }}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Tab -->
        <div v-if="activeTab === 'progress'" class="h-full overflow-y-auto p-2">

          <!-- Loading State -->
          <div v-if="isLoadingLessons" class="flex items-center justify-center py-8">
            <LoadingLogo size="lg" />
          </div>

          <div v-else-if="lessonsError" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div class="text-4xl mb-4">⚠️</div>
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

          <div v-else-if="progressData.length === 0" class="text-center py-12">
            <div class="text-6xl mb-4">📊</div>
            <h4 class="font-semibold text-gray-900 mb-2 text-lg">Keine Bewertungen verfügbar</h4>
            <p class="text-gray-600 text-sm mb-4">
              {{ lessons.length }} Lektionen gefunden, aber noch keine Kriterien bewertet.
            </p>
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
              <p class="text-yellow-800 text-sm">
                💡 Tipp: Bewertungen werden automatisch angezeigt, sobald Fahrlehrer Kriterien bewerten.
              </p>
            </div>
          </div>

          <div v-else class="space-y-6">
            <!-- Lektionen mit Bewertungen -->
            <div
              v-for="group in progressData"
              :key="group.appointment_id"
              class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <!-- Terminheader -->
              <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span class="font-medium text-gray-900">{{ group.date }}</span>
                    <span class="text-gray-500">•</span>
                    <span class="text-gray-600">{{ group.time }}</span>
                    <span v-if="group.duration" class="text-gray-500 text-sm">
                      ({{ group.duration }} Min)
                    </span>
                  </div>
                </div>
              </div>

              <!-- Bewertungen -->
              <div class="p-4 space-y-3">
                <div
                  v-for="(evaluation, evalIndex) in group.evaluations"
                  :key="`${group.appointment_id}-${evaluation.criteria_id}-${evalIndex}`"
                  class="flex items-start space-x-4 p-3 rounded-lg border-l-4 transition-all hover:bg-gray-50"
                  :style="{ borderLeftColor: evaluation.borderColor }"
                >
                  <!-- Bewertungsbadge -->
                  <div class="flex-shrink-0">
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold"
                      :class="evaluation.colorClass"
                    >
                      {{ evaluation.criteria_rating }}/6
                    </span>
                  </div>

                  <!-- Kriterium und Notiz -->
                  <div class="flex-1 min-w-0">
                    <h5 class="font-medium text-gray-900 mb-1">
                      {{ evaluation.criteria_name }}
                    </h5>
                    <div
                      v-if="evaluation.criteria_note"
                      class="text-sm text-gray-700 bg-gray-50 p-2 rounded border"
                    >
                      {{ evaluation.criteria_note }}
                    </div>
                    <div v-else class="text-sm text-gray-500 italic">
                      Keine Notiz vorhanden
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payments Tab -->
        <div v-if="activeTab === 'payments'" class="h-full overflow-y-auto p-2">
          <!-- Sticky Payment Actions Header -->
          <div v-if="selectedPayments.length > 0" class="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="text-lg font-semibold text-gray-600">
                    Total:
                </div>
                <div class="text-lg font-semibold text-green-600">
                  CHF {{ (totalSelectedAmount / 100).toFixed(2) }}
                </div>
              </div>
              <button 
                @click="markAsPaid"
                :disabled="isProcessingBulkAction"
                class="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span v-if="isProcessingBulkAction">Wird verarbeitet...</span>
                <span v-else>Bar bezahlt</span>
              </button>
            </div>
          </div>

          <div>
            <!-- Loading State -->
            <div v-if="isLoadingPayments" class="flex items-center justify-center py-8">
              <LoadingLogo size="lg" />
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
              <!-- Payments List -->
              <div class="space-y-3">
                <div
                  v-for="payment in payments"
                  :key="payment.id"
                  :class="[
                    'border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer',
                    getPaymentStatusBackgroundClass(payment.payment_status),
                    selectedPayments.includes(payment.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  ]"
                  @click="togglePaymentSelection(payment.id)"
                >
                  <div class="flex items-center space-x-4">
                    <!-- Checkbox für Massenaktionen -->
                    <input
                      v-if="payment.payment_status !== 'completed'"
                      type="checkbox"
                      :value="payment.id"
                      v-model="selectedPayments"
                      class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div v-else class="w-4 h-4"></div>
                    
                    <!-- Payment Info -->
                    <div class="flex-1">
                      <!-- Title and status on first line -->
                      <div class="flex items-center justify-between mb-2">
                        <h5 class="font-medium text-gray-900">
                          {{ payment.appointments?.title || 'Unbekannter Termin' }}
                        </h5>
                        <!-- Appointment Status Badge - Right side -->
                        <div v-if="payment.appointments" class="flex items-center space-x-2">
                          <span :class="[
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            getAppointmentStatusClass(payment.appointments.status)
                          ]">
                            {{ getAppointmentStatusText(payment.appointments.status) }}
                          </span>
                        </div>
                      </div>
                      
                      <!-- Date, time and duration on second line -->
                      <div class="mb-2">
                        <div class="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{{ formatDateTime(payment.appointments?.start_time) }}</span>
                          <span v-if="payment.appointments?.duration_minutes">
                            ({{ payment.appointments.duration_minutes }} Min)
                          </span>
                        </div>
                      </div>
                      
                      <div class="flex items-center justify-between text-sm text-gray-600">
                        <span>Betrag: CHF {{ (payment.total_amount_rappen / 100).toFixed(2) }}</span>
                        <span v-if="payment.paid_at">
                          Bezahlt: {{ formatDate(payment.paid_at) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sticky Footer mit Legende -->
              <div class="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 mt-6 shadow-lg">
                <div class="flex items-center justify-center space-x-6 text-sm">
                  <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span class="text-gray-700">Bezahlt</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                    <span class="text-gray-700">Verrechnet</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                    <span class="text-gray-700">Ausstehend</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Modal -->
    <div v-if="showBulkActionsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="bg-blue-600 text-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">Massenaktionen für {{ selectedPayments.length }} Termine</h3>
            <button @click="closeBulkActionsModal" class="text-white hover:text-blue-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Selected Payments Summary -->
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 class="font-medium text-gray-900 mb-2">Ausgewählte Termine:</h4>
            <div class="space-y-2 max-h-40 overflow-y-auto text-gray-900">
              <div
                v-for="paymentId in selectedPayments"
                :key="paymentId"
                class="flex items-center justify-between text-sm bg-white p-2 rounded border"
              >
                <div class="flex items-center space-x-2">
                  <span>{{ getPaymentById(paymentId)?.appointments?.start_time ? formatDateTime(getPaymentById(paymentId).appointments.start_time) : 'Unbekannter Termin' }}</span>
                  <span v-if="getPaymentById(paymentId)?.appointments?.status" :class="[
                    'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium',
                    getAppointmentStatusClass(getPaymentById(paymentId).appointments.status)
                  ]">
                    {{ getAppointmentStatusText(getPaymentById(paymentId).appointments.status) }}
                  </span>
                </div>
                <span class="font-medium">CHF {{ getPaymentById(paymentId)?.total_amount_rappen ? (getPaymentById(paymentId).total_amount_rappen / 100).toFixed(2) : '0.00' }}</span>
              </div>
            </div>
            
            <div class="mt-3 pt-3 border-t border-gray-200">
              <div class="flex justify-between font-medium text-gray-900">
                <span>Gesamtbetrag:</span>
                <span class="text-lg text-gray-900">CHF {{ totalSelectedAmount.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button
              @click="markAsPaid"
              :disabled="isProcessingBulkAction"
              class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isProcessingBulkAction">Wird verarbeitet...</span>
              <span v-else>✅ Als bezahlt markieren</span>
            </button>
            
            <button
              @click="markAsInvoiced"
              :disabled="isProcessingBulkAction"
              class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isProcessingBulkAction">Wird verarbeitet...</span>
              <span v-else>📄 Als verrechnet markieren</span>
            </button>
            
            <button
              @click="changePaymentMethod"
              :disabled="isProcessingBulkAction"
              class="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isProcessingBulkAction">Wird verarbeitet...</span>
              <span v-else>🔄 Zahlungsmethode ändern</span>
            </button>
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
import { ref, computed, watch, onMounted, toRefs, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import LoadingLogo from '~/components/LoadingLogo.vue'

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
  lernfahrausweis_url: string | null
  lernfahrausweis_back_url: string | null
  lernfahrausweis_a_url?: string | null
  lernfahrausweis_a_back_url?: string | null
  lernfahrausweis_be_url?: string | null
  lernfahrausweis_be_back_url?: string | null
  fuehrerschein_url?: string | null
  fuehrerschein_back_url?: string | null
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
  'A': {
    id: 'lernfahrausweis_a',
    title: 'Lernfahrausweis Kategorie A',
    icon: '🏍️',
    description: 'Lernfahrausweis für Motorräder',
    requiresBothSides: false,
    frontField: 'lernfahrausweis_a_url',
    backField: 'lernfahrausweis_a_back_url',
    storagePrefix: 'lernfahrausweis_a',
    categories: ['A']
  },
  'BE': {
    id: 'lernfahrausweis_be',
    title: 'Lernfahrausweis Kategorie BE',
    icon: '🚛',
    description: 'Lernfahrausweis für Anhänger',
    requiresBothSides: false,
    frontField: 'lernfahrausweis_be_url',
    backField: 'lernfahrausweis_be_back_url',
    storagePrefix: 'lernfahrausweis_be',
    categories: ['BE']
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
    categories: ['B', 'A', 'BE', 'C', 'D'] // Erscheint für alle Kategorien
  }
}

// Category-based document requirements
const categoryDocumentRequirements = computed(() => {
  if (!props.selectedStudent?.category || props.selectedStudent.category.length === 0) {
    return []
  }
  
  const requirements = []
  
  // Add category-specific documents
  props.selectedStudent.category.forEach(category => {
    if (categoryDocumentMapping[category]) {
      requirements.push(categoryDocumentMapping[category])
    }
  })
  
  // Always add general Führerschein option
  requirements.push(categoryDocumentMapping['FUEHRERSCHEIN'])
  
  return requirements
})

// Document upload state
const showUploadInterface = ref(false)
const isDraggingCurrent = ref(false)
const isUploadingCurrent = ref(false)
const currentFileInput = ref<HTMLInputElement>()

// Document viewer state
const showDocumentViewer = ref(false)
const viewerImageUrl = ref('')
const viewerTitle = ref('')
const lessons = ref<any[]>([])
const progressData = ref<any[]>([])
const payments = ref<any[]>([])
const isLoadingLessons = ref(false)
const isLoadingPayments = ref(false)
const lessonsError = ref<string | null>(null)
const paymentsError = ref<string | null>(null)
const selectedPayments = ref<string[]>([])
const showBulkActionsModal = ref(false)
const isProcessingBulkAction = ref(false)

// Computed properties
const paymentsCount = computed(() => payments.value.length)


// New workflow computed properties
const hasAnyDocuments = computed(() => {
  if (!props.selectedStudent) return false
  
  const fields = [
    'lernfahrausweis_url', 'lernfahrausweis_back_url',
    'fuehrerschein_url', 'fuehrerschein_back_url'
  ]
  
  return fields.some(field => props.selectedStudent?.[field])
})


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

// Methods
const closeModal = () => {
  emit('close')
}

// Document management methods
const getLernfahrausweisUrl = (path: string): string => {
  if (!path) return ''
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) return path
  
  // If it's a storage path, get the public URL
  const { data } = supabase.storage
    .from('user-documents')
    .getPublicUrl(path)
  
  return data.publicUrl
}

const viewDocument = (path: string, title: string) => {
  viewerImageUrl.value = getLernfahrausweisUrl(path)
  viewerTitle.value = title
  showDocumentViewer.value = true
}

const closeDocumentViewer = () => {
  showDocumentViewer.value = false
  viewerImageUrl.value = ''
  viewerTitle.value = ''
}

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

const startCategoryUpload = (requirement: any, side: 'front' | 'back') => {
  currentUploadRequirement.value = requirement
  currentUploadSide.value = side
  showUploadInterface.value = true
}

const deleteSpecificDocument = async (fieldName: string) => {
  if (!confirm('Dokument löschen?')) return
  
  try {
    // Get current URL to extract filename
    const currentUrl = selectedStudent.value?.[fieldName]
    if (currentUrl) {
      const filePath = currentUrl.split('/').pop()
      if (filePath) {
        await supabase.storage
          .from('user-documents')
          .remove([`lernfahrausweise/${filePath}`])
      }
    }
    
    // Update database
    await supabase
      .from('users')
      .update({ [fieldName]: null })
      .eq('id', selectedStudent.value?.id)
    
    // Emit update to parent
    emit('studentUpdated', {
      id: selectedStudent.value?.id,
      [fieldName]: null
    })
    
    logger.debug('✅ Document deleted successfully')
    
  } catch (error) {
    console.error('Error deleting document:', error)
    alert('Fehler beim Löschen des Dokuments')
  }
}


const deleteDocument = async (doc: any) => {
  if (!confirm(`${doc.title} löschen?`)) return
  
  try {
    // Delete from storage
    const filePath = doc.url.split('/').pop()
    if (filePath) {
      await supabase.storage
        .from('user-documents')
        .remove([`lernfahrausweise/${filePath}`])
    }
    
    // Update database
    await supabase
      .from('users')
      .update({ [doc.field]: null })
      .eq('id', selectedStudent.value?.id)
    
    logger.debug('✅ Document deleted successfully')
    
  } catch (error) {
    console.error('Error deleting document:', error)
    alert('Fehler beim Löschen des Dokuments')
  }
}

// Image event handlers
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  console.error('❌ Image failed to load:', img.src)
  img.style.display = 'none'
  
  // Show error placeholder
  const container = img.parentElement
  if (container) {
    container.innerHTML = `
      <div class="w-full h-full flex items-center justify-center bg-red-50 text-red-500">
        <div class="text-center">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs">Bild nicht verfügbar</p>
        </div>
      </div>
    `
  }
}

const handleImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
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

const uploadCurrentFile = async (file: File) => {
  if (!selectedStudent.value?.id) {
    alert('❌ Kein Benutzer ausgewählt')
    return
  }
  
  isUploadingCurrent.value = true
  
  try {
    // Use category-based system
    const requirement = currentUploadRequirement.value
    const side = currentUploadSide.value
    
    if (!requirement) {
      alert('❌ Kein Dokument-Typ ausgewählt')
      return
    }
    
    const fieldName = side === 'front' ? requirement.frontField : requirement.backField
    const storagePrefix = requirement.storagePrefix
    
    // Generate unique filename
    const fileName = `${selectedStudent.value.id}_${storagePrefix}_${side}_${Date.now()}.jpg`
    const filePath = `lernfahrausweise/${fileName}`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError)
      alert(`❌ Upload fehlgeschlagen: ${uploadError.message}`)
      return
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-documents')
      .getPublicUrl(filePath)
    
    const publicUrl = urlData.publicUrl
    
    // Update database
    logger.debug('📝 Attempting database update...', {
      userId: selectedStudent.value.id,
      fieldName: fieldName,
      publicUrl: publicUrl
    })
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ [fieldName]: publicUrl })
      .eq('id', selectedStudent.value.id)
    
    if (updateError) {
      console.error('❌ Database update failed:', updateError)
      console.error('❌ Update details:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint
      })
      alert(`❌ Datenbankupdate fehlgeschlagen: ${updateError.message}`)
      return
    }
    
    logger.debug('✅ Database update successful')
    
    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select(fieldName)
      .eq('id', selectedStudent.value.id)
      .single()
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
    } else {
      logger.debug('✅ Verification successful:', verifyData)
    }
    
    // Store in temp state
    uploadedDocuments.value[fieldName] = publicUrl
    
    // ✅ WICHTIG: Emit update to parent component
    emit('studentUpdated', {
      id: selectedStudent.value.id,
      [fieldName]: publicUrl
    })
    
    logger.debug('✅ Document uploaded successfully:', fileName)
    
    // Nach erfolgreichem Upload automatisch schließen
    setTimeout(() => {
      showUploadInterface.value = false
      currentUploadRequirement.value = null
    }, 1500)
    
  } catch (error) {
    console.error('❌ Upload error:', error)
    alert('❌ Upload fehlgeschlagen')
  } finally {
    isUploadingCurrent.value = false
  }
}


// Drag & Drop handlers
const handleDragOver = (side: 'front' | 'back') => {
  if (side === 'front') {
    isDraggingFront.value = true
  } else {
    isDraggingBack.value = true
  }
}

const handleDragLeave = (side: 'front' | 'back') => {
  if (side === 'front') {
    isDraggingFront.value = false
  } else {
    isDraggingBack.value = false
  }
}

const handleDrop = (side: 'front' | 'back', event: DragEvent) => {
  if (side === 'front') {
    isDraggingFront.value = false
  } else {
    isDraggingBack.value = false
  }
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (side === 'front') {
      uploadFrontFile(file)
    } else {
      uploadBackFile(file)
    }
  }
}

// File selection handlers
const handleFrontFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadFrontFile(file)
  }
}

const handleBackFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadBackFile(file)
  }
}

// File validation
const validateFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Datei zu groß. Maximum 5MB erlaubt.' }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Ungültiger Dateityp. Nur JPG, PNG und WebP erlaubt.' }
  }
  
  return { valid: true }
}

// Upload functions
const uploadFrontFile = async (file: File) => {
  const validation = validateFile(file)
  if (!validation.valid) {
    alert(`❌ ${validation.error}`)
    return
  }
  
  isUploadingFront.value = true
  
  try {
    logger.debug('📸 Uploading front license for user:', selectedStudent.value?.id)
    
    if (!selectedStudent.value?.id) {
      alert('❌ Kein Benutzer ausgewählt')
      return
    }
    
    // Generate unique filename
    const fileName = `${selectedStudent.value.id}_lernfahrausweis_front_${Date.now()}.jpg`
    const filePath = `lernfahrausweise/${fileName}`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })
    
    if (uploadError) {
      console.error('❌ Front upload failed:', uploadError)
      alert(`❌ Upload fehlgeschlagen: ${uploadError.message}`)
      return
    }
    
    logger.debug('✅ Front image uploaded:', uploadData.path)
    
    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        lernfahrausweis_url: uploadData.path,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedStudent.value.id)
    
    if (updateError) {
      console.error('❌ Failed to update user record:', updateError)
      alert(`❌ Fehler beim Speichern: ${updateError.message}`)
      return
    }
    
    // Update local data
    if (selectedStudent.value) {
      selectedStudent.value.lernfahrausweis_url = uploadData.path
    }
    
    logger.debug('✅ Front license updated successfully')
    alert('✅ Lernfahrausweis Vorderseite erfolgreich hochgeladen!')
    
  } catch (error: any) {
    console.error('❌ Upload error:', error)
    alert(`❌ Upload fehlgeschlagen: ${error.message}`)
  } finally {
    isUploadingFront.value = false
  }
}

const uploadBackFile = async (file: File) => {
  const validation = validateFile(file)
  if (!validation.valid) {
    alert(`❌ ${validation.error}`)
    return
  }
  
  isUploadingBack.value = true
  
  try {
    logger.debug('📸 Uploading back license for user:', selectedStudent.value?.id)
    
    if (!selectedStudent.value?.id) {
      alert('❌ Kein Benutzer ausgewählt')
      return
    }
    
    // Generate unique filename
    const fileName = `${selectedStudent.value.id}_lernfahrausweis_back_${Date.now()}.jpg`
    const filePath = `lernfahrausweise/${fileName}`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })
    
    if (uploadError) {
      console.error('❌ Back upload failed:', uploadError)
      alert(`❌ Upload fehlgeschlagen: ${uploadError.message}`)
      return
    }
    
    logger.debug('✅ Back image uploaded:', uploadData.path)
    
    // Update user record
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        lernfahrausweis_back_url: uploadData.path,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedStudent.value.id)
    
    if (updateError) {
      console.error('❌ Failed to update user record:', updateError)
      alert(`❌ Fehler beim Speichern: ${updateError.message}`)
      return
    }
    
    // Update local data
    if (selectedStudent.value) {
      selectedStudent.value.lernfahrausweis_back_url = uploadData.path
    }
    
    logger.debug('✅ Back license updated successfully')
    alert('✅ Lernfahrausweis Rückseite erfolgreich hochgeladen!')
    
  } catch (error: any) {
    console.error('❌ Upload error:', error)
    alert(`❌ Upload fehlgeschlagen: ${error.message}`)
  } finally {
    isUploadingBack.value = false
  }
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Nicht angegeben'
  return new Date(dateString).toLocaleDateString('de-CH')
}

const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Nicht angegeben'
  return new Date(dateString).toLocaleString('de-CH')
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

const loadLessons = async () => {
  if (!props.selectedStudent) return
  
  isLoadingLessons.value = true
  lessonsError.value = null
  
  try {
    // 1. Lade Appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        location_id,
        type
      `)
      .eq('user_id', props.selectedStudent.id)
      .in('status', ['scheduled', 'confirmed', 'completed', 'cancelled'])
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError

    if (!appointments || appointments.length === 0) {
      lessons.value = []
      progressData.value = []
      return
    }

    // 2. Lade Notes mit Bewertungen
    const appointmentIds = appointments.map(a => a.id)
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(`
        appointment_id,
        criteria_rating,
        criteria_note,
        evaluation_criteria_id
      `)
      .in('appointment_id', appointmentIds)
      .not('evaluation_criteria_id', 'is', null)
      .not('criteria_rating', 'is', null)
      .not('criteria_rating', 'eq', 0)

    if (notesError) throw notesError

    logger.debug('📝 Notes loaded:', notes)
    logger.debug('🔍 Sample note:', notes?.[0])

    // 3. Lade Kriterien-Namen
    let criteriaMap: Record<string, any> = {}
    if (notes && notes.length > 0) {
      const criteriaIds = [...new Set(notes.map(n => n.evaluation_criteria_id).filter(Boolean))]
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('evaluation_criteria')
        .select('id, name')
        .in('id', criteriaIds)

      if (!criteriaError && criteriaData) {
        criteriaMap = criteriaData.reduce((acc, c) => {
          acc[c.id] = c
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 4. Verarbeite Notes zu Criteria Evaluations
    const notesByAppointment = (notes || []).reduce((acc: Record<string, any[]>, note: any) => {
      if (!acc[note.appointment_id]) {
        acc[note.appointment_id] = []
      }
      
      const criteria = criteriaMap[note.evaluation_criteria_id]
      
      if (note.evaluation_criteria_id && note.criteria_rating !== null && note.criteria_rating > 0 && criteria) {
        acc[note.appointment_id].push({
          criteria_id: note.evaluation_criteria_id,
          criteria_name: criteria.name || 'Unbekannt',
          criteria_rating: note.criteria_rating,
          criteria_note: note.criteria_note || ''
        })
      }
      
      return acc
    }, {} as Record<string, any[]>)

    logger.debug('🔍 Notes by appointment:', notesByAppointment)

    // 5. Kombiniere alles
    lessons.value = appointments.map(appointment => ({
      ...appointment,
      evaluations: notesByAppointment[appointment.id] || []
    }))
    
    // 6. Process progress data
    progressData.value = lessons.value
      .filter(lesson => lesson.evaluations && lesson.evaluations.length > 0)
      .map(lesson => {
        logger.debug('🔍 Processing lesson:', lesson.id, 'with evaluations:', lesson.evaluations)
        return {
          appointment_id: lesson.id,
          date: formatDate(lesson.start_time),
          time: new Date(lesson.start_time).toLocaleTimeString('de-CH', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          duration: lesson.duration_minutes,
          evaluations: lesson.evaluations.map((evaluation: any) => {
            const processedEval = {
              ...evaluation,
              colorClass: getRatingColorClass(evaluation.criteria_rating),
              textColorClass: getRatingTextColorClass(evaluation.criteria_rating),
              noteColorClass: getRatingNoteColorClass(evaluation.criteria_rating),
              borderColor: getRatingBorderColor(evaluation.criteria_rating)
            }
            logger.debug('🔍 Processed evaluation:', processedEval)
            return processedEval
          })
        }
      })

    logger.debug('✅ Final lessons:', lessons.value?.length)
    logger.debug('✅ Final progress data:', progressData.value)
    logger.debug('🔍 Sample progress entry:', progressData.value?.[0])
    
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
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          start_time,
          duration_minutes,
          status,
          type,
          title
        )
      `)
      .eq('user_id', props.selectedStudent.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    payments.value = data || []
    
  } catch (error) {
    console.error('Error loading payments:', error)
    paymentsError.value = 'Fehler beim Laden der Zahlungen'
  } finally {
    isLoadingPayments.value = false
  }
}

const getRatingColorClass = (rating: number): string => {
  if (rating >= 5) return 'bg-green-100 text-green-800'
  if (rating >= 4) return 'bg-blue-100 text-blue-800'
  if (rating >= 3) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

const getRatingTextColorClass = (rating: number): string => {
  if (rating >= 5) return 'text-green-700'
  if (rating >= 4) return 'text-blue-700'
  if (rating >= 3) return 'text-yellow-700'
  return 'text-red-700'
}

const getRatingNoteColorClass = (rating: number): string => {
  if (rating >= 5) return 'text-green-600'
  if (rating >= 4) return 'text-blue-600'
  if (rating >= 3) return 'text-yellow-600'
  return 'text-red-600'
}

const getRatingBorderColor = (rating: number): string => {
  if (rating >= 5) return '#10b981'
  if (rating >= 4) return '#3b82f6'
  if (rating >= 3) return '#eab308'
  return '#ef4444'
}

const getPaymentStatusBackgroundClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 border-green-200'
    case 'invoiced':
      return 'bg-blue-50 border-blue-200'
    case 'pending':
    default:
      return 'bg-red-50 border-red-200'
  }
}

const getAppointmentStatusClass = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'confirmed':
      return 'bg-blue-100 text-blue-800'
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    case 'no_show':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getAppointmentStatusText = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'Durchgeführt'
    case 'confirmed':
      return 'Bestätigt'
    case 'scheduled':
      return 'Geplant'
    case 'cancelled':
      return 'Abgesagt'
    case 'no_show':
      return 'Nicht erschienen'
    default:
      return status || 'Unbekannt'
  }
}

const getPaymentMethodClass = (method: string): string => {
  switch (method) {
    case 'invoice':
      return 'bg-blue-100 text-blue-800'
    case 'card':
      return 'bg-green-100 text-green-800'
    case 'cash':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getPaymentMethodText = (method: string): string => {
  switch (method) {
    case 'invoice':
      return 'Rechnung'
    case 'card':
      return 'Karte'
    case 'cash':
      return 'Bargeld'
    default:
      return 'Unbekannt'
  }
}

const togglePaymentSelection = (paymentId: string) => {
  const index = selectedPayments.value.indexOf(paymentId)
  if (index > -1) {
    selectedPayments.value.splice(index, 1)
  } else {
    selectedPayments.value.push(paymentId)
  }
}

const openBulkActionsModal = () => {
  showBulkActionsModal.value = true
}

const closeBulkActionsModal = () => {
  showBulkActionsModal.value = false
  selectedPayments.value = []
}

const getPaymentById = (paymentId: string) => {
  return payments.value.find(p => p.id === paymentId)
}

const markAsPaid = async () => {
  if (selectedPayments.value.length === 0) return
  
  isProcessingBulkAction.value = true
  
  try {
    logger.debug('✅ Marking payments as paid:', selectedPayments.value)
    
    // Prüfe welche Zahlungen geändert werden können
    const paymentsToUpdate = payments.value.filter(p => 
      selectedPayments.value.includes(p.id) && 
      (p.payment_status === 'pending' || p.payment_status === 'completed')
    )
    
    if (paymentsToUpdate.length === 0) {
      alert('Keine Zahlungen zum Aktualisieren gefunden')
      return
    }
    
    logger.debug('🔄 Updating payments:', paymentsToUpdate.map(p => ({
      id: p.id,
      current_method: p.payment_method,
      current_status: p.payment_status
    })))
    
    const { error } = await supabase
      .from('payments')
      .update({ 
        payment_method: 'cash',
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', selectedPayments.value)
    
    if (error) throw error
    
    // Refresh payments
    await loadPayments()
    
    // Clear selection
    selectedPayments.value = []
    
    logger.debug('✅ Payments updated to cash and marked as paid successfully')
    
  } catch (error: any) {
    console.error('❌ Error marking payments as paid:', error)
    alert('Fehler beim Markieren der Zahlungen als bezahlt')
  } finally {
    isProcessingBulkAction.value = false
  }
}

const markAsInvoiced = async () => {
  // Implementation for marking payments as invoiced
  logger.debug('Marking payments as invoiced:', selectedPayments.value)
}

const changePaymentMethod = async () => {
  // Implementation for changing payment method
  logger.debug('Changing payment method for:', selectedPayments.value)
}

// Watchers
watch(() => props.selectedStudent, (newStudent) => {
  if (newStudent) {
    loadLessons()
    loadPayments()
  }
}, { immediate: true })

watch(() => activeTab.value, (newTab) => {
  if ((newTab === 'progress' || newTab === 'payments') && props.selectedStudent) {
    if (newTab === 'progress') {
      loadLessons()
    } else if (newTab === 'payments') {
      loadPayments()
    }
  }
})
</script>
