import { createError, defineEventHandler, readBody } from 'h3'
import { assertStatementUploadSize } from '~/server/utils/csv-upload-limit'
import {
  canAssignDepositor,
  canConfirmReconciliation,
  collectCompletePages,
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
  if (blob.includes('bank_line_used') || blob.includes('ordinary_payment')) {
    throw createError({ statusCode: 409, statusMessage: 'Diese Kontoauszugszeile ist bereits einer Rechnung oder Ausgabe zugeordnet' })
  }
  if (blob.includes('idempotency_conflict')) {
    throw createError({ statusCode: 409, statusMessage: 'Diese Meldung widerspricht einer bereits gespeicherten Meldung' })
  }
  if (blob.includes('token_collision')) {
    throw createError({ statusCode: 409, statusMessage: 'Die Referenz konnte nicht vergeben werden. Bitte erneut versuchen' })
  }
  if (blob.includes('missing_statement_line') || blob.includes('statement_not_found')) {
    throw createError({ statusCode: 409, statusMessage: 'Die Kontoauszugszeile ist nicht gespeichert' })
  }
  if (blob.includes('forged_dedupe') || blob.includes('bank_row_mismatch')) {
    throw createError({ statusCode: 409, statusMessage: 'Die Kontoauszugszeile stimmt nicht mit dem gespeicherten Beleg überein' })
  }
  if (blob.includes('insufficient_evidence')) {
    throw createError({ statusCode: 409, statusMessage: 'Ohne die Einzahlungsreferenz auf dem Kontoauszug wird nicht gebucht' })
  }
  if (blob.includes('drawer_missing') || blob.includes('drawer_ambiguous')) {
    throw createError({ statusCode: 409, statusMessage: 'Die Herkunftskasse ist nicht eindeutig. Es wurde nichts gebucht' })
  }
  if (blob.includes('insufficient_drawer') || blob.includes('bank_insufficient')) {
    throw createError({ statusCode: 409, statusMessage: 'Der gespeicherte Saldo reicht für diese Buchung nicht' })
  }
  if (blob.includes('currency')) {
    throw createError({ statusCode: 409, statusMessage: 'Nur eine explizite CHF-Gutschrift kann bestätigt werden' })
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
      deposits: rows.map(row => toDto(row, names)),
    }
  }

  if (action === 'reverse') {
    requireConfirmRole(actor.role)
    return reverseDeposit(supabase, actor, body)
  }

  if (action === 'report' || action === 'create_from_credit') {
    return reportDeposit(supabase, actor, body)
  }

  if (action === 'preview_import') {
    requireConfirmRole(actor.role)
    return previewImport(supabase, actor, body)
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
  if (idempotencyKey.length < 8 || idempotencyKey.length > 180) {
    throw createError({ statusCode: 400, statusMessage: 'Der Idempotenzschlüssel ist ungültig' })
  }

  let amountRappen = body.amount_rappen
  let reportedOn = body.reported_on
  let sourceKind = body.source_kind
  let persistedLine: Awaited<ReturnType<typeof loadStatementLine>> | null = null
  if (body.action === 'create_from_credit') {
    requireConfirmRole(actor.role)
    persistedLine = await loadStatementLine(supabase, actor.tenant_id, assertUuid(body.statement_line_id, 'Kontoauszugszeile'))
    if (persistedLine.direction !== 'credit' || persistedLine.currency !== 'CHF' || persistedLine.amount_rappen <= 0) {
      throw createError({ statusCode: 409, statusMessage: 'Nur eine gespeicherte CHF-Gutschrift kann als Bareinzahlung gemeldet werden' })
    }
    const open = await openDeposits(supabase, actor.tenant_id)
    const existing = matchCreditToDeposits(storedCredit(persistedLine), open)
    const blocked = existing.matchClass === 'exact'
      || existing.matchClass === 'suggestion'
      || existing.matchClass === 'ambiguous'
      || (existing.matchClass === 'unresolved_amount' && existing.depositIds.length > 0)
    if (blocked) {
      return { result: 'use_existing', match_class: existing.matchClass, deposit_ids: existing.depositIds }
    }
    amountRappen = persistedLine.amount_rappen
    reportedOn = persistedLine.entry_date
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
  if (body.action === 'create_from_credit' && persistedLine) {
    const current = data?.result === 'existing' ? await loadOwnDeposit(supabase, actor.tenant_id, depositId) : null
    if (data?.result === 'reported' || current?.status === 'reported' || current?.status === 'matched') {
      const selected = await supabase.rpc('select_cash_bank_deposit_candidate', {
        p_tenant_id: actor.tenant_id,
        p_actor_id: actor.id,
        p_deposit_id: depositId,
        p_statement_line_id: persistedLine.id,
      })
      if (selected.error) rpcFailure(selected.error, 'select')
      linked = true
    }
  }
  const row = await loadOwnDeposit(supabase, actor.tenant_id, depositId)
  const names = await loadNames(supabase, actor.tenant_id, [row])
  return { result: data?.result || 'reported', linked, authoritative_balances_updated: false, deposit: toDto(row, names) }
}

async function previewImport(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string }, body: Record<string, unknown>) {
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
  const { data, error } = await supabase.rpc('persist_cash_bank_statement_lines', {
    p_tenant_id: actor.tenant_id,
    p_actor_id: actor.id,
    p_source: kind,
    p_lines: lines.map(line => ({
      dedupe_key: line.dedupeKey,
      amount_rappen: line.amountRappen,
      currency: line.currency,
      direction: line.direction,
      entry_date: line.date,
      reference: line.reference || '',
      remittance: line.remittance || '',
      debtor_name: line.debtorName || '',
      bank_ref: line.bankRef,
    })),
  })
  if (error) rpcFailure(error, 'preview')
  const stored = new Map<number, { statement_line_id: string | null; result: string }>()
  for (const row of (data?.lines || []) as Array<{ index: number; statement_line_id: string | null; result: string }>) {
    stored.set(row.index, row)
  }
  const open = await openDeposits(supabase, actor.tenant_id)
  return {
    lines: previewStatementLines(lines, open).map((line, index) => ({
      ...line,
      statement_line_id: stored.get(index)?.statement_line_id || null,
      persist_result: stored.get(index)?.result || 'invalid',
    })),
    authoritative_balances_updated: false,
    posted: false,
  }
}

