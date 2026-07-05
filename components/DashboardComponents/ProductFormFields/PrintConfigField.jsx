import React from 'react'
import { DottedRow } from '@/components/dashboard-ui'
import { inputCls } from './dashFormUi'

/**
 * Fixed print configuration for a print-delivery product (productType:"print").
 * The vendor sets advanced print settings here — these fix the quote and the
 * customer cannot change them. Colour is chosen separately via a colour-type
 * variant (Variant Types section). See openspec change
 * `migrate-print-delivery-to-custom-requests`.
 *
 * Rendered as dotted-leader spec rows (blueprint §5.5 wireframe):
 * `Layer height ……………… [0.2] mm`.
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
  ['layerHeight', 'Layer height', 'mm', 0.05, 5, 0.01],
  ['wallLoops', 'Wall loops', '', 0, 20, 1],
  ['sparseInfillDensity', 'Infill density', '%', 0, 100, 1],
  ['nozzleDiameter', 'Nozzle', 'mm', 0.1, 5, 0.1],
]

const rowInputCls = `${inputCls()} w-24 text-right py-1`

export default function PrintConfigField({ form, setForm }) {
  const config = { ...DEFAULT_CONFIG, ...(form.printConfig || {}) }

  const setConfig = (key, value) =>
    setForm((f) => ({ ...f, printConfig: { ...DEFAULT_CONFIG, ...(f.printConfig || {}), [key]: value } }))

  return (
    <div className="w-full space-y-2">
      <p className="text-[13px] text-[var(--dash-ink-soft)]">
        These settings are fixed for the customer and determine the quote. The customer chooses a
        colour via a Colour variant under Variants.
      </p>

      <div className="flex flex-col">
        {NUMERIC.map(([key, label, unit, min, max, step]) => (
          <DottedRow key={key} label={label}>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              aria-label={label}
              value={config[key]}
              onChange={(e) => setConfig(key, e.target.value === '' ? '' : Number(e.target.value))}
              className={rowInputCls}
            />
            {unit && <span className="text-[var(--dash-ink-soft)]">{unit}</span>}
          </DottedRow>
        ))}

        <DottedRow label="Material">
          <select
            value={config.materialType}
            aria-label="Material"
            onChange={(e) => setConfig('materialType', e.target.value)}
            className={`${inputCls()} w-32 py-1 cursor-pointer`}
          >
            {['plastic', 'resin', 'metal', 'sandstone'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </DottedRow>
      </div>

      <label className="flex items-center gap-2 text-[13px] cursor-pointer">
        <input
          type="checkbox"
          checked={!!config.enableSupport}
          onChange={(e) => setConfig('enableSupport', e.target.checked)}
          className="rounded accent-[var(--dash-ink)]"
        />
        Enable support
      </label>
    </div>
  )
}
