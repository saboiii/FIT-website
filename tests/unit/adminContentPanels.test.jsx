// RTL smokes for the two rethought admin input surfaces: Site Content's
// spatial page map (tabs + miniature page blocks driving ?sub=) and the
// custom print product document (numbered chapters, TOC rail, completeness
// summary, discount disclosure). Shared field components are mocked at the
// boundary; these tests pin the panels' own structure and wiring.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import ContentManagement from '@/components/Admin/DynamicContentManagement'
import CustomPrintProductManagement from '@/components/Admin/CustomPrintProductManagement'

vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))

// Heavy / fetch-y CMS field editors are not under test here.
vi.mock('@/components/Admin/CMSFields/RichTextEditor', () => ({ default: ({ label }) => <div>RTE:{label}</div> }))
vi.mock('@/components/Admin/CMSFields/ImageUpload', () => ({ default: ({ label }) => <div>IMG:{label}</div> }))
vi.mock('@/components/Admin/CMSFields/ProductSearch', () => ({ default: ({ label }) => <div>PS:{label}</div> }))
vi.mock('@/components/Admin/CMSFields/CategoryInput', () => ({ default: ({ label }) => <div>CAT:{label}</div> }))
vi.mock('@/components/Admin/CMSFields/ArrayField', () => ({ default: ({ label }) => <div>ARR:{label}</div> }))

// Shared product-form field groups (owned elsewhere) reduced to markers.
vi.mock('@/components/DashboardComponents/ProductFormFields/PricingFields', () => ({ default: () => <div>PricingFieldsMock</div> }))
vi.mock('@/components/DashboardComponents/ProductFormFields/ShippingFields', () => ({ default: () => <div>ShippingFieldsMock</div> }))
vi.mock('@/components/DashboardComponents/ProductFormFields/DiscountsField', () => ({ default: () => <div>DiscountsFieldMock</div> }))
vi.mock('@/components/DashboardComponents/ProductFormFields/ImagesField', () => ({ default: () => <div>ImagesFieldMock</div> }))

const ok = (payload) => Promise.resolve({ ok: true, json: async () => payload })

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
    window.localStorage.clear()
})

describe('ContentManagement — spatial page map picker', () => {
    beforeEach(() => {
        window.history.replaceState(null, '', '/')
        global.fetch = vi.fn((url) => {
            const u = String(url)
            if (u.includes('/api/admin/content')) return ok({ frontmatter: {}, content: '' })
            return ok({})
        })
    })

    it('shows page tabs and the homepage map with plain-language regions', async () => {
        render(<ContentManagement />)
        await screen.findByRole('button', { name: 'Featured products' })

        // One tab per page group (§9.3).
        expect(screen.getByRole('tab', { name: 'Home' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'About' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Shop & Prints' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Legal' })).toBeInTheDocument()

        // Homepage blocks in page order, plus fixed context blocks.
        expect(screen.getByRole('button', { name: 'Announcement bar' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Hero banner' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Testimonials' })).toBeInTheDocument()
        expect(screen.getByText('Footer')).toBeInTheDocument()

        // Default region is selected and named in the save bar.
        expect(screen.getByRole('button', { name: 'Featured products', pressed: true })).toBeInTheDocument()
    })

    it('clicking a region fetches its content and mirrors it into ?sub=', async () => {
        render(<ContentManagement />)
        await screen.findByRole('button', { name: 'Featured products' })

        fireEvent.click(screen.getByRole('button', { name: 'Hero banner' }))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/content?path=home/hero-banner')
        })
        expect(screen.getByRole('button', { name: 'Hero banner', pressed: true })).toBeInTheDocument()
        expect(decodeURIComponent(window.location.search)).toContain('sub=home/hero-banner')
    })

    it('switching to the Legal tab lands on the terms document', async () => {
        render(<ContentManagement />)
        await screen.findByRole('button', { name: 'Featured products' })

        fireEvent.click(screen.getByRole('tab', { name: 'Legal' }))

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/content?path=terms/content')
        })
        expect(screen.getByRole('button', { name: 'Terms of service', pressed: true })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Privacy policy' })).toBeInTheDocument()
    })
})

describe('CustomPrintProductManagement — chaptered document', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url) => {
            const u = String(url)
            if (u.includes('/api/product/custom-print-config')) {
                return ok({
                    product: {
                        _id: 'prod_1',
                        name: 'Custom 3D Print',
                        description: 'We print your models.',
                        images: ['a.png'],
                        basePrice: { presentmentCurrency: 'SGD', presentmentAmount: 25 },
                        priceCredits: 0,
                        delivery: { deliveryTypes: [{ deliveryTypeId: 'dt_1', price: 5 }] },
                        dimensions: { length: '', width: '', height: '', weight: '' },
                        discount: {},
                    },
                })
            }
            if (u.includes('/api/admin/events')) return ok({ events: [] })
            return ok({})
        })
    })

    it('renders five numbered chapters with a contents rail and completeness summary', async () => {
        render(<CustomPrintProductManagement />)
        await screen.findByRole('heading', { name: 'Basics' })

        for (const title of ['Basics', 'Photos', 'Pricing', 'Delivery', 'Discounts']) {
            expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
        }

        // TOC rail with numbered jump links.
        const rail = screen.getByRole('navigation', { name: 'Form contents' })
        expect(within(rail).getByRole('button', { name: /1\. Basics/ })).toBeInTheDocument()
        expect(within(rail).getByRole('button', { name: /5\. Discounts/ })).toBeInTheDocument()

        // All four required chapters are complete for this fixture.
        expect(screen.getByText('4 of 4 sections ready')).toBeInTheDocument()

        // Every relocated field surface is still present.
        expect(screen.getByText('ImagesFieldMock')).toBeInTheDocument()
        expect(screen.getByText('PricingFieldsMock')).toBeInTheDocument()
        expect(screen.getByText('ShippingFieldsMock')).toBeInTheDocument()
    })

    it('keeps discount settings behind a disclosure until asked for', async () => {
        render(<CustomPrintProductManagement />)
        await screen.findByRole('heading', { name: 'Discounts' })

        expect(screen.queryByText('DiscountsFieldMock')).toBeNull()
        fireEvent.click(screen.getByRole('button', { name: 'Set up a discount' }))
        expect(screen.getByText('DiscountsFieldMock')).toBeInTheDocument()
    })
})
