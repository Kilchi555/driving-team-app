/**
 * Reliably opens or downloads a PDF across all platforms:
 * - Native app (Capacitor iOS/Android): opens via @capacitor/browser (HTTPS only)
 * - Web (Safari/Chrome): window.open / <a download>
 *
 * Prefer HTTPS public storage URLs. Data URLs work on web via blob conversion;
 * on native they cannot be opened (Browser.open requires http/https).
 */
export async function openPdf(url: string, filename: string = 'dokument.pdf'): Promise<void> {
  if (typeof window === 'undefined') return

  // Convert base64 data URL to blob URL first (web fallback for legacy APIs)
  let blobUrl: string | null = null
  const isDataUrl = url.startsWith('data:')
  if (isDataUrl) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      const mimeType = match[1]
      const binaryStr = atob(match[2])
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      blobUrl = URL.createObjectURL(blob)
    }
  }

  const resolvedUrl = blobUrl || url
  const isHttpUrl = /^https?:\/\//i.test(url)

  // ── Native app (Capacitor) ────────────────────────────────────────────────
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      if (!isHttpUrl) {
        // Browser.open cannot display data:/blob: URLs.
        console.warn('[openPdf] Native requires an https URL; got non-http URL for', filename)
        throw new Error('PDF-URL nicht kompatibel mit der App. Bitte erneut versuchen.')
      }
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url, presentationStyle: 'fullscreen' })
      return
    }
  } catch (e) {
    // If Capacitor Browser failed on native, rethrow; otherwise continue with web path
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) throw e
    } catch (inner) {
      if (inner === e) throw e
    }
  }

  // ── Web ───────────────────────────────────────────────────────────────────
  if (!blobUrl && !isDataUrl) {
    try {
      const pdfResponse = await fetch(url)
      if (pdfResponse.ok) {
        const blob = await pdfResponse.blob()
        blobUrl = URL.createObjectURL(blob)
      }
    } catch {
      // If fetch fails, fall through to direct window.open
    }
  }

  const openUrl = blobUrl || resolvedUrl

  let opened = false
  try {
    const win = window.open(openUrl, '_blank')
    opened = !!win && !win.closed
  } catch {
    opened = false
  }

  if (!opened) {
    const a = document.createElement('a')
    a.href = openUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl!), 30_000)
}
