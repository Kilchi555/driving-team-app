/**
 * Shared admin course enrollment helpers.
 * SARI is best-effort: missing credentials or missing faberid/birthdate → local only.
 */
import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { SARIClient } from '~/utils/sariClient'
import { logger } from '~/utils/logger'

export type AdminPaymentOption = 'cash' | 'invoice' | 'paid' | 'reserve' | 'online_link'
export type AdminEnrollmentType = 'full' | 'partial' | 'individual'
export type AdminInvoiceAction = 'later' | 'pdf' | 'email'

export interface AdminEnrollParticipant {
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  birthdate?: string | null
  street?: string | null
  street_nr?: string | null
  zip?: string | null
  city?: string | null
  faberid?: string | null
}

export interface AdminEnrollOptions {
  tenantId: string
  adminUserId: string
  courseId: string
  participant: AdminEnrollParticipant
  userId?: string | null
  paymentOption: AdminPaymentOption
  /** Only for paymentOption=invoice (individual billing). Default: later */
  invoiceAction?: AdminInvoiceAction
  enrollmentType?: AdminEnrollmentType
  partialStartPosition?: number
  individualSessionNumber?: number
}

export interface AdminEnrollResult {
  success: true
  enrollmentId: string
  userId: string
  paymentOption: AdminPaymentOption
  paymentId?: string | null
  invoiceId?: string | null
  invoiceNumber?: string | null
  billingMode?: 'individual' | 'company_collective'
  sari: {
    attempted: boolean
    synced: boolean
    skippedReason?: 'reserve' | 'no_credentials' | 'missing_data' | 'not_sari_course' | 'error'
    message?: string
  }
  paymentUrl?: string | null
  emailSent?: boolean
  warning?: string
}

function mapPaymentFields(option: AdminPaymentOption): {
  payment_method: string | null
  payment_status: string
  amount_paid_rappen: number | null
} {
  switch (option) {
    case 'cash':
      return { payment_method: 'cash_on_site', payment_status: 'pending', amount_paid_rappen: 0 }
    case 'invoice':
      return { payment_method: 'invoice', payment_status: 'pending', amount_paid_rappen: 0 }
    case 'paid':
      return { payment_method: 'admin', payment_status: 'paid', amount_paid_rappen: null }
    case 'reserve':
      return { payment_method: 'reserved', payment_status: 'pending', amount_paid_rappen: 0 }
    case 'online_link':
      return { payment_method: 'wallee', payment_status: 'pending', amount_paid_rappen: 0 }
  }
}

function mapEmailPaymentMethod(option: AdminPaymentOption): 'cash' | 'invoice' | 'admin' | 'wallee' | 'paid' | 'reserve' {
  if (option === 'cash') return 'cash'
  if (option === 'invoice') return 'invoice'
  if (option === 'paid') return 'paid'
  if (option === 'reserve') return 'reserve'
  if (option === 'online_link') return 'wallee'
  return 'admin'
}

