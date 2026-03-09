<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-x-0 bottom-0 top-16 z-50 flex items-start justify-center p-4 pt-6 overflow-y-auto"
        @click.self="close"
      >
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10" @click="close" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto animate-scale-in">

          <!-- Close Button -->
          <button
            @click="close"
            class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition shadow"
          >
            ✕
          </button>

          <!-- Step 1: Course Picker -->
          <div v-if="!selectedCourse" class="p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-2">Kurs auswählen</h2>
            <p class="text-gray-500 text-sm mb-6">Wähle den Kurs aus, für den du dich anmelden möchtest:</p>

            <div class="space-y-3">
              <button
                v-for="course in courses"
                :key="course.id"
                @click="selectCourse(course)"
                class="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition text-left group"
              >
                <span class="text-3xl flex-shrink-0">{{ course.icon }}</span>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 group-hover:text-primary-700">{{ course.label }}</p>
                  <p v-if="course.description" class="text-xs text-gray-500 mt-0.5 truncate">{{ course.description }}</p>
                </div>
                <svg class="w-5 h-5 text-gray-400 group-hover:text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Step 2: Form -->
          <div v-else class="p-6">
            <!-- Back Button -->
            <button
              @click="selectedCourse = null"
              class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Zurück zur Kursauswahl
            </button>

            <!-- Use GeneralInquiryForm for inquiries, CourseRegistrationForm for registrations -->
            <GeneralInquiryForm
              v-if="selectedCourse.formType === 'inquiry'"
              :tenant_id="tenantId"
              mode="general"
              :custom_title="`Anfrage: ${selectedCourse.label}`"
              @submitted="onSubmitted"
            />
            <CourseRegistrationForm
              v-else
              :tenant_id="tenantId"
              :course_type="selectedCourse.courseType"
              :custom_title="`Anmeldung: ${selectedCourse.label}`"
              :custom_description="selectedCourse.description"
              :available_dates="selectedCourse.dates || []"
              :sold_out_dates="selectedCourse.soldOutDates || []"
              :spots_per_date="selectedCourse.spotsPerDate || {}"
              :location="selectedCourse.location"
              :start_time="selectedCourse.start_time"
              @submitted="onSubmitted"
            />
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface CourseOption {
  id: string
  label: string
  description?: string
  icon: string
  courseType: string
  formType?: 'registration' | 'inquiry'
  dates?: string[]
  soldOutDates?: string[]
  spotsPerDate?: Record<string, number> // remaining spots per date label
  location?: string
  start_time?: string
}

const props = defineProps<{
  modelValue: boolean
  tenantId: string
  courses: CourseOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'submitted': [selectedDates?: string[]]
}>()

const selectedCourse = ref<CourseOption | null>(null)

function selectCourse(course: CourseOption) {
  selectedCourse.value = course
}

function close() {
  emit('update:modelValue', false)
  // Reset after transition
  setTimeout(() => {
    selectedCourse.value = null
  }, 300)
}

function onSubmitted(selectedDates?: string[]) {
  emit('submitted', selectedDates)
  setTimeout(() => {
    close()
  }, 3500)
}
</script>

<style scoped>
@keyframes scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.animate-scale-in { animation: scale-in 0.2s ease-out; }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
