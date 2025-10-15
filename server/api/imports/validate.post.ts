export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const columns = (body?.columns ?? []) as string[]
  const rows = (body?.rows ?? []) as Array<Record<string, any>>

  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid payload' })
  }

  // Basic sanity checks (no DB writes)
  const maxColumns = 200
  const issues: Array<{ index: number; message: string }> = []

  if (columns.length === 0) {
    issues.push({ index: -1, message: 'Keine Spalten gefunden' })
  }
  if (columns.length > maxColumns) {
    issues.push({ index: -1, message: `Zu viele Spalten (${columns.length} > ${maxColumns})` })
  }
  // Removed row limit - validate all rows

  // Check for duplicate column names
  const lower = columns.map(c => (c || '').toString().trim().toLowerCase())
  const dupes = new Set<string>()
  const seen = new Set<string>()
  for (const c of lower) {
    if (seen.has(c)) dupes.add(c)
    seen.add(c)
  }
  if (dupes.size) {
    issues.push({ index: -1, message: `Doppelte Spalten: ${Array.from(dupes).join(', ')}` })
  }

  // Sample a subset for null/empty checks
  const sampleCount = Math.min(50, rows.length)
  const samples: any[] = []
  for (let i = 0; i < sampleCount; i++) {
    const r = rows[i]
    // Capture first 8 columns only for response brevity
    const small: Record<string, any> = {}
    for (let c = 0; c < Math.min(columns.length, 8); c++) {
      const key = columns[c]
      small[key] = r[key]
    }
    samples.push({ index: i, row: small })
  }

  // Heuristic: detect likely email/phone/date columns by header name
  const likelyEmail = columns.find(c => /email/i.test(c))
  const likelyPhone = columns.find(c => /(phone|telefon|mobile|handy)/i.test(c))
  const likelyDate = columns.find(c => /(birth|geburt|date|datum)/i.test(c))

  const suggestions: string[] = []
  if (!likelyEmail) suggestions.push('Kein offensichtliches E-Mail-Feld erkannt')
  if (!likelyPhone) suggestions.push('Kein offensichtliches Telefonfeld erkannt')
  if (!likelyDate) suggestions.push('Kein offensichtliches Datumsfeld erkannt')

  return {
    totalRows: rows.length,
    errors: issues.length,
    warnings: suggestions.length,
    issues,
    suggestions,
    samples
  }
})


