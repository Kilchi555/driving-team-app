// composables/useEventModalWatchers.ts - SIMPLIFIED VERSION
import { watch, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useEventModalWatchers = (
  props: any,
  formData: any,
  selectedStudent: any,
  selectedLocation: any,
  availableLocations: any,
  appointmentNumber: any,
  actions: any
) => {

  // ============ HELPER FUNCTIONS ============
  const calculateEndTime = () => {
    if (formData.value.startTime && formData.value.duration_minutes) {
      const [hours, minutes] = formData.value.startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0, 0)

      const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)

      const endHours = String(endDate.getHours()).padStart(2, '0')
      const endMinutes = String(endDate.getMinutes()).padStart(2, '0')

      formData.value.endTime = `${endHours}:${endMinutes}`
      console.log('⏰ End time calculated:', formData.value.endTime)
    }
  }

  // 🔥 LOCAL appointment number function
  const getAppointmentNumber = async (studentId: string): Promise<number> => {
    try {
      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', studentId)
        .in('status', ['completed', 'confirmed'])

      if (error) throw error
      return (count || 0) + 1

    } catch (err) {
      console.error('❌ Error counting appointments:', err)
      return 1
    }
  }

        // ============ MODAL LIFECYCLE WATCHER ============
          const setupModalWatcher = () => {
            watch(() => props.isVisible, async (isVisible) => {
              console.log('👀 Modal visibility changed to:', isVisible)
              
              if (isVisible) {
                console.log('🔄 Modal opening - starting initialization...')
                
                try {
                  // Mode-based initialization
                  if (props.eventData && (props.mode === 'edit' || props.mode === 'view')) {
                    console.log('📝 Processing EDIT/VIEW mode...')
                    actions.populateFormFromAppointment(props.eventData)
                    
                    // Handle student selection for edit mode
                    if (formData.value.user_id) {
                      await handleEditModeStudentSelection()
                    }
                  } else if (props.mode === 'create') {  // 🔥 WICHTIG: else if statt else!
                    console.log('📅 Processing CREATE mode...')
                    await handleCreateModeInitialization()
                  }
                  
                  console.log('✅ Modal initialization completed')
                  
                } catch (error: unknown) {
                  console.error('❌ Error during modal initialization:', error)
                }
              } else {
                // Modal closed - reset state
                console.log('❌ Modal closed - resetting state')
                actions.resetForm()
              }
            }, { immediate: true })
          }

  // ============ FORM DATA WATCHERS ============
  const setupFormWatchers = () => {

    // Title generation watcher
    watch([
      () => selectedStudent.value,
      () => formData.value.location_id,
      () => formData.value.type,
      () => formData.value.eventType,
    ], ([currentStudent, locationId, category, eventType]) => {

      // Skip title generation in edit/view mode
      if (props.mode === 'edit' || props.mode === 'view') {
        return
      }

      if (eventType === 'lesson' && currentStudent) {
        generateLessonTitle(currentStudent, locationId, category)
      }
    }, { immediate: true })

    // 🔥 NEW: Auto-load students when needed
    watch(() => props.mode, (newMode) => {
      if (newMode === 'create') {
        console.log('🔄 Create mode detected - triggering student load')
        // Trigger student loading for create mode
        if (actions.triggerStudentLoad) {
          actions.triggerStudentLoad()
        }
      }
    }, { immediate: true })

    // 🔥 NEW: Auto-reload students when student is cleared
    watch(selectedStudent, (newStudent, oldStudent) => {
      if (oldStudent && !newStudent) {
        console.log('🔄 Student cleared - triggering student reload')
        // Trigger student loading when student is cleared
        if (actions.triggerStudentLoad) {
          actions.triggerStudentLoad()
        }
      }
    })

    // Time calculation watcher
    watch([
      () => formData.value.startTime,
      () => formData.value.duration_minutes
    ], () => {
      if (formData.value.startTime && formData.value.duration_minutes) {
        calculateEndTime()
      }
    }, { immediate: true })

    // Event type change watcher
    watch(() => formData.value.eventType, (newType) => {
      console.log('👀 Event type changed to:', newType)

      // Reset form when switching types
      if (newType !== 'lesson') {
        formData.value.user_id = ''
        formData.value.type = ''
        selectedStudent.value = null
      }
    })

    // User ID change watcher (for appointment number)
    watch(() => formData.value.user_id, async (newUserId) => {
      // Skip in edit/view mode
      if (props.mode === 'edit' || props.mode === 'view') {
        console.log(`📝 ${props.mode} mode detected - skipping auto-operations`)
        return
      }

      if (newUserId && formData.value.eventType === 'lesson') {
        // Load appointment number for pricing
        try {
          console.log('🔢 Loading appointment number for pricing...')
          appointmentNumber.value = await getAppointmentNumber(newUserId)
          console.log('✅ Appointment number loaded:', appointmentNumber.value)
        } catch (err) {
          console.error('❌ Error loading appointment number:', err)
          appointmentNumber.value = 1
        }
      } else if (!newUserId) {
        appointmentNumber.value = 1
        console.log('🔄 Reset appointment number to 1')
      }
    })

    // Category type watcher
    watch(() => formData.value.type, async (newType) => {
      if (newType && props.mode === 'edit') {
        console.log('👀 Category type changed in edit mode:', newType)

        // Force category update in edit mode
        await nextTick()
      }
    }, { immediate: true })

    // Duration change watcher
    watch(() => formData.value.duration_minutes, () => {
      calculateEndTime()
    })
  }

  // ============ DEBUG WATCHERS ============
  const setupDebugWatchers = () => {
    // Location debugging
    watch(() => formData.value.location_id, (newVal, oldVal) => {
      console.log('🔄 location_id changed:', oldVal, '→', newVal)
    })

    // Selected student debugging
    watch(selectedStudent, (newStudent, oldStudent) => {
      console.log('🔄 selectedStudent changed:', 
        oldStudent?.first_name || 'none', 
        '→', 
        newStudent?.first_name || 'none'
      )
    })
  }

  // ============ HELPER FUNCTIONS ============
  const handleEditModeStudentSelection = async () => {
    console.log('📝 Setting up student for edit mode:', formData.value.user_id)
    
    // This would typically trigger the StudentSelector to select the correct student
    // The implementation depends on how your StudentSelector handles programmatic selection
    
    // Example: You might need to emit to parent or use a ref to StudentSelector
    // to call selectStudentById(formData.value.user_id)
  }

  const handleCreateModeInitialization = async () => {
    // Initialize create mode with default values
    let startDate, startTime

    if (props.eventData?.start) {
      const clickedDateTime = new Date(props.eventData.start)
      startDate = clickedDateTime.toISOString().split('T')[0]
      startTime = clickedDateTime.toTimeString().slice(0, 5)
    } else {
      const now = new Date()
      startDate = now.toISOString().split('T')[0]
      startTime = now.toTimeString().slice(0, 5)
    }

    formData.value.startDate = startDate
    formData.value.startTime = startTime

    console.log('📅 Create mode initialized with date/time:', startDate, startTime)
    
    // Calculate end time immediately
    if (formData.value.duration_minutes) {
      calculateEndTime()
    }
  }

  const generateLessonTitle = (currentStudent: any, locationId: string, category: string) => {
    // Safety check for availableLocations
    const selectedLocationObject = Array.isArray(availableLocations.value) && availableLocations.value.length > 0
      ? availableLocations.value.find((loc: any) => loc.id === locationId)
      : null

    const locationName = selectedLocationObject?.name || ''
    const currentCategory = category || ''

    let title = 'Fahrstunde' // Default title

    if (currentStudent?.first_name) {
      title = `${currentStudent.first_name}`
    }

    if (locationName) {
      title += ` • ${locationName}`
    }

    if (currentCategory) {
      title += ` (${currentCategory})`
    }

    console.log('✏️ Title generated:', title)
    formData.value.title = title
  }

  // ============ PUBLIC API ============
  const setupAllWatchers = () => {
    setupModalWatcher()
    setupFormWatchers()
    setupDebugWatchers()

    console.log('⚡ All watchers initialized (simplified version)')
  }

  return {
    setupAllWatchers,
    setupModalWatcher,
    setupFormWatchers,
    setupDebugWatchers,
    calculateEndTime,
    getAppointmentNumber,
    generateLessonTitle
  }
}