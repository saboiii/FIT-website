'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/General/ToastProvider'

const NUMERIC_FIELDS = [
  { key: 'materialRatePerGram', label: 'Material rate (per gram)', step: '0.001' },
  { key: 'printTimeRatePerHour', label: 'Print time rate (per hour)', step: '0.5' },
  { key: 'baseFee', label: 'Base fee', step: '0.5' },
  { key: 'postProcessingFee', label: 'Post-processing fee', step: '0.5' },
  { key: 'specialRequestFee', label: 'Special request fee', step: '0.5' },
  { key: 'priorityFee', label: 'Priority fee', step: '0.5' },
  { key: 'expediteSurchargePercent', label: 'Expedite surcharge (%)', step: '1' },
  { key: 'expediteSurchargeFlat', label: 'Expedite surcharge (flat)', step: '1' },
  { key: 'minimumPrice', label: 'Minimum price', step: '0.5' },
]

const LIMIT_FIELDS = [
  { key: 'maxLengthCm', label: 'Max length (cm)' },
  { key: 'maxWidthCm', label: 'Max width (cm)' },
  { key: 'maxHeightCm', label: 'Max height (cm)' },
  { key: 'maxWeightKg', label: 'Max weight (kg)' },
]

// Guided questions for tuning the print-time estimate to the actual machines.
// Each answers one knob of the time model; defaults apply when left empty.
const TIME_MODEL_QUESTIONS = [
  {
    key: 'baseFlowCm3PerHour',
    question: 'How much material does a typical print use per hour?',
    help: 'Pick a recent 0.2mm-layer print: material used (cm³) ÷ hours it took. Mid-range FDM printers manage 8–15 cm³/h.',
    unit: 'cm³ / hour', step: '0.5',
  },
  {
    key: 'layerHeightRefMm',
    question: 'What layer height was that print sliced at?',
    help: 'The speed above is tied to this layer height; thinner layers are estimated proportionally slower.',
    unit: 'mm', step: '0.05',
  },
  {
    key: 'supportTimeFactor',
    question: 'How much longer do prints with supports take?',
    help: 'As a multiplier: 1.25 means 25% longer. Compare a supported vs unsupported print of similar size.',
    unit: '× multiplier', step: '0.05',
  },
  {
    key: 'wallTimeFactorPerLoop',
    question: 'How much does each extra wall loop add?',
    help: 'As a fraction per loop: 0.08 means each wall loop adds ~8% time.',
    unit: 'fraction / loop', step: '0.01',
  },
  {
    key: 'minHours',
    question: 'What is the minimum machine time you bill?',
    help: 'Tiny models never estimate below this (covers setup, heat-up, handling).',
    unit: 'hours', step: '0.05',
  },
]

