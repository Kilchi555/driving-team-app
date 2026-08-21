import { describe, expect, it } from 'vitest'
import { parseBookingCsv, parseCsv } from '../accounting-csv'

describe('accounting CSV', () => {
  it('parses comma-delimited rows without decimal commas', () => {
    const table = parseCsv('datum,betrag_chf,beschreibung\n2026-08-18,12.50,Tank')
    expect(table[1]).toEqual(['2026-08-18', '12.50', 'Tank'])
  })

  it('parses semicolon Excel-style rows', () => {
    const table = parseCsv('datum;betrag_chf;beschreibung\n18.08.2026;12,50;Tank')
    expect(table[1]).toEqual(['18.08.2026', '12,50', 'Tank'])
  })

  it('accepts Swiss date and comma amounts', () => {
    const csv = [
      'datum;betrag_chf;beschreibung;typ',
      '18.08.2026;1\'250,50;Miete;expense',
    ].join('\n')
    const { rows, errors } = parseBookingCsv(csv)
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({
      entry_date: '2026-08-18',
      amount_rappen: 125050,
      document_kind: 'expense',
    })
  })

  it('maps a creditor import row', () => {
    const csv = [
      'datum;typ;beleg_art;betrag_chf;beschreibung;kategorie;mwst_satz;bezahlt;lieferant',
      '2026-03-01;expense;creditor;108.10;Winterreifen;Fahrzeugkosten;8.1;nein;Pneu AG',
    ].join('\n')
    const { rows, errors } = parseBookingCsv(csv)
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({
      entry_date: '2026-03-01',
      document_kind: 'creditor',
      amount_rappen: 10810,
      is_paid: false,
      creditor_name: 'Pneu AG',
      category_name: 'Fahrzeugkosten',
    })
  })
})
