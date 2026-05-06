export default defineNuxtPlugin(() => {
  if (!(window as any).Capacitor?.isNativePlatform?.()) return

  // Prevent body from scrolling in native app – pages manage their own scroll
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.style.height = '100%'
  document.documentElement.style.height = '100%'
})
