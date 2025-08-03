// composables/useEventModalWatchers.ts - KORRIGIERTE VERSION
import { watch, nextTick, type Ref } from 'vue'
import { usePricing } from '~/composables/usePricing'
import { getSupabase } from '~/utils/supabase'

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

  // ✅ GET APPOINTMENT NUMBER HELPER
  const getAppointmentNumber = async (userId: string): Promise<number> => {
    try {
      const supabase = getSupabase()
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['completed', 'confirmed'])

      if (error) {
        console.error('❌ Error counting appointments:', error)
        return 1
      }

      return (count || 0) + 1
    } catch (error) {
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
        console.log('🚫 Price recalculation skipped - view mode or loading')
        return
      }

      // Skip if no essential data
      if (!newCategory || !newDuration || formData.value.eventType !== 'lesson') {
        console.log('🚫 Price recalculation skipped - missing data')
        return
      }

      // Check if any relevant value actually changed
      const durationChanged = newDuration !== oldDuration
      const categoryChanged = newCategory !== oldCategory
      const userChanged = newUserId !== oldUserId

      if (!durationChanged && !categoryChanged && !userChanged) {
        console.log('🚫 Price recalculation skipped - no relevant changes')
        return
      }

      console.log('💰 Recalculating price due to changes:', {
        durationChanged: durationChanged ? `${oldDuration}min → ${newDuration}min` : false,
        categoryChanged: categoryChanged ? `${oldCategory} → ${newCategory}` : false,
        userChanged: userChanged ? `${oldUserId} → ${newUserId}` : false
      })

      try {
        // Load pricing composable
        const { calculatePrice, loadPricingRules } = usePricing()
        
        // Ensure pricing rules are loaded
        await loadPricingRules()
        
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

        console.log('✅ Price recalculated:', {
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
        console.log('⚠️ Using fallback price due to calculation error')
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
        console.log('⏰ Duration changed via time selector:', 
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
        await nextTick()
      }
    }, { immediate: true })
  }

  // ✅ DEBUG WATCHERS
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

    // Dynamic pricing debugging
    watch(dynamicPricing, (newPricing, oldPricing) => {
      console.log('💰 dynamicPricing changed:', {
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
    
    console.log('⚡ All enhanced watchers initialized with price reactivity')
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