import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  formatInvoiceStreetLine,
  restoreViewBilling,
  savedViewBillingBaseline,
  viewBillingFromInvoice,
  viewBillingSaveErrorMessage,
  viewBillingUpdatePayload,
} from '~/utils/billing-address-map'

const original = {
  billing_company_name: 'Muster AG',
  billing_contact_person: 'Anna Meier',
  billing_street: 'Bahnhofstrasse',
  billing_street_number: '12',
  billing_zip: '8001',
  billing_city: 'Zürich',
  billing_email: 'firma@example.ch',
}

describe('invoice preview view billing', () => {
  it('saves a changed house number and reloads Bahnhofstrasse 12a', () => {
    const loaded = viewBillingFromInvoice(original)
    const edited = { ...loaded, street_nr: '12a' }
    const updates = viewBillingUpdatePayload(edited)

    expect(updates.billing_street).toBe('Bahnhofstrasse')
    expect(updates.billing_street_number).toBe('12a')
    expect(updates).not.toHaveProperty('billing_street_nr')

    const reloaded = viewBillingFromInvoice({
      billing_street: updates.billing_street,
      billing_street_number: updates.billing_street_number,
      billing_zip: updates.billing_zip,
      billing_city: updates.billing_city,
    })
    expect(reloaded.street_nr).toBe('12a')
    expect(formatInvoiceStreetLine({
      billing_street: reloaded.street,
      billing_street_number: reloaded.street_nr,
    })).toBe('Bahnhofstrasse 12a')
  })

  it('keeps the existing house number when only the street changes', () => {
    const edited = { ...viewBillingFromInvoice(original), street: 'Seestrasse' }
    const updates = viewBillingUpdatePayload(edited)
    expect(updates.billing_street).toBe('Seestrasse')
    expect(updates.billing_street_number).toBe('12')
    expect(formatInvoiceStreetLine({
      billing_street: updates.billing_street,
      billing_street_number: updates.billing_street_number,
    })).toBe('Seestrasse 12')
  })

  it('sends an explicit empty house number', () => {
    const updates = viewBillingUpdatePayload({
      ...viewBillingFromInvoice(original),
      street_nr: '',
    })
    expect(Object.prototype.hasOwnProperty.call(updates, 'billing_street_number')).toBe(true)
    expect(updates.billing_street_number).toBe('')
    expect(updates.billing_street).toBe('Bahnhofstrasse')
  })

  it('does not restore an old number after an empty house number is reloaded', () => {
    const updates = viewBillingUpdatePayload({
      ...viewBillingFromInvoice(original),
      street_nr: '',
    })
    const reloaded = viewBillingFromInvoice({
      billing_street: updates.billing_street,
      billing_street_number: updates.billing_street_number,
      billing_street_nr: '12',
    })
    expect(reloaded.street_nr).toBe('')
    expect(formatInvoiceStreetLine({
      billing_street: reloaded.street,
      billing_street_number: reloaded.street_nr,
      billing_street_nr: '12',
    })).toBe('Bahnhofstrasse')
  })

  it('loads a legacy house number and saves it under the canonical field', () => {
    const loaded = viewBillingFromInvoice({
      billing_street: 'Bahnhofstrasse',
      billing_street_nr: '12a',
    })
    expect(loaded.street_nr).toBe('12a')
    const updates = viewBillingUpdatePayload(loaded)
    expect(updates.billing_street_number).toBe('12a')
    expect(updates).not.toHaveProperty('billing_street_nr')
  })

  it('does not display a duplicated 12a', () => {
    const loaded = viewBillingFromInvoice({
      billing_street: 'Bahnhofstrasse 12a',
      billing_street_number: '12a',
    })
    expect(formatInvoiceStreetLine({
      billing_street: loaded.street,
      billing_street_number: loaded.street_nr,
    })).toBe('Bahnhofstrasse 12a')
  })

  it('keeps the edited values and reports an error when saving fails', () => {
    const baseline = viewBillingFromInvoice(original)
    const editor = { ...baseline, street: 'Seestrasse', street_nr: '9' }
    const keptEditor = savedViewBillingBaseline(editor)
    const keptBaseline = baseline ? savedViewBillingBaseline(baseline) : null

    expect(viewBillingSaveErrorMessage({ data: { statusMessage: 'Forbidden' } })).toBe('Forbidden')
    expect(viewBillingSaveErrorMessage(null)).toBe('Fehler beim Speichern der Adresse')
    expect(keptEditor).toEqual(editor)
    expect(keptEditor).not.toBe(editor)
    expect(keptBaseline?.street_nr).toBe('12')
    expect(keptBaseline).not.toBe(baseline)
  })

  it('does not restore the pre-save house number when cancelling after a successful save', () => {
    const loaded = viewBillingFromInvoice(original)
    const edited = { ...loaded, street_nr: '12a', street: 'Seestrasse' }
    const updates = viewBillingUpdatePayload(edited)
    const baselineAfterSave = savedViewBillingBaseline(edited)
    const cancelled = restoreViewBilling(baselineAfterSave)

    expect(updates.billing_street_number).toBe('12a')
    expect(cancelled.street).toBe('Seestrasse')
    expect(cancelled.street_nr).toBe('12a')
    expect(cancelled.street_nr).not.toBe(loaded.street_nr)
  })

  it('leaves the invoice update tenant filter in place', () => {
    const source = readFileSync('server/api/invoices/update.post.ts', 'utf8')
    expect(source).toContain(".eq('tenant_id', staffUser.tenant_id)")
    expect(source).toContain("!['admin', 'staff'].includes(staffUser.role)")
  })

  it('wires the view editor to the separate number field and the save payload', () => {
    const source = readFileSync('components/InvoicePreviewModal.vue', 'utf8')
    expect(source).toContain('v-model="localViewBilling.street_nr"')
    expect(source).toContain('viewBillingUpdatePayload(localViewBilling.value)')
    expect(source).toContain('savedViewBillingBaseline(localViewBilling.value)')
    expect(source).toContain('restoreViewBilling(viewBillingBaseline.value)')
    expect(source).not.toContain('Strasse + Nr.')
  })
})
