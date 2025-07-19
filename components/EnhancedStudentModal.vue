<template>
  <div v-if="selectedStudent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
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

      <div class="bg-gray-50 border-b px-4">
        <div class="flex">
          <button
            @click="activeTab = 'details'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'details'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Details
          </button>
          <button
            @click="activeTab = 'lessons'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'lessons'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Lektionen
            <span v-if="lessonsCount > 0" class="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
              {{ lessonsCount }}
            </span>
          </button>
          <button
            @click="activeTab = 'progress'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'progress'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Fortschritt
          </button>
        </div>
      </div>

     <div class="flex-1 overflow-y-auto p-4">
  <div v-if="activeTab === 'details'" class="space-y-6">
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

          <!-- Kategorie -->
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Kategorie</div>
              <div class="mt-1">
                <span v-if="selectedStudent.category" 
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {{ selectedStudent.category }}
                </span>
                <span v-else class="text-sm text-gray-500 italic">Nicht angegeben</span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Geburtsdatum -->
          <div v-if="selectedStudent.birthdate" class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Geburtsdatum</div>
              <div class="mt-1 text-sm text-gray-700">{{ formatDate(selectedStudent.birthdate) }}</div>
            </div>
          </div>

          <!-- Adresse -->
          <div v-if="selectedStudent.fullAddress" class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Adresse</div>
              <div class="mt-1">
                <a 
                  :href="`https://maps.google.com/?q=${encodeURIComponent(selectedStudent.fullAddress)}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-start"
                >
                  <span class="break-words">{{ selectedStudent.fullAddress }}</span>
                  <svg class="w-3 h-3 ml-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <!-- Fahrlehrer -->
          <div v-if="selectedStudent.assignedInstructor" class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-5 h-5 mt-0.5">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900">Fahrlehrer</div>
              <div class="mt-1 text-sm text-gray-700">{{ selectedStudent.assignedInstructor }}</div>
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
        <div v-if="selectedStudent.lessonsCount" class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900">Lektionen total</div>
            <div class="text-2xl font-bold text-gray-900">{{ selectedStudent.lessonsCount }}</div>
          </div>
        </div>

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
    </div>

    <!-- Aktionen -->
    <div class="bg-white rounded-lg border p-6">
      <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg class="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        Schnellaktionen
      </h4>
      
      <div class="flex flex-wrap gap-3">
        <button
          v-if="selectedStudent.phone"
          @click="callStudent(selectedStudent.phone)"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          Anrufen
        </button>

        <button
          v-if="selectedStudent.email"
          @click="emailStudent(selectedStudent.email)"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
          E-Mail senden
        </button>

        <button
          @click="createAppointment(selectedStudent)"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          Termin buchen
        </button>
      </div>
    </div>
  </div>
