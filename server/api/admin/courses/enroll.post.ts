/**
 * POST /api/admin/courses/enroll
 * Unified admin enrollment: existing or new customer, with required payment option.
 *
 * Body:
 *   courseId, paymentOption ('cash'|'invoice'|'paid'|'reserve'|'online_link')
 *   userId? OR participant { first_name, last_name, email, ... }
 *   enrollmentType? ('full'|'partial'|'individual')
 *   partialStartPosition?, individualSessionNumber?
 *   faberid?, birthdate? (also accepted on participant)
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import {
  adminEnrollInCourse,
  type AdminPaymentOption,
  type AdminEnrollmentType,
  type AdminInvoiceAction,
} from '~/server/utils/admin-course-enroll'

const PAYMENT_OPTIONS: AdminPaymentOption[] = ['cash', 'invoice', 'paid', 'reserve', 'online_link']
const INVOICE_ACTIONS: AdminInvoiceAction[] = ['later', 'pdf', 'email']

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)

  const paymentOption = body?.paymentOption as AdminPaymentOption
  if (!PAYMENT_OPTIONS.includes(paymentOption)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Zahlungsart wählen: cash, invoice, paid, reserve oder online_link',
    })
  }

  const invoiceAction = (body?.invoiceAction as AdminInvoiceAction) || 'later'
  if (paymentOption === 'invoice' && !INVOICE_ACTIONS.includes(invoiceAction)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'invoiceAction muss later, pdf oder email sein',
    })
  }

  const courseId = body?.courseId as string
  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const userId = body?.userId as string | undefined
  const participant = body?.participant || {}

  // Allow top-level faberid/birthdate shortcuts
  if (body?.faberid && !participant.faberid) participant.faberid = body.faberid
  if (body?.birthdate && !participant.birthdate) participant.birthdate = body.birthdate

  if (!userId) {
    if (!participant.email) throw createError({ statusCode: 400, statusMessage: 'E-Mail erforderlich' })
    if (!participant.first_name || !participant.last_name) {
      throw createError({ statusCode: 400, statusMessage: 'Vor- und Nachname erforderlich' })
    }
  }

  return await adminEnrollInCourse({
    tenantId: profile.tenant_id,
    adminUserId: profile.id,
    courseId,
    userId: userId || null,
    participant: {
      first_name: participant.first_name || '',
      last_name: participant.last_name || '',
      email: participant.email || '',
      phone: participant.phone || null,
      birthdate: participant.birthdate || null,
      street: participant.street || null,
      street_nr: participant.street_nr || null,
      zip: participant.zip || null,
      city: participant.city || null,
      faberid: participant.faberid || null,
    },
    paymentOption,
    invoiceAction: paymentOption === 'invoice' ? invoiceAction : undefined,
    enrollmentType: (body?.enrollmentType as AdminEnrollmentType) || 'full',
    partialStartPosition: body?.partialStartPosition ? Number(body.partialStartPosition) : undefined,
    individualSessionNumber: body?.individualSessionNumber
      ? Number(body.individualSessionNumber)
      : undefined,
  })
})
