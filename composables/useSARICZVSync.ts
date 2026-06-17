/**
 * useSARICZVSync – Frontend Composable für SARI CZV/FL Integration
 *
 * Zuständig für:
 * - Einstellungen speichern und laden
 * - Verbindungstest
 * - Kurstypen laden (getCourseTypes)
 * - Moderatoren laden (getLecturers)
 * - Kurs melden (startImport)
 * - Kurs löschen (deleteCourse)
 * - Bestätigung generieren (genConfirmation)
 */

import type { SARICzvCourseType } from '~/utils/sariCoursesV3Client'

export interface SARICZVSettings {
  // CZV
  sari_czv_enabled: boolean
  sari_czv_environment: 'test' | 'production'
  sari_czv_client_id: string
  sari_czv_client_secret: string
  sari_czv_username: string
  sari_czv_password: string
  sari_czv_registration_id: string
  // FL
  sari_fl_enabled: boolean
  sari_fl_environment: 'test' | 'production'
  sari_fl_client_id: string
  sari_fl_client_secret: string
  sari_fl_username: string
  sari_fl_password: string
  sari_fl_registration_id: string
}

export interface SARILecturer {
  FaberId: string
  Name: string
  Prename: string
  Birthdate: string
  SariId: string
  LecturerId: string
}

export interface SARICourseTypeItem {
  Name: string
  Description: { DE: string; FR: string; IT: string }
  From: string
  To: string
  MaxMembers: number
}

