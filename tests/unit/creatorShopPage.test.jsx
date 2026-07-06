// RTL smokes for the public creator shop page (app/creators/[id]/Creator.jsx):
// banner fallback vs image, overlapping logo initial, verified chip, link
// chips (external + noopener), stat strip, featured section ordered by the
// creator's picks, owner-only Edit shop affordance, and the preserved
// Message-creator capability.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import Creator from '@/app/creators/[id]/Creator'

let mockUser = null
vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: mockUser, isLoaded: true }),
}))
vi.mock('@/components/ProductCard', () => ({
    default: ({ product }) => <div data-testid="product-card">{product.name}</div>,
}))

const products = [
    { _id: 'p1', name: 'Vase', likes: ['u1', 'u2'], reviews: [{ rating: 4 }, { rating: 5 }] },
    { _id: 'p2', name: 'Lamp', likes: ['u3'], reviews: [{ rating: 3 }] },
    { _id: 'p3', name: 'Hook', likes: [], reviews: [] },
]

const baseCreator = {
    id: 'user_creator',
    displayName: 'Ada Prints',
    imageUrl: null,
    role: 'Creator',
    joinedYear: 2024,
    shop: {
        bannerImage: '',
        logoImage: '',
        description: 'Practical prints, made to order.',
        links: [
            { label: 'Website', url: 'https://ada.example.com' },
            { label: 'Instagram', url: 'https://instagram.com/ada' },
        ],
        featuredProductIds: ['p3', 'p1'],
        accentColor: '',
    },
}

beforeEach(() => {
    mockUser = null
})

afterEach(() => cleanup())

describe('public creator shop page', () => {
    it('renders the quiet fallback band when no banner is set, and the image when set', () => {
        const { rerender } = render(<Creator creator={baseCreator} products={products} />)
        expect(screen.getByTestId('banner-fallback')).toBeInTheDocument()

        rerender(
            <Creator
                creator={{ ...baseCreator, shop: { ...baseCreator.shop, bannerImage: 'shops/user_creator/banner.jpg' } }}
                products={products}
            />,
        )
        expect(screen.queryByTestId('banner-fallback')).not.toBeInTheDocument()
        expect(screen.getByAltText('Ada Prints banner')).toHaveAttribute(
            'src',
            '/api/proxy?key=shops%2Fuser_creator%2Fbanner.jpg',
        )
    })

    it('shows the logo initial fallback, name, verified chip and description', () => {
        render(<Creator creator={baseCreator} products={products} />)
        expect(screen.getByTestId('shop-logo')).toHaveTextContent('A')
        expect(screen.getByRole('heading', { level: 1, name: 'Ada Prints' })).toBeInTheDocument()
        expect(screen.getByText('Verified creator')).toBeInTheDocument()
        expect(screen.getByText('Practical prints, made to order.')).toBeInTheDocument()
    })

    it('hides the verified chip for non-creator roles', () => {
        render(<Creator creator={{ ...baseCreator, role: 'Customer' }} products={products} />)
        expect(screen.queryByText('Verified creator')).not.toBeInTheDocument()
    })

    it('renders link chips as external noopener anchors', () => {
        render(<Creator creator={baseCreator} products={products} />)
        const link = screen.getByRole('link', { name: /website/i })
        expect(link).toHaveAttribute('href', 'https://ada.example.com')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
        expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument()
    })

    it('shows the stat strip: products, likes, avg rating, joined year', () => {
        render(<Creator creator={baseCreator} products={products} />)
        const strip = within(screen.getByTestId('stat-strip'))
        expect(strip.getByText('Products').previousSibling).toHaveTextContent('3')
        expect(strip.getByText('Likes').previousSibling).toHaveTextContent('3')
        expect(strip.getByText('Avg rating').previousSibling).toHaveTextContent('4.0')
        expect(strip.getByText('Joined').previousSibling).toHaveTextContent('2024')
    })

    it('renders the Featured section from featuredProductIds in pick order, above the full grid', () => {
        render(<Creator creator={baseCreator} products={products} />)
        expect(screen.getByRole('heading', { name: 'Featured' })).toBeInTheDocument()
        const cards = screen.getAllByTestId('product-card').map((c) => c.textContent)
        // featured (Hook, Vase in pick order) then the full grid (Vase, Lamp, Hook)
        expect(cards).toEqual(['Hook', 'Vase', 'Vase', 'Lamp', 'Hook'])
    })

    it('skips the Featured section when no ids resolve', () => {
        render(
            <Creator
                creator={{ ...baseCreator, shop: { ...baseCreator.shop, featuredProductIds: ['gone'] } }}
                products={products}
            />,
        )
        expect(screen.queryByRole('heading', { name: 'Featured' })).not.toBeInTheDocument()
    })

    it('shows Edit shop on the banner only for the owner', () => {
        mockUser = { id: 'user_creator' }
        const { rerender } = render(<Creator creator={baseCreator} products={products} />)
        expect(screen.getByRole('link', { name: /edit shop/i })).toHaveAttribute('href', '/dashboard/shop')
        expect(screen.queryByRole('button', { name: /message creator/i })).not.toBeInTheDocument()

        mockUser = { id: 'user_visitor' }
        rerender(<Creator creator={baseCreator} products={products} />)
        expect(screen.queryByRole('link', { name: /edit shop/i })).not.toBeInTheDocument()
    })

    it('keeps the Message-creator capability for signed-in visitors', () => {
        mockUser = { id: 'user_visitor' }
        render(<Creator creator={baseCreator} products={products} />)
        const events = []
        const listener = (e) => events.push(e.detail)
        window.addEventListener('fit:openCreatorChat', listener)
        fireEvent.click(screen.getByRole('button', { name: /message creator/i }))
        window.removeEventListener('fit:openCreatorChat', listener)
        expect(events).toEqual([
            { targetUserId: 'user_creator', displayName: 'Ada Prints', imageUrl: null },
        ])
    })

    it('keeps the empty state when the creator has no products', () => {
        render(<Creator creator={baseCreator} products={[]} />)
        expect(screen.getByText('No products found.')).toBeInTheDocument()
    })
})
