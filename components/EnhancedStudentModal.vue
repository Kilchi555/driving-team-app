<template>
  <div v-if="selectedStudent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 pb-16">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="text-white p-4" :style="{ backgroundColor: secondaryColor }">
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
            <button @click="closeModal" class="text-white hover:opacity-80 transition-opacity">
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
          <!-- Hidden file input to trigger native picker directly on first click -->
          <input
            ref="currentFileInput"
            type="file"
            accept="image/*,.pdf"
            @change="handleCurrentFileSelect"
            class="hidden"
          />

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
                    @click="startCategoryUpload(requirement, 'front', true)"
                    class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    <p class="text-sm text-gray-600">{{ requirement.requiresBothSides ? 'Vorderseite' : requirement.title }} hochladen</p>
                  </div>
                </div>

                <!-- Back Document disabled: one upload per category -->
                <div v-if="false">
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
                    @click="startCategoryUpload(requirement, 'back', true)"
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
              
              <!-- Hidden file input moved to documents tab for direct trigger -->

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
          <!-- Sub-Tab Navigation -->
          <div class="flex gap-2 mb-4 border-b border-gray-200">
            <button
              @click="progressSubTab = 'lektionen'"
              :class="[
                'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                progressSubTab === 'lektionen'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              ]"
            >
              Lektionen
            </button>
            <button
              @click="progressSubTab = 'prüfungen'"
              :class="[
                'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                progressSubTab === 'prüfungen'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              ]"
            >
              Prüfungen
            </button>
          </div>

          <!-- Lektionen Sub-Tab -->
          <div v-if="progressSubTab === 'lektionen'">
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
            
            <!-- Filter und Sortierung auf separater Zeile -->
            <div 
              class="flex items-center justify-between gap-4 py-3 px-4 rounded-lg"
              :style="{ backgroundColor: primaryColor + '20' }"
            >
              <!-- Kategorie Filter -->
              <div class="flex items-center gap-2">
                <select
                  v-model="selectedCategoryFilter"
                  class="text-sm border border-gray-300 rounded px-3 py-1 text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-1"
                  :style="{ 
                    backgroundColor: primaryColor,
                    '--tw-ring-color': primaryColor
                  }"
                >
                  <option v-for="category in availableCategories" :key="category" :value="category">
                    {{ category === 'alle' ? 'Alle' : category }}
                  </option>
                </select>
              </div>
              
              <!-- Sortier-Toggle -->
              <div class="flex items-center gap-3">
                <span 
                  :class="['text-sm font-medium transition-colors']"
                  :style="{ color: sortMode === 'newest' ? primaryColor : '#6B7280' }"
                >
                  Neueste
                </span>
                
                <!-- Schieberegler -->
                <button
                  @click="sortMode = sortMode === 'newest' ? 'worst' : 'newest'"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
                  ]"
                  :style="{ 
                    backgroundColor: sortMode === 'worst' ? primaryColor : '#D1D5DB',
                    '--tw-ring-color': primaryColor
                  }"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      sortMode === 'worst' ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
                
                <span 
                  :class="['text-sm font-medium transition-colors']"
                  :style="{ color: sortMode === 'worst' ? primaryColor : '#6B7280' }"
                >
                  Schlechteste
                </span>
              </div>
            </div>
            
            <!-- Lektionen Liste -->
            <div class="space-y-3">
              <div 
                v-for="lesson in sortedLessons" 
                :key="lesson.id"
                :class="[
                  'rounded-lg p-4 border transition-all',
                  lesson.status === 'cancelled' 
                    ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed' 
                    : 'border-gray-200 cursor-pointer hover:shadow-md'
                ]"
                :style="lesson.status !== 'cancelled' ? { backgroundColor: primaryColor + '15' } : {}"
                @click="lesson.status !== 'cancelled' ? openEvaluationModal(lesson) : null"
              >
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h5 :class="[
                      'font-semibold',
                      lesson.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'
                    ]">
                      {{ lesson.event_types?.name || lesson.event_type_code || lesson.type || 'Lektion' }}
                      <span v-if="lesson.instructor" class="font-normal text-gray-600">
                        mit {{ lesson.instructor.first_name }}
                      </span>
                    </h5>
                    <p :class="[
                      'text-sm',
                      lesson.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'
                    ]">
                      {{ formatLocalDate(lesson.start_time) }}
                      um {{ formatLocalTime(lesson.start_time) }}
                    </p>
                  </div>
                  <span :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    lesson.status === 'completed' && lesson.evaluations && lesson.evaluations.length > 0 ? 'bg-green-100 text-green-800' :
                    lesson.status === 'completed' && (!lesson.evaluations || lesson.evaluations.length === 0) ? 'bg-orange-100 text-orange-800' :
                    lesson.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    lesson.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    lesson.status === 'pending_confirmation' ? 'bg-yellow-100 text-yellow-800' :
                    lesson.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  ]">
                    {{ lesson.status === 'completed' && lesson.evaluations && lesson.evaluations.length > 0 ? 'Abgeschlossen' :
                       lesson.status === 'completed' && (!lesson.evaluations || lesson.evaluations.length === 0) ? 'Unbewertet' :
                       lesson.status === 'confirmed' ? 'Bestätigt' :
                       lesson.status === 'scheduled' ? 'Geplant' :
                       lesson.status === 'pending_confirmation' ? 'Ausstehend' :
                       lesson.status === 'cancelled' ? 'Abgesagt' :
                       lesson.status }}
                  </span>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span :class="lesson.status === 'cancelled' ? 'text-gray-400' : 'text-gray-500'">Kategorie:</span>
                    <span :class="['ml-1 font-medium', lesson.status === 'cancelled' ? 'text-gray-400' : '']">{{ lesson.type || '-' }}</span>
                  </div>
                  <div>
                    <span :class="lesson.status === 'cancelled' ? 'text-gray-400' : 'text-gray-500'">Dauer:</span>
                    <span :class="['ml-1 font-medium', lesson.status === 'cancelled' ? 'text-gray-400' : '']">{{ lesson.duration_minutes || 0 }} Min.</span>
                  </div>
                </div>
                
                <div v-if="lesson.description" :class="[
                  'mt-2 text-sm',
                  lesson.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'
                ]">
                  {{ lesson.description }}
                </div>
                
                <!-- Evaluationen -->
                <div v-if="lesson.evaluations && lesson.evaluations.length > 0" class="mt-3 pt-3 border-t border-gray-300">
                  <h6 class="text-xs font-semibold text-gray-700 mb-2">Bewertungen:</h6>
                  <div class="space-y-2">
                    <div 
                      v-for="evaluation in lesson.evaluations" 
                      :key="evaluation.id"
                      class="rounded p-2 text-sm"
                      :style="{ backgroundColor: primaryColor + '10' }"
                    >
                      <div class="flex justify-between items-start">
                        <span class="font-medium text-gray-700">
                          {{ evaluation.evaluation_criteria?.name || 'Bewertung' }}
                        </span>
                        <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                          {{ evaluation.criteria_rating }}/6
                        </span>
                      </div>
                      <p v-if="evaluation.criteria_note" class="text-xs text-gray-600 mt-1">
                        {{ evaluation.criteria_note }}
                      </p>
                    </div>
                  </div>
                </div>
                
                <!-- Allgemeine Notes (ohne Evaluation) -->
                <div v-if="lesson.notes && lesson.notes.filter((n: any) => !n.evaluation_criteria_id && n.note_text).length > 0" class="mt-3 pt-3 border-t border-gray-300">
                  <h6 class="text-xs font-semibold text-gray-700 mb-2">Notizen:</h6>
                  <div class="space-y-1">
                    <div 
                      v-for="note in lesson.notes.filter((n: any) => !n.evaluation_criteria_id && n.note_text)" 
                      :key="note.id"
                      class="rounded p-2 text-sm text-gray-700"
                      :style="{ backgroundColor: primaryColor + '08' }"
                    >
                      {{ note.note_text }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <!-- Prüfungen Sub-Tab -->
          <div v-if="progressSubTab === 'prüfungen'">
            <!-- Loading State -->
            <div v-if="isLoadingExamResults" class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span class="ml-3 text-gray-600">Lade Prüfungsergebnisse...</span>
            </div>

            <div v-else-if="examResultsError" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
              <h4 class="font-semibold text-red-900 mb-2">Fehler beim Laden</h4>
              <p class="text-red-700 text-sm mb-4">{{ examResultsError }}</p>
              <button @click="loadExamResults" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                Erneut versuchen
              </button>
            </div>

            <div v-else-if="examResults.length === 0" class="text-center py-12">
              <div class="text-6xl mb-4">🎓</div>
              <h4 class="font-semibold text-gray-900 mb-2 text-lg">Keine Prüfungsergebnisse gefunden</h4>
              <p class="text-gray-600">Für diesen Schüler wurden noch keine Prüfungen erfasst.</p>
            </div>

            <div v-else class="space-y-3">
              <div 
                v-for="result in examResults" 
                :key="result.id"
                class="rounded-lg p-4 border-2"
                :class="result.passed ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'"
              >
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h5 class="font-semibold text-gray-900 text-lg">
                      {{ result.appointments?.event_types?.name || result.appointments?.event_type_code || result.appointments?.type || 'Prüfung' }}
                      <span v-if="result.appointments?.instructor" class="font-normal text-gray-600">
                        mit {{ result.appointments.instructor.first_name }}
                      </span>
                    </h5>
                    <p class="text-sm text-gray-600">
                      {{ formatLocalDate(result.exam_date) }}
                    </p>
                  </div>
                  <span :class="[
                    'px-3 py-1 text-sm font-bold rounded-full',
                    result.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  ]">
                    {{ result.passed ? 'BESTANDEN' : 'NICHT BESTANDEN' }}
                  </span>
                </div>
                
                <div v-if="result.examiner_behavior_rating" class="mt-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600">Verhalten des Prüfers:</span>
                    <span class="font-medium">{{ result.examiner_behavior_rating }}/6</span>
                  </div>
                </div>
                
                <div v-if="result.examiner_behavior_notes" class="mt-2 text-sm text-gray-700 italic">
                  {{ result.examiner_behavior_notes }}
                </div>
              </div>
            </div>
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
            
            <!-- Filter auf separater Zeile -->
            <div 
              class="flex items-center justify-center gap-3 py-3 rounded-lg"
              :style="{ backgroundColor: primaryColor + '20' }"
            >
              <span 
                :class="['text-sm font-medium transition-colors']"
                :style="{ color: paymentsFilterMode === 'alle' ? primaryColor : '#6B7280' }"
              >
                Alle
              </span>
              
              <!-- Schieberegler -->
              <button
                @click="paymentsFilterMode = paymentsFilterMode === 'alle' ? 'ausstehend' : 'alle'"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
                ]"
                :style="{ 
                  backgroundColor: paymentsFilterMode === 'ausstehend' ? primaryColor : '#D1D5DB',
                  '--tw-ring-color': primaryColor
                }"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    paymentsFilterMode === 'ausstehend' ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
              
              <span 
                :class="['text-sm font-medium transition-colors']"
                :style="{ color: paymentsFilterMode === 'ausstehend' ? primaryColor : '#6B7280' }"
              >
                Ausstehend
              </span>
            </div>
            
            <!-- Zahlungen Liste -->
            <div class="space-y-3">
              <div 
                v-for="payment in filteredPayments" 
                :key="payment.id"
                :class="[
                  'rounded-lg p-4 border transition-all',
                  payment.appointments?.status === 'cancelled'
                    ? 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                    : payment.payment_status !== 'completed' 
                      ? 'border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-400' 
                      : 'border-gray-200 opacity-75'
                ]"
                :style="payment.appointments?.status !== 'cancelled' ? { backgroundColor: primaryColor + '15' } : {}"
                @click="payment.appointments?.status !== 'cancelled' ? markPaymentAsCashPaid(payment) : null"
              >
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h5 :class="[
                      'font-semibold',
                      payment.appointments?.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'
                    ]">
                      {{ (payment.total_amount_rappen / 100).toFixed(2) }} CHF
                    </h5>
                    <p :class="[
                      'text-sm',
                      payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'
                    ]">
                      {{ formatLocalDate(payment.appointments?.start_time || payment.created_at) }}
                      um {{ formatLocalTime(payment.appointments?.start_time || payment.created_at) }}
                    </p>
                    <p v-if="payment.appointments?.event_type_code" :class="[
                      'text-xs mt-1',
                      payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-500'
                    ]">
                      {{ payment.appointments.event_type_code }}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span :class="[
                      'px-2 py-1 text-xs font-medium rounded-full',
                      payment.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                      payment.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      payment.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    ]">
                      {{ payment.payment_status === 'completed' ? 'Bezahlt' :
                         payment.payment_status === 'pending' ? 'Ausstehend' :
                         payment.payment_status === 'failed' ? 'Fehlgeschlagen' :
                         payment.payment_status }}
                    </span>
                    <span v-if="payment.appointments?.status === 'cancelled'" class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Termin abgesagt
                    </span>
                  </div>
                </div>
                
                <!-- Product Sales & Discounts Section -->
                <div v-if="(payment.product_sales && payment.product_sales.length > 0) || (payment.discount_sales && payment.discount_sales.length > 0)" class="mt-3 pt-3 border-t border-gray-300">
                  <!-- Product Sales -->
                  <div v-if="payment.product_sales && payment.product_sales.length > 0" class="mb-3">
                    <h6 class="text-xs font-semibold text-gray-700 mb-2">Produkte:</h6>
                    <div class="space-y-1">
                      <div 
                        v-for="productSale in payment.product_sales" 
                        :key="productSale.id"
                        class="flex justify-between items-center text-sm"
                      >
                        <span :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'">
                          {{ productSale.products?.name || 'Produkt' }} ({{ productSale.quantity }}x)
                        </span>
                        <span :class="[
                          'font-medium',
                          payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-900'
                        ]">
                          {{ ((productSale.products?.price_rappen || 0) * productSale.quantity / 100).toFixed(2) }} CHF
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Discount Sales -->
                  <div v-if="payment.discount_sales && payment.discount_sales.length > 0">
                    <h6 class="text-xs font-semibold text-gray-700 mb-2">Rabatte:</h6>
                    <div class="space-y-1">
                      <div 
                        v-for="discountSale in payment.discount_sales" 
                        :key="discountSale.id"
                        class="flex justify-between items-center text-sm"
                      >
                        <span :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'">
                          {{ discountSale.discounts?.name || 'Rabatt' }}
                        </span>
                        <span :class="[
                          'font-medium',
                          payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-green-600'
                        ]">
                          -{{ ((discountSale.discounts?.discount_amount_rappen || 0) / 100).toFixed(2) }} CHF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Stornierungs-Policy Info -->
                <div v-if="payment.appointments?.status === 'cancelled'" class="mt-3 pt-3 border-t border-gray-300">
                  <div v-if="getCancellationPolicy(payment.appointments)" class="text-sm space-y-2">
                    <div>
                      <span class="text-gray-600">Stornierungs-Policy:</span>
                      <span class="ml-2 font-medium text-gray-700">
                        {{ getCancellationPolicy(payment.appointments).refund_percentage }}% Rückerstattung
                      </span>
                      <span class="ml-2 text-xs text-gray-500">
                        ({{ getCancellationPolicy(payment.appointments).hours_before_appointment }}h vor Termin)
                      </span>
                    </div>
                    
                    <!-- Detaillierte Berechnung -->
                    <div v-if="calculateCancelledPayment(payment)" class="bg-gray-50 p-3 rounded text-xs space-y-1">
                      <template v-if="calculateCancelledPayment(payment)">
                        <div class="flex justify-between">
                          <span>Termin-Kosten:</span>
                          <span>{{ (calculateCancelledPayment(payment)!.appointmentCost / 100).toFixed(2) }} CHF</span>
                        </div>
                        <div class="flex justify-between text-red-600">
                          <span>Rückerstattung ({{ calculateCancelledPayment(payment)!.policy.refund_percentage }}%):</span>
                          <span>-{{ (calculateCancelledPayment(payment)!.appointmentRefund / 100).toFixed(2) }} CHF</span>
                        </div>
                        <div v-if="calculateCancelledPayment(payment)!.productCost > 0" class="flex justify-between">
                          <span>Produkte (immer verrechnet):</span>
                          <span>{{ (calculateCancelledPayment(payment)!.productCost / 100).toFixed(2) }} CHF</span>
                        </div>
                        <div v-if="calculateCancelledPayment(payment)!.discountRefund > 0" class="flex justify-between text-green-600">
                          <span>Rabatt zurückgegeben:</span>
                          <span>+{{ (calculateCancelledPayment(payment)!.discountRefund / 100).toFixed(2) }} CHF</span>
                        </div>
                        <div class="flex justify-between font-semibold border-t pt-1">
                          <span>Endbetrag:</span>
                          <span>{{ (calculateCancelledPayment(payment)!.totalCost / 100).toFixed(2) }} CHF</span>
                        </div>
                      </template>
                    </div>
                  </div>
                  <div v-else class="text-sm text-gray-500">
                    Keine Stornierungs-Policy gefunden
                  </div>
                </div>
                
                <div class="text-sm">
                  <span class="text-gray-500">Zahlungsmethode:</span>
                  <span class="ml-1 font-medium">
                    {{ payment.payment_method === 'cash' ? 'Bar' :
                       payment.payment_method === 'invoice' ? 'Rechnung' :
                       payment.payment_method === 'wallee' ? 'Online' :
                       payment.payment_method }}
                  </span>
                </div>
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
    
    <!-- Evaluation Modal -->
    <EvaluationModal
      v-if="showEvaluationModal && selectedAppointmentForEvaluation"
      :is-open="showEvaluationModal"
      :appointment="selectedAppointmentForEvaluation"
      :student-category="selectedAppointmentForEvaluation.type || selectedStudent?.category?.[0] || 'B'"
      :current-user="{ id: selectedStudent?.id }"
      @close="closeEvaluationModal"
      @saved="onEvaluationSaved"
    />
    
    <!-- Confirmation Dialog -->
    <ConfirmationDialog
      :is-visible="showConfirmDialog"
      :title="confirmDialogData.title"
      :message="confirmDialogData.message"
      :details="confirmDialogData.details"
      :icon="confirmDialogData.icon"
      :type="confirmDialogData.type"
      :confirm-text="confirmDialogData.confirmText"
      :cancel-text="confirmDialogData.cancelText"
      @confirm="handleConfirmPayment"
      @cancel="handleCancelPayment"
      @close="handleCancelPayment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRefs, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useUserDocuments, type UserDocument } from '~/composables/useUserDocuments'
