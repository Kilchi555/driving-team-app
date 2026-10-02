import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  accountPlannedRows,
  accountingBalances,
  buildOverwritePayload,
  normalizePhone,
  planCustomerImport,
  refineSupplementPlans,
  settleInsertBatch,
  updatePayloadIsSafe,
  type CustomerFieldBag,
  type CustomerImportLookups,
  type CustomerImportRawRow,
  type InsertPlan,
  type PlannedRow,
} from '../customer-import'

function lookups(seed?: Partial<CustomerImportLookups>): CustomerImportLookups {
  return {
    byEmail: seed?.byEmail ?? new Map(),
    byPhone: seed?.byPhone ?? new Map(),
    byNameBirthdate: seed?.byNameBirthdate ?? new Map(),
    byLernfahrausweis: seed?.byLernfahrausweis ?? new Map(),
  }
}

function plan(
  rows: CustomerImportRawRow[],
  extra: Partial<Parameters<typeof planCustomerImport>[0]> = {},
): PlannedRow[] {
  return planCustomerImport({
    rows,
    tenantId: 'tenant-a',
    duplicateMode: 'skip',
    lookups: lookups(),
    ...extra,
  })
}

function person(overrides: CustomerImportRawRow = {}): CustomerImportRawRow {
  return { first_name: 'Max', last_name: 'Muster', ...overrides }
}

function inserts(rows: PlannedRow[]): InsertPlan[] {
  return rows.filter((row): row is InsertPlan => row.kind === 'insert')
}

describe('customer import language', () => {
  it('omits language from the insert payload when it is missing', () => {
    const [row] = inserts(plan([person({ email: 'ada@example.com' })]))
    expect(row.record).not.toHaveProperty('language')
    expect(row.record.language).toBeUndefined()
  })

  it('stores a supplied language only when it is an allowed code', () => {
    const [row] = inserts(plan([person({ email: 'ada@example.com', language: 'de' })]))
    expect(row.record.language).toBe('de')

    const upper = inserts(plan([person({ email: 'ada@example.com', language: 'DE' })]))
    expect(upper[0].record.language).toBe('de')

    const invalid = plan([person({ email: 'ada@example.com', language: 'xx' })])
    expect(invalid[0].kind).toBe('fail')
    expect(inserts(invalid)).toHaveLength(0)
  })
})

describe('customer import file-internal duplicates', () => {
  it('keeps the first email and skips the later identical row', () => {
    const rows = plan([
      person({ email: 'max@example.com' }),
      person({ email: 'max@example.com', first_name: 'Maxi' }),
    ], { duplicateMode: 'create' })

    expect(rows[0].kind).toBe('insert')
    expect(rows[1].kind).toBe('skip')
    if (rows[1].kind === 'skip') expect(rows[1].duplicate).toBe(true)
    expect(inserts(rows)).toHaveLength(1)
  })

  it('treats email case variants as the same file duplicate', () => {
    const rows = plan([
      person({ email: 'max@example.com' }),
      person({ email: 'MAX@example.com', first_name: 'Maxi' }),
    ], { duplicateMode: 'create' })

    expect(rows[0].kind).toBe('insert')
    expect(rows[1].kind).toBe('skip')
    if (rows[0].kind === 'insert') expect(rows[0].record.email).toBe('max@example.com')
  })

  it('treats differently formatted phones as one canonical key', () => {
    const rows = plan([
      person({ email: 'one@example.com', phone: '0791234567' }),
      person({ email: 'two@example.com', phone: '+41 79 123 45 67', first_name: 'Mia' }),
    ], { duplicateMode: 'create' })

    expect(rows[0].kind).toBe('insert')
    expect(rows[1].kind).toBe('skip')
    if (rows[0].kind === 'insert') expect(rows[0].record.phone).toBe('+41791234567')
    if (rows[1].kind === 'skip') expect(rows[1].fileInternal).toBe(true)
  })
})

describe('customer import phone canonical form', () => {
  it('maps 0791234567 and +41 79 123 45 67 to the same key', () => {
    expect(normalizePhone('0791234567')).toBe('+41791234567')
    expect(normalizePhone('+41 79 123 45 67')).toBe('+41791234567')
    expect(normalizePhone('0791234567')).toBe(normalizePhone('+41 79 123 45 67'))
  })

  it('keeps the 0041 prefix unchanged and distinct from +41', () => {
    expect(normalizePhone('0041791234567')).toBe('0041791234567')
    expect(normalizePhone('0041791234567')).not.toBe(normalizePhone('+41 79 123 45 67'))

    const rows = plan([
      person({ email: 'intl@example.com', phone: '0041791234567' }),
      person({ email: 'mobile@example.com', phone: '0791234567', first_name: 'Mia' }),
    ])
    expect(rows.map(row => row.kind)).toEqual(['insert', 'insert'])
    if (rows[0].kind === 'insert' && rows[1].kind === 'insert') {
      expect(rows[0].record.phone).toBe('0041791234567')
      expect(rows[1].record.phone).toBe('+41791234567')
    }
  })
})

