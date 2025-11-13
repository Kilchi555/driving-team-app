import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

const supabase = getSupabase()

export interface CancellationStat {
  reason_id: string
  reason_name: string
  reason_code: string
  count: number
  percentage: number
  last_cancellation: string
  cancellation_type: 'student' | 'staff' | null
}

export interface CancellationStatsData {
  total_cancellations: number
  stats_by_reason: CancellationStat[]
  stats_by_month: Array<{
    month: string
    total: number
    by_reason: Array<{
      reason_name: string
      count: number
    }>
  }>
  recent_cancellations: Array<{
    id: string
    title: string
    start_time: string
    reason_name: string
    cancelled_by: string
    cancelled_at: string
    medical_certificate_url?: string | null
    medical_certificate_status?: string | null
  }>
}

export const useCancellationStats = () => {
  const stats = ref<CancellationStatsData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Lade Absage-Statistiken
  const fetchCancellationStats = async (dateRange?: { from: string; to: string }) => {
    try {
      isLoading.value = true
      error.value = null

      // Get current user's tenant_id
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      const tenantId = userProfile?.tenant_id
      
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      console.log('🔍 Cancellation Stats - Current tenant_id:', tenantId)

      // Basis-Query für gelöschte Termine
      let query = supabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          deleted_at,
          deleted_by,
          cancellation_reason_id,
          cancellation_type,
          tenant_id,
          medical_certificate_url,
          medical_certificate_status,
          cancellation_reasons!inner(
            id,
            name_de,
            code
          )
        `)
        .not('deleted_at', 'is', null)
        .not('cancellation_reason_id', 'is', null)
        .eq('tenant_id', tenantId) // Filter by current tenant

      // Datum-Filter anwenden falls angegeben
      if (dateRange) {
        query = query
          .gte('deleted_at', dateRange.from)
          .lte('deleted_at', dateRange.to)
      }

      const { data: cancellations, error: fetchError } = await query
        .order('deleted_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      if (!cancellations) {
        stats.value = {
          total_cancellations: 0,
          stats_by_reason: [],
          stats_by_month: [],
          recent_cancellations: []
        }
        return
      }

      // Verarbeite die Daten
      const processedStats = await processCancellationData(cancellations)
      stats.value = processedStats

      console.log('✅ Cancellation stats loaded:', processedStats.total_cancellations)
    } catch (err: any) {
      console.error('❌ Error loading cancellation stats:', err)
      error.value = err.message || 'Fehler beim Laden der Absage-Statistiken'
    } finally {
      isLoading.value = false
    }
  }

  // Verarbeite die Rohdaten zu Statistiken
  const processCancellationData = async (cancellations: any[]): Promise<CancellationStatsData> => {
    const total = cancellations.length

    // Statistiken nach Grund
    const reasonMap = new Map<string, {
      reason_id: string
      reason_name: string
      reason_code: string
      count: number
      last_cancellation: string
      cancellation_type: 'student' | 'staff' | null
    }>()

    cancellations.forEach(cancellation => {
      const reasonId = cancellation.cancellation_reason_id
      const reason = cancellation.cancellation_reasons
      
      if (!reasonMap.has(reasonId)) {
        reasonMap.set(reasonId, {
          reason_id: reasonId,
          reason_name: reason.name_de,
          reason_code: reason.code,
          count: 0,
          last_cancellation: cancellation.deleted_at,
          cancellation_type: cancellation.cancellation_type
        })
      }

      const reasonStat = reasonMap.get(reasonId)!
      reasonStat.count++
      
      // Aktualisiere letzte Absage (neueste)
      if (new Date(cancellation.deleted_at) > new Date(reasonStat.last_cancellation)) {
        reasonStat.last_cancellation = cancellation.deleted_at
      }
    })

    // Konvertiere zu Array und berechne Prozente
    const statsByReason: CancellationStat[] = Array.from(reasonMap.values()).map(stat => ({
      ...stat,
      percentage: total > 0 ? Math.round((stat.count / total) * 100) : 0
    })).sort((a, b) => b.count - a.count)

    // Statistiken nach Monat
    const monthlyStats = new Map<string, {
      month: string
      total: number
      by_reason: Map<string, number>
    }>()

    cancellations.forEach(cancellation => {
      const date = new Date(cancellation.deleted_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('de-CH', { year: 'numeric', month: 'long' })
      const reasonName = cancellation.cancellation_reasons.name_de

      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, {
          month: monthName,
          total: 0,
          by_reason: new Map()
        })
      }

      const monthStat = monthlyStats.get(monthKey)!
      monthStat.total++
      
      const reasonCount = monthStat.by_reason.get(reasonName) || 0
      monthStat.by_reason.set(reasonName, reasonCount + 1)
    })

    // Konvertiere Monats-Statistiken
    const statsByMonth = Array.from(monthlyStats.values())
      .map(monthStat => ({
        month: monthStat.month,
        total: monthStat.total,
        by_reason: Array.from(monthStat.by_reason.entries())
          .map(([reason_name, count]) => ({ reason_name, count }))
          .sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Benutzer-Daten für deleted_by IDs laden
    const deletedByIds = [...new Set(cancellations.map(c => c.deleted_by).filter(Boolean))]
    let userMap = new Map()
    
    if (deletedByIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', deletedByIds)
      
      if (users) {
        userMap = new Map(users.map(user => [user.id, user]))
      }
    }

    // Neueste Absagen (letzte 10)
    const recentCancellations = cancellations
      .slice(0, 10)
      .map(cancellation => {
        const user = cancellation.deleted_by ? userMap.get(cancellation.deleted_by) : null
        return {
          id: cancellation.id,
          title: cancellation.title,
          start_time: cancellation.start_time,
          reason_name: cancellation.cancellation_reasons.name_de,
          cancelled_by: user 
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unbekannt'
            : 'Unbekannt',
          cancelled_at: cancellation.deleted_at,
          medical_certificate_url: cancellation.medical_certificate_url,
          medical_certificate_status: cancellation.medical_certificate_status
        }
      })

    return {
      total_cancellations: total,
      stats_by_reason: statsByReason,
      stats_by_month: statsByMonth,
      recent_cancellations: recentCancellations
    }
  }

  // Computed: Top 3 Absage-Gründe
  const topReasons = computed(() => 
    stats.value?.stats_by_reason.slice(0, 3) || []
  )

  // Computed: Monatliche Trends
  const monthlyTrend = computed(() => {
    if (!stats.value?.stats_by_month.length) return []
    
    return stats.value.stats_by_month.map(month => ({
      month: month.month,
      total: month.total,
      topReason: month.by_reason[0]?.reason_name || 'Keine Daten'
    }))
  })

  // Computed: Absage-Rate (falls wir Gesamt-Termine haben)
  const cancellationRate = computed(() => {
    // Diese Funktion würde zusätzliche Daten benötigen
    // Für jetzt geben wir nur die absolute Anzahl zurück
    return stats.value?.total_cancellations || 0
  })

  return {
    // State
    stats,
    isLoading,
    error,
    
    // Computed
    topReasons,
    monthlyTrend,
    cancellationRate,
    
    // Actions
    fetchCancellationStats
  }
}
