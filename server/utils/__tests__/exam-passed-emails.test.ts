import { describe, expect, it } from 'vitest'
import {
  examPassedAppLinks,
  planExamPassedEmails,
  resolveExamReviewPlaces,
  safeEmailColor,
} from '../exam-passed-emails'
import { parseExamPassedEmailSettings } from '../exam-passed-email-settings'

const drivingTeamPlaces = [
  { name: 'Zürich', place_id: 'ChIJU29cFMgLkEcRzMfDub2bh9s' },
  { name: 'Lachen', place_id: 'ChIJqdlnJXTJmkcRAgI05nvPXFU' },
]

describe('resolveExamReviewPlaces', () => {
  it('reads jsonb arrays and skips entries without a place id', () => {
    expect(resolveExamReviewPlaces(drivingTeamPlaces)).toEqual([
      { name: 'Zürich', placeId: 'ChIJU29cFMgLkEcRzMfDub2bh9s' },
      { name: 'Lachen', placeId: 'ChIJqdlnJXTJmkcRAgI05nvPXFU' },
    ])
    expect(resolveExamReviewPlaces([{ name: 'Nur URL', url: 'https://g.page/r/abc/review' }])).toEqual([])
  })

  it('parses double-encoded jsonb strings and extracts placeid from urls', () => {
    expect(resolveExamReviewPlaces('[]')).toEqual([])
    expect(resolveExamReviewPlaces(JSON.stringify([{ name: 'ZH', url: 'https://search.google.com/local/writereview?placeid=ChIJabc' }]))).toEqual([
      { name: 'ZH', placeId: 'ChIJabc' },
    ])
  })
})

