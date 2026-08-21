/**
 * Google Maps API Loader Plugin
 * Does not inject Maps on public booking pages — those load it only on the pickup step.
 */

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiKey = config.public.googleMapsApiKey as string | undefined

  const loadGoogleMaps = () => {
    if (!apiKey) return
    if (window.google?.maps) {
      window.dispatchEvent(new Event('google-maps-loaded'))
      return
    }
    if (document.querySelector('script[data-google-maps]')) return

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=de&region=CH`
    script.async = true
    script.defer = true
    script.dataset.googleMaps = '1'

    script.onload = () => {
      window.dispatchEvent(new Event('google-maps-loaded'))
    }

    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API')
    }

    document.head.appendChild(script)
  }

  if (apiKey && !window.location.pathname.includes('/booking/')) {
    loadGoogleMaps()
  }

  return { provide: { loadGoogleMaps } }
})
