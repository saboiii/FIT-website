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

export default function QuotingPricingManagement() {
  const { showToast } = useToast()
  const [config, setConfig] = useState(null)
  const [colours, setColours] = useState([])
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

      const printColours = colours.map((c) => ({
        name: String(c.name || '').trim(),
        hex: c.hex,
        material: c.material ? String(c.material).trim() : null,
      }))

      const res = await fetch('/api/admin/quoting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotingConfig, printColours }),
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