</div>

       <div v-if="activeTab === 'lessons'">
  <div v-if="isLoadingLessons" class="flex items-center justify-center py-8">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    <span class="ml-2 text-gray-600">Lektionen werden geladen...</span>
  </div>

  <div v-else-if="lessonsError" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
    {{ lessonsError }}
  </div>

  <div v-else-if="lessons.length === 0" class="text-center py-8">
    <div class="text-4xl mb-2">📚</div>
    <h4 class="font-semibold text-gray-900 mb-2">Noch keine Lektionen</h4>
    <p class="text-gray-600 mb-4">Dieser Schüler hat noch keine Fahrlektionen absolviert.</p>
    <button
      @click="createAppointment(selectedStudent)"
      class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
    >
      Erste Lektion buchen
    </button>
  </div>

  <div v-else class="space-y-4">
    <div class="text-sm text-gray-600 mb-4">{{ lessons.length }} Lektionen</div>

    <div class="space-y-3">
      <div
        v-for="lesson in lessons"
        :key="lesson.id"
        class="bg-white border rounded-lg p-4 hover:shadow-md transition-all"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900">
              {{ formatDateTime(lesson.start_time) }}
              <span v-if="lesson.duration_minutes" class="ml-2">
                |  {{ lesson.duration_minutes }}min
              </span></h4>
              <p class=" text-gray-600">
              📍 {{ lesson.location_name || 'Treffpunkt nicht definiert' }}
              </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

        <div v-if="activeTab === 'progress'" class="space-y-4">
          <div v-if="isLoadingLessons" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span class="ml-2 text-gray-600">Lade Fortschrittsdaten...</span>
          </div>

          <div v-else-if="lessonsError" class="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
            {{ lessonsError }}
          </div>

          <div v-else-if="lessons.length === 0" class="text-center py-8">
            <div class="text-3xl mb-2">📚</div>
            <h4 class="font-semibold text-gray-900 mb-2">Keine Lektionen gefunden</h4>
            <p class="text-gray-600 text-sm">Dieser Schüler hat noch keine Fahrlektionen absolviert.</p>
          </div>

          <div v-else-if="progressData.length === 0" class="text-center py-8">
            <div class="text-3xl mb-2">📊</div>
            <h4 class="font-semibold text-gray-900 mb-2">Keine Kriterien-Bewertungen verfügbar</h4>
            <p class="text-gray-600 text-sm">
              {{ lessons.length }} Lektionen gefunden, aber noch keine Kriterien bewertet.
            </p>
          </div>

          <div v-else class="space-y-2">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-semibold text-gray-900">Lernfortschritt</h4>
            </div>

            <div class="space-y-1">
              <!-- KORRIGIERT: Iteriere über Gruppen und dann über Evaluationen -->
              <div
                v-for="group in progressData"
                :key="group.appointment_id"
                class="space-y-1"
              >
                <!-- Terminheader -->
                <div class="text-xs font-medium text-gray-600 mb-2">
                  {{ group.date }} • {{ group.time }}
                  <span v-if="group.duration" class="text-gray-500">
                    ({{ group.duration }}min)
                  </span>
                </div>

                <!-- Einzelne Kriterien-Bewertungen -->
                <div
                  v-for="(evaluation, evalIndex) in group.evaluations"
                  :key="`${group.appointment_id}-${evaluation.criteria_id}-${evalIndex}`"
                  class="border-l-3 pl-3 py-2 border-gray-200 hover:bg-gray-50 transition-colors"
                  :style="{ borderLeftColor: evaluation.borderColor }"
                >
                  <div class="space-y-1">
                    <div class="flex items-start gap-2">
                      <span
                        class="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                        :class="evaluation.colorClass"
                      >
                        {{ evaluation.rating }}/6
                      </span>
                      <div class="flex-1 min-w-0">
                        <div
                          class="text-xs font-medium mb-1"
                          :class="evaluation.textColorClass"
                        >
                          {{ evaluation.criteriaName }}
                          <span v-if="evaluation.shortCode" class="text-gray-500 ml-1">({{ evaluation.shortCode }})</span>
                        </div>
                        <div
                          v-if="evaluation.note"
                          class="text-xs leading-relaxed"
                          :class="evaluation.noteColorClass"
                        >
                          {{ evaluation.note }}
                        </div>
                        <div v-else class="text-xs text-gray-500 italic">Keine Notiz</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showNoteModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="font-semibold text-gray-900">{{ selectedCriteria?.criteria_name }}</h4>
          <button @click="showNoteModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">Bewertung:</span>
            <span :class="[
              'px-2 py-1 rounded text-sm font-medium',
              getRatingColor(selectedCriteria?.criteria_rating)
            ]">
              {{ selectedCriteria?.criteria_rating }}/6 - {{ getRatingText(selectedCriteria?.criteria_rating) }}
            </span>
          </div>
          
          <div>
            <span class="text-sm text-gray-600 block mb-2">Notiz:</span>
            <p class="text-sm text-gray-800 bg-gray-50 p-3 rounded">
              {{ selectedCriteria?.criteria_note }}
            </p>
          </div>
        </div>
        
        <button
          @click="showNoteModal = false"
          class="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Schließen
        </button>
      </div>
    </div>
 
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { 
  formatDate, 
  formatTime, 
  formatDateTime,
  formatDateShort,
  formatTimeShort
} from '~/utils/dateUtils'

// Props
interface Props {
  selectedStudent: any
}

// Interfaces für Datenstrukturen
interface EvaluationCategorySupabase {
  name: string | null
}

interface EvaluationCriteriaSupabase {
  name: string
  short_code: string | null
  evaluation_categories: EvaluationCategorySupabase[] | null
}

interface RawNote {
  appointment_id: string
  criteria_rating: number
  criteria_note: string | null
  evaluation_criteria_id: string
  evaluation_criteria: EvaluationCriteriaSupabase[] | null
}

interface CriteriaEvaluation {
  criteria_id: string
  criteria_name: string
  criteria_short_code: string | null
  criteria_rating: number
  criteria_note: string | null
  criteria_category_name?: string | null
}

