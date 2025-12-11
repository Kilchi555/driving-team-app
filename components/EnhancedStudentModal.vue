<template>
  <div v-if="selectedStudent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 pb-16">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="text-white p-4" :style="{ backgroundColor: primaryColor }">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-bold">{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
          </div>
          <div class="flex items-center gap-3">
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
            :class="['px-2 py-2 font-medium text-sm border-b-2 transition-colors', activeTab === 'details' ? 'border-transparent text-gray-600 hover:text-gray-800' : 'border-transparent text-gray-600 hover:text-gray-800']"
            :style="activeTab === 'details' ? { borderBottomColor: secondaryColor, color: secondaryColor } : {}"
          >
            Details
          </button>

          <button
            @click="activeTab = 'progress'"
            :class="['px-2 py-1 font-medium text-sm border-b-2 transition-colors', activeTab === 'progress' ? 'border-transparent text-gray-600 hover:text-gray-800' : 'border-transparent text-gray-600 hover:text-gray-800']"
            :style="activeTab === 'progress' ? { borderBottomColor: secondaryColor, color: secondaryColor } : {}"
          >
            Fortschritt
          </button>
          
          <button
            @click="activeTab = 'payments'"
            :class="['px-2 py-2 font-medium text-sm border-b-2 transition-colors', activeTab === 'payments' ? 'border-transparent text-gray-600 hover:text-gray-800' : 'border-transparent text-gray-600 hover:text-gray-800']"
            :style="activeTab === 'payments' ? { borderBottomColor: secondaryColor, color: secondaryColor } : {}"
          >
            Zahlungen
          </button>

          <button
            @click="activeTab = 'documents'"
            :class="['px-2 py-1 font-medium text-sm border-b-2 transition-colors', activeTab === 'documents' ? 'border-transparent text-gray-600 hover:text-gray-800' : 'border-transparent text-gray-600 hover:text-gray-800']"
            :style="activeTab === 'documents' ? { borderBottomColor: secondaryColor, color: secondaryColor } : {}"
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

          <!-- Student Documents (Ausweise) Section -->
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              Ausweise
            </h4>
            
            <!-- Bilder anzeigen -->
            <div class="flex justify-center gap-4 flex-wrap mb-6">
              <a 
                v-for="doc in studentDocuments" 
                :key="doc.id"
                :href="getStudentDocumentUrl(doc)" 
                target="_blank"
                class="flex-shrink-0"
                :title="doc.file_name"
              >
                <!-- Image Preview -->
                <img 
                  v-if="doc.file_type && doc.file_type.startsWith('image/')"
                  :src="getStudentDocumentUrl(doc)" 
                  :alt="doc.file_name"
                  class="max-h-48 max-w-48 object-contain rounded border border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                  loading="lazy"
                />
                <!-- PDF Icon -->
                <div v-else class="w-24 h-24 bg-red-50 rounded border border-red-200 hover:border-red-400 transition-colors cursor-pointer flex flex-col items-center justify-center">
                  <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                  <span class="text-xs text-red-600 mt-1 font-medium">PDF</span>
                </div>
              </a>
            </div>
            
            <!-- Upload Button - Native Device Behavior -->
            <button
              @click="cameraInput?.click()"
              class="relative overflow-hidden rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-3 text-center transition-all hover:border-blue-400 hover:shadow-md active:scale-95"
            >
              <div class="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent"></div>
              <div class="relative">
                <svg class="mx-auto h-10 w-10 text-blue-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <p class="text-base font-semibold text-blue-700">Weiteres Dokument hochladen</p>
              </div>
            </button>
            
            <!-- Hidden file inputs -->
            <input
              ref="documentFileInput"
              type="file"
              accept="image/*,.pdf"
              @change="handleDocumentUpload"
              class="hidden"
            />
            <input
              ref="cameraInput"
              type="file"
              accept="image/*"
              capture="environment"
              @change="handleDocumentUpload"
              class="hidden"
            />
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
                    : canEvaluateLesson(lesson)
                      ? 'border-gray-200 cursor-pointer hover:shadow-md'
                      : 'border-gray-200 opacity-75 cursor-not-allowed'
                ]"
                :style="lesson.status !== 'cancelled' ? { backgroundColor: primaryColor + '15' } : {}"
                @click="lesson.status !== 'cancelled' && canEvaluateLesson(lesson) ? openEvaluationModal(lesson) : null"
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
                    lesson.evaluations && lesson.evaluations.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  ]">
                    {{ lesson.evaluations && lesson.evaluations.length > 0 ? 'Bewertet' : 'Unbewertet' }}
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
                        <span 
                          v-if="getRatingLabel(evaluation.criteria_rating)"
                          class="text-xs px-2 py-0.5 rounded-full font-medium"
                          :style="{
                            backgroundColor: getRatingColor(evaluation.criteria_rating) || '#3B82F6',
                            color: '#FFFFFF'
                          }"
                        >
                          {{ getRatingLabel(evaluation.criteria_rating) }}
                        </span>
                        <span 
                          v-else
                          class="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-800"
                        >
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
          <!-- Student Credit Balance Card -->
          <div v-if="studentBalance !== undefined" :class="[
            'mb-4 rounded-lg border p-4',
            studentBalance < 0 
              ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200' 
              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          ]">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p :class="[
                  'text-xs font-medium mb-1',
                  studentBalance < 0 ? 'text-red-700' : 'text-green-700'
                ]">
                  {{ studentBalance < 0 ? '⚠️ Offener Betrag' : 'Verfügbares Guthaben' }}
                </p>
                <p :class="[
                  'text-2xl font-bold',
                  studentBalance < 0 ? 'text-red-600' : 'text-green-600'
                ]">
                  CHF {{ (Math.abs(studentBalance) / 100).toFixed(2) }}
                </p>
                <p v-if="studentBalance < 0" class="text-xs text-red-600 mt-1">
                  Wird bei nächster Zahlung verrechnet
                </p>
              </div>
              <svg class="w-8 h-8" :class="studentBalance < 0 ? 'text-red-500' : 'text-green-500'" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
          </div>

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
            
            <!-- Payment Summary Box (nur wenn Zahlungen ausgewählt sind) -->
            <div v-if="selectedPayments.length > 0" class="rounded-lg p-4 shadow-sm border-l-4 space-y-3" :style="{ borderLeftColor: primaryColor, backgroundColor: primaryColor + '08' }">
              <!-- Row 1: Text and Price -->
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-xs text-gray-500 font-semibold uppercase tracking-wide">{{ selectedPayments.length }} Zahlung{{ selectedPayments.length > 1 ? 'en' : '' }} ausgewählt</p>
                </div>
                <p class="text-2xl font-bold" :style="{ color: primaryColor }">{{ formatCurrency(totalSelectedAmount) }}</p>
              </div>
              
              <!-- Row 2: Buttons -->
              <div class="flex gap-2">
                <button 
                  class="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white transition-all hover:shadow-md"
                  :style="{ backgroundColor: secondaryColor || '#22C55E' }"
                  @click="handleBulkPayment('cash')"
                >
                  Bar bezahlen
                </button>
              </div>
            </div>
            
            <!-- Filter auf separater Zeile -->
            <div 
              class="flex items-center justify-between gap-3 py-3 px-4 rounded-lg"
              :style="{ backgroundColor: primaryColor + '20' }"
            >
              <div class="flex items-center gap-3">
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
                  Unbezahlt
                </span>
              </div>
              
              <!-- Select All Button -->
              <button
                @click="toggleAllPayments"
                :class="['text-sm font-medium px-3 py-1 rounded transition-colors']"
                :style="{ 
                  backgroundColor: selectedPayments.length === filteredPayments.length ? primaryColor : 'transparent',
                  color: selectedPayments.length === filteredPayments.length ? 'white' : primaryColor,
                  border: `1px solid ${primaryColor}`
                }"
              >
                {{ selectedPayments.length === filteredPayments.length ? 'Alle abwählen' : 'Alle auswählen' }}
              </button>
            </div>
            
            <!-- Zahlungen Liste -->
            <div class="space-y-3">
              <div 
                v-for="payment in filteredPayments" 
                :key="payment.id"
                @click="handlePaymentCardClick(payment)"
                :class="[
                  'rounded-lg transition-all overflow-hidden border-l-4 shadow-sm',
                  payment.appointments?.status === 'cancelled'
                    ? 'border-l-orange-300 bg-orange-50 cursor-pointer hover:shadow-md'
                    : payment.payment_status === 'completed'
                    ? 'border-l-green-300 bg-gray-50 opacity-60 cursor-not-allowed'
                    : 'hover:shadow-md cursor-pointer',
                  selectedPayments.includes(payment.id) && payment.appointments?.status !== 'cancelled' && payment.payment_status !== 'completed'
                    ? 'ring-2 ring-offset-0'
                    : ''
                ]"
                :style="{
                  ...(payment.appointments?.status !== 'cancelled' && payment.payment_status !== 'completed' ? { 
                    borderLeftColor: primaryColor,
                    backgroundColor: selectedPayments.includes(payment.id) ? primaryColor + '20' : primaryColor + '08'
                  } : {}),
                  ...(selectedPayments.includes(payment.id) && payment.appointments?.status !== 'cancelled' && payment.payment_status !== 'completed' ? {
                    '--tw-ring-color': primaryColor
                  } : {})
                }"
              >
                <!-- Header Row with Main Info -->
                <div class="p-4">
                  <!-- Main Content -->
                  <div class="flex-1 min-w-0">
                    <!-- Amount + Category + Status Row -->
                    <div class="flex items-center justify-between gap-3 mb-2">
                      <div class="flex items-center gap-2">
                        <span :class="[
                          'text-xl font-bold',
                          payment.appointments?.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'
                        ]">
                          {{ ((payment.total_amount_rappen - (payment.credit_used_rappen || 0)) / 100).toFixed(2) }}
                        </span>
                        <span class="text-xs font-semibold text-gray-500">CHF</span>
                        
                        <span v-if="payment.appointments?.type" :class="[
                          'px-2.5 py-0.5 text-xs font-bold rounded-full ml-2',
                          payment.appointments?.status === 'cancelled' ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-800'
                        ]">
                          {{ payment.appointments.type }}
                        </span>
                      </div>
                      
                      <!-- Status Badges on Right -->
                      <div class="flex items-center gap-2">
                        <span v-if="payment.appointments?.status === 'cancelled'" class="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                          Abgesagt
                        </span>
                        <div :class="[
                          'px-3 py-1 text-xs font-semibold rounded-full flex flex-col items-end',
                          payment.payment_status === 'completed' ? 'bg-green-100 text-green-700' :
                          payment.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          payment.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        ]">
                          <span>
                            {{ payment.payment_status === 'completed' ? 'Bezahlt' :
                               payment.payment_status === 'pending' ? 'Unbezahlt' :
                               payment.payment_status === 'failed' ? 'Fehlgeschlagen' :
                               payment.payment_status }}
                          </span>
                          <span v-if="payment.payment_status === 'completed' && payment.paid_at" class="text-xs font-normal opacity-90 whitespace-nowrap">
                            {{ formatLocalDate(payment.paid_at) }} {{ formatLocalTime(payment.paid_at) }}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Date and Time -->
                    <div :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-500'" class="text-xs">
                      <span class="font-medium">{{ formatLocalDate(payment.appointments?.start_time || payment.created_at) }}</span>
                      <span class="mx-1">•</span>
                      <span>{{ formatLocalTime(payment.appointments?.start_time || payment.created_at) }} Uhr</span>
                      <span v-if="payment.appointments?.duration_minutes" class="mx-1">•</span>
                      <span v-if="payment.appointments?.duration_minutes" class="font-medium">{{ payment.appointments.duration_minutes }} min</span>
                    </div>
                    
                    <!-- Service Description (on new line) -->
                    <div :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-700'" class="text-sm font-medium">
                      {{ payment.appointments.event_types?.name || payment.appointments.event_type_code || 'Termin' }}
                      <span v-if="payment.appointments.staff" class="font-normal text-gray-600">
                        mit {{ payment.appointments.staff.first_name }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Product Sales & Discounts Section -->
                <div v-if="(payment.product_sales && payment.product_sales.length > 0) || payment.discount_sale || (payment.admin_fee_rappen && payment.admin_fee_rappen > 0) || (payment.credit_used_rappen && payment.credit_used_rappen > 0)" class="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-2 text-sm">
                  <!-- Product Sales -->
                  <div v-for="productSale in (payment.product_sales || [])" :key="productSale.id" class="flex justify-between items-center">
                    <span :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'">
                      {{ productSale.products?.name || 'Produkt' }} <span class="text-xs">({{ productSale.quantity }}x)</span>
                    </span>
                    <span :class="[
                      'font-semibold',
                      payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-900'
                    ]">
                      {{ ((productSale.unit_price_rappen || 0) * productSale.quantity / 100).toFixed(2) }} CHF
                    </span>
                  </div>
                  
                  <!-- Admin Fee -->
                  <div v-if="payment.admin_fee_rappen && payment.admin_fee_rappen > 0" class="flex justify-between items-center">
                    <span :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'">
                      Adminpauschale
                    </span>
                    <span :class="[
                      'font-semibold',
                      payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-900'
                    ]">
                      {{ (payment.admin_fee_rappen / 100).toFixed(2) }} CHF
                    </span>
                  </div>
                  
                  <!-- Discount Sale (Rabatt) -->
                  <div v-if="payment.discount_sale && payment.discount_sale.discount_amount_rappen > 0" class="flex justify-between items-center">
                    <span :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'">
                      {{ payment.discount_sale.discount_reason || 'Rabatt' }}
                    </span>
                    <span :class="[
                      'font-semibold',
                      payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-green-600'
                    ]">
                      -{{ ((payment.discount_sale.discount_amount_rappen || 0) / 100).toFixed(2) }} CHF
                    </span>
                  </div>
                  
                  <!-- ✅ NEW: Credit Used -->
                  <div v-if="payment.credit_used_rappen && payment.credit_used_rappen > 0" class="flex justify-between items-center border-t pt-2 mt-2">
                    <span :class="payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-green-600'" class="font-medium">
                      Verwendetes Guthaben
                    </span>
                    <span :class="[
                      'font-semibold',
                      payment.appointments?.status === 'cancelled' ? 'text-gray-400' : 'text-green-600'
                    ]">
                      -{{ (payment.credit_used_rappen / 100).toFixed(2) }} CHF
                    </span>
                  </div>
                </div>
                
                <!-- Stornierungs-Policy Info (nur bei expanded) -->
                <div v-if="payment.appointments?.status === 'cancelled' && expandedCancelledPayments.has(payment.id)" class="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div v-if="calculateCancelledPayment(payment)" class="text-sm space-y-2">
                    <div>
                      <span class="text-gray-600">Stornierungs-Policy:</span>
                      <span class="ml-2 font-medium text-gray-700">
                        {{ calculateCancelledPayment(payment)!.policy.refund_percentage }}% Rückerstattung
                      </span>
                      <span class="ml-2 text-xs text-gray-500">
                        ({{ calculateCancelledPayment(payment)!.policy.charge_percentage }}% Gebühr)
                      </span>
                    </div>
                    
                    <!-- Detaillierte Berechnung -->
                    <div v-if="calculateCancelledPayment(payment)" class="bg-white p-3 rounded text-xs space-y-1 border border-gray-200">
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
                        <div v-if="calculateCancelledPayment(payment)!.adminFee > 0" class="flex justify-between">
                          <span>Adminpauschale (immer verrechnet):</span>
                          <span>{{ (calculateCancelledPayment(payment)!.adminFee / 100).toFixed(2) }} CHF</span>
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
                
                <!-- Cancellation Date -->
                <div v-if="payment.appointments?.deleted_at" class="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm">
                  <span class="text-gray-600">Abgesagt am:</span>
                  <span class="ml-1 font-medium text-gray-900">
                    {{ formatLocalDate(payment.appointments.deleted_at) }} {{ formatLocalTime(payment.appointments.deleted_at) }}
                  </span>
                </div>
                
                <!-- Payment Method -->
                <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm">
                  <span class="text-gray-600">Zahlungsmethode:</span>
                  <span class="ml-1 font-medium text-gray-900">
                    {{ payment.payment_method === 'cash' ? 'Bar' :
                       payment.payment_method === 'invoice' ? 'Rechnung' :
                       payment.payment_method === 'wallee' ? 'Online' :
                       payment.payment_method === 'credit' ? 'Guthaben' :
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
              </div>
            </div>
          </div>

          <!-- Rechnungsadresse -->
          <div class="bg-white rounded-lg border p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Rechnungsadresse
            </h4>
            
            <div v-if="selectedStudent.invoice_address" class="text-sm text-gray-700 whitespace-pre-wrap">
              {{ selectedStudent.invoice_address }}
            </div>
            <div v-else class="text-sm text-gray-500 italic">Keine Rechnungsadresse vorhanden</div>
          </div>

          <!-- Andere Details... -->
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
      :current-user="currentUser"
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
import { logger } from '~/utils/logger'
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
  invoice_address: string | null
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
    logger.debug('🔍 Loading document requirements for categories:', props.selectedStudent.category)

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

    logger.debug('✅ Categories loaded:', categories)

    const allRequirements: DocumentRequirement[] = []
    const addedDocuments = new Set<string>()

    // Process each category
    categories?.forEach((category: any) => {
      const requirements = category.document_requirements
      if (!requirements) return

      logger.debug(`📋 Processing requirements for ${category.code}:`, requirements)

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
    logger.debug('📄 Final document requirements:', allRequirements)

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
const studentDocuments = ref<any[]>([])
const examResults = ref<any[]>([])
const cancellationPolicies = ref<any[]>([])
const studentBalance = ref<number | undefined>(undefined) // ✅ NEU: Student credit balance
const isLoadingLessons = ref(false)
const isLoadingExamResults = ref(false)
const sortMode = ref<'newest' | 'worst'>('newest') // Toggle zwischen neueste und schlechteste Bewertungen
const selectedCategoryFilter = ref<string>('alle') // Filter nach Kategorie
const progressSubTab = ref<'lektionen' | 'prüfungen'>('lektionen') // Sub-Tab im Fortschritt
const isLoadingPayments = ref(false)
const paymentsFilterMode = ref<'alle' | 'ausstehend'>('alle') // Filter für Zahlungen
const selectedPaymentIds = ref<Set<string>>(new Set()) // Selected payments for bulk payment
const lessonsError = ref<string | null>(null)
const paymentsError = ref<string | null>(null)
const examResultsError = ref<string | null>(null)
const ratingPointsMap = ref<Record<number, { color: string; label: string }>>({}) // Map für Rating-Punkte aus DB

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
  
  // Use the stored cancellation_charge_percentage directly
  // cancellation_charge_percentage = 0 means FREE cancellation (100% refund)
  // cancellation_charge_percentage = 100 means FULL CHARGE (0% refund)
  const chargePercentage = appointment.cancellation_charge_percentage ?? 100
  const refundPercentage = 100 - chargePercentage
  
  logger.debug('💰 Cancellation charge for appointment:', {
    appointmentId: appointment.id,
    chargePercentage,
    refundPercentage,
    wasFreeCancellation: chargePercentage === 0
  })
  
  // Return a simple policy object with the actual charge that was applied
  return {
    charge_percentage: chargePercentage,
    refund_percentage: refundPercentage,
    hours_before_appointment: chargePercentage === 0 ? 24 : 0 // For display purposes
  }
}

// Hilfsfunktion: Berechnet die finale Abrechnung für abgesagte Termine
const calculateCancelledPayment = (payment: any) => {
  if (!payment.appointments || payment.appointments.status !== 'cancelled') {
    return null
  }
  
  // Use the stored cancellation_charge_percentage directly
  const chargePercentage = payment.appointments.cancellation_charge_percentage ?? 100
  const refundPercentage = 100 - chargePercentage
  
  logger.debug('💰 calculateCancelledPayment:', {
    appointmentId: payment.appointments.id,
    chargePercentage,
    refundPercentage,
    storedCharge: payment.appointments.cancellation_charge_percentage
  })
  
  // Admin-Fee (wird IMMER verrechnet)
  const adminFee = payment.admin_fee_rappen || 0
  
  // Termin-Kosten (wird nach Policy verrechnet) = Total - Admin-Fee
  const appointmentCost = (payment.total_amount_rappen || 0) - adminFee
  
  // Product-Kosten (werden IMMER verrechnet)
  const productCost = (payment.product_sales || []).reduce((sum: number, ps: any) => {
    return sum + (ps.unit_price_rappen || 0) * ps.quantity
  }, 0)
  
  // Discount-Wert (wird nach Policy behandelt)
  const discountValue = payment.discount_sale?.discount_amount_rappen || 0
  
  // Berechnung
  const appointmentRefund = Math.round(appointmentCost * (refundPercentage / 100))
  const finalAppointmentCost = appointmentCost - appointmentRefund
  
  // Discount wird nur zurückgegeben wenn 100% Rückerstattung
  const discountRefund = refundPercentage === 100 ? discountValue : 0
  const finalDiscountValue = discountValue - discountRefund
  
  const totalCost = finalAppointmentCost + productCost + adminFee - finalDiscountValue
  
  const policy = {
    charge_percentage: chargePercentage,
    refund_percentage: refundPercentage,
    hours_before_appointment: chargePercentage === 0 ? 24 : 0
  }
  
  return {
    appointmentCost,
    appointmentRefund,
    finalAppointmentCost,
    productCost,
    adminFee,
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

// Selected payments summary
const selectedPaymentsSummary = computed(() => {
  const selected = payments.value.filter(p => selectedPaymentIds.value.has(p.id))
  const total = selected.reduce((sum, p) => {
    return sum + ((p.total_amount_rappen || 0) / 100)
  }, 0)
  return { count: selected.length, total }
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
  
  // Normalize format: convert space to T and ensure +00:00
  let timeStr = dateString
  if (timeStr.includes(' ') && !timeStr.includes('T')) {
    timeStr = timeStr.replace(' ', 'T')
  }
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) {
    timeStr = timeStr.replace('+00', '+00:00')
  }
  if (!timeStr.includes('+') && !timeStr.includes('Z')) {
    timeStr += '+00:00'
  }
  
  const utcDate = new Date(timeStr)
  // Convert UTC to Europe/Zurich timezone
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  
  return localDate.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatLocalTime = (dateString: string) => {
  if (!dateString) return '00:00'
  
  // Normalize format: convert space to T and ensure +00:00
  let timeStr = dateString
  if (timeStr.includes(' ') && !timeStr.includes('T')) {
    timeStr = timeStr.replace(' ', 'T')
  }
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) {
    timeStr = timeStr.replace('+00', '+00:00')
  }
  if (!timeStr.includes('+') && !timeStr.includes('Z')) {
    timeStr += '+00:00'
  }
  
  const utcDate = new Date(timeStr)
  // Convert UTC to Europe/Zurich timezone
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  
  return localDate.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Payment functionality
const selectedPayments = ref<string[]>([])
const isProcessingBulkAction = ref(false)
const expandedCancelledPayments = ref<Set<string>>(new Set())

// Toggle payment selection
const togglePaymentSelection = (paymentId: string) => {
  if (selectedPayments.value.includes(paymentId)) {
    selectedPayments.value = selectedPayments.value.filter(id => id !== paymentId)
  } else {
    selectedPayments.value.push(paymentId)
  }
}

// Toggle all payments
const toggleAllPayments = () => {
  // Nur auswählbar: offene Zahlungen (nicht bezahlt und nicht storniert)
  const selectablePayments = filteredPayments.value.filter(p => 
    p.payment_status !== 'completed' && !p.deleted_at
  )
  
  if (selectedPayments.value.length === selectablePayments.length) {
    selectedPayments.value = []
  } else {
    selectedPayments.value = selectablePayments.map(p => p.id)
  }
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', { 
    style: 'currency', 
    currency: 'CHF' 
  }).format(amount / 100)
}

// Handle bulk payment method selection
const handleBulkPayment = async (method: 'cash' | 'online') => {
  if (selectedPayments.value.length === 0) return
  
  isProcessingBulkAction.value = true
  try {
    logger.debug(`💳 Processing ${selectedPayments.value.length} payments as ${method}`)
    logger.debug(`Payment IDs: ${selectedPayments.value.join(', ')}`)
    
    const supabase = getSupabase()
    
    // Update payment_method for all selected payments
    for (const paymentId of selectedPayments.value) {
      // Get the payment to find the associated appointment
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('appointment_id')
        .eq('id', paymentId)
        .single()
      
      if (paymentError) {
        console.error(`❌ Error fetching payment ${paymentId}:`, paymentError)
        continue
      }
      
      // Update payment
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ 
          payment_method: method === 'cash' ? 'cash' : 'wallee',
          payment_status: method === 'cash' ? 'completed' : 'pending',
          paid_at: method === 'cash' ? new Date().toISOString() : null
        })
        .eq('id', paymentId)
      
      if (updatePaymentError) {
        console.error(`❌ Error updating payment ${paymentId}:`, updatePaymentError)
        continue
      }
      
      // If payment is being marked as paid (cash), also confirm the appointment if it's pending
      if (method === 'cash' && paymentData?.appointment_id) {
        const { error: updateAppointmentError } = await supabase
          .from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', paymentData.appointment_id)
          .eq('status', 'pending_confirmation') // Only update if still pending
        
        if (updateAppointmentError) {
          console.error(`❌ Error confirming appointment ${paymentData.appointment_id}:`, updateAppointmentError)
        } else {
          logger.debug(`✅ Appointment ${paymentData.appointment_id} confirmed`)
        }
      }
      
      logger.debug(`✅ Payment ${paymentId} updated to ${method}`)
    }
    
    // Reload payments and lessons to reflect changes
    await loadPayments()
    await loadLessons()
    
    // Clear selection after processing
    selectedPayments.value = []
    
    logger.debug(`✅ Successfully processed ${selectedPayments.value.length} payments as ${method}`)
  } catch (error) {
    console.error('❌ Error processing bulk payment:', error)
  } finally {
    isProcessingBulkAction.value = false
  }
}

// Computed properties
const paymentsCount = computed(() => payments.value.length)

const totalSelectedAmount = computed(() => {
  return selectedPayments.value.reduce((total, paymentId) => {
    const payment = payments.value.find(p => p.id === paymentId)
    // Only count non-cancelled payments
    if (payment?.appointments?.status === 'cancelled') {
      return total
    }
    return total + (payment?.total_amount_rappen || 0)
  }, 0)
})

// Handle click on payment card
const handlePaymentCardClick = (payment: any) => {
  // If cancelled, toggle expansion to show/hide details
  if (payment.appointments?.status === 'cancelled') {
    logger.debug('📋 Toggling cancelled payment details:', payment.id)
    if (expandedCancelledPayments.value.has(payment.id)) {
      expandedCancelledPayments.value.delete(payment.id)
    } else {
      expandedCancelledPayments.value.add(payment.id)
    }
  }
  // If completed, ignore click
  else if (payment.payment_status === 'completed') {
    logger.debug('🔒 Payment is completed, cannot select')
  }
  // Otherwise, toggle selection
  else {
    togglePaymentSelection(payment.id)
  }
}

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

// Check if current user can evaluate this lesson
const canEvaluateLesson = (lesson: any): boolean => {
  // Admins können alle Lektionen bewerten
  if (props.currentUser?.role === 'admin') {
    return true
  }
  
  // Staff können nur ihre eigenen Lektionen bewerten
  if (props.currentUser?.role === 'staff') {
    return lesson.staff_id === props.currentUser?.id
  }
  
  // Andere Rollen können nicht bewerten
  return false
}

// Evaluation Modal Functions
const openEvaluationModal = (lesson: any) => {
  // Double check - sollte nicht passieren wegen disabled state, aber sicherheitshalber
  if (!canEvaluateLesson(lesson)) {
    console.warn('⚠️ Cannot evaluate lesson - not own lesson or not staff/admin')
    return
  }
  
  logger.debug('📝 Opening evaluation modal for lesson:', lesson.id)
  selectedAppointmentForEvaluation.value = lesson
  showEvaluationModal.value = true
}

const closeEvaluationModal = () => {
  logger.debug('📝 Closing evaluation modal')
  showEvaluationModal.value = false
  selectedAppointmentForEvaluation.value = null
}

const onEvaluationSaved = async () => {
  logger.debug('✅ Evaluation saved, reloading lessons')
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

// Load rating points from database
const loadRatingPoints = async () => {
  if (!props.selectedStudent) return
  
  try {
    const supabase = getSupabase()
    
    // Get tenant_id from current user or selected student
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id || props.selectedStudent.tenant_id
    
    if (!tenantId) {
      console.warn('⚠️ No tenant_id found for loading rating points')
      return
    }
    
    logger.debug('📊 Loading evaluation scale for tenant:', tenantId)
    
    let ratingPoints: any[] | null = null
    
    // Try with tenant_id first (if the column exists)
    // The example data shows tenant_id exists
    const { data: dataWithTenant, error: errorWithTenant } = await supabase
      .from('evaluation_scale')
      .select('rating, color, label')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
    
    if (!errorWithTenant && dataWithTenant) {
      ratingPoints = dataWithTenant
    } else {
      console.warn('⚠️ Error loading with tenant_id, trying without:', errorWithTenant)
      // Fallback: try without tenant_id filter (for backwards compatibility)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('evaluation_scale')
        .select('rating, color, label')
        .eq('is_active', true)
      
      if (fallbackError) {
        console.error('❌ Error loading evaluation scale (fallback):', fallbackError)
        return
      }
      
      ratingPoints = fallbackData
    }
    
    // Create map from rating to color and label
    const map: Record<number, { color: string; label: string }> = {}
    ratingPoints?.forEach(rp => {
      map[rp.rating] = {
        color: rp.color || '#3B82F6',
        label: rp.label || ''
      }
    })
    
    ratingPointsMap.value = map
    logger.debug('✅ Loaded rating points:', Object.keys(map).length, 'ratings')
    
  } catch (error: any) {
    console.error('❌ Error in loadRatingPoints:', error)
  }
}

// Helper functions to get rating color and label
const getRatingColor = (rating: number): string | null => {
  return ratingPointsMap.value[rating]?.color || null
}

const getRatingLabel = (rating: number): string | null => {
  return ratingPointsMap.value[rating]?.label || null
}

// Load functions
const loadLessons = async () => {
  if (!props.selectedStudent) return
  
  isLoadingLessons.value = true
  lessonsError.value = null
  
  try {
    logger.debug('📚 Loading lessons for student:', props.selectedStudent.id)
    
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
        staff_id,
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
      logger.debug('🔍 Loading evaluations for', appointmentIds.length, 'appointments')
      
      // Lade Notes mit Evaluationen - vereinfachte Query ohne Join
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('appointment_id', appointmentIds)
      
      if (notesError) {
        console.error('❌ Error loading notes:', notesError)
      } else if (notesData) {
        logger.debug('📝 Loaded', notesData.length, 'notes')
        
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
        
        // Gruppiere Notes nach appointment_id, nimm nur die LETZTEN (neuesten) pro evaluation_criteria_id
        const latestEvaluationsMap: Record<string, Record<string, any>> = {}
        
        // Sortiere Notes nach created_at DESC (neueste zuerst) - nur created_at da updated_at nicht existiert
        const sortedNotes = [...notesData].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA // Neueste zuerst
        })
        
        logger.debug('🔍 Total notes loaded:', notesData.length)
        
        sortedNotes.forEach(note => {
          const aptId = note.appointment_id
          const criteriaId = note.evaluation_criteria_id
          
          if (!latestEvaluationsMap[aptId]) {
            latestEvaluationsMap[aptId] = {}
          }
          
          // Wenn dieses Kriterium noch nicht vorhanden ist (da wir sortiert haben, ist das erste die neueste), speichern
          if (!latestEvaluationsMap[aptId][criteriaId]) {
            logger.debug(`✅ Keeping evaluation for apt ${aptId.slice(0, 8)}, criteria ${criteriaId?.slice(0, 8)}`)
            latestEvaluationsMap[aptId][criteriaId] = {
              ...note,
              evaluation_criteria: criteriaId ? criteriaMap[criteriaId] : null
            }
          } else {
            logger.debug(`⏭️ Skipping duplicate for apt ${aptId.slice(0, 8)}, criteria ${criteriaId?.slice(0, 8)}`)
          }
        })
        
        // Konvertiere in das erwartete Format
        Object.entries(latestEvaluationsMap).forEach(([aptId, criteriaMap]) => {
          evaluationsMap[aptId] = Object.values(criteriaMap)
          logger.debug(`📦 Apt ${aptId.slice(0, 8)} has ${evaluationsMap[aptId].length} evaluations`)
        })
      }
    }
    
    // Lade Instructor-Namen
    const instructorIds = [...new Set((appointmentsData || [])
      .map(apt => apt.staff_id)
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
      instructor: apt.staff_id ? instructorsMap[apt.staff_id] : null
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
    
    logger.debug('✅ Loaded', lessons.value.length, 'lessons with evaluations')
    
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
    logger.debug('🎓 Loading exam results for student:', props.selectedStudent.id)
    
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
        staff_id,
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
      logger.debug('✅ No appointments found for student')
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
      .map(apt => apt.staff_id)
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
      instructor: apt.staff_id ? instructorsMap[apt.staff_id] : null
    }]))
    
    examResults.value = (examResultsData || []).map(result => ({
      ...result,
      appointments: appointmentsMap.get(result.appointment_id)
    }))
    
    logger.debug('✅ Loaded', examResults.value.length, 'exam results')
    
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
    
    // Lade policies mit ihren rules
    const { data: policiesData, error: policiesError } = await supabase
      .from('cancellation_policies')
      .select(`
        *,
        cancellation_rules (*)
      `)
      .eq('is_active', true)
    
    if (policiesError) {
      console.error('❌ Error loading cancellation policies:', policiesError)
      return
    }
    
    // Flache die Rules zu einer Liste um (für einfachere Verwendung)
    const allRules: any[] = []
    policiesData?.forEach(policy => {
      if (policy.cancellation_rules) {
        policy.cancellation_rules.forEach((rule: any) => {
          allRules.push({
            ...rule,
            policy_id: policy.id,
            policy_name: policy.name,
            refund_percentage: 100 - rule.charge_percentage,
            hours_before_appointment: rule.hours_before_appointment
          })
        })
      }
    })
    
    // Sortiere nach hours_before_appointment
    cancellationPolicies.value = allRules.sort((a, b) => 
      b.hours_before_appointment - a.hours_before_appointment
    )
    
    logger.debug('✅ Loaded', cancellationPolicies.value.length, 'cancellation rules')
    
  } catch (error: any) {
    console.error('Error loading cancellation policies:', error)
  }
}

