// RTL smokes for the rebuilt customer order detail page (references:
// docs/account-ui-reference-images/order-details.png + order-progress.png):
// facts strip (order date / delivered date when derivable / order ID with
// copy / Stripe payment method), icon-step progress timeline mapped from the
// real status set + statusHistory timestamps (with the honest fallbacks for
// exception statuses and missing history), thumbnail item rows through the
// image proxy, cost summary derived from existing cartItem fields, address
// blocks (order/user contact for shipping, Stripe billing), a print-friendly
// summary button, and the §10.1 punctuation law.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import OrderPage from '@/app/account/orders/[orderId]/OrderPage'

// jsdom has no ResizeObserver (ViewTabs in the AccountShell observes its strip).
global.ResizeObserver =
    global.ResizeObserver ||
    class {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

vi.mock('next/navigation', () => ({
    usePathname: () => '/account/orders/x',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => ({ get: () => null }),
}))

vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: ({ src, alt }) => <img src={typeof src === 'string' ? src : ''} alt={alt} />,
}))

vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
    ToastProvider: ({ children }) => children,
}))

const PRODUCT_ID = '507f1f77bcf86cd799439011'
const ORDER_ID = '665f1f77bcf86cd799439099'
const PLACED_AT = '2026-07-01T09:00:00Z'
const SHIPPED_AT = '2026-07-02T10:00:00Z'
const DELIVERED_AT = '2026-07-05T03:00:00Z'

const product = {
    _id: PRODUCT_ID,
    name: 'Benchy',
    images: ['products/benchy.png'],
    description: 'A little boat',
    slug: 'benchy',
}

const baseOrder = {
    _id: ORDER_ID,
    createdAt: PLACED_AT,
    status: 'shipped',
    trackingId: 'SPX123456789',
    stripeSessionId: 'cs_test_123',
    statusHistory: [
        { status: 'pending', timestamp: PLACED_AT },
        { status: 'shipped', timestamp: SHIPPED_AT },
    ],
    cartItem: {
        productId: PRODUCT_ID,
        quantity: 2,
        price: 25,
        basePrice: 25,
        priceBeforeDiscount: 25,
        finalPrice: 22.5,
        deliveryFee: 5,
        chosenDeliveryType: 'standard',
        currency: 'S',
        orderNote: 'Leave at the door',
    },
}

const userDetails = {
    name: 'Saba M',
    email: 'saba@example.com',
    phone: '+65 81234567',
    contact: {
        phone: { countryCode: '+65', number: '81234567' },
        address: {
            street: '1 Maker Way',
            unitNumber: '01-01',
            city: 'Singapore',
            state: '',
            postalCode: '123456',
            country: 'Singapore',
        },
    },
}

const paymentPayload = {
    paymentMethod: { type: 'card', card: { brand: 'visa', last4: '4242' } },
    customerDetails: {
        name: 'Saba M',
        email: 'saba@example.com',
        address: { line1: '2 Bill Street', city: 'Singapore', postal_code: '654321', country: 'SG' },
    },
}

const okJson = (data) => Promise.resolve({ ok: true, json: async () => data })
const failJson = () => Promise.resolve({ ok: false, json: async () => ({}) })

function stubFetch(order) {
    global.fetch = vi.fn((url) => {
        const u = String(url)
        if (u.startsWith('/api/user/orders?orderId=')) return okJson({ order, userDetails })
        if (u.startsWith('/api/product')) return okJson({ products: [product] })
        if (u.startsWith('/api/checkout/payment-method')) return okJson(paymentPayload)
        if (u.startsWith('/api/admin/settings'))
            return okJson({
                orderStatuses: [
                    { statusKey: 'pending', displayName: 'Order Placed' },
                    { statusKey: 'shipped', displayName: 'Shipped Out' },
                    { statusKey: 'delivered', displayName: 'Delivered' },
                    { statusKey: 'cancelled', displayName: 'Cancelled' },
                ],
            })
        return failJson()
    })
}

