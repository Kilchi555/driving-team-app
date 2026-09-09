import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { resolveCategoryGroup } from '~/server/utils/category-groups'
import {
  requireTenantStaff,
  loadUserInTenant,
  assertSelfOrTenantAdmin,
  type TenantActor,
} from '~/server/utils/require-tenant-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

async function authorizeEvaluationAccess(
  admin: SupabaseClient,
  actor: TenantActor,
  appointmentId: string,
  userId: string,
) {
  const { data: appointment, error } = await admin
    .from('appointments')
    .select('id, user_id, staff_id, tenant_id, type')
    .eq('id', appointmentId)
    .eq('tenant_id', actor.tenant_id)
    .maybeSingle()

  if (error || !appointment) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  if (appointment.user_id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await loadUserInTenant(admin, userId, actor.tenant_id, { allowInactive: true })

  if (actor.role === 'staff') {
    if (appointment.staff_id !== actor.id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  } else {
    assertSelfOrTenantAdmin(actor, appointment.staff_id || actor.id)
  }

  return appointment
}

export default defineEventHandler(async (event) => {
  const actor = await requireTenantStaff(event)

  try {
    const body = await readBody<{
      action: 'get-history' | 'get-current' | 'get-previous'
      appointment_id: string
      user_id: string
      student_category: string
    }>(event)

    const { action, appointment_id, user_id, student_category } = body || {}

    if (!action || !appointment_id || !user_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: action, appointment_id, user_id',
      })
    }

    const supabase = getSupabaseAdmin()
    const appointment = await authorizeEvaluationAccess(supabase, actor, appointment_id, user_id)

    logger.debug(`📚 Processing evaluation ${action} action`, {
      appointment_id,
      user_id,
      student_category,
    })

    let result

    if (action === 'get-history') {
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, start_time, type, tenant_id')
        .eq('user_id', user_id)
        .eq('tenant_id', actor.tenant_id)
        .order('start_time', { ascending: false })

      if (appointmentsError) throw appointmentsError

      const appointmentIds = appointments?.map((app: { id: string }) => app.id) || []
      if (appointmentIds.length === 0) {
        return {
          success: true,
          data: {
            evaluations: [],
            appointmentDateMap: {},
            appointmentTypeMap: {},
          },
        }
      }

      const appointmentDateMap = new Map()
      const appointmentTypeMap = new Map()
      appointments?.forEach((apt: any) => {
        appointmentDateMap.set(apt.id, apt.start_time)
        appointmentTypeMap.set(apt.id, apt.type)
      })

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

      let filteredNotes = notes || []
      if (student_category) {
        const tenantIdForGroup = appointments?.[0]?.tenant_id ?? actor.tenant_id
        const targetGroup = new Set(await resolveCategoryGroup(supabase, tenantIdForGroup, student_category))
        targetGroup.add(student_category)
        filteredNotes = filteredNotes.filter((note: any) => {
          const appointmentType = appointmentTypeMap.get(note.appointment_id)
          return appointmentType && targetGroup.has(appointmentType)
        })
      }

      const criteriaBucket = new Map<string, any[]>()
      filteredNotes.forEach((note: any) => {
        const criteriaId = note.evaluation_criteria_id
        const appointmentDate = appointmentDateMap.get(note.appointment_id)
        if (!criteriaBucket.has(criteriaId)) criteriaBucket.set(criteriaId, [])
        criteriaBucket.get(criteriaId)!.push({ ...note, lesson_date: appointmentDate })
      })

      const latestThreeByCriteria: any[] = []
      criteriaBucket.forEach((notesForCriteria, criteriaId) => {
        const sorted = notesForCriteria
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
          appointmentTypeMap: Object.fromEntries(appointmentTypeMap),
        },
      }
    } else if (action === 'get-current') {
      const { data: currentNotes, error: notesError } = await supabase
        .from('notes')
        .select(`
          evaluation_criteria_id,
          criteria_rating,
          criteria_note
        `)
        .eq('appointment_id', appointment.id)
        .not('evaluation_criteria_id', 'is', null)

      if (notesError) throw notesError

      const { data: lessonNoteRow } = await supabase
        .from('notes')
        .select('staff_note')
        .eq('appointment_id', appointment.id)
        .is('evaluation_criteria_id', null)
        .maybeSingle()

      result = {
        success: true,
        data: {
          evaluations: currentNotes || [],
          hasEvaluations: (currentNotes?.length || 0) > 0,
          lesson_note: lessonNoteRow?.staff_note || '',
        },
      }
    } else if (action === 'get-previous') {
      const { data: allAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, start_time')
        .eq('user_id', user_id)
        .eq('tenant_id', actor.tenant_id)
        .eq('type', student_category)
        .order('start_time', { ascending: true })

      if (appointmentsError) throw appointmentsError

      const currentIndex = allAppointments?.findIndex((a: { id: string }) => a.id === appointment_id) ?? -1
      const previousAppointmentId = currentIndex > 0 ? allAppointments?.[currentIndex - 1]?.id : null

      if (!previousAppointmentId) {
        result = {
          success: true,
          data: {
            evaluations: [],
            previousAppointmentId: null,
          },
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
            previousAppointmentId,
          },
        }
      }
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid action: ${action}`,
      })
    }

    logger.debug(`✅ Evaluation ${action} successful`)
    return result
  } catch (err: any) {
    if (err?.statusCode) throw err
    logger.error('❌ Error in evaluation history endpoint:', err)
    throw createError({
      statusCode: 400,
      statusMessage: err.message || 'Failed to fetch evaluation data',
    })
  }
})
