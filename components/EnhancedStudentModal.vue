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
          
          <button
            @click="activeTab = 'payments'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
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
        </div>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-y-auto">
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
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht zugewiesen</div>
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
                    <div class="text-sm font-medium text-gray-900">Kategorie</div>
                    <div v-if="selectedStudent.category" class="mt-1 text-sm text-gray-700">
                      {{ selectedStudent.category }}
                    </div>
                    <div v-else class="mt-1 text-sm text-gray-500 italic">Nicht angegeben</div>
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
                      <div class="flex items-center justify-between mb-2">
                        <h5 class="font-medium text-gray-900">
                          {{ formatDateTime(payment.appointments?.start_time) }}
                          <span v-if="payment.appointments?.duration_minutes" class="text-sm text-gray-500">
                            ({{ payment.appointments.duration_minutes }} Min)
                          </span>
                        </h5>
                        <div class="flex items-center space-x-2">

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
                <span>{{ getPaymentById(paymentId)?.appointments?.start_time ? formatDateTime(getPaymentById(paymentId).appointments.start_time) : 'Unbekannter Termin' }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
  category: string | null
  assignedInstructor: string | null
  lastLesson: string | null
  scheduledLessonsCount?: number
  completedLessonsCount?: number
  cancelledLessonsCount?: number
}

interface Props {
  selectedStudent: Student | null
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Supabase client
const supabase = getSupabase()

// Reactive state
const activeTab = ref<'details' | 'progress' | 'payments'>('details')
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

    console.log('📝 Notes loaded:', notes)
    console.log('🔍 Sample note:', notes?.[0])

    // 3. Lade Kriterien-Namen
    let criteriaMap: Record<string, any> = {}
    if (notes && notes.length > 0) {
      const criteriaIds = [...new Set(notes.map(n => n.evaluation_criteria_id).filter(Boolean))]
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('evaluation_criteria')
        .select('id, name, short_code')
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

    console.log('🔍 Notes by appointment:', notesByAppointment)

    // 5. Kombiniere alles
    lessons.value = appointments.map(appointment => ({
      ...appointment,
      evaluations: notesByAppointment[appointment.id] || []
    }))
    
    // 6. Process progress data
    progressData.value = lessons.value
      .filter(lesson => lesson.evaluations && lesson.evaluations.length > 0)
      .map(lesson => {
        console.log('🔍 Processing lesson:', lesson.id, 'with evaluations:', lesson.evaluations)
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
            console.log('🔍 Processed evaluation:', processedEval)
            return processedEval
          })
        }
      })

    console.log('✅ Final lessons:', lessons.value?.length)
    console.log('✅ Final progress data:', progressData.value)
    console.log('🔍 Sample progress entry:', progressData.value?.[0])
    
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
          duration_minutes
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
    console.log('✅ Marking payments as paid:', selectedPayments.value)
    
    // Prüfe welche Zahlungen geändert werden können
    const paymentsToUpdate = payments.value.filter(p => 
      selectedPayments.value.includes(p.id) && 
      (p.payment_status === 'pending' || p.payment_status === 'completed')
    )
    
    if (paymentsToUpdate.length === 0) {
      alert('Keine Zahlungen zum Aktualisieren gefunden')
      return
    }
    
    console.log('🔄 Updating payments:', paymentsToUpdate.map(p => ({
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
    
    console.log('✅ Payments updated to cash and marked as paid successfully')
    
  } catch (error: any) {
    console.error('❌ Error marking payments as paid:', error)
    alert('Fehler beim Markieren der Zahlungen als bezahlt')
  } finally {
    isProcessingBulkAction.value = false
  }
}

const markAsInvoiced = async () => {
  // Implementation for marking payments as invoiced
  console.log('Marking payments as invoiced:', selectedPayments.value)
}

const changePaymentMethod = async () => {
  // Implementation for changing payment method
  console.log('Changing payment method for:', selectedPayments.value)
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