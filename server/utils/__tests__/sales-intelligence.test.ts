import { describe, expect, it } from 'vitest'
import {
  augustFromCampaignRows,
  buildSalesProspects,
  compareSalesProspects,
  displayPerson,
  filterSalesProspects,
  initialSprint,
  profileForProspect,
  organizationDomain,
  type SalesAugustInput,
  type SalesLeadInput,
  type SalesProspect,
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

  it('does not treat a name token as a domain when it is only a substring of the label', () => {
    expect(organizationDomain(lead({
      id: '1',
      name: 'Samir Khedhri (Driving Team)',
      email: 'samir@drivingteam.ch',
    }))).toBeNull()
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

  it('does not match a tenant by domain-label containment', () => {
    const tenants = [
      {
        id: 'sara',
        name: 'FAHRSCHULE Sara',
        contact_email: 'info@fahrschule-sara.ch',
        from_email: 'info@fahrschule-sara.ch',
        contact_phone: null,
        website_url: 'https://fahrschule-sara.ch',
        domain: null,
        website_domain: null,
      },
      {
        id: 'disha',
        name: 'City Drive Disha',
        contact_email: 'info@citydrive-disha.ch',
        from_email: 'info@citydrive-disha.ch',
        contact_phone: null,
        website_url: 'https://citydrive-disha.ch',
        domain: null,
        website_domain: null,
      },
      {
        id: 'fahrstil',
        name: 'Fahrschule Fahrstil',
        contact_email: 'info@fahrschulefahrstil.ch',
        from_email: 'info@fahrschulefahrstil.ch',
        contact_phone: null,
        website_url: 'https://fahrschulefahrstil.ch',
        domain: null,
        website_domain: null,
      },
    ]
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'sarah', name: 'Ecole Sarah', email: 'info@fahrschule-sarah.ch', website: 'https://fahrschule-sarah.ch', phone: '+41 79 100 00 01' }),
        lead({ id: 'city', name: 'City Drive', email: 'info@citydrive.ch', website: 'https://citydrive.ch', phone: '+41 79 100 00 02' }),
        lead({ id: 'stil', name: 'Fahrstil', email: 'hallo@fahrstil.org', website: 'https://fahrstil.org', phone: '+41 79 100 00 03' }),
        lead({ id: 'real', name: 'Sara Schule', email: 'info@fahrschule-sara.ch', phone: '+41 79 100 00 04' }),
      ],
      tenants,
      staff: [],
      consent: [{ email: 'info@fahrschule-sarah.ch', status: 'pending_consent' }],
      augustByEmail: new Map(),
    })
    expect(rows.find((row) => row.prospect_id === 'sarah')?.possible_existing_tenant).toBe(false)
    expect(rows.find((row) => row.prospect_id === 'sarah')?.existing_tenant_match).toBe(false)
    expect(rows.find((row) => row.prospect_id === 'sarah')?.contactability).toBe('REVIEW_REQUIRED')
    expect(rows.find((row) => row.prospect_id === 'city')?.possible_existing_tenant).toBe(false)
    expect(rows.find((row) => row.prospect_id === 'stil')?.possible_existing_tenant).toBe(false)
    expect(rows.find((row) => row.prospect_id === 'real')?.existing_tenant_match).toBe(true)
    expect(rows.find((row) => row.prospect_id === 'real')?.eligible).toBe(false)
  })

  it('uses the strongest engagement inside one canonical group and ignores another company', () => {
    const august = augustFromCampaignRows([
      {
        campaign_name: '[Outreach] Fahrlehrer Mail 2 – Unsere Geschichte',
        email: 'andi@sibling-fahrschule.ch',
        status: 'clicked',
        sent_at: '2026-08-06T00:00:00Z',
        opened_at: '2026-08-06T01:00:00Z',
        clicked_at: '2026-08-06T02:00:00Z',
      },
      {
        campaign_name: '[Outreach] Fahrlehrer Mail 4 – Affiliate',
        email: 'info@sibling-fahrschule.ch',
        status: 'queued',
        sent_at: null,
        opened_at: null,
        clicked_at: null,
      },
      {
        campaign_name: '[Outreach] Fahrlehrer Mail 1 – All-in-One',
        email: 'info@other-fahrschule.ch',
        status: 'sent',
        sent_at: '2026-08-06T00:00:00Z',
        opened_at: null,
        clicked_at: null,
      },
    ])
    const rows = buildSalesProspects({
      leads: [
        lead({
          id: 'canon',
          name: 'Fahrschule Sibling',
          email: 'info@sibling-fahrschule.ch',
          phone: '+41 79 200 00 01',
          city: 'Bern',
          website: 'https://sibling-fahrschule.ch',
        }),
        lead({ id: 'sibling', name: 'Andi Sibling', email: 'andi@sibling-fahrschule.ch' }),
        lead({
          id: 'other',
          name: 'Andere Fahrschule',
          email: 'info@other-fahrschule.ch',
          phone: '+41 79 200 00 02',
          website: 'https://other-fahrschule.ch',
        }),
      ],
      tenants: [],
      staff: [],
      consent: [{ email: 'info@sibling-fahrschule.ch', status: 'pending_consent' }],
      augustByEmail: august,
    })
    const group = rows.find((row) => row.prospect_id === 'canon')
    expect(group?.duplicate_group_size).toBe(2)
    expect(group?.engagement_level).toBe('HOT')
    expect(group?.august.mails[2].clicked).toBe(true)
    expect(group?.august.mails[4].sent).toBe(false)
    expect(group?.contactability).toBe('REVIEW_REQUIRED')
    expect(rows.find((row) => row.prospect_id === 'other')?.engagement_level).toBe('COLD')
    expect(rows.find((row) => row.prospect_id === 'other')?.august.clicked).toBe(false)
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

  it('does not inherit another business engagement from a shared domain', () => {
    const august = augustFromCampaignRows([
      {
        campaign_name: '[Outreach] Fahrlehrer Mail 1 – All-in-One',
        email: 'nord@depot-auto.ch',
        status: 'sent',
        sent_at: '2026-08-06T00:00:00Z',
        opened_at: null,
        clicked_at: null,
      },
      {
        campaign_name: '[Outreach] Fahrlehrer Mail 2 – Unsere Geschichte',
        email: 'sued@depot-auto.ch',
        status: 'opened',
        sent_at: '2026-08-06T00:00:00Z',
        opened_at: '2026-08-06T01:00:00Z',
        clicked_at: null,
      },
    ])
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'brand-a', name: 'Nordmarke', email: 'nord@depot-auto.ch', website: 'https://depot-auto.ch' }),
        lead({ id: 'brand-b', name: 'Levin Marti (Suedpunkt Drive)', email: 'sued@depot-auto.ch' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: august,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].prospect_id).toBe('brand-a')
    expect(rows[0].engagement_level).toBe('COLD')
    expect(rows[0].august.mails[2].opened).toBe(false)
    expect(rows[0].august.opened).toBe(false)
  })

  it('inherits a sibling click when the mailboxes are the same business', () => {
    const august = augustFromCampaignRows([{
      campaign_name: '[Outreach] Fahrlehrer Mail 2 – Unsere Geschichte',
      email: 'rolf@sibling-fahrschule.ch',
      status: 'clicked',
      sent_at: '2026-08-06T00:00:00Z',
      opened_at: '2026-08-06T01:00:00Z',
      clicked_at: '2026-08-06T02:00:00Z',
    }])
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'canon', name: 'Marlies', email: 'marlies@sibling-fahrschule.ch', website: 'https://sibling-fahrschule.ch' }),
        lead({ id: 'sibling', name: 'Rolf', email: 'rolf@sibling-fahrschule.ch', website: 'https://sibling-fahrschule.ch' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: august,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].engagement_level).toBe('HOT')
    expect(rows[0].august.clicked).toBe(true)
  })

  it('inherits a sibling click when the school label is shorter than a strong stem', () => {
    const august = augustFromCampaignRows([{
      campaign_name: '[Outreach] Fahrlehrer Mail 1 – All-in-One',
      email: 'rolf@wesco-fahrschule.ch',
      status: 'clicked',
      sent_at: '2026-08-06T00:00:00Z',
      opened_at: '2026-08-06T01:00:00Z',
      clicked_at: '2026-08-06T02:00:00Z',
    }])
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'canon', name: 'Marlies', email: 'marlies@wesco-fahrschule.ch', website: 'https://wesco-fahrschule.ch' }),
        lead({ id: 'sibling', name: 'Rolf', email: 'rolf@wesco-fahrschule.ch', website: 'https://wesco-fahrschule.ch' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: august,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].engagement_level).toBe('HOT')
  })

  it('does not treat two labels on one generic mailbox as two people', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'paren-a', name: 'brandbox-example(Nico Huber)', email: 'info@brandbox-fahrschule.ch', website: 'https://brandbox-fahrschule.ch' }),
        lead({ id: 'paren-b', name: 'Nico Huber (brandbox-example)', email: 'info@brandbox-fahrschule.ch' }),
        lead({ id: 'org-a', name: 'Eurobox', email: 'info@eurobox-fahrschule.ch', website: 'https://eurobox-fahrschule.ch' }),
        lead({ id: 'org-b', name: 'Eurobox AG(Timo Keller)', email: 'info@eurobox-fahrschule.ch' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: new Map(),
    })
    const paren = rows.find((row) => row.organization_domain === 'brandbox-fahrschule.ch')
    const org = rows.find((row) => row.organization_domain === 'eurobox-fahrschule.ch')
    expect(paren?.duplicate_group_size).toBe(2)
    expect(paren?.strong_people).toBe(1)
    expect(paren?.business_potential).not.toBe('HIGH_EVIDENCE')
    expect(org?.strong_people).toBe(1)
    expect(org?.business_potential).not.toBe('HIGH_EVIDENCE')
  })

  it('keeps high evidence when a weak canonical label still belongs to a coherent business', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'weak', name: 'foreignlabel.ch(Johannes Keller)', email: 'johannes@coherent-fahrschule.ch', city: 'Winterthur' }),
        lead({ id: 'same', name: 'Johannes Keller (Coherent Fahrschule)', email: 'johannes@coherent-fahrschule.ch' }),
        lead({ id: 'two', name: 'Manfred Frei (Coherent Fahrschule)', email: 'manfred@coherent-fahrschule.ch' }),
        lead({ id: 'three', name: 'Miriam Hauser (Coherent Fahrschule)', email: 'miriam@coherent-fahrschule.ch' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: new Map(),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].prospect_id).toBe('weak')
    expect(rows[0].strong_people).toBeGreaterThanOrEqual(2)
    expect(rows[0].business_potential).toBe('HIGH_EVIDENCE')
  })

  it('loads a saved profile after a richer duplicate becomes the canonical lead', () => {
    const sparseId = '11111111-1111-4111-8111-111111111111'
    const richerId = '22222222-2222-4222-8222-222222222222'
    const thirdId = '33333333-3333-4333-8333-333333333333'
    const base = {
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: new Map(),
    }
    const sparse = lead({
      id: sparseId,
      name: 'Nordschule',
      email: 'info@nordschule-fahrschule.ch',
      website: 'https://nordschule-fahrschule.ch',
      created_at: '2024-01-01T00:00:00Z',
    })
    const savedOnSparse = buildSalesProspects({ ...base, leads: [sparse] })
    expect(savedOnSparse).toHaveLength(1)
    expect(savedOnSparse[0].prospect_id).toBe(sparseId)
    const richer = lead({
      id: richerId,
      name: 'Nordschule Fahrschule GmbH',
      email: 'info@nordschule-fahrschule.ch',
      phone: '+41 79 111 22 33',
      city: 'Bern',
      address: 'Bahnstrasse 1',
      website: 'https://nordschule-fahrschule.ch',
      created_at: '2026-06-01T00:00:00Z',
    })
    const third = lead({
      id: thirdId,
      name: 'Nordschule',
      email: 'office@nordschule-fahrschule.ch',
      website: 'https://nordschule-fahrschule.ch',
      created_at: '2025-01-01T00:00:00Z',
    })
    const after = buildSalesProspects({ ...base, leads: [sparse, richer, third] })
    expect(after).toHaveLength(1)
    expect(after[0].prospect_id).toBe(richerId)
    expect(after[0].engagement_level).toBe(savedOnSparse[0].engagement_level)
    expect(after[0].source_ids).toEqual([sparseId, richerId, thirdId].sort((a, b) => a.localeCompare(b)))
    const orphan = new Map([
      [sparseId, { sales_status: 'conversation', assigned_to: null, next_follow_up_at: '2026-10-05T00:00:00Z', last_contacted_at: '2026-09-01T00:00:00Z', contact_attempts: 1 }],
    ])
    expect(profileForProspect(after[0], orphan)?.sales_status).toBe('conversation')
    expect(profileForProspect(after[0], orphan)?.prospect_id).toBe(sparseId)
    expect(filterSalesProspects(after, { salesStatus: 'conversation', sprint: false }, orphan).map((row) => row.prospect_id)).toEqual([richerId])
    const own = new Map([
      [richerId, { sales_status: 'proposal', assigned_to: null, next_follow_up_at: null }],
      [sparseId, { sales_status: 'lost', assigned_to: null, next_follow_up_at: null, last_contacted_at: '2026-09-02T00:00:00Z' }],
    ])
    expect(profileForProspect(after[0], own)?.sales_status).toBe('proposal')
    const siblings = new Map([
      [sparseId, { sales_status: 'nurture', assigned_to: null, next_follow_up_at: null, last_contacted_at: '2026-08-01T00:00:00Z', contact_attempts: 4 }],
      [thirdId, { sales_status: 'contacted', assigned_to: null, next_follow_up_at: null, last_contacted_at: '2026-09-03T00:00:00Z', contact_attempts: 1 }],
    ])
    expect(profileForProspect(after[0], siblings)?.prospect_id).toBe(thirdId)
  })

  it('does not ignore a weak label when another business shares the domain', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({
          id: 'canon',
          name: 'Fahrschule Northal(Beatrice Kaegi-Bleuler)',
          email: 'beatrice@northal-fahrschule.ch',
          website: 'https://northal-fahrschule.ch',
          city: 'Oberweningen',
        }),
        lead({ id: 'beatrice', name: 'Beatrice Kaegi-Bleuler (Fahrschule Northal)', email: 'beatrice@northal-fahrschule.ch' }),
        lead({ id: 'david', name: 'David Bolli (Fahrschule Northal)', email: 'david@northal-fahrschule.ch' }),
        lead({ id: 'other', name: 'Fahrschule Zurichsee GmbH(David Rueegg)', email: 'david@northal-fahrschule.ch' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: new Map(),
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].business_potential).not.toBe('HIGH_EVIDENCE')
    expect(rows[0].business_potential).toBe('MEDIUM_EVIDENCE')
  })

  it('still counts genuinely distinct mailboxes as multi-person evidence', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'slash', name: 'Fahrschule Riverbox(Nico Huber/Lara Meier)', email: 'nico@riverbox-fahrschule.ch', website: 'https://riverbox-fahrschule.ch', city: 'Bern' }),
        lead({ id: 'lara', name: 'Lara Meier (Riverbox Fahrschule)', email: 'lara@riverbox-fahrschule.ch', website: 'https://riverbox-fahrschule.ch' }),
        lead({ id: 'one', name: 'Fahrschule Alpine(Otto Meier)', email: 'otto@alpine-fahrschule.ch', website: 'https://alpine-fahrschule.ch' }),
        lead({ id: 'two', name: 'Klara Steiner (Alpine Fahrschule)', email: 'klara@alpine-fahrschule.ch', website: 'https://alpine-fahrschule.ch' }),
        lead({ id: 'three', name: 'Jonas Widmer (Alpine Fahrschule)', email: 'jonas@alpine-fahrschule.ch', website: 'https://alpine-fahrschule.ch' }),
      ],
      tenants: [],
      staff: [],
      consent: [],
      augustByEmail: clicked('nico@riverbox-fahrschule.ch'),
    })
    const river = rows.find((row) => row.organization_domain === 'riverbox-fahrschule.ch')
    const alpine = rows.find((row) => row.organization_domain === 'alpine-fahrschule.ch')
    expect(river?.strong_people).toBeGreaterThanOrEqual(2)
    expect(river?.business_potential).toBe('HIGH_EVIDENCE')
    expect(alpine?.strong_people).toBeGreaterThanOrEqual(2)
    expect(alpine?.business_potential).toBe('HIGH_EVIDENCE')
  })

  it('keeps existing, possible, opt-out, and pending consent out of the wrong buckets', () => {
    const rows = buildSalesProspects({
      leads: [
        lead({ id: 'existing', name: 'Existing Schule', email: 'info@existing-fahrschule.ch', website: 'https://existing-fahrschule.ch', phone: '+41 79 400 00 01' }),
        lead({ id: 'possible', name: 'Possible Schule', email: 'info@fsdrivebox.ch', website: 'https://fsdrivebox.ch', phone: '+41 79 400 00 02' }),
        lead({ id: 'opt', name: 'Opt Schule', email: 'out@opt-fahrschule.ch', website: 'https://opt-fahrschule.ch', phone: '+41 79 400 00 03' }),
        lead({ id: 'pending', name: 'Pending Schule', email: 'info@pending-fahrschule.ch', website: 'https://pending-fahrschule.ch', phone: '+41 79 400 00 04', city: 'Bern' }),
      ],
      tenants: [
        {
          id: 'existing-tenant',
          name: 'Existing Schule',
          contact_email: 'info@existing-fahrschule.ch',
          from_email: null,
          contact_phone: null,
          website_url: 'https://existing-fahrschule.ch',
          domain: null,
          website_domain: null,
        },
        {
          id: 'alpine',
          name: 'Drive Box',
          contact_email: 'info@drivebox.ch',
          from_email: 'info@drivebox.ch',
          contact_phone: null,
          website_url: 'https://drivebox.ch',
          domain: null,
          website_domain: null,
        },
      ],
      staff: [],
      consent: [
        { email: 'out@opt-fahrschule.ch', status: 'unsubscribed' },
        { email: 'info@pending-fahrschule.ch', status: 'pending_consent' },
      ],
      augustByEmail: clicked('info@pending-fahrschule.ch'),
    })
    expect(rows.find((row) => row.prospect_id === 'existing')?.existing_tenant_match).toBe(true)
    expect(rows.find((row) => row.prospect_id === 'existing')?.eligible).toBe(false)
    expect(rows.find((row) => row.prospect_id === 'possible')?.possible_existing_tenant).toBe(true)
    expect(rows.find((row) => row.prospect_id === 'possible')?.eligible).toBe(false)
    expect(rows.find((row) => row.prospect_id === 'opt')?.opt_out).toBe(true)
    expect(rows.find((row) => row.prospect_id === 'opt')?.eligible).toBe(false)
    const pending = rows.find((row) => row.prospect_id === 'pending')
    expect(pending?.consent_status).toBe('pending_consent')
    expect(pending?.contactability).toBe('REVIEW_REQUIRED')
    expect(pending?.eligible).toBe(true)
    expect(initialSprint(rows, 50).rows.map((row) => row.prospect_id)).toEqual(['pending'])
  })
})

