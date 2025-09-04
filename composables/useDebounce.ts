// Composable für Debounce-Funktionalität
export const useDebounce = (callback: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      callback(...args)
    }, delay)
  }
}