import { useTenantBranding } from '~/composables/useTenantBranding'
import EvaluationModal from '~/components/EvaluationModal.vue'
import ConfirmationDialog from '~/components/ConfirmationDialog.vue'

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
  initialTab?: 'details' | 'progress' | 'payments' | 'documents'
  currentUser?: any
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

// Tenant Branding
const { primaryColor, secondaryColor } = useTenantBranding()

// Reactive state
const activeTab = ref<'details' | 'progress' | 'payments' | 'documents'>(props.initialTab || 'details')

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
const examResults = ref<any[]>([])
const cancellationPolicies = ref<any[]>([])
const isLoadingLessons = ref(false)
const isLoadingExamResults = ref(false)
const sortMode = ref<'newest' | 'worst'>('newest') // Toggle zwischen neueste und schlechteste Bewertungen
const selectedCategoryFilter = ref<string>('alle') // Filter nach Kategorie
const progressSubTab = ref<'lektionen' | 'prüfungen'>('lektionen') // Sub-Tab im Fortschritt
const isLoadingPayments = ref(false)
const paymentsFilterMode = ref<'alle' | 'ausstehend'>('alle') // Filter für Zahlungen
const lessonsError = ref<string | null>(null)
const paymentsError = ref<string | null>(null)
const examResultsError = ref<string | null>(null)

