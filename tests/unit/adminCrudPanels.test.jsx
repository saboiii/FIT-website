// RTL smokes for the redesigned admin CRUD panels (§5.9/§5.10): the
// Orders-&-Statuses Sheet form + built-in protection, Categories deleting
// through ConfirmDialog (never window.confirm), and Events cards + Sheet form.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import OrderStatusManagement from '@/components/Admin/OrderStatusManagement'
import CategoryManagement from '@/components/Admin/CategoryManagement'
import EventManagement from '@/components/Admin/EventManagement'

vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))

const ok = (payload) => Promise.resolve({ ok: true, json: async () => payload })

const orderStatusesFixture = [
    {
        _id: 'st_1',
        statusKey: 'processing',
        displayName: 'Processing',
        description: 'Order is being prepared',
        orderType: 'order',
        color: '#111111',
        icon: 'TbClock',
        order: 1,
        isActive: true,
        isHardcoded: true,
    },
    {
        _id: 'st_2',
        statusKey: 'awaiting_pickup',
        displayName: 'Awaiting Pickup',
        description: 'Ready at the counter',
        orderType: 'order',
        color: '#222222',
        icon: 'TbPackage',
        order: 2,
        isActive: true,
        isHardcoded: false,
    },
]

const categoriesFixture = [
    {
        name: 'gadgets',
        displayName: 'Gadgets',
        type: 'shop',
        isActive: true,
        isHardcoded: false,
        subcategories: [],
    },
    {
        name: 'prints',
        displayName: 'Prints',
        type: 'print',
        isActive: true,
        isHardcoded: true,
        subcategories: [],
    },
]

const eventsFixture = [
    {
        _id: 'ev_1',
        name: 'Christmas Sale',
        description: 'Festive discount',
        locations: ['SG', 'Online'],
        isActive: true,
        isGlobal: true,
        percentage: 10,
        minimumPrice: 50,
        startDate: '2026-12-01',
        endDate: '2026-12-31',
    },
]

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('OrderStatusManagement — sheet form + built-in protection', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url, init = {}) => {
            const u = String(url)
            if (u.includes('/api/admin/order-statuses')) return ok({ orderStatuses: orderStatusesFixture })
            if (u.includes('/api/admin/settings')) return ok({})
            return ok({})
        })
    })

    it('opens the add/edit form in a Sheet', async () => {
        render(<OrderStatusManagement />)
        await screen.findByText('Processing')

        expect(screen.queryByRole('dialog')).toBeNull()
        fireEvent.click(screen.getByRole('button', { name: /Add status/ }))

        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByLabelText(/Status key/)).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/Display name/)).toBeInTheDocument()
        // Icon picker pill grid, one pressed selection.
        expect(within(dialog).getByRole('button', { name: 'Truck Delivery', pressed: true })).toBeInTheDocument()
    })

    it('shows built-in rows hatch-protected with no actions', async () => {
        render(<OrderStatusManagement />)
        await screen.findByText('Processing')

        expect(screen.getByText('Built-in')).toBeInTheDocument()
        // Only the custom row carries Edit/Delete.
        expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1)
        expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1)
    })

    it('deletes through ConfirmDialog with the legacy payload', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm')
        render(<OrderStatusManagement />)
        await screen.findByText('Awaiting Pickup')

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
        expect(screen.getByText('Delete this status?')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Delete status' }))

        await waitFor(() => {
            const delCall = global.fetch.mock.calls.find(([, init]) => init?.method === 'DELETE')
            expect(delCall).toBeTruthy()
            expect(JSON.parse(delCall[1].body)).toEqual({ type: 'order-status', id: 'st_2' })
        })
        expect(confirmSpy).not.toHaveBeenCalled()
    })
})

