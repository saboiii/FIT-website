// RTL smokes for the navbar's mobile menu sheet: the hamburger opens a
// dialog that mirrors the desktop nav (Home/Shop/Prints/Creators/About),
// carries the full signed-in account inventory (Cart, Messages, Account,
// Orders, Downloads, Print requests, Subscription with plan badge, Sign out),
// gates Dashboard/Admin/Messages rows by entitlement (unentitled rows are not
// rendered at all), shows only auth links when signed out, expands the
// Shop/Prints category disclosures, and closes on Escape returning focus to
// the hamburger trigger.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react'
import Navbar from '@/components/General/Navbar'

let mockUser = null

vi.mock('@clerk/nextjs', () => ({
    useUser: () => ({ user: mockUser, isLoaded: true, isSignedIn: !!mockUser }),
    SignOutButton: ({ children }) => children || <button>Sign out</button>,
}))

// Stable object: a fresh identity per render would re-fire Navbar's
// route-change close effect and shut the menu as soon as it opens.
const stableSearchParams = { get: () => null, toString: () => '' }
vi.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => stableSearchParams,
}))

vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    default: ({ src, alt }) => <img src={typeof src === 'string' ? src : ''} alt={alt} />,
}))

// The desktop account dropdown has its own suite (accountPages.test.jsx);
// stub it so its rows never collide with the mobile sheet's queries.
vi.mock('@/components/General/AccountDropdown', () => ({
    default: () => <div data-testid="account-dropdown" />,
}))

let mockEntitlements
vi.mock('@/utils/useEntitlements', () => ({
    default: () => mockEntitlements,
}))

let mockIsAdmin = false
vi.mock('@/utils/useAccess', () => ({
    default: () => ({ loading: false, canAccess: true, isAdmin: mockIsAdmin }),
}))

const categoriesFixture = [
    {
        type: 'shop',
        isActive: true,
        name: 'figurines',
        displayName: 'Figurines',
        subcategories: [{ name: 'anime', displayName: 'Anime', isActive: true }],
    },
    {
        type: 'print',
        isActive: true,
        name: 'fdm',
        displayName: 'FDM',
        subcategories: [{ name: 'pla', displayName: 'PLA', isActive: true }],
    },
]

const okJson = (body) => Promise.resolve({ ok: true, json: async () => body })