// Evaluation Modal State
const showEvaluationModal = ref(false)
const selectedAppointmentForEvaluation = ref<any>(null)

// Confirmation Dialog State
const showConfirmDialog = ref(false)
const confirmDialogData = ref({
  title: '',
  message: '',
  details: '',
  icon: '',
  type: 'warning' as 'success' | 'warning' | 'danger',
  confirmText: 'Bestätigen',
  cancelText: 'Abbrechen'
})
const pendingPaymentAction = ref<(() => Promise<void>) | null>(null)

// Hilfsfunktion: Prüft ob ein Termin eine Prüfung ist
const isExam = (lesson: any) => {
  const typeStr = (lesson.type || '').toLowerCase()
  const eventTypeCode = (lesson.event_type_code || '').toLowerCase()
  return typeStr.includes('prüfung') || 
         typeStr.includes('exam') || 
         typeStr.includes('test') ||
         eventTypeCode.includes('prüfung') ||
         eventTypeCode.includes('exam') ||
         eventTypeCode.includes('test')
}

// Hilfsfunktion: Berechnet die Stornierungs-Policy für einen Termin
const getCancellationPolicy = (appointment: any) => {
  if (!appointment || appointment.status !== 'cancelled') return null
  
  const appointmentTime = new Date(appointment.start_time)
  const now = new Date()
  const hoursDifference = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  // Finde die passende Policy basierend auf der Zeit vor dem Termin
  for (const policy of cancellationPolicies.value) {
    if (hoursDifference >= policy.hours_before_appointment) {
      return policy
    }
  }
  
  // Fallback: Letzte Policy (meist 100% Stornierung)
  return cancellationPolicies.value[cancellationPolicies.value.length - 1] || null
}

