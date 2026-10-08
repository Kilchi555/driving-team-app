/**
 * Superadmin tenant hard-delete — preview + execute.
 *
 * Safety invariants:
 * - Target is ALWAYS exact tenant UUID (never name/slug/email).
 * - requireSuperAdmin must run in the API layer before calling these helpers.
 * - Service-role client is used only after that authorization.
 * - Confirmation must equal `DELETE ${exactTenantName}`.
 * - Destructive DB work runs ONLY via transactional RPC hard_delete_tenant_data.
 * - No weaker client-side delete fallback after RPC failure.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { sendEmail } from '~/server/utils/email'
import {
  FINANCIAL_TENANT_TABLES,
  PENDING_PAYMENT_STATUSES,
  TENANT_OWNED_TABLES,
  APPOINTMENT_NO_ACTION_DEPENDENTS,
  PAYMENT_NO_ACTION_DEPENDENTS,
  expectedHardDeleteConfirmation,
  isHardDeleteConfirmationValid,
  isTenantUuid,
  mergeLiveTenantTables,
  previewCountTables,
  type TenantOwnedTable,
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
  inventorySource: 'live_rpc' | 'static_snapshot'
  inventoryTableCount: number
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
  paymentDependencyClears: string[]
  appointmentDependencyClears: string[]
  warnings: string[]
  hardcodedCodeHints: string[]
  deletionStrategy: string
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
  verification: {
    ok: boolean
    leftovers: Array<{ table: string; remaining: number; reason: string }>
  }
  emailSent: boolean
  error?: string
}

/**
 * Exact equality count. Fail-closed: query errors throw (never interpreted as 0).
 * A real count of 0 remains a successful empty result.
 */
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
    const message = `count query failed for ${table}.${column}: ${error.message}`
    logger.warn(`[tenant-hard-delete] ${message}`)
    throw new Error(message)
  }
  return count ?? 0
}

/** Verification helper: count errors become leftovers (never ok / never silent 0). */
async function verificationCountOrLeftover(
  leftovers: Array<{ table: string; remaining: number; reason: string }>,
  supabase: SupabaseClient,
  table: string,
  column: string,
  value: string,
  leftoverReason: string
): Promise<void> {
  try {
    const remaining = await countEq(supabase, table, column, value)
    if (remaining > 0) {
      leftovers.push({ table, remaining, reason: leftoverReason })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    leftovers.push({
      table,
      remaining: -1,
      reason: `verification count query failed (${column}): ${message}`,
    })
  }
}

function extractStoragePathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const marker = `/object/public/${bucket}/`
    const idx = u.pathname.indexOf(marker)
    if (idx >= 0) return decodeURIComponent(u.pathname.slice(idx + marker.length))
    const authMarker = `/object/authenticated/${bucket}/`
    const idx2 = u.pathname.indexOf(authMarker)
    if (idx2 >= 0) return decodeURIComponent(u.pathname.slice(idx2 + authMarker.length))
  } catch {
    // ignore
  }
  return null
}

/**
 * Resolve storage objects with provable ownership only:
 *  a) tenant logo URL metadata
 *  b) tenant_assets DB rows for this tenant_id
 *  c) explicit {tenant_id}/ prefix listing
 * Never delete by slug filename prefix matching.
 */
