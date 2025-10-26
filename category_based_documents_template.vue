<!-- Category-Based Documents Template -->
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
            <span v-if="selectedStudent?.[requirement.frontField]" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              ✅ Vorhanden
            </span>
            <span v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              ❌ Fehlt
            </span>
          </div>
          
          <!-- Upload Area or Preview -->
          <div v-if="selectedStudent?.[requirement.frontField]" class="relative group">
            <img 
              :src="selectedStudent[requirement.frontField]" 
              :alt="requirement.title + ' Vorderseite'"
              class="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
              @click="viewDocument(selectedStudent[requirement.frontField], requirement.title + (requirement.requiresBothSides ? ' Vorderseite' : ''))"
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
            <span v-if="selectedStudent?.[requirement.backField]" class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              ✅ Vorhanden
            </span>
            <span v-else class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
              ❌ Fehlt
            </span>
          </div>
          
          <!-- Upload Area or Preview -->
          <div v-if="selectedStudent?.[requirement.backField]" class="relative group">
            <img 
              :src="selectedStudent[requirement.backField]" 
              :alt="requirement.title + ' Rückseite'"
              class="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80"
              @click="viewDocument(selectedStudent[requirement.backField], requirement.title + ' Rückseite')"
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



















