// composables/useExternalCalendarSync.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

const lastSyncTime = ref<number>(0)
const isSyncing = ref(false)
const SYNC_COOLDOWN = 5 * 60 * 1000 // 5 Minuten

export const useExternalCalendarSync = () => {
  const supabase = getSupabase()

  const autoSyncCalendars = async (staffId?: string) => {
    // Prüfe Cooldown
    const now = Date.now()
    if (now - lastSyncTime.value < SYNC_COOLDOWN) {
      console.log('⏭️ Skipping calendar sync (last sync less than 5 minutes ago)')
      return { success: true, skipped: true }
    }

    // Prüfe ob bereits ein Sync läuft
    if (isSyncing.value) {
      console.log('⏭️ Calendar sync already in progress')
      return { success: true, skipped: true }
    }

    try {
      isSyncing.value = true
      console.log('🔄 Auto-syncing external calendars...')

      // Get user ID if not provided
      let userId = staffId
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('⚠️ No authenticated user for calendar sync')
          return { success: false, error: 'Not authenticated' }
        }

        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        userId = userData?.id
      }

      if (!userId) {
        console.log('⚠️ Could not determine user ID for calendar sync')
        return { success: false, error: 'User ID not found' }
      }

      // Get all calendars for this staff
      const { data: calendars, error: calendarsError } = await supabase
        .from('external_calendars')
        .select('id, ics_url, last_sync_at')
        .eq('staff_id', userId)
        .eq('sync_enabled', true)

      if (calendarsError || !calendars || calendars.length === 0) {
        console.log('📅 No calendars to sync')
        return { success: true, calendars: 0 }
      }

      console.log(`📅 Found ${calendars.length} calendars to sync`)

      let syncedCount = 0
      const errors: string[] = []

      // Sync each calendar
      for (const calendar of calendars) {
        try {
          // Prüfe ob dieser Kalender kürzlich gesynct wurde
          if (calendar.last_sync_at) {
            const lastSync = new Date(calendar.last_sync_at).getTime()
            if (now - lastSync < SYNC_COOLDOWN) {
              console.log(`⏭️ Skipping calendar ${calendar.id} (synced ${Math.round((now - lastSync) / 60000)} min ago)`)
              continue
            }
          }

          const response = await $fetch<{ success: boolean, imported_events?: number, message?: string, error?: string }>('/api/external-calendars/sync-ics', {
            method: 'POST',
            body: {
              calendar_id: calendar.id,
              ics_url: calendar.ics_url
            }
          })

          if (response.success) {
            syncedCount++
            console.log(`✅ Synced calendar ${calendar.id}: ${response.imported_events} events`)
          } else {
            errors.push(`Calendar ${calendar.id}: ${response.message}`)
          }
        } catch (err: any) {
          console.error(`❌ Error syncing calendar ${calendar.id}:`, err)
          errors.push(`Calendar ${calendar.id}: ${err.message}`)
        }
      }

      lastSyncTime.value = now
      console.log(`✅ Auto-sync completed: ${syncedCount}/${calendars.length} calendars`)

      return {
        success: true,
        calendars: calendars.length,
        synced: syncedCount,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error: any) {
      console.error('❌ Auto-sync error:', error)
      return { success: false, error: error.message }
    } finally {
      isSyncing.value = false
    }
  }

  const resetSyncCooldown = () => {
    lastSyncTime.value = 0
  }

  return {
    autoSyncCalendars,
    resetSyncCooldown,
    isSyncing
  }
}