async function resolveOrCreateUser(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  adminUserId: string,
  participant: AdminEnrollParticipant,
  existingUserId?: string | null
): Promise<{ userId: string; user: any }> {
  if (existingUserId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, birthdate, street, street_nr, zip, city, faberid')
      .eq('id', existingUserId)
      .eq('tenant_id', tenantId)
      .single()
    if (error || !user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

    const updates: Record<string, any> = {}
    if (!user.faberid && participant.faberid) updates.faberid = participant.faberid.replace(/\./g, '')
    if (!user.birthdate && participant.birthdate) updates.birthdate = participant.birthdate
    if (!user.phone && participant.phone) updates.phone = participant.phone
    if (!user.street && participant.street) updates.street = participant.street
    if (!user.street_nr && participant.street_nr) updates.street_nr = participant.street_nr
    if (!user.zip && participant.zip) updates.zip = participant.zip
    if (!user.city && participant.city) updates.city = participant.city
    if (Object.keys(updates).length > 0) {
      await supabase.from('users').update(updates).eq('id', user.id)
    }
    return { userId: user.id, user: { ...user, ...updates } }
  }

  const email = participant.email.trim().toLowerCase()

  // Same email may exist at another tenant — only reuse within this tenant
  const { data: existingSameTenant } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone, birthdate, street, street_nr, zip, city, faberid, tenant_id, is_active')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingSameTenant) {
    return resolveOrCreateUser(supabase, tenantId, adminUserId, participant, existingSameTenant.id)
  }

  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      first_name: participant.first_name,
      last_name: participant.last_name,
      email,
      phone: participant.phone || null,
      birthdate: participant.birthdate || null,
      street: participant.street || null,
      street_nr: participant.street_nr || null,
      zip: participant.zip || null,
      city: participant.city || null,
      faberid: participant.faberid ? participant.faberid.replace(/\./g, '') : null,
      role: 'client',
      tenant_id: tenantId,
      is_active: true,
      created_by: adminUserId,
    })
    .select('id, first_name, last_name, email, phone, birthdate, street, street_nr, zip, city, faberid')
    .single()

  if (userError || !newUser) {
    const msg = userError?.message || ''
    if (msg.includes('users_email_tenant_unique') || msg.includes('duplicate key')) {
      // Race: created concurrently in this tenant
      const { data: raced } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, birthdate, street, street_nr, zip, city, faberid')
        .eq('tenant_id', tenantId)
        .ilike('email', email)
        .limit(1)
        .maybeSingle()
      if (raced) return { userId: raced.id, user: raced }
      throw createError({
        statusCode: 409,
        statusMessage: 'Diese E-Mail ist in dieser Fahrschule bereits registriert.',
      })
    }
    throw createError({ statusCode: 500, statusMessage: `Benutzer konnte nicht erstellt werden: ${msg}` })
  }
  return { userId: newUser.id, user: newUser }
}

async function trySariEnroll(opts: {
  tenantId: string
  course: any
  faberid: string | null | undefined
  birthdate: string | null | undefined
  paymentOption: AdminPaymentOption
  enrollmentType: AdminEnrollmentType
  partialStartPosition?: number
}): Promise<AdminEnrollResult['sari']> {
  if (opts.paymentOption === 'reserve') {
    return { attempted: false, synced: false, skippedReason: 'reserve', message: 'Platz reserviert — nicht in SARI eingetragen' }
  }
  if (!opts.course?.sari_managed) {
    return { attempted: false, synced: false, skippedReason: 'not_sari_course' }
  }

  const faberidClean = (opts.faberid || '').replace(/\./g, '')
  if (!faberidClean || !opts.birthdate) {
    return {
      attempted: false,
      synced: false,
      skippedReason: 'missing_data',
      message: 'Keine Faber-ID/Geburtsdatum — lokal angemeldet, nicht in SARI',
    }
  }

  const credentials = await getSARICredentialsSecure(opts.tenantId, 'ADMIN_COURSE_ENROLL')
  if (!credentials) {
    return {
      attempted: false,
      synced: false,
      skippedReason: 'no_credentials',
      message: 'Keine SARI-Zugangsdaten — lokal angemeldet, Sync später möglich',
    }
  }

  try {
    const sari = new SARIClient(credentials)
    const sessions: any[] = opts.course.course_sessions || []
    let relevant = sessions.filter((s: any) => s.sari_session_id)

    if (opts.enrollmentType === 'partial') {
      const start = opts.partialStartPosition ?? 3
      relevant = relevant.filter((s: any) => (s.session_number ?? 99) >= start)
    } else if (opts.enrollmentType === 'individual' && opts.partialStartPosition) {
      // reuse partialStartPosition slot for individual session number when set that way
      relevant = relevant.filter((s: any) => s.session_number === opts.partialStartPosition)
    }

    // Fallback: parse group course id sessions from sari_course_id if no per-session ids
    let sessionIds = relevant
      .map((s: any) => String(s.sari_session_id).replace(/\D/g, ''))
      .filter(Boolean)
      .map((id: string) => parseInt(id, 10))
      .filter((n: number) => !isNaN(n) && n > 0)

    if (sessionIds.length === 0 && opts.course.sari_course_id) {
      const groupId = parseInt(String(opts.course.sari_course_id).replace(/\D/g, ''), 10)
      if (!isNaN(groupId) && groupId > 0) sessionIds = [groupId]
    }

    if (sessionIds.length === 0) {
      return {
        attempted: true,
        synced: false,
        skippedReason: 'error',
        message: 'Keine SARI-Session-IDs am Kurs — lokal angemeldet',
      }
    }

    let successCount = 0
    for (const sessionId of sessionIds) {
      try {
        await sari.enrollStudent(sessionId, faberidClean, opts.birthdate)
        successCount++
      } catch (err: any) {
        const msg = err?.message || ''
        if (msg.includes('ALREADY_ENROLLED') || msg.includes('PERSON_ALREADY_ADDED')) {
          successCount++
        } else {
          logger.warn(`⚠️ Admin SARI enroll session ${sessionId} failed:`, msg)
        }
      }
    }

    if (successCount === 0) {
      return {
        attempted: true,
        synced: false,
        skippedReason: 'error',
        message: 'SARI-Anmeldung fehlgeschlagen — lokal trotzdem angemeldet',
      }
    }

    return { attempted: true, synced: true }
  } catch (err: any) {
    logger.warn('⚠️ Admin SARI enroll failed (non-fatal):', err?.message)
    return {
      attempted: true,
      synced: false,
      skippedReason: 'error',
      message: err?.message || 'SARI-Fehler — lokal angemeldet',
    }
  }
}

