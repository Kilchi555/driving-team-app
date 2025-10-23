// server/api/calendar/ics.get.ts
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const staffId = query.staff_id as string

    if (!staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Staff ID is required'
      })
    }

    const supabase = getSupabase()

    // Get appointments for the staff member
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        user_id,
        location_id,
        custom_location_address,
        locations (
          name,
          address
        )
      `)
      .eq('staff_id', staffId)
      .not('status', 'is', null)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Database error: ${error.message}`
      })
    }

    // Get student names
    const studentIds = [...new Set(appointments?.map(apt => apt.user_id).filter(Boolean) || [])]
    let students: any[] = []
    
    if (studentIds.length > 0) {
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', studentIds)
      
      if (studentsError) {
        console.error('Error fetching students:', studentsError)
      } else {
        students = studentsData || []
      }
    }

    // Generate ICS content
    const icsContent = generateICS(appointments || [], students)

    // Set headers for ICS file
    setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'attachment; filename="fahrstunden.ics"')
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')

    return icsContent

  } catch (error: any) {
    console.error('ICS generation error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to generate calendar'
    })
  }
})

function generateICS(appointments: any[], students: any[]): string {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Simy.ch//Fahrstunden//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Fahrstunden',
    'X-WR-CALDESC:Automatisch synchronisierte Fahrstunden',
    'X-WR-TIMEZONE:Europe/Zurich'
  ]

  appointments.forEach(appointment => {
    const student = students.find(stu => stu.id === appointment.user_id)
    const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unbekannt'
    
    const location = appointment.locations?.name || 
                    appointment.custom_location_address || 
                    'Standort nicht angegeben'
    
    const startTime = new Date(appointment.start_time)
    const endTime = new Date(appointment.end_time)
    
    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const startFormatted = startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endFormatted = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    const summary = `${appointment.title} - ${studentName}`
    const description = [
      `Schüler: ${studentName}`,
      `Standort: ${location}`,
      appointment.description ? `Beschreibung: ${appointment.description}` : ''
    ].filter(Boolean).join('\\n')

    ics.push(
      'BEGIN:VEVENT',
      `UID:${appointment.id}@simy.ch`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT'
    )
  })

  ics.push('END:VCALENDAR')

  return ics.join('\r\n')
}
