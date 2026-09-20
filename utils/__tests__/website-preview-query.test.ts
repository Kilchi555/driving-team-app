import { describe, expect, it } from 'vitest'
import {
  isWebsitePreviewQuery,
  websitePreviewFetchQuery,
  websitePreviewQueryValue,
  websitePreviewSearch,
} from '../website-preview-query'

describe('website preview query helpers', () => {
  it('passes through a real token and treats preview=1 as preview intent only', () => {
    expect(websitePreviewQueryValue('1')).toBe('1')
    expect(isWebsitePreviewQuery('1')).toBe(true)
    expect(websitePreviewFetchQuery('1')).toEqual({ preview: '1' })
    expect(websitePreviewSearch('abc_token')).toBe('?preview=abc_token')
    expect(websitePreviewFetchQuery('')).toBeUndefined()
    expect(isWebsitePreviewQuery(undefined)).toBe(false)
  })
})
