<template>
  <div class="exam-statistics-admin">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Prüfungsstatistiken</h1>
      <p class="text-gray-600">Übersicht über bestandene und nicht bestandene Prüfungen</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Lade Prüfungsstatistiken...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
      <h3 class="font-semibold text-red-800 mb-2">Fehler beim Laden</h3>
      <p class="text-red-700">{{ error }}</p>
      <button @click="loadData" class="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
        Erneut versuchen
      </button>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <!-- Total Exams -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Gesamt Prüfungen</p>
              <p class="text-2xl font-bold text-gray-900">{{ statistics.totalExams }}</p>
            </div>
          </div>
        </div>

        <!-- Passed Exams -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Bestanden</p>
              <p class="text-2xl font-bold text-green-600">{{ statistics.passedExams }}</p>
              <p class="text-xs text-gray-500">{{ statistics.passRate }}%</p>
            </div>
          </div>
        </div>

        <!-- Failed Exams -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Nicht bestanden</p>
              <p class="text-2xl font-bold text-red-600">{{ statistics.failedExams }}</p>
              <p class="text-xs text-gray-500">{{ statistics.failRate }}%</p>
            </div>
          </div>
        </div>

        <!-- Average Rating -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500">Ø Prüfer-Bewertung</p>
              <p class="text-2xl font-bold text-gray-900">{{ statistics.averageRating }}/6</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Filter</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Staff Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Fahrlehrer</label>
            <select 
              v-model="filters.staffId"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Fahrlehrer</option>
              <option v-for="staff in staffList" :key="staff.id" :value="staff.id">
                {{ staff.first_name }} {{ staff.last_name }}
              </option>
            </select>
          </div>

          <!-- Examiner Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Prüfungsexperte</label>
            <select 
              v-model="filters.examinerId"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Experten</option>
              <option v-for="examiner in examinerList" :key="examiner.id" :value="examiner.id">
                {{ examiner.first_name }} {{ examiner.last_name }}
              </option>
            </select>
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
            <select 
              v-model="filters.category"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Kategorien</option>
              <option v-for="category in categoryList" :key="category.code" :value="category.code">
                {{ category.name }} ({{ category.code }})
              </option>
            </select>
          </div>

          <!-- Result Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Ergebnis</label>
            <select 
              v-model="filters.result"
              @change="applyFilters"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Ergebnisse</option>
              <option value="passed">Bestanden</option>
              <option value="failed">Nicht bestanden</option>
            </select>
          </div>

          <!-- Date Range -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">Zeitraum</label>
            <div class="flex space-x-2">
              <input 
                v-model="filters.dateFrom"
                type="date"
                @change="applyFilters"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
              <span class="self-center text-gray-500">bis</span>
              <input 
                v-model="filters.dateTo"
                type="date"
                @change="applyFilters"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
            </div>
          </div>

          <!-- Reset Filters -->
          <div class="flex items-end">
            <button 
              @click="resetFilters"
              class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Filter zurücksetzen
            </button>
          </div>
        </div>
      </div>

      <!-- Staff Performance Overview -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Fahrlehrer-Performance</h2>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fahrlehrer
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gesamt
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bestanden
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nicht bestanden
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erfolgsquote
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ø Bewertung
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="staff in staffPerformance" :key="staff.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                      <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-blue-600">
                          {{ getInitials(staff.first_name, staff.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ staff.first_name }} {{ staff.last_name }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ staff.totalExams }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {{ staff.passedExams }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {{ staff.failedExams }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        class="bg-green-500 h-2 rounded-full transition-all"
                        :style="{ width: `${staff.passRate}%` }"
                      ></div>
                    </div>
                    <span class="text-sm font-medium text-gray-900">{{ staff.passRate }}%</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ staff.averageRating }}/6
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detailed Exam Results -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Detaillierte Prüfungsergebnisse</h2>
          <div class="text-sm text-gray-500">
            {{ filteredExamResults.length }} von {{ examResults.length }} Prüfungen
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schüler
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fahrlehrer
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prüfungsexperte
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ergebnis
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bewertung
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="exam in paginatedResults" :key="exam.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ formatDate(exam.exam_date) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ exam.student_name }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ exam.staff_name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ exam.category }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ exam.examiner_name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="exam.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ exam.passed ? 'Bestanden' : 'Nicht bestanden' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div class="flex items-center">
                    <span>{{ exam.examiner_behavior_rating || '-' }}/6</span>
                    <div 
                      v-if="exam.examiner_behavior_notes" 
                      class="ml-2 w-4 h-4 text-gray-400 cursor-help"
                      :title="exam.examiner_behavior_notes"
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
          <div class="text-sm text-gray-700">
            Zeige {{ (currentPage - 1) * itemsPerPage + 1 }} bis {{ Math.min(currentPage * itemsPerPage, filteredExamResults.length) }} von {{ filteredExamResults.length }} Ergebnissen
          </div>
          <div class="flex space-x-2">
            <button 
              @click="currentPage = Math.max(1, currentPage - 1)"
              :disabled="currentPage === 1"
              class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Zurück
            </button>
            <span class="px-3 py-1 text-sm">
              Seite {{ currentPage }} von {{ totalPages }}
            </span>
            <button 
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
        </div>
      </div>

      <!-- Examiner Performance -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Prüfungsexperten-Übersicht</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="examiner in examinerPerformance" :key="examiner.id" class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-gray-900">{{ examiner.first_name }} {{ examiner.last_name }}</h3>
              <span class="text-sm text-gray-500">{{ examiner.totalExams }} Prüfungen</span>
            </div>
            
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-green-600">Bestanden:</span>
                <span class="font-medium">{{ examiner.passedExams }} ({{ examiner.passRate }}%)</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-red-600">Nicht bestanden:</span>
                <span class="font-medium">{{ examiner.failedExams }} ({{ examiner.failRate }}%)</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Ø Bewertung:</span>
                <span class="font-medium">{{ examiner.averageRating }}/6</span>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mt-3">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Erfolgsquote</span>
                <span>{{ examiner.passRate }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-green-500 h-2 rounded-full transition-all"
                  :style="{ width: `${examiner.passRate}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { getSupabase } from '~/utils/supabase'
import { useUIStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'

// Layout
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

// Composables
const { showSuccess, showError } = useUIStore()
const supabase = getSupabase()

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const examResults = ref<any[]>([])
const staffList = ref<any[]>([])
const examinerList = ref<any[]>([])
const categoryList = ref<any[]>([])

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Filters
const filters = ref({
  staffId: '',
  examinerId: '',
  category: '',
  result: '',
  dateFrom: '',
  dateTo: ''
})

// Computed
const statistics = computed(() => {
  const total = filteredExamResults.value.length
  const passed = filteredExamResults.value.filter(exam => exam.passed).length
  const failed = total - passed
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
  const failRate = total > 0 ? Math.round((failed / total) * 100) : 0
  
  const ratingsSum = filteredExamResults.value
    .filter(exam => exam.examiner_behavior_rating)
    .reduce((sum, exam) => sum + exam.examiner_behavior_rating, 0)
  const ratingsCount = filteredExamResults.value.filter(exam => exam.examiner_behavior_rating).length
  const averageRating = ratingsCount > 0 ? (ratingsSum / ratingsCount).toFixed(1) : '0.0'
  
  return {
    totalExams: total,
    passedExams: passed,
    failedExams: failed,
    passRate,
    failRate,
    averageRating
  }
})

const filteredExamResults = computed(() => {
  let results = [...examResults.value]
  
  if (filters.value.staffId) {
    results = results.filter(exam => exam.staff_id === filters.value.staffId)
  }
  
  if (filters.value.examinerId) {
    results = results.filter(exam => exam.examiner_id === filters.value.examinerId)
  }
  
  if (filters.value.category) {
    results = results.filter(exam => exam.category === filters.value.category)
  }
  
  if (filters.value.result) {
    const passed = filters.value.result === 'passed'
    results = results.filter(exam => exam.passed === passed)
  }
  
  if (filters.value.dateFrom) {
    results = results.filter(exam => new Date(exam.exam_date) >= new Date(filters.value.dateFrom))
  }
  
  if (filters.value.dateTo) {
    results = results.filter(exam => new Date(exam.exam_date) <= new Date(filters.value.dateTo))
  }
  
  return results.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())
})

const totalPages = computed(() => Math.ceil(filteredExamResults.value.length / itemsPerPage.value))

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredExamResults.value.slice(start, end)
})

