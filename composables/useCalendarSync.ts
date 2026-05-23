export interface CalendarSyncEvent {
  title: string
  startDate: Date
  endDate: Date
  location?: string
  notes?: string
  appointmentId?: string
}

const SYNCED_KEY = 'calendar_synced_appointments'

function isNativePlatform(): boolean {
  if (process.server) return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

async function hasSynced(appointmentId: string): Promise<boolean> {
  if (!isNativePlatform() || !appointmentId) return false
  try {
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key: SYNCED_KEY })
    const list: string[] = value ? JSON.parse(value) : []
    return list.includes(appointmentId)
  } catch {
    return false
  }
}

async function markSynced(appointmentId: string): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key: SYNCED_KEY })
    const list: string[] = value ? JSON.parse(value) : []
    if (!list.includes(appointmentId)) {
      list.push(appointmentId)
      await Preferences.set({ key: SYNCED_KEY, value: JSON.stringify(list.slice(-100)) })
    }
  } catch { /* silent */ }
}

function addToCalendarWeb(event: CalendarSyncEvent): void {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Simy//Fahrschule//DE',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(event.startDate)}`,
    `DTEND:${fmt(event.endDate)}`,
    `SUMMARY:${event.title}`,
    event.location ? `LOCATION:${event.location.replace(/\n/g, ', ')}` : null,
    event.notes ? `DESCRIPTION:${event.notes.replace(/\n/g, '\\n')}` : null,
    `UID:${event.appointmentId || Date.now()}@simy.ch`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([lines], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fahrlektion.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export function useCalendarSync() {
  const addToCalendar = async (event: CalendarSyncEvent): Promise<boolean> => {
    if (!isNativePlatform()) {
      addToCalendarWeb(event)
      return true
    }
    try {
      const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar')
      await CapacitorCalendar.createEventWithPrompt({
        title: event.title,
        startDate: event.startDate.getTime(),
        endDate: event.endDate.getTime(),
        location: event.location,
        description: event.notes,
        alerts: [-60], // 1h reminder
      })
      if (event.appointmentId) await markSynced(event.appointmentId)
      return true
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase()
      // User cancelled — not an error
      if (msg.includes('cancel') || msg.includes('dismiss')) return false
      console.error('[CalendarSync]', e)
      return false
    }
  }

  return { addToCalendar, hasSynced, isNativePlatform }
}
