/**
 * Superadmin tenant hard-delete — preview + execute.
 *
 * Safety invariants:
 * - Target is ALWAYS exact tenant UUID (never name/slug/email).
 * - requireSuperAdmin must run in the API layer before calling these helpers.
 * - Service-role client is used only after that authorization.
 * - Confirmation must equal `DELETE ${exactTenantName}`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { sendEmail } from '~/server/utils/email'
import {
  EXPLICIT_DELETE_ORDER,
  FINANCIAL_TENANT_TABLES,
  PENDING_PAYMENT_STATUSES,
  TENANT_OWNED_TABLES,
  expectedHardDeleteConfirmation,
  isHardDeleteConfirmationValid,
  isTenantUuid,
  previewCountTables,
} from '~/server/utils/tenant-hard-delete-inventory'

export type HardDeleteStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL_FAILURE'

export interface TenantHardDeletePreview {
  tenantId: string
  tenantName: string
  slug: string
  contactEmail: string | null
  fromEmail: string | null
  counts: Record<string, number>
  totalRecords: number
  financialRecords: number
  pendingPayments: number
  paymentAuditLogs: number
  authUsers: Array<{
    appUserId: string
    authUserId: string | null
    email: string | null
    role: string | null
    exclusive: boolean
  }>
  storageObjects: Array<{ bucket: string; path: string; source: string }>
  externalReferences: {
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    stripe_connect_account_id: string | null
    wallee_space_id: number | null
    wallee_enabled: boolean
    resend_domain_id: string | null
    sari_enabled: boolean | null
  }
  blockersClearedByExplicitDelete: string[]
  noFkTablesWithRows: string[]
  warnings: string[]
  hardcodedCodeHints: string[]
}

export interface HardDeleteResult {
  status: HardDeleteStatus
  tenantId: string
  tenantName: string
  jobId: string | null
  deletedCounts: Record<string, number>
  authDeleted: string[]
  authSkipped: Array<{ authUserId: string; reason: string }>
  storageDeleted: string[]
  storageFailed: string[]
  verification: { ok: boolean; leftovers: Array<{ table: string; remaining: number; reason: string }> }
  emailSent: boolean
  error?: string
}

async function countEq(
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value)
  if (error) {
    // Missing table / column in some envs — treat as 0 but log
    logger.warn(`[tenant-hard-delete] count failed ${table}.${column}:`, error.message)
    return 0
  }
  return count ?? 0
}

function extractStoragePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const marker = `/object/public/${bucket}/`
    const idx = u.pathname.indexOf(marker)
    if (idx >= 0) return u.pathname.slice(idx + marker.length)
    const authMarker = `/object/authenticated/${bucket}/`
    const idx2 = u.pathname.indexOf(authMarker)
    if (idx2 >= 0) return u.pathname.slice(idx2 + authMarker.length)
  } catch {
    // ignore
  }
  return null
}

async function resolveStorageObjects(
  supabase: SupabaseClient,
  tenant: {
    id: string
    slug: string
    logo_url?: string | null
    logo_square_url?: string | null
    logo_wide_url?: string | null
    logo_dark_url?: string | null
    favicon_url?: string | null
  }
): Promise<Array<{ bucket: string; path: string; source: string }>> {
  const found: Array<{ bucket: string; path: string; source: string }> = []
  const seen = new Set<string>()

  const add = (bucket: string, path: string, source: string) => {
    const key = `${bucket}:${path}`
    if (!path || seen.has(key)) return
    seen.add(key)
    found.push({ bucket, path, source })
  }

  const logoFields: Array<[string | null | undefined, string]> = [
    [tenant.logo_url, 'tenants.logo_url'],
    [tenant.logo_square_url, 'tenants.logo_square_url'],
    [tenant.logo_wide_url, 'tenants.logo_wide_url'],
    [tenant.logo_dark_url, 'tenants.logo_dark_url'],
    [tenant.favicon_url, 'tenants.favicon_url'],
  ]
  for (const [url, source] of logoFields) {
    const path = extractStoragePathFromPublicUrl(url, 'tenant-logos')
    if (path) add('tenant-logos', path, source)
  }

  const { data: assets } = await supabase
    .from('tenant_assets')
    .select('file_path, storage_bucket, storage_path')
    .eq('tenant_id', tenant.id)

  for (const a of assets || []) {
    const bucket = (a as any).storage_bucket || 'tenant-logos'
    const path = (a as any).storage_path || (a as any).file_path
    if (path) add(bucket, path, 'tenant_assets')
  }

  // Slug-prefix scan in tenant-logos (verified against this tenant's slug)
  if (tenant.slug) {
    const { data: listed } = await supabase.storage.from('tenant-logos').list('', {
      search: tenant.slug,
      limit: 100,
    })
    for (const obj of listed || []) {
      if (obj.name && (obj.name.startsWith(`${tenant.slug}-`) || obj.name.startsWith(`${tenant.slug}/`))) {
        add('tenant-logos', obj.name, 'slug-prefix-list')
      }
    }
    // Also common `{tenant_id}/...` prefix
    const { data: byId } = await supabase.storage.from('tenant-logos').list(tenant.id, { limit: 100 })
    for (const obj of byId || []) {
      if (obj.name) add('tenant-logos', `${tenant.id}/${obj.name}`, 'tenant-id-prefix')
    }
  }

  return found
}

async function authExclusivity(
  supabase: SupabaseClient,
  authUserId: string,
  tenantId: string
): Promise<{ exclusive: boolean; otherTenantCount: number; remainingRefs: number }> {
  const { data: rows } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUserId)

  const list = rows || []
  const otherTenantCount = list.filter((r) => r.tenant_id && r.tenant_id !== tenantId).length
  return {
    exclusive: otherTenantCount === 0 && list.every((r) => r.tenant_id === tenantId || !r.tenant_id),
    otherTenantCount,
    remainingRefs: list.length,
  }
}

export async function previewTenantHardDelete(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantHardDeletePreview> {
  if (!isTenantUuid(tenantId)) {
    throw Object.assign(new Error('Invalid tenant_id: must be a UUID'), { statusCode: 400 })
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select(
      'id, name, slug, contact_email, from_email, logo_url, logo_square_url, logo_wide_url, logo_dark_url, favicon_url, stripe_customer_id, stripe_subscription_id, stripe_connect_account_id, wallee_space_id, wallee_enabled, resend_domain_id, sari_enabled'
    )
    .eq('id', tenantId)
    .maybeSingle()

  if (error) throw error
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 })
  }

  const counts: Record<string, number> = {}
  for (const table of previewCountTables()) {
    counts[table] = await countEq(supabase, table, 'tenant_id', tenantId)
  }

  // Indirect: payment_audit_logs via payments
  const { data: paymentIds } = await supabase.from('payments').select('id').eq('tenant_id', tenantId)
  let paymentAuditLogs = 0
  if (paymentIds?.length) {
    const ids = paymentIds.map((p) => p.id)
    const { count } = await supabase
      .from('payment_audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('payment_id', ids)
    paymentAuditLogs = count ?? 0
  }
  counts.payment_audit_logs = paymentAuditLogs

  // website_pages via website_tenants
  const { data: websites } = await supabase.from('website_tenants').select('id').eq('tenant_id', tenantId)
  let websitePages = 0
  if (websites?.length) {
    const { count } = await supabase
      .from('website_pages')
      .select('*', { count: 'exact', head: true })
      .in('website_id', websites.map((w) => w.id))
    websitePages = count ?? 0
  }
  counts.website_pages = websitePages

  // platform_referrals either side
  const { count: refAsReferrer } = await supabase
    .from('platform_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_tenant_id', tenantId)
  const { count: refAsReferred } = await supabase
    .from('platform_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referred_tenant_id', tenantId)
  counts.platform_referrals = (refAsReferrer ?? 0) + (refAsReferred ?? 0)

  let financialRecords = 0
  for (const t of FINANCIAL_TENANT_TABLES) {
    financialRecords += counts[t] || 0
  }
  financialRecords += paymentAuditLogs

  let pendingPayments = 0
  for (const status of PENDING_PAYMENT_STATUSES) {
    const { count } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('payment_status', status)
    pendingPayments += count ?? 0
  }

  const { data: appUsers } = await supabase
    .from('users')
    .select('id, auth_user_id, email, role')
    .eq('tenant_id', tenantId)

  const authUsers = []
  for (const u of appUsers || []) {
    let exclusive = true
    if (u.auth_user_id) {
      const ex = await authExclusivity(supabase, u.auth_user_id, tenantId)
      exclusive = ex.exclusive && ex.otherTenantCount === 0
    }
    authUsers.push({
      appUserId: u.id,
      authUserId: u.auth_user_id,
      email: u.email,
      role: u.role,
      exclusive,
    })
  }

  const storageObjects = await resolveStorageObjects(supabase, tenant)

  const noFkTablesWithRows = TENANT_OWNED_TABLES
    .filter((t) => t.classification === 'no_fk' && (counts[t.table] || 0) > 0)
    .map((t) => t.table)

  const blockersClearedByExplicitDelete = TENANT_OWNED_TABLES
    .filter(
      (t) =>
        (t.classification === 'no_action' || t.classification === 'restrict') &&
        (counts[t.table] || 0) > 0
    )
    .map((t) => t.table)

  const warnings: string[] = []
  if (financialRecords > 0) {
    warnings.push(
      `This tenant contains financial records (${financialRecords}). Proceeding will permanently delete these active SIMY records.`
    )
  }
  if (pendingPayments > 0) {
    warnings.push(`Pending payments: ${pendingPayments}. These will be permanently deleted.`)
  }
  if (paymentAuditLogs > 0) {
    warnings.push(`Payment audit records: ${paymentAuditLogs}. These will be permanently deleted.`)
  }
  if (authUsers.some((a) => a.authUserId && a.exclusive)) {
    warnings.push('Auth identities will be deleted if still tenant-exclusive at execution time.')
  }
  if (authUsers.some((a) => a.authUserId && !a.exclusive)) {
    warnings.push('Some auth identities are shared/cross-referenced and will NOT be deleted.')
  }
  if (storageObjects.length > 0) {
    warnings.push(`Tenant storage objects (${storageObjects.length}) will be deleted.`)
  }
  if (noFkTablesWithRows.length > 0) {
    warnings.push(
      `Tables without FK to tenants have rows and will be deleted explicitly: ${noFkTablesWithRows.join(', ')}`
    )
  }
  if (blockersClearedByExplicitDelete.length > 0) {
    warnings.push(
      `NO ACTION/RESTRICT children will be deleted before the tenant row: ${blockersClearedByExplicitDelete.join(', ')}`
    )
  }
  if (tenant.stripe_customer_id || tenant.stripe_subscription_id || tenant.wallee_space_id) {
    warnings.push(
      'External billing identifiers exist. SIMY will not call destructive external APIs; cancel externally if required.'
    )
  }
  warnings.push('This operation cannot be undone.')
  warnings.push('Database backups are not purged by this feature.')

  const hardcodedCodeHints: string[] = []
  // Static known hardcodes (code is never modified by this feature)
  if (tenant.slug === 'sara-lussi-ag' || (tenant.contact_email || '').toLowerCase() === 'info@saralussi.com') {
    hardcodedCodeHints.push(
      'Repository contains server/utils/sara-lussi-reply-email.ts hardcoding info@saralussi.com — not deleted by this feature; remove in a separate PR if obsolete.'
    )
  }

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0)

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    slug: tenant.slug,
    contactEmail: tenant.contact_email,
    fromEmail: tenant.from_email,
    counts,
    totalRecords,
    financialRecords,
    pendingPayments,
    paymentAuditLogs,
    authUsers,
    storageObjects,
    externalReferences: {
      stripe_customer_id: tenant.stripe_customer_id,
      stripe_subscription_id: tenant.stripe_subscription_id,
      stripe_connect_account_id: tenant.stripe_connect_account_id,
      wallee_space_id: tenant.wallee_space_id,
      wallee_enabled: !!tenant.wallee_enabled,
      resend_domain_id: tenant.resend_domain_id,
      sari_enabled: tenant.sari_enabled,
    },
    blockersClearedByExplicitDelete,
    noFkTablesWithRows,
    warnings,
    hardcodedCodeHints,
  }
}

export async function verifyTenantHardDelete(
  supabase: SupabaseClient,
  tenantId: string,
  slug: string | null
): Promise<{ ok: boolean; leftovers: Array<{ table: string; remaining: number; reason: string }> }> {
  const leftovers: Array<{ table: string; remaining: number; reason: string }> = []

  const { data: tenantRow } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle()
  if (tenantRow) {
    leftovers.push({ table: 'tenants', remaining: 1, reason: 'tenant root still exists' })
  }

  for (const table of previewCountTables()) {
    const remaining = await countEq(supabase, table, 'tenant_id', tenantId)
    if (remaining > 0) {
      leftovers.push({ table, remaining, reason: 'tenant_id rows remain' })
    }
  }

  // App users must be gone
  const usersLeft = await countEq(supabase, 'users', 'tenant_id', tenantId)
  if (usersLeft > 0) {
    leftovers.push({ table: 'users', remaining: usersLeft, reason: 'app users remain' })
  }

  // Storage: slug-prefix leftovers
  if (slug) {
    const { data: listed } = await supabase.storage.from('tenant-logos').list('', {
      search: slug,
      limit: 100,
    })
    const leftoverObjs = (listed || []).filter(
      (o) => o.name && (o.name.startsWith(`${slug}-`) || o.name.startsWith(`${slug}/`))
    )
    if (leftoverObjs.length > 0) {
      leftovers.push({
        table: 'storage.objects:tenant-logos',
        remaining: leftoverObjs.length,
        reason: 'slug-prefixed logo objects remain',
      })
    }
  }

  return { ok: leftovers.length === 0, leftovers }
}

async function createJob(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenant_hard_delete_jobs')
    .insert(row)
    .select('id')
    .single()
  if (error) {
    logger.error('[tenant-hard-delete] failed to create job row:', error)
    return null
  }
  return data?.id ?? null
}

async function updateJob(
  supabase: SupabaseClient,
  jobId: string | null,
  patch: Record<string, unknown>
): Promise<void> {
  if (!jobId) return
  const { error } = await supabase.from('tenant_hard_delete_jobs').update(patch).eq('id', jobId)
  if (error) logger.warn('[tenant-hard-delete] job update failed:', error.message)
}

/**
 * Execute hard delete. Caller MUST have already verified Superadmin.
 */
