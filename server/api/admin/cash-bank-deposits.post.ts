import { createError, defineEventHandler, readBody } from 'h3'
import { assertStatementUploadSize } from '~/server/utils/csv-upload-limit'
import {
  canAssignDepositor,
  canConfirmReconciliation,
  isEligibleDepositorRole,
  isIsoDate,
  isPositiveRappen,
  matchCreditToDeposits,
  planAttributionChange,
  rejectClientTenantOverride,
  tenantOwnsResource,
  validateReportInput,
  type BankCreditInput,
  type DepositMatchInput,
  type DepositStatus,
} from '~/server/utils/cash-bank-deposit'
import {
  creditsFromCamt,
  creditsFromCsv,
  previewStatementLines,
  resolveCsvMapping,
  type StatementLine,
} from '~/server/utils/cash-bank-statement'
import { requireTenantStaff } from '~/server/utils/require-tenant-auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import type { ColumnMapping } from '~/server/utils/csv-parse'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type DepositRow = {
  id: string
  tenant_id: string
  status: DepositStatus
  amount_rappen: number
  currency: string
  source_kind: string
  source_user_id: string | null
  depositor_user_id: string | null
  attribution_status: string
  attribution_updated_at: string | null
  reported_on: string
  reported_by: string
  reference_token: string
  candidate_match_class: string | null
  candidate_entry_date: string | null
  candidate_amount_rappen: number | null
  candidate_direction: string | null
  candidate_dedupe_key: string | null
  journal_id: string | null
  bank_import_record_id: string | null
  created_at: string
}

function assertUuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `${label} ist ungültig` })
  }
  return value
}

function optionalUuid(value: unknown): string | null {
  if (value == null || value === '') return null
  return assertUuid(value, 'Benutzer')
}

function rpcFailure(error: { message?: string; code?: string; details?: string }, action: string): never {
  const blob = `${error.code || ''} ${error.message || ''} ${error.details || ''}`
  console.error('cash-bank rpc failed', action, error.code || 'error')
  if (/does not exist|schema cache/i.test(blob)) {
    throw createError({ statusCode: 503, statusMessage: 'Die Abgleich-Funktion ist in dieser Datenbank noch nicht vorhanden' })
  }
  if (blob.includes('tenant_required') || blob.includes('forbidden')) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung für diesen Mandanten' })
  }
  if (blob.includes('deposit_not_found')) {
    throw createError({ statusCode: 404, statusMessage: 'Einzahlung wurde nicht gefunden' })
  }
  if (blob.includes('reason_required')) {
    throw createError({ statusCode: 400, statusMessage: 'Für eine Korrektur nach dem Abgleich braucht es eine Begründung' })
  }
  if (blob.includes('bank_line_used') || blob.includes('23505') || blob.includes('duplicate key')) {
    throw createError({ statusCode: 409, statusMessage: 'Diese Kontoauszugszeile ist bereits zugeordnet' })
  }
  throw createError({ statusCode: 409, statusMessage: 'Die Einzahlung kann in diesem Zustand nicht so geändert werden' })
}

