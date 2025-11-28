import { getSupabaseAdmin } from '~/utils/supabase'
import { resolvePLZForExternalBusyTime } from '~/utils/postalCodeUtils'

interface ICSImportRequest {
  calendar_id: string
  ics_url?: string
  ics_content?: string
}

interface ICSImportResponse {
  success: boolean
  message: string
  imported_events?: number
  error?: string
}

export default defineEventHandler(async (event): Promise<ICSImportResponse> => {
  try {
    const body = await readBody(event) as ICSImportRequest
    const { calendar_id, ics_url, ics_content } = body

    if (!calendar_id || (!ics_url && !ics_content)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'calendar_id and (ics_url or ics_content) are required'
      })
    }

    const supabase = getSupabaseAdmin()

    // Get calendar info
    const { data: calendar, error: calendarError } = await supabase
      .from('external_calendars')
      .select('*')
      .eq('id', calendar_id)
      .single()

    if (calendarError || !calendar) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Calendar not found'
      })
    }

    // Obtain ICS data either from content or by fetching URL
    let icsData: string
    if (ics_content && ics_content.trim().length > 0) {
      icsData = ics_content
    } else {
      try {
        // Convert webcal:// to https://
        let fetchUrl = ics_url as string
        if (fetchUrl.startsWith('webcal://')) {
          fetchUrl = fetchUrl.replace('webcal://', 'https://')
          console.log('Converted webcal:// to https://', fetchUrl)
        }
        
        console.log('Fetching ICS from:', fetchUrl)
        
        const icsResponse = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'DrivingTeamApp-ICS-Sync/1.0',
            'Accept': 'text/calendar, text/plain, */*'
          },
          redirect: 'follow'
        })
        
        console.log('ICS fetch response:', icsResponse.status, icsResponse.statusText)
        
        if (!icsResponse.ok) {
          throw createError({
            statusCode: 400,
            statusMessage: `ICS-URL nicht erreichbar: ${icsResponse.status} ${icsResponse.statusText}. Prüfen Sie, ob die URL öffentlich zugänglich ist.`
          })
        }
        
        icsData = await icsResponse.text()
        console.log('ICS data length:', icsData.length)
        
        if (!icsData || icsData.length < 50) {
          throw createError({
            statusCode: 400,
            statusMessage: 'ICS-URL liefert keine gültigen Daten. Prüfen Sie die URL.'
          })
        }
        
      } catch (fetchErr: any) {
        console.error('ICS fetch error:', fetchErr)
        const errorMsg = fetchErr.statusMessage || fetchErr.message || 'URL nicht erreichbar'
        throw createError({ 
          statusCode: 400, 
          statusMessage: `Fehler beim Abrufen der ICS-URL: ${errorMsg}. Stellen Sie sicher, dass die URL öffentlich zugänglich ist.`
        })
      }
    }
    
    // Parse ICS data
    const events = parseICSData(icsData)
    
    if (events.length === 0) {
      return {
        success: true,
        message: 'No events found in ICS data',
        imported_events: 0
      }
    }

    // Only sync relevant time window: now .. now + 1 year
    const now = new Date()
    const horizon = new Date(now)
    horizon.setFullYear(horizon.getFullYear() + 1)

    // Filter events to window (keep any event that overlaps the window)
    const windowEvents = events.filter(ev => {
      const evStart = new Date(ev.start)
      const evEnd = new Date(ev.end)
      return evEnd >= now && evStart <= horizon
    })

    if (windowEvents.length === 0) {
      return {
        success: true,
        message: 'No events in the next year',
        imported_events: 0
      }
    }

    // Clear existing busy times for this calendar within window
    const { error: clearError } = await supabase
      .from('external_busy_times')
      .delete()
      .eq('external_calendar_id', calendar_id)
      .gte('start_time', now.toISOString())
      .lte('start_time', horizon.toISOString())
    if (clearError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to clear busy times: ${clearError.message}` })
    }

    // Insert new busy times - alle Titel als "Privat" speichern
    const busyTimes = windowEvents.map(event => {
      // Convert to UTC for consistent storage with appointments
      // ICS events can be in various formats (local or UTC)
      const convertToUTC = (isoStr: string): string => {
        // Parse the ISO string as a UTC date
        const date = new Date(isoStr)
        
        // Format as UTC ISO string (YYYY-MM-DD HH:MM:SS+00)
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, '0')
        const day = String(date.getUTCDate()).padStart(2, '0')
        const hours = String(date.getUTCHours()).padStart(2, '0')
        const minutes = String(date.getUTCMinutes()).padStart(2, '0')
        const seconds = String(date.getUTCSeconds()).padStart(2, '0')
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}+00`
      }
      
      const busyTime: any = {
        tenant_id: calendar.tenant_id,
        staff_id: calendar.staff_id,
        external_calendar_id: calendar_id,
        external_event_id: ((event.uid || `event_${Date.now()}_${Math.random()}`) + '').slice(0, 255),
        event_title: 'Privat', // Anonymisiert für Datenschutz
        start_time: convertToUTC(event.start),
        end_time: convertToUTC(event.end),
        sync_source: 'ics'
      }
      
      // Only add event_location if event has location data
      if (event.location) {
        busyTime.event_location = event.location
      }
      
      return busyTime
    })
    
    // Resolve postal codes for all busy times (will be populated after initial insert)
    // This happens asynchronously to not block the sync
    
    // Deduplicate by conflict key to avoid "ON CONFLICT ... cannot affect row a second time"
    const uniqueMap = new Map<string, typeof busyTimes[number]>()
    for (const bt of busyTimes) {
      const key = `${bt.tenant_id}|${bt.staff_id}|${bt.external_calendar_id}|${bt.external_event_id}|${bt.start_time}`
      if (!uniqueMap.has(key)) uniqueMap.set(key, bt)
    }
    const uniqueBusyTimes = Array.from(uniqueMap.values())

    const { error: insertError } = await supabase
      .from('external_busy_times')
      .upsert(uniqueBusyTimes, {
        onConflict: 'tenant_id,staff_id,external_calendar_id,external_event_id,start_time'
      })

    if (insertError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to insert busy times: ${insertError.message}`
      })
    }
    
    // Asynchronously resolve and update postal codes for events with locations
    if (uniqueBusyTimes.some(bt => bt.event_location)) {
      console.log('📍 Resolving postal codes for external busy times...')
      
      // Don't await this - let it process in background
      ;(async () => {
        try {
          for (const busyTime of uniqueBusyTimes) {
            if (busyTime.event_location) {
              const plz = await resolvePLZForExternalBusyTime(
                busyTime.event_location,
                calendar.tenant_id,
                supabase
              )
              
              if (plz) {
                // Update the busy time with resolved PLZ
                const { error: updateError } = await supabase
                  .from('external_busy_times')
                  .update({ postal_code: plz })
                  .eq('external_event_id', busyTime.external_event_id)
                  .eq('staff_id', busyTime.staff_id)
                
                if (updateError) {
                  console.warn(`⚠️  Failed to update PLZ for ${busyTime.event_location}:`, updateError)
                } else {
                  console.log(`✅ Updated PLZ: ${busyTime.event_location} → ${plz}`)
                }
              }
            }
          }
        } catch (err: any) {
          console.error('❌ Error resolving postal codes:', err)
        }
      })()
    }

    // Update last sync time
    const { error: updateError } = await supabase
      .from('external_calendars')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', calendar_id)
    if (updateError) {
      throw createError({ statusCode: 500, statusMessage: `Failed to update calendar: ${updateError.message}` })
    }

    return {
      success: true,
      message: `Imported ${uniqueBusyTimes.length} events (next 60 days)`,
      imported_events: uniqueBusyTimes.length
    }

  } catch (error: any) {
    console.error('ICS Import Error:', error)
    return {
      success: false,
      message: 'Failed to import ICS data',
      error: error.message || 'Unknown error'
    }
  }
})

// Simple ICS parser
function parseICSData(icsData: string): Array<{
  uid?: string
  summary?: string
  location?: string
  start: string
  end: string
}> {
  const events: Array<{
    uid?: string
    summary?: string
    location?: string
    start: string
    end: string
  }> = []

  // Normalize line endings and unfold folded lines (RFC 5545)
  const rawLines = icsData.replace(/\r\n/g, '\n').split('\n')
  const lines: string[] = []
  for (const raw of rawLines) {
    if (raw.startsWith(' ') || raw.startsWith('\t')) {
      // Continuation of previous line
      if (lines.length > 0) {
        lines[lines.length - 1] += raw.slice(1)
      }
    } else {
      lines.push(raw)
    }
  }

  let currentEvent: any = {}
  let inEvent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {}
    } else if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.start && currentEvent.end) {
        events.push({
          uid: currentEvent.uid,
          summary: currentEvent.summary,
          location: currentEvent.location,
          start: currentEvent.start,
          end: currentEvent.end
        })
      }
      inEvent = false
      currentEvent = {}
    } else if (inEvent) {
      // Split property and value at first ':' (values may contain ':')
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const prop = line.substring(0, colonIdx)
      const value = line.substring(colonIdx + 1)

      // Property name can have parameters (e.g., DTSTART;TZID=Europe/Zurich)
      const [name, ...params] = prop.split(';')
      const upperName = name.toUpperCase()

      switch (upperName) {
        case 'UID':
          currentEvent.uid = value
          break
        case 'SUMMARY':
          currentEvent.summary = value
          break
        case 'LOCATION':
          currentEvent.location = value
          break
        case 'DTSTART': {
          const tzidParam = params.find(p => p.toUpperCase().startsWith('TZID='))
          const isDateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
          currentEvent.start = parseICSTimestamp(value, { tzid: tzidParam?.split('=')[1], dateOnly: isDateOnly })
          break
        }
        case 'DTEND': {
          const tzidParam = params.find(p => p.toUpperCase().startsWith('TZID='))
          const isDateOnly = params.some(p => p.toUpperCase().includes('VALUE=DATE'))
          currentEvent.end = parseICSTimestamp(value, { tzid: tzidParam?.split('=')[1], dateOnly: isDateOnly })
          break
        }
        default:
          // ignore other properties
          break
      }
    }
  }

  return events
}

function parseICSTimestamp(timestamp: string, opts?: { tzid?: string, dateOnly?: boolean }): string {
  const clean = timestamp.trim()
  
  // Date only: 20231215
  if (opts?.dateOnly || (/^\d{8}$/.test(clean) && !clean.includes('T'))) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    return `${year}-${month}-${day}T00:00:00`
  }

  // UTC format: 20231215T120000Z - Umrechnung in lokale Schweizer Zeit
  if (/^\d{8}T\d{6}Z$/.test(clean)) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    const hour = clean.substring(9, 11)
    const minute = clean.substring(11, 13)
    const second = clean.substring(13, 15)
    
    // Parse als UTC Date
    const utcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
    
    // Konvertiere in lokale Schweizer Zeit (Europe/Zurich)
    const localDateStr = utcDate.toLocaleString('en-CA', { 
      timeZone: 'Europe/Zurich',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    // Format: "2025-11-12, 08:00:00" -> "2025-11-12T08:00:00"
    const [datePart, timePart] = localDateStr.split(', ')
    return `${datePart}T${timePart}`
  }

  // Local format without Z: 20231215T120000
  if (/^\d{8}T\d{6}$/.test(clean)) {
    const year = clean.substring(0, 4)
    const month = clean.substring(4, 6)
    const day = clean.substring(6, 8)
    const hour = clean.substring(9, 11)
    const minute = clean.substring(11, 13)
    const second = clean.substring(13, 15)
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`
  }

  // Fallback: return as-is
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`
}
