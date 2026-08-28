import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { requireAdminOnly } from '~/server/utils/auth'
import { parseXlsxRows } from '~/server/utils/parse-xlsx-rows'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const MAX_IMPORT_ROWS = 5000

export default defineEventHandler(async (event) => {
  await requireAdminOnly(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find(part => part.name === 'file' && part.data)
  if (!file?.data?.length || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Datei fehlt' })
  }
  if (file.data.length > MAX_FILE_SIZE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Datei ist zu gross (max. 25 MB)' })
  }

  const name = file.filename.toLowerCase()
  if (!name.endsWith('.xlsx')) {
    throw createError({ statusCode: 400, statusMessage: 'Nur .xlsx wird serverseitig gelesen' })
  }

  const buffer = file.data.buffer.slice(file.data.byteOffset, file.data.byteOffset + file.data.byteLength)
  const parsed = await parseXlsxRows(buffer)
  if (parsed.header.length === 0 && parsed.rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Die Excel-Datei ist leer.' })
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw createError({
      statusCode: 400,
      statusMessage: `Zu viele Zeilen (${parsed.rows.length}). Maximal ${MAX_IMPORT_ROWS} Zeilen.`,
    })
  }

  return parsed
})
