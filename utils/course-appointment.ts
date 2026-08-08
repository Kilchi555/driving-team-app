/** Staff calendar blocks for courses are tagged `notes = course:<uuid>`. */
export function parseCourseIdFromAppointmentNotes(notes?: string | null): string | null {
  if (!notes || typeof notes !== 'string') return null
  const m = notes.trim().match(/^course:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
  return m?.[1] ?? null
}