const loadPayments = async () => {
  if (!props.selectedStudent) return
  
  isLoadingPayments.value = true
  paymentsError.value = null
  
  try {
    logger.debug('💰 Loading payments for student:', props.selectedStudent.id)
    
    const supabase = getSupabase()
    
    // ✅ NEU: Lade Student Credit Balance
    const { data: creditData, error: creditError } = await supabase
      .from('student_credits')
      .select('balance_rappen')
      .eq('user_id', props.selectedStudent.id)
      .single()
    
    if (creditError && creditError.code !== 'PGRST116') {
      console.warn('⚠️ Could not load student credit:', creditError)
    } else if (creditData) {
      studentBalance.value = creditData.balance_rappen || 0
      logger.debug('💰 Student balance loaded:', ((studentBalance.value || 0) / 100).toFixed(2), 'CHF')
    }
    
    // Lade Zahlungen über appointments - RLS filtert automatisch nach tenant_id
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        created_at,
        payment_method,
        payment_status,
        paid_at,
        total_amount_rappen,
        admin_fee_rappen,
        appointment_id,
        invoice_address,
        appointments!inner(
          id,
          user_id, 
          start_time, 
          title, 
          status, 
          event_type_code,
          staff_id,
          type,
          deleted_at,
          deletion_reason,
          duration_minutes,
          cancellation_charge_percentage,
          event_types(name)
        )
      `)
      .eq('appointments.user_id', props.selectedStudent.id)
      .order('created_at', { ascending: false })
    
    if (paymentsError) {
      console.error('❌ Error loading payments:', paymentsError)
      throw paymentsError
    }
    
    // Lade discount_sales und product_sales über appointment_id
    const appointmentIds = (paymentsData || []).map(p => p.appointment_id).filter(Boolean)
    let discountSalesMap: Record<string, any> = {}
    let productSalesMap: Record<string, any[]> = {}
    
    if (appointmentIds.length > 0) {
      // Lade discount_sales (Haupt-Verkauf mit Rabatt)
      const { data: discountSalesData, error: discountSalesError } = await supabase
        .from('discount_sales')
        .select('*')
        .in('appointment_id', appointmentIds)
      
      if (discountSalesError) {
        console.error('❌ Error loading discount sales:', discountSalesError)
      } else if (discountSalesData) {
        discountSalesData.forEach(ds => {
          discountSalesMap[ds.appointment_id] = ds
          
          // Lade product_sales (Items) für diese discount_sale
          if (ds.id) {
            supabase
              .from('product_sales')
              .select(`
                *,
                products(name, price_rappen)
              `)
              .eq('product_sale_id', ds.id)
              .then(({ data: productsData, error: productsError }) => {
                if (productsError) {
                  console.error('❌ Error loading products for sale:', productsError)
                } else if (productsData) {
                  if (!productSalesMap[ds.appointment_id]) {
                    productSalesMap[ds.appointment_id] = []
                  }
                  productSalesMap[ds.appointment_id].push(...productsData)
                }
              })
          }
        })
      }
    }
    
    // Warte kurz auf die product_sales Queries
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Lade Fahrlehrer-Namen für Zahlungen
    const staffIds = [...new Set((paymentsData || [])
      .map(p => {
        // appointments ist ein Array, nehme das erste Element
        const apt = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments
        return apt?.staff_id
      })
      .filter(Boolean))]
    
    let staffMap: Record<string, any> = {}
    
    if (staffIds.length > 0) {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, first_name')
        .in('id', staffIds)
      
      if (staffError) {
        console.error('❌ Error loading staff for payments:', staffError)
      } else if (staffData) {
        staffData.forEach(staff => {
          staffMap[staff.id] = staff
        })
      }
    }
    
    // Verknüpfe alle Daten über appointment_id und füge staff hinzu
    payments.value = (paymentsData || []).map(payment => {
      // appointments ist ein Array, nehme das erste Element
      const apt = Array.isArray(payment.appointments) ? payment.appointments[0] : payment.appointments
      
      return {
        ...payment,
        discount_sale: payment.appointment_id ? discountSalesMap[payment.appointment_id] : null,
        product_sales: payment.appointment_id ? (productSalesMap[payment.appointment_id] || []) : [],
        appointments: apt ? {
          ...apt,
          staff: apt.staff_id ? staffMap[apt.staff_id] : null
        } : null
      }
    })
    
    logger.debug('✅ Loaded', payments.value.length, 'payments with product/discount sales')
    
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

    logger.debug('📤 Starting upload with new user_documents table:', {
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

    logger.debug('✅ File uploaded to storage:', storagePath)

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

    logger.debug('✅ Document saved to database:', savedDocument)

    // Reload documents to update UI
    await loadDocuments(selectedStudent.value.id)

    // Emit update to parent
    emit('studentUpdated', selectedStudent.value)

    logger.debug('✅ Document uploaded successfully with new system:', file.name)
    
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
    loadRatingPoints() // Load rating points first
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

// ===== HELPER: Build document URL for user_documents =====
const getStudentDocumentUrl = (doc: any): string => {
  // Use public_url if available (from new Storage endpoint)
  if (doc.public_url) {
    logger.debug('🔗 Using public_url from Storage:', doc.public_url)
    return doc.public_url
  }
  
  if (!doc.storage_path) return ''
  
  // Check if it's already a full URL
  if (doc.storage_path.startsWith('http')) return doc.storage_path
  
  // Build Supabase storage URL from path
  const supabaseUrl = 'https://unyjaetebnaexaflpyoc.supabase.co'
  
  let path = doc.storage_path.trim()
  
  // Remove bucket prefix if it exists (for old documents)
  if (path.startsWith('documents/')) {
    path = path.substring('documents/'.length)
  }
  
  // Clean up any double slashes
  path = path.replace(/\/+/g, '/')
  
  const url = `${supabaseUrl}/storage/v1/object/public/user-documents/${path}`
  logger.debug('🔗 Built URL from storage_path:', url)
  return url
}

// ===== STUDENT DOCUMENTS UPLOAD =====
const documentFileInput = ref<HTMLInputElement>()
const cameraInput = ref<HTMLInputElement>()

const handleDocumentUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file || !props.selectedStudent) {
    console.warn('⚠️ No file selected or no student')
    return
  }
  
  try {
    logger.debug('📤 Uploading document for student:', props.selectedStudent.id, 'File:', file.name)
    
    // Create FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', props.selectedStudent.id)
    formData.append('type', 'student-document') // Document type
    
    logger.debug('📝 FormData prepared with keys:', Array.from(formData.keys()))
    
    // Upload via API
    logger.debug('🌐 Sending request to /api/students/upload-document')
    const response = await $fetch('/api/students/upload-document', {
      method: 'POST',
      body: formData
    }) as any
    
    logger.debug('✅ Upload response received:', response)
    
    if (response?.success) {
      logger.debug('✅ Document uploaded successfully to Storage:', response.url)
      
      // Wait a bit for the file to be fully available in Storage
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Reload documents from Storage
      logger.debug('🔄 Reloading documents from Storage...')
      await loadStudentDocuments()
      
      logger.debug('✅ Documents reloaded, UI should update')
    } else {
      console.error('❌ Upload failed - no success flag:', response)
      alert(`Upload fehlgeschlagen: ${response?.message || 'Unbekannter Fehler'}`)
    }
  } catch (err: any) {
    console.error('❌ Error uploading document:', err)
    console.error('   Error details:', { message: err.message, status: err.status, data: err.data })
    alert(`Fehler beim Upload: ${err.message || 'Unbekannter Fehler'}`)
  }
  
  // Reset input
  input.value = ''
}

// ===== STUDENT DOCUMENTS (Ausweise) - Load directly from Storage =====
const loadStudentDocuments = async () => {
  if (!props.selectedStudent) {
    logger.debug('⚠️ No student selected')
    return
  }
  
  try {
    logger.debug('📂 Loading student documents from Storage for:', props.selectedStudent.id)
    
    // Call new endpoint that lists documents directly from Storage
    const { documents, count, error } = await $fetch('/api/documents/list-user-documents', {
      query: {
        userId: props.selectedStudent.id,
        tenantId: props.selectedStudent.tenant_id
      }
    }) as any
    
    if (error) {
      console.error('❌ Error loading student documents:', error)
      return
    }
    
    // Transform Storage documents to match old format for compatibility
    studentDocuments.value = (documents || []).map((doc: any) => ({
      id: doc.id,
      user_id: props.selectedStudent?.id,
      document_type: doc.documentType,
      category_code: doc.category,
      side: doc.side,
      file_name: doc.fileName,
      file_size: doc.fileSize,
      file_type: doc.fileType,
      storage_path: doc.storagePath,
      public_url: doc.publicUrl,
      created_at: doc.createdAt
    }))
    
    logger.debug('✅ Loaded student documents from Storage:', count)
    logger.debug('📋 Document details:', studentDocuments.value.map(doc => ({
      type: doc.document_type,
      category: doc.category_code,
      side: doc.side,
      storagePath: doc.storage_path,
      fileName: doc.file_name,
      size: doc.file_size
    })))
  } catch (err: any) {
    console.error('❌ Error in loadStudentDocuments:', err)
  }
}

// Watch for tab changes to load documents when Documents tab is opened
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'documents') {
    loadStudentDocuments()
  }
})

// Load documents when modal opens
watch(() => props.selectedStudent, async () => {
  if (props.selectedStudent) {
    await loadStudentDocuments()
  }
}, { immediate: true })

</script>

