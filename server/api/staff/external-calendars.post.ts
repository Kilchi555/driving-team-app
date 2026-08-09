import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { probeIcsUrl } from '~/server/utils/probe-ics-url'
import { syncOneExternalCalendar } from '~/server/utils/sync-external-calendars-job'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  let action: string | undefined
  try {
    // ============ LAYER 1: AUTHENTICATION (Server-side) ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const body = await readBody(event)
    action = body?.action
    const { data } = body

    if (!action) {
      throw createError({
        statusCode: 400,
        message: 'action is required (load, connect, disconnect)'
      })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // ============ Get authenticated user's profile (NOT from client) ============
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userData?.id) {
      logger.error('❌ External calendars: User profile not found', {
        authUserId: authUser.id,
        error: userError
      })
      throw createError({
        statusCode: 404,
        message: 'User profile not found'
      })
    }

    if (action === 'load') {

      // Load external calendars for authenticated user
      const { data: calendars, error } = await supabase
        .from('external_calendars')
        .select('*')
        .eq('staff_id', userData.id)
        .eq('tenant_id', userData.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        data: calendars || []
      }
    } else if (action === 'connect') {
      // ============ LAYER 2: AUTHORIZATION FOR CONNECT ============
      const { provider, account_identifier, calendar_name, ics_url } = data

      if (!provider) {
        throw createError({
          statusCode: 400,
          message: 'provider is required'
        })
      }

      if (!ics_url || typeof ics_url !== 'string' || !ics_url.trim()) {
        throw createError({
          statusCode: 400,
          message: 'ICS-URL ist erforderlich',
        })
      }

      // Live-check before saving — refuse bad / unreachable feeds early
      const probe = await probeIcsUrl(ics_url)
      if (!probe.ok) {
        throw createError({
          statusCode: 400,
          message: probe.tip ? `${probe.message} ${probe.tip}` : probe.message,
          data: { code: probe.code, tip: probe.tip, url: probe.url },
        })
      }

      const calendarData = {
        tenant_id: userData.tenant_id,
        staff_id: userData.id,
        provider,
        account_identifier: account_identifier || probe.url,
        calendar_name: calendar_name || null,
        // ICS share links are always ics_url — even for apple/google/microsoft providers
        connection_type: 'ics_url',
        ics_url: probe.url,
        sync_enabled: true,
        consecutive_failures: 0,
        last_fetch_error: null,
      }

      // Upsert: bei Duplikat aktualisieren statt Fehler
      const { data: upserted, error: upsertError } = await supabase
        .from('external_calendars')
        .upsert(calendarData, {
          onConflict: 'tenant_id,staff_id,provider,account_identifier'
        })
        .select('*')
        .single()

      let calendarRow = upserted
      if (upsertError || !calendarRow?.id) {
        // Fallback: some PostgREST configs return no row on upsert — fetch explicitly
        const { data: existing, error: fetchErr } = await supabase
          .from('external_calendars')
          .select('*')
          .eq('tenant_id', userData.tenant_id)
          .eq('staff_id', userData.id)
          .eq('provider', provider)
          .eq('account_identifier', calendarData.account_identifier)
          .maybeSingle()
        if (fetchErr || !existing?.id) {
          throw upsertError || fetchErr || new Error('Kalender konnte nicht gespeichert werden')
        }
        calendarRow = existing
      }

      // Immediate first sync so busy times / last_sync_at are set right away
      // (registration + settings both rely on this — client-side sync often raced auth)
      let syncResult: { status: string; events?: number; error?: string; reason?: string } | null = null
      try {
        syncResult = await syncOneExternalCalendar(
          supabase,
          calendarRow,
          new Map(),
          { notifyOnFailure: false },
        )
      } catch (syncErr: any) {
        logger.warn('⚠️ External calendar connected but initial sync failed', {
          calendarId: calendarRow.id,
          error: syncErr?.message || syncErr,
        })
        syncResult = { status: 'failed', error: syncErr?.message || 'Sync fehlgeschlagen' }
      }

      logger.info('📅 External calendar connected', {
        provider,
        staffId: userData.id,
        tenantId: userData.tenant_id,
        calendarId: calendarRow.id,
        veventCount: probe.veventCount,
        syncStatus: syncResult?.status,
        syncedEvents: syncResult?.status === 'synced' ? syncResult.events : undefined,
      })

      const syncedOk = syncResult?.status === 'synced'
      const syncedEvents = syncedOk ? (syncResult.events ?? 0) : 0

      return {
        success: true,
        message: syncedOk
          ? syncedEvents > 0
            ? `Kalender verbunden und synchronisiert (${syncedEvents} Termin(e)).`
            : 'Kalender verbunden — Feed OK (noch keine Termine im Feed).'
          : probe.veventCount > 0
            ? `Kalender verbunden — Feed OK (${probe.veventCount} Termin(e) erkannt). Sync bitte manuell erneut versuchen.`
            : 'Kalender verbunden — Feed OK (noch keine Termine im Feed).',
        calendar_id: calendarRow.id,
        normalized_url: probe.url,
        vevent_count: probe.veventCount,
        sync: syncResult,
      }
    } else if (action === 'disconnect') {
      // ============ LAYER 2: AUTHORIZATION FOR DISCONNECT ============
      const { calendarId } = data

      if (!calendarId) {
        throw createError({
          statusCode: 400,
          message: 'calendarId is required'
        })
      }

      // ✅ CRITICAL: Verify ownership before deletion
      const { data: calendar, error: calendarCheckError } = await supabase
        .from('external_calendars')
        .select('staff_id, tenant_id')
        .eq('id', calendarId)
        .single()

      if (calendarCheckError || !calendar) {
        throw createError({
          statusCode: 404,
          message: 'Calendar not found'
        })
      }

      // Verify user owns this calendar
      if (calendar.staff_id !== userData.id || calendar.tenant_id !== userData.tenant_id) {
        logger.warn('⚠️ Unauthorized calendar disconnect attempt', {
          calendarId,
          userId: userData.id,
          calendarStaffId: calendar.staff_id
        })
        throw createError({
          statusCode: 403,
          message: 'You do not have permission to disconnect this calendar'
        })
      }

      const { error } = await supabase
        .from('external_calendars')
        .delete()
        .eq('id', calendarId)

      if (error) throw error

      logger.info('📅 External calendar disconnected', {
        calendarId,
        staffId: userData.id
      })

      return {
        success: true,
        message: 'Kalender-Verbindung getrennt!'
      }
    } else if (action === 'update-default-plz') {
      const { calendarId, defaultPostalCode } = data

      if (!calendarId) {
        throw createError({ statusCode: 400, message: 'calendarId is required' })
      }

      // Verify ownership
      const { data: calendarCheck, error: calendarCheckError } = await supabase
        .from('external_calendars')
        .select('staff_id, tenant_id')
        .eq('id', calendarId)
        .single()

      if (calendarCheckError || !calendarCheck) {
        throw createError({ statusCode: 404, message: 'Calendar not found' })
      }

      if (calendarCheck.staff_id !== userData.id || calendarCheck.tenant_id !== userData.tenant_id) {
        throw createError({ statusCode: 403, message: 'You do not have permission to update this calendar' })
      }

      const { error: updateError } = await supabase
        .from('external_calendars')
        .update({ default_postal_code: defaultPostalCode || null })
        .eq('id', calendarId)

      if (updateError) throw updateError

      // Update existing busy times for this calendar that have no event_location
      // and no postal_code yet, so they immediately benefit from the new default
      if (defaultPostalCode) {
        await supabase
          .from('external_busy_times')
          .update({ postal_code: defaultPostalCode })
          .eq('external_calendar_id', calendarId)
          .is('event_location', null)
          .is('postal_code', null)
      } else {
        // Clearing the PLZ: remove postal_code from events that got it from the default
        await supabase
          .from('external_busy_times')
          .update({ postal_code: null })
          .eq('external_calendar_id', calendarId)
          .is('event_location', null)
      }

      logger.info('📍 Default PLZ updated for external calendar', {
        calendarId,
        staffId: userData.id,
        defaultPostalCode
      })

      return {
        success: true,
        message: defaultPostalCode
          ? `Standard-PLZ ${defaultPostalCode} gespeichert`
          : 'Standard-PLZ entfernt'
      }
    } else {
      throw createError({
        statusCode: 400,
        message: 'Invalid action. Use: load, connect, disconnect, or update-default-plz'
      })
    }
  } catch (err: any) {
    logger.error('❌ External calendars API error:', {
      action,
      error: err.message,
      statusCode: err.statusCode
    })
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to manage external calendars'
    })
  }
})
