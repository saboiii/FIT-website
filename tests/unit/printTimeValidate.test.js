import { describe, it, expect } from 'vitest'
import {
  estimatePrintHoursLayerStack,
  layerStackComponents,
  hoursFromLayerStackComponents,
  resolveLayerStackModel,
  DEFAULT_LAYER_STACK_MODEL,
} from '@/lib/quoting/printTime/layerStack'
import { comparePrintTimes, fitLayerStackConstants } from '@/lib/quoting/printTime/validate'

// Same triangle-soup box builder as layerStack.test.js.
function boxPositions(sx, sy, sz) {
  const [x, y, z] = [sx / 2, sy / 2, sz / 2]
  const v = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ]
  const quads = [
    [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
    [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5],
  ]
  const out = []
  for (const [a, b, c, d] of quads) {
    out.push(...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[d])
  }
  return out
}

describe('layerStackComponents', () => {
  it('composes back to exactly the estimator hours', () => {
    const input = { positions: boxPositions(20, 20, 20), settings: { infillPercent: 20 } }
    const components = layerStackComponents(input)
    expect(components.extrudedMm3).toBeGreaterThan(0)
    expect(components.totalLayers).toBe(100) // 20mm / 0.2mm
    expect(hoursFromLayerStackComponents(components)).toBe(estimatePrintHoursLayerStack(input))
  })

  it('returns null for empty geometry', () => {
    expect(layerStackComponents({ positions: [] })).toBeNull()
  })
})

describe('fitLayerStackConstants', () => {
  const TRUE = { flowMm3PerS: 8, perLayerOverheadS: 4 }
  const syntheticSample = (sx, sy, sz, settings = {}) => {
    const c = layerStackComponents({ positions: boxPositions(sx, sy, sz), settings })
    const secs =
      (c.extrudedMm3 / TRUE.flowMm3PerS + c.totalLayers * TRUE.perLayerOverheadS) *
      (c.supportOn ? DEFAULT_LAYER_STACK_MODEL.supportTimeFactor : 1)
    return { ...c, actualHours: secs / 3600 }
  }

  it('recovers known constants from shape-diverse samples', () => {
    // Slab + tower + cube: distinct extruded-to-layers ratios.
    const samples = [
      syntheticSample(40, 40, 5),
      syntheticSample(10, 10, 80),
      syntheticSample(20, 20, 20),
    ]
    const fit = fitLayerStackConstants(samples)
    expect(fit.samplesUsed).toBe(3)
    expect(fit.flowMm3PerS).toBeCloseTo(TRUE.flowMm3PerS, 6)
    expect(fit.perLayerOverheadS).toBeCloseTo(TRUE.perLayerOverheadS, 6)
  })

  it('normalises support-enabled samples by the support factor', () => {
    const samples = [
      syntheticSample(40, 40, 5, { enableSupport: true }),
      syntheticSample(10, 10, 80),
    ]
    const fit = fitLayerStackConstants(samples)
    expect(fit.flowMm3PerS).toBeCloseTo(TRUE.flowMm3PerS, 6)
    expect(fit.perLayerOverheadS).toBeCloseTo(TRUE.perLayerOverheadS, 6)
  })

  it('returns null for under-determined data', () => {
    expect(fitLayerStackConstants([syntheticSample(20, 20, 20)])).toBeNull()
    // Same shape twice — proportional components, constants inseparable.
    const twin = [syntheticSample(20, 20, 20), syntheticSample(20, 20, 20)]
    expect(fitLayerStackConstants(twin)).toBeNull()
  })
})

describe('resolveLayerStackModel', () => {
  it('merges admin-fitted constants over the defaults', () => {
    const m = resolveLayerStackModel({ flowMm3PerS: 7.5, perLayerOverheadS: 2.1 })
    expect(m.flowMm3PerS).toBe(7.5)
    expect(m.perLayerOverheadS).toBe(2.1)
    expect(m.supportTimeFactor).toBe(DEFAULT_LAYER_STACK_MODEL.supportTimeFactor)
  })

  it('falls back per-field for null/absent/invalid values', () => {
    expect(resolveLayerStackModel(null)).toEqual(DEFAULT_LAYER_STACK_MODEL)
    expect(resolveLayerStackModel({ flowMm3PerS: null, perLayerOverheadS: null })).toEqual(
      DEFAULT_LAYER_STACK_MODEL,
    )
    const m = resolveLayerStackModel({ flowMm3PerS: -3, perLayerOverheadS: 2 })
    expect(m.flowMm3PerS).toBe(DEFAULT_LAYER_STACK_MODEL.flowMm3PerS)
    expect(m.perLayerOverheadS).toBe(2)
  })
})

describe('comparePrintTimes', () => {
  it('computes per-sample errors and per-estimator summaries', () => {
    const { rows, summary } = comparePrintTimes([
      { label: 'a', actualHours: 2, estimates: { heuristic: 3, layerStack: 2.2 } },
      { label: 'b', actualHours: 4, estimates: { heuristic: 3, layerStack: 4.4 } },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0].errors.heuristic).toBeCloseTo(50)
    expect(rows[1].errors.heuristic).toBeCloseTo(-25)
    expect(summary.heuristic.meanAbsPctError).toBeCloseTo(37.5)
    expect(summary.heuristic.meanPctBias).toBeCloseTo(12.5)
    expect(summary.layerStack.meanAbsPctError).toBeCloseTo(10)
  })

  it('skips samples without a positive actual time', () => {
    const { rows } = comparePrintTimes([{ label: 'x', actualHours: 0, estimates: { h: 1 } }])
    expect(rows).toHaveLength(0)
  })
})