describe('planExamPassedEmails', () => {
  const base = {
    firstName: 'Anna',
    tenantName: 'Fahrschule Muster',
    tenantSlug: 'fahrschule-muster',
    primaryColor: '#112233',
    logoWideUrl: 'https://cdn.example.com/logo.png',
  }

  it('always builds congratulations and omits review buttons without places', () => {
    const plan = planExamPassedEmails({ ...base, affiliateEnabled: false })
    expect(plan.reviewPlaces).toEqual([])
    expect(plan.congratulations.html).toContain('Fahrschule Muster')
    expect(plan.congratulations.html).toContain('bestanden')
    expect(plan.congratulations.html).not.toContain('writereview')
    expect(plan.congratulations.html).toContain('wir freuen uns mit dir')
    expect(plan.reviewFollowup).toBeNull()
    expect(plan.affiliatePromo).toBeNull()
  })

  it('queues review follow-up only when usable place ids exist', () => {
    const plan = planExamPassedEmails({
      ...base,
      googleReviewPlaces: drivingTeamPlaces,
      affiliateEnabled: false,
    })
    expect(plan.reviewFollowup?.stage).toBe('exam_passed_review_followup')
    expect(plan.reviewFollowup?.sendAfterDays).toBe(7)
    expect(plan.reviewFollowup?.html).toContain('placeid=ChIJU29cFMgLkEcRzMfDub2bh9s')
    expect(plan.reviewFollowup?.html).toContain('Zürich')
    expect(plan.reviewFollowup?.html).not.toContain('Empfehlungs-Dashboard')
    expect(plan.affiliatePromo).toBeNull()
  })

  it('skips affiliate promo and teaser when the program is off', () => {
    const plan = planExamPassedEmails({
      ...base,
      googleReviewPlaces: drivingTeamPlaces,
      affiliateEnabled: false,
    })
    expect(plan.affiliatePromo).toBeNull()
    expect(plan.congratulations.html).not.toContain('affiliate-dashboard')
  })

  it('queues affiliate promo when enabled, even without review links', () => {
    const plan = planExamPassedEmails({
      ...base,
      affiliateEnabled: true,
      terms: { businessNoun: 'Coaching-Praxis', appointment: 'Sitzung' },
    })
    expect(plan.reviewFollowup).toBeNull()
    expect(plan.affiliatePromo?.stage).toBe('exam_passed_affiliate_promo')
    expect(plan.affiliatePromo?.sendAfterDays).toBe(30)
    expect(plan.affiliatePromo?.html).toContain('Coaching-Praxis')
    expect(plan.affiliatePromo?.html).toContain('Sitzung')
    expect(plan.affiliatePromo?.subject).toContain('&')
    expect(plan.affiliatePromo?.subject).not.toContain('&amp;')
  })

  it('includes affiliate teaser in the review follow-up only when affiliate is on', () => {
    const plan = planExamPassedEmails({
      ...base,
      googleReviewPlaces: drivingTeamPlaces,
      affiliateEnabled: true,
    })
    expect(plan.reviewFollowup?.html).toContain('Empfehlungs-Dashboard')
    expect(plan.affiliatePromo).not.toBeNull()
  })

  it('honours admin settings for which mails and when they send', () => {
    const plan = planExamPassedEmails({
      ...base,
      googleReviewPlaces: drivingTeamPlaces,
      affiliateEnabled: true,
      settings: {
        congratulationsEnabled: false,
        reviewFollowupEnabled: true,
        reviewFollowupDays: 3,
        affiliatePromoEnabled: true,
        affiliatePromoDays: 10,
        reviewFollowupSubject: 'Bitte bewerten, {firstName}',
        reviewFollowupBody: 'Hallo {firstName}, ein Feedback an {tenantName} hilft uns.',
        affiliatePromoSubject: '',
        affiliatePromoBody: '',
      },
    })
    expect(plan.congratulations).toBeNull()
    expect(plan.reviewFollowup?.sendAfterDays).toBe(3)
    expect(plan.reviewFollowup?.subject).toBe('Bitte bewerten, Anna')
    expect(plan.reviewFollowup?.html).toContain('ein Feedback an Fahrschule Muster')
    expect(plan.affiliatePromo?.sendAfterDays).toBe(10)
    expect(plan.affiliatePromo?.html).toContain('vor 10 Tagen')
  })

  it('keeps review/affiliate mails off when admin disables them', () => {
    const plan = planExamPassedEmails({
      ...base,
      googleReviewPlaces: drivingTeamPlaces,
      affiliateEnabled: true,
      settings: {
        congratulationsEnabled: true,
        reviewFollowupEnabled: false,
        affiliatePromoEnabled: false,
      },
    })
    expect(plan.congratulations).not.toBeNull()
    expect(plan.reviewFollowup).toBeNull()
    expect(plan.affiliatePromo).toBeNull()
  })

  it('escapes names and ignores unsafe colors', () => {
    const plan = planExamPassedEmails({
      firstName: '<script>x</script>',
      tenantName: 'A & B "Fahrschule"',
      primaryColor: 'red;background:url(x)',
      googleReviewPlaces: [{ name: 'Ort <b>X</b>', place_id: 'ChIJsafe' }],
      affiliateEnabled: false,
    })
    expect(plan.congratulations.html).toContain('&lt;script&gt;')
    expect(plan.congratulations.html).not.toContain('<script>x</script>')
    expect(plan.congratulations.html).toContain('#2563eb')
    expect(plan.reviewFollowup?.html).toContain('Ort &lt;b&gt;X&lt;/b&gt;')
  })
})

describe('parseExamPassedEmailSettings', () => {
  it('defaults to all mails on with 7/30 days', () => {
    expect(parseExamPassedEmailSettings(null)).toMatchObject({
      congratulationsEnabled: true,
      reviewFollowupEnabled: true,
      reviewFollowupDays: 7,
      affiliatePromoEnabled: true,
      affiliatePromoDays: 30,
    })
  })

  it('clamps days and trims custom copy', () => {
    const parsed = parseExamPassedEmailSettings({
      congratulationsEnabled: false,
      reviewFollowupDays: 0,
      affiliatePromoDays: 400,
      congratulationsSubject: '  Hallo  ',
      congratulationsBody: 'x'.repeat(2000),
    })
    expect(parsed.congratulationsEnabled).toBe(false)
    expect(parsed.reviewFollowupDays).toBe(1)
    expect(parsed.affiliatePromoDays).toBe(180)
    expect(parsed.congratulationsSubject).toBe('Hallo')
    expect(parsed.congratulationsBody).toHaveLength(1000)
  })
})

describe('examPassed helpers', () => {
  it('builds tenant-scoped app links', () => {
    expect(examPassedAppLinks('driving-team').customerUrl).toContain('/driving-team')
    expect(examPassedAppLinks(null).customerUrl).toContain('/login')
  })

  it('accepts only hex colors', () => {
    expect(safeEmailColor('#abc')).toBe('#abc')
    expect(safeEmailColor('not-a-color')).toBe('#2563eb')
  })
})
