import { describe, expect, it } from 'vitest'
import {
  augustFromCampaignRows,
  buildSalesProspects,
  displayPerson,
  filterSalesProspects,
  initialSprint,
  organizationDomain,
  type SalesAugustInput,
  type SalesLeadInput,
} from '../sales-intelligence'

function lead(partial: Partial<SalesLeadInput> & { id: string; name: string }): SalesLeadInput {
  return {
    first_name: null,
    phone: null,
    email: null,
    website: null,
    city: null,
    postal_code: null,
    address: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

function clicked(email: string): Map<string, SalesAugustInput> {
  const map = augustFromCampaignRows([{
    campaign_name: '[Outreach] Fahrlehrer Mail 1 – All-in-One',
    email,
    status: 'clicked',
    sent_at: '2026-08-06T00:00:00Z',
    opened_at: '2026-08-06T01:00:00Z',
    clicked_at: '2026-08-06T02:00:00Z',
  }])
  return map
}

describe('organizationDomain', () => {
  it('does not treat freemail or a copied provider website as a company', () => {
    expect(organizationDomain(lead({
      id: '1',
      name: 'Fahrschule Bassi Fabio',
      email: 'bassi.fa@gmail.com',
      website: 'https://gmail.com',
    }))).toBeNull()
  })

  it('keeps a plausible driving-school host', () => {
    expect(organizationDomain(lead({
      id: '1',
      name: 'Fahrschule Müller',
      email: 'info@mueller-fahrschule.ch',
      website: 'https://mueller-fahrschule.ch',
    }))).toBe('mueller-fahrschule.ch')
  })
})

describe('displayPerson', () => {
  it('drops a salutation stored as a first name', () => {
    expect(displayPerson('liebe Fahrlehrerkolleg:innen')).toBeNull()
    expect(displayPerson('K')).toBeNull()
    expect(displayPerson('Seppi')).toBe('Seppi')
  })
})

describe('buildSalesProspects', () => {
  it('collapses spelling variants and does not call that a multi-person school', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({
          id: 'a',
          name: 'Fahrschule Galliker',
          first_name: 'liebe Fahrlehrerkolleg:innen',
          email: 'info@fahrschule-galliker.ch',
          phone: '+41 79 641 09 93',
          website: 'https://fahrschule-galliker.ch',
          city: 'Beromünster',
          notes: 'SMS gesendet',
        }),
        lead({
          id: 'b',
          name: 'Marco Galliker',
          email: 'info@fahrschule-galliker.ch',
          website: 'https://fahrschule-galliker.ch',
          city: 'Beromünster',
        }),
      ],
      tenants: [],
      staff: [],
      consent: [{ email: 'info@fahrschule-galliker.ch', status: 'pending_consent' }],
      augustByEmail: clicked('info@fahrschule-galliker.ch'),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].strong_people).toBe(1)
    expect(rows[0].business_potential).toBe('LOW_EVIDENCE')
    expect(rows[0].priority).toBe('P1')
    expect(rows[0].person).toBeNull()
    expect(rows[0].contactability).toBe('REVIEW_REQUIRED')
    expect(rows[0].consent_status).toBe('pending_consent')
    expect(rows[0].why.join(' ')).not.toMatch(/grosse Fahrschule|instructors|revenue/i)
    expect(rows[0].august.historical).toBe(true)
    expect(rows[0].august.sms_note).toBe(true)
  })

  it('counts distinct surnames on one domain as high evidence', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({ id: '1', name: 'Fahrschule Müller(Seppi Müller)', first_name: 'Seppi', email: 'info@mueller-fahrschule.ch', phone: '+41 79 111 11 11', website: 'https://mueller-fahrschule.ch', city: 'Emmenbrücke' }),
        lead({ id: '2', name: 'Dani Schubert (Müller Fahrschule)', email: 'dani@mueller-fahrschule.ch', website: 'https://mueller-fahrschule.ch', city: 'Emmenbrücke' }),
        lead({ id: '3', name: 'Helene Friedli (Müller Fahrschule)', email: 'helene@mueller-fahrschule.ch', website: 'https://mueller-fahrschule.ch', city: 'Emmenbrücke' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: clicked('info@mueller-fahrschule.ch'),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].strong_people).toBe(3)
    expect(rows[0].business_potential).toBe('HIGH_EVIDENCE')
    expect(rows[0].priority).toBe('P1')
    expect(rows[0].engagement_level).toBe('HOT')
  })

  it('excludes an exact staff email and does not inherit a foreign from-email domain', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'evzi', name: 'Evzi Disha', email: 'evzi.disha@icloud.com', phone: '+41 79 000 00 01' }),
        lead({ id: 'other', name: 'Andere Schule', email: 'info@drivingteam.ch', website: 'https://drivingteam.ch' }),
      ],
      tenants: [
        {
          id: 'apple',
          name: 'Apple Review',
          contact_email: 'apple-review@simy.ch',
          from_email: 'info@drivingteam.ch',
          contact_phone: null,
          website_url: 'https://simy.ch',
          domain: 'simy.ch/apple',
          website_domain: null,
        },
        {
          id: 'dt',
          name: 'Fahrschule Driving Team',
          contact_email: 'info@drivingteam.ch',
          from_email: 'info@drivingteam.ch',
          contact_phone: null,
          website_url: 'https://drivingteam.ch',
          domain: 'drivingteam.ch',
          website_domain: null,
        },
      ],
      staff: [{ email: 'evzi.disha@icloud.com', phone: null, role: 'staff' }],
      consent: [],
      augustByEmail: new Map(),
    })
    const evzi = rows.find((row) => row.prospect_id === 'evzi')
    const other = rows.find((row) => row.prospect_id === 'other')
    expect(evzi?.existing_tenant_match).toBe(true)
    expect(evzi?.priority).toBeNull()
    expect(evzi?.contactability_label).toBe('EXISTING TENANT — EXCLUDED')
    expect(other?.existing_tenant_match).toBe(true)
    expect(other?.matched_tenant_name).toBe('Fahrschule Driving Team')
  })

  it('keeps a near domain as possible and an opt-out out of the sprint', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'liridon', name: 'Liridon Maliqi', email: 'info@fsdriveplus.ch', website: 'https://fsdriveplus.ch' }),
        lead({ id: 'out', name: 'Opt Out', email: 'out@example-fahrschule.ch', website: 'https://example-fahrschule.ch', phone: '+41 79 222 22 22' }),
        lead({ id: 'hot', name: 'Click Schule', email: 'info@click-fahrschule.ch', website: 'https://click-fahrschule.ch', phone: '+41 79 333 33 33', city: 'Bern' }),
      ],
      tenants: [{
        id: 'plus',
        name: 'Fahrschule Drive Plus GmbH',
        contact_email: 'info@driveplus.ch',
        from_email: 'info@driveplus.ch',
        contact_phone: '+41 44 000 00 00',
        website_url: 'https://www.driveplus.ch',
        domain: 'simy.ch/fahrschule-drive-plus-gmbh',
        website_domain: null,
      }],
      staff: [],
      consent: [
        { email: 'out@example-fahrschule.ch', status: 'unsubscribed' },
        { email: 'info@click-fahrschule.ch', status: 'pending_consent' },
      ],
      augustByEmail: clicked('info@click-fahrschule.ch'),
    })
    expect(rows.find((row) => row.prospect_id === 'liridon')?.contactability).toBe('POSSIBLE_EXISTING_TENANT')
    expect(rows.find((row) => row.prospect_id === 'out')?.contactability).toBe('OPT_OUT')
    const sprint = initialSprint(rows, 50)
    expect(sprint.rows.map((row) => row.prospect_id)).toEqual(['hot'])
    expect(sprint.rows[0].consent_status).not.toBe('active')
  })

  it('does not count a queued mail without sent_at as sent', () => {
    const map = augustFromCampaignRows([{
      campaign_name: '[Outreach] Fahrlehrer Mail 4 – Affiliate',
      email: 'info@queued-fahrschule.ch',
      status: 'queued',
      sent_at: null,
      opened_at: null,
      clicked_at: null,
    }])
    const rows = buildSalesProspects({
      leads: [lead({ id: 'q', name: 'Queued', email: 'info@queued-fahrschule.ch', website: 'https://queued-fahrschule.ch' })],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: map,
    })
    expect(rows[0].engagement_level).toBe('UNKNOWN')
    expect(rows[0].august.mails[4].sent).toBe(false)
  })

  it('sorts P1 ahead of P2 and limits the sprint without creating profiles', () => {
    const leads = Array.from({ length: 60 }, (_, index) => lead({
      id: `p${index}`,
      name: `Schule ${index}`,
      email: `info@schule${index}-fahrschule.ch`,
      website: `https://schule${index}-fahrschule.ch`,
      phone: index < 3 ? `+41 79 100 00 ${String(index).padStart(2, '0')}` : null,
      city: index < 3 ? 'Bern' : null,
    }))
    const august = new Map<string, SalesAugustInput>()
    for (const item of leads) {
      august.set(item.email || '', clicked(item.email || '').get(item.email || '')!)
    }
    const rows = buildSalesProspects({ leads, tenants: [], staff: [], consent: [], augustByEmail: august })
    const sprint = initialSprint(rows, 50)
    expect(sprint.total).toBe(60)
    expect(sprint.rows).toHaveLength(50)
    expect(sprint.rows[0].priority).toBe('P1')
    expect(sprint.rows.every((row) => row.priority === 'P1' || row.priority === 'P2')).toBe(true)
    const filtered = filterSalesProspects(rows, { quick: 'HOT', sprint: true }, new Map())
    expect(filtered.length).toBe(60)
  })
})
