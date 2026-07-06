// WP9 honest-UI feature stubs (blueprint §6 [STUB] rows): every stub renders a
// real component in a plausible empty state behind a visible "Coming soon"
// affordance, and every stub action carries the real `disabled` attribute —
// no fake data, no dead-but-live-looking buttons.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { ComingSoon, ComingSoonBlock, CommandPalette } from '@/components/dashboard-ui'
import NotificationsBell from '@/components/DashboardComponents/NotificationsBell'
import PayoutsPage from '@/app/dashboard/payouts/page'
import { fetchPayoutStatement } from '@/app/dashboard/payouts/data'
import DiscountsPage from '@/app/dashboard/discounts/page'
import CustomersPanel from '@/components/Admin/CustomersPanel'
import MyProducts from '@/app/dashboard/products/page'
import ReviewManagement from '@/components/Admin/ReviewManagement'
import CreatorPayments from '@/components/Admin/CreatorPayments'
import NewsletterManagement from '@/components/Admin/NewsletterManagement'

// Entitlements: creator by default (gating cases override entitlementsState).
const entitlementsState = { loading: false, canAccessDashboard: true, canUseMessaging: true }
vi.mock('@/utils/useAccess', () => ({ default: () => ({ isAdmin: false, canAccess: true, loading: false }) }))
vi.mock('@/utils/useEntitlements', () => ({ default: () => entitlementsState }))

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: { id: 'user_1' }, isLoaded: true }),
}))
vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))
vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: ({ src, alt }) => <img src={typeof src === 'string' ? src : ''} alt={alt} />,
}))
// xlsx stays out of jsdom — CreatorPayments only needs a safe surface.
vi.mock('xlsx', () => ({
    utils: {
        json_to_sheet: vi.fn(() => ({})),
        book_new: vi.fn(() => ({})),
        book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
}))

const ok = (payload) => Promise.resolve({ ok: true, json: async () => payload })

beforeEach(() => {
    global.fetch = vi.fn(() => ok({}))
})

afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
})

describe('ComingSoon primitive', () => {
    it('renders the hatch pill and the non-interactive block wrapper', () => {
        const { container } = render(
            <ComingSoonBlock title="Ghost — coming soon">
                <ComingSoon />
                <button>ghost</button>
            </ComingSoonBlock>,
        )
        const block = container.firstChild
        expect(block).toHaveAttribute('aria-hidden', 'true')
        expect(block).toHaveAttribute('title', 'Ghost — coming soon')
        expect(block.className).toContain('pointer-events-none')
        expect(within(block).getByText('Coming soon')).toBeInTheDocument()
    })
})

describe('Creator payout statements stub (add-creator-payout-statements)', () => {
    it('renders the honest empty state, the pill and the ghost layout', () => {
        render(<PayoutsPage />)
        expect(screen.getByText('Payouts')).toBeInTheDocument()
        expect(screen.getByText('Payout Statements Coming Soon')).toBeInTheDocument()
        expect(screen.getByText("Payout Statements Coming Soon")).toBeInTheDocument() // minimal empty states drop body copy
        expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0)
        // The ghost ledger is hidden from the a11y tree — clearly non-live.
        expect(document.querySelector('[aria-hidden="true"][title]')).toBeTruthy()
    })

    it('the data seam resolves null until the backend exists', async () => {
        await expect(fetchPayoutStatement()).resolves.toBeNull()
    })
})

describe('Discount codes stub (add-discount-codes)', () => {
    it('renders the empty state with a visibly disabled New Code button', () => {
        render(<DiscountsPage />)
        expect(screen.getByText('Discount Codes Coming Soon')).toBeInTheDocument()
        const newCode = screen.getByRole('button', { name: /New Code/ })
        expect(newCode).toBeDisabled()
        expect(newCode).toHaveAttribute('title', 'Needs backend, coming soon')
        expect(screen.getByText('Coming soon')).toBeInTheDocument()
    })
})

describe('Admin customers panel stub (add-admin-customers-panel)', () => {
    it('renders the honest empty state and the ghost ledger', () => {
        render(<CustomersPanel />)
        expect(screen.getByText('Customers')).toBeInTheDocument()
        expect(screen.getByText('Customers: Coming Soon')).toBeInTheDocument()
        expect(screen.getByText('Coming soon')).toBeInTheDocument()
    })
})

describe('Notification centre stub (add-dashboard-notification-centre)', () => {
    it('the bell is live and opens the popover with the honest stub', () => {
        render(<NotificationsBell />)
        const bell = screen.getByRole('button', { name: 'Notifications' })
        expect(bell).toBeEnabled()
        expect(screen.queryByText('Notifications: Coming Soon')).toBeNull()

        fireEvent.click(bell)
        const popover = screen.getByRole('dialog', { name: 'Notifications' })
        expect(within(popover).getByText('Notifications: Coming Soon')).toBeInTheDocument()
        expect(within(popover).getByText('Coming soon')).toBeInTheDocument()

        fireEvent.keyDown(window, { key: 'Escape' })
        expect(screen.queryByRole('dialog')).toBeNull()
    })
})

