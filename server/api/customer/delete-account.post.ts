import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * Customer Account Deletion (Apple/Google compliant in-app deletion).
 *
 * What this does:
 *   - Anonymizes personally identifiable information (PII) in the `users` row.
 *   - Sets `is_active = false` so the user cannot log in anymore.
 *   - Deletes the Supabase Auth account (sign-in is no longer possible).
 *   - Removes the auth-user link so the row stops appearing in queries.
 *
 * Blocked when the customer still has open financial obligations
 * (pending/partial/invoiced payments, unpaid invoices, or negative credit).
 *
 * What this DOES NOT delete (intentionally, due to legal retention):
 *   - Payments, invoices, payment_audit_logs (10-year Swiss bookkeeping duty)
 *   - Already-completed appointments (audit trail, instructor records)
 *   - Audit logs (regulatory compliance)
 *
 * The user is informed of this in the confirmation dialog. After the delete:
 *   - User cannot log in
 *   - All personal data (name, address, phone, email, birthdate, profession) is anonymized
 *   - Auth row is removed → no way to recover
 */

/** Payment statuses that represent money still owed / not settled */
const OPEN_PAYMENT_STATUSES = [
  'pending',
  'partial',
  'authorized',
  'invoiced',
  'invoice',
]

/** Invoice statuses that are not fully settled */
const OPEN_INVOICE_STATUSES = [
  'draft',
  'pdf_created',
  'sent',
  'overdue',
]

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🗑️ [delete-account] Handler started')

    const body = await readBody(event).catch(() => ({}))
    const confirmation: string | undefined = body?.confirmation

    if (confirmation !== 'LÖSCHEN') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bestätigung fehlt. Bitte gib "LÖSCHEN" ein, um dein Konto unwiderruflich zu löschen.'
      })
    }

    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Nicht authentifiziert' })
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({ statusCode: 500, statusMessage: 'Server configuration error' })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: userRow, error: userFetchError } = await serviceSupabase
      .from('users')
      .select('id, email, role, tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userFetchError || !userRow) {
      console.error('❌ [delete-account] User row not found:', userFetchError)
      throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })
    }

    if (userRow.role !== 'client') {
      logger.warn('⚠️ [delete-account] Non-client tried to self-delete:', {
        userId: userRow.id, role: userRow.role
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Mitarbeiter- und Admin-Konten können nicht über die App gelöscht werden. Bitte wende dich an deinen Administrator.'
      })
    }

    const userId = userRow.id

    // ── Block deletion while open receivables exist ──────────────────────────
    const { data: openPayments, error: openPaymentsError } = await serviceSupabase
      .from('payments')
      .select('id, payment_status, total_amount_rappen, amount_paid_rappen, credit_used_rappen')
      .eq('user_id', userId)
      .eq('tenant_id', userRow.tenant_id)
      .in('payment_status', OPEN_PAYMENT_STATUSES)

    if (openPaymentsError) {
      logger.error('❌ [delete-account] Failed to check open payments:', openPaymentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Offene Zahlungen konnten nicht geprüft werden. Bitte versuche es später erneut.'
      })
    }

    const blockingPayments = (openPayments || []).filter((p) => {
      const total = p.total_amount_rappen || 0
      const paid = (p.amount_paid_rappen || 0) + (p.credit_used_rappen || 0)
      // Ignore zero-amount leftovers; block anything with a remaining balance
      return total > 0 && paid < total
    })

    const { data: openInvoices, error: openInvoicesError } = await serviceSupabase
      .from('invoices')
      .select('id, status, total_amount_rappen')
      .eq('user_id', userId)
      .eq('tenant_id', userRow.tenant_id)
      .in('status', OPEN_INVOICE_STATUSES)

    if (openInvoicesError) {
      logger.error('❌ [delete-account] Failed to check open invoices:', openInvoicesError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Offene Rechnungen konnten nicht geprüft werden. Bitte versuche es später erneut.'
      })
    }

    const blockingInvoices = (openInvoices || []).filter(
      (inv) => (inv.total_amount_rappen || 0) > 0
    )

    let negativeCreditRappen = 0
    const { data: creditRow, error: creditError } = await serviceSupabase
      .from('student_credits')
      .select('balance_rappen')
      .eq('user_id', userId)
      .eq('tenant_id', userRow.tenant_id)
      .maybeSingle()

    if (creditError) {
      // Table/row may be missing for some tenants — treat as no credit debt
      logger.warn('⚠️ [delete-account] Credit check skipped:', creditError.message)
    } else if ((creditRow?.balance_rappen || 0) < 0) {
      negativeCreditRappen = Math.abs(creditRow!.balance_rappen)
    }

    if (blockingPayments.length > 0 || blockingInvoices.length > 0 || negativeCreditRappen > 0) {
      const openChf = blockingPayments.reduce((sum, p) => {
        const remaining = Math.max(
          0,
          (p.total_amount_rappen || 0) - (p.amount_paid_rappen || 0) - (p.credit_used_rappen || 0)
        )
        return sum + remaining
      }, 0)
      const invoiceChf = blockingInvoices.reduce(
        (sum, inv) => sum + (inv.total_amount_rappen || 0),
        0
      )
      const debtChf = ((openChf + invoiceChf + negativeCreditRappen) / 100).toFixed(2)

      logger.warn('🚫 [delete-account] Blocked due to open receivables:', {
        userId,
        payments: blockingPayments.length,
        invoices: blockingInvoices.length,
        negativeCreditRappen,
        debtChf
      })

      throw createError({
        statusCode: 409,
        statusMessage:
          `Dein Konto kann nicht gelöscht werden, solange offene Beträge bestehen (ca. CHF ${debtChf}). ` +
          'Bitte begleiche offene Zahlungen/Rechnungen oder kontaktiere deine Fahrschule. ' +
          'Danach kannst du dein Konto löschen.'
      })
    }

    const originalEmail = userRow.email
    const anonymizedEmail = `deleted_${userId}@simy.local`

    logger.debug('🗑️ [delete-account] Anonymizing user data for:', { userId, originalEmail })

    const { error: updateError } = await serviceSupabase
      .from('users')
      .update({
        first_name: 'Gelöscht',
        last_name: '',
        email: anonymizedEmail,
        phone: '',
        birthdate: null,
        street: null,
        street_nr: null,
        zip: null,
        city: null,
        profession: null,
        auth_user_id: null,
        is_active: false
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ [delete-account] Anonymization failed:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Anonymisieren der Benutzerdaten: ' + updateError.message
      })
    }

    const { error: docDeleteError } = await serviceSupabase
      .from('user_documents')
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('user_id', userId)
      .is('deleted_at', null)

    if (docDeleteError) {
      logger.warn('⚠️ [delete-account] Soft-deleting documents failed (continuing):', docDeleteError)
    }

    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(user.id)

    if (authDeleteError) {
      console.error('❌ [delete-account] Auth deletion failed:', authDeleteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Löschen des Auth-Kontos: ' + authDeleteError.message
      })
    }

    try {
      await serviceSupabase.from('audit_logs').insert({
        user_id: null,
        tenant_id: userRow.tenant_id,
        action: 'account_self_deleted',
        details: {
          deleted_user_id: userId,
          deleted_email: originalEmail,
          deleted_at: new Date().toISOString(),
          method: 'in_app_self_service'
        }
      })
    } catch (auditErr) {
      logger.warn('⚠️ [delete-account] Audit log insert failed (non-fatal):', auditErr)
    }

    logger.debug('✅ [delete-account] Account deletion completed for user:', userId)

    return {
      success: true,
      message: 'Dein Konto wurde erfolgreich gelöscht. Du wirst jetzt abgemeldet.'
    }
  } catch (error: any) {
    console.error('❌ [delete-account] Error:', error)
    throw error
  }
})
