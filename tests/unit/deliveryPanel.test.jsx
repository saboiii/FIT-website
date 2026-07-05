// RTL smokes for the redesigned Delivery panel (§5.14): list-first rows with
// applicability pills + pricing labels, edit opens a Sheet whose formula
// preview is live, and delete goes through ConfirmDialog (never
// window.confirm). API payloads stay byte-identical to the legacy panel.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'

vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))

import DeliveryTypeManagement from '@/components/Admin/DeliveryTypeManagement'

const deliveryTypes = [
    {
        name: 'digital',
        displayName: 'Digital Delivery',
        isHardcoded: true,
        isActive: true,
        applicableToProductTypes: ['shop'],
    },
    {
        _id: 'abc123',
        name: 'courier',
        displayName: 'Courier',
        isActive: true,
        applicableToProductTypes: ['shop', 'print'],
        basePricing: {
            basePrice: 5,
            volumeFactor: 0.001,
            weightFactor: 0.01,
            minPrice: 2,
            maxPrice: 50,
            freeShippingThreshold: '',
        },
    },
]

beforeEach(() => {
    global.fetch = vi.fn((url, opts = {}) => {
        if (opts.method === 'DELETE' || opts.method === 'PUT' || opts.method === 'POST') {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ deliveryTypes }) })
    })
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('DeliveryTypeManagement — list', () => {
    it('renders rows with name chip, applicability pills, pricing label and protections', async () => {
        render(<DeliveryTypeManagement />)
        expect(await screen.findByText('Courier')).toBeInTheDocument()
        expect(screen.getByText('courier')).toBeInTheDocument() // url chip
        expect(screen.getAllByText('Shop')).toHaveLength(2)
        expect(screen.getByText('Print')).toBeInTheDocument()
        expect(screen.getByText('Formula')).toBeInTheDocument()
        expect(screen.getByText('Creator-defined')).toBeInTheDocument()
        expect(screen.getByText('Built-in')).toBeInTheDocument()
        // Built-ins are protected: only the custom type is editable/deletable.
        expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1)
        expect(screen.getAllByLabelText('Delete delivery type')).toHaveLength(1)
        // Active state is a switch, per row.
        expect(screen.getAllByRole('switch')).toHaveLength(2)
    })

    it('toggles active through the existing PUT payload', async () => {
        render(<DeliveryTypeManagement />)
        await screen.findByText('Courier')
        fireEvent.click(screen.getByRole('switch', { name: 'Courier active' }))
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, o]) => o?.method === 'PUT')
            expect(putCall).toBeTruthy()
            expect(JSON.parse(putCall[1].body)).toEqual({
                type: 'delivery-type',
                action: 'toggleActive',
                name: 'courier',
                isActive: false,
            })
        })
    })
})

describe('DeliveryTypeManagement — edit sheet', () => {
    it('opens the form in a Sheet with the live formula preview visible', async () => {
        render(<DeliveryTypeManagement />)
        await screen.findByText('Courier')

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByLabelText('Display Name*')).toHaveValue('Courier')

        // base + volume + weight set → preview renders beside the inputs.
        expect(within(dialog).getByText('Example Calculations')).toBeInTheDocument()
        // Small item: 5 + 1000×0.001 + 100×0.01 = $7.00
        expect(within(dialog).getByText('$7.00')).toBeInTheDocument()
        // Medium: 5 + 5 + 5 = $15.00 · Large: 5 + 10 + 10 = $25.00
        expect(within(dialog).getByText('$15.00')).toBeInTheDocument()
        expect(within(dialog).getByText('$25.00')).toBeInTheDocument()

        // Try-your-own calculator clamps through the same formula.
        fireEvent.change(within(dialog).getByLabelText('Volume (cm³)'), { target: { value: '2000' } })
        fireEvent.change(within(dialog).getByLabelText('Weight (g)'), { target: { value: '300' } })
        // 5 + 2 + 3 = $10.00
        expect(within(dialog).getByText('$10.00')).toBeInTheDocument()

        // Saving PUTs the exact legacy edit payload.
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }))
        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, o]) => o?.method === 'PUT')
            expect(putCall).toBeTruthy()
            const body = JSON.parse(putCall[1].body)
            expect(Object.keys(body)).toEqual(['type', 'id', 'data'])
            expect(body.type).toBe('delivery-type')
            expect(body.id).toBe('abc123')
            expect(Object.keys(body.data)).toEqual([
                'displayName',
                'description',
                'applicableToProductTypes',
                'basePricing',
                'isActive',
            ])
        })
        // Editing notifies affected creators (unchanged side call).
        await waitFor(() => {
            const notify = global.fetch.mock.calls.find(([u]) => String(u).includes('notify-delivery-change'))
            expect(notify).toBeTruthy()
            expect(JSON.parse(notify[1].body).deliveryTypeName).toBe('courier')
        })
    })
})

describe('DeliveryTypeManagement — delete', () => {
    it('deletes via ConfirmDialog, not window.confirm', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm')
        render(<DeliveryTypeManagement />)
        await screen.findByText('Courier')

        fireEvent.click(screen.getByLabelText('Delete delivery type'))
        expect(screen.getByText('Delete this delivery type?')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

        await waitFor(() => {
            const delCall = global.fetch.mock.calls.find(([, o]) => o?.method === 'DELETE')
            expect(delCall).toBeTruthy()
            expect(JSON.parse(delCall[1].body)).toEqual({ type: 'delivery-type', id: 'abc123' })
        })
        expect(confirmSpy).not.toHaveBeenCalled()
    })
})
