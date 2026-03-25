export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const method = event.method
  const ua = getHeader(event, 'user-agent') || 'NONE'
  
  console.log(`[ANALYTICS-DEBUG] ${method} ${url.pathname}`)
  console.log(`[ANALYTICS-DEBUG] UA: ${ua.substring(0, 80)}`)
  console.log(`[ANALYTICS-DEBUG] VERCEL_ENV: ${process.env.VERCEL_ENV}`)
})
