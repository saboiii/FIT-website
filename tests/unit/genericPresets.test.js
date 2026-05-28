import { describe, it, expect } from 'vitest'
import {
  mapGenericToPrintSettings,
  DEFAULT_PRINT_COLOURS,
} from '@/lib/quoting/genericPresets'
import { calculateInstantQuote } from '@/lib/quoting/quote'

const metrics = { volumeCm3: 100, dimensionsCm: { length: 5, width: 5, height: 5 }, confidence: 'high' }

describe('mapGenericToPrintSettings — quality', () => {
  it('Draft has a thicker layer than High', () => {
    const draft = mapGenericToPrintSettings({ quality: 'Draft', strength: 'Normal' })
    const high = mapGenericToPrintSettings({ quality: 'High', strength: 'Normal' })
    expect(draft.layerHeight).toBeGreaterThan(high.layerHeight)
  })
})

describe('mapGenericToPrintSettings — strength', () => {
  it('Strong has more walls and infill than Draft', () => {
    const strong = mapGenericToPrintSettings({ quality: 'Medium', strength: 'Strong' })
    const draft = mapGenericToPrintSettings({ quality: 'Medium', strength: 'Draft' })
    expect(strong.wallLoops).toBeGreaterThan(draft.wallLoops)
    expect(strong.sparseInfillDensity).toBeGreaterThan(draft.sparseInfillDensity)
  })
})

describe('mapGenericToPrintSettings — colour', () => {
  it('maps a plain colour to its hex and plastic material', () => {
    const r = mapGenericToPrintSettings({ colour: 'White' })
    expect(r.colourHex).toBe('#ffffff')
    expect(r.materialType).toBe('plastic')
  })

  it('maps a material-bearing colour to its material', () => {
    expect(mapGenericToPrintSettings({ colour: 'Wood Colour' }).materialType).toBe('wood')
    expect(mapGenericToPrintSettings({ colour: 'Transparent' }).materialType).toBe('transparent')
  })

  it('is case-insensitive and falls back for unknown colours', () => {
    expect(mapGenericToPrintSettings({ colour: 'wood colour' }).materialType).toBe('wood')
    const unknown = mapGenericToPrintSettings({ colour: 'Chartreuse' })
    expect(unknown.colourHex).toBeNull()
    expect(unknown.materialType).toBe('plastic')
  })

  it('ships the full client colour list', () => {
    expect(DEFAULT_PRINT_COLOURS.length).toBeGreaterThanOrEqual(31)
    DEFAULT_PRINT_COLOURS.forEach((c) => {
      expect(c.name).toBeTruthy()
      expect(c.hex).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })
})

describe('mapGenericToPrintSettings — fallbacks', () => {
  it('uses Medium/Normal defaults for unknown axes', () => {
    const r = mapGenericToPrintSettings({ quality: 'bogus', strength: 'bogus' })
    expect(r.layerHeight).toBe(0.2)
    expect(r.wallLoops).toBe(2)
    expect(r.sparseInfillDensity).toBe(20)
  })
})

describe('generic selection → instant quote', () => {
  const toSettings = (g) => {
    const m = mapGenericToPrintSettings(g)
    return {
      materialType: m.materialType,
      infillPercent: m.sparseInfillDensity,
      wallLoops: m.wallLoops,
      layerHeightMm: m.layerHeight,
    }
  }

  it('a stronger selection costs more than a draft selection', () => {
    const draft = calculateInstantQuote({
      metrics,
      settings: toSettings({ strength: 'Draft', quality: 'Draft', colour: 'White' }),
      pricingOverrides: { minimumPrice: 0 },
    })
    const strong = calculateInstantQuote({
      metrics,
      settings: toSettings({ strength: 'Strong', quality: 'High', colour: 'White' }),
      pricingOverrides: { minimumPrice: 0 },
    })
    expect(strong.total).toBeGreaterThan(draft.total)
  })

  it('a denser material colour costs at least as much as plain plastic', () => {
    const plastic = calculateInstantQuote({
      metrics,
      settings: toSettings({ strength: 'Normal', quality: 'Medium', colour: 'White' }),
      pricingOverrides: { minimumPrice: 0 },
    })
    const marble = calculateInstantQuote({
      metrics,
      settings: toSettings({ strength: 'Normal', quality: 'Medium', colour: 'Marble' }),
      pricingOverrides: { minimumPrice: 0 },
    })
    expect(marble.total).toBeGreaterThanOrEqual(plastic.total)
  })
})
