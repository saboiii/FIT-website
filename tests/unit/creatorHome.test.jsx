// RTL smokes for the redesigned creator home (blueprint §5.1–5.2):
// greeting fallback name, revenue card sales[] guard, needs-attention rows,
// the orders ledger (collapsible date strips) + peek parity surface, and the
// shared CreatorShell rail the home renders inside.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import Dashboard from '@/app/dashboard/Dashboard'
import CreatorShell from '@/components/DashboardComponents/CreatorShell'

// Entitlements: creator by default (gating cases override entitlementsState).
const entitlementsState = { loading: false, canAccessDashboard: true, canUseMessaging: true }
vi.mock('@/utils/useEntitlements', () => ({ default: () => entitlementsState }))

// jsdom has no ResizeObserver (Recharts' ResponsiveContainer observes).
global.ResizeObserver = global.ResizeObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
}

let mockUser = null
vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: mockUser, isLoaded: true }),
}))
vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/utils/useAccess', () => ({
    default: () => ({ loading: false, canAccess: true, isAdmin: false }),
}))
vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
    ToastProvider: ({ children }) => children,
}))
vi.mock('@/utils/useOrderStatuses', () => ({
    useOrderStatuses: (orderType) => ({
        orderStatuses:
            orderType === 'printOrder'
                ? [{ statusKey: 'pending_config', displayName: 'Pending Config', isActive: true, order: 1 }]
                : [
                      { statusKey: 'pending', displayName: 'Pending', isActive: true, order: 1 },
                      { statusKey: 'successful', displayName: 'Successful', isActive: true, order: 2 },
                  ],
        loading: false,
        error: null,
    }),
    getStatusDisplayName: (key, statuses) => statuses.find((s) => s.statusKey === key)?.displayName || key,
    getStatusColor: () => '#6b7280',
}))

const okJson = (data) => Promise.resolve({ ok: true, json: async () => data })
const failJson = () => Promise.resolve({ ok: false, json: async () => ({}) })

function stubFetch({ products = [], displayName, inbox, orderUsers = [], chatSettings, express } = {}) {
    global.fetch = vi.fn((url) => {
        const u = String(url)
        if (u.startsWith('/api/product')) return okJson({ products })
        if (u.startsWith('/api/user/display-name')) {
            return displayName === undefined ? failJson() : okJson({ displayName })
        }
        if (u.startsWith('/api/chat/inbox')) return inbox ? okJson(inbox) : failJson()
        if (u.startsWith('/api/chat/settings')) return chatSettings ? okJson(chatSettings) : failJson()
        if (u.startsWith('/api/user/orders')) return okJson(orderUsers)
        if (u.startsWith('/api/user/express')) return okJson(express || {})
        return failJson()
    })
}

beforeEach(() => {
    mockUser = { id: 'user_1', firstName: null, createdAt: '2024-01-01T00:00:00Z', publicMetadata: {} }
})

// The home always renders inside the shared shell (app/dashboard/layout.jsx),
// which also owns the shop-identity fetch the greeting/checklist read.
const renderHome = () => render(
    <CreatorShell>
        <Dashboard />
    </CreatorShell>,
)

afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
})

