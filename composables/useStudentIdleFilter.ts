import { ref } from 'vue'
import { logger } from '~/utils/logger'
import {
  compareByLastAppointmentOldestFirst,
  filterIdleStudents,
  STUDENT_IDLE_FILTER_OPTIONS,
  type StudentAppointmentActivity,
  type StudentIdleFilter
} from '~/utils/student-appointment-activity'
import type { StudentExamInfo } from '~/utils/student-exam'

export function useStudentIdleFilter() {
  const idleFilter = ref<StudentIdleFilter>('all')
  const activityById = ref<Record<string, StudentAppointmentActivity>>({})
  const activityLoaded = ref(false)

  const loadAppointmentActivity = async (studentIds: string[]) => {
    if (!studentIds.length) {
      activityById.value = {}
      activityLoaded.value = true
      return
    }

    try {
      const response = await $fetch('/api/admin/get-students-appointment-activity', {
        method: 'POST',
        body: { studentIds }
      }) as { success?: boolean, data?: Record<string, StudentAppointmentActivity> }

      activityById.value = response?.success && response.data ? response.data : {}
      activityLoaded.value = true
    } catch (err) {
      logger.warn('⚠️ Failed to load student appointment activity:', err)
      activityById.value = {}
      activityLoaded.value = false
    }
  }

  const applyIdleFilter = <T extends StudentExamInfo & { id: string }>(students: T[]): T[] => {
    if (idleFilter.value === 'all') return students
    if (!activityLoaded.value) return students

    const filtered = filterIdleStudents(students, activityById.value, idleFilter.value)
    return filtered.slice().sort((a, b) =>
      compareByLastAppointmentOldestFirst(activityById.value[a.id], activityById.value[b.id])
    )
  }

  const lastLessonFor = (studentId: string): string | null => {
    return activityById.value[studentId]?.lastStartTime || null
  }

  return {
    idleFilter,
    activityById,
    activityLoaded,
    idleFilterOptions: STUDENT_IDLE_FILTER_OPTIONS,
    loadAppointmentActivity,
    applyIdleFilter,
    lastLessonFor
  }
}
