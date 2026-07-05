'use client'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/General/ToastProvider'

const hoursLabel = (h) => {
    if (!(h > 0)) return '—'
    const whole = Math.floor(h)
    const mins = Math.round((h - whole) * 60)
    return whole > 0 ? `${whole}h ${mins}m` : `${mins}m`
}

// Split a decimal-hours value into the h/m inputs.
const toHM = (h) => ({ h: Math.floor(h || 0), m: Math.round(((h || 0) % 1) * 60) })

function ActualTimeEditor({ sample, onSave }) {
    const [{ h, m }, setHM] = useState(toHM(sample.actualHours))
    const dirty = useRef(false)
    const save = () => {
        if (!dirty.current) return
        dirty.current = false
        const hours = Number(h || 0) + Number(m || 0) / 60
        onSave(hours > 0 ? hours : null)
    }
    return (
        <span className="flex items-center gap-1 text-xs">
            <input
                type="number" min="0" max="999" placeholder="0"
                className="formInput text-xs w-14 text-right"
                value={h || ''}
                onChange={(e) => { dirty.current = true; setHM((v) => ({ ...v, h: e.target.value })) }}
                onBlur={save}
                aria-label="Actual print hours"
            />
            <span className="text-lightColor">h</span>
            <input
                type="number" min="0" max="59" placeholder="0"
                className="formInput text-xs w-14 text-right"
                value={m || ''}
                onChange={(e) => { dirty.current = true; setHM((v) => ({ ...v, m: e.target.value })) }}
                onBlur={save}
                aria-label="Actual print minutes"
            />
            <span className="text-lightColor">m</span>
        </span>
    )
}

/**
 * Print-time calibration: the admin uploads test models, prints them, enters
 * how long each really took, and applies the fitted machine constants with
 * one click. `compact` trims the intro for the onboarding wizard.
 */
