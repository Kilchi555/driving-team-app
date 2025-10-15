// plugins/admin-modal-fix.client.ts
// Client-side Plugin um Admin-Modal Input-Styles zu erzwingen

export default defineNuxtPlugin(() => {
  if (process.client) {
    // Funktion um alle Admin-Modal Inputs zu stylen
    const forceAdminModalStyles = () => {
      // Finde alle Admin-Modals
      const adminModals = document.querySelectorAll('.admin-modal, .admin-layout .fixed.inset-0')
      
      adminModals.forEach(modal => {
        // Alle Inputs, Selects und Textareas in diesem Modal
        const inputs = modal.querySelectorAll('input, select, textarea')
        
        inputs.forEach((input: any) => {
          // Skip checkboxes and radio buttons
          if (input.type === 'checkbox' || input.type === 'radio') {
            return
          }
          
          // Force white text and dark background
          input.style.setProperty('color', 'white', 'important')
          input.style.setProperty('background-color', '#374151', 'important')
          input.style.setProperty('border-color', '#6b7280', 'important')
        })
      })
    }

    // Observer für neue Modals
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node: any) => {
            if (node.nodeType === 1) { // Element node
              // Check if the added node or its children contain admin modals
              if (node.classList?.contains('admin-modal') || 
                  node.querySelector?.('.admin-modal') ||
                  (node.classList?.contains('fixed') && node.classList?.contains('inset-0'))) {
                setTimeout(forceAdminModalStyles, 10)
              }
            }
          })
        }
      })
    })

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // Initial run
    setTimeout(forceAdminModalStyles, 100)
    
    // Run on route changes
    if (window.addEventListener) {
      window.addEventListener('popstate', () => {
        setTimeout(forceAdminModalStyles, 100)
      })
    }

    // Cleanup on unmount
    const cleanup = () => {
      observer.disconnect()
    }

    return {
      provide: {
        adminModalFix: {
          forceStyles: forceAdminModalStyles,
          cleanup
        }
      }
    }
  }
})