const staffPerformance = computed(() => {
  const staffStats = new Map()
  
  for (const staff of staffList.value) {
    const staffExams = filteredExamResults.value.filter(exam => exam.staff_id === staff.id)
    const passed = staffExams.filter(exam => exam.passed).length
    const failed = staffExams.length - passed
    const passRate = staffExams.length > 0 ? Math.round((passed / staffExams.length) * 100) : 0
    
    const ratingsSum = staffExams
      .filter(exam => exam.examiner_behavior_rating)
      .reduce((sum, exam) => sum + exam.examiner_behavior_rating, 0)
    const ratingsCount = staffExams.filter(exam => exam.examiner_behavior_rating).length
    const averageRating = ratingsCount > 0 ? (ratingsSum / ratingsCount).toFixed(1) : '0.0'
    
    staffStats.set(staff.id, {
      ...staff,
      totalExams: staffExams.length,
      passedExams: passed,
      failedExams: failed,
      passRate,
      averageRating
    })
  }
  
  return Array.from(staffStats.values()).sort((a, b) => b.totalExams - a.totalExams)
})

const examinerPerformance = computed(() => {
  const examinerStats = new Map()
  
  for (const examiner of examinerList.value) {
    const examinerExams = filteredExamResults.value.filter(exam => exam.examiner_id === examiner.id)
    const passed = examinerExams.filter(exam => exam.passed).length
    const failed = examinerExams.length - passed
    const passRate = examinerExams.length > 0 ? Math.round((passed / examinerExams.length) * 100) : 0
    const failRate = examinerExams.length > 0 ? Math.round((failed / examinerExams.length) * 100) : 0
    
    const ratingsSum = examinerExams
      .filter(exam => exam.examiner_behavior_rating)
      .reduce((sum, exam) => sum + exam.examiner_behavior_rating, 0)
    const ratingsCount = examinerExams.filter(exam => exam.examiner_behavior_rating).length
    const averageRating = ratingsCount > 0 ? (ratingsSum / ratingsCount).toFixed(1) : '0.0'
    
    examinerStats.set(examiner.id, {
      ...examiner,
      totalExams: examinerExams.length,
      passedExams: passed,
      failedExams: failed,
      passRate,
      failRate,
      averageRating
    })
  }
  
  return Array.from(examinerStats.values()).sort((a, b) => b.totalExams - a.totalExams)
})

