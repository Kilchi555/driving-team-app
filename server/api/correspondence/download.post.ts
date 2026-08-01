// POST /api/correspondence/download — PDF for existing correspondence id

import { readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { uploadPdfAndGetPublicUrl } from '~/server/utils/upload-pdf-public'
import {
  requireCorrespondenceStaff,
  buildCorrespondencePdfFromRow,
} from '~/server/utils/correspondence'

export default defineEventHandler(async (event) => {
  const staff = await requireCorrespondenceStaff(event)
  const { id, correspondenceId } = await readBody(event) || {}
  const rowId = id || correspondenceId
  if (!rowId) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const supabase = getSupabaseAdmin()
  const { data: row, error } = await supabase
    .from('correspondence')
    .select('*')
    .eq('id', rowId)
    .eq('tenant_id', staff.tenant_id)
    .single()

  if (error || !row) throw createError({ statusCode: 404, statusMessage: 'Correspondence not found' })

  let signerName: string | null = null
  if (row.created_by) {
    const { data: creator } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', row.created_by)
      .maybeSingle()
    if (creator) signerName = [creator.first_name, creator.last_name].filter(Boolean).join(' ')
  }

  const { pdfBuffer } = await buildCorrespondencePdfFromRow(supabase, row, { signerName })
  const filename = `Brief_${row.reference_number}.pdf`
  const { pdfUrl } = await uploadPdfAndGetPublicUrl(supabase, {
    folder: 'correspondence',
    filename,
    pdfBuffer,
  })

  return { success: true, pdfUrl, filename }
})
