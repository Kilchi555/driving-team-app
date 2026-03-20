export const useFavicon = () => {
  const setFavicon = (logoUrl: string | null, fallbackEmoji: string = '🚗') => {
    if (!process.client) return
    
    if (logoUrl) {
      // Use logo as favicon
      const link = document.querySelector('link[rel="icon"]') || document.createElement('link')
      link.rel = 'icon'
      link.href = logoUrl
      link.type = 'image/x-icon'
      if (!document.querySelector('link[rel="icon"]')) {
        document.head.appendChild(link)
      }
    } else {
      // Fallback: create emoji favicon
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 64, 64)
        ctx.font = 'bold 40px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(fallbackEmoji, 32, 32)
        
        const link = document.querySelector('link[rel="icon"]') || document.createElement('link')
        link.rel = 'icon'
        link.href = canvas.toDataURL()
        link.type = 'image/x-icon'
        if (!document.querySelector('link[rel="icon"]')) {
          document.head.appendChild(link)
        }
      }
    }
  }

  return {
    setFavicon
  }
}