// Hilfsfunktion: Berechnet die finale Abrechnung für abgesagte Termine
const calculateCancelledPayment = (payment: any) => {
  if (!payment.appointments || payment.appointments.status !== 'cancelled') {
    return null
  }
  
  const policy = getCancellationPolicy(payment.appointments)
  if (!policy) return null
  
  // Termin-Kosten (wird nach Policy verrechnet)
  const appointmentCost = payment.total_amount_rappen
  
  // Product-Kosten (werden IMMER verrechnet)
  const productCost = (payment.product_sales || []).reduce((sum: number, ps: any) => {
    return sum + (ps.products?.price_rappen || 0) * ps.quantity
  }, 0)
  
  // Discount-Wert (wird nach Policy behandelt)
  const discountValue = (payment.discount_sales || []).reduce((sum: number, ds: any) => {
    return sum + (ds.discounts?.discount_amount_rappen || 0)
  }, 0)
  
  // Berechnung
  const appointmentRefund = Math.round(appointmentCost * (policy.refund_percentage / 100))
  const finalAppointmentCost = appointmentCost - appointmentRefund
  
  // Discount wird nur zurückgegeben wenn 0% verrechnet wird
  const discountRefund = policy.refund_percentage === 100 ? discountValue : 0
  const finalDiscountValue = discountValue - discountRefund
  
  const totalCost = finalAppointmentCost + productCost - finalDiscountValue
  
  return {
    appointmentCost,
    appointmentRefund,
    finalAppointmentCost,
    productCost,
    discountValue,
    discountRefund,
    finalDiscountValue,
    totalCost,
    policy
  }
}

