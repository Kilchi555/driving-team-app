import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

interface CourseRegistrationPayload {
  tenant_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  faberid?: string
  birthdate?: string
  street?: string
  street_nr?: string
  zip?: string
  city?: string
  course_type: string
  course_dates?: string[]
  notes?: string
  company?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as CourseRegistrationPayload

    // Validation
    if (!body.tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })
    }
    if (!body.first_name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'first_name is required' })
    }
    if (!body.last_name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'last_name is required' })
    }
    if (!body.course_type?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'course_type is required' })
    }

    // Email validation if provided
    if (body.email && !body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
    }

    // Phone validation if provided
    if (body.phone && !body.phone.match(/^[\d\s\+\-\(\)]+$/)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid phone format' })
    }

    // Build notes with company and selected course dates
    let finalNotes = body.notes || ''
    if (body.company?.trim()) {
      finalNotes = `Firma: ${body.company}\n${finalNotes}`.trim()
    }
    if (body.course_dates && body.course_dates.length > 0) {
      finalNotes = `${finalNotes}\nGewünschte Kursdaten: ${body.course_dates.join(', ')}`.trim()
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('course_participants')
      .insert({
        tenant_id: body.tenant_id,
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        faberid: body.faberid?.trim() || null,
        birthdate: body.birthdate || null,
        street: body.street?.trim() || null,
        street_nr: body.street_nr?.trim() || null,
        zip: body.zip?.trim() || null,
        city: body.city?.trim() || null,
        course_type: body.course_type.trim(),
        notes: finalNotes || null,
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to create course registration',
      })
    }

    return {
      success: true,
      data,
      message: 'Course registration created successfully',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
})
