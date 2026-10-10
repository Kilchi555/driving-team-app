import { describe, expect, it } from 'vitest'
import { resolveProspectWebsiteLogo } from '../website-prospect-generate'

describe('resolveProspectWebsiteLogo', () => {
  it('fills a website logo on the first generation', () => {
    expect(resolveProspectWebsiteLogo({ created: true, existingLogo: null })).toEqual({
      logo: null,
      write: true,
    })
  })

  it('does not replace a website logo on a later generation', () => {
    expect(
      resolveProspectWebsiteLogo({
        created: false,
        existingLogo: 'https://cdn.example/website-logo.webp',
      }),
    ).toEqual({
      logo: 'https://cdn.example/website-logo.webp',
      write: false,
    })
  })

  it('may fill an empty website logo when generation is repeated', () => {
    expect(resolveProspectWebsiteLogo({ created: false, existingLogo: '  ' })).toEqual({
      logo: null,
      write: true,
    })
  })
})
