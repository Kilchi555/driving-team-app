/**
 * hCaptcha Plugin
 * Loads hCaptcha script on client-side and renders widgets
 */

export default defineNuxtPlugin(() => {
  if (typeof window !== 'undefined') {
    // Check if script already exists
    if (document.querySelector('script[src*="hcaptcha"]')) {
      logger.debug('✅ hCaptcha script tag already exists')
      return
    }

    // Load hCaptcha script
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js'
    script.async = true
    script.defer = false
    
    script.onload = () => {
      logger.debug('✅ hCaptcha script loaded successfully')
      
      // Render hCaptcha widgets after script loads
      if ((window as any).hcaptcha) {
        // Find all hCaptcha containers and render them
        const containers = document.querySelectorAll('.h-captcha')
        logger.debug(`🔍 Found ${containers.length} hCaptcha containers`)
        
        containers.forEach((container, index) => {
          const siteKey = container.getAttribute('data-sitekey')
          logger.debug(`🎨 Rendering hCaptcha widget ${index + 1} with sitekey: ${siteKey?.substring(0, 10)}...`)
          
          try {
            (window as any).hcaptcha.render(container.id, {
              sitekey: siteKey,
              theme: 'light'
            })
            logger.debug(`✅ hCaptcha widget ${index + 1} rendered successfully`)
          } catch (error) {
            console.error(`❌ Failed to render hCaptcha widget ${index + 1}:`, error)
          }
        })
      }
    }
    
    script.onerror = (error) => {
      console.error('❌ Failed to load hCaptcha script:', error)
    }
    
    document.head.appendChild(script)
    logger.debug('📝 hCaptcha script appended to head')
  }
})

