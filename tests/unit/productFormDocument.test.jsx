// RTL smokes for the product document form (blueprint §5.5): section
// headings flow in document order, empty-required submit turns rail dots bad
// and raises ONE summarizing toast (no crash), and delete flows through
// ConfirmDialog then navigates back to the list.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import ProductForm from '@/components/DashboardComponents/ProductForm'

const push = vi.fn()
const showToast = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
}))
vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: { id: 'user_1' }, isLoaded: true }),
}))
vi.mock('@/utils/useAccess', () => ({
    default: () => ({ loading: false, canAccess: true, isAdmin: false }),
}))
vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast }),
    ToastProvider: ({ children }) => children,
}))
// IMPORTANT: stable object identity — ProductForm's settings effect depends
// on `adminSettings` by reference, so a fresh object per render would loop
// the effect forever (the real context memoizes it).
const ADMIN_SETTINGS = {
    settings: {
        deliveryTypes: [
            {
                name: 'standard',
                displayName: 'Standard Delivery',
                isActive: true,
                applicableToProductTypes: ['print', 'shop'],
                pricingTiers: [],
            },
        ],
        categories: [
            {
                name: 'gadgets',
                displayName: 'Gadgets',
                type: 'print',
                isActive: true,
                subcategories: [{ name: 'small', displayName: 'Small', isActive: true }],
            },
        ],
        printColours: [],
    },
    loading: false,
    error: null,
}
vi.mock('@/utils/AdminSettingsContext', () => ({
    useAdminSettings: () => ADMIN_SETTINGS,
}))

// Section headings in the §5.5 document order (print product → all 10).
const SECTION_HEADINGS = [
    'Basics',
    'Photos',
    '3D model',
    'Digital files',
    'Print settings',
    'Delivery',
    'Pricing',
    'Variants',
    'Discounts',
    'Stock',
]

beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    push.mockReset()
    showToast.mockReset()
})

describe('Product document form', () => {
    it('renders every section heading in document order', async () => {
        render(<ProductForm mode="Create" />)
        // Non-admins are forced onto print products, so Print settings renders.
        const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)
        expect(headings).toEqual(SECTION_HEADINGS)
        // GlassBar carries the breadcrumb + title echo and the sun CTA.
        expect(screen.getByText('Untitled product')).toBeInTheDocument()
        expect(screen.getByText('Editing…')).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /Create Product/ }).length).toBeGreaterThan(0)
    })

    it('marks rail dots bad and shows one summarizing toast when required fields are missing', async () => {
        const { container } = render(<ProductForm mode="Create" />)
        await screen.findAllByRole('heading', { level: 2 })

        fireEvent.submit(container.querySelector('form'))

        await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1))
        const [message, type] = showToast.mock.calls[0]
        expect(message).toMatch(/^Missing required fields:/)
        expect(message).toContain('Product Name')
        expect(message).toContain('Delivery Type')
        expect(type).toBe('error')

        // Rail completeness dots turn bad for the offending sections.
        const badDots = container.querySelectorAll('[data-dot="bad"]')
        expect(badDots.length).toBeGreaterThan(0)
        // Basics + Photos + Delivery are the missing sections here.
        const badSections = new Set(
            Array.from(container.querySelectorAll('button[data-section]'))
                .filter((btn) => btn.querySelector('[data-dot="bad"]'))
                .map((btn) => btn.getAttribute('data-section')),
        )
        expect(badSections.has('basics')).toBe(true)
        expect(badSections.has('photos')).toBe(true)
        expect(badSections.has('delivery')).toBe(true)
        // No network call was made — validation stops the submit.
        expect(global.fetch).not.toHaveBeenCalled()
    })

    it('delete opens the ConfirmDialog and navigates to the list on confirm', async () => {
        global.fetch = vi.fn((url, opts = {}) => {
            if (opts.method === 'DELETE') {
                return Promise.resolve({ ok: true, json: async () => ({}) })
            }
            return Promise.resolve({ ok: true, json: async () => ({}) })
        })

        const product = {
            _id: 'p1',
            name: 'Widget',
            description: 'A widget',
            images: ['img/one.png'],
            paidAssets: [],
            productType: 'print',
            basePrice: { presentmentAmount: 10, presentmentCurrency: 'SGD' },
            priceCredits: 0,
            delivery: { deliveryTypes: [{ type: 'standard', price: 5 }] },
            dimensions: { length: 1, width: 1, height: 1, weight: 1 },
        }
        render(<ProductForm mode="Edit" product={product} />)
        await screen.findAllByRole('heading', { level: 2 })

        fireEvent.click(screen.getAllByRole('button', { name: 'Delete product' })[0])
        expect(await screen.findByText('Delete this product?')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Delete Product' }))

        await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/products'))
        expect(showToast).toHaveBeenCalledWith('Product deleted successfully!', 'success')
        expect(global.fetch).toHaveBeenCalledWith(
            '/api/product?productId=p1',
            expect.objectContaining({ method: 'DELETE' }),
        )
    })
})
