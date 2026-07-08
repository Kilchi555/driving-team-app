/**
 * Reliably opens or downloads a PDF across all platforms:
 * - Native app (Capacitor iOS/Android): opens via system browser / PDF viewer
 * - Web (Safari/Chrome): falls back to <a download> if window.open is blocked
 *   by the popup blocker (which happens when called after a long async chain)
 *
 * Accepts both HTTP URLs and base64 data: URLs.
 */
export async function openPdf(url: string, filename: string = 'dokument.pdf'): Promise<void> {
  if (typeof window === 'undefined') return

  // Convert base64 data URL to blob URL first
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

  // ── Native app (Capacitor) ────────────────────────────────────────────────
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      if (blobUrl) {
        // Blob URLs can't be opened in SFSafariViewController.
        // Trigger a download via hidden <a> – the native WebView will handle it
        // and offer to open in the system PDF viewer / Files app.
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl!), 30_000)
        return
      }
      // For real HTTP URLs: open in SFSafariViewController (iOS) / Chrome Custom Tab (Android)
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: resolvedUrl, presentationStyle: 'fullscreen' })
      return
    }
  } catch {
    // Capacitor not available – continue with web path
  }

  // ── Web ───────────────────────────────────────────────────────────────────
  if (!blobUrl && !isDataUrl) {
    // Fetch the PDF as a blob so we have a local reference
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
