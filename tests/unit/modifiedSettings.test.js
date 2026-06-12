import { describe, it, expect } from 'vitest'
import { modifiedSettings, humanizeSettingKey } from '@/lib/editor/modifiedSettings'

const DEFAULTS = { layerHeight: 0.2, wallLoops: 2, enableSupport: false, supportType: 'Normal' }

describe('modifiedSettings', () => {
  it('lists only fields that differ from defaults, with reset metadata', () => {
    const current = { layerHeight: 0.3, wallLoops: 2, enableSupport: true, supportType: 'Normal' }
    const out = modifiedSettings(current, DEFAULTS, 'printability')
    expect(out.map((m) => m.key)).toEqual(['layerHeight', 'enableSupport'])
    expect(out[0]).toEqual({
      key: 'layerHeight',
      label: 'Layer height',
      value: 0.3,
      defaultValue: 0.2,
      path: 'printability.layerHeight',
    })
  })

  it('returns [] when nothing changed or inputs are missing', () => {
    expect(modifiedSettings({ ...DEFAULTS }, DEFAULTS)).toEqual([])
    expect(modifiedSettings(null, DEFAULTS)).toEqual([])
    expect(modifiedSettings({}, null)).toEqual([])
  })

  it('ignores current keys absent from defaults (mesh colours handled separately)', () => {
    const out = modifiedSettings({ randomExtra: 1, wallLoops: 3 }, DEFAULTS)
    expect(out.map((m) => m.key)).toEqual(['wallLoops'])
  })
})

describe('humanizeSettingKey', () => {
  it('splits camelCase into a capitalised phrase', () => {
    expect(humanizeSettingKey('sparseInfillDensity')).toBe('Sparse infill density')
    expect(humanizeSettingKey('layerHeight')).toBe('Layer height')
    expect(humanizeSettingKey('nozzleDiameter')).toBe('Nozzle diameter')
  })
})
