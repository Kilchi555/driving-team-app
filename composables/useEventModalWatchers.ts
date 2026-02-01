// composables/useEventModalWatchers.ts - MIGRIERT ZU APIS
import { watch, nextTick, type Ref } from 'vue'
import { usePricing } from '~/composables/usePricing'
import { logger } from '~/utils/logger'

interface EventModalWatchersParams {
  formData: Ref<any>
  selectedStudent: Ref<any>
  selectedCategory: Ref<any>
  dynamicPricing: Ref<any>
  isLoading: Ref<boolean>
  appointmentNumber: Ref<number>
  calculateEndTime: () => void
  props: {
    mode: 'create' | 'edit' | 'view'
    eventData?: any
    isOpen?: boolean
  }
}

export const useEventModalWatchers = ({
  formData,
  selectedStudent,
  selectedCategory,
  dynamicPricing,
  isLoading,
  appointmentNumber,
  calculateEndTime,
  props
}: EventModalWatchersParams) => {

  // ✅ GET APPOINTMENT NUMBER HELPER - MIGRATED TO API
  const getAppointmentNumber = async (userId: string): Promise<number> => {
    try {
      // ✅ MIGRATED TO API
      const response = await $fetch('/api/appointments/get-next-number', {
        method: 'GET',
        query: { user_id: userId }
      }) as any

      if (!response?.success || response?.number === undefined) {
        logger.warn('Failed to get appointment number from API, defaulting to 1')
        return 1
      }

      return response.number
    } catch (error) {
      logger.error('❌ Error getting appointment number from API:', error)
      return 1
    }
  }
      console.error('❌ Error in getAppointmentCount:', error)
      return 1
    }
  }

  // ✅ REACTIVE PRICE CALCULATION WATCHER
  const setupPriceWatcher = () => {
    watch([
      () => formData.value.duration_minutes,
      () => formData.value.type,
      () => formData.value.user_id
    ], async ([newDuration, newCategory, newUserId], [oldDuration, oldCategory, oldUserId]) => {
      
      // Skip if in view mode or during initialization
      if (props.mode === 'view' || isLoading.value) {
        logger.debug('🚫 Price recalculation skipped - view mode or loading')
        return
      }

      // Skip if no essential data
      if (!newCategory || !newDuration || formData.value.eventType !== 'lesson') {
        logger.debug('🚫 Price recalculation skipped - missing data')
        return
      }

      // Check if any relevant value actually changed
      const durationChanged = newDuration !== oldDuration
      const categoryChanged = newCategory !== oldCategory
      const userChanged = newUserId !== oldUserId

      if (!durationChanged && !categoryChanged && !userChanged) {
        logger.debug('🚫 Price recalculation skipped - no relevant changes')
        return
      }

      logger.debug('💰 Recalculating price due to changes:', {
        durationChanged: durationChanged ? `${oldDuration}min → ${newDuration}min` : false,
        categoryChanged: categoryChanged ? `${oldCategory} → ${newCategory}` : false,
        userChanged: userChanged ? `${oldUserId} → ${newUserId}` : false
      })

      try {
        // Load pricing composable - only load once on mount
        const { calculatePrice, loadPricingRules } = usePricing()
        
        // Load pricing rules ONLY IF NOT ALREADY CACHED
        // This prevents unnecessary re-loads on every watcher trigger
        const pricingRules = await loadPricingRules()
        
        // Calculate new price
        const priceResult = await calculatePrice(
          newCategory,
          newDuration,
          newUserId || undefined
        )

        // Update dynamic pricing
        dynamicPricing.value = {
          pricePerMinute: priceResult.base_price_rappen / newDuration / 100,
          adminFeeChf: parseFloat(priceResult.admin_fee_chf),
          appointmentNumber: priceResult.appointment_number,
          hasAdminFee: priceResult.admin_fee_rappen > 0,
          totalPriceChf: priceResult.total_chf,
          category: newCategory,
          duration: newDuration,
          isLoading: false,
          error: ''
        }

        // Also update form data for fallback
        formData.value.price_per_minute = dynamicPricing.value.pricePerMinute

        logger.debug('✅ Price recalculated:', {
          duration: `${newDuration}min`,
          basePrice: priceResult.base_price_chf,
          adminFee: priceResult.admin_fee_chf,
          totalPrice: priceResult.total_chf,
          appointmentNumber: priceResult.appointment_number
        })

      } catch (error: any) {
        console.error('❌ Error recalculating price:', error)
        
        // Update dynamic pricing with error state
        dynamicPricing.value = {
          ...dynamicPricing.value,
          isLoading: false,
          error: error?.message || 'Fehler bei Preisberechnung'
        }
        
        // Fallback to static pricing if dynamic fails
        const fallbackPrices: Record<string, number> = {
          'B': 95/45, 'A1': 95/45, 'BE': 120/45, 'C1': 150/45, 
          'D1': 150/45, 'C': 170/45, 'CE': 200/45, 'D': 200/45, 
          'BPT': 100/45, 'Motorboot': 95/45
        }
        
        formData.value.price_per_minute = fallbackPrices[newCategory] || 95/45
        logger.debug('⚠️ Using fallback price due to calculation error')
      }
      
    }, { immediate: false, deep: false })
  }

  // ✅ TIME CHANGE WATCHER
  const setupTimeWatcher = () => {
    watch([
      () => formData.value.startTime,
      () => formData.value.endTime
    ], ([newStartTime, newEndTime], [oldStartTime, oldEndTime]) => {
      
      if (!newStartTime || !newEndTime) return
      
      // Calculate duration from time change
      const startTime = new Date(`1970-01-01T${newStartTime}:00`)
      const endTime = new Date(`1970-01-01T${newEndTime}:00`)
      
      // Handle day overflow (end time next day)
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1)
      }
      
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      
      // Update duration if it changed due to time modification
      if (durationMinutes > 0 && durationMinutes !== formData.value.duration_minutes) {
        logger.debug('⏰ Duration changed via time selector:', 
          `${formData.value.duration_minutes}min → ${durationMinutes}min`)
        
        formData.value.duration_minutes = durationMinutes
        
        // The duration watcher above will automatically trigger price recalculation
      }
      
    })
  }

  // ✅ STANDARD WATCHERS (unchanged)
  const setupStandardWatchers = () => {
    // Time calculation watcher
    watch([
      () => formData.value.startTime,
      () => formData.value.duration_minutes
    ], () => {
      if (formData.value.startTime && formData.value.duration_minutes) {
        calculateEndTime()
      }
    })

    // Event type change watcher
    watch(() => formData.value.eventType, (newType) => {
      logger.debug('👀 Event type changed to:', newType)

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
        logger.debug(`📝 ${props.mode} mode detected - skipping auto-operations`)
        return
      }

      if (newUserId && formData.value.eventType === 'lesson') {
        // Load appointment number for pricing
        try {
          logger.debug('🔢 Loading appointment number for pricing...')
          appointmentNumber.value = await getAppointmentNumber(newUserId)
          logger.debug('✅ Appointment number loaded:', appointmentNumber.value)
        } catch (err) {
          console.error('❌ Error loading appointment number:', err)
          appointmentNumber.value = 1
        }
      } else if (!newUserId) {
        appointmentNumber.value = 1
        logger.debug('🔄 Reset appointment number to 1')
      }
    })

    

    // Category type watcher
    watch(() => formData.value.type, async (newType) => {
      if (newType && props.mode === 'edit') {
        logger.debug('👀 Category type changed in edit mode:', newType)
        await nextTick()
      }
    }, { immediate: true })
  }

  // ✅ DEBUG WATCHERS
  const setupDebugWatchers = () => {
    // Location debugging
    watch(() => formData.value.location_id, (newVal, oldVal) => {
      logger.debug('🔄 location_id changed:', oldVal, '→', newVal)
    })

    // Selected student debugging
    watch(selectedStudent, (newStudent, oldStudent) => {
      logger.debug('🔄 selectedStudent changed:', 
        oldStudent?.first_name || 'none', 
        '→', 
        newStudent?.first_name || 'none'
      )
    })

    // Dynamic pricing debugging
    watch(dynamicPricing, (newPricing, oldPricing) => {
      logger.debug('💰 dynamicPricing changed:', {
        oldTotal: oldPricing?.totalPriceChf,
        newTotal: newPricing?.totalPriceChf,
        hasAdminFee: newPricing?.hasAdminFee
      })
    }, { deep: true })
  }

  // ✅ SETUP ALL WATCHERS
  const setupAllWatchers = () => {
    setupPriceWatcher()
    setupTimeWatcher() 
    setupStandardWatchers()
    setupDebugWatchers()
    
    logger.debug('⚡ All enhanced watchers initialized with price reactivity')
  }

  return {
    setupAllWatchers,
    setupPriceWatcher,
    setupTimeWatcher,
    setupStandardWatchers,
    setupDebugWatchers,
    getAppointmentNumber
  }
}