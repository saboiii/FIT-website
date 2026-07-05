'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { WIZARD_STEPS, nextStep, prevStep, isLastStep } from '@/lib/admin/wizardSteps'
import { swap } from '@/lib/motion/tokens'
import { useScrollLock } from '@/components/dashboard-ui'
import { quietBtnCls, InfoStrip } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import QuotingPricingManagement from '@/components/Admin/QuotingPricingManagement'
import DeliveryTypeManagement from '@/components/Admin/DeliveryTypeManagement'
import PrintTimeCalibration from '@/components/Admin/PrintTimeCalibration'

// One-line "why this matters" per step (blueprint §9.12 — tour-style copy).
const WHY = {
    welcome: 'Five short steps stand between a fresh install and a store that quotes and ships on its own.',
    pricing: 'Every instant quote is computed from these rates — set them once and each request prices itself.',
    machines: 'Realistic print-time and build-size settings keep quotes honest and unprintable jobs out of your queue.',
    calibration: 'A couple of timed test prints teach the estimator how fast your machines really run.',
    colours: 'Customers can only pick from this catalogue, so it doubles as your quality gate.',
    delivery: 'Orders cannot reach checkout without at least one delivery option.',
}

const sunBtnCls =
    'dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'

// Journey dot (§9.12 status vocabulary): ink = done, sun = current, hatch = todo.
function StepDot({ state, className = '' }) {
    const tone =
        state === 'done'
            ? 'bg-[var(--dash-ink)]'
            : state === 'current'
                ? 'bg-[var(--dash-sun)]'
                : 'dash-hatch bg-[var(--dash-card)] border border-[var(--dash-line)]'
    return <span aria-hidden="true" className={`h-3 w-3 rounded-full shrink-0 ${tone} ${className}`} />
}

