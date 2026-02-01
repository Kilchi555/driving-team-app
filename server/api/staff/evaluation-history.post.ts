import { defineEventHandler, readBody } from 'h3'
import { getServerSession } from '#auth'
import { useSupabaseAdmin } from '~/composables/useSupabaseAdmin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const session = await getServerSession(event)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Get Supabase admin
    const supabase = useSupabaseAdmin()

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
      let filteredNotes = notes || []
      if (student_category) {
        filteredNotes = filteredNotes.filter((note: any) => {
          const appointmentType = appointmentTypeMap.get(note.appointment_id)
          return appointmentType === student_category
        })
      }

      // Group by criteria and get latest
      const latestByCriteria = new Map()
      filteredNotes.forEach((note: any) => {
        const criteriaId = note.evaluation_criteria_id
        const appointmentDate = appointmentDateMap.get(note.appointment_id)

        if (!latestByCriteria.has(criteriaId)) {
          latestByCriteria.set(criteriaId, { ...note, lesson_date: appointmentDate })
        } else {
          const existing = latestByCriteria.get(criteriaId)
          if (appointmentDate && existing.lesson_date && new Date(appointmentDate) > new Date(existing.lesson_date)) {
            latestByCriteria.set(criteriaId, { ...note, lesson_date: appointmentDate })
          }
        }
      })

      result = {
        success: true,
        data: {
          evaluations: Array.from(latestByCriteria.values()),
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
