// server/api/invoices/csv-import-detect.post.ts
// Analysiert eine hochgeladene CSV-Datei (Bank-Kontoauszug) und liefert Spalten,
// eine Vorschau sowie eine vorgeschlagene Spalten-Zuordnung zurück, damit der
// Admin sie vor dem eigentlichen Import überprüfen/anpassen kann.

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { parseCsv, suggestColumnMapping } from '~/server/utils/csv-parse'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: staffUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'tenant_admin'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins können Zahlungsdateien importieren' })
  }

  const body = await readBody(event)
  const csvContent: string = body.csv_content
  if (!csvContent || typeof csvContent !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'csv_content fehlt' })
  }

  const { headers, rows, delimiter } = parseCsv(csvContent)
  if (headers.length === 0 || rows.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'Konnte keine Tabellendaten in der Datei erkennen' })
  }

  const suggestedMapping = suggestColumnMapping(headers)

  return {
    headers,
    delimiter,
    row_count: rows.length,
    preview_rows: rows.slice(0, 5),
    suggested_mapping: suggestedMapping,
  }
})