interface Lesson {
  id: string
  title: string | null
  start_time: string
  end_time: string
  duration_minutes: number | null
  status: string
  location_name?: string | null  
  criteria_evaluations?: CriteriaEvaluation[]
}

// KORRIGIERTE Interface für ProgressEntry - entfernt die direkten Properties
interface ProgressGroup {
  appointment_id: string
  date: string
  time: string
  duration?: number
  sortDate: Date
  evaluations: {
    criteria_id: string
    criteriaName: string
    shortCode: string | null
    rating: number
    note: string
    colorClass: string
    textColorClass: string
    noteColorClass: string
    borderColor: string
  }[]
}

interface AppointmentWithLocation {
  id: string
  title: string | null
  start_time: string
  end_time: string
  duration_minutes: number | null
  status: string
  locations: {
    name: string
  } | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'edit', 'create-appointment', 'evaluate-lesson'])

// Supabase
const supabase = getSupabase()

// State
const activeTab = ref('details')
const isLoadingLessons = ref(false)
const lessonsError = ref<string | null>(null)
const lessons = ref<Lesson[]>([])
const lessonFilter = ref('all')

// Modal state
const showNoteModal = ref(false)
const selectedCriteria = ref<CriteriaEvaluation | null>(null)

// Computed
const lessonsCount = computed(() => lessons.value.length)

const filteredLessons = computed(() => {
  const allLessons = lessons.value

  if (lessonFilter.value === 'evaluated') {
    return allLessons.filter(lesson =>
      lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0
    )
  } else if (lessonFilter.value === 'pending') {
    return allLessons.filter(lesson =>
      !lesson.criteria_evaluations || lesson.criteria_evaluations.length === 0
    )
  }

  return allLessons
})

// KORRIGIERTES progressData computed - gibt Gruppen zurück, nicht flache Einträge
const progressData = computed((): ProgressGroup[] => {
  if (!lessons.value || lessons.value.length === 0) return []

  const groupedByAppointment: Record<string, ProgressGroup> = {}

  lessons.value.forEach(lesson => {
    if (lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0) {
      const appointmentGroup: ProgressGroup = {
        appointment_id: lesson.id,
        date: formatDateShort(lesson.start_time),
        time: formatTimeShort(lesson.start_time),
        duration: lesson.duration_minutes || undefined,
        sortDate: new Date(lesson.start_time),
        evaluations: []
      }

      lesson.criteria_evaluations.forEach((criteria: CriteriaEvaluation) => {
        const rating = criteria.criteria_rating || 0
        appointmentGroup.evaluations.push({
          criteria_id: criteria.criteria_id,
          criteriaName: criteria.criteria_name,
          shortCode: criteria.criteria_short_code,
          rating: rating,
          note: criteria.criteria_note || '',
          colorClass: getRatingColor(rating),
          textColorClass: getRatingTextColor(rating),
          noteColorClass: getRatingNoteColor(rating),
          borderColor: getRatingBorderColor(rating)
        })
      })

      // Sortiere Evaluationen nach Kriterien-Name
      appointmentGroup.evaluations.sort((a, b) => a.criteriaName.localeCompare(b.criteriaName))
      
      groupedByAppointment[lesson.id] = appointmentGroup
    }
  })

  // Konvertiere zu Array und sortiere nach Datum (neueste zuerst)
  return Object.values(groupedByAppointment).sort((a, b) => 
    b.sortDate.getTime() - a.sortDate.getTime()
  )
})

// Methods
// ===== ALLE METHODS FÜR EnhancedStudentModal.vue =====

// Basic Modal Methods
const closeModal = () => {
  emit('close')
}

const editStudent = (student: any) => {
  emit('edit', student)
}

const createAppointment = (student: any) => {
  emit('create-appointment', student)
}

const evaluateLesson = (lesson: any) => {
  emit('evaluate-lesson', lesson)
}

