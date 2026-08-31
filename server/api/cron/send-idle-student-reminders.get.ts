// Daily idle-student reminders.
//
// For each tenant that enabled the setting, finds active clients who have not
// passed their exam and have had no appointment for the configured number of
// days (and no upcoming booking). Then queues:
//  - one email or SMS per client (channel chosen in booking policy)
//  - one digest per assigned staff (only if the tenant has 2+ staff)
//  - one digest per admin / tenant contact
//
// Dedup: same stage + recipient is skipped inside the tenant resend window.

import { createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { assertCronRequest } from '~/server/utils/cron-auth'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { getAccountAccessLink } from '~/server/utils/account-access-link'
import { getTenantsWithMultipleStaff } from '~/server/utils/tenant-staff-notify'
import { isStudentOutOfTraining } from '~/utils/student-exam'
import { filterIdleStudents } from '~/utils/student-appointment-activity'
import { fetchStudentAppointmentActivity } from '~/server/utils/student-appointment-activity-db'
import { buildIdleStopUrl } from '~/server/utils/idle-stop-token'
import {
  assignedStaffIdsForStudent,
  parseIdleStudentReminderSettings,
  resolveIdleStudentClientChannels
} from '~/server/utils/idle-student-reminder-settings'
import {
  buildIdleStudentClientEmail,
  buildIdleStudentClientSms,
  buildIdleStudentDigestEmail,
  type IdleStudentRow
} from '~/server/utils/idle-student-reminder-emails'

const CLIENT_PAGE = 1000
const STAGE_CLIENT = 'idle_student_reminder'
const STAGE_STAFF = 'idle_student_staff_digest'
const STAGE_ADMIN = 'idle_student_admin_digest'

async function fetchActiveClients(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string) {
  const rows: IdleStudentRow[] = []
  let from = 0

  while (from < CLIENT_PAGE * 20) {
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, category, exam_passed_categories, assigned_staff_id, assigned_staff_ids, onboarding_status, onboarding_token, onboarding_token_expires, auth_user_id, no_further_lessons_at')
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .eq('is_active', true)
      .not('auth_user_id', 'is', null)
      .is('deleted_at', null)
      .is('no_further_lessons_at', null)
      .range(from, from + CLIENT_PAGE - 1)

    if (error) throw error
    if (!data?.length) break
    rows.push(...(data as IdleStudentRow[]))
    if (data.length < CLIENT_PAGE) break
    from += CLIENT_PAGE
  }

  return rows.filter((student) => !isStudentOutOfTraining(student))
}

function alreadySentRecently(
  existing: Array<{ context_data?: any, created_at?: string }>,
  match: (ctx: any) => boolean,
  resendDays: number,
  now: Date
): boolean {
  const cutoff = now.getTime() - resendDays * 24 * 60 * 60 * 1000
  return existing.some((row) => {
    if (!match(row.context_data || {})) return false
    const created = row.created_at ? new Date(row.created_at).getTime() : 0
    return created >= cutoff
  })
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  assertCronRequest(event)

  const supabase = getSupabaseAdmin()
  const now = new Date()
  const query = getQuery(event)
  const testTenantId = typeof query.test_tenant_id === 'string' ? query.test_tenant_id : null
  const skipDedup = query.skip_dedup === '1'

  let tenantsQuery = supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_wide_url, logo_url, logo_square_url, contact_email, booking_policy')

  if (testTenantId) tenantsQuery = tenantsQuery.eq('id', testTenantId)

  const { data: tenants, error: tenantsError } = await tenantsQuery
  if (tenantsError) {
    logger.error('❌ idle-student-reminders: failed to load tenants', tenantsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load tenants' })
  }

  const enabledTenants = (tenants || []).filter((tenant: any) =>
    parseIdleStudentReminderSettings(tenant.booking_policy).enabled
  )

  if (!enabledTenants.length) {
    return { success: true, queued: 0, tenants: 0, duration_ms: Date.now() - startTime, message: 'No tenants with idle reminders enabled' }
  }

  const multiStaffTenants = await getTenantsWithMultipleStaff(
    supabase,
    enabledTenants.map((t: any) => t.id)
  )

  const { data: existingQueue } = await supabase
    .from('outbound_messages_queue')
    .select('context_data, created_at')
    .in('context_data->>stage' as any, [STAGE_CLIENT, STAGE_STAFF, STAGE_ADMIN])
    .in('status', ['pending', 'sending', 'sent'])
    .gte('created_at', new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())

  const existing = existingQueue || []
  const toInsert: any[] = []
  let skipped = 0

  for (const tenant of enabledTenants as any[]) {
    const settings = parseIdleStudentReminderSettings(tenant.booking_policy)
    const clients = await fetchActiveClients(supabase, tenant.id)
    if (!clients.length) continue

    const activityById = await fetchStudentAppointmentActivity(
      supabase,
      tenant.id,
      clients.map((c) => c.id),
      now
    )
    const idleStudents = filterIdleStudents(
      clients.map((c) => ({ ...c, category: (c as any).category, exam_passed_categories: (c as any).exam_passed_categories })),
      activityById,
      settings.idleDays,
      now
    )

    if (!idleStudents.length) continue

    const terms = await getTenantTerminology(supabase, tenant.id)
    const clientsPlural = terms.clientsPlural || 'Fahrschüler'
    const tenantName = tenant.name || 'Fahrschule'
    const primaryColor = tenant.primary_color || '#2563eb'
    const slug = tenant.slug || ''
    const bookingUrl = slug
      ? `https://app.simy.ch/booking/availability/${slug}`
      : 'https://app.simy.ch'
    const listUrl = 'https://app.simy.ch/customers'

    if (settings.notifyClient) {
      for (const student of idleStudents) {
        const { sendEmail, sendSms } = resolveIdleStudentClientChannels({
          channel: settings.clientChannel,
          hasEmail: !!student.email,
          hasPhone: !!student.phone
        })

        if (!sendEmail && !sendSms) {
          skipped += 1
          continue
        }
        if (!skipDedup && alreadySentRecently(
          existing,
          (ctx) => ctx.stage === STAGE_CLIENT && ctx.student_id === student.id,
          settings.resendDays,
          now
        )) {
          skipped += 1
          continue
        }

        if (sendEmail && student.email) {
          const access = await getAccountAccessLink(supabase, student, slug, {
            policy: tenant.booking_policy,
          })
          const pauseUrl = buildIdleStopUrl(student.id)
          const email = buildIdleStudentClientEmail({
            student,
            activity: activityById[student.id],
            tenantName,
            primaryColor,
            logoUrls: tenant,
            bookingUrl,
            accountUrl: access.canAccessAccount ? access.url : '',
            pauseUrl,
            contactEmail: tenant.contact_email,
            idleDays: settings.idleDays,
            clientsPlural
          })

          toInsert.push({
            tenant_id: tenant.id,
            channel: 'email',
            recipient_email: student.email,
            subject: email.subject,
            body: email.html,
            status: 'pending',
            send_at: now.toISOString(),
            context_data: {
              stage: STAGE_CLIENT,
              student_id: student.id,
              tenant_id: tenant.id,
              idle_days: settings.idleDays,
              channel: 'email'
            }
          })
        }

        if (sendSms && student.phone) {
          toInsert.push({
            tenant_id: tenant.id,
            channel: 'sms',
            recipient_phone: student.phone,
            body: buildIdleStudentClientSms({
              firstName: student.first_name,
              bookingUrl,
              pauseUrl: buildIdleStopUrl(student.id)
            }),
            status: 'pending',
            send_at: now.toISOString(),
            context_data: {
              stage: STAGE_CLIENT,
              student_id: student.id,
              tenant_id: tenant.id,
              idle_days: settings.idleDays,
              channel: 'sms'
            }
          })
        }
      }
    }

    const staffIds = [...new Set(idleStudents.flatMap((s) => assignedStaffIdsForStudent(s)))]
    const { data: staffUsers } = staffIds.length
      ? await supabase
          .from('users')
          .select('id, first_name, last_name, email, role, is_active')
          .in('id', staffIds)
          .eq('is_active', true)
          .is('deleted_at', null)
      : { data: [] as any[] }

    const staffById = new Map((staffUsers || []).map((s: any) => [s.id, s]))
    const staffNameById: Record<string, string> = {}
    for (const staff of staffUsers || []) {
      staffNameById[staff.id] = [staff.first_name, staff.last_name].filter(Boolean).join(' ') || 'Staff'
    }

    if (settings.notifyStaff && multiStaffTenants.has(tenant.id)) {
      const byStaff = new Map<string, IdleStudentRow[]>()
      for (const student of idleStudents) {
        for (const staffId of assignedStaffIdsForStudent(student)) {
          if (!staffById.has(staffId)) continue
          if (!byStaff.has(staffId)) byStaff.set(staffId, [])
          byStaff.get(staffId)!.push(student)
        }
      }

      for (const [staffId, students] of byStaff) {
        const staff = staffById.get(staffId)
        if (!staff?.email) {
          skipped += 1
          continue
        }
        if (!skipDedup && alreadySentRecently(
          existing,
          (ctx) => ctx.stage === STAGE_STAFF && ctx.staff_id === staffId,
          settings.resendDays,
          now
        )) {
          skipped += 1
          continue
        }

        const email = buildIdleStudentDigestEmail({
          recipientFirstName: staff.first_name || '',
          students,
          activityById,
          staffNameById,
          showStaff: false,
          tenantName,
          primaryColor,
          logoUrls: tenant,
          listUrl,
          idleDays: settings.idleDays,
          clientsPlural,
          now
        })

        toInsert.push({
          tenant_id: tenant.id,
          channel: 'email',
          recipient_email: staff.email,
          subject: email.subject,
          body: email.html,
          status: 'pending',
          send_at: now.toISOString(),
          context_data: {
            stage: STAGE_STAFF,
            staff_id: staffId,
            tenant_id: tenant.id,
            count: students.length,
            idle_days: settings.idleDays
          }
        })
      }
    }

    if (settings.notifyAdmin) {
      const { data: admins } = await supabase
        .from('users')
        .select('id, first_name, email')
        .eq('tenant_id', tenant.id)
        .in('role', ['admin', 'tenant_admin'])
        .eq('is_active', true)
        .is('deleted_at', null)

      const adminRecipients = new Map<string, string>()
      for (const admin of admins || []) {
        if (admin.email) adminRecipients.set(admin.email.toLowerCase(), admin.first_name || '')
      }
      if (tenant.contact_email) {
        const key = String(tenant.contact_email).toLowerCase()
        if (!adminRecipients.has(key)) adminRecipients.set(key, '')
      }

      const email = buildIdleStudentDigestEmail({
        recipientFirstName: '',
        students: idleStudents,
        activityById,
        staffNameById,
        showStaff: true,
        tenantName,
        primaryColor,
        logoUrls: tenant,
        listUrl,
        idleDays: settings.idleDays,
        clientsPlural,
        now
      })

      for (const [recipientEmail, firstName] of adminRecipients) {
        if (!skipDedup && alreadySentRecently(
          existing,
          (ctx) => ctx.stage === STAGE_ADMIN && ctx.tenant_id === tenant.id && ctx.recipient_email === recipientEmail,
          settings.resendDays,
          now
        )) {
          skipped += 1
          continue
        }

        const personalized = firstName
          ? buildIdleStudentDigestEmail({
              recipientFirstName: firstName,
              students: idleStudents,
              activityById,
              staffNameById,
              showStaff: true,
              tenantName,
              primaryColor,
              logoUrls: tenant,
              listUrl,
              idleDays: settings.idleDays,
              clientsPlural,
              now
            })
          : email

        toInsert.push({
          tenant_id: tenant.id,
          channel: 'email',
          recipient_email: recipientEmail,
          subject: personalized.subject,
          body: personalized.html,
          status: 'pending',
          send_at: now.toISOString(),
          context_data: {
            stage: STAGE_ADMIN,
            tenant_id: tenant.id,
            recipient_email: recipientEmail,
            count: idleStudents.length,
            idle_days: settings.idleDays
          }
        })
      }
    }

    logger.debug(`📬 idle-student-reminders ${tenant.id}: ${idleStudents.length} idle, queued so far ${toInsert.length}`)
  }

  if (!toInsert.length) {
    return {
      success: true,
      queued: 0,
      skipped,
      tenants: enabledTenants.length,
      duration_ms: Date.now() - startTime,
      message: 'No idle-student reminders due'
    }
  }

  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ idle-student-reminders: failed to queue emails', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue idle-student reminders' })
  }

  return {
    success: true,
    queued: toInsert.length,
    skipped,
    tenants: enabledTenants.length,
    duration_ms: Date.now() - startTime
  }
})
