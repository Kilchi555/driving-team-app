import { getSupabaseServerWithSession } from '~/utils/supabase'

/**
 * Create a new course participant
 * This is separate from users - participants can later be linked to users when they register
 */
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

  // Validate required fields
  if (!body.first_name || !body.last_name) {
    throw createError({
      statusCode: 400,
      message: 'first_name and last_name are required'
    })
  }

  // Get user's tenant and check permissions
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tenant_id, role, id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single()

  if (userError || !userData) {
    throw createError({
      statusCode: 403,
      message: 'User not found or inactive'
    })
  }

  // Only admin, staff, and superadmin can create participants
  if (!['admin', 'staff', 'superadmin'].includes(userData.role)) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions to create participants'
    })
  }

  // Check if participant with same faberid already exists
  if (body.faberid) {
    const { data: existing } = await supabase
      .from('course_participants')
      .select('id, first_name, last_name')
      .eq('tenant_id', userData.tenant_id)
      .eq('faberid', body.faberid)
      .maybeSingle()

    if (existing) {
      throw createError({
        statusCode: 409,
        message: `Participant with faberid ${body.faberid} already exists: ${existing.first_name} ${existing.last_name}`
      })
    }
  }

  // Prepare participant data
  const participantData: any = {
    tenant_id: userData.tenant_id,
    first_name: body.first_name,
    last_name: body.last_name,
    created_by: userData.id
  }

  // Add optional fields
  if (body.email) participantData.email = body.email
  if (body.phone) participantData.phone = body.phone
  if (body.birthdate) participantData.birthdate = body.birthdate
  if (body.faberid) participantData.faberid = body.faberid
  if (body.street) participantData.street = body.street
  if (body.street_nr) participantData.street_nr = body.street_nr
  if (body.zip) participantData.zip = body.zip
  if (body.city) participantData.city = body.city
  if (body.notes) participantData.notes = body.notes

  // Create participant
  const { data: participant, error: createError } = await supabase
    .from('course_participants')
    .insert(participantData)
    .select('*')
    .single()

  if (createError) {
    console.error('Error creating participant:', createError)
    throw createError({
      statusCode: 500,
      message: `Failed to create participant: ${createError.message}`
    })
  }

  return {
    success: true,
    participant
  }
})

