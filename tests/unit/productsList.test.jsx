// RTL smokes for the redesigned creator products list (blueprint §5.4):
// rows render (custom-print base product filtered out), the search WORKS,
// name/numberSold sorts toggle order, and the derived view tabs filter.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import MyProducts from '@/app/dashboard/products/page'

const push = vi.fn()
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
}))
vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: { id: 'user_1' }, isLoaded: true }),
}))

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
    {
        _id: 'p2',
        name: 'Beta Gadget',
        slug: 'beta-gadget',
        numberSold: 2,
        stock: 4,
        hidden: true,
        createdAt: '2026-01-03T00:00:00Z',
        basePrice: { presentmentAmount: 25.5, presentmentCurrency: 'SGD' },
    },
    {
        _id: 'p3',
        name: 'Zed Kit',
        slug: 'zed-kit',
        numberSold: 9,
        stock: 0,
        infiniteStock: false,
        createdAt: '2026-01-01T00:00:00Z',
        basePrice: { presentmentAmount: 5, presentmentCurrency: 'SGD' },
    },
    // The custom-print base product must never show on this list.
    { _id: 'CP1_CUSTOM_PRINT_CONFIG', name: 'Custom 3D Print', numberSold: 0 },
]

function rowNames(container) {
    return Array.from(container.querySelectorAll('[role="link"]')).map(
        (row) => row.querySelector('span.truncate')?.textContent,
    )
}

beforeEach(() => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ products: PRODUCTS }) }))
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    push.mockReset()
})

describe('Creator products list', () => {
    it('renders product rows with status pills and filters out the custom-print base product', async () => {
        const { container } = render(<MyProducts />)
        expect(await screen.findByText('Alpha Widget')).toBeInTheDocument()
        expect(screen.getByText('Beta Gadget')).toBeInTheDocument()
        expect(screen.getByText('Zed Kit')).toBeInTheDocument()
        expect(screen.queryByText('Custom 3D Print')).toBeNull()

        // Status vocabulary: Live (ok), Hidden (hatch), Out of stock (bad).
        expect(screen.getAllByText('Live').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0)
        expect(rowNames(container)).toHaveLength(3)
    })

    it('search filters rows by name', async () => {
        render(<MyProducts />)
        await screen.findByText('Alpha Widget')
        fireEvent.change(screen.getByLabelText('Search products'), { target: { value: 'beta' } })
        expect(screen.queryByText('Alpha Widget')).toBeNull()
        expect(screen.getByText('Beta Gadget')).toBeInTheDocument()
    })

    it('sorting by name and sold toggles the row order', async () => {
        const { container } = render(<MyProducts />)
        await screen.findByText('Alpha Widget')

        fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))
        expect(rowNames(container)).toEqual(['Alpha Widget', 'Beta Gadget', 'Zed Kit'])

        fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))
        expect(rowNames(container)).toEqual(['Zed Kit', 'Beta Gadget', 'Alpha Widget'])

        fireEvent.click(screen.getByRole('button', { name: 'Sort by Sold' }))
        expect(rowNames(container)).toEqual(['Beta Gadget', 'Alpha Widget', 'Zed Kit'])
    })

    it('view tabs filter to hidden and out-of-stock products', async () => {
        const { container } = render(<MyProducts />)
        await screen.findByText('Alpha Widget')

        fireEvent.click(screen.getByRole('tab', { name: /Hidden/ }))
        expect(rowNames(container)).toEqual(['Beta Gadget'])

        fireEvent.click(screen.getByRole('tab', { name: /Out of stock/ }))
        expect(rowNames(container)).toEqual(['Zed Kit'])

        fireEvent.click(screen.getByRole('tab', { name: /All/ }))
        expect(rowNames(container)).toHaveLength(3)
    })

    it('row click navigates to the edit page', async () => {
        const { container } = render(<MyProducts />)
        await screen.findByText('Alpha Widget')
        fireEvent.click(screen.getByText('Alpha Widget'))
        expect(push).toHaveBeenCalledWith('/dashboard/products/edit/p1')
        // Quiet hover action links to the storefront page.
        expect(container.querySelector('a[href="/products/alpha-widget"]')).toBeTruthy()
    })

    it('shows the guide empty state with the sun CTA when there are no products', async () => {
        global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ products: [] }) }))
        render(<MyProducts />)
        expect(await screen.findByText('Stock Your Shelf')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'New Product' })).toBeInTheDocument()
    })
})
