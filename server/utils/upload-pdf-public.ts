/**
 * Upload a generated PDF to the public `receipts` bucket and return an HTTPS URL.
 * Native Capacitor apps can only open PDFs via Browser.open() with http(s) URLs —
 * data:/blob: URLs do not work in SFSafariViewController / Chrome Custom Tabs.
 */
import { createError } from 'h3'

export async function uploadPdfAndGetPublicUrl(
  supabase: { storage: any },
  opts: { folder: string; filename: string; pdfBuffer: Buffer }
): Promise<{ pdfUrl: string; filename: string }> {
  const safeName = opts.filename.replace(/[^\w.\-äöüÄÖÜß]+/g, '_').replace(/_+/g, '_')
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const filepath = `${opts.folder}/${year}/${month}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filepath, opts.pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: `PDF upload failed: ${uploadError.message}`,
    })
  }

  const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(filepath)
  const pdfUrl = publicData?.publicUrl
  if (!pdfUrl) {
    throw createError({ statusCode: 500, statusMessage: 'PDF public URL missing' })
  }

  return { pdfUrl, filename: safeName }
}
