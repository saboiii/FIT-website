import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import OnboardingWizard from '@/components/Admin/OnboardingWizard'
import { WIZARD_STEPS, nextStep, prevStep, isLastStep } from '@/lib/admin/wizardSteps'

vi.mock('@/components/General/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))
// The delivery step reuses the full management panel; stub it — its own
// behaviour is out of scope here.
vi.mock('@/components/Admin/DeliveryTypeManagement', () => ({
  default: () => <div>delivery-panel</div>,
}))
// Same for the calibration step (it fetches its own data).
vi.mock('@/components/Admin/PrintTimeCalibration', () => ({
  default: () => <div>calibration-panel</div>,
}))

const quotingPayload = {
  quotingConfig: { materialRatePerGram: 0.02, printTimeRatePerHour: 3, timeModel: {} },
  printColours: [],
  machineLimits: {},
}

beforeEach(() => {
  global.fetch = vi.fn((url, opts) => {
    if (opts?.method === 'PUT') return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    return Promise.resolve({ ok: true, json: () => Promise.resolve(quotingPayload) })
  })
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('wizard step machine', () => {
  it('advances, retreats and bounds', () => {
    expect(nextStep(0)).toBe(1)
    expect(prevStep(0)).toBe(0)
    expect(nextStep(WIZARD_STEPS.length - 1)).toBe(WIZARD_STEPS.length - 1)
    expect(isLastStep(WIZARD_STEPS.length - 1)).toBe(true)
    expect(isLastStep(0)).toBe(false)
  })
})

describe('OnboardingWizard', () => {
  it('starts on Welcome and advances through the section steps', async () => {
    render(<OnboardingWizard adminEmailPresent={false} onClose={vi.fn()} />)
    expect(screen.getByText(/Welcome!/)).toBeInTheDocument()
    expect(screen.getByText(/not set/)).toBeInTheDocument() // admin email hint

    fireEvent.click(screen.getByText('Next'))
    expect(await screen.findByText('Rates & fees')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next'))
    expect(await screen.findByText(/Print time estimation/)).toBeInTheDocument()
    expect(screen.getByText('Machine limits')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next'))
    expect(await screen.findByText('calibration-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next'))
    expect(await screen.findByText(/Colour \/ material catalogue/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('delivery-panel')).toBeInTheDocument()
    expect(screen.getByText('Finish')).toBeInTheDocument()
  })

  it('saves a step through the existing PUT endpoint', async () => {
    render(<OnboardingWizard adminEmailPresent onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Next')) // → pricing
    await screen.findByText('Rates & fees')
    fireEvent.click(screen.getByText(/Save Quoting Config/))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/quoting',
        expect.objectContaining({ method: 'PUT' }),
      )
    })
  })

  it('"Set up later" dismisses persistently', () => {
    const onClose = vi.fn()
    render(<OnboardingWizard adminEmailPresent onClose={onClose} />)
    fireEvent.click(screen.getByText('Set up later'))
    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem('adminOnboardingDismissed')).toBe('1')
  })

  it('Finish on the last step closes and dismisses', () => {
    const onClose = vi.fn()
    render(<OnboardingWizard adminEmailPresent onClose={onClose} />)
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Finish'))
    expect(onClose).toHaveBeenCalled()
    expect(localStorage.getItem('adminOnboardingDismissed')).toBe('1')
  })
})
