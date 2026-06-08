/**
 * Reliably opens or downloads a PDF across all platforms:
 * - Native app (Capacitor iOS/Android): opens via system browser / PDF viewer
 * - Web (Safari/Chrome): falls back to <a download> if window.open is blocked
 *   by the popup blocker (which happens when called after a long async chain)
 */
export async function openPdf(url: string, filename: string = 'quittung.pdf'): Promise<void> {
  if (typeof window === 'undefined') return

  // ── Native app (Capacitor) ────────────────────────────────────────────────
  // Use the system browser / SFSafariViewController which gives the user a
  // native PDF viewer with Save/Share options.
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url, presentationStyle: 'fullscreen' })
      return
    }
  } catch {
    // Capacitor not available – continue with web path
  }

  // ── Web ───────────────────────────────────────────────────────────────────
  // Fetch the PDF as a blob first so we have a local reference, then try to
  // open it. If window.open is blocked by the popup blocker (iOS Safari /
  // Android Chrome after async) we fall back to a programmatic <a download>.
  const pdfResponse = await fetch(url)
  if (!pdfResponse.ok) {
    throw new Error(`PDF konnte nicht geladen werden (${pdfResponse.status})`)
  }
  const blob = await pdfResponse.blob()
  const blobUrl = URL.createObjectURL(blob)

  let opened = false
  try {
    const win = window.open(blobUrl, '_blank')
    opened = !!win && !win.closed
  } catch {
    opened = false
  }

  if (!opened) {
    // Fallback: trigger a download via a hidden <a> element
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Release blob memory after the viewer / download has had time to start
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15_000)
}
