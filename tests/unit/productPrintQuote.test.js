import { describe, it, expect } from 'vitest'
import { computeQuoteFromModelBytes } from '@/lib/customPrint/productQuote'
import { printSettingsToQuoteSettings } from '@/lib/quoting/printSettingsToQuote'

const enc = (t) => new TextEncoder().encode(t)

// 20mm cube as an OBJ (mm) -> 8 cm³ solid.
function cubeObj(s) {
  const x = s / 2
  const corners = [
    [-x, -x, -x], [x, -x, -x], [x, x, -x], [-x, x, -x],
    [-x, -x, x], [x, -x, x], [x, x, x], [-x, x, x],
  ]
  const idx = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
  ]
  const lines = corners.map(([a, b, c]) => `v ${a} ${b} ${c}`)
  for (let i = 0; i < idx.length; i += 3) lines.push(`f ${idx[i] + 1} ${idx[i + 1] + 1} ${idx[i + 2] + 1}`)
  return lines.join('\n')
}

const printSettings = {
  layerHeight: 0.2, materialType: 'plastic', wallLoops: 2,
  sparseInfillDensity: 20, nozzleDiameter: 0.4, enableSupport: false,
}

describe('computeQuoteFromModelBytes (fixed product quote)', () => {
  it('computes a server-authoritative quote from model bytes + fixed settings', async () => {
    const quote = await computeQuoteFromModelBytes({
      bytes: enc(cubeObj(20)),
      fileName: 'benchy.obj',
      quoteSettings: printSettingsToQuoteSettings(printSettings),
    })
    expect(quote).toBeTruthy()
    expect(quote.total).toBeGreaterThan(0)
    expect(quote.inputs.volumeCm3).toBeCloseTo(8, 1)
    // print-time markers present (both heuristic + shape-aware)
    expect(quote.inputs.printHours).toBeGreaterThan(0)
    expect(quote.inputs.printHoursShapeAware).toBeGreaterThan(0)
  })

  it('returns null for an unparseable / unsupported model', async () => {
    expect(await computeQuoteFromModelBytes({
      bytes: enc('not a model'), fileName: 'x.fbx',
      quoteSettings: printSettingsToQuoteSettings(printSettings),
    })).toBeNull()
  })
})