describe('customer import partial failure', () => {
  it('drops an invalid row and still plans the valid siblings', () => {
    const rows = plan([
      person({ email: 'ok1@example.com' }),
      person({ email: 'bad@example.com', birthdate: '32.13.2020' }),
      person({ email: 'ok2@example.com', first_name: 'Mia' }),
    ])

    expect(rows.map(row => row.kind)).toEqual(['insert', 'fail', 'insert'])
    expect(inserts(rows).map(row => row.record.email)).toEqual(['ok1@example.com', 'ok2@example.com'])
    expect(rows[1].kind === 'fail' && rows[1].reason).toContain('Geburtsdatum')
  })

  it('does not count a rejected batch as created and keeps the other batch', () => {
    const rows = plan([
      person({ email: 'ok1@example.com' }),
      person({ email: 'bad@example.com', language: 'xx' }),
      person({ email: 'ok2@example.com', first_name: 'Mia' }),
    ])
    const batch = inserts(rows)
    expect(batch).toHaveLength(2)
    expect(batch.some(row => row.record.language === 'xx')).toBe(false)

    const kept = settleInsertBatch([batch[0]], { error: false, insertedCount: 1 })
    const rejected = settleInsertBatch([batch[1]], {
      error: true,
      insertedCount: 0,
      message: 'unique violation',
    })

    expect(kept.created).toBe(1)
    expect(rejected.created).toBe(0)
    expect(rejected.rows[0].kind).toBe('fail')
    if (rejected.rows[0].kind === 'fail') {
      expect(rejected.rows[0].sourceRow).toBe(batch[1].sourceRow)
      expect(rejected.rows[0].reason).toBe('unique violation')
    }

    const short = settleInsertBatch([batch[0]], { error: false, insertedCount: 0 })
    expect(short.created).toBe(0)
    expect(short.rows[0].kind).toBe('fail')
  })
})

describe('customer import accounting', () => {
  it('counts each row once and keeps duplicates inside skipped', () => {
    const byEmail = new Map([['exists@example.com', { id: 'user-1', role: 'client' }]])
    const rows = plan([
      person({ email: 'new@example.com' }),
      person({ email: 'exists@example.com', first_name: 'Alt' }),
      person({ email: 'NEW@example.com', first_name: 'Nochmals' }),
      person({ email: 'not-an-email', first_name: 'Kaputt' }),
    ], { lookups: lookups({ byEmail }) })

    const accounting = accountPlannedRows(rows)
    expect(accounting).toEqual({
      total: 4,
      created: 1,
      updated: 0,
      skipped: 2,
      failed: 1,
      duplicates: 2,
    })
    expect(accountingBalances(accounting)).toBe(true)
    expect(accounting.created + accounting.updated + accounting.skipped + accounting.failed).toBe(accounting.total)
    expect(accounting.duplicates).toBeLessThanOrEqual(accounting.skipped)
  })
})

