/**
 * Google Maps API Loader Plugin
 * Loads Google Maps API with proper async loading to avoid performance warnings
 * This runs on client-side only
 */

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiKey = config.public.googleMapsApiKey

  if (!apiKey) {
    console.warn('⚠️ Google Maps API Key not configured')
    return
  }

  // Check if script is already loaded
  if (window.google?.maps) {
    logger.debug('✅ Google Maps already loaded')
    return
  }

  // Create script element with proper async loading
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=de&region=CH&loading=async`
  script.async = true
  script.defer = true

  script.onload = () => {
    logger.debug('✅ Google Maps API loaded successfully')
  }

  script.onerror = () => {
    console.error('❌ Failed to load Google Maps API')
  }

  document.head.appendChild(script)
})