export default defineEventHandler(async (event) => {
  const actor = await requireTenantStaff(event)
  rejectClientTenant(actor.tenant_id, event)
  const body = await readBody(event) as Record<string, unknown>
  try {
    rejectClientTenantOverride(actor.tenant_id, body?.tenant_id)
  } catch {
    throw createError({ statusCode: 403, statusMessage: 'Mandant wird nur aus der Anmeldung gelesen' })
  }
  if (!UUID_RE.test(actor.id) || !UUID_RE.test(actor.tenant_id)) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung für diesen Mandanten' })
  }

  const action = typeof body?.action === 'string' ? body.action : ''
  const supabase = getSupabaseAdmin()

  if (action === 'list_depositors') {
    return { depositors: await listDepositors(supabase, actor.tenant_id, actor) }
  }

  if (action === 'list') {
    const rows = await listDeposits(supabase, actor)
    const names = await loadNames(supabase, actor.tenant_id, rows)
    return {
      flow: 'cash_bank_reconciliation',
      legacy_snapshots_unchanged: true,
      deposits: rows.map(row => toDto(row, names)),
    }
  }

  if (action === 'report' || action === 'create_from_credit') {
    return reportDeposit(supabase, actor, body)
  }

  if (action === 'preview_import') {
    requireConfirmRole(actor.role)
    return previewImport(supabase, actor.tenant_id, body)
  }

  if (action === 'select_candidate') {
    requireConfirmRole(actor.role)
    return selectCandidate(supabase, actor, body)
  }

  if (action === 'confirm') {
    requireConfirmRole(actor.role)
    return confirmDeposit(supabase, actor, body)
  }

  if (action === 'cancel' || action === 'clear_candidate') {
    requireConfirmRole(actor.role)
    return setOpenStatus(supabase, actor, body, action)
  }

  if (action === 'set_depositor') {
    return setDepositor(supabase, actor, body)
  }

  throw createError({ statusCode: 400, statusMessage: 'Unbekannte Aktion' })
})

function rejectClientTenant(sessionTenantId: string, _event: unknown) {
  if (!sessionTenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung für diesen Mandanten' })
  }
}

function requireConfirmRole(role: string) {
  if (!canConfirmReconciliation(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Nur eine Administration darf diesen Schritt ausführen' })
  }
}

async function listDepositors(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, actor: { id: string; role: string }) {
  let query = supabase
    .from('users')
    .select('id, first_name, last_name, role, is_active')
    .eq('tenant_id', tenantId)
    .in('role', ['staff', 'admin', 'tenant_admin', 'super_admin'])
    .is('deleted_at', null)
    .order('first_name')
  if (actor.role === 'staff') query = query.eq('id', actor.id)
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: 'Personen konnten nicht geladen werden' })
  return (data || [])
    .filter(row => row.is_active !== false && isEligibleDepositorRole(row.role))
    .map(row => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Ohne Namen',
      role: row.role,
    }))
}

