/**
 * Live SEO readiness score for the tenant website wizard.
 * Not Google's ranking — a checklist of on-page signals tenants control.
 */

export type WizardSeoInput = {
  name?: string | null
  bio?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  logo_url?: string | null
  hero_image_url?: string | null
  seo_title?: string | null
  seo_description?: string | null
  seo_keywords?: string | null
  businessNoun?: string | null
  serviceCount?: number
  describedServiceCount?: number
  hasTestimonials?: boolean
  hasGoogleReviews?: boolean
  hasCustomDomain?: boolean
}

export type SeoSuggestion = {
  id: string
  points: number
  text: string
  /** Wizard step index to jump to (0-based), if applicable */
  step?: number
}

export type WizardSeoScore = {
  score: number
  max: 100
  label: string
  tone: 'poor' | 'ok' | 'good' | 'great'
  suggestions: SeoSuggestion[]
  checks: Array<{ id: string; label: string; earned: number; max: number; ok: boolean }>
}

function len(s?: string | null) {
  return String(s || '').trim().length
}

function has(s?: string | null) {
  return len(s) > 0
}

function extractCityHint(address?: string | null, city?: string | null): string {
  if (city?.trim()) return city.trim().toLowerCase()
  const m = String(address || '').match(/\b\d{4}\s+([A-Za-zÄÖÜäöüÉéÈè'’\-\s]+)\b/)
  return (m?.[1] || '').trim().toLowerCase().split(',')[0].trim()
}

function keywordCount(raw?: string | null) {
  return String(raw || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean).length
}

export function scoreWizardSeo(input: WizardSeoInput): WizardSeoScore {
  const suggestions: SeoSuggestion[] = []
  const checks: WizardSeoScore['checks'] = []
  let score = 0

  const title = String(input.seo_title || '').trim()
  const desc = String(input.seo_description || '').trim()
  const titleLen = title.length
  const descLen = desc.length
  const city = extractCityHint(input.address, input.city)
  const noun = String(input.businessNoun || '').trim().toLowerCase()
  const titleLower = title.toLowerCase()
  const descLower = desc.toLowerCase()

  // Title length (15)
  {
    const max = 15
    let earned = 0
    if (titleLen >= 35 && titleLen <= 60) earned = 15
    else if (titleLen >= 25 && titleLen < 35) earned = 10
    else if (titleLen >= 15) earned = 5
    score += earned
    checks.push({ id: 'title_len', label: 'Titel-Länge (35–60 Zeichen)', earned, max, ok: earned === max })
    if (earned < max) {
      suggestions.push({
        id: 'title_len',
        points: max - earned,
        text:
          titleLen === 0
            ? 'Setze einen Google-Titel (ca. 35–60 Zeichen), z.B. «Fahrschule Zürich | Dein Name».'
            : titleLen < 35
              ? `Titel etwas länger machen (${titleLen}/60) — Ort + Angebot nennen.`
              : `Titel kürzen (${titleLen}/60) — Google schneidet sonst ab.`,
        step: 4,
      })
    }
  }

  // Title local / brand signal (10)
  {
    const max = 10
    const hasCity = city ? titleLower.includes(city) : false
    const hasNoun = noun ? titleLower.includes(noun) : false
    const hasName = input.name ? titleLower.includes(String(input.name).toLowerCase()) : false
    let earned = 0
    if (hasCity && (hasNoun || hasName)) earned = 10
    else if (hasCity || hasNoun || hasName) earned = 5
    score += earned
    checks.push({
      id: 'title_local',
      label: 'Titel mit Ort / Branche / Marke',
      earned,
      max,
      ok: earned === max,
    })
    if (earned < max) {
      suggestions.push({
        id: 'title_local',
        points: max - earned,
        text: city
          ? `Ort «${city.charAt(0).toUpperCase()}${city.slice(1)}» und Marke/Branche in den Titel aufnehmen.`
          : 'Ort im Kontakt hinterlegen und im Titel verwenden (Local SEO).',
        step: city ? 4 : 3,
      })
    }
  }

  // Meta description length (15)
  {
    const max = 15
    let earned = 0
    if (descLen >= 120 && descLen <= 160) earned = 15
    else if (descLen >= 90 && descLen < 120) earned = 10
    else if (descLen >= 50) earned = 5
    score += earned
    checks.push({
      id: 'desc_len',
      label: 'Meta-Beschreibung (120–160 Zeichen)',
      earned,
      max,
      ok: earned === max,
    })
    if (earned < max) {
      suggestions.push({
        id: 'desc_len',
        points: max - earned,
        text:
          descLen === 0
            ? 'Meta-Beschreibung schreiben (120–160 Zeichen) mit Angebot, Ort und Call-to-Action.'
            : descLen < 120
              ? `Beschreibung ausbauen (${descLen}/160) — Nutzen + Ort + «online buchen».`
              : `Beschreibung leicht kürzen (${descLen}/160).`,
        step: 4,
      })
    }
  }

  // Description local/CTA (5)
  {
    const max = 5
    const hasGeo = city ? descLower.includes(city) : /schweiz|zürich|bern|basel|luzern|genf|stgallen|winterthur/i.test(desc)
    const hasCta = /buch|termin|jetzt|online|anmeld/i.test(desc)
    const earned = hasGeo && hasCta ? 5 : hasGeo || hasCta ? 3 : 0
    score += earned
    checks.push({
      id: 'desc_cta',
      label: 'Meta mit Ort + Call-to-Action',
      earned,
      max,
      ok: earned === max,
    })
    if (earned < max) {
      suggestions.push({
        id: 'desc_cta',
        points: max - earned,
        text: 'In die Meta-Beschreibung Ort und eine klare Aktion schreiben (z.B. «Fahrstunde online buchen»).',
        step: 4,
      })
    }
  }

  // Keywords (10)
  {
    const max = 10
    const n = keywordCount(input.seo_keywords)
    const earned = n >= 5 ? 10 : n >= 3 ? 7 : n >= 1 ? 3 : 0
    score += earned
    checks.push({ id: 'keywords', label: 'Keywords (mind. 5)', earned, max, ok: earned === max })
    if (earned < max) {
      suggestions.push({
        id: 'keywords',
        points: max - earned,
        text: 'Mindestens 5 Keywords setzen: Branche + Ort, Angebot, Markenname (kommagetrennt).',
        step: 4,
      })
    }
  }

  // Bio (10)
  {
    const max = 10
    const b = len(input.bio)
    const earned = b >= 120 ? 10 : b >= 60 ? 6 : b >= 20 ? 3 : 0
    score += earned
    checks.push({ id: 'bio', label: 'Bio (mind. 120 Zeichen)', earned, max, ok: earned === max })
    if (earned < max) {
      suggestions.push({
        id: 'bio',
        points: max - earned,
        text: 'Bio im Profil auf 2–3 Sätze ausbauen (mind. ~120 Zeichen). AI-Vorschläge liefern jetzt längere Bios.',
        step: 0,
      })
    }
  }

  // Address / city (10)
  {
    const max = 10
    const earned = city || len(input.address) >= 8 ? 10 : len(input.address) > 0 ? 4 : 0
    score += earned
    checks.push({ id: 'address', label: 'Adresse / Ort', earned, max, ok: earned === max })
    if (earned < max) {
      suggestions.push({
        id: 'address',
        points: max - earned,
        text: 'Vollständige Adresse mit PLZ und Ort angeben — wichtig für Local SEO und Schema.',
        step: 3,
      })
    }
  }

  // Contact (5)
  {
    const max = 5
    const earned = (has(input.phone) ? 3 : 0) + (has(input.email) ? 2 : 0)
    score += earned
    checks.push({ id: 'contact', label: 'Telefon + E-Mail', earned, max, ok: earned === max })
    if (earned < max) {
      suggestions.push({
        id: 'contact',
        points: max - earned,
        text: 'Telefon und E-Mail hinterlegen — erscheinen im Kontakt und in Structured Data.',
        step: 3,
      })
    }
  }

  // Logo (5)
  {
    const max = 5
    const earned = has(input.logo_url) ? 5 : 0
    score += earned
    checks.push({ id: 'logo', label: 'Logo', earned, max, ok: earned === max })
    if (earned < max) {
      suggestions.push({
        id: 'logo',
        points: max - earned,
        text: 'Logo hochladen — stärkt Marke, Favicon und Google-Darstellung.',
        step: 0,
      })
    }
  }

  // Hero (5)
  {
    const max = 5
    const earned = has(input.hero_image_url) ? 5 : 0
    score += earned
    checks.push({ id: 'hero', label: 'Hero-Bild', earned, max, ok: earned === max })
    if (earned < max) {
      suggestions.push({
        id: 'hero',
        points: max - earned,
        text: 'Hero-Bild setzen (eigenes Foto, Stock oder AI) — besserer erster Eindruck und Bild-SEO.',
        step: 0,
      })
    }
  }

  // Service descriptions (5)
  {
    const max = 5
    const total = Math.max(0, Number(input.serviceCount) || 0)
    const done = Math.max(0, Number(input.describedServiceCount) || 0)
    let earned = 0
    if (total === 0) earned = 5 // nothing to describe
    else if (done >= total) earned = 5
    else if (done >= Math.ceil(total / 2)) earned = 3
    else if (done >= 1) earned = 1
    score += earned
    checks.push({
      id: 'services',
      label: 'Dienstleistungs-Beschreibungen',
      earned,
      max,
      ok: earned === max,
    })
    if (earned < max) {
      suggestions.push({
        id: 'services',
        points: max - earned,
        text: `Beschreibungen für alle Angebote ergänzen (${done}/${total}). AI-Vorschläge pro Service nutzen.`,
        step: 1,
      })
    }
  }

  // Social proof (5)
  {
    const max = 5
    const earned = input.hasGoogleReviews || input.hasTestimonials ? 5 : 0
    score += earned
    checks.push({
      id: 'reviews',
      label: 'Bewertungen / Testimonials',
      earned,
      max,
      ok: earned === max,
    })
    if (earned < max) {
      suggestions.push({
        id: 'reviews',
        points: max - earned,
        text: '2–3 echte Kundenstimmen erfassen (oder Google verbinden) — keine Fake-Reviews.',
        step: 2,
      })
    }
  }

  // Custom domain bonus was tempting but keep max 100 without it — optional tip only
  if (!input.hasCustomDomain) {
    suggestions.push({
      id: 'domain',
      points: 0,
      text: 'Tipp: Eigene Domain verbinden (z.B. fahrschule-muster.ch) — stärker für Local SEO als /s/…-URL.',
      step: 3,
    })
  }

  const clamped = Math.max(0, Math.min(100, score))
  let label = 'Noch ausbaufähig'
  let tone: WizardSeoScore['tone'] = 'poor'
  if (clamped >= 95) {
    label = 'Exzellent!'
    tone = 'great'
  } else if (clamped >= 80) {
    label = 'Sehr gut!'
    tone = 'great'
  } else if (clamped >= 65) {
    label = 'Gut — noch Luft nach oben'
    tone = 'good'
  } else if (clamped >= 40) {
    label = 'Okay — gezielt nachbessern'
    tone = 'ok'
  }

  // Sort actionable suggestions by points desc, domain tip last
  suggestions.sort((a, b) => {
    if (a.points === 0 && b.points !== 0) return 1
    if (b.points === 0 && a.points !== 0) return -1
    return b.points - a.points
  })

  return {
    score: clamped,
    max: 100,
    label,
    tone,
    suggestions: suggestions.filter((s) => s.points > 0 || s.id === 'domain').slice(0, 6),
    checks,
  }
}
