/**
 * Minimal, dependency-free Wavefront OBJ parser → flat positions array.
 * Used for server-side geometry verification (recompute volume from the stored
 * model rather than trusting client-sent metrics). Supports `v` vertices and
 * `f` faces with v / v\/vt / v\/vt\/vn / v\/\/vn syntax, negative (relative)
 * indices, and fan-triangulation of polygons. Ignores everything else
 * (normals, UVs, materials, groups) — only geometry matters for pricing.
 */

function toText(buffer) {
  if (typeof buffer === 'string') return buffer
  return new TextDecoder().decode(buffer)
}

/**
 * Parse an OBJ into a flat [x,y,z,...] positions array (de-indexed triangles).
 * @returns {number[]|null} null if no usable faces were found
 */
export function parseObjToPositions(buffer) {
  const text = toText(buffer)
  const vertices = []
  const positions = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line.startsWith('v ') || line.startsWith('v\t')) {
      const parts = line.split(/\s+/)
      const x = parseFloat(parts[1])
      const y = parseFloat(parts[2])
      const z = parseFloat(parts[3])
      if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
        vertices.push([x, y, z])
      }
    } else if (line.startsWith('f ') || line.startsWith('f\t')) {
      const refs = line.split(/\s+/).slice(1)
      const corner = []
      for (const ref of refs) {
        // face refs are "v", "v/vt", "v//vn" or "v/vt/vn"; only v matters
        const idx = parseInt(ref.split('/')[0], 10)
        if (!Number.isFinite(idx) || idx === 0) continue
        const resolved = idx > 0 ? idx - 1 : vertices.length + idx
        const v = vertices[resolved]
        if (v) corner.push(v)
      }
      // fan-triangulate the polygon (valid for the convex faces OBJ exporters emit)
      for (let i = 1; i + 1 < corner.length; i++) {
        positions.push(...corner[0], ...corner[i], ...corner[i + 1])
      }
    }
  }

  return positions.length >= 9 ? positions : null
}
