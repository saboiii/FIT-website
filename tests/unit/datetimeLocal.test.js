import { describe, it, expect } from 'vitest'
import { toDatetimeLocal } from '@/utils/datetimeLocal'

describe('toDatetimeLocal', () => {
    it('formats a date as local wall-clock time, not UTC', () => {
        // Local-time constructor → the formatted value must match regardless of
        // the environment's timezone (a UTC slice would only match in UTC).
        const d = new Date(2026, 6, 3, 14, 30)
        expect(toDatetimeLocal(d)).toBe('2026-07-03T14:30')
    })

    it('round-trips through datetime-local parsing without shifting', () => {
        const original = new Date(2026, 0, 15, 9, 5)
        // Browsers parse timezone-less datetime strings as local time — the
        // same way `new Date(input.value)` does on save.
        const reparsed = new Date(toDatetimeLocal(original))
        expect(reparsed.getTime()).toBe(original.getTime())
    })

    it('accepts ISO strings (the shape API responses provide)', () => {
        const iso = new Date(2026, 6, 3, 14, 30).toISOString()
        expect(toDatetimeLocal(iso)).toBe('2026-07-03T14:30')
    })

    it('returns an empty string for invalid input', () => {
        expect(toDatetimeLocal('not a date')).toBe('')
    })
})
