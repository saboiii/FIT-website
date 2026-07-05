import { describe, it, expect } from 'vitest'
import { sanitizeKeyPart } from '@/lib/uploadKey'

describe('sanitizeKeyPart', () => {
  it('keeps ordinary filenames (and their extension) intact', () => {
    expect(sanitizeKeyPart('bracket_v2.stl')).toBe('bracket_v2.stl')
    expect(sanitizeKeyPart('My Part (final).3mf')).toBe('My Part (final).3mf')
  })

  it('strips path segments', () => {
    expect(sanitizeKeyPart('../../etc/passwd')).toBe('passwd')
    expect(sanitizeKeyPart('a/b/c/model.stl')).toBe('model.stl')
    expect(sanitizeKeyPart('..\\..\\win\\model.obj')).toBe('model.obj')
  })

  it('removes control characters and collapses leading dots', () => {
    expect(sanitizeKeyPart('bad\u0007name.stl')).toBe('badname.stl')
    expect(sanitizeKeyPart('...hidden.glb')).toBe('hidden.glb')
  })

  it('caps length while preserving the extension', () => {
    const out = sanitizeKeyPart(`${'x'.repeat(500)}.gltf`)
    expect(out.length).toBeLessThanOrEqual(120)
    expect(out.endsWith('.gltf')).toBe(true)
  })

  it('falls back to a safe name for degenerate input', () => {
    expect(sanitizeKeyPart('')).toBe('file')
    expect(sanitizeKeyPart('///')).toBe('file')
    expect(sanitizeKeyPart(null)).toBe('file')
  })
})