export async function executeTenantHardDelete(
  supabase: SupabaseClient,
  opts: {
    tenantId: string
    confirmation: string
    requestedByUserId: string | null
    requestedByAuthUserId: string
    requestedByEmail?: string | null
  }
): Promise<HardDeleteResult> {
  const { tenantId, confirmation, requestedByUserId, requestedByAuthUserId, requestedByEmail } = opts

  if (!isTenantUuid(tenantId)) {
    throw Object.assign(new Error('Invalid tenant_id: must be a UUID'), { statusCode: 400 })
  }

  const preview = await previewTenantHardDelete(supabase, tenantId)

  if (!isHardDeleteConfirmationValid(confirmation, preview.tenantName)) {
    throw Object.assign(
      new Error(
        `Confirmation mismatch. Type exactly: ${expectedHardDeleteConfirmation(preview.tenantName)}`
      ),
      { statusCode: 400 }
    )
  }

  const jobId = await createJob(supabase, {
    tenant_id: tenantId,
    tenant_name: preview.tenantName,
    tenant_slug: preview.slug,
    requested_by_user_id: requestedByUserId,
    requested_by_auth_user_id: requestedByAuthUserId,
    requested_by_email: requestedByEmail || null,
    status: 'RUNNING',
    preview_snapshot: {
      counts: preview.counts,
      totalRecords: preview.totalRecords,
      financialRecords: preview.financialRecords,
      pendingPayments: preview.pendingPayments,
      warnings: preview.warnings,
      storageObjects: preview.storageObjects.map((s) => ({ bucket: s.bucket, path: s.path })),
      authUserIds: preview.authUsers.map((a) => a.authUserId).filter(Boolean),
      externalReferences: preview.externalReferences,
    },
    warnings: preview.warnings,
    started_at: new Date().toISOString(),
  })

  const contactEmail = preview.contactEmail || preview.fromEmail
  const authCandidates = preview.authUsers
    .filter((a) => a.authUserId)
    .map((a) => ({ authUserId: a.authUserId as string, exclusive: a.exclusive }))
  const storageCandidates = [...preview.storageObjects]

  const deletedCounts: Record<string, number> = { ...preview.counts }
  const authDeleted: string[] = []
  const authSkipped: Array<{ authUserId: string; reason: string }> = []
  const storageDeleted: string[] = []
  const storageFailed: string[] = []

  try {
    // Prefer transactional RPC; fall back to ordered JS deletes if RPC missing (tests/local).
    const { error: rpcError } = await supabase.rpc('hard_delete_tenant_data', {
      p_tenant_id: tenantId,
    })

    if (rpcError) {
      logger.warn('[tenant-hard-delete] RPC unavailable, using ordered client deletes:', rpcError.message)
      await executeOrderedClientDeletes(supabase, tenantId, deletedCounts)
    }

    // Confirm tenant gone
    const { data: stillThere } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle()
    if (stillThere) {
      throw new Error('Tenant row still exists after deletion attempt')
    }
  } catch (err: any) {
    await updateJob(supabase, jobId, {
      status: 'FAILED',
      error_message: err?.message || String(err),
      completed_at: new Date().toISOString(),
      actual_counts: deletedCounts,
    })
    return {
      status: 'FAILED',
      tenantId,
      tenantName: preview.tenantName,
      jobId,
      deletedCounts,
      authDeleted,
      authSkipped,
      storageDeleted,
      storageFailed,
      verification: { ok: false, leftovers: [{ table: 'tenants', remaining: 1, reason: err?.message || 'db failed' }] },
      emailSent: false,
      error: err?.message || String(err),
    }
  }

  // Auth cleanup (outside DB txn) — re-check exclusivity
  for (const cand of authCandidates) {
    const { data: remaining } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', cand.authUserId)

    if (remaining && remaining.length > 0) {
      authSkipped.push({
        authUserId: cand.authUserId,
        reason: `app users still reference auth user (${remaining.length})`,
      })
      continue
    }

    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(cand.authUserId)
    if (delAuthErr) {
      authSkipped.push({ authUserId: cand.authUserId, reason: delAuthErr.message })
    } else {
      authDeleted.push(cand.authUserId)
    }
  }

  // Storage cleanup
  for (const obj of storageCandidates) {
    const { error: remErr } = await supabase.storage.from(obj.bucket).remove([obj.path])
    if (remErr) {
      storageFailed.push(`${obj.bucket}/${obj.path}: ${remErr.message}`)
    } else {
      storageDeleted.push(`${obj.bucket}/${obj.path}`)
    }
  }

  await updateJob(supabase, jobId, { status: 'VERIFYING' })
  const verification = await verifyTenantHardDelete(supabase, tenantId, preview.slug)

  let status: HardDeleteStatus = 'COMPLETED'
  if (!verification.ok || storageFailed.length > 0 || authSkipped.some((s) => s.reason.includes('still reference'))) {
    // Auth skip for non-exclusive is OK; leftover DB/storage is PARTIAL
    if (!verification.ok || storageFailed.length > 0) {
      status = 'PARTIAL_FAILURE'
    }
  }

  // Non-exclusive auth skips alone → still COMPLETED if verification ok
  const blockingAuthSkip = authSkipped.filter((s) => !s.reason.includes('other tenant') && s.reason.includes('still reference'))
  if (blockingAuthSkip.length && verification.ok && storageFailed.length === 0) {
    status = 'PARTIAL_FAILURE'
  }

  let emailSent = false
  if (status === 'COMPLETED' && contactEmail) {
    try {
      await sendEmail({
        to: contactEmail,
        subject: 'Your SIMY account has been permanently deleted',
        fromName: 'Simy',
        html: buildDeletionEmailHtml({
          tenantName: preview.tenantName,
          deletedAt: new Date().toISOString(),
        }),
      })
      emailSent = true
    } catch (emailErr: any) {
      logger.error('[tenant-hard-delete] confirmation email failed:', emailErr)
      status = 'PARTIAL_FAILURE'
      storageFailed.push(`email: ${emailErr?.message || emailErr}`)
    }
  }

  await updateJob(supabase, jobId, {
    status,
    completed_at: new Date().toISOString(),
    actual_counts: deletedCounts,
    auth_deleted: authDeleted,
    auth_skipped: authSkipped,
    storage_deleted: storageDeleted,
    storage_failed: storageFailed,
    verification_result: verification,
    email_sent: emailSent,
    email_recipient: emailSent ? contactEmail : null,
  })

  return {
    status,
    tenantId,
    tenantName: preview.tenantName,
    jobId,
    deletedCounts,
    authDeleted,
    authSkipped,
    storageDeleted,
    storageFailed,
    verification,
    emailSent,
  }
}