export async function adminEnrollInCourse(opts: AdminEnrollOptions): Promise<AdminEnrollResult> {
  const supabase = getSupabaseAdmin()
  const paymentOption = opts.paymentOption
  const enrollmentType = opts.enrollmentType || 'full'
  const invoiceAction = opts.invoiceAction || 'later'

  if (!opts.courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })
  if (!paymentOption) throw createError({ statusCode: 400, statusMessage: 'Zahlungsart erforderlich' })
  if (!opts.participant?.email && !opts.userId) {
    throw createError({ statusCode: 400, statusMessage: 'E-Mail oder bestehender Kunde erforderlich' })
  }

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select(`
      id, name, tenant_id, sari_managed, sari_course_id, price_per_participant_rappen, max_participants,
      company_id, billing_mode,
      course_category:course_categories(allow_partial_enrollment, partial_start_position, partial_price_rappen),
      course_sessions(id, session_number, sari_session_id, start_time, end_time, allow_individual_booking, individual_price_rappen)
    `)
    .eq('id', opts.courseId)
    .eq('tenant_id', opts.tenantId)
    .single()

  if (courseErr || !course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  const isCompanyCollective =
    (course as any).billing_mode === 'company_collective' && !!(course as any).company_id

  // Firmenkurs: Teilnehmer ohne Einzelabrechnung / Online-Link
  if (isCompanyCollective) {
    if (paymentOption === 'online_link') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Online-Link nicht möglich bei Firmenkurs — Sammelrechnung an die Firma',
      })
    }
    // Keep cash/paid/reserve if explicitly chosen; default invoice → company pending
    if (paymentOption === 'invoice') {
      // handled below without individual invoiceAction
    }
  }

  // Capacity
  const { count: activeCount } = await supabase
    .from('course_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', opts.courseId)
    .neq('status', 'cancelled')
    .is('deleted_at', null)

  if ((activeCount || 0) >= (course.max_participants || 0)) {
    throw createError({ statusCode: 409, statusMessage: 'Kurs ist bereits ausgebucht' })
  }

  const { userId, user } = await resolveOrCreateUser(
    supabase,
    opts.tenantId,
    opts.adminUserId,
    opts.participant,
    opts.userId
  )

  // Link participant to course company when collective billing
  if (isCompanyCollective && (course as any).company_id) {
    await supabase
      .from('users')
      .update({ company_id: (course as any).company_id })
      .eq('id', userId)
      .eq('tenant_id', opts.tenantId)
      .is('company_id', null)
  }

  const firstName = opts.participant.first_name || user.first_name
  const lastName = opts.participant.last_name || user.last_name
  const email = (opts.participant.email || user.email || '').trim().toLowerCase()
  const phone = opts.participant.phone || user.phone || null
  const birthdate = opts.participant.birthdate || user.birthdate || null
  const faberid = (opts.participant.faberid || user.faberid || null)?.replace(/\./g, '') || null

  // Duplicate checks
  if (faberid) {
    const { data: dupF } = await supabase
      .from('course_registrations')
      .select('id')
      .eq('course_id', opts.courseId)
      .eq('sari_faberid', faberid)
      .in('status', ['confirmed', 'pending'])
      .is('deleted_at', null)
      .maybeSingle()
    if (dupF) throw createError({ statusCode: 409, statusMessage: 'Dieser Kunde ist bereits für diesen Kurs angemeldet' })
  }
  if (email) {
    const { data: dupE } = await supabase
      .from('course_registrations')
      .select('id')
      .eq('course_id', opts.courseId)
      .eq('email', email)
      .in('status', ['confirmed', 'pending'])
      .is('deleted_at', null)
      .maybeSingle()
    if (dupE) throw createError({ statusCode: 409, statusMessage: 'Diese E-Mail ist bereits für diesen Kurs angemeldet' })
  }

  const paymentFields = isCompanyCollective && paymentOption === 'invoice'
    ? { payment_method: 'company', payment_status: 'pending', amount_paid_rappen: 0 }
    : mapPaymentFields(paymentOption)
  const registrationStatus = paymentOption === 'online_link' ? 'pending' : 'confirmed'
  const category = course.course_category as any
  const partialStart =
    opts.partialStartPosition ||
    category?.partial_start_position ||
    3

  let amountRappen = course.price_per_participant_rappen || 0
  if (enrollmentType === 'partial' && category?.partial_price_rappen != null) {
    amountRappen = category.partial_price_rappen
  }
  if (enrollmentType === 'individual' && opts.individualSessionNumber) {
    const sess = (course.course_sessions || []).find(
      (s: any) => s.session_number === opts.individualSessionNumber
    )
    if (sess?.individual_price_rappen != null) amountRappen = sess.individual_price_rappen
  }
  if (paymentOption === 'paid' && paymentFields.amount_paid_rappen == null) {
    paymentFields.amount_paid_rappen = amountRappen
  }
  if (isCompanyCollective && paymentOption === 'invoice') {
    paymentFields.amount_paid_rappen = amountRappen
  }

  // SARI: skip until paid for online_link (webhook / later backfill); reserve never SARI
  const sariResult =
    paymentOption === 'online_link'
      ? {
          attempted: false,
          synced: false,
          skippedReason: 'reserve' as const,
          message: 'SARI nach Zahlung (Online-Link)',
        }
      : await trySariEnroll({
          tenantId: opts.tenantId,
          course,
          faberid,
          birthdate,
          paymentOption,
          enrollmentType,
          partialStartPosition:
            enrollmentType === 'individual' ? opts.individualSessionNumber : partialStart,
        })

  const { data: enrollment, error: enrollError } = await supabase
    .from('course_registrations')
    .insert({
      course_id: opts.courseId,
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      birthdate,
      street: opts.participant.street || user.street || null,
      street_nr: opts.participant.street_nr || user.street_nr || null,
      zip: opts.participant.zip || user.zip || null,
      city: opts.participant.city || user.city || null,
      sari_faberid: faberid,
      sari_synced: sariResult.synced,
      sari_synced_at: sariResult.synced ? new Date().toISOString() : null,
      status: registrationStatus,
      payment_method: paymentFields.payment_method,
      payment_status: paymentFields.payment_status,
      amount_paid_rappen: paymentFields.amount_paid_rappen,
      is_partial_enrollment: enrollmentType === 'partial' || enrollmentType === 'individual',
      partial_start_session: enrollmentType === 'partial' ? partialStart : null,
      individual_session_number: enrollmentType === 'individual' ? opts.individualSessionNumber || null : null,
      registered_at: new Date().toISOString(),
      tenant_id: opts.tenantId,
      registered_by: opts.adminUserId,
    })
    .select('id')
    .single()

  if (enrollError || !enrollment) {
    throw createError({
      statusCode: 500,
      statusMessage: `Anmeldung konnte nicht erstellt werden: ${enrollError?.message}`,
    })
  }

  // Recount participants
  const { count: newCount } = await supabase
    .from('course_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', opts.courseId)
    .neq('status', 'cancelled')
    .is('deleted_at', null)
  await supabase
    .from('courses')
    .update({ current_participants: newCount || 0 })
    .eq('id', opts.courseId)

  let paymentUrl: string | null = null
  let emailSent = false
  let warning: string | undefined = sariResult.message
  let paymentId: string | null = null
  let invoiceId: string | null = null
  let invoiceNumber: string | null = null

  // Individual billing: always create a payments row (online_link creates its own via process-public)
  if (!isCompanyCollective) {
    try {
      const { createEnrollmentPayment, createIndividualCourseInvoice } = await import(
        '~/server/utils/course-enrollment-billing'
      )
      const pay = await createEnrollmentPayment({
        tenantId: opts.tenantId,
        adminUserId: opts.adminUserId,
        userId,
        enrollmentId: enrollment.id,
        courseId: opts.courseId,
        courseName: course.name,
        amountRappen,
        paymentOption,
      })
      paymentId = pay?.paymentId || null

      if (
        paymentOption === 'invoice' &&
        paymentId &&
        (invoiceAction === 'pdf' || invoiceAction === 'email')
      ) {
        const inv = await createIndividualCourseInvoice({
          tenantId: opts.tenantId,
          adminUserId: opts.adminUserId,
          userId,
          enrollmentId: enrollment.id,
          paymentId,
          courseName: course.name,
          amountRappen,
          participant: {
            first_name: firstName,
            last_name: lastName,
            email,
            street: opts.participant.street || user.street,
            street_nr: opts.participant.street_nr || user.street_nr,
            zip: opts.participant.zip || user.zip,
            city: opts.participant.city || user.city,
          },
          sendEmail: invoiceAction === 'email',
        })
        invoiceId = inv.invoiceId
        invoiceNumber = inv.invoiceNumber
        if (invoiceAction === 'email') emailSent = true
      } else if (paymentOption === 'invoice' && invoiceAction === 'later') {
        warning = [warning, 'Pendentes Payment erstellt — Rechnung später'].filter(Boolean).join(' · ')
      }
    } catch (billErr: any) {
      logger.warn('⚠️ Enrollment billing failed:', billErr?.message)
      warning = [warning, billErr?.statusMessage || billErr?.message || 'Payment/Rechnung fehlgeschlagen']
        .filter(Boolean)
        .join(' · ')
    }
  } else if (paymentOption === 'invoice') {
    warning = [warning, 'Auf Firmen-Sammelrechnung gebucht (noch keine Rechnung)'].filter(Boolean).join(' · ')
  }

  if (paymentOption === 'online_link') {
    if (!email) {
      throw createError({ statusCode: 400, statusMessage: 'E-Mail erforderlich für Online-Zahlungslink' })
    }
    try {
      const payRes: any = await $fetch('/api/payments/process-public', {
        method: 'POST',
        body: {
          enrollmentId: enrollment.id,
          // process-public expects rappen (same as enroll-wallee)
          amount: Math.max(amountRappen, 5),
          currency: 'CHF',
          customerEmail: email,
          customerName: `${firstName || ''} ${lastName || ''}`.trim() || 'Kunde',
          courseId: opts.courseId,
          tenantId: opts.tenantId,
          userId,
          metadata: {
            admin_enroll: true,
            course_name: course.name,
            sari_faberid: faberid,
            sari_birthdate: birthdate,
            is_partial_enrollment: enrollmentType === 'partial',
            individual_session_number: opts.individualSessionNumber || null,
          },
        },
      })
      paymentUrl = payRes?.paymentUrl || payRes?.payment_url || null
      paymentId = payRes?.paymentId || payRes?.payment_id || paymentId
    } catch (payErr: any) {
      logger.warn('⚠️ Online payment link creation failed:', payErr?.message)
      warning = [warning, 'Online-Zahlungslink konnte nicht erstellt werden'].filter(Boolean).join(' · ')
    }

    if (paymentUrl) {
      try {
        const { sendTenantEmail } = await import('~/server/utils/email')
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, primary_color, logo_url')
          .eq('id', opts.tenantId)
          .single()
        const tenantName = tenant?.name || 'Ihre Fahrschule'
        const brand = tenant?.primary_color || '#1E40AF'
        const totalCHF = (amountRappen / 100).toFixed(2)
        const html = `<!DOCTYPE html><html lang="de"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
          <table width="600" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
            <tr><td style="background:${brand};padding:28px 36px;color:#fff;">
              <h1 style="margin:0;font-size:20px;">${tenantName}</h1>
              <p style="margin:6px 0 0;opacity:.9;font-size:14px;">Zahlungseinladung Kurs</p>
            </td></tr>
            <tr><td style="padding:32px 36px;">
              <p style="margin:0 0 12px;font-size:16px;color:#111;">Guten Tag${firstName ? ` ${firstName}` : ''},</p>
              <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
                Für den Kurs <strong style="color:#111;">${course.name}</strong> ist eine Zahlung über CHF ${totalCHF} vorbereitet.
              </p>
              <p style="text-align:center;margin:28px 0;">
                <a href="${paymentUrl}" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;">Jetzt bezahlen</a>
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">Kein Login nötig. Bei Fragen antworten Sie einfach auf diese E-Mail.</p>
            </td></tr>
          </table></td></tr></table></body></html>`

        await sendTenantEmail(opts.tenantId, {
          to: email,
          subject: `Zahlung: ${course.name} – ${tenantName}`,
          html,
        })
        emailSent = true
      } catch (mailErr: any) {
        logger.warn('⚠️ Payment link email failed:', mailErr?.message)
        warning = [warning, 'Zahlungslink erstellt, E-Mail fehlgeschlagen'].filter(Boolean).join(' · ')
      }
    }
  } else if (paymentOption !== 'reserve' && !(paymentOption === 'invoice' && invoiceAction === 'email')) {
    // Confirmation email (non-fatal) — skip for reserve; skip when invoice email already sent
    try {
      await $fetch('/api/emails/send-course-enrollment-confirmation', {
        method: 'POST',
        body: {
          courseRegistrationId: enrollment.id,
          paymentMethod: mapEmailPaymentMethod(paymentOption),
          totalAmount: amountRappen / 100,
        },
      })
      emailSent = true
    } catch (emailErr: any) {
      logger.warn('⚠️ Confirmation email failed (non-fatal):', emailErr?.message)
    }
  }

  return {
    success: true,
    enrollmentId: enrollment.id,
    userId,
    paymentOption,
    paymentId,
    invoiceId,
    invoiceNumber,
    billingMode: isCompanyCollective ? 'company_collective' : 'individual',
    sari: sariResult,
    paymentUrl,
    emailSent,
    warning,
  }
}