// ===== MAIN LOAD LESSONS FUNCTION =====
const loadLessons = async () => {
  if (!props.selectedStudent?.id) return

  isLoadingLessons.value = true
  lessonsError.value = null

  try {
    console.log('🔥 Loading lessons for student:', props.selectedStudent.id)

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
        location_id
      `)
      .eq('user_id', props.selectedStudent.id)
      .in('status', ['completed', 'cancelled'])
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError
    console.log('✅ Appointments loaded:', appointments?.length || 0)

    if (!appointments || appointments.length === 0) {
      lessons.value = []
      return
    }

    // 2. Lade Locations separat
    const locationIds = [...new Set(appointments.map(a => a.location_id).filter(Boolean))]
    let locationsMap: Record<string, string> = {}
    
    if (locationIds.length > 0) {
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds)

      if (!locationsError && locations) {
        locationsMap = locations.reduce((acc, loc) => {
          acc[loc.id] = loc.name
          return acc
        }, {} as Record<string, string>)
      }
    }

    // 3. Lade Notes mit Bewertungen (KORRIGIERTE VERSION)
    const appointmentIds = appointments.map(a => a.id)
    console.log('🔍 Searching notes for appointments:', appointmentIds)

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

    if (notesError) {
      console.error('❌ Notes error:', notesError)
      throw notesError
    }

    console.log('✅ Notes loaded:', notes?.length || 0)

    // 4. NEUE SEPARATE QUERY FÜR KRITERIEN-NAMEN
    let criteriaMap: Record<string, any> = {}
   // ✅ DEBUG: Prüfe ob Kriterien in DB existieren
if (notes && notes.length > 0) {
  const criteriaIds = [...new Set(notes.map(n => n.evaluation_criteria_id).filter(Boolean))]
  console.log('🔍 Loading criteria for IDs:', criteriaIds)
  
  // ✅ FÜGEN SIE DIESE DEBUG-QUERY HINZU:
  const { data: allCriteria, error: allCriteriaError } = await supabase
    .from('evaluation_criteria')
    .select('id, name, short_code')
    .limit(5)
  
  console.log('🔍 Sample criteria in database:', allCriteria)
  console.log('🔍 Error loading all criteria:', allCriteriaError)
  
  const { data: criteriaData, error: criteriaError } = await supabase
    .from('evaluation_criteria')
    .select('id, name, short_code')
    .in('id', criteriaIds)
    
  console.log('🔍 Criteria query result:', criteriaData)
  console.log('🔍 Criteria query error:', criteriaError)
    
  if (!criteriaError && criteriaData) {
    criteriaMap = criteriaData.reduce((acc, c) => {
      acc[c.id] = c
      return acc
    }, {} as Record<string, any>)
    console.log('✅ Criteria map loaded:', criteriaMap)
  }
}

    // 5. Verarbeite Notes zu Criteria Evaluations (KORRIGIERTE VERSION)
    const notesByAppointment = (notes || []).reduce((acc: Record<string, CriteriaEvaluation[]>, note: any) => {
      console.log('🔍 Processing note:', note)
      
      if (!acc[note.appointment_id]) {
        acc[note.appointment_id] = []
      }
      
      const criteria = criteriaMap[note.evaluation_criteria_id]
      
      if (note.evaluation_criteria_id && note.criteria_rating !== null && criteria) {
        console.log('✅ Adding evaluation for appointment:', note.appointment_id)
        acc[note.appointment_id].push({
          criteria_id: note.evaluation_criteria_id,
          criteria_name: criteria.name || 'Unbekannt',
          criteria_short_code: criteria.short_code || null,
          criteria_rating: note.criteria_rating,
          criteria_note: note.criteria_note,
          criteria_category_name: null
        })
      } else {
        console.log('❌ Skipping note due to missing data:', { 
          criteria_id: note.evaluation_criteria_id, 
          rating: note.criteria_rating, 
          criteria: criteria 
        })
      }
      
      return acc
    }, {} as Record<string, CriteriaEvaluation[]>)

    console.log('🔍 Notes by appointment:', notesByAppointment)

    // 6. Kombiniere alles
    lessons.value = appointments.map(appointment => ({
      ...appointment,
      location_name: locationsMap[appointment.location_id] || null,
      criteria_evaluations: notesByAppointment[appointment.id] || []
    }))

    console.log('✅ Final lessons with locations and evaluations:', lessons.value.length)
    console.log('📍 Sample lesson:', lessons.value?.[0])

  } catch (err: any) {
    console.error('❌ Error loading lessons:', err)
    lessonsError.value = err.message || 'Fehler beim Laden der Lektionen'
  } finally {
    isLoadingLessons.value = false
  }
}

// ===== UTILITY FUNCTIONS =====
const groupedCriteriaEvaluations = (evaluations: CriteriaEvaluation[]) => {
  const grouped: Record<string, CriteriaEvaluation[]> = {}
  evaluations.forEach(evalItem => {
    const categoryName = evalItem.criteria_category_name || 'Allgemeine Kriterien'
    if (!grouped[categoryName]) {
      grouped[categoryName] = []
    }
    grouped[categoryName].push(evalItem)
  })

  for (const category in grouped) {
    grouped[category].sort((a, b) => a.criteria_name.localeCompare(b.criteria_name))
  }
  return grouped
}

const showCriteriaNote = (criteria: CriteriaEvaluation) => {
  selectedCriteria.value = criteria
  showNoteModal.value = true
}

// ===== RATING COLOR FUNCTIONS =====
const getRatingColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'bg-gray-100 text-gray-700'
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-green-100 text-green-700',
    6: 'bg-emerald-100 text-emerald-700'
  }
  return colors[rating] || 'bg-gray-100 text-gray-700'
}

const getRatingText = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return ''
  const texts: Record<number, string> = {
    1: 'Besprochen',
    2: 'Geübt',
    3: 'Ungenügend',
    4: 'Genügend',
    5: 'Gut',
    6: 'Prüfungsreif'
  }
  return texts[rating] || ''
}

const getRatingTextColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'text-gray-900'
  const colors: Record<number, string> = {
    1: 'text-red-800',     
    2: 'text-orange-800',  
    3: 'text-yellow-800',  
    4: 'text-blue-800',    
    5: 'text-green-800',   
    6: 'text-emerald-800'  
  }
  return colors[rating] || 'text-gray-900'
}

const getRatingNoteColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'text-gray-700'
  const colors: Record<number, string> = {
    1: 'text-red-700',     
    2: 'text-orange-700',  
    3: 'text-yellow-700',  
    4: 'text-blue-700',    
    5: 'text-green-700',   
    6: 'text-emerald-700'  
  }
  return colors[rating] || 'text-gray-700'
}

const getRatingBorderColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return '#6b7280'
  const colors: Record<number, string> = {
    1: '#dc2626',
    2: '#ea580c',
    3: '#ca8a04',
    4: '#2563eb',
    5: '#16a34a',
    6: '#059669'
  }
  return colors[rating] || '#6b7280'
}

const getRatingBgColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) return 'bg-gray-400'
  const colors: Record<number, string> = {
    1: 'bg-red-400',
    2: 'bg-orange-400',
    3: 'bg-yellow-400', 
    4: 'bg-blue-400',
    5: 'bg-green-400',
    6: 'bg-emerald-400'
  }
  return colors[rating] || 'bg-gray-400'
}

// ===== CONTACT FUNCTIONS =====
// ✅ NEUE VERSION (mit Parametern)
const callStudent = (phone: string) => {
  if (phone) {
    window.open(`tel:${phone}`)
  }
}

const emailStudent = (email: string) => {
  if (email) {
    window.open(`mailto:${email}`)
  }
}

// ===== COMPUTED STATISTICS =====
const totalLessons = computed(() => {
  return lessons.value.filter(lesson => 
    lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0
  ).length
})

const averageRating = computed(() => {
  const allRatings = progressData.value.flatMap(group => 
    group.evaluations.map(evaluation => evaluation.rating)
  )
  if (allRatings.length === 0) return '0.0'
  const avg = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
  return avg.toFixed(1)
})

const totalCriteria = computed(() => {
  return progressData.value.reduce((total, group) => total + group.evaluations.length, 0)
})

const lastLessonDays = computed(() => {
  if (lessons.value.length === 0) return '–'
  const lastLesson = lessons.value[0]
  if (!lastLesson || !lastLesson.start_time) return '–'
  const daysDiff = Math.floor((new Date().getTime() - new Date(lastLesson.start_time).getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff.toString()
})

const ratingDistribution = computed(() => {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  progressData.value.forEach(group => {
    group.evaluations.forEach(evaluation => {
      const rating = evaluation.rating
      if (rating >= 1 && rating <= 6) {
        distribution[rating]++
      }
    })
  })
  return distribution
})

// Watchers
watch(() => props.selectedStudent, (newStudent) => {
  if (newStudent) {
    console.log('🔥 Student ausgewählt:', newStudent.first_name, newStudent.last_name)
    activeTab.value = 'details'
    loadLessons()
  }
}, { immediate: true })

watch(activeTab, (newTab) => {
  if ((newTab === 'lessons' || newTab === 'progress') && props.selectedStudent) {
    console.log('🔥 Tab gewechselt zu:', newTab, '. Lektionen werden geladen...')
    loadLessons()
  }
})
</script>