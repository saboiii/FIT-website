import { describe, it, expect } from 'vitest'
import { safeInternalPath } from '@/utils/safeReturnPath'

describe('safeInternalPath', () => {
  it('accepts same-origin relative paths', () => {
    expect(safeInternalPath('/cart')).toBe('/cart')
    expect(safeInternalPath('/account/orders/123')).toBe('/account/orders/123')
    expect(safeInternalPath('/prints?tab=open')).toBe('/prints?tab=open')
  })

  it('rejects absolute and protocol-relative URLs (open-redirect)', () => {
    expect(safeInternalPath('https://evil.com')).toBeNull()
    expect(safeInternalPath('//evil.com')).toBeNull()
    expect(safeInternalPath('/\\evil.com')).toBeNull()
    expect(safeInternalPath('javascript:alert(1)')).toBeNull()
  })

  it('rejects backslashes and control/whitespace smuggling', () => {
    expect(safeInternalPath('/cart\\@evil.com')).toBeNull()
    expect(safeInternalPath('/cart\nhttps://evil.com')).toBeNull()
    expect(safeInternalPath('/ cart')).toBeNull()
  })

  it('rejects empty / non-string', () => {
    expect(safeInternalPath('')).toBeNull()
    expect(safeInternalPath(null)).toBeNull()
    expect(safeInternalPath(undefined)).toBeNull()
    expect(safeInternalPath('cart')).toBeNull()
  })
})
