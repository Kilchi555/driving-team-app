export type ParsedXlsxTable = {
  header: string[]
  rows: Record<string, string>[]
}

function cellToString(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value && 'text' in value) {
    return String((value as { text?: unknown }).text ?? '')
  }
  if (typeof value === 'object' && value && 'result' in value) {
    return cellToString((value as { result?: unknown }).result)
  }
  return String(value).trim()
}

export async function parseXlsxRows(buffer: ArrayBuffer): Promise<ParsedXlsxTable> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { header: [], rows: [] }

  const matrix: string[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : []
    matrix.push(values.map(cellToString))
  })

  if (matrix.length === 0) return { header: [], rows: [] }

  const header = matrix[0].map(cell => String(cell ?? '').trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < matrix.length; i++) {
    const rowArr = matrix[i]
    if (rowArr.every(cell => cell === '')) continue
    const row: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      row[header[c]] = rowArr[c] ?? ''
    }
    rows.push(row)
  }
  return { header, rows }
}
