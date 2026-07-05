'use client'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import { DashCard, SegmentPill, EmptyState, SkeletonRow } from '@/components/dashboard-ui'
import { inputCls, quietBtnCls, InfoStrip } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import { IoTimerOutline } from 'react-icons/io5'

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
        <span className="flex items-center gap-1">
            <input
                type="number" min="0" max="999" placeholder="0"
                className={`${inputCls()} w-14 text-right dash-data`}
                value={h || ''}
                onChange={(e) => { dirty.current = true; setHM((v) => ({ ...v, h: e.target.value })) }}
                onBlur={save}
                aria-label="Actual print hours"
            />
            <span className="text-[13px] dash-soft">h</span>
            <input
                type="number" min="0" max="59" placeholder="0"
                className={`${inputCls()} w-14 text-right dash-data`}
                value={m || ''}
                onChange={(e) => { dirty.current = true; setHM((v) => ({ ...v, m: e.target.value })) }}
                onBlur={save}
                aria-label="Actual print minutes"
            />
            <span className="text-[13px] dash-soft">m</span>
        </span>
    )
}

// The 3-step explainer rendered as numbered document sections (§5.14).
const EXPLAINER_STEPS = [
    ['Add', 'Upload a model you’re willing to test-print. We calculate our current time estimate.'],
    ['Print & time', 'Print it on your machine and note how long the printer says it took.'],
    ['Apply', 'Enter the real times below — after two differently-shaped prints, one click tunes the estimates to your machines.'],
]

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

    if (!data) {
        return (
            <div className={`flex flex-col gap-3 ${compact ? '' : 'p-4 md:p-6'}`} aria-label="Loading calibration">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
            </div>
        )
    }

    const { samples, timedCount, fit, applied } = data

    return (
        <div className={`flex flex-col gap-4 ${compact ? '' : 'p-4 md:p-6'}`}>
            {!compact && (
                <div>
                    <h2 className="dash-title">Print timing</h2>
                    <p className="text-[13px] dash-soft mt-1 max-w-2xl">
                        Teach the quoting engine how fast your printers really are. You only
                        need to do this once (and again if you change machines).
                    </p>
                </div>
            )}

            {/* How it works — numbered document sections with ink number chips */}
            <ol className="flex flex-col gap-3">
                {EXPLAINER_STEPS.map(([title, body], i) => (
                    <li key={title} className="flex items-start gap-3">
                        <span
                            aria-hidden="true"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] text-[11px] font-semibold dash-data"
                        >
                            {i + 1}
                        </span>
                        <div className="min-w-0">
                            <p className="text-[13px] font-medium text-[var(--dash-ink)]">{title}</p>
                            <p className="text-[13px] dash-soft">{body}</p>
                        </div>
                    </li>
                ))}
            </ol>

            <InfoStrip>
                Tip: use two very different shapes — something <span className="text-[var(--dash-ink)]">flat and wide</span> and
                something <span className="text-[var(--dash-ink)]">tall and narrow</span>. That contrast is what lets us separate
                printing speed from per-layer overhead.
            </InfoStrip>

            {/* Add a test print */}
            <DashCard title="Add a test print">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="dash-label">Layer height (mm)</span>
                        <input type="number" step="0.05" min="0.05" max="5" className={`${inputCls()} w-24 text-right dash-data`}
                            value={settings.layerHeightMm}
                            onChange={(e) => setSettings((s) => ({ ...s, layerHeightMm: Number(e.target.value) }))} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="dash-label">Infill %</span>
                        <input type="number" min="0" max="100" className={`${inputCls()} w-20 text-right dash-data`}
                            value={settings.infillPercent}
                            onChange={(e) => setSettings((s) => ({ ...s, infillPercent: Number(e.target.value) }))} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="dash-label">Walls</span>
                        <input type="number" min="0" max="20" className={`${inputCls()} w-16 text-right dash-data`}
                            value={settings.wallLoops}
                            onChange={(e) => setSettings((s) => ({ ...s, wallLoops: Number(e.target.value) }))} />
                    </label>
                    <label className="flex items-center gap-2 pb-2 text-[13px] dash-soft cursor-pointer">
                        <input type="checkbox" checked={settings.enableSupport} className="accent-[var(--dash-ink)]"
                            onChange={(e) => setSettings((s) => ({ ...s, enableSupport: e.target.checked }))} />
                        Supports
                    </label>
                    <label className={`${quietBtnCls} ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                        {busy ? 'Working…' : 'Choose model file'}
                        <input
                            ref={fileRef} type="file" className="hidden"
                            accept=".stl,.obj,.glb,.gltf,.3mf"
                            onChange={(e) => addSample(e.target.files?.[0])}
                        />
                    </label>
                </div>
                <p className="text-[13px] dash-soft mt-3">
                    Match these settings to what you&apos;ll actually print with. STL, OBJ, GLB or 3MF —
                    the file is measured and discarded, not stored.
                </p>
            </DashCard>

            {/* Samples as job-card rows */}
            <DashCard title={`Your test prints (${samples.length})`}>
                {samples.length === 0 ? (
                    <EmptyState
                        icon={<IoTimerOutline />}
                        title="No Test Prints Yet"
                        body="Add a model above — we estimate it, you print it, then enter the real time here."
                        className="py-6"
                    />
                ) : (
                    <div className="flex flex-col">
                        {samples.map((s) => (
                            <div
                                key={s.id}
                                className="flex flex-col gap-2 py-3 border-b border-[var(--dash-line)] last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-center"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-[var(--dash-ink)] truncate">{s.label}</p>
                                    <p className="text-[13px] dash-soft dash-data">
                                        We estimate {hoursLabel(s.estimatedHours)}
                                        {' · '}{s.settings?.layerHeightMm}mm / {s.settings?.infillPercent}% infill
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[13px] dash-soft">Actually took:</span>
                                    <ActualTimeEditor
                                        sample={s}
                                        onSave={(hours) => put({ action: 'update', id: s.id, actualHours: hours })}
                                    />
                                    <button
                                        onClick={() => put({ action: 'delete', id: s.id })}
                                        className="text-[13px] font-medium text-[var(--dash-bad)] hover:underline cursor-pointer px-1"
                                        title="Remove"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DashCard>

            {/* Fit + apply */}
            {applied && (
                <div className="rounded-[var(--dash-r-inner)] bg-[var(--dash-ok-bg)] text-[var(--dash-ok)] px-3 py-2 text-[13px]">
                    ✓ Calibration applied{applied.fittedAt ? ` on ${new Date(applied.fittedAt).toLocaleDateString()}` : ''} —
                    estimates are tuned to your machines. Add more timed prints any time to refine it.
                </div>
            )}
            {fit ? (
                <DashCard title="Calibration">
                    <div className="flex flex-col gap-4">
                        <p className="text-[13px] text-[var(--dash-ink)]">
                            Based on your {fit.samplesUsed} timed print{fit.samplesUsed === 1 ? '' : 's'}, estimates are
                            currently off by <span className="font-semibold dash-data">{Math.round(fit.currentMeanAbsPctError)}%</span> on
                            average — after calibration that drops to{' '}
                            <span className="font-semibold dash-data">{Math.round(fit.fittedMeanAbsPctError)}%</span>.
                        </p>
                        <SegmentPill
                            className="max-w-md"
                            segments={[
                                { label: 'Error now', value: Math.round(fit.currentMeanAbsPctError), tone: 'hatch' },
                                { label: 'After calibration', value: Math.round(fit.fittedMeanAbsPctError), tone: 'sun' },
                            ]}
                        />
                        <button
                            onClick={() => put({ action: 'apply' }, 'Calibration applied — estimates now use your machine speeds')}
                            disabled={busy}
                            className="dash-hoverable self-start rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)] active:scale-[0.97] disabled:opacity-50"
                        >
                            Apply calibration
                        </button>
                    </div>
                </DashCard>
            ) : (
                timedCount > 0 && (
                    <p className="text-[13px] dash-soft">
                        {timedCount === 1
                            ? 'One timed print recorded — add a second, differently-shaped one to enable calibration.'
                            : 'These prints are too similar in shape to calibrate from — add one flat/wide and one tall/narrow print.'}
                    </p>
                )
            )}
        </div>
    )
}