async function executeOrderedClientDeletes(
  supabase: SupabaseClient,
  tenantId: string,
  deletedCounts: Record<string, number>
): Promise<void> {
  // Clear default_payment_account_id so accounting_accounts can cascade
  await supabase.from('tenants').update({ default_payment_account_id: null }).eq('id', tenantId)

  for (const table of EXPLICIT_DELETE_ORDER) {
    if (table === 'webhook_logs' || table === 'payment_audit_logs' || table === 'payment_wallee_transactions' || table === 'payment_refunds' || table === 'payment_reminders' || table === 'payment_access_grants' || table === 'refund_requests') {
      const { data: pays } = await supabase.from('payments').select('id').eq('tenant_id', tenantId)
      const ids = (pays || []).map((p) => p.id)
      if (ids.length === 0) continue
      if (table === 'webhook_logs') {
        const { error } = await supabase.from('webhook_logs').delete().in('payment_id', ids)
        if (error) logger.warn(`[tenant-hard-delete] ${table}:`, error.message)
        continue
      }
      const { error } = await supabase.from(table).delete().in('payment_id', ids)
      if (error) logger.warn(`[tenant-hard-delete] ${table}:`, error.message)
      continue
    }

    if (table === 'email_campaign_leads' || table === 'email_campaign_variants') {
      const { data: camps } = await supabase.from('email_campaigns').select('id').eq('tenant_id', tenantId)
      const ids = (camps || []).map((c) => c.id)
      if (!ids.length) continue
      const { error } = await supabase.from(table).delete().in('campaign_id', ids)
      if (error) logger.warn(`[tenant-hard-delete] ${table}:`, error.message)
      continue
    }

    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('tenant_id', tenantId)
    if (error) {
      // Some tables may not exist in all envs
      logger.warn(`[tenant-hard-delete] delete ${table}:`, error.message)
    } else if (typeof count === 'number') {
      deletedCounts[table] = count
    }
  }

  const { error: tenantErr } = await supabase.from('tenants').delete().eq('id', tenantId)
  if (tenantErr) throw tenantErr
}

function buildDeletionEmailHtml(opts: { tenantName: string; deletedAt: string }): string {
  const when = new Date(opts.deletedAt).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111;line-height:1.5">
  <p>Hello,</p>
  <p>Your SIMY account <strong>${escapeHtml(opts.tenantName)}</strong> has been permanently deleted.</p>
  <p>Deletion date/time: <strong>${escapeHtml(when)}</strong> (Europe/Zurich)</p>
  <p>The permanent deletion process has completed. Active SIMY application data for this account has been removed.</p>
  <p>If you have questions, contact <a href="mailto:support@simy.ch">support@simy.ch</a>.</p>
  <p>— Simy</p>
  </body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