export default function PrintTimeCalibration({ compact = false }) {
    const { showToast } = useToast()
    const [data, setData] = useState(null)
    const [busy, setBusy] = useState(false)
    const fileRef = useRef(null)
    const [settings, setSettings] = useState({ layerHeightMm: 0.2, infillPercent: 20, wallLoops: 2, enableSupport: false })

    const load = async () => {
        try {
            const res = await fetch('/api/admin/print-time-calibration')
            if (res.ok) setData(await res.json())
        } catch { /* surfaced by empty state */ }
    }
    useEffect(() => { load() }, [])

    const addSample = async (file) => {
        if (!file) return
        setBusy(true)
        try {
            const form = new FormData()
            form.append('file', file)
            Object.entries(settings).forEach(([k, v]) => form.append(k, String(v)))
            const res = await fetch('/api/admin/print-time-calibration', { method: 'POST', body: form })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Upload failed')
            setData(body)
            showToast('Test print added — now print it and enter the time it took', 'success')
        } catch (e) {
            showToast(e.message || 'Upload failed', 'error')
        } finally {
            setBusy(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const put = async (payload, successMsg) => {
        setBusy(true)
        try {
            const res = await fetch('/api/admin/print-time-calibration', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Update failed')
            setData(body)
            if (successMsg) showToast(successMsg, 'success')
        } catch (e) {
            showToast(e.message || 'Update failed', 'error')
        } finally {
            setBusy(false)
        }
    }

    if (!data) return <div className="loader" />

    const { samples, timedCount, fit, applied } = data

    return (
        <div className={`flex flex-col gap-5 ${compact ? '' : 'p-6 md:p-12'}`}>
            {!compact && (
                <div>
                    <h2 className="text-lg font-semibold text-textColor mb-1">Print timing</h2>
                    <p className="text-xs text-lightColor max-w-2xl">
                        Teach the quoting engine how fast your printers really are. You only
                        need to do this once (and again if you change machines).
                    </p>
                </div>
            )}

            {/* How it works */}
            <ol className="flex flex-col sm:flex-row gap-3 text-xs">
                {[
                    ['1 · Add', 'Upload a model you’re willing to test-print. We calculate our current time estimate.'],
                    ['2 · Print & time', 'Print it on your machine and note how long the printer says it took.'],
                    ['3 · Apply', 'Enter the real times below — after two differently-shaped prints, one click tunes the estimates to your machines.'],
                ].map(([title, body]) => (
                    <li key={title} className="flex-1 border border-borderColor rounded-md p-3 bg-baseColor">
                        <p className="font-medium text-textColor mb-1">{title}</p>
                        <p className="text-lightColor">{body}</p>
                    </li>
                ))}
            </ol>

            <p className="text-[11px] text-lightColor border border-borderColor rounded-md px-3 py-2">
                Tip: use two very different shapes — something <span className="text-textColor">flat and wide</span> and
                something <span className="text-textColor">tall and narrow</span>. That contrast is what lets us separate
                printing speed from per-layer overhead.
            </p>

            {/* Add a test print */}
            <div className="border border-borderColor rounded-md p-4 flex flex-col gap-3">
                <p className="text-xs font-medium text-textColor">Add a test print</p>
                <div className="flex flex-wrap items-end gap-3 text-xs">
                    <label className="flex flex-col gap-1">
                        <span className="text-lightColor">Layer height (mm)</span>
                        <input type="number" step="0.05" min="0.05" max="5" className="formInput text-xs w-24"
                            value={settings.layerHeightMm}
                            onChange={(e) => setSettings((s) => ({ ...s, layerHeightMm: Number(e.target.value) }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-lightColor">Infill %</span>
                        <input type="number" min="0" max="100" className="formInput text-xs w-20"
                            value={settings.infillPercent}
                            onChange={(e) => setSettings((s) => ({ ...s, infillPercent: Number(e.target.value) }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-lightColor">Walls</span>
                        <input type="number" min="0" max="20" className="formInput text-xs w-16"
                            value={settings.wallLoops}
                            onChange={(e) => setSettings((s) => ({ ...s, wallLoops: Number(e.target.value) }))} />
                    </label>
                    <label className="flex items-center gap-2 pb-2">
                        <input type="checkbox" checked={settings.enableSupport}
                            onChange={(e) => setSettings((s) => ({ ...s, enableSupport: e.target.checked }))} />
                        <span className="text-lightColor">Supports</span>
                    </label>
                    <label className={`text-xs px-4 py-2 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                        {busy ? 'Working…' : 'Choose model file'}
                        <input
                            ref={fileRef} type="file" className="hidden"
                            accept=".stl,.obj,.glb,.gltf,.3mf"
                            onChange={(e) => addSample(e.target.files?.[0])}
                        />
                    </label>
                </div>
                <p className="text-[11px] text-lightColor">
                    Match these settings to what you&apos;ll actually print with. STL, OBJ, GLB or 3MF —
                    the file is measured and discarded, not stored.
                </p>
            </div>

            {/* Samples */}
            <div className="border border-borderColor rounded-md overflow-hidden">
                <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
                    <p className="text-xs font-medium text-textColor">Your test prints ({samples.length})</p>
                </div>
                <div className="divide-y divide-borderColor">
                    {samples.length === 0 && (
                        <p className="text-xs text-lightColor p-4">No test prints yet — add one above.</p>
                    )}
                    {samples.map((s) => (
                        <div key={s.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-textColor truncate">{s.label}</p>
                                <p className="text-[11px] text-lightColor">
                                    We estimate {hoursLabel(s.estimatedHours)}
                                    {' · '}{s.settings?.layerHeightMm}mm / {s.settings?.infillPercent}% infill
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[11px] text-lightColor">Actually took:</span>
                                <ActualTimeEditor
                                    sample={s}
                                    onSave={(hours) => put({ action: 'update', id: s.id, actualHours: hours })}
                                />
                                <button
                                    onClick={() => put({ action: 'delete', id: s.id })}
                                    className="text-[11px] text-red-500 cursor-pointer" title="Remove"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fit + apply */}
            {applied && (
                <p className="text-xs text-green-700 border border-green-200 bg-green-50 rounded-md px-3 py-2">
                    ✓ Calibration applied{applied.fittedAt ? ` on ${new Date(applied.fittedAt).toLocaleDateString()}` : ''} —
                    estimates are tuned to your machines. Add more timed prints any time to refine it.
                </p>
            )}
            {fit ? (
                <div className="border border-borderColor rounded-md p-4 flex flex-col gap-2">
                    <p className="text-xs text-textColor">
                        Based on your {fit.samplesUsed} timed print{fit.samplesUsed === 1 ? '' : 's'}, estimates are
                        currently off by <span className="font-semibold">{Math.round(fit.currentMeanAbsPctError)}%</span> on
                        average — after calibration that drops to{' '}
                        <span className="font-semibold">{Math.round(fit.fittedMeanAbsPctError)}%</span>.
                    </p>
                    <button
                        onClick={() => put({ action: 'apply' }, 'Calibration applied — estimates now use your machine speeds')}
                        disabled={busy}
                        className="text-xs px-4 py-2 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer disabled:opacity-50 self-start"
                    >
                        Apply calibration
                    </button>
                </div>
            ) : (
                timedCount > 0 && (
                    <p className="text-[11px] text-lightColor">
                        {timedCount === 1
                            ? 'One timed print recorded — add a second, differently-shaped one to enable calibration.'
                            : 'These prints are too similar in shape to calibrate from — add one flat/wide and one tall/narrow print.'}
                    </p>
                )
            )}
        </div>
    )
}