describe('compareSalesProspects', () => {
  function tied(id: string, email = `${id}@example.ch`): SalesProspect {
    return {
      prospect_id: id,
      name: 'Same Schule',
      person: null,
      phone: null,
      email,
      website: null,
      website_host: null,
      city: null,
      postal_code: null,
      address: null,
      organization_domain: 'example-fahrschule.ch',
      priority: 'P1',
      engagement_level: 'HOT',
      business_potential: 'HIGH_EVIDENCE',
      size_evidence_confidence: 'HIGH',
      business_score: 50,
      contactability: 'REVIEW_REQUIRED',
      contactability_label: 'CONTACTABILITY REVIEW REQUIRED',
      consent_status: 'unknown',
      existing_tenant_match: false,
      possible_existing_tenant: false,
      opt_out: false,
      matched_tenant_name: null,
      duplicate_group_size: 1,
      strong_people: 2,
      why: [],
      august: {
        sent: 1,
        opened: true,
        clicked: true,
        mails: {
          1: { sent: true, opened: true, clicked: true },
          2: { sent: false, opened: false, clicked: false },
          3: { sent: false, opened: false, clicked: false },
          4: { sent: false, opened: false, clicked: false },
        },
        sms_note: false,
        historical: true,
      },
      eligible: true,
      contact_completeness: 5,
      source_ids: [id],
    }
  }

  it('breaks a complete tie by canonical id without reordering a higher priority', () => {
    expect([tied('b-prospect'), tied('a-prospect')].sort(compareSalesProspects).map((row) => row.prospect_id)).toEqual(['a-prospect', 'b-prospect'])
    const higher = tied('z-prospect')
    const lower = { ...tied('a-prospect'), priority: 'P2' as const }
    expect([lower, higher].sort(compareSalesProspects).map((row) => row.prospect_id)).toEqual(['z-prospect', 'a-prospect'])
    const noIdA = { ...tied(''), email: 'a@example.ch', organization_domain: 'b-fahrschule.ch', name: 'Zulu' }
    const noIdB = { ...tied(''), email: 'b@example.ch', organization_domain: 'a-fahrschule.ch', name: 'Alpha' }
    expect([noIdB, noIdA].sort(compareSalesProspects).map((row) => row.email)).toEqual(['a@example.ch', 'b@example.ch'])
  })
})