// Verfügbare Kategorien aus den Lektionen (nur von echten Lektionen, ohne Prüfungen)
const availableCategories = computed(() => {
  const lessonsOnly = lessons.value.filter(lesson => !isExam(lesson))
  const categories = new Set(lessonsOnly.map(lesson => lesson.type).filter(Boolean))
  return ['alle', ...Array.from(categories).sort()]
})

// Gefilterte und sortierte Lektionen
const sortedLessons = computed(() => {
  // 0. Filtere Prüfungen aus (nur normale Lektionen anzeigen)
  const lessonsOnly = lessons.value.filter(lesson => !isExam(lesson))
  
  // 1. Nach Kategorie filtern
  let filtered = lessonsOnly
  if (selectedCategoryFilter.value !== 'alle') {
    filtered = lessonsOnly.filter(lesson => lesson.type === selectedCategoryFilter.value)
  }
  
  // 2. Sortieren
  if (sortMode.value === 'newest') {
    // Standard: Neueste zuerst (bereits sortiert beim Laden)
    return filtered
  } else {
    // Schlechteste Bewertungen zuerst
    return [...filtered].sort((a, b) => {
      // Berechne Durchschnittsbewertung für jede Lektion
      const avgA = a.evaluations.length > 0 
        ? a.evaluations.reduce((sum: number, e: any) => sum + e.criteria_rating, 0) / a.evaluations.length 
        : 999 // Keine Bewertung = ans Ende
      
      const avgB = b.evaluations.length > 0 
        ? b.evaluations.reduce((sum: number, e: any) => sum + e.criteria_rating, 0) / b.evaluations.length 
        : 999
      
      return avgA - avgB // Niedrigste Bewertung zuerst
    })
  }
})

// Gefilterte Zahlungen
const filteredPayments = computed(() => {
  if (paymentsFilterMode.value === 'ausstehend') {
    return payments.value.filter(payment => payment.payment_status === 'pending')
  }
  return payments.value
})

