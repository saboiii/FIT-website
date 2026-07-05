// RTL smokes for the redesigned admin print-requests job queue (§5.8):
// rows render, saved-view tabs filter, the peek carries config + timeline,
// cancel goes through ConfirmDialog (never window.confirm), and the quote
// save posts the exact legacy payload shape.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import CustomPrintRequests from '@/components/Admin/CustomPrintRequests'

vi.mock('@/utils/AdminSettingsContext', () => ({
    useAdminSettings: () => ({ settings: { deliveryTypes: [] }, loading: false, error: null }),
}))
vi.mock('@/components/General/ToastProvider', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}))
// Shared, unchanged shipping component — heavy; stubbed at the boundary.
vi.mock('@/components/DashboardComponents/ProductFormFields/ShippingFields', () => ({
    default: () => <div data-testid="shipping-fields" />,
}))

const requestsFixture = [
    {
        requestId: 'REQ-001',
        userEmail: 'alice@example.com',
        status: 'configured',
        createdAt: '2026-07-01T10:00:00Z',
        updatedAt: '2026-07-01T10:00:00Z',
        modelFile: { originalName: 'benchy.stl', s3Key: 'models/benchy.stl', fileSize: 1234 },
        printConfiguration: {
            printSettings: {
                layerHeight: 0.2,
                initialLayerHeight: 0.3,
                materialType: 'PLA',
                wallLoops: 3,
                sparseInfillDensity: 15,
                sparseInfillPattern: 'grid',
                internalSolidInfillPattern: 'zigzag',
                nozzleDiameter: 0.4,
                enableSupport: true,
                supportType: 'tree',
                printPlate: 'textured',
            },
            meshColors: { hull: '#ff0000' },
        },
        dimensions: { length: 10, width: 8, height: 4, weight: 0.5 },
        delivery: { deliveryTypes: [] },
        statusHistory: [
            { status: 'pending_config', updatedAt: '2026-06-30T10:00:00Z' },
            { status: 'configured', updatedAt: '2026-07-01T10:00:00Z', note: 'Customer emailed about colours' },
        ],
    },
    {
        requestId: 'REQ-002',
        userEmail: 'bob@example.com',
        status: 'quoted',
        basePrice: 10,
        printFee: 15.5,
        currency: 'sgd',
        modelFile: { originalName: 'vase.stl', s3Key: 'models/vase.stl' },
        quote: { total: 25.5, currency: 'sgd', inputs: { printHours: 3.2 }, lines: [] },
        statusHistory: [],
    },
]

