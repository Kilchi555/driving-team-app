/**
 * Typed structure for evaluation_criteria.staff_content (JSONB).
 *
 * Follows a 13-section pedagogical framework plus a Fahrlehrer-Tipps section.
 */

export interface PraxisBeispiel {
  situation?: string
  richtiges_verhalten?: string
  warum?: string
}

export interface StaffContent {
  /** 1. Thema */
  thema?: {
    definition?: string
  }

  /** 2. Warum ist das wichtig? */
  warum_wichtig?: {
    praxisbezug?: string
    sicherheitsrelevanz?: string
    verkehrssituationen?: string
    pruefungsrelevanz?: string
  }

  /** 3. Lernziele */
  lernziele?: {
    wissen?: string[]
    verstehen?: string[]
    anwenden?: string[]
    risikokompetenz?: string[]
  }

  /** 4. Kerninhalt */
  kerninhalt?: {
    text?: string
    definitionen?: string[]
    regeln?: string[]
    merksaetze?: string[]
    ausnahmen?: string[]
  }

  /** 5. Häufige Fehler */
  haeufige_fehler?: string[]

  /** 6. Praxisbezug */
  praxisbeispiele?: PraxisBeispiel[]

  /** 7. Visualisierung */
  visualisierung?: {
    vorschlaege?: string[]
    images?: string[]
    video_links?: string[]
  }

  /** 8. System / Vorgehensweise */
  system?: {
    text?: string
    schritte?: string[]
  }

  /** 9. Risikodialog */
  risikodialog?: {
    was_schiefgehen?: string
    wer_gefaehrdet?: string
    warum_fehler?: string
    risiko_reduzieren?: string
  }

  /** 10. Prüfungsrelevanz */
  pruefungsrelevanz?: string[]

  /** 11. Kontrollfragen */
  kontrollfragen?: {
    wissensfragen?: string[]
    verstaendnisfragen?: string[]
    reflexionsfragen?: string[]
  }

  /** 12. Zusammenfassung */
  zusammenfassung?: string[]

  /** 13. Hausaufgabe / Transfer */
  hausaufgabe?: string

  /** Tipps für den Fahrlehrer */
  tipps_fahrlehrer?: {
    unterrichtstipps?: string[]
    typische_schuelermeinungen?: string[]
    geeignete_fragen?: string[]
    korrekturansaetze?: string[]
    pruefungsbezug?: string
    images?: string[]
    video_links?: string[]
  }
}

/** Returns an empty StaffContent with all sub-objects initialized */
export function emptyStaffContent(): StaffContent {
  return {
    thema: { definition: '' },
    warum_wichtig: { praxisbezug: '', sicherheitsrelevanz: '', verkehrssituationen: '', pruefungsrelevanz: '' },
    lernziele: { wissen: [], verstehen: [], anwenden: [], risikokompetenz: [] },
    kerninhalt: { text: '', definitionen: [], regeln: [], merksaetze: [], ausnahmen: [] },
    haeufige_fehler: [],
    praxisbeispiele: [],
    visualisierung: { vorschlaege: [], images: [], video_links: [] },
    system: { text: '', schritte: [] },
    risikodialog: { was_schiefgehen: '', wer_gefaehrdet: '', warum_fehler: '', risiko_reduzieren: '' },
    pruefungsrelevanz: [],
    kontrollfragen: { wissensfragen: [], verstaendnisfragen: [], reflexionsfragen: [] },
    zusammenfassung: [],
    hausaufgabe: '',
    tipps_fahrlehrer: { unterrichtstipps: [], typische_schuelermeinungen: [], geeignete_fragen: [], korrekturansaetze: [], pruefungsbezug: '', images: [], video_links: [] }
  }
}

