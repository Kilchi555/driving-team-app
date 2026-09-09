export interface EmphasisSegment {
  text: string
  bold: boolean
}

const STRONG_PATTERN = /<strong>([\s\S]*?)<\/strong>/gi

/**
 * Splits marketing copy that uses <strong> for emphasis into plain text segments,
 * so templates can render it with text interpolation instead of v-html. Anything
 * that is not a <strong> pair stays literal text and is escaped by Vue on render.
 */
export function toEmphasisSegments(input: string | null | undefined): EmphasisSegment[] {
  const source = String(input ?? '')
  const segments: EmphasisSegment[] = []
  let cursor = 0

  for (const match of source.matchAll(STRONG_PATTERN)) {
    const start = match.index ?? 0
    if (start > cursor) {
      segments.push({ text: source.slice(cursor, start), bold: false })
    }
    segments.push({ text: match[1], bold: true })
    cursor = start + match[0].length
  }

  if (cursor < source.length) {
    segments.push({ text: source.slice(cursor), bold: false })
  }

  return segments
}