describe('Creator home', () => {
    it('greets with the fallback name when there is no display name or first name', async () => {
        stubFetch({})
        renderHome()
        // One-line greeting (client style): "Good evening, there." or the
        // pre-hydration "Hello, there."
        expect(await screen.findByText(/^(Good (morning|afternoon|evening)|Hello), there\.$/)).toBeInTheDocument()
    })

    it('renders the revenue card without crashing when products lack sales arrays', async () => {
        stubFetch({
            products: [
                { _id: 'p1', name: 'Widget', basePrice: { presentmentCurrency: 'SGD' } }, // no sales[]
                { _id: 'p2', name: 'Gadget', sales: [{ quantity: 2, price: 5, createdAt: new Date().toISOString() }] },
            ],
        })
        renderHome()
        expect(await screen.findByText('Revenue')).toBeInTheDocument()
        expect(screen.getByText(/Daily gross, last 30 days/)).toBeInTheDocument()
        expect(screen.getByText('Gross volume')).toBeInTheDocument()
        // "Shop pulse" was renamed to a self-explanatory title.
        expect(screen.getByText('Store at a glance')).toBeInTheDocument()
        expect(screen.queryByText('Shop pulse')).toBeNull()
    })

    it('renders inside the shared shell rail with Home as the active link', async () => {
        stubFetch({})
        renderHome()
        await screen.findByText(/there\.$/)
        expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'My products' })).toHaveAttribute('href', '/dashboard/products')
        expect(screen.getByRole('link', { name: 'Payouts' })).toHaveAttribute('href', '/dashboard/payouts')
        expect(screen.getByRole('link', { name: 'Discounts' })).toHaveAttribute('href', '/dashboard/discounts')
        expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/dashboard/messages')
    })

    it('shows a needs-attention row when the inbox reports unread messages', async () => {
        stubFetch({ inbox: { channels: [{ unreadCount: 2 }, { unreadCount: 0 }] } })
        renderHome()
        expect(await screen.findByText('2 unread messages')).toBeInTheDocument()
        expect(screen.getByText('Needs attention')).toBeInTheDocument()
    })

    it('hides the needs-attention block when nothing needs attention', async () => {
        stubFetch({})
        renderHome()
        await screen.findByText(/there\.$/)
        expect(screen.queryByText('Needs attention')).toBeNull()
    })

    it('renders an orders ledger row and opens the peek with status buttons', async () => {
        stubFetch({
            products: [{ _id: 'p1', name: 'Widget', basePrice: { presentmentCurrency: 'SGD' } }],
            orderUsers: [
                {
                    userId: 'buyer_1',
                    firstName: 'Ada',
                    emailAddresses: [{ emailAddress: 'ada@example.com' }],
                    orderHistory: [
                        {
                            _id: 'order123456789',
                            status: 'pending',
                            createdAt: new Date().toISOString(),
                            cartItem: { productId: 'p1', quantity: 1, price: 11.32, orderNote: 'Please gift wrap' },
                        },
                    ],
                },
            ],
        })
        renderHome()

        // Ledger row with product, total, and the hatch-mapped pending pill.
        const rowProduct = await screen.findByText('Widget')
        expect(screen.getByText('S$11.32')).toBeInTheDocument()
        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)

        // Row click opens the PeekPanel with per-orderType status buttons.
        fireEvent.click(rowProduct.closest('button'))
        expect(await screen.findByText('Update status')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Successful' })).toBeInTheDocument()
        expect(screen.getByText('Customer note')).toBeInTheDocument()
        expect(screen.getByText('Please gift wrap')).toBeInTheDocument()
        expect(screen.getByText('Tracking ID')).toBeInTheDocument()
    })

    it('collapses and re-expands a ledger day from its date strip', async () => {
        stubFetch({
            products: [{ _id: 'p1', name: 'Widget', basePrice: { presentmentCurrency: 'SGD' } }],
            orderUsers: [
                {
                    userId: 'buyer_1',
                    firstName: 'Ada',
                    orderHistory: [
                        {
                            _id: 'order123456789',
                            status: 'pending',
                            createdAt: new Date().toISOString(),
                            cartItem: { productId: 'p1', quantity: 1, price: 11.32 },
                        },
                    ],
                },
            ],
        })
        renderHome()
        await screen.findByText('Widget')

        // The date strip carries the day's order count and starts expanded.
        const strip = screen.getByRole('button', { name: /1 order$/ })
        expect(strip).toHaveAttribute('aria-expanded', 'true')

        fireEvent.click(strip)
        expect(strip).toHaveAttribute('aria-expanded', 'false')
        expect(screen.queryByText('Widget')).toBeNull()

        fireEvent.click(strip)
        expect(strip).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByText('Widget')).toBeInTheDocument()
    })

    it('shows the setup checklist with hatch-todo rows deep-linking to each task', async () => {
        stubFetch({}) // nothing configured → 0/5 done
        renderHome()
        expect(await screen.findByText('Set up your shop')).toBeInTheDocument()
        expect(screen.getByText('0/5 done')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Finish Stripe payouts onboarding/ })).toHaveAttribute(
            'href',
            '#stripe-payouts',
        )
        expect(screen.getByRole('link', { name: /Publish your first product/ })).toHaveAttribute(
            'href',
            '/dashboard/products/create',
        )
        expect(screen.getByRole('link', { name: /Set a chat welcome message/ })).toHaveAttribute(
            'href',
            '/dashboard/messages',
        )
    })

    it('collapses the checklist to "Setup 4/5" when only one task remains, expanding on click', async () => {
        stubFetch({
            displayName: 'Atelier', // named shop ✓
            chatSettings: { autoReplyMessage: 'Welcome to my shop!' }, // welcome ✓
            products: [{ _id: 'p1', name: 'Widget', basePrice: { presentmentCurrency: 'SGD' } }], // product ✓
            orderUsers: [
                {
                    userId: 'buyer_1',
                    orderHistory: [
                        {
                            _id: 'order1',
                            status: 'successful',
                            createdAt: new Date().toISOString(),
                            cartItem: { productId: 'p1', quantity: 1, price: 5 },
                        },
                    ],
                },
            ], // sale ✓ — Stripe onboarding is the one left
        })
        renderHome()
        const summary = await screen.findByText('Setup 4/5')
        expect(screen.queryByText('Set up your shop')).toBeNull()

        fireEvent.click(summary.closest('button'))
        expect(await screen.findByText('Set up your shop')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Finish Stripe payouts onboarding/ })).toBeInTheDocument()
        expect(screen.getByText('Name your shop')).toBeInTheDocument() // done row, no link
        expect(screen.queryByRole('link', { name: /Name your shop/ })).toBeNull()
    })

    it('hides the checklist entirely at 5/5', async () => {
        mockUser = { ...mockUser, publicMetadata: { stripeAccountId: 'acct_1' } }
        stubFetch({
            displayName: 'Atelier',
            chatSettings: { autoReplyMessage: 'Welcome!' },
            express: { onboarded: true },
            products: [{ _id: 'p1', name: 'Widget', basePrice: { presentmentCurrency: 'SGD' } }],
            orderUsers: [
                {
                    userId: 'buyer_1',
                    orderHistory: [
                        {
                            _id: 'order1',
                            status: 'successful',
                            createdAt: new Date().toISOString(),
                            cartItem: { productId: 'p1', quantity: 1, price: 5 },
                        },
                    ],
                },
            ],
        })
        renderHome()
        await screen.findByText('Widget') // ledger row → all data settled
        expect(screen.queryByText('Set up your shop')).toBeNull()
        expect(screen.queryByText(/^Setup \d\/5$/)).toBeNull()
    })
})
