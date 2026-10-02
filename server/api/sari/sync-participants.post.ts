import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerWithSession } from '~/utils/supabase'
import { SARIClient, type SARICourseMember } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import { logger } from '~/utils/logger'
import { courseSessionsEmbed } from '~/server/utils/course-session-embed'

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

  const ownedSariIds: number[] = []
  const addOwnedId = (value: unknown) => {
    const parsed = parseInt(String(value), 10)
    if (!Number.isNaN(parsed) && !ownedSariIds.includes(parsed)) ownedSariIds.push(parsed)
  }

  for (const session of course.course_sessions || []) {
    if (session?.sari_session_id) addOwnedId(session.sari_session_id)
  }

  if (typeof course.sari_course_id === 'string' && course.sari_course_id.startsWith('GROUP_')) {
    for (const part of course.sari_course_id.replace('GROUP_', '').split('_')) addOwnedId(part)
  }

  // Client ids are accepted only when they already belong to this course.
  const seenSariIds = new Set<number>()
  const sariIds = Array.isArray(sariCourseIds)
    ? sariCourseIds
        .map((id: string | number) => parseInt(String(id), 10))
        .filter((id: number) => {
          if (!ownedSariIds.includes(id) || seenSariIds.has(id)) return false
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

  // Collect all unique participants from all SARI courses
  const allParticipants = new Map<string, SARICourseMember>()
  const errors: string[] = []

  for (const sariCourseId of sariIds) {
    try {
      console.log(`📥 Fetching participants for SARI course ${sariCourseId}...`)
      const participants = await sari.getCourseDetail(sariCourseId)
      
      for (const participant of participants) {
        // Use faberid as unique key
        if (participant.faberid && !allParticipants.has(participant.faberid)) {
          allParticipants.set(participant.faberid, participant)
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

  for (const [faberid, participant] of allParticipants) {
    try {
      // Check if course_participant with this faberid already exists in this tenant
      const { data: existingParticipant, error: lookupError } = await supabase
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
        const { data: newParticipant, error: createError } = await supabase
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
      const { data: existingReg } = await supabase
        .from('course_registrations')
        .select('id')
        .eq('course_id', courseId)
        .eq('participant_id', participantId)
        .maybeSingle()

      if (!existingReg) {
        // Create course registration
        const { error: regError } = await supabase
          .from('course_registrations')
          .insert({
            course_id: courseId,
            participant_id: participantId,
            tenant_id: userData.tenant_id,
            status: participant.confirmed ? 'confirmed' : 'pending',
            sari_synced: true,
            sari_synced_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })

        if (regError) {
          console.error(`Error creating registration for ${faberid}:`, regError)
          errors.push(`Registration ${faberid}: ${regError.message}`)
        } else {
          registrationsCreated++
          console.log(`✅ Created registration for ${faberid} in course ${courseId}`)
        }
      }

    } catch (error: any) {
      console.error(`Error processing participant ${faberid}:`, error)
      errors.push(`Participant ${faberid}: ${error.message}`)
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