export function useSARICZVSync() {
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isTesting = ref(false)
  const connectionMessage = ref<string | null>(null)
  const connectionSuccess = ref(false)
  const operationResult = ref<{ success: boolean; message: string } | null>(null)

  const settings = ref<SARICZVSettings>({
    sari_czv_enabled: false,
    sari_czv_environment: 'test',
    sari_czv_client_id: '',
    sari_czv_client_secret: '',
    sari_czv_username: '',
    sari_czv_password: '',
    sari_czv_registration_id: '',
    sari_fl_enabled: false,
    sari_fl_environment: 'test',
    sari_fl_client_id: '',
    sari_fl_client_secret: '',
    sari_fl_username: '',
    sari_fl_password: '',
    sari_fl_registration_id: ''
  })

  const lecturers = ref<SARILecturer[]>([])
  const courseTypes = ref<SARICourseTypeItem[]>([])

  // ─── Settings ────────────────────────────────────────────────────────────

  const saveSettings = async () => {
    try {
      isSaving.value = true
      connectionMessage.value = null

      const response = await fetch('/api/sari/czv/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.value)
      })

      if (!response.ok) {
        const error = await response.json()
        connectionSuccess.value = false
        connectionMessage.value = `Fehler: ${error.statusMessage || 'Fehler beim Speichern'}`
        return false
      }

      connectionSuccess.value = true
      connectionMessage.value = 'Einstellungen erfolgreich gespeichert'
      setTimeout(() => { connectionMessage.value = null }, 3000)
      return true
    } catch (error: any) {
      connectionSuccess.value = false
      connectionMessage.value = `Fehler: ${error.message}`
      return false
    } finally {
      isSaving.value = false
    }
  }

  // ─── Verbindungstest ─────────────────────────────────────────────────────

  const testConnection = async (type: SARICzvCourseType) => {
    try {
      isTesting.value = true
      connectionMessage.value = null

      const isCZV = type !== 'FL'
      const prefix = isCZV ? 'czv' : 'fl'

      const credentials = {
        environment: settings.value[`sari_${prefix}_environment` as keyof SARICZVSettings],
        clientId: (settings.value[`sari_${prefix}_client_id` as keyof SARICZVSettings] as string)?.trim(),
        clientSecret: (settings.value[`sari_${prefix}_client_secret` as keyof SARICZVSettings] as string)?.trim(),
        username: (settings.value[`sari_${prefix}_username` as keyof SARICZVSettings] as string)?.trim(),
        password: (settings.value[`sari_${prefix}_password` as keyof SARICZVSettings] as string)?.trim(),
        registrationId: (settings.value[`sari_${prefix}_registration_id` as keyof SARICZVSettings] as string)?.trim()
      }

      const response = await fetch('/api/sari/czv/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      })

      if (!response.ok) {
        const error = await response.json()
        connectionSuccess.value = false
        connectionMessage.value = `Verbindung fehlgeschlagen: ${error.statusMessage}`
        return false
      }

      const data = await response.json()
      connectionSuccess.value = true
      connectionMessage.value = `✅ ${data.message}`
      return true
    } catch (error: any) {
      connectionSuccess.value = false
      connectionMessage.value = `Fehler: ${error.message}`
      return false
    } finally {
      isTesting.value = false
    }
  }

  // ─── Kurstypen laden ──────────────────────────────────────────────────────

  const loadCourseTypes = async (type: SARICzvCourseType) => {
    try {
      isLoading.value = true
      const response = await fetch('/api/sari/czv/get-course-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, environment: type === 'FL' ? settings.value.sari_fl_environment : settings.value.sari_czv_environment })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.statusMessage || 'Fehler beim Laden der Kurstypen')
      }

      const data = await response.json()
      courseTypes.value = data.courseTypes || []
      return courseTypes.value
    } finally {
      isLoading.value = false
    }
  }

  // ─── Moderatoren laden ────────────────────────────────────────────────────

  const loadLecturers = async (type: SARICzvCourseType) => {
    try {
      isLoading.value = true
      const response = await fetch('/api/sari/czv/get-lecturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, environment: type === 'FL' ? settings.value.sari_fl_environment : settings.value.sari_czv_environment })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.statusMessage || 'Fehler beim Laden der Moderatoren')
      }

      const data = await response.json()
      lecturers.value = data.lecturers || []
      return lecturers.value
    } finally {
      isLoading.value = false
    }
  }

  // ─── Kurs zu SARI melden ──────────────────────────────────────────────────

  const importCourse = async (
    type: SARICzvCourseType,
    courseId: string,
    courseData: {
      description: string
      date: string
      sariCourseType: string
      location: string
      address: string
      zip: string
      comment?: string
      members: Array<{ licenseId: string; birthdate: string; registrationDate: string }>
      instructors: Array<{ sariId: string; licenseId: string; isMaster: boolean }>
    }
  ) => {
    try {
      isLoading.value = true
      operationResult.value = null

      const response = await fetch('/api/sari/czv/start-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          environment: type === 'FL' ? settings.value.sari_fl_environment : settings.value.sari_czv_environment,
          courseId,
          courseData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        operationResult.value = { success: false, message: data.statusMessage || 'Import fehlgeschlagen' }
        return null
      }

      operationResult.value = { success: true, message: data.message }
      return data
    } finally {
      isLoading.value = false
    }
  }

  // ─── Kurs bei SARI löschen ────────────────────────────────────────────────

  const deleteCourse = async (
    type: SARICzvCourseType,
    courseId: string,
    courseDate: string
  ) => {
    try {
      isLoading.value = true
      operationResult.value = null

      const response = await fetch('/api/sari/czv/delete-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          environment: type === 'FL' ? settings.value.sari_fl_environment : settings.value.sari_czv_environment,
          courseId,
          courseDate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        operationResult.value = { success: false, message: data.statusMessage || 'Löschen fehlgeschlagen' }
        return false
      }

      operationResult.value = { success: true, message: data.message }
      return true
    } finally {
      isLoading.value = false
    }
  }

  // ─── Bestätigung generieren ───────────────────────────────────────────────

  const generateConfirmation = async (
    type: SARICzvCourseType,
    courseId: string,
    allIds: boolean = true
  ) => {
    try {
      isLoading.value = true
      operationResult.value = null

      const response = await fetch('/api/sari/czv/gen-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          environment: type === 'FL' ? settings.value.sari_fl_environment : settings.value.sari_czv_environment,
          courseId,
          allIds
        })
      })

      const data = await response.json()

      if (!response.ok) {
        operationResult.value = { success: false, message: data.statusMessage || 'Bestätigung fehlgeschlagen' }
        return null
      }

      operationResult.value = {
        success: true,
        message: `${data.count} Bestätigung(en) generiert.`
      }
      return data
    } finally {
      isLoading.value = false
    }
  }

  return {
    settings,
    isLoading,
    isSaving,
    isTesting,
    connectionMessage,
    connectionSuccess,
    operationResult,
    lecturers,
    courseTypes,
    saveSettings,
    testConnection,
    loadCourseTypes,
    loadLecturers,
    importCourse,
    deleteCourse,
    generateConfirmation
  }
}
