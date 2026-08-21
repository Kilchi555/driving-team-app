import type { SupabaseClient } from '@supabase/supabase-js'
import {
  aggregateStudentAppointmentActivity,
  type StudentAppointmentActivity
} from '~/utils/student-appointment-activity'

const PAGE_SIZE = 1000
const ID_CHUNK_SIZE = 200

export async function fetchStudentAppointmentActivity(
  supabase: SupabaseClient,
  tenantId: string,
  studentIds: string[],
  now: Date = new Date()
): Promise<Record<string, StudentAppointmentActivity>> {
  if (!studentIds.length) return {}

  const rows: { user_id: string | null, start_time: string | null, status: string | null }[] = []

  for (let i = 0; i < studentIds.length; i += ID_CHUNK_SIZE) {
    const chunk = studentIds.slice(i, i + ID_CHUNK_SIZE)
    let from = 0

    while (from < PAGE_SIZE * 50) {
      const { data, error } = await supabase
        .from('appointments')
        .select('user_id, start_time, status')
        .eq('tenant_id', tenantId)
        .in('user_id', chunk)
        .is('deleted_at', null)
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      if (!data?.length) break

      rows.push(...data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  }

  return aggregateStudentAppointmentActivity(rows, studentIds, now)
}
