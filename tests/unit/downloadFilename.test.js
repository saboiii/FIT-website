import { describe, it, expect } from 'vitest'
import { resolveDownloadFilename, sanitizeFilename, hasExtension } from '@/lib/download/filename'

describe('resolveDownloadFilename', () => {
  it('uses the original filename when it has an extension', () => {
    expect(resolveDownloadFilename({ requested: 'bracket.stl', s3Key: 'custom-prints/uuid' }))
      .toBe('bracket.stl')
  })

  it('falls back to the S3 key basename when it has an extension', () => {
    expect(resolveDownloadFilename({ s3Key: 'custom-prints/abc123.stl' })).toBe('abc123.stl')
  })

  it('never yields an extension-less name (adds fallback)', () => {
    const name = resolveDownloadFilename({ s3Key: 'custom-prints/abc123' })
    expect(name).toBe('abc123.stl')
    expect(hasExtension(name)).toBe(true)
  })

  it('never yields "proxy" or empty', () => {
    const name = resolveDownloadFilename({})
    expect(name).toBe('model.stl')
    expect(name).not.toBe('proxy')
  })

  it('respects a non-default fallback extension', () => {
    expect(resolveDownloadFilename({ s3Key: 'x/y', fallbackExt: 'obj' })).toBe('y.obj')
  })
})

describe('sanitizeFilename', () => {
  it('strips header-injection and path characters', () => {
    const clean = sanitizeFilename('../../etc/passwd"\r\nSet-Cookie: x')
    expect(clean).not.toMatch(/[\r\n"\\/]/)
  })

  it('resolveDownloadFilename sanitises a malicious requested name', () => {
    const name = resolveDownloadFilename({ requested: 'a/b"\r\n.stl' })
    expect(name).not.toMatch(/[\r\n"\\/]/)
    expect(hasExtension(name)).toBe(true)
  })
})
