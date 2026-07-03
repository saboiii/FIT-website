import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import Overview from '@/components/Admin/Overview'

afterEach(cleanup)

const configuredSetup = {
  quotingConfig: { materialRatePerGram: 0.02, printTimeRatePerHour: 3, timeModel: { baseFlowCm3PerHour: 10 } },
  printColours: [{ name: 'Black', hex: '#111111' }],
  machineLimits: { maxLengthCm: 30 },
  deliveryTypes: [{ name: 'courier', applicableToProductTypes: ['print'], isActive: true, pricingTiers: [{}] }],
  customPrintProduct: { basePrice: { presentmentAmount: 10 }, dimensions: { length: 10, width: 10, height: 10, weight: 0.5 } },
  adminEmailPresent: true,
}

describe('Admin Overview', () => {
  it('renders a fully complete checklist', () => {
    render(<Overview setupData={configuredSetup} requests={[]} onNavigate={vi.fn()} onOpenWizard={vi.fn()} />)
    expect(screen.getByText(/7\/7 complete/)).toBeInTheDocument()
    expect(screen.queryByText('Fix now')).toBeNull()
  })

  it('flags incomplete items with a consequence and a Fix now link', () => {
    const onNavigate = vi.fn()
    render(
      <Overview
        setupData={{ ...configuredSetup, deliveryTypes: [] }}
        requests={[]}
        onNavigate={onNavigate}
        onOpenWizard={vi.fn()}
      />,
    )
    expect(screen.getByText(/6\/7 complete/)).toBeInTheDocument()
    expect(screen.getByText(/can’t be shipped/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Fix now'))
    expect(onNavigate).toHaveBeenCalledWith('delivery')
  })

  it('shows at-a-glance request counts', () => {
    render(
      <Overview
        setupData={configuredSetup}
        requests={[
          { status: 'configured' },
          { status: 'paid' },
          { status: 'paid' },
          { status: 'delivered' },
        ]}
        onNavigate={vi.fn()}
        onOpenWizard={vi.fn()}
      />,
    )
    expect(screen.getByText('Open print requests').previousSibling.textContent).toBe('3')
    expect(screen.getByText('Paid, not yet printing').previousSibling.textContent).toBe('2')
  })

  it('opens the wizard from the checklist header', () => {
    const onOpenWizard = vi.fn()
    render(<Overview setupData={configuredSetup} requests={[]} onNavigate={vi.fn()} onOpenWizard={onOpenWizard} />)
    fireEvent.click(screen.getByText('Run setup wizard'))
    expect(onOpenWizard).toHaveBeenCalled()
  })
})
