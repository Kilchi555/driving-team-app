/**
 * GET /api/admin/tenants/[id]
 * Super-Admin tenant detail: health, billing, invites, SMS usage, setup diagnostics.
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantSmsQuotaSnapshot } from '~/server/utils/sms-quota'
import { getPlanById } from '~/utils/planFeatures'
import { logger } from '~/utils/logger'

async function verifySuperAdmin(event: any) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Nicht angemeldet' })

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    throw createError({ statusCode: 403, message: 'Super-Admin-Zugriff erforderlich' })
  }
  return profile
}

function daysFromNowIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default defineEventHandler(async (event) => {
  await verifySuperAdmin(event)
  const supabase = getSupabaseAdmin()
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Tenant-ID fehlt' })

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !tenant) {
    throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  }

  const nowIso = new Date().toISOString()
  const in7 = daysFromNowIso(7)
  const in14 = daysFromNowIso(14)
  const in30 = daysFromNowIso(30)

  const [
    adminsRes,
    staffListRes,
    clientsRes,
    invitesRes,
    apptsTotalRes,
    apptsFutureRes,
    smsSnapshot,
    locationsRes,
    calendarsRes,
    staffLocationsRes,
    workingHoursRes,
    slots7Res,
    slots14Res,
    slots30Res,
    lastSlotRes,
    queueRes,
    pickupSettingsRes,
    firstApptRes,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, is_active, created_at')
      .eq('tenant_id', id)
      .eq('role', 'admin')
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, is_active, category, created_at')
      .eq('tenant_id', id)
      .eq('role', 'staff')
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('role', 'client')
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('staff_invitations')
      .select('id, first_name, last_name, phone, email, status, expires_at, created_at, invitation_token')
      .eq('tenant_id', id)
      .in('status', ['pending', 'expired'])
      .order('created_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .gte('start_time', nowIso),
    getTenantSmsQuotaSnapshot(supabase, id).catch((err) => {
      logger.warn('SMS quota snapshot failed:', err?.message)
      return null
    }),
    supabase
      .from('locations')
      .select('id, name, address, formatted_address, postal_code, city, canton, is_active, location_type, pickup_enabled, pickup_radius_minutes, category_pickup_settings, available_categories, time_windows, staff_ids, latitude, longitude, public_bookable, created_at')
      .eq('tenant_id', id)
      .order('name', { ascending: true }),
    supabase
      .from('external_calendars')
      .select('id, staff_id, provider, connection_type, account_identifier, calendar_name, sync_enabled, last_sync_at, consecutive_failures, last_fetch_error, last_failure_at, ics_url, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('staff_locations')
      .select('id, staff_id, location_id, is_active, is_online_bookable, available_categories')
      .eq('tenant_id', id),
    supabase
      .from('staff_working_hours')
      .select('id, staff_id, day_of_week, is_active')
      .eq('tenant_id', id)
      .eq('is_active', true),
    supabase
      .from('availability_slots')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('is_available', true)
      .gte('start_time', nowIso)
      .lt('start_time', in7),
    supabase
      .from('availability_slots')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('is_available', true)
      .gte('start_time', nowIso)
      .lt('start_time', in14),
    supabase
      .from('availability_slots')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('is_available', true)
      .gte('start_time', nowIso)
      .lt('start_time', in30),
    supabase
      .from('availability_slots')
      .select('calculated_at, updated_at')
      .eq('tenant_id', id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('availability_recalc_queue')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', id)
      .eq('processed', false),
    supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', id)
      .eq('category', 'availability')
      .in('setting_key', ['allow_pickup_mode', 'default_pickup_radius_minutes']),
    supabase
      .from('appointments')
      .select('created_at, start_time')
      .eq('tenant_id', id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const staffList = staffListRes.data || []
  const pendingInvites = (invitesRes.data || []).filter((i) => i.status === 'pending')
  const locations = locationsRes.data || []
  const calendars = calendarsRes.data || []
  const staffLocations = staffLocationsRes.data || []
  const workingHours = workingHoursRes.data || []

  // Per-staff available slot counts (14d) — head counts, not full row loads
  const slots14ByStaff = new Map<string, number>()
  if (staffList.length > 0) {
    const slotCountResults = await Promise.all(
      staffList.map(async (s) => {
        const { count } = await supabase
          .from('availability_slots')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', id)
          .eq('staff_id', s.id)
          .eq('is_available', true)
          .gte('start_time', nowIso)
          .lt('start_time', in14)
        return { staffId: s.id, count: count || 0 }
      }),
    )
    for (const row of slotCountResults) {
      slots14ByStaff.set(row.staffId, row.count)
    }
  }

  // Busy-times counts per calendar (future window) — limited sample for last_end
  const busyByCalendar = new Map<string, { count: number; last_end: string | null }>()
  if (calendars.length > 0) {
    await Promise.all(
      calendars.map(async (c) => {
        const [{ count }, { data: lastBusy }] = await Promise.all([
          supabase
            .from('external_busy_times')
            .select('id', { count: 'exact', head: true })
            .eq('external_calendar_id', c.id)
            .gte('end_time', nowIso),
          supabase
            .from('external_busy_times')
            .select('end_time')
            .eq('external_calendar_id', c.id)
            .gte('end_time', nowIso)
            .order('end_time', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        busyByCalendar.set(c.id, {
          count: count || 0,
          last_end: lastBusy?.end_time || null,
        })
      }),
    )
  }

  const calendarsByStaff = new Map<string, typeof calendars>()
  for (const cal of calendars) {
    if (!cal.staff_id) continue
    const list = calendarsByStaff.get(cal.staff_id) || []
    list.push(cal)
    calendarsByStaff.set(cal.staff_id, list)
  }

  const locsByStaff = new Map<string, typeof staffLocations>()
  for (const sl of staffLocations) {
    const list = locsByStaff.get(sl.staff_id) || []
    list.push(sl)
    locsByStaff.set(sl.staff_id, list)
  }

  const hoursByStaff = new Map<string, number>()
  for (const wh of workingHours) {
    hoursByStaff.set(wh.staff_id, (hoursByStaff.get(wh.staff_id) || 0) + 1)
  }

  const setupStaff = staffList.map((s) => {
    const staffCals = calendarsByStaff.get(s.id) || []
    const primaryCal = staffCals.find((c) => c.sync_enabled !== false) || staffCals[0] || null
    const linkedLocs = locsByStaff.get(s.id) || []
    const activeLocs = linkedLocs.filter((l) => l.is_active !== false)
    const bookableLocs = activeLocs.filter((l) => l.is_online_bookable)
    const hoursCount = hoursByStaff.get(s.id) || 0
    const slots14 = slots14ByStaff.get(s.id) || 0
    const hasCalendar = staffCals.length > 0
    const calendarOk = hasCalendar && staffCals.some(
      (c) => c.sync_enabled !== false && (c.consecutive_failures ?? 0) < 3,
    )
    const calendarFailing = hasCalendar && staffCals.some((c) => (c.consecutive_failures ?? 0) >= 3)

    return {
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      phone: s.phone,
      is_active: s.is_active !== false,
      category: s.category || null,
      created_at: s.created_at,
      locations_count: activeLocs.length,
      bookable_locations_count: bookableLocs.length,
      working_hours_count: hoursCount,
      slots_next_14d: slots14,
      has_locations: activeLocs.length > 0,
      has_hours: hoursCount > 0,
      has_calendar: hasCalendar,
      has_future_slots: slots14 > 0,
      calendar: primaryCal
        ? {
            id: primaryCal.id,
            provider: primaryCal.provider,
            connection_type: primaryCal.connection_type,
            calendar_name: primaryCal.calendar_name,
            sync_enabled: primaryCal.sync_enabled !== false,
            last_sync_at: primaryCal.last_sync_at,
            consecutive_failures: primaryCal.consecutive_failures ?? 0,
            last_fetch_error: primaryCal.last_fetch_error,
            ok: calendarOk,
            failing: calendarFailing,
          }
        : null,
      calendars_count: staffCals.length,
    }
  })

  const setupCalendars = calendars.map((c) => {
    const busy = busyByCalendar.get(c.id) || { count: 0, last_end: null }
    const staff = staffList.find((s) => s.id === c.staff_id)
    return {
      id: c.id,
      staff_id: c.staff_id,
      staff_name: staff ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim() : null,
      provider: c.provider,
      connection_type: c.connection_type,
      account_identifier: c.account_identifier,
      calendar_name: c.calendar_name,
      sync_enabled: c.sync_enabled !== false,
      last_sync_at: c.last_sync_at,
      consecutive_failures: c.consecutive_failures ?? 0,
      last_fetch_error: c.last_fetch_error,
      last_failure_at: c.last_failure_at,
      has_ics_url: !!c.ics_url,
      busy_times_future: busy.count,
      busy_times_last_end: busy.last_end,
      ok: (c.consecutive_failures ?? 0) < 3 && c.sync_enabled !== false,
    }
  })

  const activeStaff = setupStaff.filter((s) => s.is_active)
  const staffWithLocations = activeStaff.filter((s) => s.has_locations).length
  const staffWithHours = activeStaff.filter((s) => s.has_hours).length
  const calendarsConnected = setupCalendars.filter((c) => c.sync_enabled).length
  const calendarsFailing = setupCalendars.filter((c) => c.consecutive_failures >= 3).length
  const slotsNext7 = slots7Res.count || 0
  const slotsNext14 = slots14Res.count || 0
  const slotsNext30 = slots30Res.count || 0
  const queuePending = queueRes.count || 0

  const whyEmpty: string[] = []
  if (activeStaff.length === 0) whyEmpty.push('Kein aktiver Staff')
  else if (staffWithLocations === 0) whyEmpty.push('Kein Staff mit verknüpften Locations')
  if (activeStaff.length > 0 && staffWithHours === 0) whyEmpty.push('Keine Working Hours hinterlegt')
  if (locations.length === 0) whyEmpty.push('Keine Locations vorhanden')
  if (calendarsFailing > 0) whyEmpty.push(`${calendarsFailing} Kalender mit Sync-Fehlern (≥3)`)
  if (queuePending > 0) whyEmpty.push(`${queuePending} Recalc-Jobs in der Queue`)
  if (slotsNext14 === 0 && whyEmpty.length === 0) {
    whyEmpty.push('Keine verfügbaren Slots (evtl. Lead-Time, Time-Windows oder Konflikte)')
  }

  const pickupMap = new Map(
    (pickupSettingsRes.data || []).map((r) => [r.setting_key, r.setting_value]),
  )
  const tenantPickup = {
    allow_pickup_mode: pickupMap.get('allow_pickup_mode') === 'true',
    default_pickup_radius_minutes: Number(pickupMap.get('default_pickup_radius_minutes') || 10),
  }

  const plan = tenant.subscription_plan || 'trial'
  const planDef = getPlanById(plan)
  const includedSeats = plan === 'trial' ? 3 : (planDef?.includedSeats ?? null)
  const addonSeats = tenant.addon_seats || 0
  const seatLimit = includedSeats === null ? null : includedSeats + addonSeats
  const usedSeats = activeStaff.length + pendingInvites.length

  const setupLocations = locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    address: loc.address || loc.formatted_address || null,
    postal_code: loc.postal_code,
    city: loc.city,
    canton: loc.canton,
    is_active: loc.is_active !== false,
    location_type: loc.location_type,
    pickup_enabled: !!loc.pickup_enabled,
    pickup_radius_minutes: loc.pickup_radius_minutes ?? 10,
    category_pickup_settings: loc.category_pickup_settings || {},
    available_categories: loc.available_categories || [],
    time_windows: loc.time_windows || null,
    staff_ids: loc.staff_ids || [],
    public_bookable: loc.public_bookable !== false,
    has_coords: loc.latitude != null && loc.longitude != null,
    latitude: loc.latitude,
    longitude: loc.longitude,
    created_at: loc.created_at,
  }))

  const firstAdminAt = adminsRes.data?.[0]?.created_at || null
  const firstStaffAt = staffList[0]?.created_at || null
  const firstCalendarSync = calendars
    .map((c) => c.last_sync_at || c.created_at)
    .filter(Boolean)
    .sort()[0] || null
  const firstSlotsAt = lastSlotRes.data?.calculated_at || null
  // lastSlotRes is newest; need earliest for timeline — fetch separately if needed
  let earliestSlotAt: string | null = null
  if (slotsNext30 > 0 || (apptsTotalRes.count || 0) > 0) {
    const { data: earliestSlot } = await supabase
      .from('availability_slots')
      .select('calculated_at')
      .eq('tenant_id', id)
      .order('calculated_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    earliestSlotAt = earliestSlot?.calculated_at || null
  }

  const checklist = {
    seats_ok: seatLimit === null || usedSeats <= seatLimit,
    has_active_staff: activeStaff.length > 0,
    has_locations: locations.filter((l) => l.is_active !== false).length > 0,
    has_hours: staffWithHours > 0,
    calendars_ok: calendarsConnected === 0 || calendarsFailing === 0,
    has_slots: slotsNext14 > 0,
    pickup_consistent:
      !tenantPickup.allow_pickup_mode ||
      locations.some((l) => l.is_active !== false && l.pickup_enabled),
  }

  return {
    success: true,
    tenant,
    health: {
      admin_count: adminsRes.data?.length || 0,
      staff_count: activeStaff.length,
      inactive_staff_count: setupStaff.filter((s) => !s.is_active).length,
      client_count: clientsRes.count || 0,
      pending_invites: pendingInvites.length,
      appointments_total: apptsTotalRes.count || 0,
      appointments_future: apptsFutureRes.count || 0,
      locations_count: locations.filter((l) => l.is_active !== false).length,
      calendars_connected: calendarsConnected,
      slots_next_14d: slotsNext14,
    },
    admins: adminsRes.data || [],
    invites: (invitesRes.data || []).map(({ invitation_token, ...rest }) => ({
      ...rest,
      has_token: !!invitation_token,
    })),
    sms: smsSnapshot,
    billing: {
      subscription_plan: tenant.subscription_plan,
      subscription_status: tenant.subscription_status,
      is_trial: tenant.is_trial,
      is_active: tenant.is_active,
      trial_ends_at: tenant.trial_ends_at,
      current_period_end: tenant.current_period_end,
      subscription_cancel_at: tenant.subscription_cancel_at,
      stripe_customer_id: tenant.stripe_customer_id,
      stripe_subscription_id: tenant.stripe_subscription_id,
      addon_seats: tenant.addon_seats || 0,
      addon_courses_enabled: !!tenant.addon_courses_enabled,
      addon_affiliate_enabled: !!tenant.addon_affiliate_enabled,
      addon_gbp_enabled: !!tenant.addon_gbp_enabled,
      customer_number: tenant.customer_number,
    },
    payments: {
      wallee_onboarding_status: tenant.wallee_onboarding_status,
      wallee_enabled: !!tenant.wallee_enabled,
      wallee_test_mode: !!tenant.wallee_test_mode,
      wallee_space_id: tenant.wallee_space_id,
      wallee_uid_number: tenant.wallee_uid_number,
      wallee_iban: tenant.wallee_iban,
    },
    comms: {
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone,
      twilio_from_sender: tenant.twilio_from_sender,
      from_email: tenant.from_email,
      resend_domain_verified: !!tenant.resend_domain_verified,
      contact_person_first_name: tenant.contact_person_first_name,
      contact_person_last_name: tenant.contact_person_last_name,
    },
    setup: {
      checklist,
      seats: {
        used: usedSeats,
        limit: seatLimit,
        included: includedSeats,
        addon: addonSeats,
        pending_invites: pendingInvites.length,
        active_staff: activeStaff.length,
      },
      staff: setupStaff,
      calendars: setupCalendars,
      availability: {
        slots_next_7d: slotsNext7,
        slots_next_14d: slotsNext14,
        slots_next_30d: slotsNext30,
        last_calculated_at: lastSlotRes.data?.calculated_at || null,
        queue_pending: queuePending,
        why_empty: whyEmpty,
        staff_with_locations: staffWithLocations,
        staff_with_hours: staffWithHours,
      },
      locations: setupLocations,
      tenant_pickup: tenantPickup,
      timeline: {
        tenant_created_at: tenant.created_at,
        first_admin_at: firstAdminAt,
        first_staff_at: firstStaffAt,
        first_calendar_sync_at: firstCalendarSync,
        first_slots_at: earliestSlotAt || firstSlotsAt,
        first_appointment_at: firstApptRes.data?.created_at || null,
      },
      readiness: {
        payments: {
          stripe: !!tenant.stripe_customer_id,
          wallee: !!tenant.wallee_enabled,
          wallee_status: tenant.wallee_onboarding_status || null,
        },
        comms: {
          domain_verified: !!tenant.resend_domain_verified,
          sms_sender: !!tenant.twilio_from_sender,
        },
      },
    },
  }
})