describe('Listing duplicate + per-product analytics stubs (products list)', () => {
    const PRODUCTS = [
        {
            _id: 'p1',
            name: 'Alpha Widget',
            slug: 'alpha-widget',
            numberSold: 5,
            stock: 3,
            createdAt: '2026-01-02T00:00:00Z',
            basePrice: { presentmentAmount: 10, presentmentCurrency: 'SGD' },
        },
    ]

    beforeEach(() => {
        global.fetch = vi.fn(() => ok({ products: PRODUCTS }))
    })

    it('Duplicate is rendered disabled with the coming-soon tooltip', async () => {
        render(<MyProducts />)
        await screen.findByText('Alpha Widget')
        const duplicate = screen.getByRole('button', { name: 'Duplicate' })
        expect(duplicate).toBeDisabled()
        expect(duplicate).toHaveAttribute('title', 'Needs backend, coming soon')
    })

    it('Performance opens a peek with the honest analytics stub', async () => {
        render(<MyProducts />)
        await screen.findByText('Alpha Widget')
        fireEvent.click(screen.getByRole('button', { name: 'Performance' }))
        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByText('Product Performance Coming Soon')).toBeInTheDocument()
        expect(within(dialog).getByText('Coming soon')).toBeInTheDocument()
        expect(within(dialog).getByText("Product Performance Coming Soon")).toBeInTheDocument() // minimal empty states drop body copy
    })
})

describe('Review replies stub (blueprint §6 — no openspec change filed)', () => {
    it('each review card carries a disabled Reply action', async () => {
        const products = [
            {
                _id: 'prod_1',
                name: 'Benchy',
                images: [],
                reviews: [
                    { _id: 'r1', rating: 5, username: 'Ada', comment: 'Great', createdAt: '2026-06-01T00:00:00Z', helpful: [] },
                ],
            },
        ]
        global.fetch = vi.fn(() => ok({ products }))
        render(<ReviewManagement />)
        fireEvent.click(await screen.findByText('Benchy'))

        const reply = await screen.findByRole('button', { name: 'Reply' })
        expect(reply).toBeDisabled()
        expect(reply).toHaveAttribute('title', 'Reply to reviews, coming soon')
    })
})

describe('Refunds stub (add-refunds-ui)', () => {
    it('the payments peek carries a disabled Refund action', async () => {
        const sessions = [
            {
                sessionId: 'cs_test_alpha_0123456789',
                userId: 'buyer_1',
                createdAt: '2026-07-01T10:00:00Z',
                processed: false,
                currency: 'sgd',
                totalAmount: 5000,
                salesData: {
                    creator_1: {
                        totalAmount: 5000,
                        productRevenue: 4000,
                        shippingRevenue: 1000,
                        items: [{ productId: 'prod_1', quantity: 1, unitPrice: 40, deliveryType: 'standard' }],
                    },
                },
                digitalProductData: {},
            },
        ]
        global.fetch = vi.fn((url) => {
            const u = String(url)
            if (u.includes('/api/user/batch')) return ok({ users: [{ id: 'buyer_1', name: 'Bella Buyer' }] })
            if (u.includes('/api/product/batch')) return ok({ products: [] })
            if (u.includes('/api/admin/sessions')) return ok({ sessions })
            return ok({})
        })
        render(<CreatorPayments />)
        fireEvent.click((await screen.findAllByText('Bella Buyer'))[0])

        const dialog = await screen.findByRole('dialog')
        const refund = within(dialog).getByRole('button', { name: 'Refund…' })
        expect(refund).toBeDisabled()
        expect(refund).toHaveAttribute('title', 'Refunds, coming soon')
        // The real processed action beside it stays live.
        expect(within(dialog).getByRole('button', { name: 'Mark as processed' })).toBeEnabled()
    })
})

describe('Newsletter test-send stub (add-newsletter-test-send)', () => {
    it('renders a disabled "Send test to me" beside the live Save', async () => {
        global.fetch = vi.fn((url) => {
            const u = String(url)
            if (u.startsWith('/api/admin/newsletter/interests')) return ok({ interests: [] })
            if (u.startsWith('/api/admin/newsletter/subscribers')) return ok({ subscribers: [] })
            if (u.startsWith('/api/admin/blog')) return ok({ posts: [] })
            if (u === '/api/admin/newsletter') return ok({ campaigns: [] })
            return ok({})
        })
        render(<NewsletterManagement />)

        const testSend = await screen.findByRole('button', { name: 'Send test to me' })
        expect(testSend).toBeDisabled()
        expect(testSend).toHaveAttribute('title', 'Send test to me, coming soon')
        expect(screen.getByRole('button', { name: /Save draft/ })).toBeEnabled()
    })
})

describe('Palette entity-search stub (blueprint §6 — no openspec change filed)', () => {
    it('shows the non-interactive coming-soon footer when nothing matches', () => {
        render(
            <CommandPalette
                open
                onOpen={vi.fn()}
                onClose={vi.fn()}
                groups={[{ key: 'nav', label: 'Navigate', items: [] }]}
            />,
        )
        expect(screen.getByText(/No matches/)).toBeInTheDocument()
        expect(screen.getByText('Searching orders & customers')).toBeInTheDocument()
        expect(screen.getByText('Coming soon')).toBeInTheDocument()
    })
})