beforeEach(() => {
    stubFetch(baseOrder)
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('Order detail facts strip', () => {
    it('shows order date, order ID with copy, and the Stripe payment method', async () => {
        render(<OrderPage orderId={ORDER_ID} />)
        expect(await screen.findByText('Order placed')).toBeInTheDocument()
        expect(screen.getByText('1 Jul 2026')).toBeInTheDocument()
        expect(screen.getByText(`#${ORDER_ID.slice(-8).toUpperCase()}`)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Copy order ID' })).toBeInTheDocument()
        // Payment method comes from the existing Stripe payment-method fetch.
        expect(await screen.findByText('visa')).toBeInTheDocument()
        expect(screen.getByText('•••• 4242')).toBeInTheDocument()
        // No delivered date is invented while the order is still in transit.
        expect(screen.queryByText('5 Jul 2026')).toBeNull()
    })

    it('shows the delivered date only when statusHistory really carries it', async () => {
        stubFetch({
            ...baseOrder,
            status: 'delivered',
            statusHistory: [...baseOrder.statusHistory, { status: 'delivered', timestamp: DELIVERED_AT }],
        })
        render(<OrderPage orderId={ORDER_ID} />)
        expect(await screen.findByText('5 Jul 2026')).toBeInTheDocument()
        // Delivered shop orders also nudge back to the product's reviews.
        expect(screen.getByRole('link', { name: 'Rate your experience' })).toHaveAttribute(
            'href',
            '/products/benchy#reviews',
        )
    })
})

describe('Order progress', () => {
    it('renders icon steps from the real flow with statusHistory timestamps and the status chip', async () => {
        render(<OrderPage orderId={ORDER_ID} />)
        expect(await screen.findByText('Order progress')).toBeInTheDocument()
        // Canonical steps, each with a plain-language description.
        ;['Order confirmed', 'Processing', 'Shipped', 'Delivered'].forEach((step) => {
            expect(screen.getByText(step)).toBeInTheDocument()
        })
        expect(screen.getByText('Order placed and payment received.')).toBeInTheDocument()
        expect(screen.getByText('Handed to the courier.')).toBeInTheDocument()
        // Timestamps come from statusHistory (shipped entry), not invented.
        expect(document.body.textContent).toContain('2 Jul')
        // The chip carries the admin display name for the current status.
        expect(screen.getByText('Shipped Out')).toBeInTheDocument()
        // Tracking stays copyable.
        expect(screen.getByText('SPX123456789')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Copy tracking ID' })).toBeInTheDocument()
    })

    it('falls back to the raw history timeline for exception statuses', async () => {
        stubFetch({
            ...baseOrder,
            status: 'cancelled',
            statusHistory: [
                { status: 'pending', timestamp: PLACED_AT },
                { status: 'cancelled', timestamp: SHIPPED_AT },
            ],
        })
        render(<OrderPage orderId={ORDER_ID} />)
        expect(await screen.findByText('Order progress')).toBeInTheDocument()
        // No fabricated fulfilment steps for a cancelled order.
        expect(screen.queryByText('Handed to the courier.')).toBeNull()
        // The raw history renders with admin display names.
        expect(screen.getAllByText('Cancelled').length).toBeGreaterThanOrEqual(2)
        expect(screen.getByText('Order Placed')).toBeInTheDocument()
    })

    it('keeps the honest single-status fallback when no history exists', async () => {
        stubFetch({ ...baseOrder, statusHistory: [] })
        render(<OrderPage orderId={ORDER_ID} />)
        expect(await screen.findByText('Order progress')).toBeInTheDocument()
        expect(
            screen.getByText(/A step-by-step history will appear here as it progresses/),
        ).toBeInTheDocument()
        expect(screen.queryByText('Order confirmed')).toBeNull()
    })
})

describe('Order items, cost summary and addresses', () => {
    it('shows the thumbnail item row and derives the cost summary from existing fields', async () => {
        render(<OrderPage orderId={ORDER_ID} />)
        expect(await screen.findByText('Items')).toBeInTheDocument()
        // Thumbnail resolves the S3 key through the image proxy.
        expect(await screen.findByAltText('Benchy')).toHaveAttribute(
            'src',
            `/api/proxy?key=${encodeURIComponent('products/benchy.png')}`,
        )
        expect(screen.getByText('Qty 2')).toBeInTheDocument()
        // Subtotal = finalPrice x qty, shipping = deliveryFee, discount derived,
        // total = price x qty. No invented taxes row.
        expect(screen.getByText('Subtotal')).toBeInTheDocument()
        expect(document.body.textContent).toContain('S$45.00')
        expect(screen.getByText('Shipping (standard)')).toBeInTheDocument()
        expect(document.body.textContent).toContain('S$5.00')
        expect(screen.getByText('Discount')).toBeInTheDocument()
        expect(screen.getByText('Total')).toBeInTheDocument()
        expect(document.body.textContent).toContain('S$50.00')
        expect(document.body.textContent).not.toContain('Taxes')
        // The customer's note survives.
        expect(screen.getByText('Leave at the door')).toBeInTheDocument()
        // Buy it again routes back to the live product.
        expect(screen.getByRole('link', { name: 'Buy it again' })).toHaveAttribute(
            'href',
            '/products/benchy',
        )
    })

    it('shows the shipping address from the saved contact and billing from Stripe', async () => {
        render(<OrderPage orderId={ORDER_ID} />)
        expect(await screen.findByText('Shipping address')).toBeInTheDocument()
        expect(screen.getByText('1 Maker Way')).toBeInTheDocument()
        expect(await screen.findByText('Billing address')).toBeInTheDocument()
        expect(screen.getByText('2 Bill Street')).toBeInTheDocument()
        expect(screen.getByText('Shipping method')).toBeInTheDocument()
    })
})

describe('Print-friendly summary', () => {
    it('offers a print button that calls window.print', async () => {
        window.print = vi.fn()
        render(<OrderPage orderId={ORDER_ID} />)
        const button = await screen.findByRole('button', { name: /Print summary/ })
        fireEvent.click(button)
        expect(window.print).toHaveBeenCalled()
    })
})

describe('Punctuation law (§10.1)', () => {
    it('order detail renders no em dash or middot', async () => {
        render(<OrderPage orderId={ORDER_ID} />)
        await screen.findByText('Order progress')
        await screen.findByText('visa')
        expect(document.body.textContent).not.toMatch(/[—·]/)
    })
})
