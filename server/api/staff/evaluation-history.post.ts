import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Get Supabase admin client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Parse request body
    const body = await readBody<{
      action: 'get-history' | 'get-current' | 'get-previous'
      appointment_id: string
      user_id: string
      student_category: string
    }>(event)

    const { action, appointment_id, user_id, student_category } = body

    if (!action || !appointment_id || !user_id) {
      throw new Error('Missing required fields: action, appointment_id, user_id')
    }

    logger.debug(`📚 Processing evaluation ${action} action`, {
      appointment_id,
      user_id,
      student_category
    })

    let result

    if (action === 'get-history') {
      // Fetch all appointments for the student, sorted by date
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, start_time, type')
        .eq('user_id', user_id)
        .order('start_time', { ascending: false })

      if (appointmentsError) throw appointmentsError

      const appointmentIds = appointments?.map((app: any) => app.id) || []
      if (appointmentIds.length === 0) {
        return {
          success: true,
          data: {
            evaluations: [],
            appointmentDateMap: {},
            appointmentTypeMap: {}
          }
        }
      }

      // Create mappings for date and type
      const appointmentDateMap = new Map()
      const appointmentTypeMap = new Map()
      appointments?.forEach((apt: any) => {
        appointmentDateMap.set(apt.id, apt.start_time)
        appointmentTypeMap.set(apt.id, apt.type)
      })

      // Fetch notes for these appointments
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select(`
          evaluation_criteria_id,
          criteria_rating,
          criteria_note,
          appointment_id
        `)
        .in('appointment_id', appointmentIds)
        .not('evaluation_criteria_id', 'is', null)

      if (notesError) throw notesError

      // Filter notes by category if specified
      // B-family: treat "B", "B Automatik", "B Schaltung" as the same group
      const getBFamily = (cat: string) => {
        const b = ['B', 'B Automatik', 'B Schaltung']
        return b.includes(cat) ? 'B_FAMILY' : cat
      }
      let filteredNotes = notes || []
      if (student_category) {
        const targetFamily = getBFamily(student_category)
        filteredNotes = filteredNotes.filter((note: any) => {
          const appointmentType = appointmentTypeMap.get(note.appointment_id)
          return getBFamily(appointmentType) === targetFamily
        })
      }

      // Group by criteria and keep the 3 most recent ratings
      const criteriaBucket = new Map<string, any[]>()
      filteredNotes.forEach((note: any) => {
        const criteriaId = note.evaluation_criteria_id
        const appointmentDate = appointmentDateMap.get(note.appointment_id)
        if (!criteriaBucket.has(criteriaId)) criteriaBucket.set(criteriaId, [])
        criteriaBucket.get(criteriaId)!.push({ ...note, lesson_date: appointmentDate })
      })

      const latestThreeByCriteria: any[] = []
      criteriaBucket.forEach((notes, criteriaId) => {
        const sorted = notes
          .filter((n: any) => n.lesson_date)
          .sort((a: any, b: any) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime())
          .slice(0, 3)
        if (sorted.length > 1) {
          logger.debug(`🔍 criteria ${criteriaId}: ${sorted.length} ratings → [${sorted.map((n: any) => n.criteria_rating).join(', ')}]`)
        }
        latestThreeByCriteria.push(...sorted)
      })

      result = {
        success: true,
        data: {
          evaluations: latestThreeByCriteria,
          appointmentDateMap: Object.fromEntries(appointmentDateMap),
          appointmentTypeMap: Object.fromEntries(appointmentTypeMap)
        }
      }
    } else if (action === 'get-current') {
      // Fetch current appointment evaluations
      const { data: currentNotes, error: notesError } = await supabase
        .from('notes')
        .select(`
          evaluation_criteria_id,
          criteria_rating,
          criteria_note
        `)
        .eq('appointment_id', appointment_id)
        .not('evaluation_criteria_id', 'is', null)

      if (notesError) throw notesError

      result = {
        success: true,
        data: {
          evaluations: currentNotes || [],
          hasEvaluations: (currentNotes?.length || 0) > 0
        }
      }
    } else if (action === 'get-previous') {
      // Get previous appointment for comparison
      const { data: allAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, start_time')
        .eq('user_id', user_id)
        .eq('type', student_category)
        .order('start_time', { ascending: true })

      if (appointmentsError) throw appointmentsError

      const currentIndex = allAppointments?.findIndex((a: any) => a.id === appointment_id) ?? -1
      const previousAppointmentId = currentIndex > 0 ? allAppointments?.[currentIndex - 1]?.id : null

      if (!previousAppointmentId) {
        result = {
          success: true,
          data: {
            evaluations: [],
            previousAppointmentId: null
          }
        }
      } else {
        const { data: previousNotes, error: notesError } = await supabase
          .from('notes')
          .select('evaluation_criteria_id, criteria_rating, criteria_note')
          .eq('appointment_id', previousAppointmentId)
          .not('evaluation_criteria_id', 'is', null)

        if (notesError) throw notesError

        result = {
          success: true,
          data: {
            evaluations: previousNotes || [],
            previousAppointmentId
          }
        }
      }
    } else {
      throw new Error(`Invalid action: ${action}`)
    }

    logger.debug(`✅ Evaluation ${action} successful`)
    return result
  } catch (err: any) {
    logger.error('❌ Error in evaluation history endpoint:', err)
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || `Failed to fetch evaluation data`
    })
  }
})
