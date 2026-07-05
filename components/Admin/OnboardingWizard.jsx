'use client'
import { useState } from 'react'
import { WIZARD_STEPS, nextStep, prevStep, isLastStep } from '@/lib/admin/wizardSteps'
import QuotingPricingManagement from '@/components/Admin/QuotingPricingManagement'
import DeliveryTypeManagement from '@/components/Admin/DeliveryTypeManagement'
import PrintTimeCalibration from '@/components/Admin/PrintTimeCalibration'

// Full-screen first-run wizard. Each step is a thin wrapper around the same
// form sections used in Settings — the config itself is the wizard state, so
// progress persists via the existing PUT endpoints (no onboarding document).
export default function OnboardingWizard({ adminEmailPresent, onClose }) {
    const [step, setStep] = useState(0)
    const current = WIZARD_STEPS[step]

    const dismiss = () => {
        try { localStorage.setItem('adminOnboardingDismissed', '1') } catch { /* ignore */ }
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Store setup wizard">
            <div className="bg-background border border-borderColor rounded-md w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-borderColor flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-textColor">{current.title}</h2>
                        <p className="text-xs text-lightColor">{current.blurb}</p>
                    </div>
                    <div className="flex items-center gap-1" aria-label={`Step ${step + 1} of ${WIZARD_STEPS.length}`}>
                        {WIZARD_STEPS.map((s, i) => (
                            <span key={s.key} className={`h-1.5 w-6 rounded-full ${i <= step ? 'bg-textColor' : 'bg-borderColor'}`} />
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {current.key === 'welcome' && (
                        <div className="flex flex-col gap-4 text-sm text-textColor">
                            <p>
                                Welcome! Before customers can get instant quotes and order prints,
                                a few things need to be configured. This wizard walks you through them —
                                every step saves with the same forms you&apos;ll find later under Settings.
                            </p>
                            <ul className="list-disc pl-5 text-xs text-lightColor flex flex-col gap-1">
                                <li>Pricing — your material and machine-time rates, fees and minimum price.</li>
                                <li>Your machines — tune print-time estimates and build-size limits.</li>
                                <li>Print timing — calibrate estimates with a couple of timed test prints.</li>
                                <li>Colours &amp; materials — the catalogue customers pick from.</li>
                                <li>Delivery — at least one shipping option for printed orders.</li>
                            </ul>
                            <div className="border border-borderColor rounded-md p-3 text-xs">
                                <span className={adminEmailPresent ? 'text-green-600' : 'text-amber-500'}>
                                    {adminEmailPresent ? '✓' : '⚠'}
                                </span>{' '}
                                <span className="text-textColor">Admin notification email</span>{' '}
                                <span className="text-lightColor">
                                    {adminEmailPresent
                                        ? '— configured; you’ll get an email when requests come in.'
                                        : '— not set. Add ADMIN_EMAIL (or GMAIL_USER) to your environment to receive new-request emails.'}
                                </span>
                            </div>
                            <p className="text-xs text-lightColor">
                                Every step is skippable — you can re-run this wizard any time from Settings.
                            </p>
                        </div>
                    )}
                    {current.key === 'pricing' && <QuotingPricingManagement sections={['pricing']} compact />}
                    {current.key === 'machines' && <QuotingPricingManagement sections={['machines']} compact />}
                    {current.key === 'calibration' && (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-lightColor">
                                This step needs real prints, so it usually finishes after the wizard:
                                add a model now, print it when convenient, then come back to
                                Settings → Print Timing to enter the time and apply.
                            </p>
                            <PrintTimeCalibration compact />
                        </div>
                    )}
                    {current.key === 'colours' && <QuotingPricingManagement sections={['colours']} compact />}
                    {current.key === 'delivery' && <DeliveryTypeManagement />}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-borderColor flex items-center justify-between">
                    <button onClick={dismiss} className="text-xs text-lightColor hover:text-textColor cursor-pointer">
                        Set up later
                    </button>
                    <div className="flex items-center gap-2">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(prevStep(step))}
                                className="text-xs px-4 py-2 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={() => (isLastStep(step) ? dismiss() : setStep(nextStep(step)))}
                            className="text-xs px-4 py-2 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer"
                        >
                            {isLastStep(step) ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
