/**
 * hCaptcha Plugin
 * Loads hCaptcha script on client-side
 */

export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined') {
    // Check if hCaptcha script already loaded
    if ((window as any).hcaptcha) {
      console.log('✅ hCaptcha already loaded')
      return
    }

    // Check if script already exists
    if (document.querySelector('script[src*="hcaptcha"]')) {
      console.log('✅ hCaptcha script tag already exists')
      return
    }

    // Load hCaptcha script
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js'
    script.async = true
    script.defer = false
    script.onload = () => {
      console.log('✅ hCaptcha script loaded successfully')
    }
    script.onerror = () => {
      console.error('❌ Failed to load hCaptcha script')
    }
    document.head.appendChild(script)
    
    console.log('📝 hCaptcha script appended to head')
  }
})