describe('customer import dry-run parity and tenant safety', () => {
  it('uses one planner with no database client, and the handler returns before insert', () => {
    const first = plan([person({ email: 'ada@example.com', phone: '0791234567' })], { duplicateMode: 'overwrite' })
    const second = plan([person({ email: 'ada@example.com', phone: '0791234567' })], { duplicateMode: 'overwrite' })
    expect(first.map(row => row.kind)).toEqual(second.map(row => row.kind))

    const moduleSrc = readFileSync(resolve('server/utils/customer-import.ts'), 'utf8')
    const handlerSrc = readFileSync(resolve('server/api/admin/import-users.post.ts'), 'utf8')
    expect(moduleSrc).not.toMatch(/from ['"][^'"]*supabase/)
    expect(moduleSrc).not.toContain('getSupabaseAdmin')
    expect(handlerSrc.indexOf('if (dryRun)')).toBeGreaterThan(-1)
    expect(handlerSrc.indexOf('.insert(')).toBeGreaterThan(handlerSrc.indexOf('if (dryRun)'))
    expect(handlerSrc).toContain('planCustomerImport')
    expect(handlerSrc).toContain('loadLookups(supabase, rows, profile.tenant_id)')
    expect(handlerSrc).toContain('applyUpdate(supabase, row, profile.tenant_id)')
    expect(handlerSrc).toContain(".eq('tenant_id', tenantId)")
  })

  it('ignores client tenant, role and auth id on insert and overwrite', () => {
    const [created] = inserts(plan([person({
      email: 'ada@example.com',
      tenant_id: 'evil-tenant',
      role: 'admin',
      auth_user_id: 'auth-1',
      credits: '99',
    } as CustomerImportRawRow)]))
    expect(created.record.tenant_id).toBe('tenant-a')
    expect(created.record.role).toBe('client')
    expect(created.record).not.toHaveProperty('auth_user_id')
    expect(created.record).not.toHaveProperty('credits')

    const byEmail = new Map([['ada@example.com', { id: 'user-1', role: 'client' }]])
    const [update] = plan([person({
      email: 'ada@example.com',
      phone: '079 123 45 67',
      tenant_id: 'evil-tenant',
      role: 'super_admin',
    } as CustomerImportRawRow)], {
      duplicateMode: 'overwrite',
      lookups: lookups({ byEmail }),
    })
    expect(update.kind).toBe('update')
    if (update.kind === 'update') {
      expect(update.updatePayload.phone).toBe('+41791234567')
      expect(updatePayloadIsSafe(update.updatePayload)).toBe(true)
      expect(update.updatePayload).not.toHaveProperty('email')
      expect(update.updatePayload).not.toHaveProperty('tenant_id')
      expect(update.updatePayload).not.toHaveProperty('role')
    }
  })
})

describe('customer import archive label and formula safety', () => {
  it('does not tell the operator that the archive button writes public.leads', () => {
    const vue = readFileSync(resolve('pages/admin/data-management.vue'), 'utf8')
    expect(vue).not.toContain('>Marketing-Leads<')
    expect(vue).not.toContain('leads Tabelle')
    expect(vue).not.toContain('Leads (marketing)')
    expect(vue).toContain('Import-Archiv (imported_customers)')
    expect(vue).toContain('This does not write public.leads.')
    expect(vue).not.toContain('importedCount: rows.value.length')
    expect(vue).toContain('rowActions: { ...rowActions }')
  })

  it('neutralizes formula text and leaves email and canonical phone unchanged', () => {
    const [row] = inserts(plan([person({
      first_name: '=Ada',
      last_name: 'Lovelace',
      email: '=ada@example.com',
      phone: '+41 79 123 45 67',
      zip: '=8000',
      street_nr: '+12',
      faberid: '@123',
      category: '=b',
    })], { metadataFields: ['Notiz'] }))

    expect(row.record.first_name).toBe("'=Ada")
    expect(row.record.email).toBe('=ada@example.com')
    expect(row.record.phone).toBe('+41791234567')
    expect(String(row.record.phone).startsWith("'")).toBe(false)
    expect(row.record.zip).toBe("'=8000")
    expect(row.record.street_nr).toBe("'+12")
    expect(row.record.faberid).toBe("'@123")
    expect(row.record.category).toEqual(["'=B"])
  })
})

describe('customer import overwrite payload', () => {
  it('does not clear language when the file left it empty', () => {
    const bag = {
      email: 'ada@example.com',
      phone: '+41791234567',
      first_name: 'Ada',
      last_name: 'Lovelace',
      birthdate: null,
      street: null,
      street_nr: null,
      zip: null,
      city: null,
      lernfahrausweis_nr: null,
      category: null,
      profession: null,
      preferred_payment_method: null,
      faberid: null,
      sari_faberid: null,
      sari_birthdate: null,
      acquisition_source: null,
      referred_by_code: null,
      metadata: null,
      nameKey: null,
    } satisfies CustomerFieldBag
    const payload = buildOverwritePayload(bag)
    expect(payload).not.toHaveProperty('language')
    expect(updatePayloadIsSafe(payload)).toBe(true)
  })

  it('supplements only empty fields and keeps an existing value', () => {
    const byEmail = new Map([['ada@example.com', { id: 'user-1', role: 'client' }]])
    const [update] = plan([person({ email: 'ada@example.com', phone: '0791234567', city: 'Bern' })], {
      duplicateMode: 'supplement',
      lookups: lookups({ byEmail }),
    })
    expect(update.kind).toBe('update')
    if (update.kind !== 'update') return
    const refined = refineSupplementPlans([update], new Map([[
      'user-1',
      { id: 'user-1', phone: null, city: 'Zürich', language: 'de' },
    ]]), new Map())
    expect(refined[0].kind).toBe('update')
    if (refined[0].kind === 'update') {
      expect(refined[0].updatePayload.phone).toBe('+41791234567')
      expect(refined[0].updatePayload).not.toHaveProperty('city')
      expect(refined[0].updatePayload).not.toHaveProperty('language')
    }
  })
})