// Helper functions für lokale Zeit-Formatierung
const formatLocalDate = (dateString: string) => {
  if (!dateString) return '-'
  
  // Parse ohne Timezone-Konvertierung - unterstützt beide Formate
  // Format 1: "2025-10-10 11:30:00+00"
  // Format 2: "2025-10-10T11:30:00+00:00"
  const dateStr = dateString.replace('+00:00', '').replace('+00', '').replace('Z', '').trim()
  
  // Split by 'T' or ' ' to get the date part
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0]
  
  if (!datePart) {
    console.warn('Invalid date format:', dateString)
    return '-'
  }
  
  const dateComponents = datePart.split('-')
  if (dateComponents.length < 3) {
    console.warn('Invalid date components:', datePart)
    return '-'
  }
  
  const [year, month, day] = dateComponents
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  
  return date.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatLocalTime = (dateString: string) => {
  if (!dateString) return '00:00'
  
  // Parse ohne Timezone-Konvertierung - unterstützt beide Formate
  // Format 1: "2025-10-10 11:30:00+00"
  // Format 2: "2025-10-10T11:30:00+00:00"
  const dateStr = dateString.replace('+00:00', '').replace('+00', '').replace('Z', '').trim()
  
  // Split by 'T' or ' '
  const parts = dateStr.includes('T') ? dateStr.split('T') : dateStr.split(' ')
  
  if (parts.length < 2) {
    console.warn('Invalid time format:', dateString)
    return '00:00'
  }
  
  const timePart = parts[1]
  const timeComponents = timePart.split(':')
  
  if (timeComponents.length < 2) {
    console.warn('Invalid time components:', timePart)
    return '00:00'
  }
  
  const hour = timeComponents[0]
  const minute = timeComponents[1]
  
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

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

// Evaluation Modal Functions
const openEvaluationModal = (lesson: any) => {
  console.log('📝 Opening evaluation modal for lesson:', lesson.id)
  selectedAppointmentForEvaluation.value = lesson
  showEvaluationModal.value = true
}

const closeEvaluationModal = () => {
  console.log('📝 Closing evaluation modal')
  showEvaluationModal.value = false
  selectedAppointmentForEvaluation.value = null
}

const onEvaluationSaved = async () => {
  console.log('✅ Evaluation saved, reloading lessons')
  // Lade Lektionen neu um die aktualisierten Bewertungen zu sehen
  await loadLessons()
  closeEvaluationModal()
}

// Confirmation Dialog Handlers
const handleConfirmPayment = async () => {
  if (pendingPaymentAction.value) {
    await pendingPaymentAction.value()
  }
  showConfirmDialog.value = false
  pendingPaymentAction.value = null
}

const handleCancelPayment = () => {
  showConfirmDialog.value = false
  pendingPaymentAction.value = null
}

// Payment Functions
const markPaymentAsCashPaid = async (payment: any) => {
  try {
    // Wenn bereits bezahlt, nichts tun
    if (payment.payment_status === 'completed') {
      console.log('💰 Payment already completed')
      return
    }
    
    const amount = (payment.total_amount_rappen / 100).toFixed(2)
    const paymentDate = new Date(payment.created_at).toLocaleDateString('de-CH', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    
    // Zeige Bestätigungsdialog
    confirmDialogData.value = {
      title: 'Zahlung bestätigen',
      message: 'Möchten Sie diese Zahlung als bar bezahlt markieren?',
      details: `
        <strong>Betrag:</strong> ${amount} CHF<br>
        <strong>Datum:</strong> ${paymentDate}<br>
        <strong>Status:</strong> ${payment.payment_status === 'pending' ? 'Ausstehend' : payment.payment_status}
      `,
      icon: '💰',
      type: 'success',
      confirmText: 'Als Bar bezahlt markieren',
      cancelText: 'Abbrechen'
    }
    
    pendingPaymentAction.value = async () => {
      console.log('💰 Marking payment as cash paid:', payment.id)
      
      const supabase = getSupabase()
      
      const { error } = await supabase
        .from('payments')
        .update({
          payment_method: 'cash',
          payment_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)
      
      if (error) {
        console.error('❌ Error updating payment:', error)
        alert('Fehler beim Aktualisieren der Zahlung: ' + error.message)
        return
      }
      
      console.log('✅ Payment marked as cash paid')
      
      // Lade Zahlungen neu
      await loadPayments()
    }
    
    showConfirmDialog.value = true
    
  } catch (err: any) {
    console.error('❌ Error in markPaymentAsCashPaid:', err)
    alert('Fehler: ' + err.message)
  }
}

const startCategoryUpload = (requirement: any, side: 'front' | 'back', openNativeImmediately = false) => {
  currentUploadRequirement.value = requirement
  currentUploadSide.value = side

  if (openNativeImmediately) {
    // Directly trigger native picker without intermediate modal
    currentFileInput.value?.click()
    return
  }
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
    
    const supabase = getSupabase()
    
    // Lade Termine für diesen Schüler - RLS filtert automatisch nach tenant_id
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        user_id,
        start_time,
        end_time,
        type,
        status,
        title,
        description,
        duration_minutes,
        event_type_code,
        instructor_id,
        event_types (
          name
        )
      `)
      .eq('user_id', props.selectedStudent.id)
      .order('start_time', { ascending: false })
    
    if (appointmentsError) {
      console.error('❌ Error loading appointments:', appointmentsError)
      throw appointmentsError
    }
    
    // Lade Evaluationen und Notes für die Termine
    const appointmentIds = (appointmentsData || []).map(apt => apt.id)
    let evaluationsMap: Record<string, any[]> = {}
    
    if (appointmentIds.length > 0) {
      console.log('🔍 Loading evaluations for', appointmentIds.length, 'appointments')
      
      // Lade Notes mit Evaluationen - vereinfachte Query ohne Join
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('appointment_id', appointmentIds)
      
      if (notesError) {
        console.error('❌ Error loading notes:', notesError)
      } else if (notesData) {
        console.log('📝 Loaded', notesData.length, 'notes')
        
        // Hole Criteria-IDs für weitere Details
        const criteriaIds = [...new Set(notesData
          .filter(n => n.evaluation_criteria_id)
          .map(n => n.evaluation_criteria_id))]
        
        let criteriaMap: Record<string, any> = {}
        
        if (criteriaIds.length > 0) {
          const { data: criteriaData } = await supabase
            .from('evaluation_criteria')
            .select('id, name')
            .in('id', criteriaIds)
          
          if (criteriaData) {
            criteriaData.forEach(c => {
              criteriaMap[c.id] = c
            })
          }
        }
        
        // Gruppiere Notes nach appointment_id und füge Criteria-Details hinzu
        notesData.forEach(note => {
          if (!evaluationsMap[note.appointment_id]) {
            evaluationsMap[note.appointment_id] = []
          }
          evaluationsMap[note.appointment_id].push({
            ...note,
            evaluation_criteria: note.evaluation_criteria_id ? criteriaMap[note.evaluation_criteria_id] : null
          })
        })
      }
    }
    
    // Lade Instructor-Namen
    const instructorIds = [...new Set((appointmentsData || [])
      .map(apt => apt.instructor_id)
      .filter(Boolean))]
    
    let instructorsMap: Record<string, any> = {}
    
    if (instructorIds.length > 0) {
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('users')
        .select('id, first_name')
        .in('id', instructorIds)
      
      if (instructorsError) {
        console.error('❌ Error loading instructors:', instructorsError)
      } else if (instructorsData) {
        instructorsData.forEach(instructor => {
          instructorsMap[instructor.id] = instructor
        })
      }
    }
    
    // Füge Evaluationen und Instructor-Namen zu Appointments hinzu
    const lessonsWithEvaluations = (appointmentsData || []).map(apt => ({
      ...apt,
      notes: evaluationsMap[apt.id] || [],
      evaluations: (evaluationsMap[apt.id] || []).filter(n => n.evaluation_criteria_id && n.criteria_rating),
      instructor: apt.instructor_id ? instructorsMap[apt.instructor_id] : null
    }))
    
    lessons.value = lessonsWithEvaluations
    
    // Erstelle Progress-Daten aus Appointments
    progressData.value = lessonsWithEvaluations.map(apt => ({
      date: new Date(apt.start_time).toLocaleDateString('de-CH'),
      type: apt.type,
      status: apt.status,
      title: apt.title,
      duration: apt.duration_minutes,
      evaluationsCount: apt.evaluations.length
    }))
    
    console.log('✅ Loaded', lessons.value.length, 'lessons with evaluations')
    
  } catch (error: any) {
    console.error('Error loading lessons:', error)
    lessonsError.value = error.message || 'Fehler beim Laden der Lektionen'
  } finally {
    isLoadingLessons.value = false
  }
}

const loadExamResults = async () => {
  if (!props.selectedStudent) return
  
  isLoadingExamResults.value = true
  examResultsError.value = null
  
  try {
    console.log('🎓 Loading exam results for student:', props.selectedStudent.id)
    
    const supabase = getSupabase()
    
    // Zuerst alle appointments dieses Schülers laden
    const { data: studentAppointments, error: aptError } = await supabase
      .from('appointments')
      .select(`
        id, 
        type, 
        start_time, 
        title, 
        user_id, 
        event_type_code,
        instructor_id,
        event_types (
          name
        )
      `)
      .eq('user_id', props.selectedStudent.id)
    
    if (aptError) {
      console.error('❌ Error loading student appointments:', aptError)
      throw aptError
    }
    
    const appointmentIds = (studentAppointments || []).map(apt => apt.id)
    
    if (appointmentIds.length === 0) {
      examResults.value = []
      console.log('✅ No appointments found for student')
      return
    }
    
    // Dann die exam_results für diese appointments laden
    const { data: examResultsData, error: examError } = await supabase
      .from('exam_results')
      .select('*')
      .in('appointment_id', appointmentIds)
      .order('exam_date', { ascending: false })
    
    if (examError) {
      console.error('❌ Error loading exam results:', examError)
      throw examError
    }
    
    // Lade Instructor-Namen für Prüfungen
    const instructorIds = [...new Set(studentAppointments
      .map(apt => apt.instructor_id)
      .filter(Boolean))]
    
    let instructorsMap: Record<string, any> = {}
    
    if (instructorIds.length > 0) {
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('users')
        .select('id, first_name')
        .in('id', instructorIds)
      
      if (instructorsError) {
        console.error('❌ Error loading instructors for exams:', instructorsError)
      } else if (instructorsData) {
        instructorsData.forEach(instructor => {
          instructorsMap[instructor.id] = instructor
        })
      }
    }
    
    // Verknüpfe exam_results mit appointment-Daten und Instructor-Namen
    const appointmentsMap = new Map(studentAppointments.map(apt => [apt.id, {
      ...apt,
      instructor: apt.instructor_id ? instructorsMap[apt.instructor_id] : null
    }]))
    
    examResults.value = (examResultsData || []).map(result => ({
      ...result,
      appointments: appointmentsMap.get(result.appointment_id)
    }))
    
    console.log('✅ Loaded', examResults.value.length, 'exam results')
    
  } catch (error: any) {
    console.error('Error loading exam results:', error)
    examResultsError.value = error.message || 'Fehler beim Laden der Prüfungsergebnisse'
  } finally {
    isLoadingExamResults.value = false
  }
}

const loadCancellationPolicies = async () => {
  try {
    const supabase = getSupabase()
    
    const { data: policiesData, error: policiesError } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('is_active', true)
      .order('hours_before_appointment', { ascending: true })
    
    if (policiesError) {
      console.error('❌ Error loading cancellation policies:', policiesError)
      return
    }
    
    cancellationPolicies.value = policiesData || []
    console.log('✅ Loaded', cancellationPolicies.value.length, 'cancellation policies')
    
  } catch (error: any) {
    console.error('Error loading cancellation policies:', error)
  }
}

const loadPayments = async () => {
  if (!props.selectedStudent) return
  
  isLoadingPayments.value = true
  paymentsError.value = null
  
  try {
    console.log('💰 Loading payments for student:', props.selectedStudent.id)
    
    const supabase = getSupabase()
    
    // Lade Zahlungen über appointments - RLS filtert automatisch nach tenant_id
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        created_at,
        payment_method,
        payment_status,
        total_amount_rappen,
        appointment_id,
        appointments!inner(user_id, start_time, title, status, event_type_code)
      `)
      .eq('appointments.user_id', props.selectedStudent.id)
      .order('created_at', { ascending: false })
    
    if (paymentsError) {
      console.error('❌ Error loading payments:', paymentsError)
      throw paymentsError
    }
    
    // Lade product_sales und discount_sales für die Zahlungen
    const paymentIds = (paymentsData || []).map(p => p.id)
    let productSalesMap: Record<string, any[]> = {}
    let discountSalesMap: Record<string, any[]> = {}
    
    if (paymentIds.length > 0) {
      // Lade product_sales
      const { data: productSalesData, error: productSalesError } = await supabase
        .from('product_sales')
        .select(`
          *,
          products(name, price_rappen)
        `)
        .in('payment_id', paymentIds)
      
      if (productSalesError) {
        console.error('❌ Error loading product sales:', productSalesError)
      } else if (productSalesData) {
        productSalesData.forEach(ps => {
          if (!productSalesMap[ps.payment_id]) {
            productSalesMap[ps.payment_id] = []
          }
          productSalesMap[ps.payment_id].push(ps)
        })
      }
      
      // Lade discount_sales
      const { data: discountSalesData, error: discountSalesError } = await supabase
        .from('discount_sales')
        .select(`
          *,
          discounts(name, discount_percentage, discount_amount_rappen)
        `)
        .in('payment_id', paymentIds)
      
      if (discountSalesError) {
        console.error('❌ Error loading discount sales:', discountSalesError)
      } else if (discountSalesData) {
        discountSalesData.forEach(ds => {
          if (!discountSalesMap[ds.payment_id]) {
            discountSalesMap[ds.payment_id] = []
          }
          discountSalesMap[ds.payment_id].push(ds)
        })
      }
    }
    
    // Verknüpfe alle Daten
    payments.value = (paymentsData || []).map(payment => ({
      ...payment,
      product_sales: productSalesMap[payment.id] || [],
      discount_sales: discountSalesMap[payment.id] || []
    }))
    
    console.log('✅ Loaded', payments.value.length, 'payments with product/discount sales')
    
  } catch (error: any) {
    console.error('Error loading payments:', error)
    paymentsError.value = error.message || 'Fehler beim Laden der Zahlungen'
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

    // Save document record to user_documents table (use current user's tenant to satisfy RLS)
    const tenantIdForDoc = (props.currentUser as any)?.tenant_id || selectedStudent.value.tenant_id
    
    const documentData = {
      user_id: selectedStudent.value.id,
      tenant_id: tenantIdForDoc,
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
    loadExamResults()
    loadPayments()
    loadCancellationPolicies()
    loadDocumentRequirements()
    loadDocuments(newStudent.id) // Load user documents from new table
  }
}, { immediate: true })

// Watch for tab changes
watch(() => activeTab.value, (newTab) => {
  if ((newTab === 'progress' || newTab === 'payments') && props.selectedStudent) {
    if (newTab === 'progress') {
      loadLessons()
      loadExamResults()
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

