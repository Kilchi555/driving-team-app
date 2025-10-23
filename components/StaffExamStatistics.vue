<template>
  <!-- Modal Wrapper -->
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 min-h-[100svh]">
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[calc(100svh-80px-env(safe-area-inset-bottom,0px))] overflow-y-auto">
      
      <!-- Modal Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <h2 class="text-xl font-bold text-gray-900">Prüfungsstatistik</h2>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
        >
          ×
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 space-y-6">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="h-24 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <!-- Error State -->
        <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ❌ {{ error }}
        </div>

        <!-- Statistics Overview -->
        <div v-if="!isLoading && !error" class="space-y-6">
          
          <!-- Overall Statistics -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div class="text-sm text-blue-700 font-medium mb-1">Gesamt Prüfungen</div>
              <div class="text-2xl font-bold text-blue-800">{{ totalExams }}</div>
            </div>
            <div class="bg-green-50 p-4 rounded-lg border border-green-200">
              <div class="text-sm text-green-700 font-medium mb-1">Bestanden</div>
              <div class="text-2xl font-bold text-green-800">{{ passedExams }}</div>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div class="text-sm text-orange-700 font-medium mb-1">Erfolgsquote</div>
              <div class="text-2xl font-bold text-orange-800">{{ successRate }}%</div>
            </div>
          </div>

          <!-- Category Statistics -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">Erfolgsquote nach Kategorie</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div 
                v-for="category in categoryStats" 
                :key="category.category"
                class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                @click="showCategoryDetails(category)"
              >
                <div class="flex justify-between items-start mb-2">
                  <h4 class="font-semibold text-gray-900">{{ category.category }}</h4>
                  <span class="text-sm text-gray-500">{{ category.total }} Prüfungen</span>
                </div>
                
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span>Bestanden:</span>
                    <span class="font-medium text-green-600">{{ category.passed }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Nicht bestanden:</span>
                    <span class="font-medium text-red-600">{{ category.failed }}</span>
                  </div>
                  
                  <!-- Progress Bar -->
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      class="bg-green-500 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${category.successRate}%` }"
                    ></div>
                  </div>
                  
                  <div class="text-center">
                    <span class="text-lg font-bold" :class="{
                      'text-green-600': category.successRate >= 80,
                      'text-orange-600': category.successRate >= 60 && category.successRate < 80,
                      'text-red-600': category.successRate < 60
                    }">
                      {{ category.successRate }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Category Details Modal -->
    <div v-if="showDetailsModal" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div class="flex items-center space-x-3">
            <h3 class="text-xl font-bold text-gray-900">
              Prüfungsdetails: {{ selectedCategory?.category }}
            </h3>
          </div>
          <button
            @click="showDetailsModal = false"
            class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
          >
            ×
          </button>
        </div>
        
        <div class="p-2 space-y-6">

          <!-- Examiners Statistics -->
          <div class="space-y-4">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                v-for="examiner in selectedCategory?.examiners" 
                :key="examiner.name"
                class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div class="flex justify-between items-start mb-3">
                  <h5 class="font-semibold text-gray-900">{{ examiner.name }}</h5>
                  <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{{ examiner.total }} Prüfungen</span>
                </div>
                
                <div class="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div class="text-center">
                    <div class="text-green-600 font-bold text-lg">{{ examiner.passed }}</div>
                    <div class="text-gray-600">bestanden</div>
                  </div>
                  <div class="text-center">
                    <div class="text-red-600 font-bold text-lg">{{ examiner.failed }}</div>
                    <div class="text-gray-600">nicht bestanden</div>
                  </div>
                </div>
                
                <div class="mt-3">
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      class="bg-green-500 h-3 rounded-full transition-all duration-300"
                      :style="{ width: `${examiner.successRate}%` }"
                    ></div>
                  </div>
                  <div class="text-center mt-2">
                    <span class="text-sm font-semibold" :class="{
                      'text-green-600': examiner.successRate >= 80,
                      'text-orange-600': examiner.successRate >= 60 && examiner.successRate < 80,
                      'text-red-600': examiner.successRate < 60
                    }">
                      {{ examiner.successRate }}% Erfolgsquote
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <!-- Detailed Exam List -->
            <div class="space-y-4">
              
              <!-- Desktop Expandable View -->
              <div class="hidden md:block space-y-2">
                <div 
                  v-for="exam in selectedCategory?.exams" 
                  :key="exam.id"
                  class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  @click="toggleExamExpansion(exam.id)"
                >
                  <!-- Collapsed View -->
                  <div class="p-4 flex justify-between items-center">
                    <div class="flex items-center space-x-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ formatDate(exam.exam_date) }}
                      </div>
                      <div class="text-sm text-gray-900">
                        {{ exam.student_name }}
                      </div>
                    </div>
                    <div class="flex items-center space-x-3">
                      <span class="inline-flex px-3 py-1 text-xs font-semibold rounded-full" :class="{
                        'bg-green-100 text-green-800': exam.passed,
                        'bg-red-100 text-red-800': !exam.passed
                      }">
                        {{ exam.passed ? 'Bestanden' : 'Nicht bestanden' }}
                      </span>
                      <div class="text-gray-400">
                        <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': expandedExams.has(exam.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <!-- Expanded View -->
                  <div v-if="expandedExams.has(exam.id)" class="border-t border-gray-100 bg-gray-50 p-4">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span class="text-gray-500">Prüfer:</span>
                        <span class="ml-2 text-gray-900" :class="{
                          'text-gray-500': exam.examiner_name === 'Nicht zugewiesen',
                          'text-gray-400': exam.examiner_name === 'Unbekannt'
                        }">
                          {{ exam.examiner_name }}
                        </span>
                      </div>
                      <div>
                        <span class="text-gray-500">Bewertung:</span>
                        <span class="ml-2 text-gray-900 font-medium">
                          <span v-if="exam.score">{{ exam.score }}</span>
                          <span v-else class="text-gray-400">N/A</span>
                        </span>
                      </div>
                    </div>
                    <div v-if="exam.notes" class="mt-3">
                      <div class="text-gray-500 text-sm mb-1">Prüfer-Notizen:</div>
                      <div class="text-sm text-gray-900 bg-white p-3 rounded border">
                        {{ exam.notes }}
                      </div>
                    </div>
                    <div v-else class="mt-3">
                      <div class="text-gray-500 text-sm mb-1">Prüfer-Notizen:</div>
                      <div class="text-sm text-gray-400 italic bg-white p-3 rounded border">
                        Keine Prüfer-Notizen vorhanden
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Mobile Expandable View -->
              <div class="md:hidden space-y-3">
                <div 
                  v-for="exam in selectedCategory?.exams" 
                  :key="exam.id"
                  class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                >
                  <!-- Collapsed View -->
                  <div 
                    class="p-4 cursor-pointer"
                    @click="toggleExamExpansion(exam.id)"
                  >
                    <div class="flex justify-between items-center">
                      <div class="flex-1">
                        <div class="text-sm font-medium text-gray-900 mb-1">
                          {{ formatDate(exam.exam_date) }}
                        </div>
                        <div class="text-sm text-gray-900">
                          {{ exam.student_name }}
                        </div>
                      </div>
                      <div class="flex items-center space-x-3">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" :class="{
                          'bg-green-100 text-green-800': exam.passed,
                          'bg-red-100 text-red-800': !exam.passed
                        }">
                          {{ exam.passed ? 'Bestanden' : 'Nicht bestanden' }}
                        </span>
                        <div class="text-gray-400">
                          <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': expandedExams.has(exam.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Expanded View -->
                  <div v-if="expandedExams.has(exam.id)" class="border-t border-gray-100 bg-gray-50 p-4">
                    <div class="space-y-3 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-500">Prüfer:</span>
                        <span class="text-gray-900" :class="{
                          'text-gray-500': exam.examiner_name === 'Nicht zugewiesen',
                          'text-gray-400': exam.examiner_name === 'Unbekannt'
                        }">
                          {{ exam.examiner_name }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-500">Bewertung:</span>
                        <span class="text-gray-900 font-medium">
                          <span v-if="exam.score">{{ exam.score }}</span>
                          <span v-else class="text-gray-400">N/A</span>
                        </span>
                      </div>
                    </div>
                    
                    <div v-if="exam.notes" class="mt-3">
                      <div class="text-xs text-gray-500 mb-1">Prüfer-Notizen:</div>
                      <div class="text-sm text-gray-900 bg-white p-3 rounded border">
                        {{ exam.notes }}
                      </div>
                    </div>
                    <div v-else class="mt-3">
                      <div class="text-xs text-gray-500 mb-1">Prüfer-Notizen:</div>
                      <div class="text-sm text-gray-400 italic bg-white p-3 rounded border">
                        Keine Prüfer-Notizen vorhanden
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Props {
  currentUser: any
}

interface ExamResult {
  id: string
  exam_date: string
  category: string
  student_name: string
  examiner_name: string
  passed: boolean
  score?: number
  notes?: string
  staff_id: string
}

interface CategoryStats {
  category: string
  total: number
  passed: number
  failed: number
  successRate: number
  examiners: ExaminerStats[]
  exams: ExamResult[]
}

interface ExaminerStats {
  name: string
  total: number
  passed: number
  failed: number
  successRate: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const examResults = ref<ExamResult[]>([])
const showDetailsModal = ref(false)
const selectedCategory = ref<CategoryStats | null>(null)
const expandedExams = ref<Set<string>>(new Set())

// Computed
const staffName = computed(() => {
  return `${props.currentUser?.first_name || ''} ${props.currentUser?.last_name || ''}`.trim()
})

const totalExams = computed(() => examResults.value.length)

const passedExams = computed(() => examResults.value.filter(exam => exam.passed).length)

const successRate = computed(() => {
  if (totalExams.value === 0) return 0
  return Math.round((passedExams.value / totalExams.value) * 100)
})

const categoryStats = computed(() => {
  const categories = new Map<string, CategoryStats>()
  
  examResults.value.forEach(exam => {
    if (!categories.has(exam.category)) {
      categories.set(exam.category, {
        category: exam.category,
        total: 0,
        passed: 0,
        failed: 0,
        successRate: 0,
        examiners: [],
        exams: []
      })
    }
    
    const category = categories.get(exam.category)!
    category.total++
    category.exams.push(exam)
    
    if (exam.passed) {
      category.passed++
    } else {
      category.failed++
    }
  })
  
  // Calculate success rates and examiner stats
  categories.forEach(category => {
    category.successRate = category.total > 0 ? Math.round((category.passed / category.total) * 100) : 0
    
    // Group by examiner (only for assigned examiners)
    const examiners = new Map<string, ExaminerStats>()
    category.exams.forEach(exam => {
      // Only include assigned examiners, skip "Nicht zugewiesen" and "Unbekannt"
      if (exam.examiner_name && exam.examiner_name !== 'Nicht zugewiesen' && exam.examiner_name !== 'Unbekannt') {
        if (!examiners.has(exam.examiner_name)) {
          examiners.set(exam.examiner_name, {
            name: exam.examiner_name,
            total: 0,
            passed: 0,
            failed: 0,
            successRate: 0
          })
        }
        
        const examiner = examiners.get(exam.examiner_name)!
        examiner.total++
        if (exam.passed) {
          examiner.passed++
        } else {
          examiner.failed++
        }
      }
    })
    
    // Calculate examiner success rates
    examiners.forEach(examiner => {
      examiner.successRate = examiner.total > 0 ? Math.round((examiner.passed / examiner.total) * 100) : 0
    })
    
    category.examiners = Array.from(examiners.values()).sort((a, b) => b.total - a.total)
  })
  
  return Array.from(categories.values()).sort((a, b) => b.total - a.total)
})


// Methods
const loadExamResults = async () => {
  if (!props.currentUser?.id) return
  
  isLoading.value = true
  error.value = null
  
  try {
    const supabase = getSupabase()
    
    // First, get all appointments for this staff member
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, title, type, start_time, user_id')
      .eq('staff_id', props.currentUser.id)
      .not('status', 'is', null)
    
    if (appointmentsError) throw appointmentsError
    
    // Then get exam results for these appointments
    const appointmentIds = appointments?.map(apt => apt.id) || []
    
    if (appointmentIds.length === 0) {
      examResults.value = []
      console.log('✅ No appointments found for staff member')
      return
    }
    
    const { data: examResultsData, error: examError } = await supabase
      .from('exam_results')
      .select(`
        id,
        exam_date,
        passed,
        examiner_behavior_rating,
        examiner_behavior_notes,
        appointment_id,
        examiner_id
      `)
      .in('appointment_id', appointmentIds)
      .order('exam_date', { ascending: false })
    
    if (examError) throw examError
    
    // Get student names
    const studentIds = [...new Set(appointments?.map(apt => apt.user_id).filter(Boolean) || [])]
    let students: any[] = []
    
    if (studentIds.length > 0) {
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', studentIds)
      
      if (studentsError) throw studentsError
      students = studentsData || []
    }
    
    // Get examiner names (only for non-null examiner_ids)
    const examinerIds = [...new Set(examResultsData?.map(exam => exam.examiner_id).filter(Boolean) || [])]
    let examiners: any[] = []
    
    if (examinerIds.length > 0) {
      const { data: examinersData, error: examinersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', examinerIds)
      
      if (examinersError) throw examinersError
      examiners = examinersData || []
    }
    
    // Combine the data
    examResults.value = (examResultsData || []).map((exam: any) => {
      const appointment = appointments?.find(apt => apt.id === exam.appointment_id)
      const student = students.find(stu => stu.id === appointment?.user_id)
      const examiner = examiners.find(exp => exp.id === exam.examiner_id)
      
      return {
        id: exam.id,
        exam_date: exam.exam_date,
        category: appointment?.type || 'Unbekannt',
        student_name: student ? 
          `${student.first_name || ''} ${student.last_name || ''}`.trim() : 
          'Unbekannt',
        examiner_name: examiner ? 
          `${examiner.first_name || ''} ${examiner.last_name || ''}`.trim() : 
          (exam.examiner_id ? 'Unbekannt' : 'Nicht zugewiesen'),
        passed: exam.passed,
        score: exam.examiner_behavior_rating,
        notes: exam.examiner_behavior_notes,
        staff_id: props.currentUser.id
      }
    })
    
    console.log('✅ Exam results loaded:', examResults.value.length)
    
  } catch (err: any) {
    console.error('❌ Error loading exam results:', err)
    error.value = `Fehler beim Laden der Prüfungsergebnisse: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

const showCategoryDetails = (category: CategoryStats) => {
  selectedCategory.value = category
  showDetailsModal.value = true
}

const toggleExamExpansion = (examId: string) => {
  if (expandedExams.value.has(examId)) {
    expandedExams.value.delete(examId)
  } else {
    expandedExams.value.add(examId)
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadExamResults()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Smooth transitions */
.transition-shadow {
  transition: box-shadow 0.2s ease-in-out;
}
</style>
