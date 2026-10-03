import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient, type SARICourseMember } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'
import { courseSessionsEmbed } from '~/server/utils/course-session-embed'
import {
  parsePositiveSariSessionId,
  recordConfirmedSariMembership,
  SARI_MEMBERSHIP_SOURCE,
  SariMembershipWriteError,
  strictSariIdsFromParts,
  uniqueCourseSessionIdForSari,
} from '~/server/utils/registration-sari-membership'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServerWithSession(event)
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  // Get request body
  const body = await readBody(event)
  const { courseId, sariCourseIds } = body

  if (!courseId) {
    throw createError({
      statusCode: 400,
      message: 'courseId is required'
    })
  }

  // Get user's tenant
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (userError || !userData) {
    throw createError({
      statusCode: 403,
      message: 'User not found or inactive'
    })
  }

  // Only admin/staff can sync participants
  if (!['admin', 'staff', 'superadmin'].includes(userData.role)) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions'
    })
  }

  // Course ownership is established before credentials or any SARI call.
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      sari_course_id,
      tenant_id,
      ${courseSessionsEmbed(`
        id,
        sari_session_id
      `)}
    `)
    .eq('id', courseId)
    .eq('tenant_id', userData.tenant_id)
    .single()

  if (courseError || !course) {
    throw createError({
      statusCode: 404,
      message: 'Course not found'
    })
  }

  const ownedSariIds = strictSariIdsFromParts([
    ...(course.course_sessions || []).map((session: { sari_session_id?: unknown }) => session?.sari_session_id),
    ...(typeof course.sari_course_id === 'string' && course.sari_course_id.startsWith('GROUP_')
      ? course.sari_course_id.slice('GROUP_'.length).split('_')
      : []),
  ])

  // Client ids are accepted only when they already belong to this course.
  const seenSariIds = new Set<number>()
  const sariIds = Array.isArray(sariCourseIds)
    ? sariCourseIds
        .map((id: unknown) => parsePositiveSariSessionId(id))
        .filter((id: number | null): id is number => {
          if (id == null || !ownedSariIds.includes(id) || seenSariIds.has(id)) return false
          seenSariIds.add(id)
          return true
        })
    : ownedSariIds

  if (sariIds.length === 0) {
    return {
      success: false,
      message: 'No SARI course IDs found for this course',
      imported: 0,
      skipped: 0
    }
  }

  const { data: tenantConfig, error: tenantError } = await supabase
    .from('tenants')
    .select('sari_environment')
    .eq('id', userData.tenant_id)
    .single()

  if (tenantError || !tenantConfig) {
    throw createError({
      statusCode: 404,
      message: 'Tenant not found'
    })
  }

  let sariSecrets
  try {
    sariSecrets = await getTenantSecretsSecure(
      userData.tenant_id,
      ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
      'SARI_SYNC_PARTICIPANTS'
    )
  } catch (secretsErr: any) {
    logger.error('❌ Failed to load SARI credentials:', secretsErr.message)
    throw createError({
      statusCode: 400,
      message: 'SARI credentials not configured for this tenant'
    })
  }

  // Create SARI client
  const sari = new SARIClient({
    environment: tenantConfig.sari_environment || 'production',
    clientId: sariSecrets.SARI_CLIENT_ID,
    clientSecret: sariSecrets.SARI_CLIENT_SECRET,
    username: sariSecrets.SARI_USERNAME,
    password: sariSecrets.SARI_PASSWORD
  })

  // Keep every confirmed SARI id for a faberid. The proving id must not collapse to one row.
  const allParticipants = new Map<string, { participant: SARICourseMember; sariIds: Set<number> }>()
  const errors: string[] = []
  const admin = getSupabaseAdmin()

  for (const sariCourseId of sariIds) {
    try {
      console.log(`📥 Fetching participants for SARI course ${sariCourseId}...`)
      const participants = await sari.getCourseDetail(sariCourseId)
      
      for (const participant of participants) {
        if (!participant.faberid) continue
        const existing = allParticipants.get(participant.faberid)
        if (existing) {
          existing.sariIds.add(sariCourseId)
        } else {
          allParticipants.set(participant.faberid, { participant, sariIds: new Set([sariCourseId]) })
        }
      }
      console.log(`✅ Found ${participants.length} participants in SARI course ${sariCourseId}`)
    } catch (error: any) {
      console.error(`Error fetching participants for SARI course ${sariCourseId}:`, error)
      errors.push(`Course ${sariCourseId}: ${error.message}`)
    }
  }

  console.log(`📊 Total unique participants: ${allParticipants.size}`)

  // Import participants as course_participants and create registrations
  let imported = 0
  let skipped = 0
  let registrationsCreated = 0

  for (const [faberid, entry] of allParticipants) {
    const participant = entry.participant
    try {
      // Check if course_participant with this faberid already exists in this tenant
      const { data: existingParticipant, error: lookupError } = await admin
        .from('course_participants')
        .select('id, first_name, last_name, user_id')
        .eq('tenant_id', userData.tenant_id)
        .eq('faberid', faberid)
        .maybeSingle()

      let participantId: string

      if (existingParticipant) {
        // Participant already exists
        participantId = existingParticipant.id
        skipped++
        console.log(`⏭️ Participant ${faberid} already exists: ${existingParticipant.first_name} ${existingParticipant.last_name}`)
      } else {
        // Create new course_participant
        const { data: newParticipant, error: createError } = await admin
          .from('course_participants')
          .insert({
            tenant_id: userData.tenant_id,
            first_name: participant.firstname || 'Unbekannt',
            last_name: participant.lastname || 'Unbekannt',
            faberid: faberid,
            birthdate: participant.birthdate || null,
            sari_synced: true,
            sari_synced_at: new Date().toISOString()
            // No user_id yet - will be linked when/if they register
          })
          .select('id')
          .single()

        if (createError) {
          console.error(`Error creating participant ${faberid}:`, createError)
          errors.push(`Participant ${faberid}: ${createError.message}`)
          continue
        }

        participantId = newParticipant.id
        imported++
        console.log(`✅ Created participant ${faberid}: ${participant.firstname} ${participant.lastname}`)
      }

      // Check if registration already exists
      const { data: existingReg } = await admin
        .from('course_registrations')
        .select('id, tenant_id')
        .eq('course_id', courseId)
        .eq('tenant_id', userData.tenant_id)
        .eq('participant_id', participantId)
        .maybeSingle()

      let registrationId = existingReg?.id as string | undefined
      if (existingReg && existingReg.tenant_id !== userData.tenant_id) {
        throw new SariMembershipWriteError('registration_tenant', 'Registration does not belong to the verified tenant')
      }

      if (!registrationId) {
        const { data: createdReg, error: regError } = await admin
          .from('course_registrations')
          .insert({
            course_id: courseId,
            participant_id: participantId,
            tenant_id: userData.tenant_id,
            status: participant.confirmed ? 'confirmed' : 'pending',
            sari_synced: false,
            sari_synced_at: null,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (regError || !createdReg?.id) {
          console.error(`Error creating registration for ${faberid}:`, regError)
          errors.push(`Registration ${faberid}: ${regError?.message || 'insert failed'}`)
          continue
        }
        registrationId = createdReg.id
        registrationsCreated++
        console.log(`✅ Created registration for ${faberid} in course ${courseId}`)
      }

      for (const sariSessionId of entry.sariIds) {
        const courseSessionId = await uniqueCourseSessionIdForSari(
          admin,
          userData.tenant_id,
          courseId,
          sariSessionId,
        )
        await recordConfirmedSariMembership({
          supabase: admin,
          tenantId: userData.tenant_id,
          registrationId,
          sariSessionId,
          courseSessionId,
          source: SARI_MEMBERSHIP_SOURCE.syncParticipants,
        })
      }

      const { error: syncedError } = await admin
        .from('course_registrations')
        .update({ sari_synced: true, sari_synced_at: new Date().toISOString() })
        .eq('id', registrationId)
        .eq('tenant_id', userData.tenant_id)
      if (syncedError) {
        throw new SariMembershipWriteError('persist_failed', syncedError.message)
      }

    } catch (error: any) {
      console.error(`Error processing participant ${faberid}:`, error)
      errors.push(`Participant ${faberid}: ${error.message}`)
      if (error instanceof SariMembershipWriteError) {
        return {
          success: false,
          message: `SARI membership could not be saved: ${error.message}`,
          imported,
          skipped,
          registrationsCreated,
          totalParticipants: allParticipants.size,
          errors,
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    message: `Imported ${imported} new participants, skipped ${skipped} existing, created ${registrationsCreated} registrations`,
    imported,
    skipped,
    registrationsCreated,
    totalParticipants: allParticipants.size,
    errors: errors.length > 0 ? errors : undefined
  }
})

