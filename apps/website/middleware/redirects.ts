export default defineNuxtRouteMiddleware((to, from) => {
  // 301-Redirect mapping für alte URLs -> neue URLs
  const redirects: Record<string, string> = {
    '/categories/auto': '/auto-fahrschule/',
    '/categories/motorrad': '/motorrad-fahrschule/',
    '/categories/lastwagen': '/lastwagen-fahrschule/',
    '/categories/taxi': '/taxi-fahrschule/',
    '/pricing': '/fahrschule-preise/',
    '/about': '/team/',
    '/contact': '/kontakt/',
    // Keep in sync with vercel.json — leftover .vue must not serve conflicting canonicals
    '/fahrschule-pfaeffikon': '/fahrschule-pfaeffikon-sz/',
    '/fahrschule-pfaeffikon/': '/fahrschule-pfaeffikon-sz/',
  }

  const redirectUrl = redirects[to.path]
  if (redirectUrl) {
    navigateTo(redirectUrl, { redirectCode: 301 })
  }
})