beforeEach(() => {
    mockIsAdmin = false
    mockEntitlements = {
        loading: false,
        canAccessDashboard: true,
        canUseMessaging: true,
        isPaidTier: false,
        isAdmin: false,
        tier: 'free',
        subscription: null,
    }
    mockUser = {
        id: 'user_1',
        firstName: 'Saba',
        fullName: 'Saba M',
        imageUrl: '',
        primaryEmailAddress: { emailAddress: 'saba@example.com' },
        emailAddresses: [{ emailAddress: 'saba@example.com' }],
    }
    global.fetch = vi.fn((url) => {
        const u = String(url)
        if (u.startsWith('/api/categories')) return okJson({ categories: categoriesFixture })
        if (u.startsWith('/api/chat/inbox')) return okJson({ channels: [] })
        return okJson({})
    })
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

async function openMobileMenu() {
    render(<Navbar />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    return screen.findByRole('dialog', { name: 'Menu' })
}

describe('Navbar mobile menu', () => {
    it('opens from the hamburger with the full signed-in row inventory', async () => {
        const sheet = await openMobileMenu()

        // Primary storefront nav mirrors desktop.
        ;[
            ['Home', '/'],
            ['Creators', '/creators'],
            ['About', '/about'],
        ].forEach(([name, href]) => {
            expect(within(sheet).getByRole('link', { name })).toHaveAttribute('href', href)
        })
        expect(within(sheet).getByRole('button', { name: 'Shop' })).toHaveAttribute(
            'aria-expanded',
            'false',
        )
        expect(within(sheet).getByRole('button', { name: 'Prints' })).toHaveAttribute(
            'aria-expanded',
            'false',
        )

        // Signed-in account destinations.
        ;[
            ['Cart', '/cart'],
            ['Messages', '/dashboard/messages'],
            ['Account', '/account'],
            ['Orders', '/account?tab=orders'],
            ['Downloads', '/account?tab=downloads'],
            ['Print requests', '/account/prints'],
            ['Dashboard', '/dashboard'],
        ].forEach(([name, href]) => {
            expect(within(sheet).getByRole('link', { name })).toHaveAttribute('href', href)
        })
        // Subscription row carries the plan badge (free tier here).
        expect(within(sheet).getByRole('link', { name: /Subscription/ })).toHaveAttribute(
            'href',
            '/account/subscription',
        )
        expect(within(sheet).getByText('Free')).toBeInTheDocument()
        expect(within(sheet).getByRole('button', { name: 'Sign out' })).toBeInTheDocument()

        // Not an admin: no admin row, and no auth links while signed in.
        expect(within(sheet).queryByRole('link', { name: 'Admin dashboard' })).toBeNull()
        expect(within(sheet).queryByRole('link', { name: 'Sign in' })).toBeNull()
        expect(within(sheet).queryByRole('link', { name: 'Sign up' })).toBeNull()
    })

    it('expands the Shop disclosure to category and subcategory links', async () => {
        const sheet = await openMobileMenu()
        const shopToggle = within(sheet).getByRole('button', { name: 'Shop' })
        fireEvent.click(shopToggle)
        expect(shopToggle).toHaveAttribute('aria-expanded', 'true')
        expect(await within(sheet).findByRole('link', { name: 'Browse all shop' })).toHaveAttribute(
            'href',
            '/shop',
        )
        expect(within(sheet).getByText('Figurines')).toBeInTheDocument()
        expect(within(sheet).getByRole('link', { name: 'Anime' })).toHaveAttribute(
            'href',
            '/shop?productType=shop&productCategory=Figurines&productSubCategory=Anime',
        )
    })

    it('does not render Dashboard or Messages rows when not entitled', async () => {
        mockEntitlements = {
            ...mockEntitlements,
            canAccessDashboard: false,
            canUseMessaging: false,
        }
        const sheet = await openMobileMenu()
        expect(within(sheet).queryByRole('link', { name: 'Dashboard' })).toBeNull()
        expect(within(sheet).queryByRole('link', { name: 'Messages' })).toBeNull()
        // Ungated rows are still there.
        expect(within(sheet).getByRole('link', { name: 'Account' })).toBeInTheDocument()
    })

    it('renders the Admin dashboard row for admins only', async () => {
        mockIsAdmin = true
        const sheet = await openMobileMenu()
        expect(within(sheet).getByRole('link', { name: 'Admin dashboard' })).toHaveAttribute(
            'href',
            '/admin',
        )
    })

    it('shows only nav plus auth links when signed out', async () => {
        mockUser = null
        const sheet = await openMobileMenu()
        expect(within(sheet).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
            'href',
            '/sign-in',
        )
        expect(within(sheet).getByRole('link', { name: 'Sign up' })).toHaveAttribute(
            'href',
            '/sign-up',
        )
        ;[
            'Cart',
            'Messages',
            'Account',
            'Orders',
            'Downloads',
            'Print requests',
            'Dashboard',
            'Admin dashboard',
        ].forEach((name) => {
            expect(within(sheet).queryByRole('link', { name })).toBeNull()
        })
        expect(within(sheet).queryByRole('button', { name: 'Sign out' })).toBeNull()
        // Storefront nav is still available to guests.
        expect(within(sheet).getByRole('link', { name: 'Home' })).toBeInTheDocument()
    })

    it('closes on Escape and returns focus to the hamburger trigger', async () => {
        await openMobileMenu()
        const trigger = screen.getByRole('button', { name: 'Open menu' })
        fireEvent.keyDown(document, { key: 'Escape' })
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull())
        expect(document.activeElement).toBe(trigger)
    })

    it('locks body scroll while open and closes from the backdrop close button', async () => {
        const sheet = await openMobileMenu()
        expect(document.body.style.overflow).toBe('hidden')
        fireEvent.click(within(sheet).getByRole('button', { name: 'Close menu' }))
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull())
        expect(document.body.style.overflow).toBe('')
    })
})
