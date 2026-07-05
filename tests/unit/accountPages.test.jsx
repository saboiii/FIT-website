// RTL smokes for the redesigned customer account area ("Sunlit Paper"):
// the hub rail renders every section + service destination, ?tab= deep links
// land on the right section (other pages link ?tab=billing / ?tab=downloads),
// every legacy capability stays reachable, the orders ledger groups by day
// with a peek + detail-page link, the prints view shows status/quote/progress,
// and no rendered copy contains an em dash or middot (blueprint §10.1).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react'
import dayjs from 'dayjs'
import Account from '@/app/account/[[...rest]]/Account'
import AccountPrintRequestsPage from '@/app/account/prints/page'
import OrderPage from '@/app/account/orders/[orderId]/OrderPage'

// jsdom has no ResizeObserver (ViewTabs observes its scroll strip).
global.ResizeObserver =
    global.ResizeObserver ||
    class {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

let mockUser = null
let mockTabParam = null

vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: mockUser, isLoaded: true }),
    useSession: () => ({ session: { id: 'sess_current' } }),
    useClerk: () => ({ signOut: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
    usePathname: () => '/account',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => ({ get: (key) => (key === 'tab' ? mockTabParam : null) }),
}))

vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: ({ src, alt }) => <img src={typeof src === 'string' ? src : ''} alt={alt} />,
}))

vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
    ToastProvider: ({ children }) => children,
}))

let mockSubscription = { subscription: null, loading: false, error: null }
vi.mock('@/utils/UserSubscriptionContext', () => ({
    useUserSubscription: () => mockSubscription,
}))

vi.mock('@/utils/useOrderStatuses', () => ({
    useOrderStatuses: () => ({
        orderStatuses: [
            { statusKey: 'pending', displayName: 'Pending' },
            { statusKey: 'delivered', displayName: 'Delivered' },
        ],
        loading: false,
        error: null,
    }),
    getStatusDisplayName: (key, statuses) =>
        statuses.find((s) => s.statusKey === key)?.displayName ||
        key.charAt(0).toUpperCase() + key.slice(1),
    getStatusColor: () => '#6b7280',
}))

const PRODUCT_ID = '507f1f77bcf86cd799439011'
const ORDER_A = 'a1b2c3d4e5f6a7b8c9d0e1f2'
const ORDER_B = 'b1b2c3d4e5f6a7b8c9d0e1f3'
const DAY_A = '2026-07-02T09:00:00Z'
const DAY_B = '2026-07-01T09:00:00Z'

const hubOrders = [
    {
        _id: ORDER_A,
        createdAt: DAY_A,
        status: 'pending',
        orderType: 'order',
        cartItem: {
            productId: PRODUCT_ID,
            quantity: 2,
            price: 20,
            finalPrice: 20,
            chosenDeliveryType: 'standard',
            currency: 'S',
            orderNote: 'Please pack well',
        },
    },
    {
        _id: ORDER_B,
        createdAt: DAY_B,
        status: 'delivered',
        orderType: 'order',
        cartItem: {
            productId: PRODUCT_ID,
            quantity: 1,
            price: 10,
            chosenDeliveryType: 'pickup',
            currency: 'S',
        },
    },
]

const products = [
    { _id: PRODUCT_ID, name: 'Benchy', images: [], description: 'A little boat', slug: 'benchy' },
]

const detailOrder = {
    _id: '665f1f77bcf86cd799439099',
    createdAt: DAY_B,
    status: 'shipped',
    trackingId: 'SPX123456789',
    statusHistory: [
        { status: 'pending', timestamp: DAY_B },
        { status: 'shipped', timestamp: DAY_A },
    ],
    cartItem: {
        productId: PRODUCT_ID,
        quantity: 1,
        price: 25,
        finalPrice: 25,
        chosenDeliveryType: 'standard',
        currency: 'S',
    },
    contact: null,
}

const printRequests = [
    {
        requestId: 'REQ-123',
        status: 'quoted',
        basePrice: 15,
        printFee: 5,
        currency: 'sgd',
        modelFile: { originalName: 'benchy.stl' },
        statusHistory: [
            { status: 'pending_config', updatedAt: DAY_B },
            { status: 'quoted', updatedAt: DAY_A, note: 'Quoted by the print farm' },
        ],
    },
]

const okJson = (data) => Promise.resolve({ ok: true, json: async () => data })
const failJson = () => Promise.resolve({ ok: false, json: async () => ({}) })

