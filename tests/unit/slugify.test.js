import { describe, it, expect } from 'vitest'
import { slugify } from '@/app/api/product/slugify'

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Product Name 123')).toBe('product-name-123')
  })

  it('collapses repeated spaces into a single hyphen', () => {
    expect(slugify('Foo   Bar')).toBe('foo-bar')
  })

  it('strips punctuation', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--Lead--')).toBe('lead')
  })
})
