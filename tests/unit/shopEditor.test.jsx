// RTL smokes for the /dashboard/shop editor: fields hydrate from GET
// /api/user/shop, Save PUTs the bounded payload, and the featured picker
// caps selections at 8 (order = click order).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import ShopEditor from '@/app/dashboard/shop/page'

// Entitlements: creator by default (gating cases override entitlementsState).
const entitlementsState = { loading: false, canAccessDashboard: true, canUseMessaging: true }
vi.mock('@/utils/useEntitlements', () => ({ default: () => entitlementsState }))

const showToast = vi.fn()

vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: { id: 'user_1', firstName: 'Ada' }, isLoaded: true }),
}))
vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast }),
}))
vi.mock('@/components/DashboardComponents/CreatorShell', () => ({
    useShopIdentity: () => ({ displayName: 'Ada Prints', displayNameAvailable: true }),
    CreatorGate: ({ children }) => children,
}))
// react-image-crop pulls CSS; the crop flow is exercised manually, not here.
vi.mock('@/components/DashboardComponents/ShopImageCropModal', () => ({
    default: () => <div data-testid="crop-modal" />,
}))

const shopFixture = {
    bannerImage: '',
    logoImage: '',
    description: 'Handmade 3D prints',
    links: [{ label: 'Site', url: 'https://example.com' }],
    featuredProductIds: [],
    accentColor: '',
}

const makeProducts = (n) =>
    Array.from({ length: n }, (_, i) => ({ _id: `p${i}`, name: `Product ${i}`, images: [] }))

let putBodies

function stubFetch({ shop = shopFixture, products = [] } = {}) {
    putBodies = []
    global.fetch = vi.fn((url, opts = {}) => {
        const u = String(url)
        if (u.startsWith('/api/user/shop') && opts.method === 'PUT') {
            const body = JSON.parse(opts.body)
            putBodies.push(body)
            return Promise.resolve({ ok: true, json: async () => ({ success: true, shop: { ...shop, ...body } }) })
        }
        if (u.startsWith('/api/user/shop')) {
            return Promise.resolve({ ok: true, json: async () => ({ shop }) })
        }
        if (u.startsWith('/api/product')) {
            return Promise.resolve({ ok: true, json: async () => ({ products }) })
        }
        return Promise.resolve({ ok: false, json: async () => ({}) })
    })
}

beforeEach(() => {
    showToast.mockClear()
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('/dashboard/shop editor', () => {
    it('hydrates the fields from GET /api/user/shop', async () => {
        stubFetch({ products: makeProducts(2) })
        render(<ShopEditor />)

        expect(await screen.findByLabelText('Shop description')).toHaveValue('Handmade 3D prints')
        expect(screen.getByText('18/600')).toBeInTheDocument()
        expect(screen.getByLabelText('Link 1 label')).toHaveValue('Site')
        expect(screen.getByLabelText('Link 1 URL')).toHaveValue('https://example.com')
        expect(screen.getByRole('link', { name: /view shop/i })).toHaveAttribute(
            'href',
            '/creators/Ada%20Prints',
        )
        // Upload affordances + preview identity
        expect(screen.getByRole('button', { name: /upload banner/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /upload logo/i })).toBeInTheDocument()
        expect(screen.getByText('Ada Prints')).toBeInTheDocument()
    })

    it('saves via PUT with the cleaned payload', async () => {
        stubFetch({ products: makeProducts(2) })
        render(<ShopEditor />)

        const description = await screen.findByLabelText('Shop description')
        fireEvent.change(description, { target: { value: 'New words' } })

        fireEvent.click(screen.getByRole('button', { name: 'Add link' }))
        fireEvent.change(screen.getByLabelText('Link 2 label'), { target: { value: 'Insta' } })
        fireEvent.change(screen.getByLabelText('Link 2 URL'), { target: { value: 'instagram.com/ada' } })

        // Feature one product (click order)
        fireEvent.click(await screen.findByRole('button', { name: /product 1/i }))

        fireEvent.click(screen.getByRole('button', { name: 'Save' }))

        await waitFor(() => expect(putBodies).toHaveLength(1))
        expect(putBodies[0]).toEqual({
            description: 'New words',
            links: [
                { label: 'Site', url: 'https://example.com' },
                { label: 'Insta', url: 'https://instagram.com/ada' }, // scheme added
            ],
            featuredProductIds: ['p1'],
            accentColor: '',
        })
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('Shop saved', 'success'))
    })

    it('caps the featured picker at 8 selections in click order', async () => {
        stubFetch({ products: makeProducts(9) })
        render(<ShopEditor />)

        for (let i = 0; i < 9; i++) {
            fireEvent.click(await screen.findByRole('button', { name: new RegExp(`product ${i}$`, 'i') }))
        }

        const pressed = screen.getAllByRole('button', { pressed: true })
            .filter((b) => /product/i.test(b.textContent))
        expect(pressed).toHaveLength(8)
        expect(screen.getByText('8/8')).toBeInTheDocument()
        expect(showToast).toHaveBeenCalledWith('You can feature up to 8 products', 'error')

        // Re-click removes and frees a slot
        fireEvent.click(screen.getByRole('button', { name: /product 0/i }))
        expect(screen.getByText('7/8')).toBeInTheDocument()
    })

    it('never allows more than 6 links', async () => {
        stubFetch({ products: [] })
        render(<ShopEditor />)
        await screen.findByLabelText('Shop description')

        // 1 existing + 5 more = 6; the add button then disappears
        for (let i = 0; i < 5; i++) {
            fireEvent.click(screen.getByRole('button', { name: 'Add link' }))
        }
        expect(screen.queryByRole('button', { name: 'Add link' })).not.toBeInTheDocument()
        expect(screen.getByText('Links (6/6)')).toBeInTheDocument()
    })
})
