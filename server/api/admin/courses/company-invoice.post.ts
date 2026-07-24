/**
 * POST /api/admin/courses/company-invoice
 * Create one collective invoice for all uninvoiced participants of a Firmenkurs.
 *
 * Body: { courseId, sendEmail?: boolean }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { createCompanyCourseInvoice } from '~/server/utils/course-enrollment-billing'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const courseId = body?.courseId as string
  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const result = await createCompanyCourseInvoice({
    tenantId: profile.tenant_id,
    adminUserId: profile.id,
    courseId,
    sendEmail: body?.sendEmail === true,
  })

  return { success: true, ...result }
})