export async function resolveStorageObjects(
  supabase: SupabaseClient,
  tenant: {
    id: string
    slug?: string
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
    // Reject empty / traversal
    if (path.includes('..')) return
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

  // Explicit {tenant_id}/… prefix only (UUID ownership, not slug)
  const { data: byId } = await supabase.storage.from('tenant-logos').list(tenant.id, { limit: 1000 })
  for (const obj of byId || []) {
    if (obj.name) add('tenant-logos', `${tenant.id}/${obj.name}`, 'tenant-id-prefix')
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

async function loadTenantInventory(
  supabase: SupabaseClient
): Promise<{ tables: TenantOwnedTable[]; source: 'live_rpc' | 'static_snapshot' }> {
  const { data, error } = await supabase.rpc('list_tenant_hard_delete_tables')
  if (error || !data) {
    if (error) {
      logger.warn(
        '[tenant-hard-delete] list_tenant_hard_delete_tables unavailable, using static snapshot:',
        error.message
      )
    }
    return {
      tables: TENANT_OWNED_TABLES.filter((t) => t.classification !== 'financial_child'),
      source: 'static_snapshot',
    }
  }
  const live = Array.isArray(data) ? data : []
  return {
    tables: mergeLiveTenantTables(live as any),
    source: 'live_rpc',
  }
}

function countTablesFromInventory(tables: TenantOwnedTable[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of tables) {
    if (seen.has(row.table)) continue
    seen.add(row.table)
    out.push(row.table)
  }
  return out.length ? out : previewCountTables()
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

  const { tables: inventory, source: inventorySource } = await loadTenantInventory(supabase)
  const countTables = countTablesFromInventory(inventory)

  const counts: Record<string, number> = {}
  for (const table of countTables) {
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

  // website_prospects matched-only (owned by someone else)
  const { count: matchedProspects } = await supabase
    .from('website_prospects')
    .select('*', { count: 'exact', head: true })
    .eq('matched_tenant_id', tenantId)
    .neq('tenant_id', tenantId)
  counts.website_prospects_matched_other_owner = matchedProspects ?? 0

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

  const noFkTablesWithRows = inventory
    .filter((t) => t.classification === 'no_fk' && (counts[t.table] || 0) > 0)
    .map((t) => t.table)

  const blockersClearedByExplicitDelete = inventory
    .filter(
      (t) =>
        (t.classification === 'no_action' || t.classification === 'restrict') &&
        (counts[t.table] || 0) > 0
    )
    .map((t) => t.table)

  const paymentDependencyClears = PAYMENT_NO_ACTION_DEPENDENTS.map(
    (d) => `${d.table}.${d.column} (${d.action})`
  )
  const appointmentDependencyClears = APPOINTMENT_NO_ACTION_DEPENDENTS.map(
    (d) => `${d.table}.${d.column} (${d.action})`
  )

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
    warnings.push(`Provably owned tenant storage objects (${storageObjects.length}) will be deleted.`)
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
  if ((counts.website_prospects_matched_other_owner || 0) > 0) {
    warnings.push(
      `${counts.website_prospects_matched_other_owner} website_prospects owned by other tenants are matched to this tenant; matched_tenant_id will be nulled (rows preserved).`
    )
  }
  if (tenant.stripe_customer_id || tenant.stripe_subscription_id || tenant.wallee_space_id) {
    warnings.push(
      'External billing identifiers exist. SIMY will not call destructive external APIs; cancel externally if required.'
    )
  }
  if (inventorySource === 'static_snapshot') {
    warnings.push(
      'Schema inventory RPC unavailable — preview uses the shipped static production snapshot. Destructive delete still requires the transactional RPC.'
    )
  }
  warnings.push('This operation cannot be undone.')
  warnings.push('Database backups are not purged by this feature.')

  const hardcodedCodeHints: string[] = []
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
    inventorySource,
    inventoryTableCount: countTables.length,
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
    paymentDependencyClears,
    appointmentDependencyClears,
    warnings,
    hardcodedCodeHints,
    deletionStrategy:
      'Transactional RPC hard_delete_tenant_data only. Explicit clears for no-FK / NO ACTION / RESTRICT / payment+appointment deps, then DELETE tenants (CASCADE). Auth/storage outside DB txn. No client destructive fallback.',
  }
}

export async function verifyTenantHardDelete(
  supabase: SupabaseClient,
  tenantId: string,
  opts?: {
    slug?: string | null
    exclusiveAuthUserIds?: string[]
    sharedAuthUserIds?: string[]
    expectedStorageObjects?: Array<{ bucket: string; path: string }>
  }
): Promise<{ ok: boolean; leftovers: Array<{ table: string; remaining: number; reason: string }> }> {
  const leftovers: Array<{ table: string; remaining: number; reason: string }> = []

  const { data: tenantRow } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle()
  if (tenantRow) {
    leftovers.push({ table: 'tenants', remaining: 1, reason: 'tenant root still exists' })
  }

  const { tables: inventory } = await loadTenantInventory(supabase)
  for (const table of countTablesFromInventory(inventory)) {
    await verificationCountOrLeftover(
      leftovers,
      supabase,
      table,
      'tenant_id',
      tenantId,
      'tenant_id rows remain'
    )
  }

  // App users must be gone
  await verificationCountOrLeftover(
    leftovers,
    supabase,
    'users',
    'tenant_id',
    tenantId,
    'app users remain'
  )

  // website_prospects: owned gone; no matched_tenant_id leftovers
  await verificationCountOrLeftover(
    leftovers,
    supabase,
    'website_prospects',
    'matched_tenant_id',
    tenantId,
    'matched_tenant_id still references deleted tenant'
  )

  // platform_referrals either side (CASCADE on delete; verify fail-closed on count errors)
  try {
    const refAsReferrer = await countEq(supabase, 'platform_referrals', 'referrer_tenant_id', tenantId)
    const refAsReferred = await countEq(supabase, 'platform_referrals', 'referred_tenant_id', tenantId)
    const referralsLeft = refAsReferrer + refAsReferred
    if (referralsLeft > 0) {
      leftovers.push({
        table: 'platform_referrals',
        remaining: referralsLeft,
        reason: 'referral rows still reference deleted tenant',
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    leftovers.push({
      table: 'platform_referrals',
      remaining: -1,
      reason: `verification count query failed: ${message}`,
    })
  }

  // website_pages via any leftover website_tenants (also counted above) — belt and suspenders
  const { data: websites } = await supabase.from('website_tenants').select('id').eq('tenant_id', tenantId)
  if (websites?.length) {
    leftovers.push({
      table: 'website_tenants',
      remaining: websites.length,
      reason: 'website_tenants remain (cascade incomplete)',
    })
  }

  // Storage: only check provably owned paths captured before delete
  for (const obj of opts?.expectedStorageObjects || []) {
    const { data: listed } = await supabase.storage.from(obj.bucket).list(
      obj.path.includes('/') ? obj.path.split('/').slice(0, -1).join('/') : '',
      { search: obj.path.split('/').pop(), limit: 20 }
    )
    const stillThere = (listed || []).some((o) => {
      const full = obj.path.includes('/')
        ? `${obj.path.split('/').slice(0, -1).join('/')}/${o.name}`
        : o.name
      return full === obj.path || o.name === obj.path.split('/').pop()
    })
    if (stillThere) {
      leftovers.push({
        table: `storage.objects:${obj.bucket}`,
        remaining: 1,
        reason: `owned object still present: ${obj.path}`,
      })
    }
  }

  // tenant_id prefix leftovers
  const { data: byId } = await supabase.storage.from('tenant-logos').list(tenantId, { limit: 100 })
  if ((byId || []).length > 0) {
    leftovers.push({
      table: 'storage.objects:tenant-logos',
      remaining: byId!.length,
      reason: 'tenant_id-prefixed objects remain',
    })
  }

  // Exclusive auth users should be gone from auth; shared must remain (best-effort via admin getUser)
  for (const authUserId of opts?.exclusiveAuthUserIds || []) {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(authUserId)
      if (!error && data?.user) {
        leftovers.push({
          table: 'auth.users',
          remaining: 1,
          reason: `exclusive auth user still exists: ${authUserId}`,
        })
      }
    } catch {
      // ignore admin API gaps in tests
    }
  }

  // Shared auth: ensure still referenced nowhere for this tenant (already checked users), and optionally still exist
  for (const authUserId of opts?.sharedAuthUserIds || []) {
    const { data: refs } = await supabase.from('users').select('id').eq('auth_user_id', authUserId).eq('tenant_id', tenantId)
    if (refs && refs.length > 0) {
      leftovers.push({
        table: 'users',
        remaining: refs.length,
        reason: `shared auth still linked to deleted tenant: ${authUserId}`,
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
 * Destructive DB path is RPC-only (fail closed).
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
      inventorySource: preview.inventorySource,
      inventoryTableCount: preview.inventoryTableCount,
      storageObjects: preview.storageObjects.map((s) => ({ bucket: s.bucket, path: s.path })),
      authUserIds: preview.authUsers.map((a) => a.authUserId).filter(Boolean),
      externalReferences: preview.externalReferences,
      deletionStrategy: preview.deletionStrategy,
    },
    warnings: preview.warnings,
    started_at: new Date().toISOString(),
  })

  const contactEmail = preview.contactEmail || preview.fromEmail
  const exclusiveAuthIds = preview.authUsers
    .filter((a) => a.authUserId && a.exclusive)
    .map((a) => a.authUserId as string)
  const sharedAuthIds = preview.authUsers
    .filter((a) => a.authUserId && !a.exclusive)
    .map((a) => a.authUserId as string)
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
    // RPC is the ONLY destructive DB path. Fail closed — never fall back to client deletes.
    const { data: rpcData, error: rpcError } = await supabase.rpc('hard_delete_tenant_data', {
      p_tenant_id: tenantId,
    })

    if (rpcError) {
      throw Object.assign(
        new Error(
          `Transactional hard_delete_tenant_data RPC failed (fail-closed, no client fallback): ${rpcError.message}`
        ),
        { cause: rpcError }
      )
    }

    if (rpcData?.deleted && typeof rpcData.deleted === 'object') {
      Object.assign(deletedCounts, rpcData.deleted)
    }

    // Confirm tenant gone
    const { data: stillThere } = await supabase.from('tenants').select('id').eq('id', tenantId).maybeSingle()
    if (stillThere) {
      throw new Error('Tenant row still exists after RPC — treating as FAILED (no partial success)')
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
      verification: {
        ok: false,
        leftovers: [{ table: 'tenants', remaining: 1, reason: err?.message || 'db failed' }],
      },
      emailSent: false,
      error: err?.message || String(err),
    }
  }

  // Auth cleanup (outside DB txn) — re-check exclusivity via remaining app user refs
  for (const cand of authCandidates) {
    const { data: remaining } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', cand.authUserId)

    if (remaining && remaining.length > 0) {
      authSkipped.push({
        authUserId: cand.authUserId,
        reason: remaining.some((r) => r.tenant_id && r.tenant_id !== tenantId)
          ? 'other tenant still references auth user'
          : `app users still reference auth user (${remaining.length})`,
      })
      continue
    }

    // Only delete identities that were exclusive at preview OR have zero remaining refs
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(cand.authUserId)
    if (delAuthErr) {
      authSkipped.push({ authUserId: cand.authUserId, reason: delAuthErr.message })
    } else {
      authDeleted.push(cand.authUserId)
    }
  }

  // Storage cleanup — only provably owned paths
  for (const obj of storageCandidates) {
    const { error: remErr } = await supabase.storage.from(obj.bucket).remove([obj.path])
    if (remErr) {
      storageFailed.push(`${obj.bucket}/${obj.path}: ${remErr.message}`)
    } else {
      storageDeleted.push(`${obj.bucket}/${obj.path}`)
    }
  }

  await updateJob(supabase, jobId, { status: 'VERIFYING' })
  const verification = await verifyTenantHardDelete(supabase, tenantId, {
    slug: preview.slug,
    exclusiveAuthUserIds: exclusiveAuthIds,
    sharedAuthUserIds: sharedAuthIds,
    expectedStorageObjects: storageCandidates.map((s) => ({ bucket: s.bucket, path: s.path })),
  })

  let status: HardDeleteStatus = 'COMPLETED'
  if (!verification.ok || storageFailed.length > 0) {
    status = 'PARTIAL_FAILURE'
  }

  const blockingAuthSkip = authSkipped.filter((s) =>
    s.reason.includes('still reference') && !s.reason.includes('other tenant')
  )
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
