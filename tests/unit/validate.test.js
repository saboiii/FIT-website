import { describe, it, expect } from 'vitest'
import { sanitizeString, isValidUrl, checkMagicNumber } from '@/utils/validate'

describe('sanitizeString', () => {
  it('strips angle brackets and dollar signs', () => {
    expect(sanitizeString('a<b>$c')).toBe('abc')
  })

  it('coerces non-strings', () => {
    expect(sanitizeString(123)).toBe('123')
  })
})

describe('isValidUrl', () => {
  it('accepts a well-formed URL', () => {
    expect(isValidUrl('https://example.com/path')).toBe(true)
  })

  it('rejects a malformed URL', () => {
    expect(isValidUrl('not a url')).toBe(false)
  })
})

describe('checkMagicNumber', () => {
  it('allows text-based formats without inspection', () => {
    expect(checkMagicNumber(Buffer.from('anything'), 'obj')).toBe(true)
    expect(checkMagicNumber(Buffer.from('anything'), 'gltf')).toBe(true)
  })

  it('validates the GLB magic header', () => {
    expect(checkMagicNumber(Buffer.from('glTF....'), 'glb')).toBe(true)
    expect(checkMagicNumber(Buffer.from('NOPE....'), 'glb')).toBe(false)
  })

  it('validates the ZIP magic header', () => {
    expect(checkMagicNumber(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]), 'zip')).toBe(true)
    expect(checkMagicNumber(Buffer.from([0x00, 0x01, 0x02, 0x03]), 'zip')).toBe(false)
  })

  it('rejects unknown extensions', () => {
    expect(checkMagicNumber(Buffer.from('x'), 'exe')).toBe(false)
  })
})
