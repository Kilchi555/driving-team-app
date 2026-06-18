import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/add-participant
 * Creates a new user (or reuses an existing one by email) and enrols them in the course.
 *
 * Body:
 *   courseId      – id of the course
 *   participant   – { first_name, last_name, email, phone?, birthdate?, street?, street_nr?, zip?, city? }
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseId, participant } = body as {
    courseId: string
    participant: {
      first_name: string
      last_name: string
      email: string
      phone?: string
      birthdate?: string
      street?: string
      street_nr?: string
      zip?: string
      city?: string
    }
  }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })
  if (!participant?.email) throw createError({ statusCode: 400, statusMessage: 'Missing participant email' })

  const supabase = getSupabaseAdmin()

  // Verify course belongs to tenant
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  // Check if user exists
  let userId: string
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', participant.email)
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingUser) {
    userId = existingUser.id
    logger.debug('User already exists:', userId)
  } else {
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        first_name: participant.first_name,
        last_name: participant.last_name,
        email: participant.email,
        phone: participant.phone || null,
        birthdate: participant.birthdate || null,
        street: participant.street || null,
        street_nr: participant.street_nr || null,
        zip: participant.zip || null,
        city: participant.city || null,
        role: 'student',
        tenant_id: profile.tenant_id,
        is_active: true,
        created_by: profile.id,
      })
      .select()
      .single()

    if (userError) {
      logger.error('❌ Error creating user:', userError)
      throw createError({ statusCode: 500, statusMessage: `Benutzer konnte nicht erstellt werden: ${userError.message}` })
    }
    userId = newUser.id
    logger.debug('User created:', userId)
  }

  // Create enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('course_registrations')
    .insert({
      course_id: courseId,
      user_id: userId,
      first_name: participant.first_name,
      last_name: participant.last_name,
      email: participant.email,
      phone: participant.phone || null,
      birthdate: participant.birthdate || null,
      street: participant.street || null,
      street_nr: participant.street_nr || null,
      zip: participant.zip || null,
      city: participant.city || null,
      status: 'confirmed',
      registered_at: new Date().toISOString(),
      tenant_id: profile.tenant_id,
      registered_by: profile.id,
    })
    .select('id')
    .single()

  if (enrollError || !enrollment) {
    logger.error('❌ Error creating enrollment:', enrollError)
    throw createError({ statusCode: 500, statusMessage: `Anmeldung konnte nicht erstellt werden: ${enrollError?.message}` })
  }

  // Send confirmation email to the customer (non-fatal)
  try {
    await $fetch('/api/emails/send-course-enrollment-confirmation', {
      method: 'POST',
      body: {
        courseRegistrationId: enrollment.id,
        paymentMethod: 'admin'
      }
    })
    logger.debug('✅ Confirmation email queued for:', participant.email)
  } catch (emailErr: any) {
    logger.warn('⚠️ Confirmation email failed (non-fatal):', emailErr.message)
  }

  logger.debug('✅ Participant enrolled:', userId)
  return { success: true, userId }
})
