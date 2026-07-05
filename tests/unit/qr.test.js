// lib/qr.js — shape-level checks on the hand-rolled QR encoder (byte mode,
// level L, mask 0). Full decode correctness was verified against the spec's
// BCH/Reed–Solomon math; these tests pin size, structure and capacity.
import { describe, it, expect } from 'vitest'
import { encodeQr, qrSvgPath } from '@/lib/qr'

// A finder pattern's outer 7×7 ring is dark; the ring inside it is light.
function checkFinder(m, top, left) {
    for (let i = 0; i < 7; i++) {
        expect(m[top][left + i]).toBe(1) // top edge
        expect(m[top + 6][left + i]).toBe(1) // bottom edge
        expect(m[top + i][left]).toBe(1) // left edge
        expect(m[top + i][left + 6]).toBe(1) // right edge
    }
    for (let i = 1; i < 6; i++) {
        expect(m[top + 1][left + i]).toBe(0) // light ring, all four sides
        expect(m[top + 5][left + i]).toBe(0)
        expect(m[top + i][left + 1]).toBe(0)
        expect(m[top + i][left + 5]).toBe(0)
    }
    expect(m[top + 3][left + 3]).toBe(1) // dark centre
}

describe('encodeQr', () => {
    it('produces a version-1 21×21 matrix of 0/1 for short text', () => {
        const m = encodeQr('hi')
        expect(m).not.toBeNull()
        expect(m).toHaveLength(21)
        m.forEach((row) => {
            expect(row).toHaveLength(21)
            row.forEach((v) => expect([0, 1]).toContain(v))
        })
    })

    it('places the three finder patterns in the corners', () => {
        const m = encodeQr('https://example.com/x')
        const size = m.length
        checkFinder(m, 0, 0) // top-left
        checkFinder(m, 0, size - 7) // top-right
        checkFinder(m, size - 7, 0) // bottom-left
        // Timing pattern alternates between the finders.
        for (let i = 8; i < size - 8; i++) {
            expect(m[6][i]).toBe(i % 2 === 0 ? 1 : 0)
            expect(m[i][6]).toBe(i % 2 === 0 ? 1 : 0)
        }
    })

    it('scales the version with content length and rejects what cannot fit', () => {
        expect(encodeQr('a'.repeat(17)).length).toBe(21) // v1 max
        expect(encodeQr('a'.repeat(18)).length).toBe(25) // v2
        const url = `https://fixitoday.com/admin/job-sheet/${'1b2c3d4e-5f60-7a8b-9c0d-e1f223344556'}`
        expect(encodeQr(url).length).toBe(33) // 74 bytes → v4
        expect(encodeQr('a'.repeat(106)).length).toBe(37) // v5 max
        expect(encodeQr('a'.repeat(107))).toBeNull() // beyond v5 → text fallback
        expect(encodeQr('')).toBeNull()
    })

    it('qrSvgPath draws one square per dark module and tolerates null', () => {
        const m = encodeQr('hi')
        const dark = m.flat().filter(Boolean).length
        const path = qrSvgPath(m)
        expect(path.match(/M\d+ \d+h1v1h-1z/g)).toHaveLength(dark)
        expect(qrSvgPath(null)).toBe('')
    })
})
