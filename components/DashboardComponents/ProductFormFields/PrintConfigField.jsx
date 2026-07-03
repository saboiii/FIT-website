import React from 'react'

/**
 * Fixed print configuration for a print-delivery product (productType:"print").
 * The vendor sets advanced print settings here — these fix the quote and the
 * customer cannot change them. Colour is chosen separately via a colour-type
 * variant (Variant Types section). See openspec change
 * `migrate-print-delivery-to-custom-requests`.
 *
 * Styling mirrors the Stock Management block for consistency.
 */
const DEFAULT_CONFIG = {
  layerHeight: 0.2,
  materialType: 'plastic',
  wallLoops: 2,
  sparseInfillDensity: 20,
  nozzleDiameter: 0.4,
  enableSupport: false,
}

const NUMERIC = [
  ['layerHeight', 'Layer height (mm)', 0.05, 5, 0.01],
  ['wallLoops', 'Wall loops', 0, 20, 1],
  ['sparseInfillDensity', 'Infill density (%)', 0, 100, 1],
  ['nozzleDiameter', 'Nozzle (mm)', 0.1, 5, 0.1],
]

export default function PrintConfigField({ form, setForm }) {
  const config = { ...DEFAULT_CONFIG, ...(form.printConfig || {}) }

  const setConfig = (key, value) =>
    setForm((f) => ({ ...f, printConfig: { ...DEFAULT_CONFIG, ...(f.printConfig || {}), [key]: value } }))

  return (
    <div className="w-full space-y-3">
      <p className="text-xs text-extraLight">
        These settings are fixed for the customer and determine the quote. The customer chooses a
        colour via a Colour variant under Pricing.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {NUMERIC.map(([key, label, min, max, step]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-lightColor">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={config[key]}
              onChange={(e) => setConfig(key, e.target.value === '' ? '' : Number(e.target.value))}
              className="formInput text-sm w-full"
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="text-xs font-medium text-lightColor">Material</label>
          <select
            value={config.materialType}
            onChange={(e) => setConfig('materialType', e.target.value)}
            className="formInput text-sm w-full"
          >
            {['plastic', 'resin', 'metal', 'sandstone'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={!!config.enableSupport}
          onChange={(e) => setConfig('enableSupport', e.target.checked)}
          className="rounded"
        />
        Enable support
      </label>
    </div>
  )
}
