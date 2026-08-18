/** Hero loops stay short. User picks this window in the editor. */
export const HERO_CLIP_SECONDS = 8

export function formatClipTime(seconds: number) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const r = s - m * 60
  const whole = Math.floor(r)
  const frac = Math.floor((r - whole) * 10)
  return `${m}:${String(whole).padStart(2, '0')}${frac ? `.${frac}` : ''}`
}

function loadVideo(src: string) {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = src
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => reject(new Error('Video konnte nicht gelesen werden'))
  })
}

function seek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onErr)
      resolve()
    }
    const onErr = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onErr)
      reject(new Error('Sprung im Video fehlgeschlagen'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onErr)
    video.currentTime = Math.max(0, Math.min(time, (video.duration || time) - 0.05))
  })
}

export async function captureVideoPoster(src: string, atSeconds: number): Promise<Blob> {
  const video = await loadVideo(src)
  await seek(video, atSeconds)
  const maxW = 1600
  const scale = Math.min(1, maxW / Math.max(1, video.videoWidth))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(2, Math.round(video.videoHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  video.src = ''
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/webp', 0.82)
  })
  if (!blob) throw new Error('Standbild fehlgeschlagen')
  return blob
}

function pickRecorderMime() {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || ''
}

/** Re-encode the chosen window to ~720p, muted. Falls back to throw if unsupported. */
export async function encodeHeroClip(
  src: string,
  start: number,
  duration: number,
  onTick?: (label: string) => void,
): Promise<File> {
  const mime = pickRecorderMime()
  if (!mime) throw new Error('Dieser Browser kann das Video nicht optimieren')

  onTick?.('Ausschnitt vorbereiten…')
  const video = await loadVideo(src)
  await seek(video, start)

  const maxH = 720
  const scale = Math.min(1, maxH / Math.max(1, video.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2)
  canvas.height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')

  const stream = canvas.captureStream(25)
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_600_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }

  onTick?.('Ausschnitt speichern…')
  const ended = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    rec.onerror = () => reject(new Error('Aufnahme fehlgeschlagen'))
  })

  rec.start(250)
  await video.play()
  const endAt = start + duration
  await new Promise<void>((resolve) => {
    const draw = () => {
      if (video.ended || video.paused || video.currentTime >= endAt) {
        video.pause()
        rec.stop()
        resolve()
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      requestAnimationFrame(draw)
    }
    draw()
  })

  const blob = await ended
  video.src = ''
  stream.getTracks().forEach((t) => t.stop())
  if (blob.size < 20_000) throw new Error('Optimierte Datei ist leer')
  return new File([blob], `hero-clip-${Date.now()}.webm`, { type: 'video/webm' })
}
