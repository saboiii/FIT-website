/**
 * Minimal, dependency-free STL parser (binary + ASCII) → flat positions array.
 * Used for server-side geometry verification (recompute volume from the stored
 * model rather than trusting client-sent metrics). STL is the dominant 3D-print
 * format; other formats are handled elsewhere / deferred.
 */

function toUint8(buffer) {
  if (buffer instanceof Uint8Array) return buffer
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer)
  // Node Buffer is a Uint8Array subclass; anything else → best effort
  return new Uint8Array(buffer)
}

/** Binary STL = 80-byte header + uint32 triangle count + 50 bytes/triangle. */
export function isBinaryStl(buf) {
  if (buf.length < 84) return false
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const triangles = dv.getUint32(80, true)
  return 84 + triangles * 50 === buf.length
}

export function parseBinaryStl(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const triangles = dv.getUint32(80, true)
  const positions = new Float32Array(triangles * 9)
  let offset = 84
  let p = 0
  for (let i = 0; i < triangles; i++) {
    offset += 12 // skip the 3-float normal
    for (let v = 0; v < 9; v++) {
      positions[p++] = dv.getFloat32(offset, true)
      offset += 4
    }
    offset += 2 // attribute byte count
  }
  return positions
}

export function parseAsciiStl(text) {
  const positions = []
  const re = /vertex\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)/g
  let m
  while ((m = re.exec(text))) {
    positions.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]))
  }
  return positions
}

/**
 * Parse an STL (binary or ASCII) into a flat [x,y,z,...] positions array.
 * @returns {number[]|Float32Array|null} null if not recognisable as STL
 */
export function parseStlToPositions(buffer) {
  const buf = toUint8(buffer)
  if (buf.length < 9) return null
  if (isBinaryStl(buf)) return parseBinaryStl(buf)
  const text = new TextDecoder().decode(buf)
  if (/^\s*solid/i.test(text) && /vertex/i.test(text)) {
    const positions = parseAsciiStl(text)
    return positions.length >= 9 ? positions : null
  }
  return null
}