beforeEach(() => {
    global.fetch = vi.fn((url, init = {}) => {
        if (init.method === 'PUT') return Promise.resolve({ ok: true, json: async () => ({}) })
        if (String(url).includes('calculate-print-cost')) {
            return Promise.resolve({ ok: true, json: async () => ({ suggestedPrice: 33 }) })
        }
        return Promise.resolve({ ok: true, json: async () => ({ requests: requestsFixture }) })
    })
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('CustomPrintRequests — job queue', () => {
    it('renders a job-card row with model, customer, id and status pill', async () => {
        render(<CustomPrintRequests />)
        expect(await screen.findByText('benchy.stl')).toBeInTheDocument()
        expect(screen.getByText('alice@example.com')).toBeInTheDocument()
        expect(screen.getByText('REQ-001')).toBeInTheDocument()
        expect(screen.getByText('Awaiting Quote')).toBeInTheDocument()
        // The primary "Quote" action appears only on needs-quote rows.
        expect(screen.getAllByRole('button', { name: 'Quote' })).toHaveLength(1)
    })

    it('filters the queue through the saved-view tabs', async () => {
        render(<CustomPrintRequests />)
        await screen.findByText('benchy.stl')
        expect(screen.getByText('vase.stl')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('tab', { name: /Quoted/ }))
        expect(screen.queryByText('benchy.stl')).toBeNull()
        expect(screen.getByText('vase.stl')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('tab', { name: /Needs quote/ }))
        expect(screen.getByText('benchy.stl')).toBeInTheDocument()
        expect(screen.queryByText('vase.stl')).toBeNull()
    })

    it('opens the peek with the full config sheet, swatches, quote total and timeline', async () => {
        render(<CustomPrintRequests />)
        fireEvent.click(await screen.findByText('benchy.stl'))

        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByText('Layer height')).toBeInTheDocument()
        expect(within(dialog).getByText('0.2mm')).toBeInTheDocument()
        expect(within(dialog).getByText('Wall loops')).toBeInTheDocument()
        expect(within(dialog).getByText('10×8×4 cm')).toBeInTheDocument()
        expect(within(dialog).getByText('0.5 kg')).toBeInTheDocument()
        expect(within(dialog).getByText('hull')).toBeInTheDocument()
        // Timeline from statusHistory, notes included.
        expect(within(dialog).getByText('Customer emailed about colours')).toBeInTheDocument()
        expect(within(dialog).getByText('Awaiting Print Config')).toBeInTheDocument()

        fireEvent.keyDown(window, { key: 'Escape' })
        // Quote total on the quoted request.
        fireEvent.click(screen.getByText('vase.stl'))
        const quotedDialog = await screen.findByRole('dialog')
        expect(within(quotedDialog).getByText('Quote total')).toBeInTheDocument()
        expect(within(quotedDialog).getByText('SGD 25.50')).toBeInTheDocument()
    })

    it('cancels via ConfirmDialog, not window.confirm', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm')
        render(<CustomPrintRequests />)
        await screen.findByText('benchy.stl')

        fireEvent.click(screen.getAllByLabelText('More actions')[0])
        fireEvent.click(screen.getByRole('menuitem', { name: 'Cancel request' }))

        expect(screen.getByText('Cancel this request?')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }))

        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, init]) => init?.method === 'PUT')
            expect(putCall).toBeTruthy()
            expect(JSON.parse(putCall[1].body)).toEqual({ requestId: 'REQ-001', action: 'cancel' })
        })
        expect(confirmSpy).not.toHaveBeenCalled()
    })

    it('saves a quote with the exact legacy PUT payload shape', async () => {
        render(<CustomPrintRequests />)
        await screen.findByText('benchy.stl')

        // The row's "Quote" action opens the peek straight into the editor.
        fireEvent.click(screen.getByRole('button', { name: 'Quote' }))
        const dialog = await screen.findByRole('dialog')
        expect(within(dialog).getByTestId('shipping-fields')).toBeInTheDocument()

        fireEvent.change(within(dialog).getByLabelText('Print price'), { target: { value: '42' } })
        fireEvent.change(within(dialog).getByLabelText('Admin note (optional)'), { target: { value: 'rush job' } })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save quote' }))

        await waitFor(() => {
            const putCall = global.fetch.mock.calls.find(([, init]) => init?.method === 'PUT')
            expect(putCall).toBeTruthy()
            const body = JSON.parse(putCall[1].body)
            expect(Object.keys(body).sort()).toEqual(['action', 'delivery', 'dimensions', 'note', 'quoteAmount', 'requestId'])
            expect(body).toMatchObject({
                requestId: 'REQ-001',
                action: 'quote',
                quoteAmount: 42,
                note: 'rush job',
                dimensions: { length: 10, width: 8, height: 4, weight: 0.5 },
                delivery: { deliveryTypes: [] },
            })
        })
    })

    it('auto-calculate posts settings + dimensions and fills the price field', async () => {
        render(<CustomPrintRequests />)
        await screen.findByText('benchy.stl')
        fireEvent.click(screen.getByRole('button', { name: 'Quote' }))
        const dialog = await screen.findByRole('dialog')

        fireEvent.click(within(dialog).getByRole('button', { name: 'Auto-Calculate' }))
        await waitFor(() => {
            expect(within(dialog).getByLabelText('Print price')).toHaveValue(33)
        })
        const calcCall = global.fetch.mock.calls.find(([url]) => String(url).includes('calculate-print-cost'))
        const body = JSON.parse(calcCall[1].body)
        expect(Object.keys(body).sort()).toEqual(['dimensions', 'printSettings'])
    })
})
