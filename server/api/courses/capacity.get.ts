import { defineEventHandler, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * GET /api/courses/capacity?tenant_id=...&course_type=...
 *
 * Returns a map of { [date_label]: count } for how many participants
 * have already registered for each date label (stored in notes field).
 */
export default defineEventHandler(async (event) => {
  const { tenant_id, course_type } = getQuery(event)

  if (!tenant_id || !course_type) {
    return { counts: {} }
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('course_participants')
    .select('notes')
    .eq('tenant_id', tenant_id)
    .eq('course_type', course_type)

  if (error || !data) {
    return { counts: {} }
  }

  // Parse the notes field to count registrations per date label
  // Notes contains lines like "Gewünschte Kursdaten: Donnerstag, 28. Mai 2026"
  const counts: Record<string, number> = {}

  for (const row of data) {
    if (!row.notes) continue
    const match = row.notes.match(/Gewünschte Kursdaten:\s*(.+)/m)
    if (!match) continue
    const dates = match[1].split(',').map((d: string) => d.trim())
    for (const date of dates) {
      if (date) {
        counts[date] = (counts[date] || 0) + 1
      }
    }
  }

  return { counts }
})
