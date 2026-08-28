import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { parseXlsxRows } from '../../../utils/parse-xlsx-rows.client'

describe('parseXlsxRows', () => {
  it('reads the first sheet into header + rows', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Import')
    sheet.addRow(['email', 'first_name'])
    sheet.addRow(['a@example.com', 'Ada'])
    sheet.addRow(['', ''])
    sheet.addRow(['b@example.com', 'Ben'])
    const buffer = await workbook.xlsx.writeBuffer()

    const parsed = await parseXlsxRows(buffer as ArrayBuffer)
    expect(parsed.header).toEqual(['email', 'first_name'])
    expect(parsed.rows).toEqual([
      { email: 'a@example.com', first_name: 'Ada' },
      { email: 'b@example.com', first_name: 'Ben' },
    ])
  })
})