describe('CategoryManagement — tree rows + ConfirmDialog delete', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url, init = {}) => {
            const u = String(url)
            if (u.includes('/api/admin/settings')) return ok({ categories: categoriesFixture })
            return ok({})
        })
    })

    it('renders rows with type pills and hatch-protects built-ins', async () => {
        render(<CategoryManagement />)
        await screen.findByText('Gadgets')

        expect(screen.getByText('Prints')).toBeInTheDocument()
        expect(screen.getByText('Built-in')).toBeInTheDocument()
        // Only the non-built-in category is deletable.
        expect(screen.getAllByRole('button', { name: 'Delete category' })).toHaveLength(1)
    })

    it('opens ONE sheet with the category/subcategory toggle', async () => {
        render(<CategoryManagement />)
        await screen.findByText('Gadgets')

        fireEvent.click(screen.getByRole('button', { name: /New category/ }))
        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByLabelText(/URL name/)).toBeInTheDocument()

        fireEvent.click(within(dialog).getByRole('tab', { name: 'Subcategory' }))
        expect(within(dialog).getByLabelText(/Parent category/)).toBeInTheDocument()
    })

    it('deletes a category through ConfirmDialog, not window.confirm', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm')
        render(<CategoryManagement />)
        await screen.findByText('Gadgets')

        fireEvent.click(screen.getByRole('button', { name: 'Delete category' }))
        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByText('Delete this category?')).toBeInTheDocument()
        fireEvent.click(within(dialog).getByRole('button', { name: 'Delete category' }))

        await waitFor(() => {
            const delCall = global.fetch.mock.calls.find(([, init]) => init?.method === 'DELETE')
            expect(delCall).toBeTruthy()
            expect(JSON.parse(delCall[1].body)).toEqual({ type: 'category', name: 'gadgets' })
        })
        expect(confirmSpy).not.toHaveBeenCalled()
    })
})

describe('EventManagement — event cards + sheet form', () => {
    beforeEach(() => {
        global.fetch = vi.fn((url, init = {}) => {
            const u = String(url)
            if (u.includes('/api/admin/events')) return ok({ events: eventsFixture })
            return ok({})
        })
    })

    it('renders event cards with pills and the discount window', async () => {
        render(<EventManagement />)
        await screen.findByText('Christmas Sale')

        expect(screen.getByText('10% off')).toBeInTheDocument()
        expect(screen.getByText('Global')).toBeInTheDocument()
        expect(screen.getByText('Window')).toBeInTheDocument()
        expect(screen.getByText(/Locations: SG, Online/)).toBeInTheDocument()
        // The redundant mid-page explainer is gone (client directive).
        expect(screen.queryByText(/Time-bound sales like Christmas/)).toBeNull()
    })

    it('shows an em-dash-free empty state when no events exist', async () => {
        global.fetch = vi.fn(() => ok({ events: [] }))
        render(<EventManagement />)

        expect(await screen.findByText('No Events Yet')).toBeInTheDocument()
        expect(
            screen.getByText('Promotional events power storewide and product discounts. Create the first one.'),
        ).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Create Event' })).toBeInTheDocument()
        expect(document.body.textContent).not.toContain('—')
    })

    it('opens the grouped What/How much/When/Flags form in a Sheet', async () => {
        render(<EventManagement />)
        await screen.findByText('Christmas Sale')

        fireEvent.click(screen.getByRole('button', { name: /New event/ }))
        const dialog = await screen.findByRole('dialog')

        expect(within(dialog).getByText('What')).toBeInTheDocument()
        expect(within(dialog).getByText('How much')).toBeInTheDocument()
        expect(within(dialog).getByText('When')).toBeInTheDocument()
        expect(within(dialog).getByText('Flags')).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/Discount %/)).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/Start date/)).toBeInTheDocument()
    })

    it('deletes through ConfirmDialog, not window.confirm', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm')
        render(<EventManagement />)
        await screen.findByText('Christmas Sale')

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
        expect(screen.getByText('Delete this event?')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Delete event' }))

        await waitFor(() => {
            const delCall = global.fetch.mock.calls.find(([, init]) => init?.method === 'DELETE')
            expect(delCall).toBeTruthy()
            expect(String(delCall[0])).toBe('/api/admin/events?id=ev_1')
        })
        expect(confirmSpy).not.toHaveBeenCalled()
    })
})
