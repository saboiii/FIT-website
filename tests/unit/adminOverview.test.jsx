import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import Overview from '@/components/Admin/Overview'
import AdminPage from '@/app/admin/page'

// The page smoke tests below render the whole admin shell; stub the heavy
// panels and its boundaries — their behaviour is covered elsewhere.
vi.mock('@/utils/useAccess', () => ({ default: () => ({ loading: false, isAdmin: true }) }))
vi.mock('@clerk/nextjs', () => ({ useUser: () => ({ user: { firstName: 'Saba' } }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/Admin/DynamicContentManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/BlogManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/NewsletterManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/CreatorPayments', () => ({ default: () => null }))
vi.mock('@/components/Admin/CategoryManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/DeliveryTypeManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/OrderStatusManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/CustomPrintProductManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/CustomPrintRequests', () => ({ default: () => null }))
vi.mock('@/components/Admin/QuotingPricingManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/PrintTimeCalibration', () => ({ default: () => null }))
vi.mock('@/components/Admin/ReviewManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/EventManagement', () => ({ default: () => null }))
vi.mock('@/components/Admin/AnalyticsPanel', () => ({ default: () => null }))

const configuredSetup = {
  quotingConfig: { materialRatePerGram: 0.02, printTimeRatePerHour: 3, timeModel: { baseFlowCm3PerHour: 10 } },
  printColours: [{ name: 'Black', hex: '#111111' }],
  machineLimits: { maxLengthCm: 30 },
  deliveryTypes: [{ name: 'courier', applicableToProductTypes: ['print'], isActive: true, pricingTiers: [{}] }],
  customPrintProduct: { basePrice: { presentmentAmount: 10 }, dimensions: { length: 10, width: 10, height: 10, weight: 0.5 } },
  adminEmailPresent: true,
}

beforeEach(() => {
  localStorage.clear()
  const payloads = [
    ['/api/admin/quoting', {
      quotingConfig: configuredSetup.quotingConfig,
      printColours: configuredSetup.printColours,
      machineLimits: configuredSetup.machineLimits,
      adminEmailPresent: true,
    }],
    ['/api/admin/settings', { deliveryTypes: configuredSetup.deliveryTypes }],
    ['/api/product/custom-print-config', { product: configuredSetup.customPrintProduct }],
    ['/api/admin/custom-print-requests', { requests: [] }],
  ]
  global.fetch = vi.fn((url) => {
    const hit = payloads.find(([path]) => String(url).startsWith(path))
    return Promise.resolve({ ok: true, json: () => Promise.resolve(hit ? hit[1] : {}) })
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Admin Overview', () => {
  it('collapses a mostly-complete checklist to its header row', () => {
    render(<Overview setupData={configuredSetup} requests={[]} onNavigate={vi.fn()} onOpenWizard={vi.fn()} />)
    expect(screen.getByText(/7\/7 complete/)).toBeInTheDocument()
    expect(screen.queryByText('Fix now')).toBeNull()
    // Expanding a fully complete list still shows no Fix now.
    fireEvent.click(screen.getByText(/7\/7 complete/))
    expect(screen.queryByText('Fix now')).toBeNull()
    expect(screen.getByText('Pricing rates set')).toBeInTheDocument()
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
    // 6/7 done → collapsed; expand to reach the rows.
    fireEvent.click(screen.getByText(/6\/7 complete/))
    expect(screen.getByText(/can’t be shipped/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Fix now'))
    expect(onNavigate).toHaveBeenCalledWith('delivery')
  })

  it('keeps all rows visible while most of setup is incomplete', () => {
    render(
      <Overview
        setupData={{}}
        requests={[]}
        onNavigate={vi.fn()}
        onOpenWizard={vi.fn()}
      />,
    )
    expect(screen.getByText(/0\/7 complete/)).toBeInTheDocument()
    expect(screen.getAllByText('Fix now').length).toBeGreaterThan(3)
  })

  it('shows at-a-glance request counts on the hero tiles', () => {
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
    expect(screen.getByText('Open print requests').nextSibling.textContent).toBe('3')
    expect(screen.getByText('Paid, not printing').nextSibling.textContent).toBe('2')
  })

  it('routes the hero tiles to the print requests queue', () => {
    const onNavigate = vi.fn()
    render(
      <Overview
        setupData={configuredSetup}
        requests={[{ status: 'configured' }]}
        onNavigate={onNavigate}
        onOpenWizard={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Open print requests'))
    expect(onNavigate).toHaveBeenCalledWith('customPrintRequests')
  })

  it('opens the wizard from the checklist header', () => {
    const onOpenWizard = vi.fn()
    render(<Overview setupData={configuredSetup} requests={[]} onNavigate={vi.fn()} onOpenWizard={onOpenWizard} />)
    fireEvent.click(screen.getByText('Run setup wizard'))
    expect(onOpenWizard).toHaveBeenCalled()
  })

  it('explains the admin-email env vars in a sheet instead of navigating', () => {
    const onNavigate = vi.fn()
    render(
      <Overview
        setupData={{ ...configuredSetup, adminEmailPresent: false }}
        requests={[]}
        onNavigate={onNavigate}
        onOpenWizard={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText(/6\/7 complete/))
    fireEvent.click(screen.getByText('Fix now'))
    expect(onNavigate).not.toHaveBeenCalled()
    expect(screen.getByText(/ADMIN_EMAIL=/)).toBeInTheDocument()
  })

  it('charts requests over the last 30 days, with an informational empty state', () => {
    const { unmount } = render(
      <Overview
        setupData={configuredSetup}
        requests={[{ status: 'configured', createdAt: new Date().toISOString() }]}
        onNavigate={vi.fn()}
        onOpenWizard={vi.fn()}
      />,
    )
    expect(screen.getByText('Requests, last 30 days')).toBeInTheDocument()
    expect(screen.queryByText('No Requests Yet')).toBeNull()
    unmount()

    render(<Overview setupData={configuredSetup} requests={[]} onNavigate={vi.fn()} onOpenWizard={vi.fn()} />)
    expect(screen.getByText('No Requests Yet')).toBeInTheDocument()
  })

  it('derives status, weekday and material visualizations from the fetched requests', () => {
    const now = new Date().toISOString()
    render(
      <Overview
        setupData={configuredSetup}
        requests={[
          { status: 'configured', createdAt: now, printConfiguration: { printSettings: { materialType: 'plastic' } } },
          { status: 'paid', createdAt: now, printConfiguration: { printSettings: { materialType: 'plastic' } } },
          { status: 'paid', createdAt: now, printConfiguration: { generic: { material: 'resin' } } },
        ]}
        onNavigate={vi.fn()}
        onOpenWizard={vi.fn()}
      />,
    )
    // Status distribution bar list.
    const statusList = screen.getByRole('list', { name: 'Open jobs by status' })
    expect(within(statusList).getByText('Awaiting quote')).toBeInTheDocument()
    expect(within(statusList).getByTitle('Paid: 2')).toBeInTheDocument()
    // Day-of-week dot matrix over the trailing weeks.
    expect(screen.getByText('Busy days, last 4 weeks')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Requests per day/ })).toBeInTheDocument()
    // Material frequency bar list, from printSettings and generic fallbacks.
    const materialList = screen.getByRole('list', { name: 'Materials requested' })
    expect(within(materialList).getByTitle('Plastic: 2')).toBeInTheDocument()
    expect(within(materialList).getByText('Resin')).toBeInTheDocument()
  })

  it('renders no em dashes or middots anywhere in the overview copy', () => {
    render(
      <Overview
        setupData={{ ...configuredSetup, deliveryTypes: [] }}
        requests={[{ status: 'configured', createdAt: new Date().toISOString() }]}
        onNavigate={vi.fn()}
        onOpenWizard={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText(/6\/7 complete/))
    expect(document.body.textContent).not.toMatch(/[—·]/)
  })
})

describe('Admin shell (page)', () => {
  it('opens the command palette on ⌘K and lists the panels', async () => {
    render(<AdminPage />)
    await screen.findByText(/7\/7 complete/)

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const dialog = screen.getByRole('dialog', { name: 'Command palette' })
    expect(within(dialog).getByText('Print Requests')).toBeInTheDocument()
    expect(within(dialog).getByText('Run setup wizard')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).toBeNull()
  })

  it('collapses and expands the rail, flipping aria state', async () => {
    render(<AdminPage />)
    await screen.findByText(/7\/7 complete/)

    const toggle = screen.getByLabelText('Collapse navigation')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    const expandToggle = screen.getByLabelText('Expand navigation')
    expect(expandToggle).toHaveAttribute('aria-expanded', 'false')
    expect(localStorage.getItem('dashRailCollapsed')).toBe('1')
  })
})