// Methods
const loadData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    const authStore = useAuthStore()
    const tenantId = (authStore.userProfile as any)?.tenant_id
    
    if (!tenantId) {
      throw new Error('Kein Tenant zugeordnet')
    }
    
    // Load exam results with all related data
    const { data: examData, error: examError } = await supabase
      .from('exam_results')
      .select(`
        *,
        appointments (
          id,
          title,
          type,
          user_id,
          staff_id,
          users:user_id (
            first_name,
            last_name
          ),
          staff:staff_id (
            first_name,
            last_name
          )
        ),
        examiners (
          id,
          first_name,
          last_name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('exam_date', { ascending: false })
    
    if (examError) throw examError
    
    // Process exam results
    examResults.value = (examData || []).map(exam => ({
      ...exam,
      student_name: exam.appointments?.users ? 
        `${exam.appointments.users.first_name} ${exam.appointments.users.last_name}` : 
        'Unbekannt',
      staff_name: exam.appointments?.staff ? 
        `${exam.appointments.staff.first_name} ${exam.appointments.staff.last_name}` : 
        'Unbekannt',
      staff_id: exam.appointments?.staff_id,
      examiner_name: exam.examiners ? 
        `${exam.examiners.first_name} ${exam.examiners.last_name}` : 
        'Unbekannt',
      category: exam.appointments?.type || 'Unbekannt'
    }))
    
    // Load staff list
    const { data: staffData, error: staffError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('tenant_id', tenantId)
      .eq('role', 'staff')
      .eq('is_active', true)
    
    if (staffError) throw staffError
    staffList.value = staffData || []
    
    // Load examiner list
    const { data: examinerData, error: examinerError } = await supabase
      .from('examiners')
      .select('id, first_name, last_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
    
    if (examinerError) throw examinerError
    examinerList.value = examinerData || []
    
    // Get tenant business_type first
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()

    if (tenantError) throw tenantError
    
    // Only load categories if business_type is driving_school
    if (tenantData?.business_type !== 'driving_school') {
      logger.debug('🚫 Categories not available for business_type:', tenantData?.business_type)
      categories.value = []
      isLoading.value = false
      return
    }

    // Load categories
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('code, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
    
    if (categoryError) throw categoryError
    categoryList.value = categoryData || []
    
    logger.debug('✅ Exam statistics loaded:', {
      exams: examResults.value.length,
      staff: staffList.value.length,
      examiners: examinerList.value.length,
      categories: categoryList.value.length
    })
    
  } catch (err: any) {
    console.error('❌ Error loading exam statistics:', err)
    error.value = err.message || 'Fehler beim Laden der Prüfungsstatistiken'
  } finally {
    isLoading.value = false
  }
}

const applyFilters = () => {
  currentPage.value = 1 // Reset to first page when filtering
}

const resetFilters = () => {
  filters.value = {
    staffId: '',
    examinerId: '',
    category: '',
    result: '',
    dateFrom: '',
    dateTo: ''
  }
  currentPage.value = 1
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
}

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Exam statistics page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, loading exam statistics...')
  
  // Original onMounted logic
  loadData()
})
</script>

<style scoped>
.exam-statistics-admin {
  background-color: #f8fafc;
  min-height: 100vh;
  padding: 1.5rem;
}

/* Loading animation */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Table hover effects */
tbody tr:hover {
  background-color: #f9fafb;
}

/* Responsive */
@media (max-width: 768px) {
  .exam-statistics-admin {
    padding: 1rem;
  }
}
</style>
