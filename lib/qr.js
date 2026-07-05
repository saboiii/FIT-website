// Minimal, dependency-free QR encoder for the printed job sheet (blueprint §6).
//
// Scope (deliberately small — this is not a general QR library):
// - byte mode only, error-correction level L, versions 1–5 (up to 106 bytes),
//   fixed mask pattern 0. All of these are valid, scannable choices per
//   ISO/IEC 18004; fixing the mask skips the penalty-score search.
// - `encodeQr(text)` returns a square matrix (array of rows of 0/1) or null
//   when the text doesn't fit — callers fall back to printing the URL as text.
//
// Pure function, no DOM/network — unit-tested in tests/unit/qr.test.js.

// Data/EC codeword counts for level L, versions 1–5 (single EC block each,
// so no block interleaving is needed).
const DATA_CODEWORDS = { 1: 19, 2: 34, 3: 55, 4: 80, 5: 108 }
const EC_CODEWORDS = { 1: 7, 2: 10, 3: 15, 4: 20, 5: 26 }
// Versions 2–5 carry exactly one alignment pattern, centred at (p, p).
const ALIGN_POS = { 2: 18, 3: 22, 4: 26, 5: 30 }

// GF(256) multiply, reducing by the QR polynomial 0x11d.
function gfMul(x, y) {
    let z = 0
    for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d)
        z ^= ((y >>> i) & 1) * x
    }
    return z
}

// Reed–Solomon remainder of `data` for a generator of the given degree.
function rsRemainder(data, degree) {
    const coefs = new Array(degree).fill(0)
    coefs[degree - 1] = 1
    let root = 1
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < degree; j++) {
            coefs[j] = gfMul(coefs[j], root)
            if (j + 1 < degree) coefs[j] ^= coefs[j + 1]
        }
        root = gfMul(root, 2)
    }
    const result = new Array(degree).fill(0)
    for (const b of data) {
        const factor = b ^ result.shift()
        result.push(0)
        for (let j = 0; j < degree; j++) result[j] ^= gfMul(coefs[j], factor)
    }
    return result
}

/**
 * Encode `text` as a QR symbol.
 * @param {string} text
 * @returns {number[][]|null} square 0/1 matrix (1 = dark), or null if too long
 */
export function encodeQr(text) {
    const bytes = Array.from(new TextEncoder().encode(String(text ?? '')))
    // Byte-mode overhead ≈ 2 codewords (4-bit mode + 8-bit count + terminator).
    const version = [1, 2, 3, 4, 5].find((v) => DATA_CODEWORDS[v] >= bytes.length + 2)
    if (!version || bytes.length === 0) return null
    const size = 17 + 4 * version

    // ---- Bit stream: mode 0100, 8-bit count, data, terminator, pad bytes.
    const bits = []
    const push = (val, len) => {
        for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
    }
    push(4, 4)
    push(bytes.length, 8)
    bytes.forEach((b) => push(b, 8))
    const capacity = DATA_CODEWORDS[version] * 8
    push(0, Math.min(4, capacity - bits.length))
    while (bits.length % 8 !== 0) bits.push(0)
    for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8)
    const dataCw = []
    for (let i = 0; i < bits.length; i += 8) {
        let b = 0
        for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]
        dataCw.push(b)
    }
    const codewords = dataCw.concat(rsRemainder(dataCw, EC_CODEWORDS[version]))

    // ---- Matrix with a parallel "function module" map.
    const M = Array.from({ length: size }, () => new Array(size).fill(0))
    const F = Array.from({ length: size }, () => new Array(size).fill(false))
    const set = (r, c, v) => {
        M[r][c] = v ? 1 : 0
        F[r][c] = true
    }

    // Timing patterns.
    for (let i = 0; i < size; i++) {
        set(6, i, i % 2 === 0)
        set(i, 6, i % 2 === 0)
    }
    // Finder patterns + separators (drawn over the timing rows).
    const finder = (r, c) => {
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                const y = r + dy
                const x = c + dx
                if (y < 0 || y >= size || x < 0 || x >= size) continue
                const d = Math.max(Math.abs(dx), Math.abs(dy))
                set(y, x, d !== 2 && d !== 4)
            }
        }
    }
    finder(3, 3)
    finder(3, size - 4)
    finder(size - 4, 3)
    // Alignment pattern (versions 2–5).
    if (ALIGN_POS[version]) {
        const p = ALIGN_POS[version]
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                set(p + dy, p + dx, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
            }
        }
    }

    // Format info: level L (01) + mask 0, BCH(15,5) coded, XOR 0x5412.
    const fdata = (1 << 3) | 0
    let rem = fdata
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const fbits = ((fdata << 10) | rem) ^ 0x5412
    const fbit = (i) => ((fbits >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) set(8, i, fbit(i))
    set(8, 7, fbit(6))
    set(8, 8, fbit(7))
    set(7, 8, fbit(8))
    for (let i = 9; i <= 14; i++) set(14 - i, 8, fbit(i))
    for (let i = 0; i <= 7; i++) set(size - 1 - i, 8, fbit(i))
    for (let i = 8; i <= 14; i++) set(8, size - 15 + i, fbit(i))
    set(size - 8, 8, true) // dark module

    // ---- Zigzag data placement + mask 0 ((x + y) % 2 === 0 flips).
    let bi = 0
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5
        for (let vert = 0; vert < size; vert++) {
            for (let j = 0; j < 2; j++) {
                const x = right - j
                const upward = ((right + 1) & 2) === 0
                const y = upward ? size - 1 - vert : vert
                if (F[y][x]) continue
                let v = 0
                if (bi < codewords.length * 8) {
                    v = (codewords[bi >> 3] >>> (7 - (bi & 7))) & 1
                    bi++
                }
                if ((x + y) % 2 === 0) v ^= 1
                M[y][x] = v
            }
        }
    }
    return M
}

/**
 * SVG path data drawing every dark module as a 1×1 square — render inside
 * `<svg viewBox={"0 0 " + size + " " + size}><path d={...} /></svg>`.
 * @param {number[][]|null} matrix
 * @returns {string}
 */
export function qrSvgPath(matrix) {
    if (!matrix) return ''
    const parts = []
    matrix.forEach((row, y) =>
        row.forEach((v, x) => {
            if (v) parts.push(`M${x} ${y}h1v1h-1z`)
        }),
    )
    return parts.join('')
}
