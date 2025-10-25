// composables/useDeviceSecurity.ts
// Device security and MAC address tracking

export const useDeviceSecurity = () => {
  const getMacAddress = async (): Promise<string | null> => {
    if (!process.client) return null
    
    try {
      // Note: Direct MAC address access is not possible in browsers for security reasons
      // We'll use a combination of browser fingerprinting instead
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Browser fingerprint', 2, 2)
      }
      
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        canvas: canvas.toDataURL(),
        webgl: getWebGLFingerprint(),
        plugins: Array.from(navigator.plugins).map(p => p.name).join(','),
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack
      }
      
      // Create a hash-like identifier from the fingerprint
      const fingerprintString = JSON.stringify(fingerprint)
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintString))
      const hashArray = Array.from(new Uint8Array(hash))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      return hashHex.substring(0, 17) // Format like MAC address
    } catch (error) {
      console.error('Error generating device fingerprint:', error)
      return null
    }
  }
  
  const getWebGLFingerprint = (): string => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) return 'no-webgl'
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      }
      return 'webgl-available'
    } catch (error) {
      return 'webgl-error'
    }
  }
  
  const getClientIP = async (): Promise<string | null> => {
    try {
      // Use a service to get the client's public IP
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      console.error('Error getting client IP:', error)
      return null
    }
  }
  
  const registerDevice = async (userId: string) => {
    try {
      const macAddress = await getMacAddress()
      const ipAddress = await getClientIP()
      
      if (!macAddress) {
        throw new Error('Could not generate device fingerprint')
      }
      
      const response = await $fetch('/api/admin/device-security', {
        method: 'POST',
        body: {
          action: 'register_device',
          userId,
          macAddress,
          userAgent: navigator.userAgent,
          ipAddress
        }
      })
      
      return response
    } catch (error) {
      console.error('Error registering device:', error)
      throw error
    }
  }
  
  const checkDevice = async (userId: string) => {
    try {
      const macAddress = await getMacAddress()
      const ipAddress = await getClientIP()
      
      if (!macAddress) {
        throw new Error('Could not generate device fingerprint')
      }
      
      const response = await $fetch('/api/admin/device-security', {
        method: 'POST',
        body: {
          action: 'check_device',
          userId,
          macAddress,
          userAgent: navigator.userAgent,
          ipAddress
        }
      })
      
      return response
    } catch (error) {
      console.error('Error checking device:', error)
      throw error
    }
  }
  
  const trustDevice = async (userId: string) => {
    try {
      const macAddress = await getMacAddress()
      
      if (!macAddress) {
        throw new Error('Could not generate device fingerprint')
      }
      
      const response = await $fetch('/api/admin/device-security', {
        method: 'POST',
        body: {
          action: 'trust_device',
          userId,
          macAddress
        }
      })
      
      return response
    } catch (error) {
      console.error('Error trusting device:', error)
      throw error
    }
  }
  
  return {
    getMacAddress,
    getClientIP,
    registerDevice,
    checkDevice,
    trustDevice
  }
}