// Full-screen first-run wizard. Each step is a thin wrapper around the same
// form sections used in Settings — the config itself is the wizard state, so
// progress persists via the existing PUT endpoints (no onboarding document).
export default function OnboardingWizard({ adminEmailPresent, onClose }) {
    const [step, setStep] = useState(0)
    const current = WIZARD_STEPS[step]
    useScrollLock(true)

    const dismiss = () => {
        try { localStorage.setItem('adminOnboardingDismissed', '1') } catch { /* ignore */ }
        onClose()
    }

    const stepState = (i) => (i < step ? 'done' : i === step ? 'current' : 'todo')

    return (
        <div className="dash fixed inset-0 z-50 md:p-6" role="dialog" aria-modal="true" aria-label="Store setup wizard">
            <div className="dash-scrim absolute inset-0" />
            <div className="glass-warm relative h-full w-full md:rounded-[var(--dash-r-card)] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--dash-line)] flex items-center justify-between gap-3">
                    <div>
                        <h2 className="dash-title">Store setup</h2>
                        <p className="text-[13px] dash-soft">Six skippable steps — every one saves with the real Settings forms.</p>
                    </div>
                    {/* Mobile journey — the rail collapses to a dot strip */}
                    <div className="flex md:hidden items-center gap-1.5" aria-label={`Step ${step + 1} of ${WIZARD_STEPS.length}`}>
                        {WIZARD_STEPS.map((s, i) => (
                            <StepDot key={s.key} state={stepState(i)} />
                        ))}
                    </div>
                </div>

                {/* Body — two-column journey (§9.12) */}
                <div className="flex flex-1 min-h-0">
                    {/* Left rail: the six steps as a vertical journey */}
                    <nav
                        aria-label="Setup steps"
                        className="hidden md:flex w-[200px] shrink-0 flex-col gap-1 p-4 border-r border-[var(--dash-line)] overflow-y-auto"
                    >
                        {WIZARD_STEPS.map((s, i) => {
                            const state = stepState(i)
                            const clickable = i < step // jump back only, never forward
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => clickable && setStep(i)}
                                    disabled={!clickable && i !== step}
                                    aria-current={i === step ? 'step' : undefined}
                                    className={`dash-hoverable flex items-start gap-2.5 rounded-[var(--dash-r-inner)] px-2.5 py-2 text-left ${
                                        clickable ? 'cursor-pointer hover:bg-[var(--dash-sun-soft)]' : 'cursor-default'
                                    } ${i === step ? 'bg-[var(--dash-card)] shadow-[var(--dash-shadow-card)]' : ''}`}
                                >
                                    <StepDot state={state} className="mt-0.5" />
                                    <span className="min-w-0">
                                        <span className={`block text-[13px] font-medium ${i === step ? 'text-[var(--dash-ink)]' : 'text-[var(--dash-ink-soft)]'}`}>
                                            {s.title}
                                        </span>
                                        <span className="block text-[11px] font-medium dash-soft">{s.blurb}</span>
                                    </span>
                                </button>
                            )
                        })}
                    </nav>

                    {/* Right column: the step form on document styling */}
                    <div className="flex-1 min-w-0 dash-scroll">
                        <motion.div
                            key={current.key}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={swap}
                            className="max-w-[720px] mx-auto p-5 md:p-8 flex flex-col gap-4"
                        >
                            <div>
                                <h3 className="dash-section">{current.title}</h3>
                                <p className="text-[13px] dash-soft mt-1">{WHY[current.key]}</p>
                            </div>

                            {current.key === 'welcome' && (
                                <div className="flex flex-col gap-4 text-[14px] text-[var(--dash-ink)]">
                                    <p>
                                        Welcome! Before customers can get instant quotes and order prints,
                                        a few things need to be configured. This wizard walks you through them —
                                        every step saves with the same forms you&apos;ll find later under Settings.
                                    </p>
                                    <ul className="list-disc pl-5 text-[13px] dash-soft flex flex-col gap-1">
                                        <li>Pricing — your material and machine-time rates, fees and minimum price.</li>
                                        <li>Your machines — tune print-time estimates and build-size limits.</li>
                                        <li>Print timing — calibrate estimates with a couple of timed test prints.</li>
                                        <li>Colours &amp; materials — the catalogue customers pick from.</li>
                                        <li>Delivery — at least one shipping option for printed orders.</li>
                                    </ul>
                                    <InfoStrip tone={adminEmailPresent ? 'info' : 'warn'}>
                                        <span className={adminEmailPresent ? 'text-[var(--dash-ok)]' : 'text-[var(--dash-ink)]'}>
                                            {adminEmailPresent ? '✓' : '⚠'}
                                        </span>{' '}
                                        <span className="font-medium text-[var(--dash-ink)]">Admin notification email</span>{' '}
                                        <span>
                                            {adminEmailPresent
                                                ? '— configured; you’ll get an email when requests come in.'
                                                : '— not set. Add ADMIN_EMAIL (or GMAIL_USER) to your environment to receive new-request emails.'}
                                        </span>
                                    </InfoStrip>
                                    <p className="text-[13px] dash-soft">
                                        Every step is skippable — you can re-run this wizard any time from Settings.
                                    </p>
                                </div>
                            )}
                            {current.key === 'pricing' && <QuotingPricingManagement sections={['pricing']} compact />}
                            {current.key === 'machines' && <QuotingPricingManagement sections={['machines']} compact />}
                            {current.key === 'calibration' && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-[13px] dash-soft">
                                        This step needs real prints, so it usually finishes after the wizard:
                                        add a model now, print it when convenient, then come back to
                                        Settings → Print Timing to enter the time and apply.
                                    </p>
                                    <PrintTimeCalibration compact />
                                </div>
                            )}
                            {current.key === 'colours' && <QuotingPricingManagement sections={['colours']} compact />}
                            {current.key === 'delivery' && <DeliveryTypeManagement />}
                        </motion.div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--dash-line)] flex items-center justify-between">
                    <button onClick={dismiss} className="text-[13px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer">
                        Set up later
                    </button>
                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <button onClick={() => setStep(prevStep(step))} className={quietBtnCls}>
                                Back
                            </button>
                        )}
                        <button
                            onClick={() => (isLastStep(step) ? dismiss() : setStep(nextStep(step)))}
                            className={sunBtnCls}
                        >
                            {isLastStep(step) ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
