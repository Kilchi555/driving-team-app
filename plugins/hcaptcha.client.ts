/**
 * hCaptcha Plugin
 * Loads hCaptcha script on client-side
 */

export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined') {
    // Load hCaptcha script
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
    
    console.log('✅ hCaptcha script loaded')
  }
})