/** Deep-merges a raw DB value (possibly old or partial) into an empty StaffContent */
export function parseStaffContent(raw: any): StaffContent {
  if (!raw) return emptyStaffContent()
  const base = emptyStaffContent()
  const r = typeof raw === 'string' ? JSON.parse(raw) : raw

  // Deep merge each top-level key
  const merge = <T extends object>(target: T, source: any): T => {
    if (!source || typeof source !== 'object') return target
    const result = { ...target } as any
    for (const key of Object.keys(source)) {
      if (source[key] !== null && source[key] !== undefined) {
        result[key] = source[key]
      }
    }
    return result
  }

  // ── Backward-compatibility: map old flat fields to new structure ──────────
  //
  // Old format used: teaching_goal, checklist, common_mistakes, sections[]
  // New format uses the 13-section structure below.
  // When new fields are absent we fall back to old ones so existing data stays visible.

  // 1. Thema ← teaching_goal (old)
  const thema = r.thema
    ? merge(base.thema!, r.thema)
    : { definition: r.teaching_goal || '' }

  // 2. Lernziele — old "checklist" items map to "Anwenden"
  const lernziele = r.lernziele
    ? merge(base.lernziele!, r.lernziele)
    : {
        wissen: [],
        verstehen: [],
        anwenden: Array.isArray(r.checklist) ? r.checklist : [],
        risikokompetenz: []
      }

  // 3. Häufige Fehler ← common_mistakes (old)
  const haeufige_fehler = Array.isArray(r.haeufige_fehler)
    ? r.haeufige_fehler
    : Array.isArray(r.common_mistakes) ? r.common_mistakes : []

  // 4. Tipps für den Fahrlehrer ← old generic sections[]
  //    Each old section becomes a tip entry (title + text joined).
  const tipsBase = merge(base.tipps_fahrlehrer!, r.tipps_fahrlehrer)
  if (!r.tipps_fahrlehrer && Array.isArray(r.sections) && r.sections.length > 0) {
    const legacyTips: string[] = r.sections
      .map((s: any) => [s.title, s.text].filter(Boolean).join(' — '))
      .filter(Boolean)
    if (legacyTips.length > 0) tipsBase.unterrichtstipps = legacyTips

    // Collect images from old sections
    const legacyImages: string[] = r.sections.flatMap((s: any) => s.images || []).filter(Boolean)
    if (legacyImages.length > 0) tipsBase.images = legacyImages

    // Collect video_links from old sections
    const legacyLinks: string[] = r.sections.flatMap((s: any) => s.video_links || []).filter(Boolean)
    if (legacyLinks.length > 0) tipsBase.video_links = legacyLinks
  }

  return {
    thema,
    warum_wichtig: merge(base.warum_wichtig!, r.warum_wichtig),
    lernziele,
    kerninhalt: merge(base.kerninhalt!, r.kerninhalt),
    haeufige_fehler,
    praxisbeispiele: Array.isArray(r.praxisbeispiele) ? r.praxisbeispiele : [],
    visualisierung: merge(base.visualisierung!, r.visualisierung),
    system: merge(base.system!, r.system),
    risikodialog: merge(base.risikodialog!, r.risikodialog),
    pruefungsrelevanz: Array.isArray(r.pruefungsrelevanz) ? r.pruefungsrelevanz : [],
    kontrollfragen: merge(base.kontrollfragen!, r.kontrollfragen),
    zusammenfassung: Array.isArray(r.zusammenfassung) ? r.zusammenfassung : [],
    hausaufgabe: r.hausaufgabe || '',
    tipps_fahrlehrer: tipsBase
  }
}

/** Strips empty/null values before saving to DB */
export function serializeStaffContent(sc: StaffContent): any {
  const clean = (val: any): any => {
    if (Array.isArray(val)) return val.filter(Boolean)
    if (val && typeof val === 'object') {
      const result: any = {}
      for (const [k, v] of Object.entries(val)) {
        const cleaned = clean(v)
        if (cleaned !== null && cleaned !== undefined && cleaned !== '' && !(Array.isArray(cleaned) && cleaned.length === 0)) {
          result[k] = cleaned
        }
      }
      return Object.keys(result).length > 0 ? result : null
    }
    return val === '' ? null : val
  }

  const result: any = {}
  for (const [k, v] of Object.entries(sc)) {
    const cleaned = clean(v)
    if (cleaned !== null && cleaned !== undefined) result[k] = cleaned
  }
  return Object.keys(result).length > 0 ? result : null
}