async function listDeposits(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string; role: string }) {
  let query = supabase
    .from('cash_deposit_reports')
    .select('id, tenant_id, status, amount_rappen, currency, source_kind, source_user_id, depositor_user_id, attribution_status, attribution_updated_at, reported_on, reported_by, reference_token, candidate_match_class, candidate_entry_date, candidate_amount_rappen, candidate_direction, candidate_dedupe_key, journal_id, bank_import_record_id, created_at')
    .eq('tenant_id', actor.tenant_id)
    .neq('status', 'cancelled')
    .order('reported_on', { ascending: false })
    .limit(200)
  if (actor.role === 'staff') {
    query = query.or(`reported_by.eq.${actor.id},source_user_id.eq.${actor.id},depositor_user_id.eq.${actor.id}`)
  }
  const { data, error } = await query
  if (error) {
    if (/does not exist|schema cache/i.test(error.message || '')) {
      throw createError({ statusCode: 503, statusMessage: 'Die Abgleich-Funktion ist in dieser Datenbank noch nicht vorhanden' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Einzahlungen konnten nicht geladen werden' })
  }
  return (data || []) as DepositRow[]
}

async function loadNames(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, rows: DepositRow[]) {
  const ids = [...new Set(rows.flatMap(row => [row.depositor_user_id, row.source_user_id].filter((id): id is string => !!id)))]
  const names = new Map<string, string>()
  if (ids.length === 0) return names
  const { data } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('id', ids)
  for (const user of data || []) {
    names.set(user.id, `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Ohne Namen')
  }
  return names
}

function toDto(row: DepositRow, names: Map<string, string>) {
  return {
    id: row.id,
    status: row.status,
    amount_rappen: row.amount_rappen,
    currency: row.currency,
    source_kind: row.source_kind,
    source_user_id: row.source_user_id,
    source_user_name: row.source_user_id ? names.get(row.source_user_id) || null : null,
    depositor_user_id: row.depositor_user_id,
    depositor_name: row.depositor_user_id ? names.get(row.depositor_user_id) || null : null,
    attribution_status: row.attribution_status,
    attribution_updated_at: row.attribution_updated_at,
    reported_on: row.reported_on,
    reference_token: row.reference_token,
    candidate_match_class: row.candidate_match_class,
    candidate_entry_date: row.candidate_entry_date,
    candidate_amount_rappen: row.candidate_amount_rappen,
    journal_id: row.journal_id,
    legacy_balance_updated: false,
  }
}

async function loadUser(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, tenant_id, role, is_active, deleted_at')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error || !data || !tenantOwnsResource(data.tenant_id, tenantId)) return null
  if (data.deleted_at || data.is_active === false) return null
  return data
}

async function reportDeposit(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string; role: string }, body: Record<string, unknown>) {
  const idempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : ''
  if (idempotencyKey.length < 8 || idempotencyKey.length > 80) {
    throw createError({ statusCode: 400, statusMessage: 'Der Idempotenzschlüssel ist ungültig' })
  }

  let amountRappen = body.amount_rappen
  let reportedOn = body.reported_on
  let sourceKind = body.source_kind
  if (body.action === 'create_from_credit') {
    requireConfirmRole(actor.role)
    const line = readCandidate(body)
    if (line.direction !== 'credit' || (line.currency || 'CHF').toUpperCase() !== 'CHF' || line.amountRappen <= 0) {
      throw createError({ statusCode: 409, statusMessage: 'Nur eine Gutschrift in CHF kann als Bareinzahlung gemeldet werden' })
    }
    const open = await openDeposits(supabase, actor.tenant_id)
    const existing = matchCreditToDeposits(line, open)
    const blocked = existing.matchClass === 'exact'
      || existing.matchClass === 'suggestion'
      || existing.matchClass === 'ambiguous'
      || (existing.matchClass === 'unresolved_amount' && existing.depositIds.length > 0)
    if (blocked) {
      return { result: 'use_existing', match_class: existing.matchClass, deposit_ids: existing.depositIds }
    }
    amountRappen = line.amountRappen
    reportedOn = line.date
    if (sourceKind !== 'business' && sourceKind !== 'staff' && sourceKind !== 'admin') sourceKind = 'business'
  }

  if (typeof sourceKind !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Die Herkunft der Einzahlung fehlt' })
  }
  const sourceUserId = optionalUuid(body.source_user_id)
  const depositorUserId = optionalUuid(body.depositor_user_id)
  const sourceUser = sourceUserId ? await loadUser(supabase, sourceUserId, actor.tenant_id) : null
  const depositor = depositorUserId ? await loadUser(supabase, depositorUserId, actor.tenant_id) : null
  if (sourceUserId && !sourceUser) {
    throw createError({ statusCode: 403, statusMessage: 'Die Herkunftsperson gehört nicht zu diesem Mandanten' })
  }
  if (depositorUserId && !depositor) {
    throw createError({ statusCode: 403, statusMessage: 'Die einzahlende Person gehört nicht zu diesem Mandanten' })
  }
  const report = validateReportInput({
    actorRole: actor.role,
    actorId: actor.id,
    actorTenantId: actor.tenant_id,
    sourceKind,
    sourceUserId,
    sourceUserTenantId: sourceUser?.tenant_id ?? null,
    sourceUserRole: sourceUser?.role ?? null,
    depositorUserId,
    depositorTenantId: depositor?.tenant_id ?? null,
    depositorRole: depositor?.role ?? null,
    amountRappen: amountRappen as number,
    reportedOn: String(reportedOn || ''),
  })
  if (!report.ok) {
    const status = report.reason === 'tenant' || report.reason === 'forbidden' ? 403 : 400
    throw createError({ statusCode: status, statusMessage: 'Die Meldung ist so nicht zulässig' })
  }
  if (!isPositiveRappen(amountRappen) || !isIsoDate(String(reportedOn || ''))) {
    throw createError({ statusCode: 400, statusMessage: 'Betrag oder Datum ist ungültig' })
  }

  const { data, error } = await supabase.rpc('report_cash_bank_deposit', {
    p_tenant_id: actor.tenant_id,
    p_actor_id: actor.id,
    p_idempotency_key: idempotencyKey,
    p_source_kind: sourceKind,
    p_source_user_id: sourceUserId,
    p_amount_rappen: amountRappen,
    p_reported_on: reportedOn,
    p_depositor_user_id: depositorUserId,
  })
  if (error) rpcFailure(error, 'report')
  const depositId = data?.deposit_id as string
  let linked = false
  if (body.action === 'create_from_credit' && data?.result === 'reported') {
    const line = readCandidate(body)
    const open = await openDeposits(supabase, actor.tenant_id)
    const match = matchCreditToDeposits(line, open)
    if ((match.matchClass === 'exact' || match.matchClass === 'suggestion') && match.depositIds.includes(depositId)) {
      const selected = await supabase.rpc('select_cash_bank_deposit_candidate', {
        p_tenant_id: actor.tenant_id,
        p_actor_id: actor.id,
        p_deposit_id: depositId,
        p_dedupe_key: line.dedupeKey,
        p_amount_rappen: line.amountRappen,
        p_entry_date: line.date,
        p_direction: 'credit',
        p_match_class: match.matchClass,
        p_bank_ref: lineBankRef(body),
      })
      if (selected.error) rpcFailure(selected.error, 'select')
      linked = true
    }
  }
  const row = await loadOwnDeposit(supabase, actor.tenant_id, depositId)
  const names = await loadNames(supabase, actor.tenant_id, [row])
  return { result: data?.result || 'reported', linked, legacy_balance_updated: false, deposit: toDto(row, names) }
}

async function previewImport(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, body: Record<string, unknown>) {
  const kind = body.statement_kind === 'camt' ? 'camt' : 'csv'
  const content = kind === 'camt' ? body.xml_content : body.csv_content
  if (typeof content !== 'string' || !content.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Die Datei ist leer' })
  }
  assertStatementUploadSize(content)
  let lines: StatementLine[]
  try {
    if (kind === 'camt') {
      lines = creditsFromCamt(content).lines
    } else {
      const mapping = resolveCsvMapping(content, (body.mapping || null) as Partial<ColumnMapping> | null)
      lines = creditsFromCsv(content, mapping).lines
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'mapping') {
      throw createError({ statusCode: 422, statusMessage: 'Datum und Betrag konnten nicht zugeordnet werden' })
    }
    throw createError({ statusCode: 422, statusMessage: 'Die Datei konnte nicht gelesen werden' })
  }
  const open = await openDeposits(supabase, tenantId)
  return {
    lines: previewStatementLines(lines, open),
    legacy_balance_updated: false,
    posted: false,
  }
}

async function selectCandidate(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string }, body: Record<string, unknown>) {
  const depositId = assertUuid(body.deposit_id, 'Einzahlung')
  const line = readCandidate(body)
  const open = await openDeposits(supabase, actor.tenant_id)
  const target = open.find(row => row.id === depositId)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Einzahlung wurde nicht gefunden' })
  }
  const match = matchCreditToDeposits(line, open)
  if (match.matchClass !== 'exact' && match.matchClass !== 'suggestion') {
    return { result: 'unmatched', match_class: match.matchClass, deposit_ids: match.depositIds, posted: false }
  }
  if (!match.depositIds.includes(depositId)) {
    throw createError({ statusCode: 409, statusMessage: 'Diese Gutschrift gehört zu einer anderen Meldung' })
  }
  const { error } = await supabase.rpc('select_cash_bank_deposit_candidate', {
    p_tenant_id: actor.tenant_id,
    p_actor_id: actor.id,
    p_deposit_id: depositId,
    p_dedupe_key: line.dedupeKey,
    p_amount_rappen: line.amountRappen,
    p_entry_date: line.date,
    p_direction: line.direction,
    p_match_class: match.matchClass,
    p_bank_ref: lineBankRef(body),
  })
  if (error) rpcFailure(error, 'select')
  const row = await loadOwnDeposit(supabase, actor.tenant_id, depositId)
  const names = await loadNames(supabase, actor.tenant_id, [row])
  return { result: 'matched', posted: false, legacy_balance_updated: false, deposit: toDto(row, names) }
}

async function confirmDeposit(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string }, body: Record<string, unknown>) {
  const depositId = assertUuid(body.deposit_id, 'Einzahlung')
  const { data, error } = await supabase.rpc('confirm_cash_bank_deposit', {
    p_tenant_id: actor.tenant_id,
    p_actor_id: actor.id,
    p_deposit_id: depositId,
  })
  if (error) {
    const blob = `${error.code || ''} ${error.message || ''}`
    if (/23505|duplicate key/i.test(blob)) {
      const row = await loadOwnDeposit(supabase, actor.tenant_id, depositId).catch(() => null)
      if (row?.status === 'reconciled' && row.journal_id) {
        const names = await loadNames(supabase, actor.tenant_id, [row])
        return { result: 'already_reconciled', legacy_balance_updated: false, deposit: toDto(row, names) }
      }
    }
    rpcFailure(error, 'confirm')
  }
  const row = await loadOwnDeposit(supabase, actor.tenant_id, (data?.deposit_id as string) || depositId)
  const names = await loadNames(supabase, actor.tenant_id, [row])
  return {
    result: data?.result || 'reconciled',
    journal_id: row.journal_id,
    legacy_balance_updated: false,
    deposit: toDto(row, names),
  }
}

async function setOpenStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  actor: { id: string; tenant_id: string },
  body: Record<string, unknown>,
  action: 'cancel' | 'clear_candidate',
) {
  const depositId = assertUuid(body.deposit_id, 'Einzahlung')
  const patch = action === 'cancel'
    ? { status: 'cancelled', updated_at: new Date().toISOString() }
    : {
        status: 'reported',
        candidate_dedupe_key: null,
        candidate_amount_rappen: null,
        candidate_entry_date: null,
        candidate_direction: null,
        candidate_match_class: null,
        candidate_bank_ref: null,
        updated_at: new Date().toISOString(),
      }
  const { data, error } = await supabase
    .from('cash_deposit_reports')
    .update(patch)
    .eq('id', depositId)
    .eq('tenant_id', actor.tenant_id)
    .in('status', ['reported', 'matched'])
    .select('id')
  if (error) rpcFailure(error, action)
  if (!data?.length) {
    throw createError({ statusCode: 409, statusMessage: 'Die Einzahlung kann in diesem Zustand nicht so geändert werden' })
  }
  return { result: action === 'cancel' ? 'cancelled' : 'reported', legacy_balance_updated: false }
}

async function setDepositor(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string; role: string }, body: Record<string, unknown>) {
  const depositId = assertUuid(body.deposit_id, 'Einzahlung')
  const nextId = optionalUuid(body.depositor_user_id)
  const row = await loadOwnDeposit(supabase, actor.tenant_id, depositId)
  if (nextId) {
    const user = await loadUser(supabase, nextId, actor.tenant_id)
    if (!user || !isEligibleDepositorRole(user.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Die einzahlende Person gehört nicht zu diesem Mandanten' })
    }
  }
  const plan = planAttributionChange({
    actorRole: actor.role,
    actorId: actor.id,
    depositReportedBy: row.reported_by,
    status: row.status,
    currentDepositorId: row.depositor_user_id,
    nextDepositorId: nextId,
    reason: typeof body.reason === 'string' ? body.reason : null,
  })
  if (!plan.ok) {
    if (!canAssignDepositor({
      actorRole: actor.role,
      actorId: actor.id,
      depositReportedBy: row.reported_by,
      nextDepositorId: nextId,
      status: row.status,
    }) && row.status !== 'reconciled') {
      throw createError({ statusCode: 403, statusMessage: 'Keine Berechtigung für diese Zuordnung' })
    }
    const status = plan.reason === 'forbidden' ? 403 : 400
    throw createError({ statusCode: status, statusMessage: plan.reason === 'reason_required' ? 'Für eine Korrektur nach dem Abgleich braucht es eine Begründung' : 'Die Zuordnung kann so nicht geändert werden' })
  }
  const { error } = await supabase.rpc('apply_cash_deposit_attribution', {
    p_tenant_id: actor.tenant_id,
    p_actor_id: actor.id,
    p_deposit_id: depositId,
    p_next_user_id: nextId,
    p_reason: plan.event.reason,
  })
  if (error) rpcFailure(error, 'attribution')
  const updated = await loadOwnDeposit(supabase, actor.tenant_id, depositId)
  const names = await loadNames(supabase, actor.tenant_id, [updated])
  return {
    result: plan.event.kind,
    journal_id: updated.journal_id,
    journal_unchanged: true,
    legacy_balance_updated: false,
    deposit: toDto(updated, names),
  }
}

async function openDeposits(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string): Promise<DepositMatchInput[]> {
  const { data, error } = await supabase
    .from('cash_deposit_reports')
    .select('id, tenant_id, amount_rappen, reported_on, reference_token, status')
    .eq('tenant_id', tenantId)
    .in('status', ['reported', 'matched'])
    .limit(500)
  if (error) {
    if (/does not exist|schema cache/i.test(error.message || '')) {
      throw createError({ statusCode: 503, statusMessage: 'Die Abgleich-Funktion ist in dieser Datenbank noch nicht vorhanden' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Offene Meldungen konnten nicht geladen werden' })
  }
  return (data || []).map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    amountRappen: row.amount_rappen,
    reportedOn: row.reported_on,
    referenceToken: row.reference_token,
    status: row.status,
  }))
}

async function loadOwnDeposit(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, depositId: string): Promise<DepositRow> {
  const { data, error } = await supabase
    .from('cash_deposit_reports')
    .select('id, tenant_id, status, amount_rappen, currency, source_kind, source_user_id, depositor_user_id, attribution_status, attribution_updated_at, reported_on, reported_by, reference_token, candidate_match_class, candidate_entry_date, candidate_amount_rappen, candidate_direction, candidate_dedupe_key, journal_id, bank_import_record_id, created_at')
    .eq('id', depositId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error || !data || !tenantOwnsResource(data.tenant_id, tenantId)) {
    throw createError({ statusCode: 404, statusMessage: 'Einzahlung wurde nicht gefunden' })
  }
  return data as DepositRow
}

function lineBankRef(body: Record<string, unknown>): string | null {
  const candidate = body.candidate
  if (!candidate || typeof candidate !== 'object') return null
  const value = (candidate as Record<string, unknown>).bank_ref
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null
}

function readCandidate(body: Record<string, unknown>): BankCreditInput {
  const candidate = body.candidate
  if (!candidate || typeof candidate !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Die Kontoauszugszeile fehlt' })
  }
  const row = candidate as Record<string, unknown>
  const dedupeKey = typeof row.dedupe_key === 'string' ? row.dedupe_key.trim() : ''
  const date = typeof row.date === 'string' ? row.date : ''
  const direction = row.direction
  const currency = typeof row.currency === 'string' ? row.currency : 'CHF'
  if (!dedupeKey || dedupeKey.length > 500 || !isIsoDate(date)) {
    throw createError({ statusCode: 400, statusMessage: 'Die Kontoauszugszeile ist unvollständig' })
  }
  if (direction !== 'credit' && direction !== 'debit' && direction !== 'reversal') {
    throw createError({ statusCode: 400, statusMessage: 'Die Kontoauszugszeile ist unvollständig' })
  }
  if (!isPositiveRappen(row.amount_rappen)) {
    throw createError({ statusCode: 400, statusMessage: 'Der Betrag der Kontoauszugszeile ist ungültig' })
  }
  return {
    dedupeKey,
    amountRappen: row.amount_rappen,
    date,
    currency,
    direction,
    reference: typeof row.reference === 'string' ? row.reference.slice(0, 180) : '',
    remittance: typeof row.remittance === 'string' ? row.remittance.slice(0, 180) : '',
  }
}