function stubFetch() {
    global.fetch = vi.fn((url) => {
        const u = String(url)
        if (u.startsWith('/api/user/orders?orderId=')) return okJson({ order: detailOrder, userDetails: null })
        if (u.startsWith('/api/user/orders')) return okJson({ orders: hubOrders })
        if (u.startsWith('/api/product')) return okJson({ products })
        if (u.startsWith('/api/asset/storage'))
            return okJson({ transactions: [{ _id: 't1', productId: PRODUCT_ID, assets: ['model.stl', 'photo.png'] }] })
        if (u.startsWith('/api/user/contact/phone')) return okJson({ phone: { countryCode: '+65', number: '81234567' } })
        if (u.startsWith('/api/user/contact/address'))
            return okJson({
                address: {
                    street: '1 Maker Way',
                    unitNumber: '01-01',
                    city: 'Singapore',
                    state: '',
                    postalCode: '123456',
                    country: 'Singapore',
                },
            })
        if (u.startsWith('/api/account/custom-print')) return okJson({ requests: printRequests })
        if (u.startsWith('/api/admin/settings'))
            return okJson({
                orderStatuses: [
                    { statusKey: 'pending', displayName: 'Order Placed' },
                    { statusKey: 'shipped', displayName: 'Shipped Out' },
                ],
            })
        return failJson()
    })
}

