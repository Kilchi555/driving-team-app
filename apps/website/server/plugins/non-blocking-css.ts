// Convert render-blocking entry.css to non-blocking via preload + noscript fallback.
// The browser downloads the CSS asynchronously and applies it after parse,
// eliminating the render-blocking penalty on LCP.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    // Match the entry.css <link rel="stylesheet"> tag
    const cssLinkRegex = /(<link[^>]+rel="stylesheet"[^>]+href="([^"]*\/_nuxt\/entry\.[^"]+\.css)"[^>]*>)/g

    html.head = html.head.map((chunk) => {
      return chunk.replace(cssLinkRegex, (_match, _fullTag, href) => {
        // Replace blocking stylesheet with preload + noscript fallback
        return [
          // 1. Preload: high-priority download, non-blocking
          `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">`,
          // 2. noscript fallback for browsers without JS
          `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
        ].join('')
      })
    })
  })
})