async function selectCandidate(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string }, body: Record<string, unknown>) {
  const depositId = assertUuid(body.deposit_id, 'Einzahlung')
  const lineId = assertUuid(body.statement_line_id, 'Kontoauszugszeile')
  await loadStatementLine(supabase, actor.tenant_id, lineId)
  const { error } = await supabase.rpc('select_cash_bank_deposit_candidate', {
    p_tenant_id: actor.tenant_id,
    p_actor_id: actor.id,
    p_deposit_id: depositId,
    p_statement_line_id: lineId,
  })
  if (error) rpcFailure(error, 'select')
  const row = await loadOwnDeposit(supabase, actor.tenant_id, depositId)
  const names = await loadNames(supabase, actor.tenant_id, [row])
  return { result: 'matched', posted: false, authoritative_balances_updated: false, deposit: toDto(row, names) }
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
        return { result: 'already_reconciled', authoritative_balances_updated: false, deposit: toDto(row, names) }
      }
    }
    rpcFailure(error, 'confirm')
  }
  const row = await loadOwnDeposit(supabase, actor.tenant_id, (data?.deposit_id as string) || depositId)
  const names = await loadNames(supabase, actor.tenant_id, [row])
  return {
    result: data?.result || 'reconciled',
    journal_id: row.journal_id,
    authoritative_balances_updated: data?.result === 'reconciled',
    deposit: toDto(row, names),
  }
}

async function reverseDeposit(supabase: ReturnType<typeof getSupabaseAdmin>, actor: { id: string; tenant_id: string }, body: Record<string, unknown>) {
  const depositId = assertUuid(body.deposit_id, 'Einzahlung')
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (reason.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'Für eine Korrektur nach dem Abgleich braucht es eine Begründung' })
  }
  const { data, error } = await supabase.rpc('reverse_cash_bank_deposit', {
    p_tenant_id: actor.tenant_id,
    p_actor_id: actor.id,
    p_deposit_id: depositId,
    p_reason: reason,
  })
  if (error) rpcFailure(error, 'reverse')
  const row = await loadOwnDeposit(supabase, actor.tenant_id, depositId)
  const names = await loadNames(supabase, actor.tenant_id, [row])
  return {
    result: data?.result || 'reversed',
    journal_id: row.journal_id,
    authoritative_balances_updated: data?.result === 'reversed',
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
        statement_line_id: null,
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
  return { result: action === 'cancel' ? 'cancelled' : 'reported', authoritative_balances_updated: false }
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
    authoritative_balances_updated: false,
    deposit: toDto(updated, names),
  }
}

async function openDeposits(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string): Promise<DepositMatchInput[]> {
  try {
    const data = await collectCompletePages(async (from, to) => {
      const { data: page, error } = await supabase
        .from('cash_deposit_reports')
        .select('id, tenant_id, amount_rappen, reported_on, reference_token, status')
        .eq('tenant_id', tenantId)
        .in('status', ['reported', 'matched'])
        .order('id', { ascending: true })
        .range(from, to)
      if (error) {
        if (/does not exist|schema cache/i.test(error.message || '')) {
          throw createError({ statusCode: 503, statusMessage: 'Die Abgleich-Funktion ist in dieser Datenbank noch nicht vorhanden' })
        }
        throw createError({ statusCode: 500, statusMessage: 'Offene Meldungen konnten nicht geladen werden' })
      }
      return page || []
    })
    return data.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      amountRappen: row.amount_rappen,
      reportedOn: row.reported_on,
      referenceToken: row.reference_token,
      status: row.status,
    }))
  } catch (error) {
    if (error instanceof Error && error.message === 'incomplete_candidates') {
      throw createError({ statusCode: 409, statusMessage: 'Die offenen Meldungen sind unvollständig. Es wird nichts abgeglichen' })
    }
    throw error
  }
}

async function loadStatementLine(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string, lineId: string) {
  const { data, error } = await supabase
    .from('cash_bank_statement_lines')
    .select('id, tenant_id, amount_rappen, currency, direction, entry_date, dedupe_key, reference, remittance')
    .eq('id', lineId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error || !data || !tenantOwnsResource(data.tenant_id, tenantId)) {
    throw createError({ statusCode: 404, statusMessage: 'Die Kontoauszugszeile ist nicht gespeichert' })
  }
  return data
}

function storedCredit(line: { dedupe_key: string; amount_rappen: number; entry_date: string; currency: string; direction: string; reference: string | null; remittance: string | null }): BankCreditInput {
  const direction = line.direction === 'debit' || line.direction === 'reversal' ? line.direction : 'credit'
  return {
    dedupeKey: line.dedupe_key,
    amountRappen: line.amount_rappen,
    date: line.entry_date,
    currency: line.currency,
    direction,
    reference: line.reference || '',
    remittance: line.remittance || '',
  }
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