beforeEach(() => {
    mockTabParam = null
    mockSubscription = { subscription: null, loading: false, error: null }
    mockUser = {
        id: 'user_1',
        firstName: 'Saba',
        lastName: 'M',
        fullName: 'Saba M',
        hasImage: true,
        passwordEnabled: true,
        imageUrl: '',
        primaryEmailAddress: { emailAddress: 'saba@example.com' },
        externalAccounts: [{ provider: 'google', emailAddress: 'saba@gmail.com' }],
        getSessions: async () => [
            {
                id: 'sess_current',
                lastActiveAt: DAY_A,
                latestActivity: {
                    deviceType: 'Macintosh',
                    browserName: 'Chrome',
                    browserVersion: '126',
                    city: 'Singapore',
                    country: 'SG',
                    ipAddress: '1.2.3.4',
                },
            },
        ],
    }
    stubFetch()
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const NO_EM_DASH_OR_MIDDOT = /[—·]/

describe('Account hub', () => {
    it('renders every section tab and service destination in the rail', () => {
        render(<Account />)
        const nav = screen.getByRole('navigation', { name: 'Account' })
        ;['Overview', 'Profile', 'Security', 'Orders', 'Billing', 'Downloads'].forEach((label) => {
            expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument()
        })
        expect(within(nav).getByRole('link', { name: 'Print requests' })).toHaveAttribute(
            'href',
            '/account/prints',
        )
        expect(within(nav).getByRole('link', { name: 'Subscription' })).toHaveAttribute(
            'href',
            '/account/subscription',
        )
        // The greeting header is present.
        expect(screen.getByText('Saba.')).toBeInTheDocument()
    })

    it('lands on the overview by default with latest order, subscription and completeness hints', async () => {
        render(<Account />)
        expect(await screen.findByText(`#${ORDER_A.slice(-8).toUpperCase()}`)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'View order' })).toHaveAttribute(
            'href',
            `/account/orders/${ORDER_A}`,
        )
        expect(screen.getByText(/free tier/i)).toBeInTheDocument()
        expect(screen.getByText('Profile completeness')).toBeInTheDocument()
        expect(await screen.findByText('Digital purchases')).toBeInTheDocument()
        await waitFor(() =>
            expect(document.body.textContent).toContain('1 purchase with downloadable files'),
        )
    })

    it('?tab=downloads deep link lands on the downloads section (product pages link here)', async () => {
        mockTabParam = 'downloads'
        render(<Account />)
        expect(await screen.findByText('Your digital purchases')).toBeInTheDocument()
        // Every purchased asset is downloadable, and the product name links to its page.
        expect(await screen.findByRole('button', { name: /stl/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /png/ })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Benchy' })).toHaveAttribute('href', '/products/benchy')
    })

    it('?tab=billing deep link lands on the contact section with view + edit (the cart links here)', async () => {
        mockTabParam = 'billing'
        render(<Account />)
        expect(await screen.findByText('Billing & contact')).toBeInTheDocument()
        expect(await screen.findByText('+65 81234567')).toBeInTheDocument()
        expect(screen.getByText(/1 Maker Way/)).toBeInTheDocument()
        // Edit mode exposes every address field.
        fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
        ;['Street', 'Unit number', 'City', 'State', 'Postal code', 'Country', 'Code', 'Number'].forEach(
            (label) => expect(screen.getByText(label)).toBeInTheDocument(),
        )
    })

    it('profile section keeps name/email editing and connected accounts', async () => {
        mockTabParam = 'profile'
        render(<Account />)
        expect(await screen.findByText('Saba M')).toBeInTheDocument()
        expect(screen.getByText('saba@example.com')).toBeInTheDocument()
        expect(await screen.findByText('saba@gmail.com')).toBeInTheDocument()
        expect(screen.getByText('Connected accounts')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: /Edit/ }))
        expect(screen.getByLabelText('First name')).toHaveValue('Saba')
        expect(screen.getByLabelText('Email address')).toHaveValue('saba@example.com')
    })

    it('security section keeps password edit, device sign-out and delete via ConfirmDialog', async () => {
        mockTabParam = 'security'
        render(<Account />)
        expect(await screen.findByText('Password')).toBeInTheDocument()
        expect(await screen.findByText('Macintosh')).toBeInTheDocument()
        expect(screen.getByText('This device')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Sign out of device' })).toBeInTheDocument()
        // Delete goes through a ConfirmDialog, never window.confirm.
        fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
        expect(await screen.findByText('Delete your account?')).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('orders section groups by day with collapsible strips and a peek carrying the detail link', async () => {
        mockTabParam = 'orders'
        render(<Account />)
        const dayA = dayjs(DAY_A).format('D MMM YYYY')
        const dayB = dayjs(DAY_B).format('D MMM YYYY')
        expect(await screen.findByText(dayA)).toBeInTheDocument()
        expect(screen.getByText(dayB)).toBeInTheDocument()
        expect(screen.getAllByText('Benchy').length).toBe(2)
        expect(screen.getAllByText('1 order').length).toBe(2)

        // Collapsing a day hides its rows.
        const dayStrip = screen.getByText(dayB).closest('button')
        fireEvent.click(dayStrip)
        expect(screen.getAllByText('Benchy').length).toBe(1)
        fireEvent.click(dayStrip)

        // Row click opens the peek with order facts + the full detail link.
        fireEvent.click(screen.getAllByText('Benchy')[0].closest('button'))
        expect(await screen.findByRole('link', { name: 'View full order' })).toHaveAttribute(
            'href',
            `/account/orders/${ORDER_A}`,
        )
        expect(screen.getByText('Please pack well')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Copy order ID' })).toBeInTheDocument()
    })
})

describe('Order detail page', () => {
    it('shows a status timeline from statusHistory plus tracking and totals', async () => {
        render(<OrderPage orderId={detailOrder._id} />)
        expect(await screen.findByText('Order progress')).toBeInTheDocument()
        // Status names come from the admin settings, newest first.
        expect(screen.getByText('Shipped Out')).toBeInTheDocument()
        expect(screen.getByText('Order Placed')).toBeInTheDocument()
        expect(screen.getByText('SPX123456789')).toBeInTheDocument()
        expect(screen.getByText('Total')).toBeInTheDocument()
        expect(document.body.textContent).toContain('S$25.00')
        // Rail present with a route back to the hub sections.
        expect(screen.getByRole('navigation', { name: 'Account' })).toBeInTheDocument()
    })
})

describe('Prints page', () => {
    it('shows each request with status, quote breakdown, progress and actions', async () => {
        render(<AccountPrintRequestsPage />)
        expect(await screen.findByText('benchy.stl')).toBeInTheDocument()
        // Status pill + timeline entry both carry the label.
        expect(screen.getAllByText('Quote received').length).toBeGreaterThanOrEqual(2)
        expect(screen.getByText('REQ-123')).toBeInTheDocument()
        expect(screen.getByText('Base price')).toBeInTheDocument()
        expect(screen.getByText('Print fee')).toBeInTheDocument()
        expect(document.body.textContent).toContain('SGD 15.00')
        expect(document.body.textContent).toContain('SGD 20.00')
        expect(screen.getByText('Quoted by the print farm')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Open in editor' })).toHaveAttribute(
            'href',
            '/editor?requestId=REQ-123',
        )
        expect(screen.getByRole('link', { name: 'Add quoted print to cart' })).toHaveAttribute(
            'href',
            '/cart?addCustomRequest=REQ-123',
        )
        expect(screen.getByRole('link', { name: 'New request' })).toHaveAttribute('href', '/prints/request')
    })
})

describe('Punctuation law (§10.1)', () => {
    const tabs = ['overview', 'profile', 'security', 'orders', 'billing', 'downloads']

    tabs.forEach((tab) => {
        it(`hub ${tab} section renders no em dash or middot`, async () => {
            mockTabParam = tab
            render(<Account />)
            // Let fetched content settle before scanning the copy.
            await screen.findByRole('navigation', { name: 'Account' })
            await new Promise((r) => setTimeout(r, 0))
            expect(document.body.textContent).not.toMatch(NO_EM_DASH_OR_MIDDOT)
        })
    })

    it('prints page and order detail render no em dash or middot', async () => {
        render(<AccountPrintRequestsPage />)
        await screen.findByText('benchy.stl')
        expect(document.body.textContent).not.toMatch(NO_EM_DASH_OR_MIDDOT)
        cleanup()

        render(<OrderPage orderId={detailOrder._id} />)
        await screen.findByText('Order progress')
        expect(document.body.textContent).not.toMatch(NO_EM_DASH_OR_MIDDOT)
    })
})
