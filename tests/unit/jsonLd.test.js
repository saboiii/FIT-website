import { describe, it, expect } from 'vitest'
import { jsonLdString } from '@/lib/jsonLd'

describe('jsonLdString', () => {
  it('escapes < so a stored string cannot terminate the script block', () => {
    const out = jsonLdString({ name: 'Cube</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).toContain('\\u003c/script>')
  })

  it('round-trips through JSON.parse unchanged', () => {
    const data = { name: 'A <b> & "c"', nested: { items: ['<', '>', 5] } }
    expect(JSON.parse(jsonLdString(data))).toEqual(data)
  })

  it('stringifies plain data like JSON.stringify', () => {
    expect(jsonLdString({ a: 1 })).toBe('{"a":1}')
  })
})
