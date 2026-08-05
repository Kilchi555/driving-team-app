/** Google Place IDs that may feed marketing reviews, keyed by Simy business_type. */
export type ReviewPlace = {
  label: string
  placeId: string
  mapsUrl: string
}

/**
 * Only attach places whose Google reviews are legitimate social proof for
 * *Simy* (product / reference customers), not unrelated business reviews.
 *
 * Do not put Driving Team (or other non-Simy) Place IDs here — those are
 * school/customer reviews, not Simy product reviews.
 *
 * Add live Simy customer Place IDs per vertical as they go live.
 */
export const REVIEW_PLACES_BY_TYPE: Record<string, ReviewPlace[]> = {
  driving_school: [],
  mental_coach: [],
  consulting: [],
  fitness: [],
  tutoring: [],
  music_school: [],
  dog_training: [],
  massage: [],
}

/**
 * Shared Simy product Place(s) — reviews are keyword-routed to verticals.
 * Add the simy.ch Google Business Profile place_id when available.
 */
export const SHARED_REVIEW_PLACES: ReviewPlace[] = []

export function placesForBusinessType(businessType: string): ReviewPlace[] {
  const specific = REVIEW_PLACES_BY_TYPE[businessType] || []
  return [...specific, ...SHARED_REVIEW_PLACES]
}

/**
 * Extra keyword gate: a review from a place still needs to match (or have no
 * keywords = accept all from that place). Used when one Place serves multiple
 * verticals later.
 */
export const REVIEW_KEYWORDS_BY_TYPE: Record<string, RegExp | null> = {
  driving_school:
    /fahrschule|fahrlehrer|fahrstunde|prüfung|führerschein|motorrad|anhänger|auto|theorie|vku|grundkurs|simy/i,
  mental_coach: /coach|coaching|sitzung|mental|kunde|simy/i,
  consulting: /berat|consult|workshop|projekt|simy/i,
  fitness: /training|trainer|fitness|workout|personal.?train|simy/i,
  tutoring: /nachhilfe|tutor|lektion|mathe|deutsch|schule|simy/i,
  music_school: /musik|klavier|gitarre|gesang|unterricht|instrument|simy/i,
  dog_training: /hund|welpe|hundeschule|hundetrain|simy/i,
  massage: /massage|behandlung|wellness|shiatsu|simy/i,
}