export default function QuotingPricingManagement() {
  const { showToast } = useToast()
  const [config, setConfig] = useState(null)
  const [colours, setColours] = useState([])
  const [limits, setLimits] = useState({})
  const [timeModel, setTimeModel] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/quoting')
      const data = await res.json()
      if (res.ok) {
        setConfig(data.quotingConfig || {})
        setColours(data.printColours || [])
        setLimits(data.machineLimits || {})
        setTimeModel(data.quotingConfig?.timeModel || {})
      } else {
        showToast(data.error || 'Failed to load quoting config', 'error')
      }
    } catch {
      showToast('Failed to load quoting config', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (key, value) => setConfig((c) => ({ ...c, [key]: value }))

  const updateColour = (i, patch) =>
    setColours((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const addColour = () => setColours((cs) => [...cs, { name: 'New Colour', hex: '#cccccc', material: '' }])
  const removeColour = (i) => setColours((cs) => cs.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      const quotingConfig = {}
      for (const { key } of NUMERIC_FIELDS) {
        const n = Number(config?.[key])
        if (Number.isFinite(n)) quotingConfig[key] = n
      }
      if (config?.expediteMode) quotingConfig.expediteMode = config.expediteMode

      // Time model: empty answer = null (use the built-in default)
      const timeModelOut = {}
      for (const { key } of TIME_MODEL_QUESTIONS) {
        const raw = timeModel?.[key]
        if (raw === '' || raw == null) timeModelOut[key] = null
        else if (Number.isFinite(Number(raw))) timeModelOut[key] = Number(raw)
      }
      quotingConfig.timeModel = timeModelOut

      const printColours = colours.map((c) => ({
        name: String(c.name || '').trim(),
        hex: c.hex,
        material: c.material ? String(c.material).trim() : null,
      }))

      // Empty input = no limit (null clears a previously set value)
      const machineLimits = {}
      for (const { key } of LIMIT_FIELDS) {
        const raw = limits?.[key]
        if (raw === '' || raw == null) machineLimits[key] = null
        else if (Number.isFinite(Number(raw)) && Number(raw) > 0) machineLimits[key] = Number(raw)
      }

      const res = await fetch('/api/admin/quoting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotingConfig, printColours, machineLimits }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Quoting config saved!', 'success')
        load()
      } else {
        showToast(data.error || 'Failed to save', 'error')
      }
    } catch {
      showToast('Failed to save quoting config', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-textColor border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-12">
      <div>
        <h2 className="text-lg font-semibold text-textColor mb-1">Quoting / Pricing</h2>
        <p className="text-xs text-lightColor">
          Rates and fees used by the Instant Quoting Engine, plus the colour/material
          catalogue offered for generic configuration. Money is in your store currency.
        </p>
      </div>

      {/* Pricing config */}
      <div className="border border-borderColor rounded-lg overflow-hidden">
        <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
          <h3 className="text-sm font-medium text-textColor">Rates & fees</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {NUMERIC_FIELDS.map(({ key, label, step }) => (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={key} className="text-xs font-medium text-lightColor">{label}</label>
              <input
                id={key}
                type="number"
                step={step}
                min="0"
                value={config?.[key] ?? ''}
                onChange={(e) => setField(key, e.target.value)}
                className="formInput text-sm"
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label htmlFor="expediteMode" className="text-xs font-medium text-lightColor">Expedite mode</label>
            <select
              id="expediteMode"
              value={config?.expediteMode ?? 'greater'}
              onChange={(e) => setField('expediteMode', e.target.value)}
              className="formInput text-sm"
            >
              <option value="greater">Greater of percent / flat</option>
              <option value="percent">Percent only</option>
              <option value="flat">Flat only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Print-time setup (guided) */}
      <div className="border border-borderColor rounded-lg overflow-hidden">
        <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
          <h3 className="text-sm font-medium text-textColor">Print time estimation — set up for your machines</h3>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <p className="text-xs text-lightColor">
            Answer these to tune estimated print times (and therefore the time cost in every
            quote) to your actual printers. Leave a field empty to keep the built-in default.
          </p>
          {TIME_MODEL_QUESTIONS.map(({ key, question, help, unit, step }) => (
            <div key={key} className="flex flex-col gap-1">
              <label htmlFor={`tm-${key}`} className="text-xs font-medium text-textColor">{question}</label>
              <p className="text-[11px] text-lightColor">{help}</p>
              <div className="flex items-center gap-2">
                <input
                  id={`tm-${key}`}
                  type="number"
                  step={step}
                  min="0"
                  placeholder="Default"
                  value={timeModel?.[key] ?? ''}
                  onChange={(e) => setTimeModel((t) => ({ ...t, [key]: e.target.value }))}
                  className="formInput text-sm w-40"
                />
                <span className="text-xs text-lightColor">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Machine limits */}
      <div className="border border-borderColor rounded-lg overflow-hidden">
        <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
          <h3 className="text-sm font-medium text-textColor">Machine limits</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-lightColor mb-3">
            Your printers&apos; maximum build size and weight. Models larger than this are
            rejected at quote time with a clear message. Leave a field empty for no limit.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {LIMIT_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={key} className="text-xs font-medium text-lightColor">{label}</label>
                <input
                  id={key}
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="No limit"
                  value={limits?.[key] ?? ''}
                  onChange={(e) => setLimits((l) => ({ ...l, [key]: e.target.value }))}
                  className="formInput text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Colour catalogue */}
      <div className="border border-borderColor rounded-lg overflow-hidden">
        <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor flex items-center justify-between">
          <h3 className="text-sm font-medium text-textColor">Colour / material catalogue</h3>
          <button onClick={addColour} className="text-xs px-2 py-1 border border-borderColor rounded hover:bg-borderColor/20">
            + Add colour
          </button>
        </div>
        <div className="p-4 flex flex-col gap-2">
          {colours.length === 0 && <p className="text-xs text-lightColor">No colours configured.</p>}
          {colours.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : '#cccccc'}
                onChange={(e) => updateColour(i, { hex: e.target.value })}
                className="h-8 w-10 rounded border border-borderColor cursor-pointer"
                title="Colour"
              />
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateColour(i, { name: e.target.value })}
                placeholder="Name"
                className="formInput text-sm flex-1"
              />
              <input
                type="text"
                value={c.material || ''}
                onChange={(e) => updateColour(i, { material: e.target.value })}
                placeholder="Material (optional, e.g. wood)"
                className="formInput text-sm flex-1"
              />
              <button onClick={() => removeColour(i)} className="text-xs text-red-500 hover:text-red-700 px-2">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-3 bg-textColor text-background rounded-md text-sm font-medium hover:bg-textColor/90 transition-all disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Quoting Config'}
      </button>
    </div>
  )
}
