import { describe, it, expect } from 'vitest'
import { parseStlToPositions, isBinaryStl, parseAsciiStl } from '@/lib/quoting/stl'
import { recomputeMetricsFromModel } from '@/lib/quoting/serverGeometry'

// 12-triangle cube (indices into 8 corners), size `s` centred at origin.
function cubeTriangles(s) {
  const x = s / 2
  const c = [
    [-x, -x, -x], [x, -x, -x], [x, x, -x], [-x, x, -x],
    [-x, -x, x], [x, -x, x], [x, x, x], [-x, x, x],
  ]
  const idx = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
  ]
  const tris = []
  for (let i = 0; i < idx.length; i += 3) tris.push([c[idx[i]], c[idx[i + 1]], c[idx[i + 2]]])
  return tris
}

function buildBinaryStl(tris) {
  const buf = new ArrayBuffer(84 + tris.length * 50)
  const dv = new DataView(buf)
  dv.setUint32(80, tris.length, true)
  let o = 84
  for (const t of tris) {
    o += 12 // normal (left 0)
    for (const v of t) {
      dv.setFloat32(o, v[0], true); o += 4
      dv.setFloat32(o, v[1], true); o += 4
      dv.setFloat32(o, v[2], true); o += 4
    }
    o += 2 // attribute byte count
  }
  return buf
}

describe('STL parser', () => {
  it('detects and parses a binary STL', () => {
    const buf = buildBinaryStl(cubeTriangles(10))
    expect(isBinaryStl(new Uint8Array(buf))).toBe(true)
    const positions = parseStlToPositions(buf)
    expect(positions.length).toBe(12 * 9) // 12 tris × 3 verts × xyz
  })

  it('parses ASCII STL vertices', () => {
    const ascii = `solid x
 facet normal 0 0 0
  outer loop
   vertex 0 0 0
   vertex 1 0 0
   vertex 0 1 0
  endloop
 endfacet
endsolid x`
    expect(parseAsciiStl(ascii)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0])
  })

  it('returns null for non-STL data', () => {
    expect(parseStlToPositions(new Uint8Array([1, 2, 3, 4, 5]))).toBeNull()
  })
})

describe('recomputeMetricsFromModel', () => {
  it('recomputes volume from a binary STL cube (10mm → 1 cm³)', async () => {
    const buf = buildBinaryStl(cubeTriangles(10))
    const m = await recomputeMetricsFromModel(buf, 'cube.stl')
    expect(m.volumeCm3).toBeCloseTo(1, 2)
    expect(m.watertight).toBe(true)
  })

  it('returns null for unsupported formats (caller falls back to client metrics)', async () => {
    const buf = buildBinaryStl(cubeTriangles(10))
    expect(await recomputeMetricsFromModel(buf, 'model.fbx')).toBeNull()
    expect(await recomputeMetricsFromModel(buf, 'model.blend')).toBeNull()
  })
})
